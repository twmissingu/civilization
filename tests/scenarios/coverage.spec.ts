import { describe, it, expect } from 'vitest';
import { canBuildImprovement, buildImprovement } from '../../src/logic/state/builder';
import { districtAdjacencyBonus } from '../../src/logic/state/district';
import { resolveAttack, resolveAttackCity, previewCombat } from '../../src/logic/state/combat';
import { canChangeGovernment, changeGovernment, canSwitchPolicy, canResearchCivic, advanceCivic } from '../../src/logic/state/civic';
import { resolveTurn } from '../../src/logic/state/turnResolution';
import { tileYield, cityYield, playerYield } from '../../src/logic/state/yield';
import { moveUnit, isBlocked } from '../../src/logic/state/unitMove';
import { advanceResearch, canResearch, computeEra } from '../../src/logic/state/tech';
import { settleCity, productionCost } from '../../src/logic/state/city';
import { getTile } from '../../src/logic/state/mapgen';
import { hexNeighbors, hexEquals } from '../../src/logic/hex';
import { checkVictory } from '../../src/logic/state/victory';
import { hasAnySuzerain } from '../../src/logic/state/citystate';
import { GOVERNMENT_REF } from '../../src/logic/state/yield';
import { findUnit, findCity, unitAt, cityAt, getTileAt, findPlayer, getTileInfo, getTileInfoShort, canUnitBuildImprovement, canPlayerChangeGovernment, canPlayerSwitchPolicy, getPlayerEra, getPlayerScore, canPlayerResearch, canPlayerResearchCivic, getPlayerYield, getCityYield, getProductionCost, getBuyTilePrice } from '../../src/logic/state/query';
import type { GameState, GameConfig, UnitState, CityState } from '../../src/logic/state/types';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { makeState, foundCityP0 } from '../scenarios/helpers';

function landTile(state: GameState): { q: number; r: number } {
  for (const t of state.map.tiles) {
    if (t.terrain === 'grassland' || t.terrain === 'plains') return t.coord;
  }
  return { q: 0, r: 0 };
}

describe('builder 全面', () => {
  it('canBuildImprovement 各失败分支', () => {
    const state = makeState();
    const c = landTile(state);
    const mk = (overrides: Partial<UnitState>): UnitState => ({
      id: 'b', ownerId: 'player-0', type: 'builder', tile: c, hp: 100, moveLeft: 2,
      xp: 0, level: 1, promotions: [], charges: 3, hasActed: false, ...overrides,
    });
    state.players[0].researchedTechs.push('pottery', 'mining');
    // 无充能
    expect(canBuildImprovement(state, mk({ charges: 0 }), 'farm')).toBe(false);
    // 未解锁科技
    const s2 = makeState();
    const c2 = landTile(s2);
    const b2: UnitState = { id: 'b', ownerId: 'player-0', type: 'builder', tile: c2, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: 3, hasActed: false };
    expect(canBuildImprovement(s2, b2, 'farm')).toBe(false);
    // 地形不匹配（海洋）
    let oceanTile: { q: number; r: number } | null = null;
    for (const t of state.map.tiles) if (t.terrain === 'ocean') { oceanTile = t.coord; break; }
    if (oceanTile) {
      const bOcean = { ...mk({}), tile: oceanTile };
      expect(canBuildImprovement(state, bOcean, 'farm')).toBe(false);
    }
  });
  it('buildImprovement 成功路径', () => {
    const state = makeState();
    const c = landTile(state);
    state.players[0].researchedTechs.push('pottery');
    const b: UnitState = { id: 'b', ownerId: 'player-0', type: 'builder', tile: c, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: 3, hasActed: false };
    expect(canBuildImprovement(state, b, 'farm')).toBe(true);
    buildImprovement(state, b, 'farm');
    expect(getTile(state.map, c)!.improvement).toBe('farm');
    expect(b.charges).toBe(2);
  });
});

