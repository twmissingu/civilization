// 地块描述（纯函数，可测）
import type { HexCoord } from '../../types';
import type { GameState } from './types';
import { getTile } from './mapgen';
import { cityAt } from './combat';
import { tileYield } from './yield';
import { IMPROVEMENTS, UNITS } from '../../gamedata';
import { hexEquals } from '../hex';

const TERRAIN_LABELS: Record<string, string> = {
  grassland: '草原', plains: '平原', hills: '丘陵', desert: '沙漠', tundra: '冻土',
  snow: '雪原', mountain: '山脉', coast: '海岸', ocean: '海洋',
};
const FEATURE_LABELS: Record<string, string> = {
  forest: '森林', rainforest: '雨林', marsh: '沼泽', geothermal: '地热', oasis: '绿洲', floodplains: '泛滥平原',
};

export function terrainLabel(terrain: string): string {
  return TERRAIN_LABELS[terrain] ?? terrain;
}

/** 返回地块的可读描述（含产出/单位/城市） */
export function describeTile(state: GameState, coord: HexCoord): string {
  const t = getTile(state.map, coord);
  if (!t) return `(${coord.q},${coord.r}) 越界`;
  const parts: string[] = [`(${coord.q},${coord.r}) ${terrainLabel(t.terrain)}`];
  if (t.feature) parts.push(FEATURE_LABELS[t.feature] ?? t.feature);
  if (t.resource) {
    parts.push(`资源:${t.resource.id}(${t.resource.category})`);
  }
  if (t.improvement) parts.push(`改良:${IMPROVEMENTS[t.improvement]?.id ?? t.improvement}`);
  const y = tileYield(t, true);
  const yieldStr = [y.food && `粮${y.food}`, y.production && `产${y.production}`, y.gold && `金${y.gold}`, y.science && `科${y.science}`, y.culture && `文${y.culture}`, y.faith && `信${y.faith}`].filter(Boolean).join(' ');
  if (yieldStr) parts.push(yieldStr);
  const city = cityAt(state, coord);
  if (city) parts.push(`城市:${city.name}(人口${city.population})`);
  const unit = state.players.flatMap((p) => p.units).find((u) => hexEquals(u.tile, coord));
  if (unit) parts.push(`单位:${UNITS[unit.type]?.name ?? unit.type} HP${unit.hp}`);
  return parts.join(' · ');
}
