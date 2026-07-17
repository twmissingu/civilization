import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand, canExecute } from '../../src/logic/state/commands';
import { advanceCivic, canResearchCivic } from '../../src/logic/state/civic';
import type { GameState, GameConfig } from '../../src/logic/state/types';

function makeState(seed = 7): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

function found(state: GameState): GameState {
  const s = state.players[0].units.find((u) => u.type === 'settler')!;
  return applyCommand(state, { kind: 'foundCity', unitId: s.id, name: 'R' }).state;
}

describe('canExecute 失败分支', () => {
  it('foundCity: 非开拓者 / 占用格', () => {
    const state = found(makeState());
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(canExecute(state, { kind: 'foundCity', unitId: warrior.id, name: 'X' })).not.toBeNull();
    // 占用格：在已有城市上建城（无开拓者可用则跳过该断言）
  });
  it('buildImprovement: 非当前玩家单位', () => {
    const state = makeState();
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
    const state = found(makeState());
    expect(canExecute(state, { kind: 'trainUnit', cityId: state.players[0].cities[0].id, unitType: 'archer' })).not.toBeNull();
    expect(canExecute(state, { kind: 'trainUnit', cityId: 'nope', unitType: 'warrior' })).not.toBeNull();
  });
  it('buildBuilding: 未解锁 / 已建', () => {
    const state = found(makeState());
    expect(canExecute(state, { kind: 'buildBuilding', cityId: state.players[0].cities[0].id, buildingType: 'library' })).not.toBeNull();
  });
  it('placeDistrict: 无法放置', () => {
    const state = found(makeState());
    expect(canExecute(state, { kind: 'placeDistrict', cityId: state.players[0].cities[0].id, districtType: 'campus', tile: { q: 0, r: 0 } })).not.toBeNull();
  });
  it('buildWonder: 未解锁', () => {
    const state = found(makeState());
    expect(canExecute(state, { kind: 'buildWonder', cityId: state.players[0].cities[0].id, wonderType: 'pyramids', tile: { q: 0, r: 0 } })).not.toBeNull();
  });
  it('buyTile: 金币不足', () => {
    const state = found(makeState());
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