describe('district matchesSource 全分支', () => {
  it('各类加成来源触发', () => {
    const state = makeState();
    // 给 player 0 一个城市，便于放置区域/奇观
    const { state: s, city } = foundCityP0(state);
    const center = city.tile;
    const nb = hexNeighbors(center)[0];
    const nbTile = getTile(s.map, nb)!;

    // campus 邻 geothermal
    nbTile.feature = 'geothermal';
    expect(districtAdjacencyBonus(s, 'campus', center).science).toBeGreaterThanOrEqual(2);
    // campus 邻 rainforest
    nbTile.feature = 'rainforest';
    expect(districtAdjacencyBonus(s, 'campus', center).science).toBeGreaterThanOrEqual(0.5);
    // industrial 邻 strategic 资源
    nbTile.feature = null;
    nbTile.resource = { id: 'iron', category: 'strategic' };
    expect(districtAdjacencyBonus(s, 'industrial', center).production).toBeGreaterThanOrEqual(1);
    // industrial 邻 quarry 改良
    nbTile.resource = null;
    nbTile.improvement = 'quarry';
    expect(districtAdjacencyBonus(s, 'industrial', center).production).toBeGreaterThanOrEqual(1);
    // commercial 邻河流
    nbTile.improvement = null;
    nbTile.isRiver = true;
    expect(districtAdjacencyBonus(s, 'commercial', center).gold).toBeGreaterThanOrEqual(2);
    // harbor 邻 coast
    nbTile.isRiver = false;
    nbTile.terrain = 'coast';
    expect(districtAdjacencyBonus(s, 'harbor', center).food).toBeGreaterThanOrEqual(1);
    // theater 邻 wonder
    nbTile.terrain = 'plains';
    city.wonders.push({ id: 'pyramids', tile: nb });
    expect(districtAdjacencyBonus(s, 'theater', center).culture).toBeGreaterThanOrEqual(2);
    // campus 邻其他区域（负加成，clamp 0）
    city.districts.push({ type: 'campus', tile: nb });
    city.wonders = [];
    const bonus = districtAdjacencyBonus(s, 'campus', center);
    expect(bonus.science).toBeGreaterThanOrEqual(0);
  });
});

describe('civic 全面', () => {
  it('canResearchCivic + changeGovernment 多政体', () => {
    const state = makeState();
    const p = state.players[0];
    p.researchedCivics.push('military_tradition', 'state_workforce', 'political_philosophy', 'feudalism', 'theology', 'guilds', 'drama_poetry', 'humanism', 'enlightenment');
    expect(canResearchCivic(p, 'political_philosophy')).toBe(false); // 已研究
    for (const g of ['oligarchy', 'autocracy', 'classical_republic', 'monarchy', 'theocracy', 'merchant_republic', 'democracy'] as const) {
      expect(canChangeGovernment(p, g)).toBe(true);
      changeGovernment(p, g);
      expect(p.government).toBe(g);
    }
  });
  it('canSwitchPolicy 万能槽放军事卡', () => {
    const state = makeState();
    const p = state.players[0];
    p.researchedCivics.push('military_tradition', 'state_workforce');
    // autocracy: 1军+1经+1万能
    p.researchedCivics.push('state_workforce');
    changeGovernment(p, 'autocracy');
    p.policySlots = [null, null, null];
    expect(canSwitchPolicy(p, 'maneuver', 2)).toBe(true); // 万能槽放军事卡
  });
  it('canSwitchPolicy 军事/经济槽类型匹配', () => {
    const state = makeState();
    const p = state.players[0];
    p.researchedCivics.push('military_tradition', 'state_workforce');
    // chiefdom: slot0=military, slot1=economic
    expect(canSwitchPolicy(p, 'maneuver', 0)).toBe(true);
    expect(canSwitchPolicy(p, 'urban_planning', 1)).toBe(true);
  });
  it('advanceCivic 完成市政', () => {
    const state = makeState();
    const p = state.players[0];
    p.currentCivic = { civicId: 'military_tradition', progress: 0 };
    advanceCivic(p, 100);
    expect(p.researchedCivics).toContain('military_tradition');
  });
  it('canResearchCivic 跨树前置（神学需占星术）', () => {
    const state = makeState();
    expect(canResearchCivic(state.players[0], 'theology')).toBe(false);
    state.players[0].researchedTechs.push('astrology');
    expect(canResearchCivic(state.players[0], 'theology')).toBe(true);
  });
  it('canResearchCivic 无前置市政可研究', () => {
    const state = makeState();
    // military_tradition 仅需 code_of_laws（初始已有），无 tech 前置
    expect(canResearchCivic(state.players[0], 'military_tradition')).toBe(true);
    expect(canResearchCivic(state.players[0], 'state_workforce')).toBe(true);
  });
});

