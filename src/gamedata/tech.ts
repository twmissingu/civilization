// 科技树 34 节点（gamedata §3）

export interface TechDef {
  id: string;
  name: string;
  era: 'ancient' | 'classical' | 'medieval' | 'renaissance' | 'industrial' | 'modern' | 'atomic' | 'information';
  cost: number;
  prereqTechs: string[]; // 同树前置
  prereqCivics?: string[]; // 跨树前置（civicPrereq）
  eureka: { predicate: string; boost: number }; // predicate = 描述性触发条件
  unlocks: string[]; // 解锁内容（单位/建筑/区域/奇观/改良 id 或描述）
}

export const TECHS: Record<string, TechDef> = {
  pottery: { id: 'pottery', name: '陶器', era: 'ancient', cost: 25, prereqTechs: [], eureka: { predicate: 'build_a_farm', boost: 0.4 }, unlocks: ['granary', 'plantation'] },
  animal_husbandry: { id: 'animal_husbandry', name: '畜牧业', era: 'ancient', cost: 25, prereqTechs: [], eureka: { predicate: 'find_bonus_or_horse', boost: 0.4 }, unlocks: ['pasture'] },
  mining: { id: 'mining', name: '采矿', era: 'ancient', cost: 25, prereqTechs: [], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['mine', 'quarry'] },
  masonry: { id: 'masonry', name: '砌石', era: 'ancient', cost: 50, prereqTechs: ['mining'], eureka: { predicate: 'build_a_quarry', boost: 0.4 }, unlocks: ['ancient_walls', 'pyramids'] },
  astrology: { id: 'astrology', name: '占星术', era: 'ancient', cost: 50, prereqTechs: [], eureka: { predicate: 'find_geothermal', boost: 0.4 }, unlocks: ['holy_site'] },
  writing: { id: 'writing', name: '写作', era: 'ancient', cost: 50, prereqTechs: ['pottery'], eureka: { predicate: 'meet_another_civ', boost: 0.4 }, unlocks: ['library'] },
  archery: { id: 'archery', name: '射箭', era: 'ancient', cost: 50, prereqTechs: [], eureka: { predicate: 'kill_with_slinger', boost: 0.4 }, unlocks: ['archer'] },
  bronze_working: { id: 'bronze_working', name: '青铜器', era: 'ancient', cost: 70, prereqTechs: ['mining'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['swordsman', 'barracks'] },
  horseback_riding: { id: 'horseback_riding', name: '骑术', era: 'ancient', cost: 80, prereqTechs: ['animal_husbandry'], eureka: { predicate: 'find_horse', boost: 0.4 }, unlocks: ['cavalry', 'stable'] },
  sailing: { id: 'sailing', name: '航海', era: 'ancient', cost: 50, prereqTechs: [], eureka: { predicate: 'found_coastal_city', boost: 0.4 }, unlocks: ['fishing_boats', 'lighthouse', 'trireme'] },
  shipbuilding: { id: 'shipbuilding', name: '造船', era: 'classical', cost: 80, prereqTechs: ['sailing'], eureka: { predicate: 'build_a_harbor', boost: 0.4 }, unlocks: ['shipyard', 'quadrireme'] },
  iron_working: { id: 'iron_working', name: '铸造', era: 'classical', cost: 120, prereqTechs: ['bronze_working'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['lumber_mill', 'workshop'] },
  mathematics: { id: 'mathematics', name: '数学', era: 'classical', cost: 100, prereqTechs: [], eureka: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: ['catapult'] },
  engineering: { id: 'engineering', name: '工程学', era: 'classical', cost: 120, prereqTechs: ['mining'], eureka: { predicate: 'build_an_aqueduct', boost: 0.4 }, unlocks: ['aqueduct', 'fort'] },
  currency: { id: 'currency', name: '货币', era: 'classical', cost: 100, prereqTechs: ['writing'], eureka: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: ['market'] },
  siege_tactics: { id: 'siege_tactics', name: '攻城术', era: 'classical', cost: 100, prereqTechs: ['mathematics'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['siege_tower'] },
  education: { id: 'education', name: '教育', era: 'medieval', cost: 130, prereqTechs: ['writing'], eureka: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: ['university'] },
  machinery: { id: 'machinery', name: '机械', era: 'medieval', cost: 110, prereqTechs: ['mathematics'], eureka: { predicate: 'build_an_improvement', boost: 0.4 }, unlocks: ['chu_ko_nu'] },
  castles: { id: 'castles', name: '城堡', era: 'medieval', cost: 120, prereqTechs: ['bronze_working'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['medieval_walls'] },
  chivalry: { id: 'chivalry', name: '骑士制度', era: 'medieval', cost: 130, prereqTechs: [], prereqCivics: ['feudalism'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['knight'] },
  gunpowder: { id: 'gunpowder', name: '火药', era: 'renaissance', cost: 160, prereqTechs: ['machinery'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['cannon'] },
  printing: { id: 'printing', name: '印刷术', era: 'renaissance', cost: 160, prereqTechs: ['education'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['forbidden_city'] },
  banking: { id: 'banking', name: '银行业', era: 'renaissance', cost: 180, prereqTechs: ['currency'], eureka: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: ['bank'] },
  natural_history: { id: 'natural_history', name: '自然历史', era: 'renaissance', cost: 160, prereqTechs: ['printing'], eureka: { predicate: 'build_a_theater', boost: 0.4 }, unlocks: ['zoo'] },
  industrialization: { id: 'industrialization', name: '工业化', era: 'industrial', cost: 240, prereqTechs: ['iron_working'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['factory'] },
  steel: { id: 'steel', name: '冶炼', era: 'industrial', cost: 200, prereqTechs: ['gunpowder'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['musketman'] },
  military_science: { id: 'military_science', name: '军事学', era: 'industrial', cost: 220, prereqTechs: ['chivalry'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['knight_upgrade'] },
  fertilizer: { id: 'fertilizer', name: '化肥', era: 'modern', cost: 260, prereqTechs: ['industrialization'], eureka: { predicate: 'build_a_farm', boost: 0.4 }, unlocks: ['farm_bonus'] },
  electricity: { id: 'electricity', name: '电力', era: 'modern', cost: 260, prereqTechs: ['industrialization'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['factory_bonus'] },
  apprenticeship: { id: 'apprenticeship', name: '学徒制', era: 'modern', cost: 240, prereqTechs: ['steel'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['mine_bonus'] },
  chemistry: { id: 'chemistry', name: '化学', era: 'atomic', cost: 280, prereqTechs: ['electricity'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['rocketry_prereq'] },
  rocketry: { id: 'rocketry', name: '火箭技术', era: 'atomic', cost: 320, prereqTechs: ['chemistry'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['space_project_1'] },
  satellites: { id: 'satellites', name: '卫星', era: 'atomic', cost: 800, prereqTechs: ['rocketry'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['space_project_2'] },
  nanotechnology: { id: 'nanotechnology', name: '纳米技术', era: 'information', cost: 1200, prereqTechs: ['satellites'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['space_project_3'] },
};

export const TECH_LIST = Object.values(TECHS);

/** 科技成本缩放（gamedata §3） */
export function techCost(tech: TechDef, numResearched: number): number {
  return Math.round(tech.cost * (1 + 0.1 * numResearched));
}
