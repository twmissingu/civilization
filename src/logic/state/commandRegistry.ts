// 命令注册表：将 GameCommand 的 canExecute + apply 逻辑组织为 handler 对象
// 每个 handler 负责一种命令 kind 的校验和执行
import type { GameState, GameEvent, PlayerState } from './types';
import { UNITS, BUILDINGS, WONDERS } from '../../gamedata';
import { hexEquals, hexDistance, inBounds } from '../hex';
import { canBuildImprovement, buildImprovement } from './builder';
import { canPlaceDistrict } from './district';
import { canResearch } from './tech';
import { canResearchCivic, canChangeGovernment, changeGovernment, canSwitchPolicy, switchPolicy } from './civic';
import { findPath, moveUnit } from './unitMove';
import { resolveAttack, resolveAttackCity, cityAt, isEnemyCity, availablePromotions, applyPromotion, canLevelUp } from './combat';
import { foundCity, buyTilePrice } from './city';
import { resolveTurn } from './turnResolution';
import { findUnit, findCity, unitAt, findPlayer } from './query';
import { canSendEnvoy, sendEnvoy } from './citystate';
import { canRecruitGreatPerson, recruitGreatPerson } from './greatpeople';
import { canStartTradeRoute, startTradeRoute } from './traderoute';
import { canFoundPantheon, foundPantheon, canFoundReligion, foundReligion, canPurchaseMissionary, purchaseMissionary, canPurchaseApostle, purchaseApostle, spreadReligion } from './religion';
import type { RuleError } from './commands';
import { nextActivePlayer } from './commands';

export interface CommandHandler {
  canExecute: (state: GameState, cmd: any, player: PlayerState) => RuleError | null;
  apply: (state: GameState, cmd: any, player: PlayerState, events: GameEvent[]) => void;
}

const registry = new Map<string, CommandHandler>();

export function registerCommand(kind: string, handler: CommandHandler): void {
  registry.set(kind, handler);
}

export function getCommandHandler(kind: string): CommandHandler | undefined {
  return registry.get(kind);
}

// ---------- foundCity ----------
registerCommand('foundCity', {
  canExecute(state, cmd, player) {
    const u = findUnit(state, cmd.unitId);
    if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
    if (u.type !== 'settler') return { code: 'TYPE', message: '需开拓者' };
    if (cityAt(state, u.tile)) return { code: 'OCCUPIED', message: '该格已有城市' };
    return null;
  },
  apply(s, cmd, _player, events) {
    const u = findUnit(s, cmd.unitId);
    if (u) {
      const id = foundCity(s, u, cmd.name);
      events.push({ kind: 'CityFounded', turn: s.turn, payload: { cityId: id } });
    }
  },
});

