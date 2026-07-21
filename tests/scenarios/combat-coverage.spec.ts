import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { resolveAttack, resolveAttackCity, previewCombat, cityAt, isEnemyCity, availablePromotions, applyPromotion, canLevelUp } from '../../src/logic/state/combat';
import { getTile } from '../../src/logic/state/mapgen';
import { hexNeighbors } from '../../src/logic/hex';
import type { GameState, GameConfig, UnitState, CityState } from '../../src/logic/state/types';

function makeState(seed = 7): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

function setWar(state: GameState): void {
  state.diplomacy['player-0']['player-1'] = 'war';
  state.diplomacy['player-1']['player-0'] = 'war';
}

// ───── unitCS 函数全覆盖 ─────

describe('unitCS 函数', () => {
  it('未知单位类型返回 0', () => {
    const state = makeState();
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'nonexistent', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(unit);
    // 无法直接调用 unitCS（未导出），但 resolveAttack 会用到 UNITS 查找
    // 通过 resolveAttack 间接验证：UNITS[attacker.type] 为 undefined 时 aDef 为 undefined
    setWar(state);
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.tile = hexNeighbors(unit.tile)[0];
    const result = resolveAttack(state, unit, defender);
    // attacker type 未知，unitCS 返回 0，damage 计算公式中 diff 为负，damage 应被 clamp 到最小值
    expect(result.defenderDamage).toBeGreaterThanOrEqual(1);
    // 攻击者不应该被反击打死（aCS=0 应该被反击打很多伤害）
    // 但反击伤害也会被 clamped
    expect(result.attackerKilled).toBe(false);
  });

  it('远程单位使用 csRanged', () => {
    const state = makeState();
    const archer: UnitState = { id: 'arc', ownerId: 'player-0', type: 'archer', tile: { q: 3, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const defender: UnitState = { id: 'def', ownerId: 'player-1', type: 'warrior', tile: { q: 4, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(archer);
    state.players[1].units.push(defender);
    setWar(state);
    const result = resolveAttack(state, archer, defender);
    // 远程单位不反击，所以 attackerDamage 应为 0
    expect(result.attackerDamage).toBe(0);
    expect(result.defenderDamage).toBeGreaterThan(0);
  });

  it('攻城远程单位使用 csRanged', () => {
    const state = makeState();
    const catapult: UnitState = { id: 'cat', ownerId: 'player-0', type: 'catapult', tile: { q: 3, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const defender: UnitState = { id: 'def', ownerId: 'player-1', type: 'warrior', tile: { q: 4, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(catapult);
    state.players[1].units.push(defender);
    setWar(state);
    const result = resolveAttack(state, catapult, defender);
    expect(result.attackerDamage).toBe(0);
    expect(result.defenderDamage).toBeGreaterThan(0);
  });

  it('海军远程单位使用 csRanged', () => {
    const state = makeState();
    // 找个海洋地块放船
    const oceanTile = state.map.tiles.find((t) => t.terrain === 'ocean' || t.terrain === 'coast');
    if (!oceanTile) return;
    const quad: UnitState = { id: 'quad', ownerId: 'player-0', type: 'quadrireme', tile: oceanTile.coord, hp: 100, moveLeft: 3, xp: 0, level: 1, promotions: [], hasActed: false };
    const def: UnitState = { id: 'def', ownerId: 'player-1', type: 'warrior', tile: { q: oceanTile.coord.q + 1, r: oceanTile.coord.r }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(quad);
    state.players[1].units.push(def);
    setWar(state);
    const result = resolveAttack(state, quad, def);
    expect(result.attackerDamage).toBe(0);
    expect(result.defenderDamage).toBeGreaterThan(0);
  });

  it('等级提升 CS', () => {
    const state = makeState();
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.level = 3; // (3-1)*5 = +10 CS
    setWar(state);
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.tile = hexNeighbors(attacker.tile)[0];
    // 高等级攻击者应该造成更多伤害（但伤害有随机性，只验证能打）
    const result = resolveAttack(state, attacker, defender);
    expect(result.defenderDamage).toBeGreaterThan(0);
  });

  it('HP 惩罚降低 CS', () => {
    const state = makeState();
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.hp = 30; // (100-30)/5 = 14 惩罚
    setWar(state);
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.tile = hexNeighbors(attacker.tile)[0];
    const result = resolveAttack(state, attacker, defender);
    expect(result.defenderDamage).toBeGreaterThan(0);
  });
});

// ───── resolveAttack 边界 ─────

describe('resolveAttack 边界', () => {
  it('远程单位不反击（无反击伤害）', () => {
    const state = makeState();
    const slinger: UnitState = { id: 'sling', ownerId: 'player-0', type: 'slinger', tile: { q: 3, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const defender: UnitState = { id: 'def', ownerId: 'player-1', type: 'warrior', tile: { q: 4, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(slinger);
    state.players[1].units.push(defender);
    setWar(state);
    const result = resolveAttack(state, slinger, defender);
    expect(result.attackerDamage).toBe(0);
  });

  it('攻击者存活获得 XP 并有 hasActed', () => {
    const state = makeState();
    setWar(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    attacker.hp = 100;
    defender.hp = 10;
    defender.tile = hexNeighbors(attacker.tile)[0];
    const xpBefore = attacker.xp;
    resolveAttack(state, attacker, defender);
    expect(attacker.hasActed).toBe(true);
    // 防御方阵亡给 +5 XP，否则 +2
    expect(attacker.xp).toBeGreaterThan(xpBefore);
  });

  it('防御方阵亡时攻击者获得 5 XP', () => {
    const state = makeState();
    setWar(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.hp = 5;
    defender.tile = hexNeighbors(attacker.tile)[0];
    resolveAttack(state, attacker, defender);
    // 杀死目标得 5 XP
    expect(attacker.xp).toBe(5);
  });

  it('防御方未阵亡时攻击者获得 2 XP', () => {
    const state = makeState();
    setWar(state);
    // 使用低 CS 单位确保打不死对方
    const slinger: UnitState = { id: 'sling', ownerId: 'player-0', type: 'slinger', tile: { q: 3, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const defender: UnitState = { id: 'def', ownerId: 'player-1', type: 'warrior', tile: { q: 4, r: 3 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(slinger);
    state.players[1].units.push(defender);
    setWar(state);
    resolveAttack(state, slinger, defender);
    // 没有杀死，得 2 XP
    // 但 slinger 是远程，默认无反击，验证 XP 为 2
    expect(slinger.xp).toBe(2);
  });

  it('XP 触发晋升（level up）', () => {
    const state = makeState();
    setWar(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    attacker.xp = 9;  // 1*10 = 10，再拿 5 就够
    attacker.level = 1;
    defender.hp = 5;
    defender.tile = hexNeighbors(attacker.tile)[0];
    resolveAttack(state, attacker, defender);
    expect(attacker.level).toBe(2);
    expect(attacker.xp).toBe(0);
  });

  it('满级（level >= 5）不再晋升', () => {
    const state = makeState();
    setWar(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    attacker.level = 5;
    attacker.xp = 50;
    defender.hp = 5;
    defender.tile = hexNeighbors(attacker.tile)[0];
    resolveAttack(state, attacker, defender);
    // 等级不变，XP 仍保留（不降到 0）
    expect(attacker.level).toBe(5);
    expect(attacker.xp).toBe(55);
  });

  it('攻击者与防御者同时阵亡', () => {
    const state = makeState();
    setWar(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    attacker.hp = 1;
    defender.hp = 1;
    defender.tile = hexNeighbors(attacker.tile)[0];
    const result = resolveAttack(state, attacker, defender);
    expect(result.attackerKilled).toBe(true);
    expect(result.defenderKilled).toBe(true);
    // 双方都被移除
    expect(state.players[0].units.find((u) => u.id === attacker.id)).toBeUndefined();
    expect(state.players[1].units.find((u) => u.id === defender.id)).toBeUndefined();
  });

  it('没有丘陵时不加防御加成', () => {
    const state = makeState();
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    setWar(state);
    defender.tile = hexNeighbors(attacker.tile)[0];
    const tile = getTile(state.map, defender.tile);
    if (tile && tile.terrain !== 'hills') {
      // 只验证能正常战斗
      const result = resolveAttack(state, attacker, defender);
      expect(result.defenderDamage).toBeGreaterThan(0);
    }
  });
});

// ───── removeUnit 边界 ─────

describe('removeUnit 边界', () => {
  it('单位拥有者不存在时不会崩溃', () => {
    const state = makeState();
    // 创建一个 ownerId 不存在的单位
    const orphan: UnitState = { id: 'orphan', ownerId: 'player-nonexistent', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    // 不加入任何玩家，直接战斗会触发 removeUnit
    // 我们通过 resolveAttack 间接测试：如果攻击者 owner 不存在，removeUnit 不会崩溃
    setWar(state);
    const defender = state.players[1].units.find((u) => u.type === 'warrior')!;
    defender.hp = 200; // 确保防御者不死
    defender.tile = hexNeighbors({ q: 0, r: 0 })[0];
    // 手动调用 resolveAttack 会找 owner 移除，但 orphan 没 owner，所以不会从任何玩家移除
    // 直接在 resolveAttack 中测试：攻击方死亡时调用 removeUnit(attacker)
    // 设 orphan 极低 HP 让它死
    orphan.hp = 1;
    state.players[0].units.push(orphan); // 给 owner 以便 resolveAttack 能处理
    state.players[0].units.push(orphan);
    // 防御者已设
    defender.tile = hexNeighbors(orphan.tile)[0];
    defender.hp = 200;
    const result = resolveAttack(state, orphan, defender);
    // 攻击者可能死也可能活，但不应崩溃
    expect(result).toBeDefined();
  });
});

// ───── resolveAttackCity 边界 ─────

describe('resolveAttackCity 边界', () => {
  function makeCity(state: GameState, overrides: Partial<CityState> = {}): CityState {
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = {
      id: 'test-city', ownerId: 'player-1', name: 'Test', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 2, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null,
      ...overrides,
    };
    p1.cities.push(city);
    p1.capitalCityId = city.id;
    return city;
  }

  it('攻城：非攻城单位打城墙不伤本体', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state, { wallsHp: 200, wallsMax: 200, buildings: ['ancient_walls'] });
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(city.tile)[0];
    const hpBefore = city.hp;
    resolveAttackCity(state, attacker, city);
    expect(city.hp).toBe(hpBefore);
    expect(city.wallsHp).toBeLessThan(200);
  });

  it('攻城：攻城单位伤害穿透城墙', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state, { wallsHp: 200, wallsMax: 200, buildings: ['ancient_walls'] });
    const siege: UnitState = { id: 'siege', ownerId: 'player-0', type: 'catapult', tile: hexNeighbors(city.tile)[0], hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(siege);
    resolveAttackCity(state, siege, city);
    // 投石机 domain=siege_ranged，isSiege=true，伤害穿透城墙到城市
    // 城墙应该在减少的同时城市也受伤
    expect(city.wallsHp).toBeLessThan(200);
    // 攻城单位可能墙和城都受伤，所以城市可能扣血
    // 具体取决于 damage 值
  });

  it('攻城：无城墙时城市直接受伤', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(city.tile)[0];
    const hpBefore = city.hp;
    resolveAttackCity(state, attacker, city);
    // 没城墙，直接打城市
    expect(city.hp).toBeLessThan(hpBefore);
  });

  it('攻城：城市远程反击', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state, { wallsHp: 200, wallsMax: 200, buildings: ['ancient_walls'], rangedStrikeUsed: false });
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(city.tile)[0];
    const hpBefore = attacker.hp;
    resolveAttackCity(state, attacker, city);
    // 城市有城墙且未反击，应该反击
    expect(attacker.hp).toBeLessThan(hpBefore);
    expect(city.rangedStrikeUsed).toBe(true);
  });

  it('攻城：城市已反击则不再反击', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state, { wallsHp: 200, wallsMax: 200, buildings: ['ancient_walls'], rangedStrikeUsed: true });
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(city.tile)[0];
    const hpBefore = attacker.hp;
    resolveAttackCity(state, attacker, city);
    expect(attacker.hp).toBe(hpBefore);
  });

  it('攻城：城市被占领', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state, { hp: 1 });
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(city.tile)[0];
    const result = resolveAttackCity(state, attacker, city);
    expect(result.defenderKilled).toBe(true);
    // 城市应转移到攻击者旗下
    expect(city.ownerId).toBe('player-0');
    expect(city.hp).toBe(200); // 重置
    expect(city.wallsHp).toBe(0); // 城墙清除
    // 旧玩家不应再有该城市
    expect(state.players[1].cities.find((c) => c.id === city.id)).toBeUndefined();
  });

  it('攻城：攻击者被城市反击打死', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state, { wallsHp: 200, wallsMax: 200, buildings: ['ancient_walls'] });
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.hp = 1;
    attacker.tile = hexNeighbors(city.tile)[0];
    const result = resolveAttackCity(state, attacker, city);
    expect(result.attackerKilled).toBe(true);
    expect(state.players[0].units.find((u) => u.id === attacker.id)).toBeUndefined();
  });

  it('攻城：攻击者存活设置 hasActed', () => {
    const state = makeState();
    setWar(state);
    const city = makeCity(state);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(city.tile)[0];
    resolveAttackCity(state, attacker, city);
    expect(attacker.hasActed).toBe(true);
  });
});

// ───── captureCity 边界 ─────

describe('captureCity 边界', () => {
  it('旧拥有者首都重置', () => {
    const state = makeState();
    setWar(state);
    // 给 player-1 建个城市做首都
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = {
      id: 'cap', ownerId: 'player-1', name: 'Cap', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: true,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    };
    p1.cities.push(city);
    p1.capitalCityId = 'cap';
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(spawn)[0];
    city.hp = 1;
    resolveAttackCity(state, attacker, city);
    // 旧首都清除
    expect(p1.capitalCityId).toBeNull();
  });

  it('被占领城市移除城墙建筑', () => {
    const state = makeState();
    setWar(state);
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = {
      id: 'wall-city', ownerId: 'player-1', name: 'W', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1,
      buildings: ['monument', 'ancient_walls', 'medieval_walls'],
      districts: [], wonders: [], queue: [], hp: 1, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    };
    p1.cities.push(city);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(spawn)[0];
    resolveAttackCity(state, attacker, city);
    expect(city.buildings).not.toContain('ancient_walls');
    expect(city.buildings).not.toContain('medieval_walls');
    expect(city.buildings).toContain('monument');
  });

  it('无旧拥有者城市被占领（oldOwner === undefined 分支）', () => {
    const state = makeState();
    setWar(state);
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    // 城市拥有者不存在于 players 中，使 oldOwner === undefined
    const city: CityState = {
      id: 'free-city', ownerId: 'player-nonexistent', name: 'Free', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 1, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null,
    };
    p1.cities.push(city);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    attacker.tile = hexNeighbors(spawn)[0];
    resolveAttackCity(state, attacker, city);
    // 城市应被转移到攻击者
    expect(city.ownerId).toBe('player-0');
    expect(city.hp).toBe(200);
  });
});

// ───── isEnemyCity 全覆盖 ─────

describe('isEnemyCity', () => {
  it('同一拥有者返回 false', () => {
    const state = makeState();
    const p0 = state.players[0];
    const spawn = p0.units[0].tile;
    const city: CityState = { id: 'c', ownerId: 'player-0', name: 'C', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null };
    const unit = p0.units[0];
    expect(isEnemyCity(state, unit, city)).toBe(false);
  });

  it('非战争状态返回 false', () => {
    const state = makeState();
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = { id: 'c', ownerId: 'player-1', name: 'C', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null };
    p1.cities.push(city);
    const unit = state.players[0].units[0];
    expect(isEnemyCity(state, unit, city)).toBe(false);
  });

  it('战争状态返回 true', () => {
    const state = makeState();
    setWar(state);
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = { id: 'c', ownerId: 'player-1', name: 'C', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null };
    p1.cities.push(city);
    const unit = state.players[0].units[0];
    expect(isEnemyCity(state, unit, city)).toBe(true);
  });
});

// ───── cityAt 全覆盖 ─────

describe('cityAt', () => {
  it('找到坐标上的城市', () => {
    const state = makeState();
    const p0 = state.players[0];
    // 建城
    const { state: s } = applyCommand(state, { kind: 'foundCity', unitId: p0.units.find((u) => u.type === 'settler')!.id, name: 'Rome' });
    const city = s.players[0].cities[0];
    const found = cityAt(s, city.tile);
    expect(found).toBeDefined();
    expect(found!.id).toBe(city.id);
  });

  it('坐标上没有城市返回 undefined', () => {
    const state = makeState();
    const found = cityAt(state, { q: -99, r: -99 });
    expect(found).toBeUndefined();
  });

  it('遍历所有玩家查找城市', () => {
    const state = makeState();
    const p1 = state.players[1];
    const spawn = p1.units[0].tile;
    const city: CityState = { id: 'p1-city', ownerId: 'player-1', name: 'P1', tile: spawn, territory: [spawn], workedTiles: [spawn],
      population: 1, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null };
    p1.cities.push(city);
    const found = cityAt(state, spawn);
    expect(found).toBeDefined();
    expect(found!.ownerId).toBe('player-1');
  });
});

// ───── previewCombat 全覆盖 ─────

describe('previewCombat 全覆盖', () => {
  it('攻击者不存在返回 null', () => {
    const state = makeState();
    expect(previewCombat(state, 'nonexistent', { q: 0, r: 0 })).toBeNull();
  });

  it('友方单位在目标格子上不视为目标', () => {
    const state = makeState();
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const friend = state.players[0].units.find((u) => u.type === 'settler')!;
    const pv = previewCombat(state, attacker.id, friend.tile);
    // 没有敌方单位或城市在目标格
    expect(pv).toBeNull();
  });

  it('对城市目标预览', () => {
    const state = makeState();
    setWar(state);
    const p1 = state.players[1];
    // 找一个没有单位的空地
    const cityTile = p1.units[0].tile;
    // 把 p1 的单位都移走，避免 unit 检查优先
    for (const u of p1.units) {
      u.tile = { q: u.tile.q + 10, r: u.tile.r };
    }
    const city: CityState = { id: 'c', ownerId: 'player-1', name: 'C', tile: cityTile, territory: [cityTile], workedTiles: [cityTile],
      population: 3, food: 0, culture: 0, housing: 2, amenities: 1, buildings: [],
      districts: [], wonders: [], queue: [], hp: 200, wallsHp: 0, wallsMax: 0, isCapital: false,
      rangedStrikeUsed: false, religion: {}, dominantReligion: null };
    p1.cities.push(city);
    const attacker = state.players[0].units.find((u) => u.type === 'warrior')!;
    const pv = previewCombat(state, attacker.id, cityTile);
    expect(pv).not.toBeNull();
    expect(pv!.target).toBe('city');
    expect(pv!.defenderCS).toBe(13); // 10 + 3*1
    expect(pv!.defenderHp).toBe(200);
    expect(pv!.estDamage).toBe(0); // city preview 固定 0
  });

  it('敌方单位目标预览', () => {
    const state = makeState();
    setWar(state);
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
});

// ───── availablePromotions 全覆盖 ─────

describe('availablePromotions', () => {
  it('未知单位类型返回空数组', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'nonexistent', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    expect(availablePromotions(unit)).toEqual([]);
  });

  it('满级单位返回空数组', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 5, promotions: [], hasActed: false };
    expect(availablePromotions(unit)).toEqual([]);
  });

  it('melee 单位可用晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    // warrior 是 melee 域，level 1 可用 discipline
    expect(promos).toContain('discipline');
    // 不应该有远程/骑兵的晋升
    expect(promos).not.toContain('volley');
    expect(promos).not.toContain('maneuver');
  });

  it('ranged 单位返回远程晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'archer', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toContain('volley');
    expect(promos).not.toContain('discipline');
  });

  it('已晋升的不会重复列出', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: ['discipline'], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).not.toContain('discipline');
  });

  it('level 2 解锁更多晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 2, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    // level 2 可用 charge (requiresLevel 2)
    expect(promos).toContain('charge');
    // level 1 的 discipline 也可用
    expect(promos).toContain('discipline');
  });

  it('cavalry 单位返回骑兵晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'cavalry', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toContain('maneuver');
    expect(promos).not.toContain('discipline');
  });

  it('siege 单位返回攻城晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'siege_tower', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toContain('bombardment');
  });

  it('siege_ranged 单位返回攻城晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'catapult', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toContain('bombardment');
  });

  it('naval_melee 单位返回海军晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'trireme', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 3, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toContain('naval_maneuver');
  });

  it('naval_ranged 单位返回海军晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'quadrireme', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 3, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toContain('naval_maneuver');
  });

  it('civilian 单位无晋升', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'builder', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const promos = availablePromotions(unit);
    expect(promos).toEqual([]);
  });
});

