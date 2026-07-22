import { describe, it, expect } from 'vitest';
import { applyCommand } from '../../src/logic/state/commands';
import { runAIUntilHuman } from '../../src/logic/ai';
import type { GameState } from '../../src/logic/state/types';
import { makeState, foundCityP0 } from '../scenarios/helpers';

function playAIBlock(state: GameState, turns: number): GameState {
  let s = state;
  for (let i = 0; i < turns && s.status === 'active'; i++) {
    s = applyCommand(s, { kind: 'endTurn' }).state;
    s = runAIUntilHuman(s).state;
  }
  return s;
}

describe('性能基准（US39: AI 回合 < 3s）', () => {
  it('24×16 / 3 文明：5 回合 AI < 15s（<3s/回合）', () => {
    let state = makeState(42, { mapSize: { width: 24, height: 16 }, civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }, { id: 'china', isAI: true }] });
    const { state: s } = foundCityP0(state);
    state = s;
    state = applyCommand(state, { kind: 'research', techId: 'pottery' }).state;
    const start = Date.now();
    state = playAIBlock(state, 5);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
    expect(state.turn).toBeGreaterThan(1);
  });

  it('40×24 / 4 文明：3 回合 AI < 9s（<3s/回合）', () => {
    let state = makeState(7, { mapSize: { width: 40, height: 24 }, civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }, { id: 'china', isAI: true }, { id: 'rome', isAI: true }] });
    const { state: s } = foundCityP0(state);
    state = s;
    const start = Date.now();
    state = playAIBlock(state, 3);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(9000);
  });

  it('单命令 applyCommand < 50ms（24×16）', () => {
    const state = makeState(42, { mapSize: { width: 24, height: 16 }, civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }, { id: 'china', isAI: true }] });
    const start = Date.now();
    for (let i = 0; i < 20; i++) {
      applyCommand(state, { kind: 'research', techId: 'pottery' });
    }
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
