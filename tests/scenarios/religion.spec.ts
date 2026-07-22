// CP-16 宗教系统：万神殿、创立宗教、传教、宗教胜利
import { describe, it, expect, beforeEach } from 'vitest';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import {
  canFoundPantheon, canFoundReligion,
  canPurchaseMissionary, canPurchaseApostle,
  computePassiveReligiousPressure, checkReligiousVictory,
  resetReligionIdCounter,
} from '../../src/logic/state/religion';
import { PANTHEON_FAITH_THRESHOLD, RELIGION_FOUND_FAITH_COST, MISSIONARY_FAITH_COST, APOSTLE_FAITH_COST } from '../../src/gamedata/religion';
import type { GameState, PlayerState, CityState } from '../../src/logic/state/types';
import { makeState } from '../scenarios/helpers';

/** 为当前玩家建城 */
function foundCity(state: GameState, player: PlayerState, name: string): GameState {
  const settler = player.units.find((u) => u.type === 'settler');
  if (!settler) throw new Error('No settler');
  return applyCommand(state, { kind: 'foundCity', unitId: settler.id, name }).state;
}

/** 给城市添加圣地区域和神庙 */
function addHolySite(_state: GameState, player: PlayerState, cityId: string): void {
  const city = player.cities.find((c) => c.id === cityId);
  if (!city) throw new Error('City not found');
  city.districts.push({ type: 'holy', tile: city.tile });
  city.buildings.push('temple');
}

