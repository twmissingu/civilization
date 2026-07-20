// AI 决策全面覆盖测试
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { aiDecide, runAIUntilHuman } from '../../src/logic/ai';
import { getTile } from '../../src/logic/state/mapgen';
import { hexNeighbors } from '../../src/logic/hex';
import type { GameConfig, GameState, CityState } from '../../src/logic/state/types';

function makeState(seed = 42, difficulty: string = 'prince'): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: difficulty as GameConfig['difficulty'],
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

function setupCity(playerId: string, tile: { q: number; r: number }): CityState {
  return {
    id: `c-${playerId}-1`, ownerId: playerId, name: 'City', tile, territory: [tile], workedTiles: [tile],
    population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: ['monument'],
    districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true,
    rangedStrikeUsed: false, religion: {}, dominantReligion: null,
  };
}

describe('AI 全面覆盖', () => {
  it('settler 难度随机研究科技', () => {
    const state = makeState(42, 'settler');
    state.currentPlayerIndex = 1;
    const cmds = aiDecide(state, state.players[1]);
    expect(cmds.some((c) => c.kind === 'research')).toBe(true);
  });

  it('AI 研究市政', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    player.currentCivic = null;
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'researchCivic')).toBe(true);
  });

  it('AI 已有研究时不重复研究', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    player.currentResearch = { techId: 'pottery', progress: 10 };
    const cmds = aiDecide(state, player);
    expect(cmds.filter((c) => c.kind === 'research').length).toBe(0);
  });

  it('AI 信仰足够时选择万神殿', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    player.faith = 50;
    player.pantheon = null;
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'foundPantheon')).toBe(true);
  });

  it('AI 已有万神殿时不再选择', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    player.faith = 50;
    player.pantheon = 'fertility_rites';
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'foundPantheon')).toBe(false);
  });

  it('AI hard 难度优先补军事', () => {
    const state = makeState(42, 'emperor');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    const spawn = player.units.find((u) => u.type === 'settler')!.tile;
    const city = setupCity( player.id, spawn);
    player.cities.push(city);
    player.capitalCityId = city.id;
    player.units = player.units.filter((u) => u.type !== 'warrior' && u.type !== 'settler');
    const cmds = aiDecide(state, player);
    const train = cmds.find((c) => c.kind === 'trainUnit') as { unitType: string } | undefined;
    expect(train).toBeDefined();
    expect(train!.unitType).toBe('warrior');
  });

  it('AI 建造者改良地块', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    const spawn = player.units.find((u) => u.type === 'settler')!.tile;
    const city = setupCity( player.id, spawn);
    player.cities.push(city);
    player.capitalCityId = city.id;
    player.researchedTechs.push('pottery', 'mining');
    player.units = player.units.filter((u) => u.type !== 'settler');
    const grass = hexNeighbors(spawn)[0];
    const grassTile = getTile(state.map, grass);
    if (grassTile) {
      grassTile.terrain = 'grassland';
      player.units.push({
        id: 'builder-1', ownerId: player.id, type: 'builder', tile: grass,
        hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: 3, hasActed: false,
      });
    }
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'buildImprovement')).toBe(true);
  });

  it('AI 建造者无法改良时探索移动', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    const spawn = player.units.find((u) => u.type === 'settler')!.tile;
    const city = setupCity( player.id, spawn);
    player.cities.push(city);
    player.capitalCityId = city.id;
    player.units = player.units.filter((u) => u.type !== 'settler');
    // 建造者放在无法改良的地形上
    player.units.push({
      id: 'builder-1', ownerId: player.id, type: 'builder', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: 3, hasActed: false,
    });
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'moveUnit')).toBe(true);
  });

  it('AI 军事攻击邻敌', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const warrior = player.units.find((u) => u.type === 'warrior')!;
    const enemyWarrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    enemyWarrior.tile = hexNeighbors(warrior.tile)[0];
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'attack')).toBe(true);
  });

  it('AI 军事无邻敌时探索移动', () => {
    const state = makeState(42, 'prince');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    state.diplomacy['player-0']['player-1'] = 'peace';
    state.diplomacy['player-1']['player-0'] = 'peace';
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'moveUnit')).toBe(true);
  });

  it('runAIUntilHuman 完成 AI 回合', () => {
    const state = makeState(42, 'prince');
    let s = applyCommand(state, { kind: 'endTurn' }).state;
    s = runAIUntilHuman(s).state;
    // 结果应为人类玩家回合或游戏结束
    const isHumanTurn = s.status === 'active' && !s.players[s.currentPlayerIndex].isAI;
    const isFinished = s.status === 'finished';
    expect(isHumanTurn || isFinished).toBe(true);
  });

  it('AI 命令以 endTurn 结尾', () => {
    const state = makeState(42, 'settler');
    state.currentPlayerIndex = 1;
    const cmds = aiDecide(state, state.players[1]);
    expect(cmds[cmds.length - 1].kind).toBe('endTurn');
  });

  it('AI 不同难度产出不同命令序列', () => {
    const state1 = makeState(42, 'settler');
    state1.currentPlayerIndex = 1;
    const state2 = makeState(42, 'emperor');
    state2.currentPlayerIndex = 1;
    const cmds1 = aiDecide(state1, state1.players[1]);
    const cmds2 = aiDecide(state2, state2.players[1]);
    const json1 = JSON.stringify(cmds1);
    const json2 = JSON.stringify(cmds2);
    expect(json1 !== json2 || cmds1.length !== cmds2.length).toBe(true);
  });

  it('AI 宗教单位有宗教时尝试传教', () => {
    const state = makeState(42, 'emperor');
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    const spawn = player.units.find((u) => u.type === 'settler')!.tile;
    const city = setupCity( player.id, spawn);
    player.cities.push(city);
    player.capitalCityId = city.id;
    player.religionId = 'test-religion';
    // 给对手一个城市，设置其宗教为非该宗教
    const enemyCity = setupCity( state.players[0].id, { q: spawn.q + 4, r: spawn.r + 2 });
    enemyCity.dominantReligion = 'other';
    state.players[0].cities.push(enemyCity);
    // 清除所有单位，只保留传教士
    player.units = [];
    player.units.push({
      id: 'missionary-1', ownerId: player.id, type: 'missionary', tile: spawn,
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: 2, hasActed: false,
    });
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'spreadReligion')).toBe(true);
  });

  it('AI 商人有容量时尝试贸易', () => {
    const state = makeState(42, 'emperor'); // 0 skipChance
    state.currentPlayerIndex = 1;
    const player = state.players[1];
    const spawn = player.units.find((u) => u.type === 'settler')!.tile;
    const city = setupCity( player.id, spawn);
    player.cities.push(city);
    player.capitalCityId = city.id;
    player.tradeRouteCapacity = 1;
    player.researchedTechs.push('currency');
    player.units = []; // 清除所有单位
    // 在别处放第二个城市（距离足够远）
    const farTile = { q: spawn.q + 5, r: spawn.r + 3 };
    const farCity = setupCity( player.id, farTile);
    farCity.id = 'c-far';
    player.cities.push(farCity);
    // 商人在第一个城市上
    player.units.push({
      id: 'trader-1', ownerId: player.id, type: 'trader', tile: spawn,
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], tradeRouteId: undefined, hasActed: false,
    });
    const cmds = aiDecide(state, player);
    expect(cmds.some((c) => c.kind === 'startTradeRoute')).toBe(true);
  });
});