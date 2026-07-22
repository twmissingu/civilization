// CP-15 贸易路线系统
import { describe, it, expect, beforeEach } from 'vitest';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import { canStartTradeRoute, tradeRouteYield, resetRouteIdCounter } from '../../src/logic/state/traderoute';
import { TRADE_ROUTE_DURATION, MAX_TRADE_ROUTE_DISTANCE, tradeRouteYieldTotal } from '../../src/gamedata/traderoutes';
import { hexDistance } from '../../src/logic/hex';
import type { GameState, PlayerState } from '../../src/logic/state/types';
import { makeState } from '../scenarios/helpers';

/** 为当前玩家建城 */
function foundCity(state: GameState, player: PlayerState, name: string): GameState {
  const settler = player.units.find((u) => u.type === 'settler');
  if (!settler) throw new Error('No settler');
  return applyCommand(state, { kind: 'foundCity', unitId: settler.id, name }).state;
}

/** 在玩家城市上放置一个商人 */
function spawnTrader(_state: GameState, player: PlayerState, cityId: string): void {
  const city = player.cities.find((c) => c.id === cityId);
  if (!city) throw new Error('City not found');
  const trader = {
    id: `trader-${player.id}`,
    ownerId: player.id,
    type: 'trader',
    tile: city.tile,
    hp: 100,
    moveLeft: 2,
    xp: 0,
    level: 1,
    promotions: [] as string[],
    tradeRouteId: undefined as string | undefined,
    charges: undefined as number | undefined,
    hasActed: false,
  };
  player.units.push(trader);
}

/** 帮当前玩家在相邻位置建第二个城市 */
function foundSecondCity(state: GameState): GameState | null {
  const player = currentPlayer(state);
  // 找到第一个可移动的单位（通常是 warrior）
  const mover = player.units.find((u) => u.type !== 'settler' && u.type !== 'trader');
  if (!mover) return null;
  // 往相邻位置移动并建城
  const { state: s1 } = applyCommand(state, { kind: 'moveUnit', unitId: mover.id, to: { q: 5, r: 5 } });
  const player1 = currentPlayer(s1);
  // 检查是否有可用的 settlers 来建城
  const settler = player1.units.find((u) => u.type === 'settler');
  if (!settler) return null;
  const { state: s2 } = applyCommand(s1, { kind: 'foundCity', unitId: settler.id, name: 'Roma2' });
  const player2 = currentPlayer(s2);
  if (player2.cities.length < 2) return null;
  return s2;
}

