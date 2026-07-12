// 战斗结算（确定性，gamedata §7）
import type { GameState, UnitState, CityState } from './types';
import { UNITS } from '../../gamedata';
import { createRng, hash } from '../rng';
import { hexEquals } from '../hex';

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
  const rng = createRng(hash(state.seed, state.turn, attacker.id, defender.id));

  const dmgToDefender = damage(aCS, dCS, rng);
  defender.hp -= dmgToDefender;

  let dmgToAttacker = 0;
  const isRanged = aDef && (aDef.domain === 'ranged' || aDef.domain === 'siege_ranged' || aDef.domain === 'naval_ranged');
  if (!isRanged) {
    // 近战反击
    const counter = damage(dCS, aCS, rng) * 0.5;
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
    if (attacker.xp >= attacker.level * 10 && attacker.level < 4) {
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
