// 区域放置与相邻加成（签名机制 #1）
import type { HexCoord } from '../../types';
import type { GameState, CityState } from './types';
import type { Tile } from './mapgen';
import { ADJACENCY_RULES, DISTRICTS, type DistrictType } from '../../gamedata';
import type { Yield } from '../../gamedata/types';
import { addYield, ZERO_YIELD } from '../../gamedata/types';
import { hexEquals, hexNeighbors, inBounds } from '../hex';
import { getTile } from './mapgen';

/** 该格上是否有任意区域 */
export function tileHasDistrict(state: GameState, coord: HexCoord): boolean {
  for (const p of state.players) {
    for (const c of p.cities) {
      if (c.districts.some((d) => hexEquals(d.tile, coord))) return true;
    }
  }
  return false;
}

/** 该格上是否有奇观 */
export function tileHasWonder(state: GameState, coord: HexCoord): boolean {
  for (const p of state.players) {
    for (const c of p.cities) {
      if (c.wonders.some((w) => hexEquals(w.tile, coord))) return true;
    }
  }
  return false;
}

function matchesSource(state: GameState, rule: (typeof ADJACENCY_RULES)[number], tile: Tile, coord: HexCoord): boolean {
  switch (rule.sourceType) {
    case 'terrain':
      return tile.terrain === rule.source;
    case 'feature':
      return tile.feature === rule.source;
    case 'resource':
      if (!tile.resource) return false;
      if (rule.source === 'strategic') return tile.resource.category === 'strategic';
      if (rule.source === 'ocean_resource') return tile.resource.category === 'bonus'; // 简化
      return tile.resource.id === rule.source;
    case 'improvement':
      return tile.improvement === rule.source;
    case 'district':
      return tileHasDistrict(state, coord);
    case 'wonder':
      return tileHasWonder(state, coord);
    case 'building':
      return false; // 水渠等建筑加成 MVP 简化忽略
    default:
      return false;
  }
}

/** 计算区域在 tile 的相邻加成（含河流特判） */
export function districtAdjacencyBonus(state: GameState, districtType: DistrictType, tile: HexCoord): Yield {
  const rules = ADJACENCY_RULES.filter((r) => r.district === districtType);
  const acc: Partial<Yield> = {};
  const bounds = state.map.bounds;

  for (const n of hexNeighbors(tile)) {
    if (!inBounds(n, bounds)) continue;
    const nt = getTile(state.map, n);
    if (!nt) continue;
    for (const r of rules) {
      if (matchesSource(state, r, nt, n)) {
        acc[r.yieldType] = (acc[r.yieldType] ?? 0) + r.bonus;
      }
    }
    // 河流特判：商业中心邻河流
    if (districtType === 'commercial' && nt.isRiver) {
      acc.gold = (acc.gold ?? 0) + 2;
    }
  }
  // 自身临河也算（商业中心/圣地）
  const self = getTile(state.map, tile);
  if (self?.isRiver && districtType === 'commercial') {
    acc.gold = (acc.gold ?? 0) + 2;
  }

  let result = ZERO_YIELD;
  for (const [k, v] of Object.entries(acc)) {
    const clamped = Math.max(0, v as number);
    result = addYield(result, { [k]: clamped } as Partial<Yield>);
  }
  return result;
}

/** 区域放置合法性 */
export function canPlaceDistrict(state: GameState, city: CityState, districtType: DistrictType, tile: HexCoord): boolean {
  const def = DISTRICTS[districtType];
  if (!def) return false;
  const owner = state.players.find((p) => p.id === city.ownerId);
  if (!owner) return false;
  // 解锁科技（theater 由 civic drama_poetry 解锁，特判）
  if (districtType === 'theater') {
    if (!owner.researchedCivics.includes('drama_poetry')) return false;
  } else if (!owner.researchedTechs.includes(def.unlockTech)) {
    return false;
  }
  // 地块在领土内
  if (!city.territory.some((t) => hexEquals(t, tile))) return false;
  // 不能与已有区域/城中心重叠
  if (hexEquals(tile, city.tile)) return false;
  if (city.districts.some((d) => hexEquals(d.tile, tile))) return false;
  // 人口门槛：区域数上限 = floor(pop/3)+1
  const maxDistricts = Math.floor(city.population / 3) + 1;
  if (city.districts.length >= maxDistricts) return false;
  return true;
}
