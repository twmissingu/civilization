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
  statue_of_liberty: { id: 'statue_of_liberty', name: '自由女神像', unlockCivic: 'democracy_modern', cost: 600, effect: '所有海岸城市 +2 金币', terrainReq: 'coast', yield: { food: 0, production: 0, gold: 4, science: 0, culture: 2, faith: 0 } },
  eiffel_tower: { id: 'eiffel_tower', name: '埃菲尔铁塔', unlockTech: 'steel', cost: 500, effect: '所有城市 +2 文化', terrainReq: 'plains', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 2, faith: 0 } },
  broadway: { id: 'broadway', name: '百老汇', unlockCivic: 'cultural_heritage', cost: 550, effect: '剧院区域 +2 文化', terrainReq: 'plains_near_city', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 4, faith: 0 } },
  great_wall: { id: 'great_wall', name: '长城', unlockTech: 'masonry', cost: 180, effect: '边界城市 +2 防御', terrainReq: 'plains', yield: { food: 0, production: 0, gold: 1, science: 0, culture: 1, faith: 0 } },
  terracotta_army: { id: 'terracotta_army', name: '兵马俑', unlockTech: 'bronze_working', cost: 200, effect: '所有陆军单位 +2 CS', terrainReq: 'plains', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 1, faith: 0 } },
  ruhr_valley: { id: 'ruhr_valley', name: '鲁尔山谷', unlockTech: 'industrialization', cost: 500, effect: '工业区 +2 产能', terrainReq: 'river', yield: { food: 0, production: 4, gold: 0, science: 0, culture: 0, faith: 0 } },
  great_bath: { id: 'great_bath', name: '大浴场', unlockTech: 'pottery', cost: 160, effect: '所有城市 +1 住房', terrainReq: 'floodplains', yield: { food: 1, production: 0, gold: 0, science: 0, culture: 0, faith: 0 } },
  hagia_sophia: { id: 'hagia_sophia', name: '圣索菲亚', unlockCivic: 'theology', cost: 250, effect: '圣地 +2 信仰', terrainReq: 'plains', yield: { food: 0, production: 0, gold: 0, science: 0, culture: 1, faith: 2 } },
};
