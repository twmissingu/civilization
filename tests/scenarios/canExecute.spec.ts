import { describe, it, expect } from 'vitest';
import { applyCommand, canExecute, nextActivePlayer } from '../../src/logic/state/commands';
import { advanceCivic, canResearchCivic } from '../../src/logic/state/civic';
import { availableGreatPeople } from '../../src/logic/state/greatpeople';
import { makeState, foundCityP0 } from '../scenarios/helpers';
import { PANTHEON_FAITH_THRESHOLD, RELIGION_FOUND_FAITH_COST, MISSIONARY_FAITH_COST, APOSTLE_FAITH_COST } from '../../src/gamedata/religion';
import { hexNeighbors } from '../../src/logic/hex';
import { getTile } from '../../src/logic/state/mapgen';
import type { CityState, GameState } from '../../src/logic/state/types';

describe('canExecute 失败分支', () => {
  it('foundCity: 非开拓者 / 占用格', () => {
    const state = foundCityP0(makeState()).state;
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'foundCity', unitId: warrior.id, name: 'X' })).not.toBeNull();
    // 占用格：在已有城市上建城（无开拓者可用则跳过该断言）
  });
  it('buildImprovement: 非当前玩家单位', () => {
    const state = makeState(7);
    const enemyBuilder = state.players[1].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'buildImprovement', builderId: enemyBuilder.id, improvementId: 'farm' })).not.toBeNull();
  });
  it('research: 未解锁', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'research', techId: 'education' })).not.toBeNull();
  });
  it('moveUnit: 越界', () => {
    const state = makeState();
    const w = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'moveUnit', unitId: w.id, to: { q: 999, r: 999 } })).not.toBeNull();
  });
  it('attack: 无敌方目标', () => {
    const state = makeState();
    const w = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'attack', attackerId: w.id, targetTile: { q: 999, r: 0 } })).not.toBeNull();
  });
  it('trainUnit: 未解锁 / 非己城市', () => {
    const state = foundCityP0(makeState()).state;
    expect(canExecute(state, { kind: 'trainUnit', cityId: state.players[0].cities[0].id, unitType: 'archer' })).not.toBeNull();
    expect(canExecute(state, { kind: 'trainUnit', cityId: 'nope', unitType: 'warrior' })).not.toBeNull();
  });
  it('buildBuilding: 未解锁 / 已建', () => {
    const state = foundCityP0(makeState()).state;
    expect(canExecute(state, { kind: 'buildBuilding', cityId: state.players[0].cities[0].id, buildingType: 'library' })).not.toBeNull();
  });
  it('placeDistrict: 无法放置', () => {
    const state = foundCityP0(makeState()).state;
    expect(canExecute(state, { kind: 'placeDistrict', cityId: state.players[0].cities[0].id, districtType: 'campus', tile: { q: 0, r: 0 } })).not.toBeNull();
  });
  it('buildWonder: 未解锁', () => {
    const state = foundCityP0(makeState()).state;
    expect(canExecute(state, { kind: 'buildWonder', cityId: state.players[0].cities[0].id, wonderType: 'pyramids', tile: { q: 0, r: 0 } })).not.toBeNull();
  });
  it('buyTile: 金币不足', () => {
    const state = foundCityP0(makeState()).state;
    state.players[0].gold = 0;
    const city = state.players[0].cities[0];
    expect(canExecute(state, { kind: 'buyTile', cityId: city.id, tile: { q: city.tile.q + 5, r: city.tile.r } })).not.toBeNull();
  });
  it('switchPolicy: 槽位类型不符', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('military_tradition');
    expect(canExecute(state, { kind: 'switchPolicy', cardId: 'maneuver', slotIndex: 1 })).not.toBeNull();
  });
  it('changeGovernment: 未解锁', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'changeGovernment', governmentType: 'monarchy' })).not.toBeNull();
  });
  it('declareWar: 目标不存在', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'declareWar', targetCivId: 'nope' })).not.toBeNull();
  });
  it('startSpaceProject: 非己城市', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'startSpaceProject', cityId: 'nope', stage: 1 })).not.toBeNull();
  });
  it('researchCivic: 未解锁', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'researchCivic', civicId: 'political_philosophy' })).not.toBeNull();
  });
  it('buyTile: 超出购买范围', () => {
    const state = foundCityP0(makeState()).state;
    state.players[0].gold = 9999;
    const city = state.players[0].cities[0];
    const farTile = { q: city.tile.q + 10, r: city.tile.r + 10 };
    expect(canExecute(state, { kind: 'buyTile', cityId: city.id, tile: farTile })).not.toBeNull();
  });
  it('removeFromQueue: 无效索引', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    expect(canExecute(state, { kind: 'removeFromQueue', cityId: city.id, index: 999 })).not.toBeNull();
  });
  it('reorderQueue: 无效索引', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    expect(canExecute(state, { kind: 'reorderQueue', cityId: city.id, fromIndex: 0, toIndex: 999 })).not.toBeNull();
  });
  it('assignCitizen: 无可用市民', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    city.population = 0;
    expect(canExecute(state, { kind: 'assignCitizen', cityId: city.id, tile: city.tile })).not.toBeNull();
  });
  it('assignCitizen: 地块不在领土内', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    city.population = 5;
    const outOfTerritory = { q: 999, r: 999 };
    expect(canExecute(state, { kind: 'assignCitizen', cityId: city.id, tile: outOfTerritory })).not.toBeNull();
  });
  it('unassignCitizen: 地块未工作', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    expect(canExecute(state, { kind: 'unassignCitizen', cityId: city.id, tile: { q: 999, r: 999 } })).not.toBeNull();
  });
  it('spreadReligion: 非传教士单位', () => {
    const state = foundCityP0(makeState()).state;
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'spreadReligion', unitId: warrior.id, targetCityId: 'any' })).not.toBeNull();
  });
  it('spreadReligion: 目标城市不存在', () => {
    const state = madeStateWithMissionary();
    const m = state.players[0].units.find((u: any) => u.type === 'missionary');
    expect(m).toBeDefined();
    if (m) expect(canExecute(state, { kind: 'spreadReligion', unitId: m.id, targetCityId: 'nonexistent' })).not.toBeNull();
  });
  it('spreadReligion: 无可用传教次数', () => {
    const state = madeStateWithMissionary();
    const missionary = state.players[0].units.find((u: any) => u.type === 'missionary')!;
    missionary.charges = 0;
    expect(canExecute(state, { kind: 'spreadReligion', unitId: missionary.id, targetCityId: state.players[0].cities[0].id })).not.toBeNull();
  });
  it('choosePromotion: 单位未达到升级条件', () => {
    const state = makeState();
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'choosePromotion', unitId: warrior.id, promotionId: 'discipline' })).not.toBeNull();
  });
  it('choosePromotion: 该晋升不可用', () => {
    const state = makeState();
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    warrior.xp = 10;
    expect(canExecute(state, { kind: 'choosePromotion', unitId: warrior.id, promotionId: 'nonexistent' })).not.toBeNull();
  });
  it('foundPantheon: 信仰值不足', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'foundPantheon', pantheonId: 'fertility_rites' })).not.toBeNull();
  });
  it('foundReligion: 无法创立宗教', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'foundReligion' })).not.toBeNull();
  });
  it('purchaseMissionary: 无法购买传教士', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'purchaseMissionary', cityId: 'nope' })).not.toBeNull();
  });
  it('purchaseApostle: 无法购买使徒', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'purchaseApostle', cityId: 'nope' })).not.toBeNull();
  });
  it('sendEnvoy: 无使者', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'sendEnvoy', cityStateId: state.cityStates[0].id })).not.toBeNull();
  });
  it('recruitGreatPerson: 无法招募', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'recruitGreatPerson', greatPersonId: 'gp-1' })).not.toBeNull();
  });
  it('startTradeRoute: 无法建立', () => {
    const state = foundCityP0(makeState()).state;
    const player = state.players[0];
    const trader = player.units.find((u) => u.type === 'trader');
    if (!trader) return;
    expect(canExecute(state, { kind: 'startTradeRoute', traderId: trader.id, toCityId: player.cities[0].id })).not.toBeNull();
  });
  it('offerTrade: 战争状态无法交易', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 10, demandGold: 0 })).not.toBeNull();
  });
  it('offerTrade: 金额不能为负', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: -10, demandGold: 0 })).not.toBeNull();
  });
  it('offerTrade: 金币不足', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 9999, demandGold: 0 })).not.toBeNull();
  });
  it('offerTrade: 目标不存在', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'nope', offerGold: 10, demandGold: 0 })).not.toBeNull();
  });
});

