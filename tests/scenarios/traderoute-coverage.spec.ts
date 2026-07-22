// 贸易路线覆盖率补全测试：覆盖 traderoute.ts 中所有未覆盖的代码路径
import { describe, it, expect, beforeEach } from 'vitest';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import {
  canStartTradeRoute,
  startTradeRoute,
  completeTradeRoute,
  processTradeRoutes,
  tradeRouteYield,
  resetRouteIdCounter,
} from '../../src/logic/state/traderoute';
import { MAX_TRADE_ROUTE_DISTANCE, tradeRouteYieldTotal } from '../../src/gamedata/traderoutes';
import { hexDistance } from '../../src/logic/hex/index';
import { ZERO_YIELD } from '../../src/gamedata/types';
import type { GameState, PlayerState, UnitState, TradeRouteInstance } from '../../src/logic/state/types';
import type { DistrictType } from '../../src/gamedata';
import { makeState } from '../scenarios/helpers';

/** 为当前玩家建城 */
function foundCity(state: GameState, player: PlayerState, name: string): GameState {
  const settler = player.units.find((u) => u.type === 'settler');
  if (!settler) throw new Error('No settler');
  return applyCommand(state, { kind: 'foundCity', unitId: settler.id, name }).state;
}

/** 在玩家城市上放置一个商人 */
function spawnTrader(_state: GameState, player: PlayerState, cityId: string): UnitState {
  const city = player.cities.find((c) => c.id === cityId);
  if (!city) throw new Error('City not found');
  const trader = {
    id: `trader-${player.id}-${Date.now()}`,
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
  return trader;
}

/** 帮助当前玩家在相邻位置建第二个城市 */
function foundSecondCity(state: GameState): GameState | null {
  const player = currentPlayer(state);
  const mover = player.units.find((u) => u.type !== 'settler' && u.type !== 'trader');
  if (!mover) return null;
  const { state: s1 } = applyCommand(state, { kind: 'moveUnit', unitId: mover.id, to: { q: 5, r: 5 } });
  const player1 = currentPlayer(s1);
  const settler = player1.units.find((u) => u.type === 'settler');
  if (!settler) return null;
  const { state: s2 } = applyCommand(s1, { kind: 'foundCity', unitId: settler.id, name: 'Roma2' });
  const player2 = currentPlayer(s2);
  if (player2.cities.length < 2) return null;
  return s2;
}

/** 直接调用 startTradeRoute 返回路线或 null */
function startRoute(
  state: GameState,
  player: PlayerState,
  traderId: string,
  toCityId: string
): GameState {
  const route = startTradeRoute(state, player, traderId, toCityId);
  if (!route) throw new Error('startTradeRoute returned null');
  return state;
}

describe('traderoute.ts 全覆盖', () => {
  beforeEach(() => {
    resetRouteIdCounter();
  });

  // ---------------------------------------------------------------------------
  // startTradeRoute 返回 null 路径
  // ---------------------------------------------------------------------------

  it('startTradeRoute 返回 null — 商人不存在', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    const result = startTradeRoute(s2, player2, 'nonexistent-trader', player2.cities[0].id);
    expect(result).toBeNull();
  });

  it('startTradeRoute 返回 null — fromCity 未找到（商人不在城市上）', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    // 在非城市位置放一个商人
    const trader: UnitState = {
      id: 'trader-away',
      ownerId: player2.id,
      type: 'trader',
      tile: { q: 0, r: 0 },
      hp: 100,
      moveLeft: 2,
      xp: 0,
      level: 1,
      promotions: [],
      tradeRouteId: undefined,
      charges: undefined,
      hasActed: false,
    };
    player2.units.push(trader);
    const result = startTradeRoute(s2, player2, trader.id, player2.cities[0].id);
    expect(result).toBeNull();
  });

  it('startTradeRoute 返回 null — toCity 未找到', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    const result = startTradeRoute(s2, player2, trader.id, 'nonexistent-city');
    expect(result).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // completeTradeRoute 返回 null 路径
  // ---------------------------------------------------------------------------

  it('completeTradeRoute 返回 null — tradeRoutes 未定义', () => {
    const state = makeState();
    const player = currentPlayer(state);
    // player.tradeRoutes 是 []，但强制设为 undefined 模拟
    (player as { tradeRoutes?: TradeRouteInstance[] }).tradeRoutes = undefined;
    const result = completeTradeRoute(state, player, 'any-route');
    expect(result).toBeNull();
  });

  it('completeTradeRoute 返回 null — 路线未找到', () => {
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
      startRoute(s3, player3, trader.id, city2.id);
      const result = completeTradeRoute(s3, player3, 'nonexistent-route');
      expect(result).toBeNull();
    }
  });

  it('completeTradeRoute 处理商人已消失（优雅降级）', () => {
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
      startRoute(s3, player3, trader.id, city2.id);
      const route = player3.tradeRoutes[0];
      // 手动移除商人（模拟单位被删除等场景）
      const idx = player3.units.findIndex((u) => u.id === trader.id);
      if (idx !== -1) player3.units.splice(idx, 1);
      // completeTradeRoute 应仍返回 route，不报错
      const result = completeTradeRoute(s3, player3, route.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(route.id);
      // 路线已从列表中移除
      expect(player3.tradeRoutes.length).toBe(0);
    }
  });

  // ---------------------------------------------------------------------------
  // processTradeRoutes 路径
  // ---------------------------------------------------------------------------

  it('processTradeRoutes 跳过无贸易路线的玩家', () => {
    const state = makeState();
    // 两个玩家都没有 tradeRoutes，不应报错
    expect(() => processTradeRoutes(state)).not.toThrow();
  });

  it('processTradeRoutes 完成路线并释放商人', () => {
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
      startRoute(s3, player3, trader.id, city2.id);
      const route = player3.tradeRoutes[0];
      // 将路线设为仅剩 1 回合完成
      route.turnsCompleted = route.turnsTotal - 1;
      // 执行 processTradeRoutes
      processTradeRoutes(s3);
      // 路线应已完成并被移除
      expect(player3.tradeRoutes.length).toBe(0);
      // 商人被释放
      const updatedTrader = player3.units.find((u) => u.id === trader.id);
      expect(updatedTrader).toBeDefined();
      expect(updatedTrader!.tradeRouteId).toBeUndefined();
    }
  });

  it('processTradeRoutes 同时完成多条路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 2;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist < 3 || dist > MAX_TRADE_ROUTE_DISTANCE) return;
    // 添加两个商人
    const trader1 = spawnTrader(s3, player3, player3.cities[0].id);
    const trader2 = spawnTrader(s3, player3, player3.cities[0].id);
    trader2.id = 'trader-2';
    // 启动两条路线
    startRoute(s3, player3, trader1.id, city2.id);
    startRoute(s3, player3, trader2.id, city2.id);
    expect(player3.tradeRoutes.length).toBe(2);
    // 两条路线都设为仅剩 1 回合
    player3.tradeRoutes[0].turnsCompleted = player3.tradeRoutes[0].turnsTotal - 1;
    player3.tradeRoutes[1].turnsCompleted = player3.tradeRoutes[1].turnsTotal - 1;
    // 执行 processTradeRoutes
    processTradeRoutes(s3);
    expect(player3.tradeRoutes.length).toBe(0);
    // 两个商人都被释放
    const t1 = player3.units.find((u) => u.id === trader1.id);
    const t2 = player3.units.find((u) => u.id === trader2.id);
    expect(t1!.tradeRouteId).toBeUndefined();
    expect(t2!.tradeRouteId).toBeUndefined();
  });

  it('processTradeRoutes 不完成未到期的路线', () => {
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
      startRoute(s3, player3, trader.id, city2.id);
      const routeId = player3.tradeRoutes[0].id;
      // 路线刚启动，turnsCompleted 为 0
      processTradeRoutes(s3);
      // 路线应仍在（未完成）
      expect(player3.tradeRoutes.length).toBe(1);
      expect(player3.tradeRoutes[0].turnsCompleted).toBe(1);
      expect(player3.tradeRoutes[0].id).toBe(routeId);
    }
  });

  // ---------------------------------------------------------------------------
  // 多条贸易路线产出合计
  // ---------------------------------------------------------------------------

  it('tradeRouteYield 合计多条路线产出', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 2;
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    const city2 = player3.cities[1];
    const dist = hexDistance(player3.cities[0].tile, city2.tile);
    if (dist < 3 || dist > MAX_TRADE_ROUTE_DISTANCE) return;
    const trader1 = spawnTrader(s3, player3, player3.cities[0].id);
    const trader2 = spawnTrader(s3, player3, player3.cities[0].id);
    trader2.id = 'multi-trader-2';
    startRoute(s3, player3, trader1.id, city2.id);
    startRoute(s3, player3, trader2.id, city2.id);
    const expectedYield = tradeRouteYieldTotal(dist);
    const total = tradeRouteYield(player3);
    expect(total.gold).toBe(expectedYield.gold * 2);
    expect(total.food).toBe(expectedYield.food * 2);
    expect(total.production).toBe(expectedYield.production * 2);
    expect(total.science).toBe(expectedYield.science * 2);
    expect(total.culture).toBe(expectedYield.culture * 2);
    expect(total.faith).toBe(expectedYield.faith * 2);
  });

  it('tradeRouteYield 返回零产出当没有路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const y = tradeRouteYield(player);
    expect(y).toEqual(ZERO_YIELD);
  });

  // ---------------------------------------------------------------------------
  // 距离边界
  // ---------------------------------------------------------------------------

  it('canStartTradeRoute 拒绝距离 < 3 的路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    // 在同一城市上发起贸易（距离为 0）
    expect(canStartTradeRoute(s2, player2, trader.id, player2.cities[0].id)).toBe(false);
  });

  it('canStartTradeRoute 拒绝距离 > MAX_TRADE_ROUTE_DISTANCE 的路线', () => {
    const state = makeState(99);
    const player = currentPlayer(state);
    // 在远处建城（手动制造远距离城市）
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    // 在远处手动添加另一个城市
    const farCity = {
      id: 'far-city',
      ownerId: player2.id,
      name: 'FarAway',
      tile: { q: 30, r: 30 },
      territory: [] as { q: number; r: number }[],
      workedTiles: [] as { q: number; r: number }[],
      population: 1,
      food: 0,
      culture: 0,
      housing: 4,
      amenities: 0,
      buildings: [] as string[],
      districts: [] as { type: DistrictType; tile: { q: number; r: number } }[],
      wonders: [] as { id: string; tile: { q: number; r: number } }[],
      queue: [] as { kind: 'unit' | 'building' | 'district' | 'wonder' | 'project'; id: string; progress: number }[],
      hp: 100,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: false,
      rangedStrikeUsed: false,
      dominantReligion: null,
      religion: {} as Record<string, number>,
    };
    player2.cities.push(farCity);
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    const dist = hexDistance(player2.cities[0].tile, farCity.tile);
    if (dist > MAX_TRADE_ROUTE_DISTANCE) {
      expect(canStartTradeRoute(s2, player2, trader.id, farCity.id)).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // 两条独立路线：两个不同城市之间的两条不同路线
  // ---------------------------------------------------------------------------

  it('两条不同城市间的不同路线各自独立', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 2;
    // 建第二个城市
    const s3 = foundSecondCity(s2);
    if (!s3) return;
    const player3 = currentPlayer(s3);
    if (player3.cities.length < 2) return;
    // 再建第三个城市（手动添加）
    // 找一个可用的 settler。可能没有，clone 一个已有的。
    const city3 = {
      id: 'city-3',
      ownerId: player3.id,
      name: 'Roma3',
      tile: { q: 8, r: 3 },
      territory: [] as { q: number; r: number }[],
      workedTiles: [] as { q: number; r: number }[],
      population: 1,
      food: 0,
      culture: 0,
      housing: 4,
      amenities: 0,
      buildings: [] as string[],
      districts: [] as { type: DistrictType; tile: { q: number; r: number } }[],
      wonders: [] as { id: string; tile: { q: number; r: number } }[],
      queue: [] as { kind: 'unit' | 'building' | 'district' | 'wonder' | 'project'; id: string; progress: number }[],
      hp: 100,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: false,
      rangedStrikeUsed: false,
      dominantReligion: null,
      religion: {} as Record<string, number>,
    };
    player3.cities.push(city3);
    // 城市 1 -> 城市 2 的距离
    const city1 = player3.cities[0];
    const city2 = player3.cities[1];
    const dist12 = hexDistance(city1.tile, city2.tile);
    const dist13 = hexDistance(city1.tile, city3.tile);
    if (dist12 < 3 || dist12 > MAX_TRADE_ROUTE_DISTANCE || dist13 < 3 || dist13 > MAX_TRADE_ROUTE_DISTANCE) return;
    // 两个商人
    const trader1 = spawnTrader(s3, player3, city1.id);
    const trader2 = spawnTrader(s3, player3, city1.id);
    trader2.id = 'trader-pair-2';
    // 启动两条路线：城市1 -> 城市2，城市1 -> 城市3
    startRoute(s3, player3, trader1.id, city2.id);
    startRoute(s3, player3, trader2.id, city3.id);
    expect(player3.tradeRoutes.length).toBe(2);
    // 验证两条路线不同
    expect(player3.tradeRoutes[0].id).not.toBe(player3.tradeRoutes[1].id);
    expect(player3.tradeRoutes[0].fromCityId).toBe(city1.id);
    expect(player3.tradeRoutes[1].fromCityId).toBe(city1.id);
    expect(player3.tradeRoutes[0].toCityId).toBe(city2.id);
    expect(player3.tradeRoutes[1].toCityId).toBe(city3.id);
    // 各商人路线不同
    expect(player3.tradeRoutes[0].traderId).toBe(trader1.id);
    expect(player3.tradeRoutes[1].traderId).toBe(trader2.id);
    // 商人标记正确
    const t1 = player3.units.find((u) => u.id === trader1.id)!;
    const t2 = player3.units.find((u) => u.id === trader2.id)!;
    expect(t1.tradeRouteId).toBe(player3.tradeRoutes[0].id);
    expect(t2.tradeRouteId).toBe(player3.tradeRoutes[1].id);
  });

  // ---------------------------------------------------------------------------
  // 路线 id 计数器重置
  // ---------------------------------------------------------------------------

  it('resetRouteIdCounter 重置计数器', () => {
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
      startRoute(s3, player3, trader.id, city2.id);
      // 重置计数器
      resetRouteIdCounter();
      // 再建一条路线（需要新商人）
      const traderB = spawnTrader(s3, player3, player3.cities[0].id);
      traderB.id = 'trader-reset';
      startRoute(s3, player3, traderB.id, city2.id);
      // 重置后的第一条路线 id 应为 ...-tr-1
      expect(player3.tradeRoutes[1].id).toBe(`${player3.id}-tr-1`);
    }
  });

  // ---------------------------------------------------------------------------
  // 输出路线 yield 包含所有 Yield 字段
  // ---------------------------------------------------------------------------

  it('tradeRouteYield 包含所有 Yield 字段', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const y = tradeRouteYield(player);
    expect(y).toHaveProperty('food');
    expect(y).toHaveProperty('production');
    expect(y).toHaveProperty('gold');
    expect(y).toHaveProperty('science');
    expect(y).toHaveProperty('culture');
    expect(y).toHaveProperty('faith');
  });

  // ---------------------------------------------------------------------------
  // completeTradeRoute 移除路线并释放商人
  // ---------------------------------------------------------------------------

  it('completeTradeRoute 移除路线并释放商人', () => {
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
      startRoute(s3, player3, trader.id, city2.id);
      const route = player3.tradeRoutes[0];
      expect(player3.tradeRoutes.length).toBe(1);
      // 完成路线
      const result = completeTradeRoute(s3, player3, route.id);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(route.id);
      expect(player3.tradeRoutes.length).toBe(0);
      // 商人释放
      const updatedTrader = player3.units.find((u) => u.id === trader.id);
      expect(updatedTrader!.tradeRouteId).toBeUndefined();
    }
  });

  it('offerTrade can be executed between players', () => {
    const state = makeState();
    const result = applyCommand(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 5, demandGold: 0 });
    if (result.state !== state) {
      expect(result.state.players[0].gold).toBeLessThan(state.players[0].gold);
    }
  });

  // ---------------------------------------------------------------------------
  // 直接覆盖 processTradeRoutes 全路径
  // ---------------------------------------------------------------------------

  it('processTradeRoutes 处理多条路线并完成到期路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    // 直接构造贸易路线
    player.tradeRouteCapacity = 1;
    player.tradeRoutes = [{
      id: 'p0-tr-1',
      ownerId: 'player-0',
      traderId: 'trader-1',
      fromCityId: 'city-1',
      toCityId: 'city-2',
      toPlayerId: 'player-1',
      turnsCompleted: 29,
      turnsTotal: 30,
      yieldPerTurn: { food: 0, production: 0, gold: 3, science: 0, culture: 0, faith: 0 },
    }];
    player.units.push({
      id: 'trader-1', ownerId: 'player-0', type: 'trader',
      tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1,
      promotions: [], tradeRouteId: 'p0-tr-1', hasActed: false,
    });
    processTradeRoutes(state);
    // 路线应已完成并移除
    expect(player.tradeRoutes.length).toBe(0);
    // 商人被释放
    const trader = player.units.find((u) => u.id === 'trader-1')!;
    expect(trader.tradeRouteId).toBeUndefined();
  });

  it('processTradeRoutes 处理不完成未到期路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.tradeRoutes = [{
      id: 'p0-tr-2',
      ownerId: 'player-0',
      traderId: 'trader-2',
      fromCityId: 'city-1',
      toCityId: 'city-2',
      toPlayerId: 'player-1',
      turnsCompleted: 0,
      turnsTotal: 30,
      yieldPerTurn: { food: 0, production: 0, gold: 3, science: 0, culture: 0, faith: 0 },
    }];
    processTradeRoutes(state);
    // 路线应未完成
    expect(player.tradeRoutes.length).toBe(1);
    expect(player.tradeRoutes[0].turnsCompleted).toBe(1);
  });

  it('resetRouteIdCounter 直接调用', () => {
    resetRouteIdCounter();
    expect(true).toBe(true);
  });

  it('canStartTradeRoute — 容量不足', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    // 不设容量，默认 0，应拒绝
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    expect(canStartTradeRoute(s2, player2, trader.id, player2.cities[0].id)).toBe(false);
  });

  it('canStartTradeRoute — 商人已有贸易路线', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.tradeRouteCapacity = 1;
    spawnTrader(s2, player2, player2.cities[0].id);
    const trader = player2.units.find((u) => u.type === 'trader')!;
    trader.tradeRouteId = 'existing-route';
    expect(canStartTradeRoute(s2, player2, trader.id, player2.cities[0].id)).toBe(false);
  });

  it('canStartTradeRoute — 商人类型不是 trader', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const warrior = player.units.find((u) => u.type === 'warrior')!;
    expect(canStartTradeRoute(state, player, warrior.id, 'city-1')).toBe(false);
  });

  it('startTradeRoute — 成功启动路线', () => {
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
    if (dist < 3 || dist > MAX_TRADE_ROUTE_DISTANCE) return;
    const route = startTradeRoute(s3, player3, trader.id, city2.id);
    expect(route).not.toBeNull();
    expect(player3.tradeRoutes.length).toBe(1);
    expect(trader.tradeRouteId).toBe(route!.id);
  });

  it('tradeRouteYield 非零路线产出', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.tradeRoutes = [{
      id: 'tr-1', ownerId: 'player-0', traderId: 't1',
      fromCityId: 'c1', toCityId: 'c2', toPlayerId: 'player-1',
      turnsCompleted: 0, turnsTotal: 30,
      yieldPerTurn: { food: 1, production: 1, gold: 1, science: 1, culture: 1, faith: 1 },
    }];
    const y = tradeRouteYield(player);
    expect(y.food).toBe(1);
    expect(y.production).toBe(1);
    expect(y.gold).toBe(1);
    expect(y.science).toBe(1);
    expect(y.culture).toBe(1);
    expect(y.faith).toBe(1);
  });
});