// ---------- buildImprovement ----------
registerCommand('buildImprovement', {
  canExecute(state, cmd, player) {
    const u = findUnit(state, cmd.unitId);
    if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
    if (!canBuildImprovement(state, u, cmd.improvementId)) return { code: 'CANT_BUILD', message: '无法改良' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const u = findUnit(s, cmd.builderId);
    if (u) buildImprovement(s, u, cmd.improvementId);
  },
});

// ---------- research ----------
registerCommand('research', {
  canExecute(_state, cmd, player) {
    if (!canResearch(player, cmd.techId)) return { code: 'CANT_RESEARCH', message: '无法研究该科技' };
    return null;
  },
  apply(_s, cmd, player, _events) {
    player.currentResearch = { techId: cmd.techId, progress: 0 };
  },
});

// ---------- researchCivic ----------
registerCommand('researchCivic', {
  canExecute(_state, cmd, player) {
    if (!canResearchCivic(player, cmd.civicId)) return { code: 'CANT_RESEARCH', message: '无法研究该市政' };
    return null;
  },
  apply(_s, cmd, player, _events) {
    player.currentCivic = { civicId: cmd.civicId, progress: 0 };
  },
});

// ---------- endTurn ----------
registerCommand('endTurn', {
  canExecute(_state, _cmd, _player) {
    return null;
  },
  apply(s, _cmd, _player, events) {
    const prev = s.currentPlayerIndex;
    const next = nextActivePlayer(s);
    if (next <= prev) {
      events.push(...resolveTurn(s));
      if (s.status === 'finished') {
        events.push({ kind: 'GameWon', turn: s.turn, payload: { victor: s.winner!, victoryType: s.victoryType! } });
      }
    }
    s.currentPlayerIndex = next;
  },
});

// ---------- moveUnit ----------
registerCommand('moveUnit', {
  canExecute(state, cmd, player) {
    const u = findUnit(state, cmd.unitId);
    if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
    if (!inBounds(cmd.to, state.map.bounds)) return { code: 'OOB', message: '越界' };
    if (findPath(state, u, cmd.to) === null) return { code: 'NO_PATH', message: '无可达路径' };
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
  },
  apply(s, cmd, _player, _events) {
    const u = findUnit(s, cmd.unitId);
    if (u) {
      const path = findPath(s, u, cmd.to);
      if (path) moveUnit(s, u, path);
    }
  },
});

// ---------- attack ----------
registerCommand('attack', {
  canExecute(state, cmd, player) {
    const u = findUnit(state, cmd.attackerId);
    if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
    if (u.hasActed) return { code: 'ACTED', message: '本回合已行动' };
    const targetUnit = unitAt(state, cmd.targetTile);
    const targetCity = cityAt(state, cmd.targetTile);
    if (targetUnit && targetUnit.ownerId !== player.id && state.diplomacy[player.id]?.[targetUnit.ownerId] === 'war') return null;
    if (targetCity && isEnemyCity(state, u, targetCity)) return null;
    return { code: 'NO_TARGET', message: '无有效敌方目标' };
  },
  apply(s, cmd, _player, events) {
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
  },
});

// ---------- trainUnit ----------
registerCommand('trainUnit', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    const u = UNITS[cmd.unitType];
    if (!u) return { code: 'NO_UNIT', message: '单位类型不存在' };
    if (u.unlockTech !== 'initial' && !player.researchedTechs.includes(u.unlockTech)) return { code: 'LOCKED', message: '科技未解锁' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const c = findCity(s, cmd.cityId);
    if (c) c.queue.push({ kind: 'unit', id: cmd.unitType, progress: 0 });
  },
});

// ---------- buildBuilding ----------
registerCommand('buildBuilding', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    const b = BUILDINGS[cmd.buildingType];
    if (!b) return { code: 'NO_BUILDING', message: '建筑不存在' };
    if (b.unlockTech && !player.researchedTechs.includes(b.unlockTech)) return { code: 'LOCKED', message: '科技未解锁' };
    if (b.unlockCivic && !player.researchedCivics.includes(b.unlockCivic)) return { code: 'LOCKED', message: '市政未解锁' };
    if (c.buildings.includes(b.id)) return { code: 'EXISTS', message: '已建' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const c = findCity(s, cmd.cityId);
    if (c) c.queue.push({ kind: 'building', id: cmd.buildingType, progress: 0 });
  },
});

// ---------- placeDistrict ----------
registerCommand('placeDistrict', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    if (!canPlaceDistrict(state, c, cmd.districtType, cmd.tile)) return { code: 'CANT_PLACE', message: '无法放置区域' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const c = findCity(s, cmd.cityId);
    if (c) c.queue.push({ kind: 'district', id: cmd.districtType, progress: 0, tile: cmd.tile });
  },
});

// ---------- buildWonder ----------
registerCommand('buildWonder', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    const w = WONDERS[cmd.wonderType];
    if (!w) return { code: 'NO_WONDER', message: '奇观不存在' };
    if (w.unlockTech && !player.researchedTechs.includes(w.unlockTech)) return { code: 'LOCKED', message: '科技未解锁' };
    if (w.unlockCivic && !player.researchedCivics.includes(w.unlockCivic)) return { code: 'LOCKED', message: '市政未解锁' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const c = findCity(s, cmd.cityId);
    if (c) c.queue.push({ kind: 'wonder', id: cmd.wonderType, progress: 0, tile: cmd.tile });
  },
});

