// 地块描述（纯函数，可测）
import type { HexCoord } from '../../types';
import type { GameState } from './types';
import { getTile } from './mapgen';
import { cityAt } from './combat';
import { tileYield } from './yield';
import { IMPROVEMENTS, UNITS } from '../../gamedata';
import { hexEquals } from '../hex';
import type { Yield } from '../../gamedata';

const TERRAIN_LABELS: Record<string, string> = {
  grassland: '草原', plains: '平原', hills: '丘陵', desert: '沙漠', tundra: '冻土',
  snow: '雪原', mountain: '山脉', coast: '海岸', ocean: '海洋',
};

const TERRAIN_DESCRIPTIONS: Record<string, string> = {
  grassland: '肥沃的草地，适合农业。移动消耗1，提供2食物。',
  plains: '平坦的平原，提供平衡产出。移动消耗1，提供1食物1产能。',
  hills: '起伏的丘陵，提供防御加成。移动消耗2，提供2产能。',
  desert: '干旱的沙漠，几乎没有产出。移动消耗1。',
  tundra: '寒冷的冻土，产出较低。移动消耗2。',
  snow: '极寒的雪地，无法耕作。移动消耗2。',
  mountain: '不可通行的山脉，但提供圣地相邻加成。',
  coast: '浅海区域，可通行。移动消耗1，提供1食物1金币。',
  ocean: '深海区域，需要航海科技才能通行。',
};

const FEATURE_LABELS: Record<string, string> = {
  forest: '森林', rainforest: '雨林', marsh: '沼泽', geothermal: '地热', oasis: '绿洲', floodplains: '泛滥平原',
};

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  forest: '茂密的森林，提供食物和产能。可建造伐木场。',
  rainforest: '热带雨林，提供食物。可建造种植园。',
  marsh: '潮湿的沼泽，提供食物。移动消耗增加。',
  geothermal: '地热资源，提供产能。圣地相邻加成来源。',
  oasis: '沙漠中的绿洲，提供大量食物。',
  floodplains: '河流泛滥平原，提供食物。可建造农场。',
};

const RESOURCE_DESCRIPTIONS: Record<string, string> = {
  cattle: '牛群，加成资源。提供食物和产能。',
  sheep: '羊群，加成资源。提供食物。',
  wheat: '小麦，加成资源。提供食物。',
  copper: '铜矿，加成资源。提供产能。',
  stone: '石矿，加成资源。提供产能。',
  iron: '铁矿，战略资源。解锁高级单位。',
  horse: '马匹，战略资源。解锁骑兵单位。',
  spice: '香料，奢侈资源。提供宜居度。',
  silk: '丝绸，奢侈资源。提供宜居度。',
};

const RESOURCE_LABELS: Record<string, string> = {
  cattle: '牛', sheep: '羊', wheat: '小麦', copper: '铜', stone: '石头',
  iron: '铁', horse: '马', spice: '香料', silk: '丝绸',
};

const RESOURCE_CATEGORY_LABELS: Record<string, string> = {
  bonus: '加成资源', luxury: '奢侈资源', strategic: '战略资源',
};

const IMPROVEMENT_DESCRIPTIONS: Record<string, string> = {
  farm: '农场，提供食物加成。可建在草地、平原和泛滥平原。',
  mine: '矿场，提供产能加成。可建在丘陵。',
  lumber_mill: '伐木场，提供产能加成。可建在森林。',
  pasture: '牧场，提供食物和产能。可建在草地和平原。',
  plantation: '种植园，提供金币加成。可建在草地、平原和沙漠。',
  quarry: '采石场，提供产能和金币。可建在丘陵和平原。',
  fishing_boats: '渔船，提供食物加成。可建在海岸和海洋。',
  fort: '堡垒，提供防御加成。可建在多种地形。',
};

export function terrainLabel(terrain: string): string {
  return TERRAIN_LABELS[terrain] ?? terrain;
}

export function terrainDescription(terrain: string): string {
  return TERRAIN_DESCRIPTIONS[terrain] ?? '未知地形';
}

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

export function featureDescription(feature: string): string {
  return FEATURE_DESCRIPTIONS[feature] ?? '未知特征';
}

export function resourceLabel(resource: string): string {
  return RESOURCE_LABELS[resource] ?? resource;
}

export function resourceDescription(resource: string): string {
  return RESOURCE_DESCRIPTIONS[resource] ?? '未知资源';
}

export function improvementDescription(improvement: string): string {
  return IMPROVEMENT_DESCRIPTIONS[improvement] ?? '未知改良';
}

