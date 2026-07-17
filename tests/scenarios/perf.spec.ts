import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { runAIUntilHuman } from '../../src/logic/ai';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(seed: number, w: number, h: number, civIds: string[]): GameState {
  const config: GameConfig = {
    mapSize: { width: w, height: h },
    civChoices: civIds.map((id, i) => ({ id, isAI: i !== 0 })),
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

function playAIBlock(state: GameState, turns: number): GameState {
  let s = state;
  for (let i = 0; i < turns && s.status === 'active'; i++) {
    s = applyCommand(s, { kind: 'endTurn' }).state;
    s = runAIUntilHuman(s);
  }
  return s;
}

describe('性能基准（US39: AI 回合 < 3s）', () => {
  it('24×16 / 3 文明：5 回合 AI < 15s（<3s/回合）', () => {
    let state = makeState(42, 24, 16, ['rome', 'greece', 'china']);
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    state = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'R' }).state;
    state = applyCommand(state, { kind: 'research', techId: 'pottery' }).state;
    const start = Date.now();
    state = playAIBlock(state, 5);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
    expect(state.turn).toBeGreaterThan(1);
  });

  it('40×24 / 4 文明：3 回合 AI < 9s（<3s/回合）', () => {
    let state = makeState(7, 40, 24, ['rome', 'greece', 'china', 'rome']);
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    state = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'R' }).state;
    const start = Date.now();
    state = playAIBlock(state, 3);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(9000);
  });

  it('单命令 applyCommand < 50ms（24×16）', () => {
    const state = makeState(42, 24, 16, ['rome', 'greece', 'china']);
    const start = Date.now();
    for (let i = 0; i < 20; i++) {
      applyCommand(state, { kind: 'research', techId: 'pottery' });
    }
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
