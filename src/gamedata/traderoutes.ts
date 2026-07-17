// 贸易路线数据定义
import type { Yield } from './types';

/** 贸易路线产出定义 */
export interface TradeRouteBonusDef {
  id: string;
  name: string;
  yieldPerTurn: Yield;
  /** 每格距离额外产出 */
  distanceYield?: Partial<Yield>;
  /** 解锁条件 */
  unlockTech?: string;
  unlockCivic?: string;
}

/** 贸易路线基础产出（距离无关） */
const BASE_TRADE_YIELD: Yield = { food: 0, production: 0, gold: 3, science: 0, culture: 0, faith: 0 };

/** 每格距离额外产出 */
const DISTANCE_YIELD: Partial<Yield> = { gold: 0.5 };

/** 贸易路线持续回合数 */
export const TRADE_ROUTE_DURATION = 20;

/** 最大贸易路线距离 */
export const MAX_TRADE_ROUTE_DISTANCE = 15;

/** 最小贸易路线距离（不能送到同一城市） */
export const MIN_TRADE_ROUTE_DISTANCE = 3;

/** 计算贸易路线总产出（base + 距离加成） */
export function tradeRouteYieldTotal(distance: number): Yield {
  return {
    food: BASE_TRADE_YIELD.food + (distance * (DISTANCE_YIELD.food ?? 0)),
    production: BASE_TRADE_YIELD.production + (distance * (DISTANCE_YIELD.production ?? 0)),
    gold: BASE_TRADE_YIELD.gold + Math.floor(distance * (DISTANCE_YIELD.gold ?? 0.5)),
    science: BASE_TRADE_YIELD.science + (distance * (DISTANCE_YIELD.science ?? 0)),
    culture: BASE_TRADE_YIELD.culture + (distance * (DISTANCE_YIELD.culture ?? 0)),
    faith: BASE_TRADE_YIELD.faith + (distance * (DISTANCE_YIELD.faith ?? 0)),
  };
}