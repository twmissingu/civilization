// 查询助手（只读访问游戏状态）—— 渲染层统一入口
// 所有渲染层对逻辑层的只读读取都应通过此文件，禁止直接 import 内部规则模块。
import type { HexCoord } from '../../types';
import type { GovernmentId } from '../../gamedata';
import type { GameState, PlayerState, UnitState, CityState, ProductionItem } from './types';
import { hexEquals } from '../hex';
import { getTile } from './mapgen';
import { findPath as findPathImpl, reachableTiles as reachableTilesImpl } from './unitMove';
import { previewCombat as previewCombatImpl, cityAt as cityAtImpl } from './combat';
import { describeTile as describeTileImpl, describeTileShort as describeTileShortImpl, terrainLabel, featureLabel, resourceLabel, YIELD_LABELS, RESOURCE_CATEGORY_LABELS } from './describe';
import { cityYield as cityYieldImpl, playerYield as playerYieldImpl } from './yield';
import { productionCost as productionCostImpl, buyTilePrice as buyTilePriceImpl, foodThreshold } from './city';
import { canBuildImprovement as canBuildImprovementImpl } from './builder';
import { canResearchCivic, canChangeGovernment, canSwitchPolicy } from './civic';
import { canResearch, computeEra } from './tech';
import { playerScore } from './victory';

// ---------- 基础对象查询 ----------

export function findUnit(state: GameState, unitId: string): UnitState | undefined {
  for (const p of state.players) for (const u of p.units) if (u.id === unitId) return u;
  return undefined;
}

export function findCity(state: GameState, cityId: string): CityState | undefined {
  for (const p of state.players) for (const c of p.cities) if (c.id === cityId) return c;
  return undefined;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function unitAt(state: GameState, coord: HexCoord): UnitState | undefined {
  for (const p of state.players) for (const u of p.units) if (hexEquals(u.tile, coord)) return u;
  return undefined;
}

export function cityAt(state: GameState, coord: HexCoord): CityState | undefined {
  return cityAtImpl(state, coord);
}

export function getTileAt(state: GameState, coord: HexCoord) {
  return getTile(state.map, coord);
}

export function findPlayer(state: GameState, playerId: string): PlayerState | undefined {
  return state.players.find((p) => p.id === playerId);
}

// ---------- 移动与战斗 ----------

export function getReachableTiles(state: GameState, unitId: string): HexCoord[] {
  const unit = findUnit(state, unitId);
  if (!unit) return [];
  return reachableTilesImpl(state, unit);
}

export interface PathResult {
  reachable: boolean;
  path: HexCoord[];
  unreachableReason?: string;
}

export function getPath(state: GameState, unitId: string, to: HexCoord): PathResult {
  const unit = findUnit(state, unitId);
  if (!unit) return { reachable: false, path: [], unreachableReason: '单位不存在' };
  const path = findPathImpl(state, unit, to);
  if (path === null) return { reachable: false, path: [], unreachableReason: '无可达路径' };
  return { reachable: true, path };
}

export function getCombatPreview(state: GameState, attackerId: string, targetTile: HexCoord) {
  return previewCombatImpl(state, attackerId, targetTile);
}

// ---------- 地块与城市信息 ----------

export function getTileInfo(state: GameState, coord: HexCoord): string {
  return describeTileImpl(state, coord);
}

export function getTileInfoShort(state: GameState, coord: HexCoord): string {
  return describeTileShortImpl(state, coord);
}

export function getCityYield(state: GameState, cityId: string) {
  const city = findCity(state, cityId);
  if (!city) return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  return cityYieldImpl(state, city);
}

export function getPlayerYield(state: GameState, playerId?: string) {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 };
  return playerYieldImpl(state, player);
}

export function getProductionCost(state: GameState, cityId: string, item: ProductionItem) {
  const city = findCity(state, cityId);
  if (!city) return Infinity;
  return productionCostImpl(state, city, item);
}

export function getBuyTilePrice(state: GameState, cityId: string, tile: HexCoord) {
  const city = findCity(state, cityId);
  if (!city) return Infinity;
  return buyTilePriceImpl(city, tile);
}

export function getFoodThreshold(population: number) {
  return foodThreshold(population);
}

export function canUnitBuildImprovement(state: GameState, builderId: string, improvementId: string): boolean {
  const unit = findUnit(state, builderId);
  if (!unit) return false;
  return canBuildImprovementImpl(state, unit, improvementId);
}

// ---------- 科技/市政/政体 ----------

export function canPlayerResearch(state: GameState, techId: string, playerId?: string): boolean {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return false;
  return canResearch(player, techId);
}

export function canPlayerResearchCivic(state: GameState, civicId: string, playerId?: string): boolean {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return false;
  return canResearchCivic(player, civicId);
}

export function canPlayerChangeGovernment(state: GameState, governmentType: GovernmentId, playerId?: string): boolean {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return false;
  return canChangeGovernment(player, governmentType);
}

export function canPlayerSwitchPolicy(state: GameState, cardId: string, slotIndex: number, playerId?: string): boolean {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return false;
  return canSwitchPolicy(player, cardId, slotIndex);
}

export function getPlayerEra(state: GameState, playerId?: string): string {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return '';
  return computeEra(player.researchedTechs);
}

// ---------- 胜利/分数 ----------

export function getPlayerScore(state: GameState, playerId?: string): number {
  const player = playerId ? findPlayer(state, playerId) : currentPlayer(state);
  if (!player) return 0;
  return playerScore(player);
}

// ---------- 标签/文案（纯数据转换，无业务规则） ----------

export { terrainLabel, featureLabel, resourceLabel, YIELD_LABELS, RESOURCE_CATEGORY_LABELS };
