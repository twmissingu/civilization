// CP-13 城邦使者分配 + 宗主国加成
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import { recomputeSuzerains, envoyCount, isSuzerain, canSendEnvoy, cityStateYieldBonus } from '../../src/logic/state/citystate';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(seed = 42): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

describe('CP-13 城邦系统', () => {
  it('初始状态包含城邦实例', () => {
    const state = makeState();
    expect(state.cityStates.length).toBeGreaterThanOrEqual(10);
    expect(state.cityStates[0].id).toBeDefined();
    expect(state.cityStates[0].envoys).toEqual({});
    expect(state.cityStates[0].suzerainId).toBeNull();
    expect(state.cityStates[0].isAlive).toBe(true);
  });

  it('canSendEnvoy 在无使者时返回 false', () => {
    const state = makeState();
    const player = currentPlayer(state);
    expect(canSendEnvoy(state, player, state.cityStates[0].id)).toBe(false);
  });

  it('派遣使者消耗使者数并增加城邦使者计数', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.storedEnvoys = 3;
    const csId = state.cityStates[0].id;
    const { state: s2 } = applyCommand(state, { kind: 'sendEnvoy', cityStateId: csId });
    const player2 = currentPlayer(s2);
    expect(player2.storedEnvoys).toBe(2);
    const cs = s2.cityStates.find((c) => c.id === csId)!;
    expect(envoyCount(cs, player.id)).toBe(1);
  });

  it('派遣使者后重新计算宗主国', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.storedEnvoys = 3;
    const csId = state.cityStates[0].id;
    const { state: s2 } = applyCommand(state, { kind: 'sendEnvoy', cityStateId: csId });
    const cs = s2.cityStates.find((c) => c.id === csId)!;
    expect(isSuzerain(cs, player.id)).toBe(true);
    expect(cs.suzerainId).toBe(player.id);
  });

  it('城邦产出加成随使者数增加', () => {
    const state = makeState();
    const player = currentPlayer(state);
    // 先建城
    const settler = player.units.find((u) => u.type === 'settler')!;
    const { state: s2 } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
    const player2 = currentPlayer(s2);
    // 派遣使者
    player2.storedEnvoys = 3;
    const csId = s2.cityStates[0].id;
    const { state: s3 } = applyCommand(s2, { kind: 'sendEnvoy', cityStateId: csId });
    const player3 = currentPlayer(s3);
    const csBonus = cityStateYieldBonus(s3, player3);
    // 应有至少 2 点产出加成（科学/文化/金币/信仰/产能之一）
    const totalBonus = csBonus.science + csBonus.culture + csBonus.gold + csBonus.faith + csBonus.production;
    expect(totalBonus).toBeGreaterThanOrEqual(2);
  });

  it('城邦死亡后不再影响计算', () => {
    const state = makeState();
    const player = currentPlayer(state);
    player.storedEnvoys = 3;
    const csId = state.cityStates[0].id;
    const { state: s2 } = applyCommand(state, { kind: 'sendEnvoy', cityStateId: csId });
    // 杀死城邦
    const cs = s2.cityStates.find((c) => c.id === csId)!;
    cs.isAlive = false;
    recomputeSuzerains(s2);
    expect(cs.suzerainId).toBeNull();
    const player2 = currentPlayer(s2);
    expect(cityStateYieldBonus(s2, player2).science).toBe(0);
  });
});