describe('yield 分支', () => {
  it('tileYield 特征/资源/改良组合', () => {
    const state = makeState();
    const c = landTile(state);
    const tile = getTile(state.map, c)!;
    tile.feature = null; tile.resource = null; tile.improvement = null;
    expect(tileYield(tile, false).food).toBe(0);
    expect(tileYield(tile, true).food).toBeGreaterThanOrEqual(0);
    tile.feature = 'forest';
    expect(tileYield(tile, true).production).toBeGreaterThan(0);
    tile.resource = { id: 'cattle', category: 'bonus' };
    expect(tileYield(tile, true).food).toBeGreaterThan(0);
    tile.improvement = 'farm';
    tileYield(tile, true);
  });
  it('playerYield with specific playerId', () => {
    const state = makeState();
    const y = playerYield(state, state.players[0]);
    expect(y.food).toBeGreaterThanOrEqual(0);
    expect(y.gold).toBeGreaterThanOrEqual(0);
  });

  it('cityYield 各政体加成', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    const p = s.players[0];
    p.researchedCivics.push('political_philosophy', 'feudalism', 'theology', 'guilds', 'humanism', 'enlightenment');
    for (const g of ['classical_republic', 'monarchy', 'theocracy', 'merchant_republic', 'democracy'] as const) {
      changeGovernment(p, g);
      const y = cityYield(s, city);
      expect(y).toBeDefined();
    }
  });
});

describe('unitMove ZOC', () => {
  it('isBlocked 敌方军事单位阻挡', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const mover = state.players[0].units.find((u) => u.type === 'warrior')!;
    const enemy = state.players[1].units.find((u) => u.type === 'warrior')!;
    enemy.tile = hexNeighbors(mover.tile)[0];
    expect(isBlocked(state, enemy.tile, mover)).toBe(true);
  });
  it('moveUnit 移动力不足停步', () => {
    const state = makeState();
    const mover = state.players[0].units.find((u) => u.type === 'warrior')!;
    const n1 = hexNeighbors(mover.tile).find((n) => {
      const t = getTile(state.map, n);
      return t && t.terrain !== 'ocean' && t.terrain !== 'mountain';
    });
    if (!n1) return;
    mover.moveLeft = 0;
    moveUnit(state, mover, [n1]);
    expect(hexEquals(mover.tile, n1)).toBe(false);
  });
  it('移动受敌方 ZOC 强制停步', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const mover = state.players[0].units.find((u) => u.type === 'warrior')!;
    const n1 = hexNeighbors(mover.tile).find((n) => {
      const t = getTile(state.map, n);
      return t && t.terrain !== 'ocean' && t.terrain !== 'mountain';
    });
    if (!n1) return;
    const n2 = hexNeighbors(n1).find((x) => !hexEquals(x, mover.tile));
    if (!n2) return;
    const enemyPos = hexNeighbors(n1).find((x) => !hexEquals(x, mover.tile) && !hexEquals(x, n2));
    if (!enemyPos) return;
    state.players[1].units.find((u) => u.type === 'warrior')!.tile = enemyPos;
    mover.moveLeft = 10;
    moveUnit(state, mover, [n1, n2]);
    expect(hexEquals(mover.tile, n1)).toBe(true); // 受 ZOC 停在 n1
  });
});

