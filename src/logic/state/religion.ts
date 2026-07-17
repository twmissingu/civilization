// 宗教逻辑：万神殿、创立宗教、传教、压力、胜利
import type { GameState, PlayerState, CityState } from './types';
import { findCity, findUnit } from './query';
import {
  PANTHEONS, RELIGION_FOUND_FAITH_COST, PANTHEON_FAITH_THRESHOLD,
  MISSIONARY_FAITH_COST, APOSTLE_FAITH_COST, MISSIONARY_SPREAD_PRESSURE,
  APOSTLE_SPREAD_PRESSURE, PASSIVE_PRESSURE_PER_TURN, CONVERSION_THRESHOLD,
  RELIGION_NAMES,
} from '../../gamedata/religion';

let religionIdCounter = 0;

export function resetReligionIdCounter(): void {
  religionIdCounter = 0;
}

/** 生成唯一宗教 id */
function nextReligionId(): string {
  religionIdCounter++;
  return `religion-${religionIdCounter}`;
}

/** 获取下一个可用的宗教名称 */
function nextReligionName(state: GameState): string {
  const used = new Set<string>();
  for (const p of state.players) {
    if (p.religionName) used.add(p.religionName);
  }
  for (const name of RELIGION_NAMES) {
    if (!used.has(name)) return name;
  }
  return `宗教 ${religionIdCounter}`;
}

// ===== 万神殿 =====

/** 检查玩家能否选择万神殿 */
export function canFoundPantheon(player: PlayerState, pantheonId: string): boolean {
  if (player.pantheon) return false;
  if (player.faith < PANTHEON_FAITH_THRESHOLD) return false;
  return PANTHEONS[pantheonId] !== undefined;
}

/** 选择万神殿 */
export function foundPantheon(state: GameState, player: PlayerState, pantheonId: string): void {
  const def = PANTHEONS[pantheonId];
  if (!def) return;
  player.pantheon = pantheonId;
  player.faith -= PANTHEON_FAITH_THRESHOLD;
  applyPantheonEffect(state, player, def);
}

function applyPantheonEffect(_state: GameState, _player: PlayerState, _def: { effectType: string; effectValue?: number }): void {
  // 效果在 yield.ts 和 city.ts 中处理
  // 此处仅记录 pantheon 选择；具体效果在 yield/城邦系统中解析
}

// ===== 创立宗教 =====

/** 检查玩家能否创立宗教 */
export function canFoundReligion(_state: GameState, player: PlayerState): boolean {
  if (player.religionId) return false;
  if (player.faith < RELIGION_FOUND_FAITH_COST) return false;
  // 需要至少一座有圣地+神庙的城市
  const hasHolySite = player.cities.some((c) =>
    c.districts.some((d) => d.type === 'holy') && c.buildings.includes('temple')
  );
  if (!hasHolySite) return false;
  return true;
}

/** 创立宗教 */
export function foundReligion(state: GameState, player: PlayerState): void {
  const name = nextReligionName(state);
  const id = nextReligionId();
  player.religionId = id;
  player.religionName = name;
  player.faith -= RELIGION_FOUND_FAITH_COST;
  // 找到圣城（第一个有圣地+神庙的城市）
  const holyCity = player.cities.find((c) =>
    c.districts.some((d) => d.type === 'holy') && c.buildings.includes('temple')
  );
  if (holyCity) {
    player.holyCityId = holyCity.id;
    // 圣城自动获得该宗教
    applyPressureToCity(holyCity, id, 30);
    recomputeCityReligion(holyCity);
  }
}

// ===== 购买宗教单位 =====

/** 检查玩家能否在城市购买传教士 */
export function canPurchaseMissionary(state: GameState, player: PlayerState, cityId: string): boolean {
  if (!player.religionId) return false;
  if (player.faith < MISSIONARY_FAITH_COST) return false;
  const city = findCity(state, cityId);
  if (!city || city.ownerId !== player.id) return false;
  // 需要圣地
  if (!city.districts.some((d) => d.type === 'holy')) return false;
  return true;
}

/** 购买传教士 */
export function purchaseMissionary(state: GameState, player: PlayerState, cityId: string): void {
  player.faith -= MISSIONARY_FAITH_COST;
  const city = findCity(state, cityId)!;
  const unit = {
    id: `missionary-${player.id}-${player.units.length}`,
    ownerId: player.id,
    type: 'missionary',
    tile: city.tile,
    hp: 100,
    moveLeft: 2,
    xp: 0,
    level: 1,
    promotions: [] as string[],
    charges: 3,
    tradeRouteId: undefined as string | undefined,
    hasActed: false,
  };
  player.units.push(unit);
}