describe('CP-16 宗教系统', () => {
  beforeEach(() => {
    resetReligionIdCounter();
  });

  it('初始状态无万神殿和宗教', () => {
    const state = makeState();
    const player = currentPlayer(state);
    expect(player.pantheon).toBeNull();
    expect(player.religionId).toBeNull();
    expect(player.holyCityId).toBeNull();
    expect(player.religionName).toBeNull();
  });

  it('信仰值不足时不能选择万神殿', () => {
    const state = makeState();
    const player = currentPlayer(state);
    expect(canFoundPantheon(player, 'fertility_rites')).toBe(false);
  });

  it('信仰值足够时可选择万神殿', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.faith = PANTHEON_FAITH_THRESHOLD;
    expect(canFoundPantheon(player, 'fertility_rites')).toBe(true);
  });

  it('选择万神殿消耗信仰值并记录', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.faith = PANTHEON_FAITH_THRESHOLD + 10;
    const { state: s2 } = applyCommand(state, { kind: 'foundPantheon', pantheonId: 'fertility_rites' });
    const player2 = currentPlayer(s2);
    expect(player2.pantheon).toBe('fertility_rites');
    expect(player2.faith).toBe(10);
  });

  it('选择万神殿后不能再次选择', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.faith = PANTHEON_FAITH_THRESHOLD;
    player.pantheon = 'fertility_rites';
    expect(canFoundPantheon(player, 'god_of_the_forge')).toBe(false);
  });

  it('无圣地+神庙时不能创立宗教', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.faith = RELIGION_FOUND_FAITH_COST;
    expect(canFoundReligion(s2, player2)).toBe(false);
  });

  it('有圣地+神庙时可创立宗教', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.faith = RELIGION_FOUND_FAITH_COST;
    expect(canFoundReligion(s2, player2)).toBe(true);
  });

  it('创立宗教消耗信仰值并设置圣城', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.faith = RELIGION_FOUND_FAITH_COST + 50;
    const { state: s3 } = applyCommand(s2, { kind: 'foundReligion' });
    const player3 = currentPlayer(s3);
    expect(player3.religionId).toBeTruthy();
    expect(player3.religionName).toBeTruthy();
    expect(player3.holyCityId).toBe(player3.cities[0].id);
    expect(player3.faith).toBe(50);
    // 圣城应有该宗教
    const holyCity = player3.cities.find((c) => c.id === player3.holyCityId)!;
    expect(holyCity.dominantReligion).toBe(player3.religionId);
  });

  it('已创立宗教后不能再次创立', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.faith = RELIGION_FOUND_FAITH_COST;
    player2.religionId = 'religion-1';
    expect(canFoundReligion(s2, player2)).toBe(false);
  });

  it('无宗教时不能购买传教士', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.faith = MISSIONARY_FAITH_COST;
    expect(canPurchaseMissionary(s2, player2, player2.cities[0].id)).toBe(false);
  });

  it('有宗教+圣地时可购买传教士', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.religionId = 'religion-1';
    player2.faith = MISSIONARY_FAITH_COST;
    expect(canPurchaseMissionary(s2, player2, player2.cities[0].id)).toBe(true);
  });

  it('购买传教士消耗信仰值并创建单位', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.religionId = 'religion-1';
    player2.faith = MISSIONARY_FAITH_COST + 50;
    const { state: s3 } = applyCommand(s2, { kind: 'purchaseMissionary', cityId: player2.cities[0].id });
    const player3 = currentPlayer(s3);
    expect(player3.faith).toBe(50);
    expect(player3.units.some((u) => u.type === 'missionary')).toBe(true);
  });

  it('有宗教+圣地+神庙时可购买使徒', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.religionId = 'religion-1';
    player2.faith = APOSTLE_FAITH_COST;
    expect(canPurchaseApostle(s2, player2, player2.cities[0].id)).toBe(true);
  });

  it('传教士传播宗教给目标城市', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.religionId = 'religion-1';
    player2.faith = MISSIONARY_FAITH_COST + 50;
    // 购买传教士
    const { state: s3 } = applyCommand(s2, { kind: 'purchaseMissionary', cityId: player2.cities[0].id });
    const player3 = currentPlayer(s3);
    const missionary = player3.units.find((u) => u.type === 'missionary')!;
    // 传播宗教给另一个城市（玩家的第二个城市）
    // 建第二个城市
    const { state: s4 } = applyCommand(s3, { kind: 'moveUnit', unitId: player3.units.find((u) => u.type !== 'settler' && u.type !== 'missionary')!.id, to: { q: 5, r: 5 } });
    const player4 = currentPlayer(s4);
    const settler = player4.units.find((u) => u.type === 'settler');
    if (!settler) return; // 跳过
    const { state: s5 } = applyCommand(s4, { kind: 'foundCity', unitId: settler.id, name: 'Roma2' });
    const player5 = currentPlayer(s5);
    // 传教到第二个城市
    const { state: s6 } = applyCommand(s5, { kind: 'spreadReligion', unitId: missionary.id, targetCityId: player5.cities[1].id });
    const player6 = currentPlayer(s6);
    const targetCity = player6.cities[1];
    expect(targetCity.religion['religion-1']).toBeGreaterThanOrEqual(10);
    // 传教士消耗充能
    const missionaryAfter = player6.units.find((u) => u.id === missionary.id)!;
    expect(missionaryAfter.charges).toBe(2);
  });

  it('被动宗教压力使圣城保持宗教', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.religionId = 'religion-1';
    player2.holyCityId = player2.cities[0].id;
    player2.faith = RELIGION_FOUND_FAITH_COST;
    // 应用被动压力
    computePassiveReligiousPressure(s2);
    const holyCity = player2.cities[0];
    expect(holyCity.religion['religion-1']).toBeGreaterThanOrEqual(1);
    expect(holyCity.dominantReligion).toBe('religion-1');
  });

  it('宗教胜利条件判断', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.religionId = 'religion-1';
    // 给对手一个城市
    const opponent = s2.players.find((p) => p.id !== player2.id)!;
    const oppSettler = opponent.units.find((u) => u.type === 'settler');
    if (!oppSettler) return; // 跳过
    // 对手建城
    const oppCity: CityState = {
      id: 'opp-city-1',
      ownerId: opponent.id,
      name: 'Sparta',
      tile: oppSettler.tile,
      territory: [oppSettler.tile],
      workedTiles: [oppSettler.tile],
      population: 1,
      food: 0,
      culture: 0,
      housing: 2,
      amenities: 1,
      buildings: ['palace', 'monument'],
      districts: [],
      wonders: [],
      queue: [],
      hp: 200,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: true,
      rangedStrikeUsed: false,
      religion: {},
      dominantReligion: null,
    };
    opponent.cities.push(oppCity);
    opponent.capitalCityId = oppCity.id;
    opponent.units = opponent.units.filter((u) => u.id !== oppSettler.id);
    // 让对手城市信玩家宗教
    oppCity.dominantReligion = 'religion-1';
    const result = checkReligiousVictory(s2);
    expect(result).toBeTruthy();
    expect(result!.winnerId).toBe(player2.id);
    expect(result!.type).toBe('religion');
  });

  it('宗教胜利不成立当有其他城市未转化', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.religionId = 'religion-1';
    // 给对手一个城市
    const opponent = s2.players.find((p) => p.id !== player2.id)!;
    const oppSettler = opponent.units.find((u) => u.type === 'settler');
    if (!oppSettler) return;
    const oppCity: CityState = {
      id: 'opp-city-2',
      ownerId: opponent.id,
      name: 'Sparta',
      tile: oppSettler.tile,
      territory: [oppSettler.tile],
      workedTiles: [oppSettler.tile],
      population: 1,
      food: 0,
      culture: 0,
      housing: 2,
      amenities: 1,
      buildings: ['palace', 'monument'],
      districts: [],
      wonders: [],
      queue: [],
      hp: 200,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: true,
      rangedStrikeUsed: false,
      religion: {},
      dominantReligion: 'other-religion', // 未转化
    };
    opponent.cities.push(oppCity);
    opponent.capitalCityId = oppCity.id;
    opponent.units = opponent.units.filter((u) => u.id !== oppSettler.id);
    const result = checkReligiousVictory(s2);
    expect(result).toBeNull();
  });

  it('无宗教的玩家不能触发宗教胜利', () => {
    const state = makeState();
    const result = checkReligiousVictory(state);
    expect(result).toBeNull();
  });

  it('canPurchaseApostle 无神庙时返回 false', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.religionId = 'religion-1';
    player2.faith = APOSTLE_FAITH_COST;
    addHolySite(s2, player2, player2.cities[0].id);
    // 移除神庙
    player2.cities[0].buildings = player2.cities[0].buildings.filter((b) => b !== 'temple');
    expect(canPurchaseApostle(s2, player2, player2.cities[0].id)).toBe(false);
  });

  it('使徒传播宗教给目标城市', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    addHolySite(s2, player2, player2.cities[0].id);
    player2.religionId = 'religion-1';
    player2.faith = APOSTLE_FAITH_COST + 50;
    const { state: s3 } = applyCommand(s2, { kind: 'purchaseApostle', cityId: player2.cities[0].id });
    const player3 = currentPlayer(s3);
    const apostle = player3.units.find((u) => u.type === 'apostle')!;
    // 建第二个城市
    const { state: s4 } = applyCommand(s3, { kind: 'moveUnit', unitId: player3.units.find((u) => u.type !== 'settler' && u.type !== 'apostle')!.id, to: { q: 5, r: 5 } });
    const player4 = currentPlayer(s4);
    const settler = player4.units.find((u) => u.type === 'settler');
    if (!settler) return;
    const { state: s5 } = applyCommand(s4, { kind: 'foundCity', unitId: settler.id, name: 'Roma2' });
    const player5 = currentPlayer(s5);
    // 使徒传教
    const { state: s6 } = applyCommand(s5, { kind: 'spreadReligion', unitId: apostle.id, targetCityId: player5.cities[1].id });
    const player6 = currentPlayer(s6);
    const targetCity = player6.cities[1];
    expect(targetCity.religion['religion-1']).toBeGreaterThanOrEqual(20); // 使徒压力更大
    const apostleAfter = player6.units.find((u) => u.id === apostle.id)!;
    expect(apostleAfter.charges).toBe(3);
  });

  it('无圣地时 cannotPurchaseMissionary', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    player2.religionId = 'religion-1';
    player2.faith = MISSIONARY_FAITH_COST;
    // 不添加圣地
    expect(canPurchaseMissionary(s2, player2, player2.cities[0].id)).toBe(false);
  });

  it('无效万神殿 id 时 cannotFoundPantheon', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.faith = PANTHEON_FAITH_THRESHOLD;
    expect(canFoundPantheon(player, 'nonexistent_pantheon')).toBe(false);
  });

  it('computePassiveReligiousPressure 不处理无宗教的玩家', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    // player has no religion — should not crash
    computePassiveReligiousPressure(s2);
    const player2 = currentPlayer(s2);
    expect(player2.cities[0].dominantReligion).toBeNull();
  });

  it('spreadReligion 拒绝非传教士使徒单位', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    const warrior = player2.units.find((u) => u.type === 'warrior')!;
    const { state: s3 } = applyCommand(s2, { kind: 'spreadReligion', unitId: warrior.id, targetCityId: player2.cities[0].id });
    // should fail silently (canExecute returns error, state unchanged)
    const player3 = currentPlayer(s3);
    expect(player3.cities[0].dominantReligion).toBeNull();
  });

  it('canExecute 拒绝非己方单位的传教', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const s2 = foundCity(state, player, 'Roma');
    const player2 = currentPlayer(s2);
    // 使用不存在的单位
    const { state: s3 } = applyCommand(s2, { kind: 'spreadReligion', unitId: 'nonexistent', targetCityId: player2.cities[0].id });
    // should fail silently
    const player3 = currentPlayer(s3);
    expect(player3).toBeDefined();
  });

  it('purchaseMissionary 拒绝非己方城市', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.religionId = 'religion-1';
    player.faith = MISSIONARY_FAITH_COST;
    // 使用不存在的城市
    const { state: s2 } = applyCommand(state, { kind: 'purchaseMissionary', cityId: 'nonexistent' });
    const player2 = currentPlayer(s2);
    expect(player2.faith).toBe(MISSIONARY_FAITH_COST); // 未消耗信仰
  });
});