// ---------- buyTile ----------
registerCommand('buyTile', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    if (hexDistance(c.tile, cmd.tile) > 3) return { code: 'RANGE', message: '地块超出购买范围（3格）' };
    if (player.gold < buyTilePrice(c, cmd.tile)) return { code: 'GOLD', message: '金币不足' };
    return null;
  },
  apply(s, cmd, player, _events) {
    const c = findCity(s, cmd.cityId);
    if (c) {
      const price = buyTilePrice(c, cmd.tile);
      player.gold -= price;
      if (!c.territory.some((t) => hexEquals(t, cmd.tile))) c.territory.push(cmd.tile);
    }
  },
});

// ---------- switchPolicy ----------
registerCommand('switchPolicy', {
  canExecute(_state, cmd, player) {
    if (!canSwitchPolicy(player, cmd.cardId, cmd.slotIndex)) return { code: 'CANT_SWITCH', message: '无法换卡' };
    return null;
  },
  apply(_s, cmd, player, _events) {
    switchPolicy(player, cmd.cardId, cmd.slotIndex);
  },
});

// ---------- changeGovernment ----------
registerCommand('changeGovernment', {
  canExecute(_state, cmd, player) {
    if (!canChangeGovernment(player, cmd.governmentType)) return { code: 'CANT_CHANGE', message: '政体未解锁' };
    return null;
  },
  apply(s, cmd, player, events) {
    changeGovernment(player, cmd.governmentType);
    events.push({ kind: 'GovernmentChanged', turn: s.turn, payload: { playerId: player.id, governmentType: cmd.governmentType } });
  },
});

// ---------- declareWar ----------
registerCommand('declareWar', {
  canExecute(state, cmd, _player) {
    if (!state.players.some((p) => p.id === cmd.targetCivId)) return { code: 'NO_TARGET', message: '目标文明不存在' };
    return null;
  },
  apply(s, cmd, player, events) {
    s.diplomacy[player.id][cmd.targetCivId] = 'war';
    s.diplomacy[cmd.targetCivId][player.id] = 'war';
    events.push({ kind: 'WarDeclared', turn: s.turn, payload: { attackerId: player.id, targetCivId: cmd.targetCivId } });
  },
});

// ---------- suePeace ----------
registerCommand('suePeace', {
  canExecute(state, cmd, _player) {
    if (!state.players.some((p) => p.id === cmd.targetCivId)) return { code: 'NO_TARGET', message: '目标文明不存在' };
    return null;
  },
  apply(s, cmd, player, events) {
    s.diplomacy[player.id][cmd.targetCivId] = 'peace';
    s.diplomacy[cmd.targetCivId][player.id] = 'peace';
    events.push({ kind: 'PeaceDeclared', turn: s.turn, payload: { civA: player.id, civB: cmd.targetCivId } });
  },
});

// ---------- startSpaceProject ----------
registerCommand('startSpaceProject', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const c = findCity(s, cmd.cityId);
    if (c && !c.spaceProject) c.queue.push({ kind: 'project', id: `space_${cmd.stage}`, progress: 0 });
  },
});

// ---------- sendEnvoy ----------
registerCommand('sendEnvoy', {
  canExecute(state, cmd, player) {
    if (!canSendEnvoy(state, player, cmd.cityStateId)) return { code: 'CANT_SEND', message: '无法派遣使者' };
    return null;
  },
  apply(s, cmd, player, events) {
    sendEnvoy(s, player, cmd.cityStateId);
    events.push({ kind: 'EnvoySent', turn: s.turn, payload: { playerId: player.id, cityStateId: cmd.cityStateId } });
  },
});

// ---------- recruitGreatPerson ----------
registerCommand('recruitGreatPerson', {
  canExecute(state, cmd, player) {
    if (!canRecruitGreatPerson(state, player, cmd.greatPersonId)) return { code: 'CANT_RECRUIT', message: '无法招募该大人物' };
    return null;
  },
  apply(s, cmd, player, events) {
    recruitGreatPerson(s, player, cmd.greatPersonId);
    events.push({ kind: 'GreatPersonRecruited', turn: s.turn, payload: { playerId: player.id, greatPersonId: cmd.greatPersonId } });
  },
});