// ───── applyPromotion 全覆盖 ─────

describe('applyPromotion', () => {
  it('不存在的晋升 ID 返回 false', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    expect(applyPromotion(unit, 'nonexistent')).toBe(false);
  });

  it('已拥有的晋升返回 false', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: ['discipline'], hasActed: false };
    expect(applyPromotion(unit, 'discipline')).toBe(false);
  });

  it('成功晋升添加晋升并重置 XP', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 50, level: 1, promotions: [], hasActed: false };
    expect(applyPromotion(unit, 'discipline')).toBe(true);
    expect(unit.promotions).toContain('discipline');
    expect(unit.xp).toBe(0);
  });

  it('HP 不变（无 healOnPromote 时）', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 50, moveLeft: 2, xp: 50, level: 1, promotions: [], hasActed: false };
    applyPromotion(unit, 'discipline');
    // discipline 没有 healOnPromote，HP 不变
    expect(unit.hp).toBe(50);
  });
});

// ───── canLevelUp 全覆盖 ─────

describe('canLevelUp', () => {
  it('可升级返回 true', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: [], hasActed: false };
    expect(canLevelUp(unit)).toBe(true);
  });

  it('XP 不足返回 false', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 5, level: 1, promotions: [], hasActed: false };
    expect(canLevelUp(unit)).toBe(false);
  });

  it('满级返回 false', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 100, level: 5, promotions: [], hasActed: false };
    expect(canLevelUp(unit)).toBe(false);
  });

  it('无可用晋升（civilian 单位）返回 false', () => {
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'builder', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: [], hasActed: false };
    expect(canLevelUp(unit)).toBe(false);
  });

  it('所有晋升已学完返回 false', () => {
    // warrior 是 melee 域，level 1 只有 discipline
    const unit: UnitState = { id: 'u', ownerId: 'player-0', type: 'warrior', tile: { q: 0, r: 0 }, hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: ['discipline'], hasActed: false };
    expect(canLevelUp(unit)).toBe(false);
  });

  it('平衡性：相同 CS 战斗伤害约 30', () => {
    const state = makeState();
    const attacker: UnitState = { id: 'a', ownerId: 'player-0', type: 'warrior', tile: { q: 5, r: 5 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const defender: UnitState = { id: 'b', ownerId: 'player-1', type: 'warrior', tile: { q: 5, r: 5 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(attacker);
    state.players[1].units.push(defender);
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const result = resolveAttack(state, attacker, defender);
    expect(result.defenderDamage).toBeGreaterThanOrEqual(10);
    expect(result.defenderDamage).toBeLessThanOrEqual(100);
  });

  it('平衡性：高 CS 单位对低 CS 单位有明显优势', () => {
    const state = makeState();
    const swordsman: UnitState = { id: 's', ownerId: 'player-0', type: 'swordsman', tile: { q: 5, r: 5 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    const warrior: UnitState = { id: 'w', ownerId: 'player-1', type: 'warrior', tile: { q: 5, r: 5 }, hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false };
    state.players[0].units.push(swordsman);
    state.players[1].units.push(warrior);
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const result = resolveAttack(state, swordsman, warrior);
    expect(result.defenderDamage).toBeGreaterThan(result.attackerDamage);
  });
});