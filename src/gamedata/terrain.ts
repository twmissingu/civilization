// 地形 / 特征 / 资源 / 改良产出表（gamedata §1）
import type { Yield } from './types';

export interface TerrainDef {
  id: string;
  moveCost: number; // -1 = 不可通行
  yield: Yield;
  impassable: boolean;
}

export const TERRAINS: Record<string, TerrainDef> = {
  grassland: { id: 'grassland', moveCost: 1, impassable: false, yield: { food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  plains: { id: 'plains', moveCost: 1, impassable: false, yield: { food: 2, production: 1, gold: 0, science: 0, culture: 0, faith: 0 } },
  hills: { id: 'hills', moveCost: 2, impassable: false, yield: { food: 0, production: 3, gold: 0, science: 0, culture: 0, faith: 0 } },
  desert: { id: 'desert', moveCost: 1, impassable: false, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  tundra: { id: 'tundra', moveCost: 2, impassable: false, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  snow: { id: 'snow', moveCost: 2, impassable: false, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  coast: { id: 'coast', moveCost: 1, impassable: false, yield: { food: 1, production: 0, gold: 1, science: 0, culture: 0, faith: 0 } },
  ocean: { id: 'ocean', moveCost: 1, impassable: false, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  mountain: { id: 'mountain', moveCost: -1, impassable: true, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
};

export interface FeatureDef {
  id: string;
  yieldBonus: Yield;
  validTerrains: string[];
}

export const FEATURES: Record<string, FeatureDef> = {
  forest: { id: 'forest', yieldBonus: { food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'tundra', 'hills'] },
  rainforest: { id: 'rainforest', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['plains'] },
  marsh: { id: 'marsh', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland'] },
  geothermal: { id: 'geothermal', yieldBonus: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'desert', 'tundra', 'hills'] },
  oasis: { id: 'oasis', yieldBonus: { food: 3, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['desert'] },
  floodplains: { id: 'floodplains', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains'] },
};

export type ResourceCategory = 'bonus' | 'luxury' | 'strategic';

export interface ResourceDef {
  id: string;
  category: ResourceCategory;
  yieldBonus: Yield;
  validTerrains: string[];
}

export const RESOURCES: Record<string, ResourceDef> = {
  cattle: { id: 'cattle', category: 'bonus', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains'] },
  sheep: { id: 'sheep', category: 'bonus', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'hills'] },
  wheat: { id: 'wheat', category: 'bonus', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains'] },
  copper: { id: 'copper', category: 'bonus', yieldBonus: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['hills', 'grassland'] },
  stone: { id: 'stone', category: 'bonus', yieldBonus: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['hills', 'plains'] },
  iron: { id: 'iron', category: 'strategic', yieldBonus: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['hills'] },
  horse: { id: 'horse', category: 'strategic', yieldBonus: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains'] },
  spice: { id: 'spice', category: 'luxury', yieldBonus: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'desert'] },
  silk: { id: 'silk', category: 'luxury', yieldBonus: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains'] },
};

export interface ImprovementDef {
  id: string;
  techId: string;
  yieldBonus: Yield;
  validTerrains: string[]; // 地形限制
}

export const IMPROVEMENTS: Record<string, ImprovementDef> = {
  farm: { id: 'farm', techId: 'pottery', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'floodplains'] },
  mine: { id: 'mine', techId: 'mining', yieldBonus: { food: 0, production: 2, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['hills'] },
  lumber_mill: { id: 'lumber_mill', techId: 'iron_working', yieldBonus: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['forest'] },
  pasture: { id: 'pasture', techId: 'animal_husbandry', yieldBonus: { food: 1, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains'] },
  plantation: { id: 'plantation', techId: 'pottery', yieldBonus: { food: 0, production: 0, gold: 2, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'desert'] },
  quarry: { id: 'quarry', techId: 'mining', yieldBonus: { food: 0, production: 1, gold: 1, science: 0, culture: 0, faith: 0 }, validTerrains: ['hills', 'plains'] },
  fishing_boats: { id: 'fishing_boats', techId: 'sailing', yieldBonus: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['coast', 'ocean'] },
  fort: { id: 'fort', techId: 'engineering', yieldBonus: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, validTerrains: ['grassland', 'plains', 'desert', 'tundra', 'snow'] },
};
