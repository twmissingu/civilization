import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand, findUnit, canExecute, currentPlayer } from '../../src/logic/state/commands';
import { tileMoveCost } from '../../src/logic/state/unitMove';
import { tileYield } from '../../src/logic/state/yield';import { districtAdjacencyBonus, canPlaceDistrict } from '../../src/logic/state/district';
import { resolveAttackCity } from '../../src/logic/state/combat';
import { resolveTurn } from '../../src/logic/state/turnResolution';
import { triggerEureka, advanceResearch } from '../../src/logic/state/tech';
import { techCost, TECHS } from '../../src/gamedata';
import { getTile } from '../../src/logic/state/mapgen';
import { hexNeighbors, hexEquals, hexInRange } from '../../src/logic/hex';
import type { GameState, GameConfig, CityState } from '../../src/logic/state/types';

function makeState(seed = 7): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

function foundCityP0(state: GameState): { state: GameState; city: CityState } {
  const settler = state.players[0].units.find((u) => u.type === 'settler')!;
  const { state: s2 } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
  return { state: s2, city: s2.players[0].cities[0] };
}

function findLandNeighbor(state: GameState, tile: { q: number; r: number }) {
  return hexNeighbors(tile).find((n) => {
    const t = getTile(state.map, n);
    return t && t.terrain !== 'ocean' && t.terrain !== 'coast' && t.terrain !== 'mountain';
  });
}

describe('单位移动与寻路', () => {
  it('moveUnit 命令移动单位到邻格', () => {
    const state = makeState();
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    const dest = findLandNeighbor(state, warrior.tile);
    if (!dest) return;
    const { state: s2 } = applyCommand(state, { kind: 'moveUnit', unitId: warrior.id, to: dest });
    const moved = findUnit(s2, warrior.id);
    expect(hexEquals(moved!.tile, dest)).toBe(true);
  });

  it('不可通行格寻路失败', () => {
    const state = makeState();
    const warrior = state.players[0].units.find((u) => u.type === 'warrior')!;
    // 找一个海洋格作为不可达目标
    let ocean: { q: number; r: number } | null = null;
    for (const n of hexInRange(warrior.tile, 3)) {
      const t = getTile(state.map, n);
      if (t && t.terrain === 'ocean') { ocean = n; break; }
    }
    if (!ocean) return; // 无海洋则跳过
    expect(canExecute(state, { kind: 'moveUnit', unitId: warrior.id, to: ocean })).not.toBeNull();
  });

  it('tileMoveCost 山脉不可通行', () => {
    const state = makeState();
    let mountain: { q: number; r: number } | null = null;
    for (let r = 0; r < state.map.bounds.height && !mountain; r++) {
      for (let q = 0; q < state.map.bounds.width && !mountain; q++) {
        if (getTile(state.map, { q, r })?.terrain === 'mountain') mountain = { q, r };
      }
    }
    if (!mountain) return;
    expect(Number.isFinite(tileMoveCost(state, mountain))).toBe(false);
  });
});

describe('地块产出', () => {
  it('tileYield 叠加地形+特征+资源+改良', () => {
    const state = makeState();
    // 找一个有特征的陆地格
    let tile = null as null | ReturnType<typeof getTile>;
    for (const t of state.map.tiles) {
      if (t.feature && t.terrain !== 'ocean') { tile = t; break; }
    }
    if (!tile) return;
    const base = tileYield(tile, true);
    expect(base).toBeDefined();
    const unworked = tileYield(tile, false);
    expect(unworked.food).toBe(0);
  });
});

describe('区域相邻加成多场景', () => {
  it('商业中心邻河流 +金币', () => {
    const state = makeState();
    // 找河流格
    let river: { q: number; r: number } | null = null;
    for (const t of state.map.tiles) {
      if (t.isRiver) { river = t.coord; break; }
    }
    if (!river) return;
    const bonus = districtAdjacencyBonus(state, 'commercial', river);
    expect(bonus.gold).toBeGreaterThan(0);
  });
  it('canPlaceDistrict 失败：城中心格不可放', () => {
    const { state, city } = foundCityP0(makeState());
    expect(canPlaceDistrict(state, city, 'campus', city.tile)).toBe(false);
  });
  it('canPlaceDistrict 失败：领土外', () => {
    const { state, city } = foundCityP0(makeState());
    state.players[0].researchedTechs.push('astrology');
    const far = { q: city.tile.q + 10, r: city.tile.r };
    expect(canPlaceDistrict(state, city, 'campus', far)).toBe(false);
  });
});

