import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand, isDefeated, nextActivePlayer } from '../../src/logic/state/commands';
import { runAIUntilHuman } from '../../src/logic/ai';
import { playerScore } from '../../src/logic/state/victory';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(seed = 42): GameState {
  const config: GameConfig = {
    mapSize: { width: 20, height: 14 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }, { id: 'china', isAI: true }],
    difficulty: 'prince',
    maxTurns: 60,
  };
  return createInitialState(seed, config);
}

describe('端到端可玩冒烟', () => {
  it('完整对局多回合无崩溃，状态推进', () => {
    let state = makeState(42);
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    state = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' }).state;
    state = applyCommand(state, { kind: 'research', techId: 'pottery' }).state;
    for (let i = 0; i < 80 && state.status === 'active'; i++) {
      state = applyCommand(state, { kind: 'endTurn' }).state;
      state = runAIUntilHuman(state).state;
    }
    expect(state.turn).toBeGreaterThan(1);
    // 至少有一座人类城市存活
    expect(state.players[0].cities.length).toBeGreaterThanOrEqual(1);
    // 各玩家分数可计算
    for (const p of state.players) {
      expect(playerScore(p)).toBeGreaterThanOrEqual(0);
    }
  });

  it('AI 在 40 回合内建立多城（扩张积极）', () => {
    let state = makeState(42);
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    state = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' }).state;
    for (let i = 0; i < 40 && state.status === 'active'; i++) {
      state = applyCommand(state, { kind: 'endTurn' }).state;
      state = runAIUntilHuman(state).state;
    }
    const aiCities = state.players.filter((p) => p.isAI).reduce((a, p) => a + p.cities.length, 0);
    expect(aiCities).toBeGreaterThanOrEqual(2);
  });

  it('endTurn 跳过已失败玩家', () => {
    const state = makeState(42);
    state.players[1].cities = [];
    state.players[1].units = [];
    const { state: s2 } = applyCommand(state, { kind: 'endTurn' });
    expect(s2.currentPlayerIndex).toBe(2); // 跳过 player-1
  });

  it('isDefeated / nextActivePlayer 边界', () => {
    const state = makeState(42);
    expect(isDefeated(state.players[0])).toBe(false);
    state.players[1].cities = [];
    state.players[1].units = [];
    expect(isDefeated(state.players[1])).toBe(true);
    // 全失败 -> 返回当前
    for (const p of state.players) { p.cities = []; p.units = []; }
    expect(nextActivePlayer(state)).toBe(state.currentPlayerIndex);
  });

  it('跑到回合上限触发分数胜利', () => {
    let state = makeState(7);
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    state = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'R' }).state;
    state = applyCommand(state, { kind: 'research', techId: 'mining' }).state;
    let guard = 0;
    while (state.status === 'active' && guard < 500) {
      guard++;
      state = applyCommand(state, { kind: 'endTurn' }).state;
      state = runAIUntilHuman(state).state;
    }
    expect(state.status).toBe('finished');
    expect(state.winner).toBeDefined();
  });
});
