// 科技树 70 节点（gamedata §3）

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
  // ===== 远古 =====
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
  wheel: { id: 'wheel', name: '轮子', era: 'ancient', cost: 30, prereqTechs: [], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['water_mill', 'chariot'] },

  // ===== 古典 =====
  shipbuilding: { id: 'shipbuilding', name: '造船', era: 'classical', cost: 80, prereqTechs: ['sailing'], eureka: { predicate: 'build_a_harbor', boost: 0.4 }, unlocks: ['shipyard', 'quadrireme'] },
  iron_working: { id: 'iron_working', name: '铸造', era: 'classical', cost: 120, prereqTechs: ['bronze_working'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['lumber_mill', 'workshop'] },
  mathematics: { id: 'mathematics', name: '数学', era: 'classical', cost: 100, prereqTechs: [], eureka: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: ['catapult'] },
  engineering: { id: 'engineering', name: '工程学', era: 'classical', cost: 120, prereqTechs: ['mining'], eureka: { predicate: 'build_an_aqueduct', boost: 0.4 }, unlocks: ['aqueduct', 'fort'] },
  currency: { id: 'currency', name: '货币', era: 'classical', cost: 100, prereqTechs: ['writing'], eureka: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: ['market'] },
  siege_tactics: { id: 'siege_tactics', name: '攻城术', era: 'classical', cost: 100, prereqTechs: ['mathematics'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['siege_tower'] },
  construction: { id: 'construction', name: '建筑学', era: 'classical', cost: 110, prereqTechs: ['masonry'], eureka: { predicate: 'build_a_wall', boost: 0.4 }, unlocks: ['colosseum', 'arena'] },

  // ===== 中世纪 =====
  education: { id: 'education', name: '教育', era: 'medieval', cost: 130, prereqTechs: ['writing'], eureka: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: ['university'] },
  machinery: { id: 'machinery', name: '机械', era: 'medieval', cost: 110, prereqTechs: ['mathematics'], eureka: { predicate: 'build_an_improvement', boost: 0.4 }, unlocks: ['chu_ko_nu'] },
  castles: { id: 'castles', name: '城堡', era: 'medieval', cost: 120, prereqTechs: ['bronze_working'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['medieval_walls'] },
  chivalry: { id: 'chivalry', name: '骑士制度', era: 'medieval', cost: 130, prereqTechs: [], prereqCivics: ['feudalism'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['knight'] },
  stirrups: { id: 'stirrups', name: '马镫', era: 'medieval', cost: 140, prereqTechs: ['horseback_riding'], eureka: { predicate: 'build_a_horse_pasture', boost: 0.4 }, unlocks: ['courser'] },
  military_engineering: { id: 'military_engineering', name: '军事工程', era: 'medieval', cost: 150, prereqTechs: ['engineering'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['military_engineer', 'castle'] },
  astronomy: { id: 'astronomy', name: '天文学', era: 'medieval', cost: 150, prereqTechs: ['astrology', 'education'], eureka: { predicate: 'find_a_natural_wonder', boost: 0.4 }, unlocks: ['observatory'] },

  // ===== 文艺复兴 =====
  gunpowder: { id: 'gunpowder', name: '火药', era: 'renaissance', cost: 160, prereqTechs: ['machinery'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['cannon'] },
  printing: { id: 'printing', name: '印刷术', era: 'renaissance', cost: 160, prereqTechs: ['education'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['forbidden_city'] },
  banking: { id: 'banking', name: '银行业', era: 'renaissance', cost: 180, prereqTechs: ['currency'], eureka: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: ['bank'] },
  natural_history: { id: 'natural_history', name: '自然历史', era: 'renaissance', cost: 160, prereqTechs: ['printing'], eureka: { predicate: 'build_a_theater', boost: 0.4 }, unlocks: ['zoo'] },
  mass_production: { id: 'mass_production', name: '大规模生产', era: 'renaissance', cost: 220, prereqTechs: ['shipbuilding'], eureka: { predicate: 'build_a_shipyard', boost: 0.4 }, unlocks: ['ship_of_the_line'] },
  cartography: { id: 'cartography', name: '制图学', era: 'renaissance', cost: 200, prereqTechs: ['sailing', 'astronomy'], eureka: { predicate: 'meet_another_civ', boost: 0.4 }, unlocks: ['caravel', 'map'] },
  metal_casting: { id: 'metal_casting', name: '金属铸造', era: 'renaissance', cost: 220, prereqTechs: ['iron_working', 'machinery'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['longswordsman', 'armory'] },
  siege_tactics_ren: { id: 'siege_tactics_ren', name: '攻城战术', era: 'renaissance', cost: 220, prereqTechs: ['siege_tactics', 'gunpowder'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['bombard'] },

  // ===== 工业 =====
  industrialization: { id: 'industrialization', name: '工业化', era: 'industrial', cost: 240, prereqTechs: ['iron_working'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['factory'] },
  steel: { id: 'steel', name: '冶炼', era: 'industrial', cost: 200, prereqTechs: ['gunpowder'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['musketman'] },
  military_science: { id: 'military_science', name: '军事学', era: 'industrial', cost: 220, prereqTechs: ['chivalry'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['knight_upgrade'] },
  railroad: { id: 'railroad', name: '铁路', era: 'industrial', cost: 380, prereqTechs: ['steam_engine'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['railroad_tile', 'railroad_station'] },
  rifling: { id: 'rifling', name: '膛线', era: 'industrial', cost: 380, prereqTechs: ['steel', 'gunpowder'], eureka: { predicate: 'kill_with_gunpowder_unit', boost: 0.4 }, unlocks: ['line_infantry', 'rifleman'] },
  steam_engine: { id: 'steam_engine', name: '蒸汽机', era: 'industrial', cost: 340, prereqTechs: ['industrialization', 'engineering'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['ironclad', 'steam_engine_building'] },
  biology: { id: 'biology', name: '生物学', era: 'industrial', cost: 360, prereqTechs: ['natural_history'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['hospital', 'biological_research'] },

  // ===== 现代 =====
  fertilizer: { id: 'fertilizer', name: '化肥', era: 'modern', cost: 260, prereqTechs: ['industrialization'], eureka: { predicate: 'build_a_farm', boost: 0.4 }, unlocks: ['farm_bonus'] },
  electricity: { id: 'electricity', name: '电力', era: 'modern', cost: 260, prereqTechs: ['industrialization'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['factory_bonus'] },
  apprenticeship: { id: 'apprenticeship', name: '学徒制', era: 'modern', cost: 240, prereqTechs: ['steel'], eureka: { predicate: 'build_a_mine', boost: 0.4 }, unlocks: ['mine_bonus'] },
  combustion: { id: 'combustion', name: '内燃机', era: 'modern', cost: 620, prereqTechs: ['steam_engine'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['tank', 'combustion_engine'] },
  radio: { id: 'radio', name: '无线电', era: 'modern', cost: 650, prereqTechs: ['electricity'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['broadcast_center', 'radio_building'] },
  advanced_flight: { id: 'advanced_flight', name: '高级飞行', era: 'modern', cost: 720, prereqTechs: ['radio', 'steam_engine'], eureka: { predicate: 'build_an_aerodrome', boost: 0.4 }, unlocks: ['fighter', 'bomber'] },
  plastics: { id: 'plastics', name: '塑料', era: 'modern', cost: 660, prereqTechs: ['biology'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['plastic_building', 'modern_armor'] },
  electronics: { id: 'electronics', name: '电子学', era: 'modern', cost: 640, prereqTechs: ['electricity', 'radio'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['electronics_factory', 'power_plant'] },
  synthetic_materials: { id: 'synthetic_materials', name: '合成材料', era: 'modern', cost: 720, prereqTechs: ['plastics', 'chemistry'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['synthetic_factory', 'modern_gear'] },
  combined_arms: { id: 'combined_arms', name: '联合作战', era: 'modern', cost: 800, prereqTechs: ['military_science', 'combustion'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['combined_arms_unit', 'modern_warfare'] },
  replaceable_parts: { id: 'replaceable_parts', name: '可替换零件', era: 'modern', cost: 620, prereqTechs: ['industrialization', 'steel'], eureka: { predicate: 'build_a_workshop', boost: 0.4 }, unlocks: ['replaceable_parts_building', 'assembly_line'] },
  flight: { id: 'flight', name: '飞行', era: 'modern', cost: 680, prereqTechs: ['radio'], eureka: { predicate: 'build_an_aerodrome', boost: 0.4 }, unlocks: ['biplane', 'airport'] },
  ballistics: { id: 'ballistics', name: '弹道学', era: 'modern', cost: 650, prereqTechs: ['rifling', 'steel'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['machine_gun', 'artillery'] },

  // ===== 原子 =====
  chemistry: { id: 'chemistry', name: '化学', era: 'atomic', cost: 280, prereqTechs: ['electricity'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['rocketry_prereq'] },
  rocketry: { id: 'rocketry', name: '火箭技术', era: 'atomic', cost: 320, prereqTechs: ['chemistry'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['space_project_1'] },
  satellites: { id: 'satellites', name: '卫星', era: 'atomic', cost: 800, prereqTechs: ['rocketry'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['space_project_2'] },
  nuclear_fission: { id: 'nuclear_fission', name: '核裂变', era: 'atomic', cost: 1300, prereqTechs: ['chemistry', 'electronics'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['nuclear_plant', 'nuclear_device'] },
  nuclear_fusion: { id: 'nuclear_fusion', name: '核聚变', era: 'atomic', cost: 1800, prereqTechs: ['nuclear_fission', 'rocketry'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['fusion_reactor', 'fusion_project'] },
  computers: { id: 'computers', name: '计算机', era: 'atomic', cost: 1200, prereqTechs: ['radio', 'electronics'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['computer_lab', 'cybernetics_prereq'] },
  advanced_computers: { id: 'advanced_computers', name: '高级计算机', era: 'atomic', cost: 1600, prereqTechs: ['computers', 'satellites'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['advanced_ai', 'quantum_computing'] },
  robotics: { id: 'robotics', name: '机器人学', era: 'atomic', cost: 1600, prereqTechs: ['computers', 'combined_arms'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['robot_unit', 'automation'] },
  telecommunications: { id: 'telecommunications', name: '电信', era: 'atomic', cost: 1400, prereqTechs: ['computers', 'satellites'], eureka: { predicate: 'build_a_comm_hub', boost: 0.4 }, unlocks: ['telecom_tower', 'global_network'] },
  laser: { id: 'laser', name: '激光', era: 'atomic', cost: 1700, prereqTechs: ['nuclear_fission', 'advanced_computers'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['laser_weapon', 'laser_project'] },

  // ===== 信息 =====
  nanotechnology: { id: 'nanotechnology', name: '纳米技术', era: 'information', cost: 1200, prereqTechs: ['satellites'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['space_project_3'] },
  artificial_intelligence: { id: 'artificial_intelligence', name: '人工智能', era: 'information', cost: 2600, prereqTechs: ['advanced_computers', 'robotics'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['ai_boost', 'smart_defense'] },
  smart_materials: { id: 'smart_materials', name: '智能材料', era: 'information', cost: 2600, prereqTechs: ['nanotechnology', 'plastics'], eureka: { predicate: 'build_a_factory', boost: 0.4 }, unlocks: ['smart_materials_boost', 'adaptive_armor'] },
  cybernetics: { id: 'cybernetics', name: '控制论', era: 'information', cost: 3000, prereqTechs: ['robotics', 'stealth_tech'], eureka: { predicate: 'build_a_hospital', boost: 0.4 }, unlocks: ['cyber_warfare', 'cyborg_unit'] },
  stealth_tech: { id: 'stealth_tech', name: '隐形技术', era: 'information', cost: 3000, prereqTechs: ['advanced_computers', 'synthetic_materials'], eureka: { predicate: 'build_an_encampment', boost: 0.4 }, unlocks: ['stealth_bomber', 'stealth_fighter'] },
  future_tech_1: { id: 'future_tech_1', name: '未来科技 I', era: 'information', cost: 4200, prereqTechs: ['artificial_intelligence', 'smart_materials'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['future_project_1'] },
  future_tech_2: { id: 'future_tech_2', name: '未来科技 II', era: 'information', cost: 5000, prereqTechs: ['future_tech_1', 'cybernetics'], eureka: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['future_project_2'] },
};

export const TECH_LIST = Object.values(TECHS);

/** 科技成本缩放（gamedata §3） */
export function techCost(tech: TechDef, numResearched: number): number {
  return Math.round(tech.cost * (1 + 0.1 * numResearched));
}