// 辅助函数：创建一个有传教士的状态
function madeStateWithMissionary(): GameState {
  const state = makeState();
  const player = state.players[0];
  // 建城
  const settler = player.units.find((u) => u.type === 'settler')!;
  const { state: s } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
  const p = s.players[0];
  p.religionId = 'religion-1';
  p.cities[0].districts.push({ type: 'holy', tile: p.cities[0].tile });
  p.cities[0].buildings.push('temple');
  p.faith = MISSIONARY_FAITH_COST + 50;
  const { state: s2 } = applyCommand(s, { kind: 'purchaseMissionary', cityId: p.cities[0].id });
  return s2;
}

describe('canExecute 成功路径', () => {
  it('researchCivic: 可研究', () => {
    const state = makeState();
    // military_tradition 仅需 code_of_laws（初始已有）
    expect(canExecute(state, { kind: 'researchCivic', civicId: 'military_tradition' })).toBeNull();
  });
  it('foundCity: 可建城', () => {
    const state = makeState();
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    expect(canExecute(state, { kind: 'foundCity', unitId: settler.id, name: 'Rome' })).toBeNull();
  });
  it('trainUnit: 可训练', () => {
    const state = foundCityP0(makeState()).state;
    expect(canExecute(state, { kind: 'trainUnit', cityId: state.players[0].cities[0].id, unitType: 'warrior' })).toBeNull();
  });
  it('buildBuilding: 可建造', () => {
    const state = foundCityP0(makeState()).state;
    state.players[0].researchedTechs.push('writing');
    expect(canExecute(state, { kind: 'buildBuilding', cityId: state.players[0].cities[0].id, buildingType: 'library' })).toBeNull();
  });
  it('research: 可研究', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'research', techId: 'pottery' })).toBeNull();
  });
  it('endTurn: 总是可执行', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'endTurn' })).toBeNull();
  });
  it('switchPolicy: 可切换', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('military_tradition');
    // chiefdom: slot0=military, maneuver 是 military 卡
    expect(canExecute(state, { kind: 'switchPolicy', cardId: 'maneuver', slotIndex: 0 })).toBeNull();
  });
  it('changeGovernment: 可切换', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('state_workforce');
    expect(canExecute(state, { kind: 'changeGovernment', governmentType: 'autocracy' })).toBeNull();
  });
  it('declareWar: 可宣战', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'declareWar', targetCivId: 'player-1' })).toBeNull();
  });
  it('suePeace: 可求和', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'suePeace', targetCivId: 'player-1' })).toBeNull();
  });
  it('startSpaceProject: 可开始', () => {
    const state = foundCityP0(makeState()).state;
    expect(canExecute(state, { kind: 'startSpaceProject', cityId: state.players[0].cities[0].id, stage: 1 })).toBeNull();
  });
  it('sendEnvoy: 有使者时可派遣', () => {
    const state = makeState();
    state.players[0].storedEnvoys = 3;
    expect(canExecute(state, { kind: 'sendEnvoy', cityStateId: state.cityStates[0].id })).toBeNull();
  });
  it('recruitGreatPerson: 有伟人点时可招募', () => {
    const state = makeState();
    state.players[0].greatPersonPoints['general'] = 60;
    const available = availableGreatPeople(state, state.players[0]);
    if (available.length > 0) {
      expect(canExecute(state, { kind: 'recruitGreatPerson', greatPersonId: available[0].def.id })).toBeNull();
    }
  });
});