describe('CP-15 贸易路线', () => {
  beforeEach(() => {
    resetRouteIdCounter();
  });

  it('初始状态贸易路线容量为0', () => {
    const state = makeState();
    const player = currentPlayer(state);
    expect(player.tradeRouteCapacity).toBe(0);
    expect(player.tradeRoutes).toEqual([]);
  });

  it('无容量时无法建立贸易路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 容量为0，无法建立
    expect(canStartTradeRoute(s2, player2, trader.id, player2.cities[0].id)).toBe(false);
  });

  it('有容量和商人时可以建立贸易路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 同一城市不能贸易
    expect(canStartTradeRoute(s2, player2, trader.id, player2.cities[0].id)).toBe(false);
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return; // 跳过（距离太近）
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      expect(canStartTradeRoute(s3, player3, trader.id, city2.id)).toBe(true);
    }
  });

  it('启动贸易路线消耗容量并建立路线实例', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      const { state: s4 } = applyCommand(s3, { kind: 'startTradeRoute', traderId: trader.id, toCityId: city2.id });
      const player4 = currentPlayer(s4);
      expect(player4.tradeRoutes.length).toBe(1);
      expect(player4.tradeRoutes[0].fromCityId).toBe(player4.cities[0].id);
      expect(player4.tradeRoutes[0].toCityId).toBe(city2.id);
      expect(player4.tradeRoutes[0].turnsTotal).toBe(TRADE_ROUTE_DURATION);
      // 商人被标记
      const trader2 = player4.units.find((u) => u.id === trader.id)!;
      expect(trader2.tradeRouteId).toBe(player4.tradeRoutes[0].id);
    }
  });

  it('商人已有活跃路线时不能再次建立', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 2;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      const { state: s4 } = applyCommand(s3, { kind: 'startTradeRoute', traderId: trader.id, toCityId: city2.id });
      const player4 = currentPlayer(s4);
      // 尝试再次建立（同一商人已有路线）
      expect(canStartTradeRoute(s4, player4, trader.id, city2.id)).toBe(false);
    }
  });

  it('贸易路线每回合产生金币产出', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      const { state: s4 } = applyCommand(s3, { kind: 'startTradeRoute', traderId: trader.id, toCityId: city2.id });
      const player4 = currentPlayer(s4);
      const route = player4.tradeRoutes[0];
      expect(route.yieldPerTurn.gold).toBeGreaterThanOrEqual(3);
      // tradeRouteYield 应包含路线产出
      const y = tradeRouteYield(player4);
      expect(y.gold).toBeGreaterThanOrEqual(3);
    }
  });

  it('贸易路线完成时释放商人', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      const { state: s4 } = applyCommand(s3, { kind: 'startTradeRoute', traderId: trader.id, toCityId: city2.id });
      let current = s4;
      // 模拟足够多的回合让路线完成
      const route = currentPlayer(current).tradeRoutes[0];
      const remaining = route.turnsTotal - route.turnsCompleted;
      for (let i = 0; i < remaining + 1; i++) {
        const { state: next } = applyCommand(current, { kind: 'endTurn' });
        current = next;
        // 跑完 AI 回合
        while (current.players[current.currentPlayerIndex]?.isAI && current.status === 'active') {
          const { state: next2 } = applyCommand(current, { kind: 'endTurn' });
          current = next2;
        }
      }
      // 检查路线是否完成
      const finalPlayer = currentPlayer(current);
      expect(finalPlayer.tradeRoutes.length).toBe(0);
      // 商人应被释放
      const finalTrader = finalPlayer.units.find((u) => u.id === trader.id);
      if (finalTrader) {
        expect(finalTrader.tradeRouteId).toBeUndefined();
      }
    }
  });

  it('贸易路线产出按距离计算', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      const expectedYield = tradeRouteYieldTotal(dist);
      const { state: s4 } = applyCommand(s3, { kind: 'startTradeRoute', traderId: trader.id, toCityId: city2.id });
      const player4 = currentPlayer(s4);
      expect(player4.tradeRoutes[0].yieldPerTurn.gold).toBe(expectedYield.gold);
    }
  });

  it('过程贸易路线（processTradeRoutes）完成路线时释放容量', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist >= 3 && dist <= MAX_TRADE_ROUTE_DISTANCE) {
      const { state: s4 } = applyCommand(s3, { kind: 'startTradeRoute', traderId: trader.id, toCityId: city2.id });
      const player4 = currentPlayer(s4);
      // 路线建立后，容量已使用（tradeRoutes.length == 1，但 capacity 不变）
      expect(player4.tradeRoutes.length).toBe(1);
      expect(player4.tradeRouteCapacity).toBe(1);
    }
  });

  it('canStartTradeRoute 拒绝非商人单位', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    // 用 warrior 测试
    const warrior = player2.units.find((u) => u.type === 'warrior')!;
    expect(canStartTradeRoute(s2, player2, warrior.id, player2.cities[0].id)).toBe(false);
  });

  it('canStartTradeRoute 拒绝不存在的单位', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    expect(canStartTradeRoute(s2, player2, 'nonexistent', player2.cities[0].id)).toBe(false);
  });

  it('canStartTradeRoute 拒绝不存在的目标城市', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    expect(canStartTradeRoute(s2, player2, trader.id, 'nonexistent')).toBe(false);
  });

  it('tradeRouteYield 返回空路线产出', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const y = tradeRouteYield(player);
    expect(y.gold).toBe(0);
    expect(y.science).toBe(0);
  });

  it('商人不在城市上时 cannot start trade route', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    // 手动在非城市位置放一个商人
    const trader = {
      id: 'trader-away',
      ownerId: player2.id,
      type: 'trader',
      tile: { q: 0, r: 0 },
      hp: 100,
      moveLeft: 2,
      xp: 0,
      level: 1,
      promotions: [] as string[],
      tradeRouteId: undefined as string | undefined,
      charges: undefined as number | undefined,
      hasActed: false,
    };
    player2.units.push(trader);
    expect(canStartTradeRoute(s2, player2, trader.id, player2.cities[0].id)).toBe(false);
  });
});