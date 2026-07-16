// 建筑清单（gamedata §5）
import type { Yield } from './types';

export interface BuildingDef {
  id: string;
  name: string;
  district: string; // 'city_center' 或区域 id
  unlockTech?: string;
  unlockCivic?: string;
  cost: number;
  yield: Yield;
  housing: number;
  amenities: number;
  /** 其他效果键（如 city_ranged_strike / walls_hp） */
  effects?: Record<string, number>;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  palace: { id: 'palace', name: '宫殿', district: 'city_center', cost: 0, yield: { food: 2, production: 2, gold: 2, science: 1, culture: 1, faith: 0 }, housing: 0, amenities: 1, effects: { capital: 1 } },
  monument: { id: 'monument', name: '纪念碑', district: 'city_center', cost: 60, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 2, faith: 0 }, housing: 0, amenities: 0 },
  granary: { id: 'granary', name: '粮仓', district: 'city_center', unlockTech: 'pottery', cost: 80, yield: { food: 2, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 2, amenities: 0 },
  library: { id: 'library', name: '图书馆', district: 'campus', unlockTech: 'writing', cost: 80, yield: { food: 0, production: 0, gold: 0, science: 2, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  university: { id: 'university', name: '大学', district: 'campus', unlockTech: 'education', cost: 250, yield: { food: 0, production: 0, gold: 0, science: 4, culture: 0, faith: 0 }, housing: 1, amenities: 0 },
  market: { id: 'market', name: '市场', district: 'commercial', unlockTech: 'currency', cost: 120, yield: { food: 0, production: 0, gold: 3, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  bank: { id: 'bank', name: '银行', district: 'commercial', unlockTech: 'banking', cost: 290, yield: { food: 0, production: 0, gold: 5, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  workshop: { id: 'workshop', name: '工坊', district: 'industrial', unlockTech: 'iron_working', cost: 120, yield: { food: 0, production: 2, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  factory: { id: 'factory', name: '工厂', district: 'industrial', unlockTech: 'industrialization', cost: 360, yield: { food: 0, production: 4, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  barracks: { id: 'barracks', name: '兵营', district: 'encampment', unlockTech: 'bronze_working', cost: 60, yield: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0, effects: { xp_bonus: 25 } },
  stable: { id: 'stable', name: '马厩', district: 'encampment', unlockTech: 'horseback_riding', cost: 120, yield: { food: 0, production: 1, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  ancient_walls: { id: 'ancient_walls', name: '古代城墙', district: 'city_center', unlockTech: 'masonry', cost: 80, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0, effects: { walls_hp: 200, city_ranged_strike: 1 } },
  medieval_walls: { id: 'medieval_walls', name: '中世纪城墙', district: 'city_center', unlockTech: 'castles', cost: 200, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0, effects: { walls_hp: 300 } },
  temple: { id: 'temple', name: '神庙', district: 'holy', unlockTech: 'astrology', cost: 120, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 2 }, housing: 0, amenities: 0 },
  museum: { id: 'museum', name: '博物馆', district: 'theater', unlockCivic: 'humanism', cost: 290, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 4, faith: 0 }, housing: 0, amenities: 0 },
  lighthouse: { id: 'lighthouse', name: '灯塔', district: 'harbor', unlockTech: 'sailing', cost: 60, yield: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0, effects: { naval_move: 1 } },
  shipyard: { id: 'shipyard', name: '造船厂', district: 'harbor', unlockTech: 'shipbuilding', cost: 120, yield: { food: 0, production: 2, gold: 1, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 0 },
  aqueduct: { id: 'aqueduct', name: '水渠', district: 'city_center', unlockTech: 'engineering', cost: 120, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 2, amenities: 0 },
  entertainment: { id: 'entertainment', name: '娱乐区', district: 'city_center', unlockCivic: 'drama_poetry', cost: 80, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 }, housing: 0, amenities: 2 },
  zoo: { id: 'zoo', name: '动物园', district: 'city_center', unlockTech: 'natural_history', cost: 290, yield: { food: 0, production: 0, gold: 0, science: 0, culture: 1, faith: 0 }, housing: 0, amenities: 2 },
};
