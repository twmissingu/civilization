import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { aiDecide, runAIUntilHuman } from '../../src/logic/ai';
import { getTile } from '../../src/logic/state/mapgen';
import { hexNeighbors } from '../../src/logic/hex';
import type { GameConfig, GameState, CityState } from '../../src/logic/state/types';

function makeState(seed = 42): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'standard',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

describe('AI 决策', () => {
  it('aiDecide 返回命令序列并以 endTurn 结尾', () => {
    const state = makeState();
    state.currentPlayerIndex = 1;
    const cmds = aiDecide(state, state.players[1]);
    expect(cmds.length).toBeGreaterThan(0);
    expect(cmds[cmds.length - 1].kind).toBe('endTurn');
  });

  it('runAIUntilHuman 跑完 AI 回合回到人类玩家', () => {
    let state = makeState();
    state = applyCommand(state, { kind: 'endTurn' }).state; // -> player 1 (AI)
    state = runAIUntilHuman(state);
    expect(state.players[state.currentPlayerIndex].isAI).toBe(false);
    expect(state.turn).toBeGreaterThanOrEqual(2);
  });

  it('AI 确定性：同 seed 同命令序列', () => {
    const state = makeState();
    state.currentPlayerIndex = 1;
    const a = aiDecide(state, state.players[1]);
    const b = aiDecide(state, state.players[1]);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('AI 建城：AI 开拓者会建城', () => {
    const state = makeState();
    state.currentPlayerIndex = 1;
    const cmds = aiDecide(state, state.players[1]);
    expect(cmds.some((c) => c.kind === 'foundCity' || c.kind === 'moveUnit')).toBe(true);
  });

  it('AI 建造者改良与战士攻击邻敌', () => {
    const state = makeState();
    state.currentPlayerIndex = 1;
    const p1 = state.players[1];
    p1.researchedTechs.push('pottery', 'mining');
    const spawn = p1.units.find((u) => u.type === 'settler')!.tile;
    const city: CityState = {
      id: 'c1', ownerId: 'player-1', name: 'A', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: ['monument'],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true, rangedStrikeUsed: false,
    };
    p1.cities.push(city);
    p1.capitalCityId = 'c1';
    p1.units = p1.units.filter((u) => u.type !== 'settler');
    const grass = hexNeighbors(spawn)[0];
    const grassTile = getTile(state.map, grass);
    if (grassTile) {
      grassTile.terrain = 'grassland';
      p1.units.push({ id: 'ub', ownerId: 'player-1', type: 'builder', tile: grass, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: 3, hasActed: false });
    }
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const p1warrior = p1.units.find((u) => u.type === 'warrior')!;
    const p0warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    p0warrior.tile = hexNeighbors(p1warrior.tile)[0];
    const cmds = aiDecide(state, p1);
    expect(cmds.some((c) => c.kind === 'buildImprovement')).toBe(true);
    expect(cmds.some((c) => c.kind === 'attack')).toBe(true);
  });

  it('hard 难度优先补军事', () => {
    const state = makeState();
    state.config.difficulty = 'hard';
    state.currentPlayerIndex = 1;
    const p1 = state.players[1];
    const spawn = p1.units.find((u) => u.type === 'settler')!.tile;
    p1.cities.push({
      id: 'c1', ownerId: 'player-1', name: 'A', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: ['monument'],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true, rangedStrikeUsed: false,
    });
    p1.capitalCityId = 'c1';
    p1.units = p1.units.filter((u) => u.type !== 'warrior' && u.type !== 'settler'); // 0 军事
    const cmds = aiDecide(state, p1);
    const train = cmds.find((c) => c.kind === 'trainUnit') as { unitType: string } | undefined;
    expect(train).toBeDefined();
    expect(['warrior', 'archer']).toContain(train!.unitType);
  });

  it('hard 难度开拓者建城（不怠工）', () => {
    const state = makeState();
    state.config.difficulty = 'hard';
    state.currentPlayerIndex = 1;
    const cmds = aiDecide(state, state.players[1]);
    expect(cmds.some((c) => c.kind === 'foundCity')).toBe(true);
  });
});
