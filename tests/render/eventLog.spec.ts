// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { formatEvent } from '../../src/render/eventLog';
import { createInitialState } from '../../src/logic/state/createInitialState';
import type { GameConfig, GameEvent } from '../../src/logic/state/types';

describe('eventLog', () => {
  it('formats CityFounded event', () => {
    const config: GameConfig = { mapSize: { width: 16, height: 12 }, civChoices: [{ id: 'rome', isAI: false }], difficulty: 'prince', maxTurns: 300 };
    const state = createInitialState(42, config);
    const event: GameEvent = { kind: 'CityFounded', turn: 1, payload: { cityId: 'city-0' } };
    state.players[0].cities.push({
      id: 'city-0', ownerId: state.players[0].id, name: 'Roma', tile: { q: 1, r: 1 },
      territory: [{ q: 1, r: 1 }], workedTiles: [{ q: 1, r: 1 }], population: 1, food: 0, culture: 0,
      housing: 2, amenities: 1, buildings: [], districts: [], wonders: [], queue: [], hp: 200,
      wallsHp: 0, wallsMax: 0, isCapital: true, rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    });
    const result = formatEvent(state, event);
    expect(result).toContain('建立');
    expect(result).toContain('Roma');
  });
});