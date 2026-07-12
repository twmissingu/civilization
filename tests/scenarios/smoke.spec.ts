import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { runAIUntilHuman } from '../../src/logic/ai';
import { playerScore } from '../../src/logic/state/victory';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(seed = 42): GameState {
  const config: GameConfig = {
    mapSize: { width: 20, height: 14 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }, { id: 'china', isAI: true }],
    difficulty: 'standard',
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
      state = runAIUntilHuman(state);
    }
    expect(state.turn).toBeGreaterThan(1);
    // 至少有一座人类城市存活
    expect(state.players[0].cities.length).toBeGreaterThanOrEqual(1);
    // 各玩家分数可计算
    for (const p of state.players) {
      expect(playerScore(p)).toBeGreaterThanOrEqual(0);
    }
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
      state = runAIUntilHuman(state);
    }
    expect(state.status).toBe('finished');
    expect(state.winner).toBeDefined();
  });
});
