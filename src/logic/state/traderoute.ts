// 贸易路线逻辑：启动、完成、产出、回合处理
import type { GameState, PlayerState, TradeRouteInstance } from './types';
import { TRADE_ROUTE_DURATION, MAX_TRADE_ROUTE_DISTANCE, tradeRouteYieldTotal } from '../../gamedata/traderoutes';
import { findCity, findUnit } from './query';
import { hexDistance } from '../hex';
import { addYield, type Yield, ZERO_YIELD } from '../../gamedata/types';

let routeIdCounter = 0;

/** 生成唯一贸易路线 id */
function nextRouteId(ownerId: string): string {
  routeIdCounter++;
  return `${ownerId}-tr-${routeIdCounter}`;
}

/** 重置计数器（用于测试） */
export function resetRouteIdCounter(): void {
  routeIdCounter = 0;
}

/** 检查玩家能否启动贸易路线 */
export function canStartTradeRoute(
  state: GameState,
  player: PlayerState,
  traderId: string,
  toCityId: string
): boolean {
  const trader = findUnit(state, traderId);
  if (!trader || trader.ownerId !== player.id) return false;
  if (trader.type !== 'trader') return false;
  if (trader.tradeRouteId) return false; // 商人已有活跃路线

  // 检查容量
  const activeRoutes = player.tradeRoutes?.length ?? 0;
  const capacity = player.tradeRouteCapacity ?? 0;
  if (activeRoutes >= capacity) return false;

  // 查找目标城市
  const toCity = findCity(state, toCityId);
  if (!toCity) return false;

  // 不能送到同一城市
  const fromCity = player.cities.find((c) => c.tile.q === trader.tile.q && c.tile.r === trader.tile.r);
  if (!fromCity) return false;
  if (fromCity.id === toCityId) return false;

  // 检查距离
  const dist = hexDistance(fromCity.tile, toCity.tile);
  if (dist < 3 || dist > MAX_TRADE_ROUTE_DISTANCE) return false;

  // 目标城市不能是正在被攻击的城市（简化：不检查战争状态）
  return true;
}

/** 启动贸易路线 */
export function startTradeRoute(
  state: GameState,
  player: PlayerState,
  traderId: string,
  toCityId: string
): TradeRouteInstance | null {
  const trader = findUnit(state, traderId);
  if (!trader) return null;

  const fromCity = player.cities.find((c) => c.tile.q === trader.tile.q && c.tile.r === trader.tile.r);
  const toCity = findCity(state, toCityId);
  if (!fromCity || !toCity) return null;

  const dist = hexDistance(fromCity.tile, toCity.tile);
  const yieldPerTurn = tradeRouteYieldTotal(dist);

  const route: TradeRouteInstance = {
    id: nextRouteId(player.id),
    ownerId: player.id,
    traderId,
    fromCityId: fromCity.id,
    toCityId,
    toPlayerId: toCity.ownerId,
    turnsCompleted: 0,
    turnsTotal: TRADE_ROUTE_DURATION,
    yieldPerTurn,
  };

  if (!player.tradeRoutes) player.tradeRoutes = [];
  player.tradeRoutes.push(route);
  trader.tradeRouteId = route.id;

  return route;
}

/** 完成贸易路线（释放商人） */
export function completeTradeRoute(
  state: GameState,
  player: PlayerState,
  routeId: string
): TradeRouteInstance | null {
  if (!player.tradeRoutes) return null;
  const idx = player.tradeRoutes.findIndex((r) => r.id === routeId);
  if (idx === -1) return null;

  const route = player.tradeRoutes[idx];
  player.tradeRoutes.splice(idx, 1);

  // 释放商人
  const trader = findUnit(state, route.traderId);
  if (trader) {
    trader.tradeRouteId = undefined;
  }

  return route;
}

/** 计算玩家的贸易路线总产出 */
export function tradeRouteYield(player: PlayerState): Yield {
  let y: Yield = ZERO_YIELD;
  if (!player.tradeRoutes) return y;
  for (const route of player.tradeRoutes) {
    y = addYield(y, route.yieldPerTurn);
  }
  return y;
}

/** 处理所有玩家的贸易路线（每回合调用） */
export function processTradeRoutes(state: GameState): void {
  for (const player of state.players) {
    if (!player.tradeRoutes) continue;
    const completed: string[] = [];
    for (const route of player.tradeRoutes) {
      route.turnsCompleted++;
      if (route.turnsCompleted >= route.turnsTotal) {
        completed.push(route.id);
      }
    }
    // 完成后释放路线
    for (const routeId of completed) {
      completeTradeRoute(state, player, routeId);
    }
  }
}