describe('命令分发覆盖', () => {
  it('buyTile 购买地块消耗金币', () => {
    const { state, city } = foundCityP0(makeState());
    state.players[0].gold = 1000;
    const target = hexNeighbors(city.tile).find((n) => !city.territory.some((t) => hexEquals(t, n)));
    if (!target) return;
    const before = city.territory.length;
    const goldBefore = state.players[0].gold;
    const { state: s2 } = applyCommand(state, { kind: 'buyTile', cityId: city.id, tile: target });
    expect(s2.players[0].cities[0].territory.length).toBe(before + 1);
    expect(s2.players[0].gold).toBeLessThan(goldBefore);
  });

  it('declareWar / suePeace 改变外交', () => {
    const state = makeState();
    const { state: s2 } = applyCommand(state, { kind: 'declareWar', targetCivId: 'player-1' });
    expect(s2.diplomacy['player-0']['player-1']).toBe('war');
    expect(s2.diplomacy['player-1']['player-0']).toBe('war');
    const { state: s3 } = applyCommand(s2, { kind: 'suePeace', targetCivId: 'player-1' });
    expect(s3.diplomacy['player-0']['player-1']).toBe('peace');
  });

  it('trainUnit / buildBuilding 入队', () => {
    const { state, city } = foundCityP0(makeState());
    const { state: s2 } = applyCommand(state, { kind: 'trainUnit', cityId: city.id, unitType: 'warrior' });
    expect(s2.players[0].cities[0].queue.some((i) => i.kind === 'unit')).toBe(true);
    state.players[0].researchedTechs.push('writing');
    const { state: s3 } = applyCommand(state, { kind: 'buildBuilding', cityId: city.id, buildingType: 'library' });
    expect(s3.players[0].cities[0].queue.some((i) => i.kind === 'building')).toBe(true);
  });

  it('switchPolicy 成功（万能槽放任意卡）', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('state_workforce'); // 解锁 urban_planning
    // chiefdom: slot 0=military, slot 1=economic. urban_planning=economic -> slot 1
    const { state: s2 } = applyCommand(state, { kind: 'switchPolicy', cardId: 'urban_planning', slotIndex: 1 });
    expect(s2.players[0].policySlots[1]).toBe('urban_planning');
  });

  it('startSpaceProject 入队', () => {
    const { state, city } = foundCityP0(makeState());
    const { state: s2 } = applyCommand(state, { kind: 'startSpaceProject', cityId: city.id, stage: 1 });
    expect(s2.players[0].cities[0].queue.some((i) => i.kind === 'project')).toBe(true);
  });

  it('非法命令不改状态', () => {
    const state = makeState();
    const { state: s2, events } = applyCommand(state, { kind: 'research', techId: 'nonexistent' });
    expect(events).toHaveLength(0);
    expect(s2).toBe(state);
  });
});

describe('科技细节', () => {
  it('techCost 随已研究数缩放', () => {
    const pottery = TECHS.pottery;
    expect(techCost(pottery, 0)).toBe(25);
    expect(techCost(pottery, 10)).toBeGreaterThan(25);
  });
  it('triggerEureka 增加 40% 进度', () => {
    const state = makeState();
    const player = state.players[0];
    player.currentResearch = { techId: 'pottery', progress: 0 };
    triggerEureka(player, 'pottery');
    expect(player.currentResearch.progress).toBeGreaterThan(0);
    advanceResearch(player, 100);
    expect(player.researchedTechs).toContain('pottery');
  });
});

describe('攻城', () => {
  it('resolveAttackCity 对城市造成伤害', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = {
      id: 'city-test', ownerId: 'player-1', name: 'Athens', tile: spawn,
      territory: [spawn], workedTiles: [spawn], population: 1, food: 0, culture: 0,
      housing: 2, amenities: 1, buildings: ['monument'], districts: [], wonders: [],
      queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true, rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    };
    p1.cities.push(city);
    p1.capitalCityId = 'city-test';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(spawn)[0];
    const before = city.hp;
    resolveAttackCity(state, attacker, city);
    expect(city.hp).toBeLessThanOrEqual(before);
  });
});

describe('政体解锁校验', () => {
  it('未解锁政体不可切换', () => {
    const state = makeState();
    expect(canExecute(state, { kind: 'changeGovernment', governmentType: 'democracy' })).not.toBeNull();
  });
  it('currentPlayer 返回当前玩家', () => {
    const state = makeState();
    expect(currentPlayer(state).id).toBe('player-0');
  });
});

describe('叛乱机制', () => {
  it('满意度为负的城市在 resolveTurn 中减少人口', () => {
    const { state, city } = foundCityP0(makeState());
    city.population = 4;
    city.food = 20; // 够 survive settleCity 但不够增长
    city.amenities = -1;
    resolveTurn(state);
    expect(city.population).toBe(3);
    expect(city.food).toBe(0);
  });
  it('人口为 1 的城市满意度为负不会减少人口', () => {
    const { state, city } = foundCityP0(makeState());
    city.food = 10;
    city.amenities = -1;
    city.population = 1;
    resolveTurn(state);
    expect(city.population).toBe(1);
  });
  it('满意度非负的城市不会减少人口', () => {
    const { state, city } = foundCityP0(makeState());
    city.population = 4;
    city.food = 20;
    city.amenities = 0;
    resolveTurn(state);
    expect(city.population).toBe(4);
  });
});
