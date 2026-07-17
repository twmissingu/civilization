// 战斗结算（确定性，gamedata §7）
import type { GameState, UnitState, CityState } from './types';
import { UNITS, PROMOTIONS } from '../../gamedata';
import { createRng, hash } from '../rng';
import { hexEquals } from '../hex';
import { findUnit, unitAt } from './query';
import { getTile } from './mapgen';

function unitCS(unit: UnitState): number {
  const def = UNITS[unit.type];
  if (!def) return 0;
  const base = def.domain === 'ranged' || def.domain === 'siege_ranged' || def.domain === 'naval_ranged' ? def.csRanged : def.csMelee;
  let cs = base;
  cs += (unit.level - 1) * 5; // 晋升
  if (unit.hp < 100) cs -= Math.floor((100 - unit.hp) / 5);
  return Math.max(1, cs);
}

function damage(attackerCS: number, defenderCS: number, rng: ReturnType<typeof createRng>): number {
  const diff = attackerCS - defenderCS;
  const raw = 30 * Math.exp(diff / 25);
  const clamped = Math.max(10, Math.min(100, Math.round(raw)));
  const jitter = rng.int(11) - 5; // ±5
  return Math.max(1, clamped + jitter);
}

export interface CombatResult {
  attackerDamage: number;
  defenderDamage: number;
  defenderKilled: boolean;
  attackerKilled: boolean;
}

/** 单位 vs 单位 */
export function resolveAttack(state: GameState, attacker: UnitState, defender: UnitState): CombatResult {
  const aDef = UNITS[attacker.type];
  const dDef = UNITS[defender.type];
  const aCS = unitCS(attacker);
  const dCS = unitCS(defender);
  const dTile = getTile(state.map, defender.tile);
  const hillsBonus = dTile && dTile.terrain === 'hills' ? 4 : 0;
  const dCSAdjusted = dCS + hillsBonus;
  const rng = createRng(hash(state.seed, state.turn, attacker.id, defender.id));

  const dmgToDefender = damage(aCS, dCSAdjusted, rng);
  defender.hp -= dmgToDefender;

  let dmgToAttacker = 0;
  const isRanged = aDef && (aDef.domain === 'ranged' || aDef.domain === 'siege_ranged' || aDef.domain === 'naval_ranged');
  if (!isRanged) {
    // 近战反击
    const counter = damage(dCSAdjusted, aCS, rng) * 0.5;
    dmgToAttacker = Math.floor(counter);
    attacker.hp -= dmgToAttacker;
  }

  const defenderKilled = defender.hp <= 0;
  const attackerKilled = attacker.hp <= 0;

  if (defenderKilled) {
    defender.hp = 0;
    removeUnit(state, defender);
    // 近战攻击者移入防御方格
    if (!isRanged && !attackerKilled) {
      attacker.tile = defender.tile;
    }
  }
  if (attackerKilled) {
    attacker.hp = 0;
    removeUnit(state, attacker);
  } else {
    attacker.xp += defenderKilled ? 5 : 2;
    attacker.hasActed = true;
    // 晋升
    if (attacker.xp >= attacker.level * 10 && attacker.level < 5) {
      attacker.level += 1;
      attacker.xp = 0;
    }
  }
  void dDef;
  return { attackerDamage: dmgToAttacker, defenderDamage: dmgToDefender, defenderKilled, attackerKilled };
}

function removeUnit(state: GameState, unit: UnitState): void {
  const owner = state.players.find((p) => p.id === unit.ownerId);
  if (owner) owner.units = owner.units.filter((u) => u.id !== unit.id);
}

/** 攻城：单位攻击城市 */
export function resolveAttackCity(state: GameState, attacker: UnitState, city: CityState): CombatResult {
  const aDef = UNITS[attacker.type];
  const cityCS = Math.max(10, 10 + city.population * 1);
  const rng = createRng(hash(state.seed, state.turn, attacker.id, city.id));

  // 城墙：若 wallsHp > 0，伤害先打城墙
  let dmgToCity = damage(unitCS(attacker), cityCS, rng);
  const isSiege = aDef && (aDef.domain === 'siege' || aDef.domain === 'siege_ranged');
  let dmgToWalls = 0;
  if (city.wallsHp > 0) {
    dmgToWalls = isSiege ? dmgToCity : Math.floor(dmgToCity / 2);
    const w = Math.min(city.wallsHp, dmgToWalls);
    city.wallsHp -= w;
    if (!isSiege) dmgToCity = 0; // 非攻城单位打不穿城墙到本体
    else dmgToCity = dmgToCity - w;
  }
  city.hp -= dmgToCity;

  // 城市远程反击（若有城墙且未用）
  let dmgToAttacker = 0;
  if (city.wallsMax > 0 && !city.rangedStrikeUsed) {
    dmgToAttacker = damage(cityCS, unitCS(attacker), rng);
    attacker.hp -= dmgToAttacker;
    city.rangedStrikeUsed = true;
  }

  const cityCaptured = city.hp <= 0;
  const attackerKilled = attacker.hp <= 0;
  if (attackerKilled) {
    attacker.hp = 0;
    removeUnit(state, attacker);
  } else {
    attacker.hasActed = true;
  }

  if (cityCaptured) {
    city.hp = 0;
    captureCity(state, attacker, city);
  }
  void dmgToWalls;
  return { attackerDamage: dmgToAttacker, defenderDamage: dmgToCity, defenderKilled: cityCaptured, attackerKilled };
}