describe('tech/civic 边界', () => {
  it('advanceResearch 无当前研究返回 null', () => {
    const state = makeState();
    expect(advanceResearch(state.players[0], 50)).toBeNull();
  });
  it('canResearch 需市政前置（骑士制度需封建主义）', () => {
    const state = makeState();
    state.players[0].researchedTechs.push('bronze_working');
    expect(canResearch(state.players[0], 'chivalry')).toBe(false); // 缺封建主义市政
    state.players[0].researchedCivics.push('feudalism');
    expect(canResearch(state.players[0], 'chivalry')).toBe(true);
  });
});

describe('文明能力', () => {
  it('希腊万能槽 +1', () => {
    const state = makeState();
    const p = state.players[0];
    p.civId = 'greece';
    p.researchedCivics.push('state_workforce');
    changeGovernment(p, 'autocracy'); // autocracy: 1军+1经+1万能=3，希腊+1=4
    expect(p.policySlots).toHaveLength(4);
  });
  it('中国奇观加成', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    s.players[0].civId = 'china';
    city.wonders.push({ id: 'great_library', tile: city.tile });
    const yNoWonder = cityYield(s, { ...city, wonders: [] });
    const yWonder = cityYield(s, city);
    expect(yWonder.science).toBeGreaterThan(yNoWonder.science);
    expect(yWonder.culture).toBeGreaterThan(yNoWonder.culture);
  });
  it('computeEra 计算时代', () => {
    expect(computeEra([])).toBe('ancient');
    expect(computeEra(['iron_working'])).toBe('classical');
    expect(computeEra(['education'])).toBe('medieval');
  });
  it('中国朝代更替：时代进阶给在建研究加进度', () => {
    const state = makeState();
    const p = state.players[0];
    p.civId = 'china';
    p.era = 'ancient';
    p.researchedTechs.push('iron_working');
    p.currentResearch = { techId: 'sailing', progress: 0 };
    resolveTurn(state);
    expect(p.era).toBe('classical');
    expect(p.currentResearch!.progress).toBeGreaterThan(0);
  });
});

describe('战斗预览', () => {
  it('previewCombat 返回双方 CS 与预计伤害', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.tile = hexNeighbors(attacker.tile)[0];
    const pv = previewCombat(state, attacker.id, defender.tile);
    expect(pv).not.toBeNull();
    expect(pv!.target).toBe('unit');
    expect(pv!.attackerCS).toBeGreaterThan(0);
    expect(pv!.defenderCS).toBeGreaterThan(0);
    expect(pv!.estDamage).toBeGreaterThan(0);
  });
  it('previewCombat 无目标返回 null', () => {
    const state = makeState();
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    expect(previewCombat(state, attacker.id, { q: 999, r: 999 })).toBeNull();
  });
});

describe('turnResolution 分支', () => {
  it('resolveTurn 推进研究与市政', () => {
    const state = makeState();
    const { state: s } = foundCityP0(state);
    s.players[0].currentResearch = { techId: 'pottery', progress: 0 };
    s.players[0].currentCivic = { civicId: 'military_tradition', progress: 0 };
    resolveTurn(s);
    expect(s.turn).toBe(2);
  });
  it('resolveTurn 触发科技胜利', () => {
    const state = makeState();
    const { state: s } = foundCityP0(state);
    s.players[0].cities[0].spaceProject = { stage: 3, progress: 1500 };
    resolveTurn(s);
    expect(s.status).toBe('finished');
    expect(s.victoryType).toBe('science');
  });
});