// ---------- startTradeRoute ----------
registerCommand('startTradeRoute', {
  canExecute(state, cmd, player) {
    if (!canStartTradeRoute(state, player, cmd.traderId, cmd.toCityId)) return { code: 'CANT_TRADE', message: '无法建立贸易路线' };
    return null;
  },
  apply(s, cmd, player, events) {
    const route = startTradeRoute(s, player, cmd.traderId, cmd.toCityId);
    if (route) {
      events.push({ kind: 'TradeRouteStarted', turn: s.turn, payload: { routeId: route.id, traderId: cmd.traderId, fromCityId: route.fromCityId, toCityId: cmd.toCityId } });
    }
  },
});

// ---------- foundPantheon ----------
registerCommand('foundPantheon', {
  canExecute(_state, cmd, player) {
    if (!canFoundPantheon(player, cmd.pantheonId)) return { code: 'CANT_FOUND', message: '无法选择万神殿' };
    return null;
  },
  apply(s, cmd, player, events) {
    foundPantheon(s, player, cmd.pantheonId);
    events.push({ kind: 'PantheonFounded', turn: s.turn, payload: { playerId: player.id, pantheonId: cmd.pantheonId } });
  },
});

// ---------- foundReligion ----------
registerCommand('foundReligion', {
  canExecute(state, _cmd, player) {
    if (!canFoundReligion(state, player)) return { code: 'CANT_FOUND', message: '无法创立宗教' };
    return null;
  },
  apply(s, _cmd, player, events) {
    foundReligion(s, player);
    events.push({ kind: 'ReligionFounded', turn: s.turn, payload: { playerId: player.id, religionId: player.religionId, religionName: player.religionName } });
  },
});

// ---------- purchaseMissionary ----------
registerCommand('purchaseMissionary', {
  canExecute(state, cmd, player) {
    if (!canPurchaseMissionary(state, player, cmd.cityId)) return { code: 'CANT_PURCHASE', message: '无法购买传教士' };
    return null;
  },
  apply(s, cmd, player, events) {
    purchaseMissionary(s, player, cmd.cityId);
    events.push({ kind: 'MissionaryPurchased', turn: s.turn, payload: { playerId: player.id, cityId: cmd.cityId } });
  },
});

// ---------- purchaseApostle ----------
registerCommand('purchaseApostle', {
  canExecute(state, cmd, player) {
    if (!canPurchaseApostle(state, player, cmd.cityId)) return { code: 'CANT_PURCHASE', message: '无法购买使徒' };
    return null;
  },
  apply(s, cmd, player, events) {
    purchaseApostle(s, player, cmd.cityId);
    events.push({ kind: 'ApostlePurchased', turn: s.turn, payload: { playerId: player.id, cityId: cmd.cityId } });
  },
});

// ---------- spreadReligion ----------
registerCommand('spreadReligion', {
  canExecute(state, cmd, player) {
    const u = findUnit(state, cmd.unitId);
    if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
    if (u.type !== 'missionary' && u.type !== 'apostle') return { code: 'TYPE', message: '需传教士或使徒' };
    const targetCity = findCity(state, cmd.targetCityId);
    if (!targetCity) return { code: 'NO_CITY', message: '目标城市不存在' };
    if (u.charges !== undefined && u.charges <= 0) return { code: 'NO_CHARGES', message: '无可用传教次数' };
    return null;
  },
  apply(s, cmd, _player, events) {
    spreadReligion(s, cmd.unitId, cmd.targetCityId);
    const targetCity = findCity(s, cmd.targetCityId);
    if (targetCity) {
      events.push({ kind: 'ReligionSpread', turn: s.turn, payload: { unitId: cmd.unitId, cityId: cmd.targetCityId, dominantReligion: targetCity.dominantReligion } });
    }
  },
});