function captureCity(state: GameState, attacker: UnitState, city: CityState): void {
  const oldOwner = state.players.find((p) => p.id === city.ownerId);
  const newOwner = state.players.find((p) => p.id === attacker.ownerId);
  if (!newOwner) return;
  if (oldOwner) {
    oldOwner.cities = oldOwner.cities.filter((c) => c.id !== city.id);
    if (oldOwner.capitalCityId === city.id) oldOwner.capitalCityId = null;
  }
  city.ownerId = newOwner.id;
  city.hp = 200;
  city.wallsHp = 0;
  city.wallsMax = 0;
  city.buildings = city.buildings.filter((b) => b !== 'ancient_walls' && b !== 'medieval_walls');
  if (newOwner.capitalCityId === null && oldOwner === undefined) {
    // 不自动成首都
  }
  newOwner.cities.push(city);
}

export function isEnemyCity(state: GameState, unit: UnitState, city: CityState): boolean {
  if (city.ownerId === unit.ownerId) return false;
  return state.diplomacy[unit.ownerId]?.[city.ownerId] === 'war';
}

export function cityAt(state: GameState, coord: { q: number; r: number }): CityState | undefined {
  for (const p of state.players) for (const c of p.cities) if (hexEquals(c.tile, coord)) return c;
  return undefined;
}

/** 战斗预览（不实际结算）：返回双方 CS 与预计伤害 */
export interface CombatPreview {
  attackerCS: number;
  defenderCS: number;
  estDamage: number;
  target: 'unit' | 'city';
  defenderHp: number;
}
export function previewCombat(state: GameState, attackerId: string, targetTile: { q: number; r: number }): CombatPreview | null {
  const attacker = findUnit(state, attackerId);
  if (!attacker) return null;
  const aCS = unitCS(attacker);
  const defUnit = unitAt(state, targetTile);
  if (defUnit && defUnit.ownerId !== attacker.ownerId) {
    const dCS = unitCS(defUnit);
    const diff = aCS - dCS;
    const baseDamage = Math.max(10, Math.min(100, Math.round(30 * Math.exp(diff / 25))));
    return { attackerCS: aCS, defenderCS: dCS, estDamage: baseDamage, target: 'unit', defenderHp: defUnit.hp };
  }
  const defCity = cityAt(state, targetTile);
  if (defCity && defCity.ownerId !== attacker.ownerId) {
    const cCS = Math.max(10, 10 + defCity.population);
    return { attackerCS: aCS, defenderCS: cCS, estDamage: 0, target: 'city', defenderHp: defCity.hp };
  }
  return null;
}

/** 获取单位可选的晋升列表 */
export function availablePromotions(unit: UnitState): string[] {
  const def = UNITS[unit.type];
  if (!def) return [];
  const domain = def.domain;
  if (unit.level >= 5) return []; // 满级
  const taken = new Set(unit.promotions);
  return Object.values(PROMOTIONS)
    .filter((p) => p.domains.includes(domain) && (p.requiresLevel ?? 1) <= unit.level && !taken.has(p.id))
    .map((p) => p.id);
}

/** 应用晋升效果 */
export function applyPromotion(unit: UnitState, promotionId: string): boolean {
  const def = PROMOTIONS[promotionId];
  if (!def) return false;
  if (unit.promotions.includes(promotionId)) return false;
  unit.promotions.push(promotionId);
  unit.xp = 0;
  // 立即生效：补给
  if (def.healOnPromote) {
    unit.hp = Math.min(100, unit.hp + def.healOnPromote);
  }
  return true;
}

/** 检查单位是否可晋升（有可用晋升且未选择） */
export function canLevelUp(unit: UnitState): boolean {
  return unit.xp >= unit.level * 10 && unit.level < 5 && availablePromotions(unit).length > 0;
}
