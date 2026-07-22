import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import type { GameConfig } from '../../src/logic/state/types';

describe('types coverage', () => {
  it('GameState can be created with GameConfig', () => {
    const config: GameConfig = {
      mapSize: { width: 8, height: 6 },
      civChoices: [{ id: 'rome', isAI: false }],
      difficulty: 'prince',
      maxTurns: 300,
    };
    const state = createInitialState(42, config);
    expect(state.turn).toBe(1);
    expect(state.status).toBe('active');
    expect(state.players.length).toBe(1);
  });

  it('GameState has expected properties', () => {
    const config: GameConfig = {
      mapSize: { width: 8, height: 6 },
      civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
      difficulty: 'king',
      maxTurns: 200,
    };
    const state = createInitialState(99, config);
    expect(state.version).toBe(1);
    expect(state.seed).toBe(99);
    expect(state.players.length).toBe(2);
    expect(state.diplomacy).toBeDefined();
  });
});