// ---------- choosePromotion ----------
registerCommand('choosePromotion', {
  canExecute(state, cmd, player) {
    const u = findUnit(state, cmd.unitId);
    if (!u || u.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家单位' };
    if (!canLevelUp(u)) return { code: 'CANT_LEVEL', message: '单位未达到升级条件' };
    if (!availablePromotions(u).includes(cmd.promotionId)) return { code: 'NO_PROMOTION', message: '该晋升不可用' };
    return null;
  },
  apply(s, cmd, _player, events) {
    const u = findUnit(s, cmd.unitId);
    if (u) {
      applyPromotion(u, cmd.promotionId);
      events.push({ kind: 'UnitPromoted', turn: s.turn, payload: { unitId: cmd.unitId, promotionId: cmd.promotionId, unitType: u.type } });
    }
  },
});

// ---------- assignCitizen ----------
registerCommand('assignCitizen', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    if (c.workedTiles.length >= c.population) return { code: 'FULL', message: '已无可用市民' };
    if (c.territory.some((t) => hexEquals(t, cmd.tile))) return null;
    return { code: 'NOT_TERRITORY', message: '地块不在领土内' };
  },
  apply(s, cmd, _player, _events) {
    const city = findCity(s, cmd.cityId);
    if (city && !city.workedTiles.some((t) => hexEquals(t, cmd.tile))) {
      city.workedTiles.push(cmd.tile);
    }
  },
});

// ---------- unassignCitizen ----------
registerCommand('unassignCitizen', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    if (!c.workedTiles.some((t) => hexEquals(t, cmd.tile))) return { code: 'NOT_WORKED', message: '该地块未工作' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const city = findCity(s, cmd.cityId);
    if (city) {
      city.workedTiles = city.workedTiles.filter((t) => !hexEquals(t, cmd.tile));
    }
  },
});

// ---------- reorderQueue ----------
registerCommand('reorderQueue', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    if (cmd.fromIndex < 0 || cmd.fromIndex >= c.queue.length) return { code: 'INVALID', message: '无效索引' };
    if (cmd.toIndex < 0 || cmd.toIndex >= c.queue.length) return { code: 'INVALID', message: '无效索引' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const city = findCity(s, cmd.cityId);
    if (city && cmd.fromIndex >= 0 && cmd.fromIndex < city.queue.length && cmd.toIndex >= 0 && cmd.toIndex < city.queue.length) {
      const item = city.queue.splice(cmd.fromIndex, 1)[0];
      city.queue.splice(cmd.toIndex, 0, item);
    }
  },
});

// ---------- removeFromQueue ----------
registerCommand('removeFromQueue', {
  canExecute(state, cmd, player) {
    const c = findCity(state, cmd.cityId);
    if (!c || c.ownerId !== player.id) return { code: 'OWNER', message: '非当前玩家城市' };
    if (cmd.index < 0 || cmd.index >= c.queue.length) return { code: 'INVALID', message: '无效索引' };
    return null;
  },
  apply(s, cmd, _player, _events) {
    const city = findCity(s, cmd.cityId);
    if (city && cmd.index >= 0 && cmd.index < city.queue.length) {
      city.queue.splice(cmd.index, 1);
    }
  },
});

// ---------- offerTrade ----------
registerCommand('offerTrade', {
  canExecute(state, cmd, player) {
    const target = findPlayer(state, cmd.targetCivId);
    if (!target) return { code: 'NO_TARGET', message: '目标文明不存在' };
    if (state.diplomacy[player.id]?.[cmd.targetCivId] === 'war') return { code: 'AT_WAR', message: '战争状态无法交易' };
    if (cmd.offerGold < 0 || cmd.demandGold < 0) return { code: 'INVALID', message: '金额不能为负' };
    if (player.gold < cmd.offerGold) return { code: 'NO_GOLD', message: '金币不足' };
    return null;
  },
  apply(s, cmd, player, events) {
    const target = findPlayer(s, cmd.targetCivId);
    if (target && cmd.offerGold >= 0 && cmd.demandGold >= 0 && player.gold >= cmd.offerGold) {
      const netGain = cmd.offerGold - cmd.demandGold;
      if (target.isAI && netGain < 0) return;
      player.gold -= cmd.offerGold;
      player.gold += cmd.demandGold;
      target.gold += cmd.offerGold;
      target.gold -= cmd.demandGold;
      events.push({ kind: 'TradeCompleted', turn: s.turn, payload: { fromId: player.id, toId: cmd.targetCivId, offerGold: cmd.offerGold, demandGold: cmd.demandGold } });
    }
  },
});
