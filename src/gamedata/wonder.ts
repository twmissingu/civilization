// 奇观清单（gamedata §9）
import type { Yield } from './types';

export interface WonderDef {
  id: string;
  name: string;
  unlockTech?: string;
  unlockCivic?: string;
  cost: number;
  effect: string;
  terrainReq: string;
  yield: Yield;
}

export const WONDERS: Record<string, WonderDef> = {
  pyramids: { id: 'pyramids', name: '大金字塔', unlockTech: 'masonry', cost: 220, effect: '所有建造者 +1 充能', terrainReq: 'desert_plains', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  forbidden_city: { id: 'forbidden_city', name: '紫禁城', unlockTech: 'printing', cost: 600, effect: '+1 万能政策槽', terrainReq: 'river', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  great_library: { id: 'great_library', name: '大图书馆', unlockTech: 'writing', cost: 180, effect: '每回合 +4 科技（MVP）', terrainReq: 'plains', yield: { food: 0, production: 0, gold: 0, science: 4, culture: 0, faith: 0 } },
  oracle: { id: 'oracle', name: '神谕所', unlockTech: 'astrology', cost: 180, effect: '+1 科技（MVP）', terrainReq: 'hills', yield: { food: 0, production: 0, gold: 0, science: 1, culture: 0, faith: 0 } },
  colosseum: { id: 'colosseum', name: '斗兽场', unlockCivic: 'drama_poetry', cost: 200, effect: '范围内所有城市 +3 文化 +3 宜居度', terrainReq: 'plains_near_city', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 3, faith: 0 } },
};
