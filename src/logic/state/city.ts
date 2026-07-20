// 城市规则：建城/增长/扩张/买地/市民/生产
import type { HexCoord } from '../../types';
import type { GameState, CityState, UnitState, ProductionItem, GameEvent } from './types';
import { BUILDINGS, UNITS, WONDERS, scaledCost } from '../../gamedata';
import type { DistrictType } from '../../gamedata';
import { cityYield } from './yield';
import { hexDistance, hexEquals, hexInRange, inBounds } from '../hex';
import { revealArea } from './unitMove';

export function cityHousing(city: CityState): number {
  let h = 2;
  for (const bId of city.buildings) {
    const b = BUILDINGS[bId];
    if (b) h += b.housing;
  }
  h += city.districts.length * 0.5;
  return Math.floor(h);
}

export function foodThreshold(pop: number): number {
  return 15 + 8 * (pop - 1);
}

/** 找扩张目标格：城中心 3 格内未归属、按距离+优先级 */
function pickExpansionTile(state: GameState, city: CityState): HexCoord | null {
  const candidates = hexInRange(city.tile, 3).filter((t) => {
    if (!inBounds(t, state.map.bounds)) return false;
    if (city.territory.some((x) => hexEquals(x, t))) return false;
    // 不属于其他城市
    for (const p of state.players) for (const c of p.cities) if (c.territory.some((x) => hexEquals(x, t))) return false;
    return true;
  });
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    const da = hexDistance(city.tile, a);
    const db = hexDistance(city.tile, b);
    if (da !== db) return da - db;
    return a.q - b.q || a.r - b.r; // 确定性 tie-break
  });
  return candidates[0];
}

export function foundCity(state: GameState, settler: UnitState, name: string): string {
  const player = state.players.find((p) => p.id === settler.ownerId)!;
  const cityId = `city-${state.cityIdCounter++}`;
  const tile = settler.tile;
  const isCapital = player.capitalCityId === null;
  const city: CityState = {
    id: cityId,
    ownerId: player.id,
    name,
    tile,
    territory: [tile],
    workedTiles: [tile],
    population: 1,
    food: 0,
    culture: 0,
    housing: 2,
    amenities: 1,
    buildings: ['palace', 'monument'],
    districts: [],
    wonders: [],
    queue: [],
    hp: 200,
    wallsHp: 0,
    wallsMax: 0,
    isCapital,
    rangedStrikeUsed: false,
    religion: {},
    dominantReligion: null,
  };
  if (isCapital) player.capitalCityId = cityId;
  player.cities.push(city);
  player.units = player.units.filter((u) => u.id !== settler.id);
  // 建城后 reveal 周围 3 格
  revealArea(state, tile, 3);
  return cityId;
}

/** 买地价格 */
export function buyTilePrice(city: CityState, tile: HexCoord): number {
  const dist = hexDistance(city.tile, tile);
  const bought = city.territory.length - 1;
  return Math.round(50 * (1 + dist * 0.5) * (1 + bought * 0.1));
}

/** 每回合城市结算：食物/人口/文化扩张/生产，返回本回合产生的事件 */
export function settleCity(state: GameState, city: CityState): GameEvent[] {
  const events: GameEvent[] = [];
  const y = cityYield(state, city);
  // 食物
  const consumption = city.population * 2;
  const netFood = y.food - consumption;
  const housing = cityHousing(city);
  let growthFactor = 1;
  if (city.population >= housing) growthFactor = 0.5;
  if (city.population >= housing + 2) growthFactor = 0.25;
  if (city.population >= housing + 4) growthFactor = 0;
  city.food += Math.round(netFood * growthFactor);
  const threshold = foodThreshold(city.population);
  if (city.food >= threshold) {
    city.food -= threshold;
    city.population += 1;
  } else if (city.food < 0 && city.population > 1) {
    city.population -= 1;
    city.food = 0;
  }
  // 文化扩张
  city.culture += y.culture;
  const expandThreshold = 5 * city.territory.length;
  if (city.culture >= expandThreshold) {
    city.culture -= expandThreshold;
    const t = pickExpansionTile(state, city);
    if (t) city.territory.push(t);
  }
  // 生产
  if (city.queue.length > 0) {
    city.queue[0].progress += y.production;
    const item = city.queue[0];
    const cost = productionCost(state, city, item);
    if (item.progress >= cost) {
      item.progress -= cost;
      events.push(...completeProduction(state, city, item));
      city.queue.shift();
    }
  }
  // 住房重算
  city.housing = cityHousing(city);
  return events;
}

export function productionCost(state: GameState, city: CityState, item: ProductionItem): number {
  const owner = state.players.find((p) => p.id === city.ownerId)!;
  if (item.kind === 'unit') {
    const u = UNITS[item.id];
    return u ? u.cost : Infinity;
  }
  if (item.kind === 'building') {
    const b = BUILDINGS[item.id];
    return b ? b.cost : Infinity;
  }
  if (item.kind === 'district') {
    return scaledCost(60, owner.districtsBuilt, 0.25) * (1 + 0.1 * owner.researchedTechs.length);
  }
  if (item.kind === 'wonder') {
    const w = WONDERS[item.id];
    return w ? w.cost : Infinity;
  }
  if (item.kind === 'project') {
    if (item.id === 'space_1') return 900;
    if (item.id === 'space_2') return 1200;
    if (item.id === 'space_3') return 1500;
  }
  return Infinity;
}

function completeProduction(state: GameState, city: CityState, item: ProductionItem): GameEvent[] {
  const events: GameEvent[] = [];
  const owner = state.players.find((p) => p.id === city.ownerId)!;
  if (item.kind === 'unit') {
    const u = UNITS[item.id];
    if (!u) return events;
    const unit: UnitState = {
      id: `unit-${state.unitIdCounter++}`,
      ownerId: owner.id,
      type: u.id,
      tile: city.tile,
      hp: u.hp,
      moveLeft: u.move,
      xp: 0,
      level: 1,
      promotions: [],
      charges: u.id === 'builder' ? 3 : undefined,
      hasActed: false,
    };
    owner.units.push(unit);
    if (u.id === 'builder') owner.buildersBuilt++;
    if (u.id === 'settler') owner.settlersBuilt++;
  } else if (item.kind === 'building') {
    if (!city.buildings.includes(item.id)) city.buildings.push(item.id);
  } else if (item.kind === 'district') {
    if (item.tile) city.districts.push({ type: item.id as DistrictType, tile: item.tile });
    owner.districtsBuilt += 1;
  } else if (item.kind === 'wonder') {
    city.wonders.push({ id: item.id, tile: item.tile ?? city.tile });
    events.push({ kind: 'WonderBuilt', turn: state.turn, payload: { builderId: owner.id, wonderId: item.id } });
  } else if (item.kind === 'project') {
    // space project 推进
    if (!city.spaceProject) city.spaceProject = { stage: 1, progress: 0 };
  }
  return events;
}