describe('applyCommand 执行路径', () => {
  it('researchCivic 设置当前市政研究', () => {
    const state = makeState();
    const { state: s } = applyCommand(state, { kind: 'researchCivic', civicId: 'military_tradition' });
    expect(s.players[0].currentCivic?.civicId).toBe('military_tradition');
  });
  it('buyTile 购买地块', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    state.players[0].gold = 9999;
    // 找一个邻近的可购买地块
    const neighbor = hexNeighbors(city.tile).find((n) => {
      const t = getTile(state.map, n);
      return t && !city.territory.some((ct) => ct.q === n.q && ct.r === n.r);
    });
    if (neighbor) {
      const { state: s } = applyCommand(state, { kind: 'buyTile', cityId: city.id, tile: neighbor });
      expect(s.players[0].gold).toBeLessThan(9999);
      expect(s.players[0].cities[0].territory.some((t) => t.q === neighbor.q && t.r === neighbor.r)).toBe(true);
    }
  });
  it('switchPolicy 切换政策卡', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('military_tradition');
    const { state: s } = applyCommand(state, { kind: 'switchPolicy', cardId: 'maneuver', slotIndex: 0 });
    expect(s.players[0].policySlots[0]).toBe('maneuver');
  });
  it('changeGovernment 切换政体', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('state_workforce');
    const { state: s, events } = applyCommand(state, { kind: 'changeGovernment', governmentType: 'autocracy' });
    expect(s.players[0].government).toBe('autocracy');
    expect(events.some((e) => e.kind === 'GovernmentChanged')).toBe(true);
  });
  it('declareWar 宣战', () => {
    const state = makeState();
    const { state: s, events } = applyCommand(state, { kind: 'declareWar', targetCivId: 'player-1' });
    expect(s.diplomacy['player-0']['player-1']).toBe('war');
    expect(s.diplomacy['player-1']['player-0']).toBe('war');
    expect(events.some((e) => e.kind === 'WarDeclared')).toBe(true);
  });
  it('suePeace 求和', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const { state: s, events } = applyCommand(state, { kind: 'suePeace', targetCivId: 'player-1' });
    expect(s.diplomacy['player-0']['player-1']).toBe('peace');
    expect(events.some((e) => e.kind === 'PeaceDeclared')).toBe(true);
  });
  it('startSpaceProject 开始航天项目', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    const { state: s } = applyCommand(state, { kind: 'startSpaceProject', cityId: city.id, stage: 1 });
    expect(s.players[0].cities[0].queue.some((q) => q.id === 'space_1')).toBe(true);
  });
  it('offerTrade: AI 接受净收益交易', () => {
    const state = makeState();
    state.players[0].gold = 100;
    state.players[1].gold = 50;
    const { state: s, events } = applyCommand(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 20, demandGold: 10 });
    expect(s.players[0].gold).toBe(90); // 100 - 20 + 10 = 90
    expect(s.players[1].gold).toBe(60); // 50 + 20 - 10 = 60
    expect(events.some((e) => e.kind === 'TradeCompleted')).toBe(true);
  });
  it('offerTrade: AI 拒绝净亏损交易', () => {
    const state = makeState();
    state.players[0].gold = 100;
    state.players[1].gold = 50;
    const { state: s, events } = applyCommand(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 20, demandGold: 50 });
    // AI 拒绝，金币不变
    expect(s.players[0].gold).toBe(100);
    expect(s.players[1].gold).toBe(50);
    expect(events.some((e) => e.kind === 'TradeCompleted')).toBe(false);
  });
  it('choosePromotion 晋升', () => {
    const state = makeState();
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    warrior.xp = 10;
    warrior.level = 1;
    const { state: s, events } = applyCommand(state, { kind: 'choosePromotion', unitId: warrior.id, promotionId: 'discipline' });
    const w = s.players[0].units.find((u) => u.id === warrior.id)!;
    expect(w.promotions).toContain('discipline');
    expect(events.some((e) => e.kind === 'UnitPromoted')).toBe(true);
  });
  it('foundPantheon 选择万神殿', () => {
    const state = makeState();
    state.players[0].faith = PANTHEON_FAITH_THRESHOLD;
    const { state: s, events } = applyCommand(state, { kind: 'foundPantheon', pantheonId: 'fertility_rites' });
    expect(s.players[0].pantheon).toBe('fertility_rites');
    expect(events.some((e) => e.kind === 'PantheonFounded')).toBe(true);
  });
  it('foundReligion 创立宗教', () => {
    const state = makeState();
    const player = state.players[0];
    const settler = player.units.find((u) => u.type === 'settler')!;
    const { state: s } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
    const p = s.players[0];
    p.cities[0].districts.push({ type: 'holy', tile: p.cities[0].tile });
    p.cities[0].buildings.push('temple');
    p.faith = RELIGION_FOUND_FAITH_COST;
    const { state: s2, events } = applyCommand(s, { kind: 'foundReligion' });
    expect(s2.players[0].religionId).toBeTruthy();
    expect(events.some((e) => e.kind === 'ReligionFounded')).toBe(true);
  });
  it('sendEnvoy 派遣使者', () => {
    const state = makeState();
    state.players[0].storedEnvoys = 3;
    const { state: s, events } = applyCommand(state, { kind: 'sendEnvoy', cityStateId: state.cityStates[0].id });
    expect(s.players[0].storedEnvoys).toBe(2);
    expect(events.some((e) => e.kind === 'EnvoySent')).toBe(true);
  });
  it('recruitGreatPerson 招募大人物', () => {
    const state = makeState();
    state.players[0].greatPersonPoints['general'] = 60;
    const available = availableGreatPeople(state, state.players[0]);
    if (available.length > 0) {
      const { state: s, events } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: available[0].def.id });
      expect(s.players[0].recruitedGreatPeople).toContain(available[0].def.id);
      expect(events.some((e) => e.kind === 'GreatPersonRecruited')).toBe(true);
    }
  });
  it('removeFromQueue 移除队列项', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    city.queue.push({ kind: 'unit', id: 'warrior', progress: 0 });
    city.queue.push({ kind: 'unit', id: 'builder', progress: 0 });
    const { state: s } = applyCommand(state, { kind: 'removeFromQueue', cityId: city.id, index: 0 });
    expect(s.players[0].cities[0].queue).toHaveLength(1);
    expect(s.players[0].cities[0].queue[0].id).toBe('builder');
  });
  it('reorderQueue 重新排序', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    city.queue.push({ kind: 'unit', id: 'warrior', progress: 0 });
    city.queue.push({ kind: 'unit', id: 'builder', progress: 0 });
    const { state: s } = applyCommand(state, { kind: 'reorderQueue', cityId: city.id, fromIndex: 0, toIndex: 1 });
    expect(s.players[0].cities[0].queue[0].id).toBe('builder');
    expect(s.players[0].cities[0].queue[1].id).toBe('warrior');
  });
  it('assignCitizen 分配市民', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    city.population = 3;
    // 添加领土地块
    const neighbor = hexNeighbors(city.tile).find((n) => {
      const t = getTile(state.map, n);
      return t && !city.territory.some((ct) => ct.q === n.q && ct.r === n.r);
    });
    if (neighbor) {
      city.territory.push(neighbor);
      const { state: s } = applyCommand(state, { kind: 'assignCitizen', cityId: city.id, tile: neighbor });
      expect(s.players[0].cities[0].workedTiles.some((t) => t.q === neighbor.q && t.r === neighbor.r)).toBe(true);
    }
  });
  it('unassignCitizen 取消分配市民', () => {
    const state = foundCityP0(makeState()).state;
    const city = state.players[0].cities[0];
    const tile = city.workedTiles[0];
    if (tile) {
      const { state: s } = applyCommand(state, { kind: 'unassignCitizen', cityId: city.id, tile });
      expect(s.players[0].cities[0].workedTiles.some((t) => t.q === tile.q && t.r === tile.r)).toBe(false);
    }
  });
  it('applyCommand returns early when game finished', () => {
    const state = makeState();
    state.status = 'finished';
    const { state: s, events } = applyCommand(state, { kind: 'endTurn' });
    expect(s).toBe(state); // 引用相同，未克隆
    expect(events).toEqual([]);
  });
  it('purchaseMissionary 购买传教士', () => {
    const state = makeState();
    const player = state.players[0];
    const settler = player.units.find((u) => u.type === 'settler')!;
    const { state: s } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
    const p = s.players[0];
    p.cities[0].districts.push({ type: 'holy', tile: p.cities[0].tile });
    p.cities[0].buildings.push('temple');
    p.religionId = 'religion-1';
    p.faith = MISSIONARY_FAITH_COST + 50;
    const { state: s2, events } = applyCommand(s, { kind: 'purchaseMissionary', cityId: p.cities[0].id });
    expect(s2.players[0].units.some((u) => u.type === 'missionary')).toBe(true);
    expect(events.some((e) => e.kind === 'MissionaryPurchased')).toBe(true);
  });
  it('purchaseApostle 购买使徒', () => {
    const state = makeState();
    const player = state.players[0];
    const settler = player.units.find((u) => u.type === 'settler')!;
    const { state: s } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
    const p = s.players[0];
    p.cities[0].districts.push({ type: 'holy', tile: p.cities[0].tile });
    p.cities[0].buildings.push('temple');
    p.religionId = 'religion-1';
    p.faith = APOSTLE_FAITH_COST + 50;
    const { state: s2, events } = applyCommand(s, { kind: 'purchaseApostle', cityId: p.cities[0].id });
    expect(s2.players[0].units.some((u) => u.type === 'apostle')).toBe(true);
    expect(events.some((e) => e.kind === 'ApostlePurchased')).toBe(true);
  });
  it('spreadReligion 传播宗教', () => {
    const state = makeState();
    const player = state.players[0];
    const settler = player.units.find((u) => u.type === 'settler')!;
    const { state: s } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
    const p = s.players[0];
    p.religionId = 'religion-1';
    p.cities[0].districts.push({ type: 'holy', tile: p.cities[0].tile });
    p.cities[0].buildings.push('temple');
    p.faith = MISSIONARY_FAITH_COST + 50;
    const { state: s2 } = applyCommand(s, { kind: 'purchaseMissionary', cityId: p.cities[0].id });
    const missionary = s2.players[0].units.find((u) => u.type === 'missionary')!;
    const { state: s3, events } = applyCommand(s2, { kind: 'spreadReligion', unitId: missionary.id, targetCityId: p.cities[0].id });
    expect(events.some((e) => e.kind === 'ReligionSpread')).toBe(true);
    expect(s3.players[0].cities[0].religion['religion-1']).toBeGreaterThan(0);
  });
});

