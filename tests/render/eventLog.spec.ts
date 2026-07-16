import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { formatEvent } from '../../src/render/eventLog';
import type { GameConfig, GameState } from '../../src/logic/state/types';
import type { GameEvent } from '../../src/logic/state/types';

function makeState(): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'standard',
    maxTurns: 300,
  };
  return createInitialState(42, config);
}

describe('formatEvent', () => {
  it('格式化建城事件', () => {
    const state = makeState();
    const event: GameEvent = { kind: 'CityFounded', turn: 1, payload: { cityId: 'city-0' } };
    state.players[0].cities.push({
      id: 'city-0',
      ownerId: 'player-0',
      name: 'Roma',
      tile: { q: 1, r: 1 },
      territory: [{ q: 1, r: 1 }],
      workedTiles: [{ q: 1, r: 1 }],
      population: 1,
      food: 0,
      culture: 0,
      housing: 2,
      amenities: 1,
      buildings: [],
      districts: [],
      wonders: [],
      queue: [],
      hp: 200,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: true,
      rangedStrikeUsed: false,
    });
    expect(formatEvent(state, event)).toContain('罗马（式） 建立 Roma');
  });

  it('格式化单位战斗（非击杀）', () => {
    const state = makeState();
    const event: GameEvent = {
      kind: 'CombatResolved',
      turn: 2,
      payload: {
        attackerId: state.players[0].units[1].id,
        defenderId: state.players[1].units[1].id,
        defenderTile: { q: 5, r: 5 },
        defenderKilled: false,
        defenderDamage: 23,
        attackerDamage: 8,
        attackerKilled: false,
      },
    };
    const msg = formatEvent(state, event);
    expect(msg).toContain('罗马（式）');
    expect(msg).toContain('战士');
    expect(msg).toContain('攻击');
    expect(msg).toContain('造成 23 伤害');
  });

  it('格式化单位战斗（击杀）', () => {
    const state = makeState();
    const event: GameEvent = {
      kind: 'CombatResolved',
      turn: 3,
      payload: {
        attackerId: state.players[0].units[1].id,
        defenderId: state.players[1].units[1].id,
        defenderTile: { q: 5, r: 5 },
        defenderKilled: true,
        defenderDamage: 100,
        attackerDamage: 0,
        attackerKilled: false,
      },
    };
    const msg = formatEvent(state, event);
    expect(msg).toContain('在 (5,5) 击败');
  });

  it('格式化攻城事件', () => {
    const state = makeState();
    const event: GameEvent = {
      kind: 'CityAttacked',
      turn: 4,
      payload: { attackerId: state.players[0].units[0].id, cityId: 'city-foo', defenderDamage: 30 },
    };
    state.players[1].cities.push({
      id: 'city-foo',
      ownerId: 'player-1',
      name: 'Athens',
      tile: { q: 2, r: 2 },
      territory: [{ q: 2, r: 2 }],
      workedTiles: [{ q: 2, r: 2 }],
      population: 1,
      food: 0,
      culture: 0,
      housing: 2,
      amenities: 1,
      buildings: [],
      districts: [],
      wonders: [],
      queue: [],
      hp: 200,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: false,
      rangedStrikeUsed: false,
    });
    const msg = formatEvent(state, event);
    expect(msg).toContain('攻击 Athens');
    expect(msg).toContain('造成 30 伤害');
  });

  it('格式化宣战与议和', () => {
    const state = makeState();
    const war: GameEvent = { kind: 'WarDeclared', turn: 5, payload: { attackerId: 'player-0', targetCivId: 'player-1' } };
    expect(formatEvent(state, war)).toContain('罗马（式） 向 希腊（式） 宣战');

    const peace: GameEvent = { kind: 'PeaceDeclared', turn: 6, payload: { civA: 'player-0', civB: 'player-1' } };
    expect(formatEvent(state, peace)).toContain('议和');
  });

  it('格式化政体切换', () => {
    const state = makeState();
    const event: GameEvent = {
      kind: 'GovernmentChanged',
      turn: 7,
      payload: { playerId: 'player-0', governmentType: 'autocracy' },
    };
    expect(formatEvent(state, event)).toContain('罗马（式） 切换政体为 独裁');
  });

  it('格式化胜利事件', () => {
    const state = makeState();
    const event: GameEvent = {
      kind: 'GameWon',
      turn: 8,
      payload: { victor: 'player-0', victoryType: 'domination' },
    };
    expect(formatEvent(state, event)).toContain('罗马（式） 取得 domination 胜利');
  });

  it('未知事件返回 kind fallback', () => {
    const state = makeState();
    const event: GameEvent = { kind: 'CustomEvent', turn: 9, payload: {} };
    expect(formatEvent(state, event)).toBe('第 9 回合 · CustomEvent');
  });
});