interface YieldLabel {
  key: keyof Yield;
  short: string;
  full: string;
}

const YIELD_LABELS: YieldLabel[] = [
  { key: 'food', short: '粮', full: '食物' },
  { key: 'production', short: '产', full: '产能' },
  { key: 'gold', short: '金', full: '金币' },
  { key: 'science', short: '科', full: '科技' },
  { key: 'culture', short: '文', full: '文化' },
  { key: 'faith', short: '信', full: '信仰' },
];

function formatYield(y: Yield, short: boolean): string {
  const labels = short ? YIELD_LABELS.map((l) => ({ ...l, label: l.short })) : YIELD_LABELS.map((l) => ({ ...l, label: l.full }));
  const parts = labels
    .filter(({ key }) => y[key] !== 0)
    .map(({ key, label }) => `${label}${y[key]}`);
  return parts.join(short ? ' ' : ', ');
}

/** 返回地块的详细描述（含地形、特征、资源、产出、单位、城市） */
export function describeTile(state: GameState, coord: HexCoord): string {
  const t = getTile(state.map, coord);
  if (!t) return `(${coord.q},${coord.r}) 越界`;
  
  const parts: string[] = [];
  
  // 坐标和地形
  parts.push(`(${coord.q},${coord.r}) ${terrainLabel(t.terrain)}`);
  
  // 地形描述
  parts.push(terrainDescription(t.terrain));
  
  // 特征
  if (t.feature) {
    const featureName = FEATURE_LABELS[t.feature] ?? t.feature;
    const featureDesc = FEATURE_DESCRIPTIONS[t.feature] ?? '';
    parts.push(`${featureName}: ${featureDesc}`);
  }
  
  // 资源
  if (t.resource) {
    const resourceName = RESOURCE_LABELS[t.resource.id] ?? t.resource.id;
    const resourceDesc = RESOURCE_DESCRIPTIONS[t.resource.id] ?? '';
    const category = t.resource.category ?? 'bonus';
    const categoryLabel = RESOURCE_CATEGORY_LABELS[category] ?? category;
    parts.push(`${categoryLabel} ${resourceName}: ${resourceDesc}`);
  }
  
  // 改良
  if (t.improvement) {
    const improvementName = IMPROVEMENTS[t.improvement]?.id ?? t.improvement;
    const improvementDesc = IMPROVEMENT_DESCRIPTIONS[t.improvement] ?? '';
    parts.push(`改良 ${improvementName}: ${improvementDesc}`);
  }
  
  // 产出
  const y = tileYield(t, true);
  const yieldText = formatYield(y, false);
  if (yieldText) {
    parts.push(`产出: ${yieldText}`);
  }
  
  // 城市
  const city = cityAt(state, coord);
  if (city) {
    parts.push(`城市: ${city.name} (人口${city.population})`);
  }
  
  // 单位
  const unit = state.players.flatMap((p) => p.units).find((u) => hexEquals(u.tile, coord));
  if (unit) {
    const unitName = UNITS[unit.type]?.name ?? unit.type;
    parts.push(`单位: ${unitName} (HP${unit.hp})`);
  }
  
  return parts.join('\n');
}

/** 返回地块的简短描述（用于工具提示） */
export function describeTileShort(state: GameState, coord: HexCoord): string {
  const t = getTile(state.map, coord);
  if (!t) return `(${coord.q},${coord.r}) 越界`;
  
  const parts: string[] = [];
  
  // 地形和特征
  let terrainDesc = terrainLabel(t.terrain);
  if (t.feature) {
    terrainDesc += ` (${FEATURE_LABELS[t.feature] ?? t.feature})`;
  }
  parts.push(terrainDesc);
  
  // 资源
  if (t.resource) {
    const resourceName = RESOURCE_LABELS[t.resource.id] ?? t.resource.id;
    const category = t.resource.category ?? 'bonus';
    const categoryLabel = RESOURCE_CATEGORY_LABELS[category] ?? category;
    parts.push(`${categoryLabel} ${resourceName}`);
  }
  
  // 产出
  const y = tileYield(t, true);
  const yieldText = formatYield(y, true);
  if (yieldText) {
    parts.push(yieldText);
  }
  
  // 城市和单位
  const city = cityAt(state, coord);
  if (city) {
    parts.push(`城市: ${city.name}`);
  }
  
  const unit = state.players.flatMap((p) => p.units).find((u) => hexEquals(u.tile, coord));
  if (unit) {
    const unitName = UNITS[unit.type]?.name ?? unit.type;
    parts.push(`单位: ${unitName}`);
  }
  
  return parts.join(' · ');
}