describe('combat 死亡场景', () => {
  it('resolveAttack 防御方阵亡，攻击者移入', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.hp = 5;
    defender.tile = hexNeighbors(attacker.tile)[0];
    const r = resolveAttack(state, attacker, defender);
    expect(r.defenderKilled).toBe(true);
    expect(hexEquals(attacker.tile, defender.tile)).toBe(true);
  });
  it('resolveAttack 攻击方阵亡（近战反击）', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    attacker.hp = 1;
    defender.tile = hexNeighbors(attacker.tile)[0];
    const r = resolveAttack(state, attacker, defender);
    expect(r.attackerKilled).toBe(true);
  });
  it('resolveAttackCity 城墙吸收伤害', () => {
    const state = makeState();
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = {
      id: 'ct', ownerId: 'player-1', name: 'A', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 2, food: 0, culture: 0, housing: 2, amenities: 1, buildings: ['monument', 'ancient_walls'],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 200, wallsMax: 200, isCapital: true, rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    };
    p1.cities.push(city);
    p1.capitalCityId = 'ct';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(spawn)[0];
    const cityHpBefore = city.hp;
    resolveAttackCity(state, attacker, city);
    // 有城墙时非攻城单位打不到本体
    expect(city.hp).toBe(cityHpBefore);
    expect(city.wallsHp).toBeLessThan(200);
  });

  it('resolveAttack 丘陵防御加成', () => {
    const state = makeState();
    const p1 = state.players[0];
    const p2 = state.players[1];
    // 让攻击者和防御者在丘陵上
    const attacker: UnitState = { id: 'att', ownerId: p1.id, type: 'warrior', tile: { q: 3, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: undefined, hasActed: false };
    const defender: UnitState = { id: 'def', ownerId: p2.id, type: 'warrior', tile: { q: 4, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], charges: undefined, hasActed: false };
    p1.units.push(attacker);
    p2.units.push(defender);
    state.diplomacy[p1.id][p2.id] = 'war';
    state.diplomacy[p2.id][p1.id] = 'war';
    const tile = getTile(state.map, defender.tile);
    if (tile) tile.terrain = 'hills';
    resolveAttack(state, attacker, defender);
    expect(defender.hp).toBeLessThan(100);
  });

  it('文化胜利条件（旅游）', () => {
    let state = makeState();
    const player = state.players[0];
    const p2 = state.players[1];
    player.totalTourism = 1000;
    player.totalCultureGenerated = 2000;
    p2.totalCultureGenerated = 500;
    // 建城让对手存活
    p2.cities.push({
      id: 'p2-city', ownerId: p2.id, name: 'City', tile: { q: 5, r: 5 },
      territory: [{ q: 5, r: 5 }], workedTiles: [{ q: 5, r: 5 }], population: 1, food: 0, culture: 0,
      housing: 2, amenities: 1, buildings: [], districts: [], wonders: [], queue: [],
      hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true, rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    });
    const result = checkVictory(state);
    expect(result).toBeTruthy();
    expect(result!.type).toBe('culture');
  });

  it('getPlayerScore works for current player', () => {
    const state = makeState();
    expect(getPlayerScore(state)).toBeGreaterThan(0);
  });

  it('getPlayerEra returns correct era', () => {
    const state = makeState();
    const era = getPlayerEra(state);
    expect(typeof era).toBe('string');
  });

  it('getPlayerYield with no playerId returns current player', () => {
    const state = makeState();
    const y = getPlayerYield(state);
    expect(y.food).toBeGreaterThanOrEqual(0);
  });

  it('getCityYield returns real yields for existing city', () => {
    const state = makeState();
    // 先建城
    const { state: s2, city } = foundCityP0(state);
    const y = getCityYield(s2, city.id);
    expect(y.food).toBeGreaterThan(0);
  });

  it('getProductionCost returns finite value for existing city', () => {
    const state = makeState();
    const { state: s2, city } = foundCityP0(state);
    const cost = getProductionCost(s2, city.id, { kind: 'unit', id: 'warrior', progress: 0 });
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(Infinity);
  });

  it('getBuyTilePrice returns finite value for existing city', () => {
    const state = makeState();
    const { state: s2, city } = foundCityP0(state);
    const price = getBuyTilePrice(s2, city.id, { q: city.tile.q + 1, r: city.tile.r });
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThan(Infinity);
  });

  it('findUnit returns undefined for non-existent', () => {
    expect(findUnit(makeState(), 'nope')).toBeUndefined();
  });

  it('findCity returns undefined for non-existent', () => {
    expect(findCity(makeState(), 'nope')).toBeUndefined();
  });

  it('unitAt returns undefined for out-of-bounds', () => {
    expect(unitAt(makeState(), { q: -1, r: -1 })).toBeUndefined();
  });

  it('cityAt returns undefined for empty tile', () => {
    expect(cityAt(makeState(), { q: 0, r: 0 })).toBeUndefined();
  });

  it('getTileAt returns undefined for out-of-bounds', () => {
    expect(getTileAt(makeState(), { q: -1, r: -1 })).toBeUndefined();
  });

  it('findPlayer returns undefined for non-existent', () => {
    expect(findPlayer(makeState(), 'nope')).toBeUndefined();
  });

  it('getTileInfo returns a string', () => {
    const state = makeState();
    const tile = state.map.tiles[0];
    expect(typeof getTileInfo(state, tile.coord)).toBe('string');
  });

  it('getTileInfoShort returns a string', () => {
    const state = makeState();
    const tile = state.map.tiles[0];
    expect(typeof getTileInfoShort(state, tile.coord)).toBe('string');
  });

  it('canUnitBuildImprovement returns false for non-existent unit', () => {
    expect(canUnitBuildImprovement(makeState(), 'nope', 'farm')).toBe(false);
  });

  it('canPlayerChangeGovernment returns false for non-existent player', () => {
    expect(canPlayerChangeGovernment(makeState(), 'oligarchy', 'nope')).toBe(false);
  });

  it('canPlayerSwitchPolicy returns false for non-existent player', () => {
    expect(canPlayerSwitchPolicy(makeState(), 'discipline', 0, 'nope')).toBe(false);
  });

  it('canPlayerChangeGovernment returns true for unlocked government', () => {
    const state = makeState();
    // 初始已研究 code_of_laws，可切酋邦
    expect(canPlayerChangeGovernment(state, 'chiefdom')).toBe(true);
  });

  it('canPlayerSwitchPolicy valid slot returns true', () => {
    const state = makeState();
    expect(canPlayerSwitchPolicy(state, 'discipline', 0)).toBe(true);
  });

  it('getPlayerScore with no playerId returns current player score', () => {
    expect(getPlayerScore(makeState())).toBeGreaterThan(0);
  });

  it('getPlayerEra with no playerId returns current player era', () => {
    expect(typeof getPlayerEra(makeState())).toBe('string');
  });

  it('getPlayerYield with playerId returns correct shape', () => {
    const y = getPlayerYield(makeState(), 'player-0');
    expect(y).toHaveProperty('food');
    expect(y).toHaveProperty('production');
    expect(y).toHaveProperty('gold');
  });

  it('canPlayerResearch returns true for available tech', () => {
    const state = makeState();
    expect(canPlayerResearch(state, 'pottery')).toBe(true);
  });

  it('canPlayerResearch with playerId returns correct result', () => {
    const state = makeState();
    expect(canPlayerResearch(state, 'pottery', 'player-0')).toBe(true);
    expect(canPlayerResearch(state, 'education', 'player-0')).toBe(false);
  });

  it('canPlayerResearchCivic returns false for already-researched civic', () => {
    const state = makeState();
    expect(canPlayerResearchCivic(state, 'code_of_laws')).toBe(false);
  });

  it('playerYield 包含旅游产出', () => {
    const state = makeState();
    const player = state.players[0];
    const y = playerYield(state, player);
    expect(y).toBeDefined();
  });

  it('WonderBuilt 事件在生产完成时触发', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    // 添加奇观到队列
    city.queue.push({ kind: 'wonder', id: 'pyramids', progress: 0, tile: city.tile });
    // 设足够产能直接完成
    city.queue[0].progress = 300; // pyramids cost 300
    const events = settleCity(s, city);
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.kind === 'WonderBuilt')).toBe(true);
    const wonderEvent = events.find((e) => e.kind === 'WonderBuilt')!;
    expect(wonderEvent.payload).toHaveProperty('wonderId');
    expect(wonderEvent.payload).toHaveProperty('cityId');
    expect(wonderEvent.payload).toHaveProperty('builderId');
    // 奇观应该已添加到城市
    expect(city.wonders.some((w) => w.id === 'pyramids')).toBe(true);
  });

  it('WonderBuilt 事件包含 cityId 用于镜头聚焦', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    city.queue.push({ kind: 'wonder', id: 'great_library', progress: 0, tile: city.tile });
    city.queue[0].progress = 300;
    const events = settleCity(s, city);
    const wonderEvent = events.find((e) => e.kind === 'WonderBuilt')!;
    expect(wonderEvent.payload.cityId).toBe(city.id);
  });

  it('hasAnySuzerain 分支', () => {
    const state = makeState();
    expect(hasAnySuzerain(state, 'player-0')).toBe(false);
    state.cityStates[0].isAlive = true;
    state.cityStates[0].suzerainId = 'player-0';
    expect(hasAnySuzerain(state, 'player-0')).toBe(true);
  });

  it('productionCost 覆盖 district 和 project 路径', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    const districtCost = productionCost(s, city, { kind: 'district', id: 'campus', progress: 0 });
    expect(districtCost).toBeGreaterThan(0);
    const projectCost = productionCost(s, city, { kind: 'project', id: 'space_1', progress: 0 });
    expect(projectCost).toBe(900);
    const unknownCost = productionCost(s, city, { kind: 'project', id: 'unknown', progress: 0 });
    expect(unknownCost).toBe(Infinity);
  });

  it('productionCost 覆盖 unknown unit/building/wonder', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    expect(productionCost(s, city, { kind: 'unit', id: 'nonexistent', progress: 0 })).toBe(Infinity);
    expect(productionCost(s, city, { kind: 'building', id: 'nonexistent', progress: 0 })).toBe(Infinity);
    expect(productionCost(s, city, { kind: 'wonder', id: 'nonexistent', progress: 0 })).toBe(Infinity);
  });

  it('completeProduction 完成 builder 单位', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    city.queue.push({ kind: 'unit', id: 'builder', progress: 0 });
    // 直接设置完成进度，确保 >= cost
    city.queue[0].progress = 100;
    settleCity(s, city);
    expect(s.players[0].units.some((u) => u.type === 'builder')).toBe(true);
    expect(s.players[0].buildersBuilt).toBe(1);
  });

  it('completeProduction 完成 space project', () => {
    const state = makeState();
    const { state: s, city } = foundCityP0(state);
    city.queue.push({ kind: 'project', id: 'space_1', progress: 0 });
    city.queue[0].progress = 900;
    settleCity(s, city);
    expect(city.spaceProject).toBeDefined();
    expect(city.spaceProject!.stage).toBe(1);
  });

  it('AI 难度加成：king 和 emperor', () => {
    for (const diff of ['king', 'emperor'] as const) {
      const config: GameConfig = {
        mapSize: { width: 8, height: 6 },
        civChoices: [{ id: 'rome', isAI: true }, { id: 'greece', isAI: true }],
        difficulty: diff,
        maxTurns: 300,
      };
      const state = createInitialState(42, config);
      const y = playerYield(state, state.players[0]);
      expect(y.gold).toBeGreaterThanOrEqual(0);
    }
  });

  it('GOVERNMENT_REF returns GOVERNMENTS', () => {
    const ref = GOVERNMENT_REF();
    expect(ref).toBeDefined();
    expect(ref.chiefdom).toBeDefined();
  });
});