/** 检查玩家能否在城市购买使徒 */
export function canPurchaseApostle(state: GameState, player: PlayerState, cityId: string): boolean {
  if (!player.religionId) return false;
  if (player.faith < APOSTLE_FAITH_COST) return false;
  const city = findCity(state, cityId);
  if (!city || city.ownerId !== player.id) return false;
  if (!city.districts.some((d) => d.type === 'holy')) return false;
  if (!city.buildings.includes('temple')) return false;
  return true;
}

/** 购买使徒 */
export function purchaseApostle(state: GameState, player: PlayerState, cityId: string): void {
  player.faith -= APOSTLE_FAITH_COST;
  const city = findCity(state, cityId)!;
  const unit = {
    id: `apostle-${player.id}-${player.units.length}`,
    ownerId: player.id,
    type: 'apostle',
    tile: city.tile,
    hp: 100,
    moveLeft: 2,
    xp: 0,
    level: 1,
    promotions: [] as string[],
    charges: 4,
    tradeRouteId: undefined as string | undefined,
    hasActed: false,
  };
  player.units.push(unit);
}

// ===== 宗教传播 =====

/** 向城市施加宗教压力 */
function applyPressureToCity(city: CityState, religionId: string, pressure: number): void {
  if (!city.religion) city.religion = {};
  city.religion[religionId] = (city.religion[religionId] ?? 0) + pressure;
}

/** 重新计算城市的主流宗教 */
export function recomputeCityReligion(city: CityState): void {
  if (!city.religion || Object.keys(city.religion).length === 0) {
    city.dominantReligion = null;
    return;
  }
  let best: string | null = null;
  let bestPressure = 0;
  for (const [rid, pressure] of Object.entries(city.religion)) {
    if (pressure > bestPressure) {
      bestPressure = pressure;
      best = rid;
    }
  }
  city.dominantReligion = best;
}

/** 检查城市是否已转化（某宗教压力超过阈值） */
function checkConversion(city: CityState): void {
  if (!city.religion) return;
  for (const [rid, pressure] of Object.entries(city.religion)) {
    if (pressure >= CONVERSION_THRESHOLD) {
      city.dominantReligion = rid;
      return;
    }
  }
}

/** 传教士/使徒传播宗教 */
export function spreadReligion(state: GameState, actorId: string, targetCityId: string): void {
  const actor = findUnit(state, actorId);
  if (!actor) return;
  const owner = state.players.find((p) => p.id === actor.ownerId);
  if (!owner || !owner.religionId) return;

  const targetCity = findCity(state, targetCityId);
  if (!targetCity) return;

  const pressure = actor.type === 'apostle' ? APOSTLE_SPREAD_PRESSURE : MISSIONARY_SPREAD_PRESSURE;
  applyPressureToCity(targetCity, owner.religionId, pressure);
  recomputeCityReligion(targetCity);
  checkConversion(targetCity);

  // 消耗充能
  if (actor.charges !== undefined) {
    actor.charges -= 1;
  }
}

// ===== 被动压力 =====

/** 计算所有城市的被动宗教压力（每回合） */
export function computePassiveReligiousPressure(state: GameState): void {
  for (const player of state.players) {
    if (!player.religionId || !player.holyCityId) continue;
    const holyCity = findCity(state, player.holyCityId);
    if (!holyCity) continue;

    // 圣城保持压力
    applyPressureToCity(holyCity, player.religionId, PASSIVE_PRESSURE_PER_TURN);
    recomputeCityReligion(holyCity);

    // 对玩家所有城市施加压力
    for (const city of player.cities) {
      if (city.id === player.holyCityId) continue;
      applyPressureToCity(city, player.religionId, PASSIVE_PRESSURE_PER_TURN);
      recomputeCityReligion(city);
      checkConversion(city);
    }
  }
}

// ===== 宗教胜利 =====

/** 检查宗教胜利条件 */
export function checkReligiousVictory(state: GameState): { winnerId: string; type: string } | null {
  for (const player of state.players) {
    if (!player.religionId) continue;
    const others = state.players.filter((p) => p.id !== player.id && p.cities.length > 0);
    if (others.length === 0) continue;
    const allConverted = others.every((other) =>
      other.cities.every((c) => c.dominantReligion === player.religionId)
    );
    if (allConverted) {
      return { winnerId: player.id, type: 'religion' };
    }
  }
  return null;
}