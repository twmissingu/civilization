// 命令契约：GameCommand union + 两阶段校验 + applyCommand
// 委派给 commandRegistry 中的各 handler 执行
import type { GameState, GameEvent, PlayerState } from './types';
import type { HexCoord } from '../../types';
import type { DistrictType, GovernmentId } from '../../gamedata';
import { currentPlayer } from './query';
import { getCommandHandler } from './commandRegistry';
import { productionCost, settleCity } from './city';
import { playerYield } from './yield';

export interface RuleError {
  code: string;
  message: string;
}

export type GameCommand =
  | { kind: 'foundCity'; unitId: string; name: string }
  | { kind: 'buildImprovement'; builderId: string; improvementId: string }
  | { kind: 'research'; techId: string }
  | { kind: 'researchCivic'; civicId: string }
  | { kind: 'endTurn' }
  | { kind: 'moveUnit'; unitId: string; to: HexCoord }
  | { kind: 'attack'; attackerId: string; targetTile: HexCoord }
  | { kind: 'trainUnit'; cityId: string; unitType: string }
  | { kind: 'buildBuilding'; cityId: string; buildingType: string }
  | { kind: 'placeDistrict'; cityId: string; districtType: DistrictType; tile: HexCoord }
  | { kind: 'buildWonder'; cityId: string; wonderType: string; tile: HexCoord }
  | { kind: 'buyTile'; cityId: string; tile: HexCoord }
  | { kind: 'switchPolicy'; cardId: string; slotIndex: number }
  | { kind: 'changeGovernment'; governmentType: GovernmentId }
  | { kind: 'declareWar'; targetCivId: string }
  | { kind: 'suePeace'; targetCivId: string }
  | { kind: 'startSpaceProject'; cityId: string; stage: 1 | 2 | 3 }
  | { kind: 'sendEnvoy'; cityStateId: string }
  | { kind: 'recruitGreatPerson'; greatPersonId: string }
  | { kind: 'startTradeRoute'; traderId: string; toCityId: string }
  | { kind: 'foundPantheon'; pantheonId: string }
  | { kind: 'foundReligion' }
  | { kind: 'purchaseMissionary'; cityId: string }
  | { kind: 'purchaseApostle'; cityId: string }
  | { kind: 'spreadReligion'; unitId: string; targetCityId: string }
  | { kind: 'choosePromotion'; unitId: string; promotionId: string }
  | { kind: 'assignCitizen'; cityId: string; tile: HexCoord }
  | { kind: 'unassignCitizen'; cityId: string; tile: HexCoord }
  | { kind: 'reorderQueue'; cityId: string; fromIndex: number; toIndex: number }
  | { kind: 'removeFromQueue'; cityId: string; index: number }
  | { kind: 'offerTrade'; targetCivId: string; offerGold: number; demandGold: number };

// ---------- helpers（移至 query.ts，此处 re-export 保持兼容）----------
export { findUnit, findCity, currentPlayer } from './query';

/** 玩家失败：无城且无单位 */
export function isDefeated(p: PlayerState): boolean {
  return p.cities.length === 0 && p.units.length === 0;
}

/** 下一非失败玩家索引（用于 endTurn 跳过已淘汰者） */
export function nextActivePlayer(state: GameState): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (state.currentPlayerIndex + i) % n;
    if (!isDefeated(state.players[idx])) return idx;
  }
  return state.currentPlayerIndex;
}

// ---------- 校验（委派给注册表）----------
export function canExecute(state: GameState, cmd: GameCommand): RuleError | null {
  const player = currentPlayer(state);
  const handler = getCommandHandler(cmd.kind);
  if (!handler) return { code: 'UNKNOWN', message: '未知命令' };
  return handler.canExecute(state, cmd, player);
}

// ---------- 执行（委派给注册表）----------
export function applyCommand(state: GameState, cmd: GameCommand): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  if (state.status === 'finished') {
    return { state, events };
  }
  const err = canExecute(state, cmd);
  if (err !== null) return { state, events };

  const s: GameState = structuredClone(state);
  const player = currentPlayer(s);
  const handler = getCommandHandler(cmd.kind);
  if (handler) {
    handler.apply(s, cmd, player, events);
  }
  return { state: s, events };
}

// 重新导出供外部使用
export { productionCost, settleCity, playerYield };
