// 地图生成（Simplex 噪声 + seed 确定性）
// 参数与分桶阈值见 docs/mapgen.md

import { createNoise2D } from 'simplex-noise';
import type { HexCoord } from '../../types';
import type { Rng } from '../rng';
import { allTiles, type MapBounds } from '../hex';

export type { MapBounds };

export type TerrainType =
  | 'grassland'
  | 'plains'
  | 'desert'
  | 'tundra'
  | 'snow'
  | 'hills'
  | 'mountain'
  | 'coast'
  | 'ocean';

export type FeatureType =
  | 'forest'
  | 'rainforest'
  | 'marsh'
  | 'geothermal'
  | 'oasis'
  | 'floodplains'
  | null;

export type ResourceCategory = 'bonus' | 'luxury' | 'strategic' | null;

export interface ResourceDef {
  id: string;
  category: ResourceCategory;
}

export interface Tile {
  coord: HexCoord;
  terrain: TerrainType;
  feature: FeatureType;
  resource: ResourceDef | null;
  improvement: string | null;
  isRiver: boolean;
  elevation: number; // [0,1]
  moisture: number; // [0,1]
  visibility: 'unexplored' | 'explored' | 'visible';
}

export interface GameMap {
  bounds: MapBounds;
  tiles: Tile[]; // 索引 = r*width+q
}

export const TERRAIN_TYPES: readonly TerrainType[] = [
  'grassland',
  'plains',
  'desert',
  'tundra',
  'snow',
  'hills',
  'mountain',
  'coast',
  'ocean',
];

// 噪声参数（默认，M2 调优）
const OCTAVES = 5;
const FREQUENCY = 1 / 64;
const PERSISTENCE = 0.5;

function octave(noise: (x: number, y: number) => number, x: number, y: number): number {
  let value = 0;
  let amp = 1;
  let max = 0;
  let fx = x;
  let fy = y;
  for (let o = 0; o < OCTAVES; o++) {
    value += noise(fx, fy) * amp;
    max += amp;
    amp *= PERSISTENCE;
    fx *= 2;
    fy *= 2;
  }
  return value / max; // [-1,1]
}

function terrainFor(
  coord: HexCoord,
  elev: number,
  moist: number,
  bounds: MapBounds,
): TerrainType {
  const halfH = bounds.height / 2;
  const polar = Math.abs(coord.r - halfH) > halfH - 4;
  if (elev < 0.3) return 'ocean';
  if (elev < 0.38) return 'coast';
  if (elev > 0.75) return 'mountain';
  if (elev > 0.55) return 'hills';
  if (polar) return elev > 0.65 ? 'snow' : 'tundra';
  if (moist < 0.25) return 'desert';
  if (moist < 0.5) return 'plains';
  return 'grassland';
}

function featureFor(t: Tile, rng: Rng): FeatureType {
  if (
    t.terrain === 'ocean' ||
    t.terrain === 'coast' ||
    t.terrain === 'mountain' ||
    t.terrain === 'snow'
  ) {
    return null;
  }
  const r = rng.next();
  if (t.terrain === 'desert' && r < 0.02) return 'oasis';
  if (r < 0.03) return 'geothermal';
  const land = t.terrain as string;
  if (land === 'grassland' || land === 'plains' || land === 'tundra' || land === 'hills') {
    if (r < 0.22) return 'forest';
  }
  if (land === 'plains' && r < 0.34) return 'rainforest';
  if ((land === 'grassland') && r < 0.38) return 'marsh';
  return null;
}

const RESOURCE_TABLE: { id: string; category: Exclude<ResourceCategory, null>; terrain: TerrainType[] }[] = [
  { id: 'cattle', category: 'bonus', terrain: ['grassland', 'plains'] },
  { id: 'sheep', category: 'bonus', terrain: ['grassland', 'plains', 'hills'] },
  { id: 'wheat', category: 'bonus', terrain: ['grassland', 'plains'] },
  { id: 'copper', category: 'bonus', terrain: ['hills', 'grassland'] },
  { id: 'stone', category: 'bonus', terrain: ['hills', 'plains'] },
  { id: 'iron', category: 'strategic', terrain: ['hills'] },
  { id: 'horse', category: 'strategic', terrain: ['grassland', 'plains'] },
  { id: 'spice', category: 'luxury', terrain: ['grassland', 'plains', 'desert'] },
  { id: 'silk', category: 'luxury', terrain: ['grassland', 'plains'] },
];

function resourceFor(t: Tile, rng: Rng): ResourceDef | null {
  if (t.terrain === 'ocean' || t.terrain === 'coast' || t.terrain === 'mountain') return null;
  if (rng.next() > 0.18) return null;
  const candidates = RESOURCE_TABLE.filter((r) => r.terrain.includes(t.terrain));
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(rng.next() * candidates.length)];
  return { id: pick.id, category: pick.category };
}

export function generateMap(bounds: MapBounds, rng: Rng): GameMap {
  const elevRng = rng.fork('elevation');
  const moistRng = rng.fork('moisture');
  const featRng = rng.fork('features');
  const resRng = rng.fork('resources');

  const elevNoise = createNoise2D(() => elevRng.next());
  const moistNoise = createNoise2D(() => moistRng.next());

  const tiles: Tile[] = [];
  for (const coord of allTiles(bounds)) {
    const eRaw = octave(elevNoise, coord.q * FREQUENCY, coord.r * FREQUENCY);
    const mRaw = octave(moistNoise, coord.q * FREQUENCY, coord.r * FREQUENCY);
    const elev = (eRaw + 1) / 2;
    const moist = (mRaw + 1) / 2;
    const terrain = terrainFor(coord, elev, moist, bounds);
    tiles.push({
      coord,
      terrain,
      feature: null,
      resource: null,
      improvement: null,
      isRiver: false,
      elevation: elev,
      moisture: moist,
      visibility: 'unexplored',
    });
  }

  for (const tile of tiles) {
    tile.feature = featureFor(tile, featRng);
    tile.resource = resourceFor(tile, resRng);
  }

  return { bounds, tiles };
}

export function getTile(map: GameMap, coord: HexCoord): Tile | undefined {
  if (coord.q < 0 || coord.q >= map.bounds.width || coord.r < 0 || coord.r >= map.bounds.height) {
    return undefined;
  }
  return map.tiles[coord.r * map.bounds.width + coord.q];
}
