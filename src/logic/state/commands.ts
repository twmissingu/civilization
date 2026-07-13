// 命令契约：GameCommand union + 两阶段校验 + applyCommand
import type { HexCoord } from '../../types';
import type { GameState, GameEvent } from './types';
import type { DistrictType, GovernmentId } from '../../gamedata';
import { UNITS, BUILDINGS, WONDERS } from '../../gamedata';
import { hexEquals, inBounds } from '../hex';
import { canBuildImprovement, buildImprovement } from './builder';
import { canPlaceDistrict } from './district';
import { canResearch } from './tech';
import { canResearchCivic, canChangeGovernment, changeGovernment, canSwitchPolicy, switchPolicy } from './civic';
import { findPath, moveUnit } from './unitMove';
import { resolveAttack, resolveAttackCity, cityAt, isEnemyCity } from './combat';
import { foundCity, buyTilePrice, settleCity, productionCost } from './city';
import { playerYield } from './yield';
import { resolveTurn } from './turnResolution';
import { findUnit, findCity, currentPlayer, unitAt } from './query';

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
  | { kind: 'startSpaceProject'; cityId: string; stage: 1 | 2 | 3 };

// ---------- helpers（移至 query.ts，此处 re-export 保持兼容）----------
export { findUnit, findCity, currentPlayer };

// ---------- 校验 ----------
export function canExecute(state: GameState, cmd: GameCommand): RuleError | null {
  const player = currentPlayer(state);
  switch (cmd.kind) {
    case 'foundCity': {
      const u = findUnit(state, cmd.unitId);
      if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
      if (u.type !== 'settler') return { code: 'TYPE', message: '需开拓者' };
      if (cityAt(state, u.tile)) return { code: 'OCCUPIED', message: '该格已有城市' };
      return null;
    }
    case 'buildImprovement': {
      const u = findUnit(state, cmd.builderId);
      if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
      if (!canBuildImprovement(state, u, cmd.improvementId)) return { code: 'CANT_BUILD', message: '无法改良' };
      return null;
    }
    case 'research':
      if (!canResearch(player, cmd.techId)) return { code: 'CANT_RESEARCH', message: '无法研究该科技' };
      return null;
    case 'researchCivic':
      if (!canResearchCivic(player, cmd.civicId)) return { code: 'CANT_RESEARCH', message: '无法研究该市政' };
      return null;
    case 'moveUnit': {
      const u = findUnit(state, cmd.unitId);
      if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
      if (!inBounds(cmd.to, state.map.bounds)) return { code: 'OOB', message: '越界' };
      if (findPath(state, u, cmd.to) === null) return { code: 'NO_PATH', message: '无可达路径' };
      return null;
    }
    case 'attack': {
      const u = findUnit(state, cmd.attackerId);
      if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
      if (u.hasActed) return { code: 'ACTED', message: '本回合已行动' };
      const targetUnit = unitAt(state, cmd.targetTile);
      const targetCity = cityAt(state, cmd.targetTile);
      if (targetUnit && targetUnit.ownerId !== player.id && state.diplomacy[player.id]?.[targetUnit.ownerId] === 'war') return null;
      if (targetCity && isEnemyCity(state, u, targetCity)) return null;
      return { code: 'NO_TARGET', message: '无有效敌方目标' };
    }
    case 'trainUnit': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      const u = UNITS[cmd.unitType];
      if (!u) return { code: 'NO_UNIT', message: '单位类型不存在' };
      if (u.unlockTech !== 'initial' && !player.researchedTechs.includes(u.unlockTech)) return { code: 'LOCKED', message: '科技未解锁' };
      return null;
    }
    case 'buildBuilding': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      const b = BUILDINGS[cmd.buildingType];
      if (!b) return { code: 'NO_BUILDING', message: '建筑不存在' };
      if (b.unlockTech && !player.researchedTechs.includes(b.unlockTech)) return { code: 'LOCKED', message: '科技未解锁' };
      if (b.unlockCivic && !player.researchedCivics.includes(b.unlockCivic)) return { code: 'LOCKED', message: '市政未解锁' };
      if (c.buildings.includes(b.id)) return { code: 'EXISTS', message: '已建' };
      return null;
    }
    case 'placeDistrict': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      if (!canPlaceDistrict(state, c, cmd.districtType, cmd.tile)) return { code: 'CANT_PLACE', message: '无法放置区域' };
      return null;
    }
    case 'buildWonder': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      const w = WONDERS[cmd.wonderType];
      if (!w) return { code: 'NO_WONDER', message: '奇观不存在' };
      if (w.unlockTech && !player.researchedTechs.includes(w.unlockTech)) return { code: 'LOCKED', message: '科技未解锁' };
      if (w.unlockCivic && !player.researchedCivics.includes(w.unlockCivic)) return { code: 'LOCKED', message: '市政未解锁' };
      return null;
    }
    case 'buyTile': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      if (!c.territory.some((t) => hexEquals(t, cmd.tile))) {
        // 必须在城中心 3 格内
        // (simplified: check adjacency to territory)
      }
      if (player.gold < buyTilePrice(c, cmd.tile)) return { code: 'GOLD', message: '金币不足' };
      return null;
    }
    case 'switchPolicy':
      if (!canSwitchPolicy(player, cmd.cardId, cmd.slotIndex)) return { code: 'CANT_SWITCH', message: '无法换卡' };
      return null;
    case 'changeGovernment':
      if (!canChangeGovernment(player, cmd.governmentType)) return { code: 'CANT_CHANGE', message: '政体未解锁' };
      return null;
    case 'declareWar':
    case 'suePeace':
      if (!state.players.some((p) => p.id === cmd.targetCivId)) return { code: 'NO_TARGET', message: '目标文明不存在' };
      return null;
    case 'startSpaceProject': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      return null;
    }
    case 'endTurn':
      return null;
    default:
      return { code: 'UNKNOWN', message: '未知命令' };
  }
}

