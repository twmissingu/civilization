// 命令契约：GameCommand union + 两阶段校验 + applyCommand
import type { HexCoord } from '../../types';
import type { GameState, GameEvent, PlayerState } from './types';
import type { DistrictType, GovernmentId } from '../../gamedata';
import { UNITS, BUILDINGS, WONDERS } from '../../gamedata';
import { hexEquals, hexDistance, inBounds } from '../hex';
import { canBuildImprovement, buildImprovement } from './builder';
import { canPlaceDistrict } from './district';
import { canResearch } from './tech';
import { canResearchCivic, canChangeGovernment, changeGovernment, canSwitchPolicy, switchPolicy } from './civic';
import { findPath, moveUnit } from './unitMove';
import { resolveAttack, resolveAttackCity, cityAt, isEnemyCity, availablePromotions, applyPromotion, canLevelUp } from './combat';
import { foundCity, buyTilePrice, settleCity, productionCost } from './city';
import { playerYield } from './yield';
import { resolveTurn } from './turnResolution';
import { findUnit, findCity, currentPlayer, unitAt, findPlayer } from './query';
import { canSendEnvoy, sendEnvoy } from './citystate';
import { canRecruitGreatPerson, recruitGreatPerson } from './greatpeople';
import { canStartTradeRoute, startTradeRoute } from './traderoute';
import { canFoundPantheon, foundPantheon, canFoundReligion, foundReligion, canPurchaseMissionary, purchaseMissionary, canPurchaseApostle, purchaseApostle, spreadReligion } from './religion';

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
export { findUnit, findCity, currentPlayer };

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
      // 堆叠规则：同一格不能有两个军事单位
      const targetDef = UNITS[u.type];
      const isMilitary = targetDef && targetDef.unitClass === 'military';
      if (isMilitary) {
        const existingMilitary = unitAt(state, cmd.to);
        if (existingMilitary && existingMilitary.ownerId === player.id) {
          const existingDef = UNITS[existingMilitary.type];
          if (existingDef && existingDef.unitClass === 'military') {
            return { code: 'STACK', message: '该格已有军事单位' };
          }
        }
      }
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
      if (hexDistance(c.tile, cmd.tile) > 3) return { code: 'RANGE', message: '地块超出购买范围（3格）' };
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
    case 'sendEnvoy':
      if (!canSendEnvoy(state, player, cmd.cityStateId)) return { code: 'CANT_SEND', message: '无法派遣使者' };
      return null;
    case 'recruitGreatPerson':
      if (!canRecruitGreatPerson(state, player, cmd.greatPersonId)) return { code: 'CANT_RECRUIT', message: '无法招募该大人物' };
      return null;
    case 'startTradeRoute':
      if (!canStartTradeRoute(state, player, cmd.traderId, cmd.toCityId)) return { code: 'CANT_TRADE', message: '无法建立贸易路线' };
      return null;
    case 'foundPantheon':
      if (!canFoundPantheon(player, cmd.pantheonId)) return { code: 'CANT_FOUND', message: '无法选择万神殿' };
      return null;
    case 'foundReligion':
      if (!canFoundReligion(state, player)) return { code: 'CANT_FOUND', message: '无法创立宗教' };
      return null;
    case 'purchaseMissionary':
      if (!canPurchaseMissionary(state, player, cmd.cityId)) return { code: 'CANT_PURCHASE', message: '无法购买传教士' };
      return null;
    case 'purchaseApostle':
      if (!canPurchaseApostle(state, player, cmd.cityId)) return { code: 'CANT_PURCHASE', message: '无法购买使徒' };
      return null;
    case 'spreadReligion': {
      const u = findUnit(state, cmd.unitId);
      if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
      if (u.type !== 'missionary' && u.type !== 'apostle') return { code: 'TYPE', message: '需传教士或使徒' };
      const targetCity = findCity(state, cmd.targetCityId);
      if (!targetCity) return { code: 'NO_CITY', message: '目标城市不存在' };
      if (u.charges !== undefined && u.charges <= 0) return { code: 'NO_CHARGES', message: '无可用传教次数' };
      return null;
    }
    case 'choosePromotion': {
      const u = findUnit(state, cmd.unitId);
      if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
      if (!canLevelUp(u)) return { code: 'CANT_LEVEL', message: '单位未达到升级条件' };
      if (!availablePromotions(u).includes(cmd.promotionId)) return { code: 'NO_PROMOTION', message: '该晋升不可用' };
      return null;
    }
    case 'assignCitizen': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      if (c.workedTiles.length >= c.population) return { code: 'FULL', message: '已无可用市民' };
      if (c.territory.some((t) => hexEquals(t, cmd.tile))) return null;
      return { code: 'NOT_TERRITORY', message: '地块不在领土内' };
    }
    case 'unassignCitizen': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      if (!c.workedTiles.some((t) => hexEquals(t, cmd.tile))) return { code: 'NOT_WORKED', message: '该地块未工作' };
      return null;
    }
    case 'reorderQueue': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      if (cmd.fromIndex < 0 || cmd.fromIndex >= c.queue.length) return { code: 'INVALID', message: '无效索引' };
      if (cmd.toIndex < 0 || cmd.toIndex >= c.queue.length) return { code: 'INVALID', message: '无效索引' };
      return null;
    }
    case 'removeFromQueue': {
      const c = findCity(state, cmd.cityId);
      if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
      if (cmd.index < 0 || cmd.index >= c.queue.length) return { code: 'INVALID', message: '无效索引' };
      return null;
    }
    case 'offerTrade': {
      const target = findPlayer(state, cmd.targetCivId);
      if (!target) return { code: 'NO_TARGET', message: '目标文明不存在' };
      if (state.diplomacy[player.id]?.[cmd.targetCivId] === 'war') return { code: 'AT_WAR', message: '战争状态无法交易' };
      if (cmd.offerGold < 0 || cmd.demandGold < 0) return { code: 'INVALID', message: '金额不能为负' };
      if (player.gold < cmd.offerGold) return { code: 'NO_GOLD', message: '金币不足' };
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
          const defenderTile = targetUnit.tile;
          const r = resolveAttack(s, u, targetUnit);
          events.push({
            kind: 'CombatResolved',
            turn: s.turn,
            payload: {
              attackerId: u.id,
              attackerOwnerId: u.ownerId,
              attackerType: u.type,
              defenderId: targetUnit.id,
              defenderOwnerId: targetUnit.ownerId,
              defenderType: targetUnit.type,
              defenderTile,
              ...r,
            },
          });
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
      events.push({ kind: 'GovernmentChanged', turn: s.turn, payload: { playerId: player.id, governmentType: cmd.governmentType } });
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
    case 'sendEnvoy': {
      sendEnvoy(s, player, cmd.cityStateId);
      events.push({ kind: 'EnvoySent', turn: s.turn, payload: { playerId: player.id, cityStateId: cmd.cityStateId } });
      break;
    }
    case 'recruitGreatPerson': {
      recruitGreatPerson(s, player, cmd.greatPersonId);
      events.push({ kind: 'GreatPersonRecruited', turn: s.turn, payload: { playerId: player.id, greatPersonId: cmd.greatPersonId } });
      break;
    }
    case 'startTradeRoute': {
      const route = startTradeRoute(s, player, cmd.traderId, cmd.toCityId);
      if (route) {
        events.push({ kind: 'TradeRouteStarted', turn: s.turn, payload: { routeId: route.id, traderId: cmd.traderId, fromCityId: route.fromCityId, toCityId: cmd.toCityId } });
      }
      break;
    }
    case 'foundPantheon': {
      foundPantheon(s, player, cmd.pantheonId);
      events.push({ kind: 'PantheonFounded', turn: s.turn, payload: { playerId: player.id, pantheonId: cmd.pantheonId } });
      break;
    }
    case 'foundReligion': {
      foundReligion(s, player);
      events.push({ kind: 'ReligionFounded', turn: s.turn, payload: { playerId: player.id, religionId: player.religionId, religionName: player.religionName } });
      break;
    }
    case 'purchaseMissionary': {
      purchaseMissionary(s, player, cmd.cityId);
      events.push({ kind: 'MissionaryPurchased', turn: s.turn, payload: { playerId: player.id, cityId: cmd.cityId } });
      break;
    }
    case 'purchaseApostle': {
      purchaseApostle(s, player, cmd.cityId);
      events.push({ kind: 'ApostlePurchased', turn: s.turn, payload: { playerId: player.id, cityId: cmd.cityId } });
      break;
    }
    case 'spreadReligion': {
      spreadReligion(s, cmd.unitId, cmd.targetCityId);
      const targetCity = findCity(s, cmd.targetCityId);
      if (targetCity) {
        events.push({ kind: 'ReligionSpread', turn: s.turn, payload: { unitId: cmd.unitId, cityId: cmd.targetCityId, dominantReligion: targetCity.dominantReligion } });
      }
      break;
    }
    case 'choosePromotion': {
      const u = findUnit(s, cmd.unitId);
      if (u) {
        applyPromotion(u, cmd.promotionId);
        events.push({ kind: 'UnitPromoted', turn: s.turn, payload: { unitId: cmd.unitId, promotionId: cmd.promotionId, unitType: u.type } });
      }
      break;
    }
    case 'assignCitizen': {
      const city = findCity(s, cmd.cityId);
      if (city && !city.workedTiles.some((t) => hexEquals(t, cmd.tile))) {
        city.workedTiles.push(cmd.tile);
      }
      break;
    }
    case 'unassignCitizen': {
      const city = findCity(s, cmd.cityId);
      if (city) {
        city.workedTiles = city.workedTiles.filter((t) => !hexEquals(t, cmd.tile));
      }
      break;
    }
    case 'reorderQueue': {
      const city = findCity(s, cmd.cityId);
      if (city && cmd.fromIndex >= 0 && cmd.fromIndex < city.queue.length && cmd.toIndex >= 0 && cmd.toIndex < city.queue.length) {
        const item = city.queue.splice(cmd.fromIndex, 1)[0];
        city.queue.splice(cmd.toIndex, 0, item);
      }
      break;
    }
    case 'removeFromQueue': {
      const city = findCity(s, cmd.cityId);
      if (city && cmd.index >= 0 && cmd.index < city.queue.length) {
        city.queue.splice(cmd.index, 1);
      }
      break;
    }
    case 'offerTrade': {
      const target = findPlayer(s, cmd.targetCivId);
      if (target && cmd.offerGold >= 0 && cmd.demandGold >= 0 && player.gold >= cmd.offerGold) {
        // AI 简单接受/拒绝逻辑：只接受净收益 > 0 的交易
        const netGain = cmd.offerGold - cmd.demandGold;
        if (target.isAI && netGain < 0) break; // AI 拒绝亏本交易
        player.gold -= cmd.offerGold;
        player.gold += cmd.demandGold;
        target.gold += cmd.offerGold;
        target.gold -= cmd.demandGold;
        events.push({ kind: 'TradeCompleted', turn: s.turn, payload: { fromId: player.id, toId: cmd.targetCivId, offerGold: cmd.offerGold, demandGold: cmd.demandGold } });
      }
      break;
    }
    case 'endTurn': {
      const prev = s.currentPlayerIndex;
      const next = nextActivePlayer(s);
      if (next <= prev) {
        events.push(...resolveTurn(s));
        if (s.status === 'finished') {
          events.push({ kind: 'GameWon', turn: s.turn, payload: { victor: s.winner!, victoryType: s.victoryType! } });
        }
      }
      s.currentPlayerIndex = next;
      break;
    }
  }
  return { state: s, events };
}

// 重新导出供外部使用
export { productionCost, settleCity, playerYield };