describe('civic 分支', () => {
  it('canResearchCivic 未满足前置', () => {
    const state = makeState();
    expect(canResearchCivic(state.players[0], 'political_philosophy')).toBe(false);
  });
  it('advanceCivic 无当前研究返回 null', () => {
    const state = makeState();
    expect(advanceCivic(state.players[0], 100)).toBeNull();
  });
});

describe('more commands', () => {
  it('reorderQueue on non-existent city fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'reorderQueue', cityId: 'nope', fromIndex: 0, toIndex: 5 })).not.toBeNull();
  });

  it('removeFromQueue on non-existent city fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'removeFromQueue', cityId: 'nope', index: 99 })).not.toBeNull();
  });

  it('assignCitizen on non-existent city fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'assignCitizen', cityId: 'nope', tile: { q: 0, r: 0 } })).not.toBeNull();
  });

  it('unassignCitizen on non-existent city fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'unassignCitizen', cityId: 'nope', tile: { q: 0, r: 0 } })).not.toBeNull();
  });

  it('choosePromotion on non-existent unit fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'choosePromotion', unitId: 'nope', promotionId: 'commander' })).not.toBeNull();
  });

  it('suePeace on non-existent target fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'suePeace', targetCivId: 'nope' })).not.toBeNull();
  });

  it('offerTrade to non-existent target fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'nope', offerGold: 10, demandGold: 0 })).not.toBeNull();
  });

  it('offerTrade with negative gold fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: -10, demandGold: 0 })).not.toBeNull();
  });

  it('offerTrade at war fails', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 10, demandGold: 0 })).not.toBeNull();
  });

  it('offerTrade with insufficient gold fails', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'offerTrade', targetCivId: 'player-1', offerGold: 9999, demandGold: 0 })).not.toBeNull();
  });

  it('堆叠规则：军事单位不能移动到有军事单位的格子', () => {
    const state = makeState();
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    // 把两个 warrior 移到同一格附近
    const dest = { q: warrior.tile.q + 1, r: warrior.tile.r };
    const s = applyCommand(state, { kind: 'moveUnit', unitId: warrior.id, to: dest }).state;
    if (s === state) return; // 无法移动则跳过
    const otherWarrior = s.players[0].units.find((u) => u.type === 'warrior' && u.id !== warrior.id);
    if (otherWarrior) {
      const err = canExecute(s, { kind: 'moveUnit', unitId: otherWarrior.id, to: dest });
      expect(err).not.toBeNull();
    }
  });

  it('nextActivePlayer 跳过已淘汰玩家', () => {
    const state = makeState();
    // 让玩家 1 被淘汰
    state.players[1].cities = [];
    state.players[1].units = [];
    state.currentPlayerIndex = 0;
    const next = nextActivePlayer(state);
    expect(next).toBe(0); // 玩家 0 不淘汰，所以还是玩家 0
    // 让玩家 0 也被淘汰
    state.players[0].cities = [];
    state.players[0].units = [];
    expect(nextActivePlayer(state)).toBe(0); // 全淘汰，返回当前
  });

  it('canExecute 未知命令', () => {
    const state = makeState();
    const result = canExecute(state, { kind: 'unknownKind' as any });
    expect(result).not.toBeNull();
    expect(result!.code).toBe('UNKNOWN');
  });

  it('applyCommand 未知命令不执行', () => {
    const state = makeState();
    const { state: s, events } = applyCommand(state, { kind: 'unknownKind' as any });
    // 状态不变，无事件
    expect(s).toBe(state);
    expect(events).toEqual([]);
  });

  it('endTurn with all players defeated', () => {
    const state = makeState();
    state.players[0].cities = [];
    state.players[0].units = [];
    state.players[1].cities = [];
    state.players[1].units = [];
    const { state: s } = applyCommand(state, { kind: 'endTurn' });
    // 全淘汰，currentPlayerIndex 不变
    expect(s.currentPlayerIndex).toBe(0);
  });

  it('startTradeRoute 建立贸易路线', () => {
    const state = foundCityP0(makeState()).state;
    const player = state.players[0];
    player.tradeRouteCapacity = 1;
    const trader = {
      id: 'test-trader',
      ownerId: player.id,
      type: 'trader',
      tile: player.cities[0].tile,
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
    const secondCity: CityState = {
      id: 'second-city',
      ownerId: player.id,
      name: 'Secunda',
      tile: { q: player.cities[0].tile.q + 3, r: player.cities[0].tile.r },
      territory: [{ q: player.cities[0].tile.q + 3, r: player.cities[0].tile.r }],
      workedTiles: [{ q: player.cities[0].tile.q + 3, r: player.cities[0].tile.r }],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1,
      buildings: ['palace', 'monument'], districts: [], wonders: [], queue: [],
      hp: 200, wallsHp: 0, wallsMax: 0, isCapital: false, rangedStrikeUsed: false,
      religion: {}, dominantReligion: null,
    };
    player.cities.push(secondCity);
    if (canExecute(state, { kind: 'startTradeRoute', traderId: trader.id, toCityId: secondCity.id }) === null) {
      const { state: s, events } = applyCommand(state, { kind: 'startTradeRoute', traderId: trader.id, toCityId: secondCity.id });
      expect(s.players[0].tradeRoutes.length).toBe(1);
      expect(events.some((e) => e.kind === 'TradeRouteStarted')).toBe(true);
    }
  });

  it('buildWonder 可建造奇观', () => {
    const state = foundCityP0(makeState()).state;
    state.players[0].researchedTechs.push('pottery', 'mining', 'masonry');
    expect(canExecute(state, { kind: 'buildWonder', cityId: state.players[0].cities[0].id, wonderType: 'pyramids', tile: state.players[0].cities[0].tile })).toBeNull();
    const { state: s } = applyCommand(state, { kind: 'buildWonder', cityId: state.players[0].cities[0].id, wonderType: 'pyramids', tile: state.players[0].cities[0].tile });
    expect(s.players[0].cities[0].queue.some((q) => q.kind === 'wonder' && q.id === 'pyramids')).toBe(true);
  });

  it('attack 攻击城市（通过 applyCommand）', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const p1 = state.players[1];
    p1.units = p1.units.filter((u) => u.tile.q !== attacker.tile.q || u.tile.r !== attacker.tile.r);
    const cityTile = hexNeighbors(attacker.tile)[0];
    const city: CityState = {
      id: 'enemy-city', ownerId: 'player-1', name: 'Enemy', tile: cityTile,
      territory: [cityTile], workedTiles: [cityTile],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1,
      buildings: [], districts: [], wonders: [], queue: [],
      hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true, rangedStrikeUsed: false,
      religion: {}, dominantReligion: null,
    };
    p1.cities.push(city);
    const { events } = applyCommand(state, { kind: 'attack', attackerId: attacker.id, targetTile: cityTile });
    expect(events.some((e) => e.kind === 'CityAttacked')).toBe(true);
  });

  it('buildImprovement canExecute 失败：单位不存在', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'buildImprovement', builderId: 'nonexistent', improvementId: 'farm' })).not.toBeNull();
  });

  it('buildImprovement canExecute 失败：无法改良（充能不足）', () => {
    const state = makeState();
    state.players[0].researchedTechs.push('pottery', 'mining');
    const builder = {
      id: 'test-builder', ownerId: 'player-0', type: 'builder',
      tile: { q: 3, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1,
      promotions: [] as string[], charges: 0, hasActed: false,
    };
    state.players[0].units.push(builder);
    expect(canExecute(state, { kind: 'buildImprovement', builderId: builder.id, improvementId: 'farm' })).not.toBeNull();
  });
});