// ---------- 执行 ----------
export function applyCommand(state: GameState, cmd: GameCommand): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  if (state.status === 'finished') {
    return { state, events };
  }
  const err = canExecute(state, cmd);
  if (err !== null) return { state, events };

  const s: GameState = structuredClone(state);
  const player = currentPlayer(s);

  switch (cmd.kind) {
    case 'foundCity': {
      const u = findUnit(s, cmd.unitId);
      if (u) {
        const id = foundCity(s, u, cmd.name);
        events.push({ kind: 'CityFounded', turn: s.turn, payload: { cityId: id } });
      }
      break;
    }
    case 'buildImprovement': {
      const u = findUnit(s, cmd.builderId);
      if (u) buildImprovement(s, u, cmd.improvementId);
      break;
    }
    case 'research':
      player.currentResearch = { techId: cmd.techId, progress: 0 };
      break;
    case 'researchCivic':
      player.currentCivic = { civicId: cmd.civicId, progress: 0 };
      break;
    case 'moveUnit': {
      const u = findUnit(s, cmd.unitId);
      if (u) {
        const path = findPath(s, u, cmd.to);
        if (path) moveUnit(s, u, path);
      }
      break;
    }
    case 'attack': {
      const u = findUnit(s, cmd.attackerId);
      if (u) {
        const targetUnit = unitAt(s, cmd.targetTile);
        const targetCity = cityAt(s, cmd.targetTile);
        if (targetUnit) {
          const r = resolveAttack(s, u, targetUnit);
          events.push({ kind: 'CombatResolved', turn: s.turn, payload: { attackerId: u.id, defenderId: targetUnit.id, ...r } });
        } else if (targetCity) {
          const r = resolveAttackCity(s, u, targetCity);
          events.push({ kind: 'CityAttacked', turn: s.turn, payload: { attackerId: u.id, cityId: targetCity.id, ...r } });
        }
      }
      break;
    }
    case 'trainUnit': {
      const c = findCity(s, cmd.cityId);
      if (c) c.queue.push({ kind: 'unit', id: cmd.unitType, progress: 0 });
      break;
    }
    case 'buildBuilding': {
      const c = findCity(s, cmd.cityId);
      if (c) c.queue.push({ kind: 'building', id: cmd.buildingType, progress: 0 });
      break;
    }
    case 'placeDistrict': {
      const c = findCity(s, cmd.cityId);
      if (c) c.queue.push({ kind: 'district', id: cmd.districtType, progress: 0, tile: cmd.tile });
      break;
    }
    case 'buildWonder': {
      const c = findCity(s, cmd.cityId);
      if (c) c.queue.push({ kind: 'wonder', id: cmd.wonderType, progress: 0, tile: cmd.tile });
      break;
    }
    case 'buyTile': {
      const c = findCity(s, cmd.cityId);
      if (c) {
        const price = buyTilePrice(c, cmd.tile);
        player.gold -= price;
        if (!c.territory.some((t) => hexEquals(t, cmd.tile))) c.territory.push(cmd.tile);
      }
      break;
    }
    case 'switchPolicy': {
      switchPolicy(player, cmd.cardId, cmd.slotIndex);
      break;
    }
    case 'changeGovernment':
      changeGovernment(player, cmd.governmentType);
      events.push({ kind: 'GovernmentChanged', turn: s.turn, payload: { governmentType: cmd.governmentType } });
      break;
    case 'declareWar':
      s.diplomacy[player.id][cmd.targetCivId] = 'war';
      s.diplomacy[cmd.targetCivId][player.id] = 'war';
      events.push({ kind: 'WarDeclared', turn: s.turn, payload: { attackerId: player.id, targetCivId: cmd.targetCivId } });
      break;
    case 'suePeace':
      s.diplomacy[player.id][cmd.targetCivId] = 'peace';
      s.diplomacy[cmd.targetCivId][player.id] = 'peace';
      events.push({ kind: 'PeaceDeclared', turn: s.turn, payload: { civA: player.id, civB: cmd.targetCivId } });
      break;
    case 'startSpaceProject': {
      const c = findCity(s, cmd.cityId);
      if (c && !c.spaceProject) c.queue.push({ kind: 'project', id: `space_${cmd.stage}`, progress: 0 });
      break;
    }
    case 'endTurn': {
      s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
      if (s.currentPlayerIndex === 0) {
        resolveTurn(s);
        if (s.status === 'finished') {
          events.push({ kind: 'GameWon', turn: s.turn, payload: { victor: s.winner!, victoryType: s.victoryType! } });
        }
      }
      break;
    }
  }
  return { state: s, events };
}

// 重新导出供外部使用
export { productionCost, settleCity, playerYield };
