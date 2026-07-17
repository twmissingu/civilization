// 市政树 + 政体 + 政策卡（gamedata §4）

export interface CivicDef {
  id: string;
  name: string;
  era: string;
  cost: number;
  prereqCivics: string[];
  prereqTechs?: string[];
  inspiration: { predicate: string; boost: number };
  unlocks: string[];
}

export const CIVICS: Record<string, CivicDef> = {
  code_of_laws: { id: 'code_of_laws', name: '法典', era: 'ancient', cost: 20, prereqCivics: [], inspiration: { predicate: 'initial', boost: 0.4 }, unlocks: ['chiefdom', 'discipline'] },
  state_workforce: { id: 'state_workforce', name: '国家劳动力', era: 'ancient', cost: 40, prereqCivics: ['code_of_laws'], inspiration: { predicate: 'build_a_district', boost: 0.4 }, unlocks: ['autocracy', 'urban_planning', 'mason'] },
  military_tradition: { id: 'military_tradition', name: '军事传统', era: 'ancient', cost: 50, prereqCivics: ['code_of_laws'], inspiration: { predicate: 'win_a_battle', boost: 0.4 }, unlocks: ['oligarchy', 'maneuver', 'discipline_b'] },
  political_philosophy: { id: 'political_philosophy', name: '政治哲学', era: 'classical', cost: 60, prereqCivics: ['state_workforce'], inspiration: { predicate: 'meet_3_civs', boost: 0.4 }, unlocks: ['classical_republic', 'intermediate', 'natural_philosophy'] },
  theology: { id: 'theology', name: '神学', era: 'classical', cost: 70, prereqCivics: [], prereqTechs: ['astrology'], inspiration: { predicate: 'build_a_holy_site', boost: 0.4 }, unlocks: ['theocracy'] },
  feudalism: { id: 'feudalism', name: '封建主义', era: 'medieval', cost: 120, prereqCivics: ['political_philosophy'], inspiration: { predicate: 'build_5_farms', boost: 0.4 }, unlocks: ['monarchy'] },
  guilds: { id: 'guilds', name: '行会', era: 'medieval', cost: 110, prereqCivics: ['political_philosophy'], inspiration: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: ['merchant_republic', 'craftsman'] },
  drama_poetry: { id: 'drama_poetry', name: '戏剧与诗歌', era: 'classical', cost: 80, prereqCivics: ['code_of_laws'], inspiration: { predicate: 'build_a_theater', boost: 0.4 }, unlocks: ['theater', 'drama', 'colosseum'] },
  humanism: { id: 'humanism', name: '人文主义', era: 'renaissance', cost: 140, prereqCivics: ['drama_poetry'], inspiration: { predicate: 'build_a_theater', boost: 0.4 }, unlocks: ['museum'] },
  enlightenment: { id: 'enlightenment', name: '启蒙运动', era: 'renaissance', cost: 160, prereqCivics: ['humanism'], inspiration: { predicate: 'build_a_university', boost: 0.4 }, unlocks: ['democracy', 'enlightenment_card'] },
  // Medieval era
  civil_service: { id: 'civil_service', name: '文官制度', era: 'medieval', cost: 80, prereqCivics: ['state_workforce'], inspiration: { predicate: 'build_a_district', boost: 0.4 }, unlocks: [] },
  divine_right: { id: 'divine_right', name: '君权神授', era: 'medieval', cost: 90, prereqCivics: ['theology'], inspiration: { predicate: 'build_a_holy_site', boost: 0.4 }, unlocks: [] },
  diplomacy: { id: 'diplomacy', name: '外交', era: 'medieval', cost: 100, prereqCivics: ['political_philosophy'], inspiration: { predicate: 'meet_3_civs', boost: 0.4 }, unlocks: [] },
  medieval_church: { id: 'medieval_church', name: '中世纪教会', era: 'medieval', cost: 110, prereqCivics: ['theology'], inspiration: { predicate: 'build_a_holy_site', boost: 0.4 }, unlocks: [] },
  navigation: { id: 'navigation', name: '航海', era: 'medieval', cost: 120, prereqCivics: ['feudalism'], inspiration: { predicate: 'build_a_harbor', boost: 0.4 }, unlocks: [] },
  // Renaissance era
  reformed_church: { id: 'reformed_church', name: '宗教改革', era: 'renaissance', cost: 150, prereqCivics: ['divine_right'], inspiration: { predicate: 'build_a_holy_site', boost: 0.4 }, unlocks: [] },
  exploration: { id: 'exploration', name: '探索', era: 'renaissance', cost: 160, prereqCivics: ['navigation'], inspiration: { predicate: 'meet_3_civs', boost: 0.4 }, unlocks: [] },
  mercantilism: { id: 'mercantilism', name: '重商主义', era: 'renaissance', cost: 170, prereqCivics: ['guilds'], inspiration: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: [] },
  diplomacy_ren: { id: 'diplomacy_ren', name: '外交学', era: 'renaissance', cost: 165, prereqCivics: ['diplomacy'], inspiration: { predicate: 'meet_3_civs', boost: 0.4 }, unlocks: [] },
  cultural_heritage: { id: 'cultural_heritage', name: '文化遗产', era: 'renaissance', cost: 180, prereqCivics: ['humanism'], inspiration: { predicate: 'build_a_theater', boost: 0.4 }, unlocks: [] },
  // Industrial era
  nationalism: { id: 'nationalism', name: '民族主义', era: 'industrial', cost: 220, prereqCivics: ['civil_service'], inspiration: { predicate: 'win_a_battle', boost: 0.4 }, unlocks: [] },
  capitalism: { id: 'capitalism', name: '资本主义', era: 'industrial', cost: 240, prereqCivics: ['mercantilism'], inspiration: { predicate: 'build_a_commercial', boost: 0.4 }, unlocks: [] },
  socialism: { id: 'socialism', name: '社会主义', era: 'industrial', cost: 230, prereqCivics: ['political_philosophy'], inspiration: { predicate: 'build_a_industrial', boost: 0.4 }, unlocks: [] },
  natural_history_ind: { id: 'natural_history_ind', name: '自然史', era: 'industrial', cost: 250, prereqCivics: ['cultural_heritage'], inspiration: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: [] },
  colonialism: { id: 'colonialism', name: '殖民主义', era: 'industrial', cost: 260, prereqCivics: ['exploration'], inspiration: { predicate: 'settle_a_city', boost: 0.4 }, unlocks: [] },
  // Modern era
  totalitarianism: { id: 'totalitarianism', name: '极权主义', era: 'modern', cost: 300, prereqCivics: ['nationalism'], inspiration: { predicate: 'build_a_military', boost: 0.4 }, unlocks: ['fascism'] },
  democracy_modern: { id: 'democracy_modern', name: '现代民主', era: 'modern', cost: 320, prereqCivics: ['capitalism'], inspiration: { predicate: 'build_a_district', boost: 0.4 }, unlocks: [] },
  communism: { id: 'communism', name: '共产主义', era: 'modern', cost: 310, prereqCivics: ['socialism'], inspiration: { predicate: 'build_a_industrial', boost: 0.4 }, unlocks: ['communism_gov'] },
  feminism: { id: 'feminism', name: '女权主义', era: 'modern', cost: 340, prereqCivics: ['humanism'], inspiration: { predicate: 'build_a_theater', boost: 0.4 }, unlocks: [] },
  environmentalism: { id: 'environmentalism', name: '环保主义', era: 'modern', cost: 330, prereqCivics: ['natural_history_ind'], inspiration: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: [] },
  // Atomic era
  nuclear_program: { id: 'nuclear_program', name: '核计划', era: 'atomic', cost: 400, prereqCivics: ['totalitarianism'], inspiration: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: [] },
  global_governance: { id: 'global_governance', name: '全球治理', era: 'atomic', cost: 420, prereqCivics: ['democracy_modern'], inspiration: { predicate: 'meet_3_civs', boost: 0.4 }, unlocks: [] },
  information_warfare: { id: 'information_warfare', name: '信息战', era: 'atomic', cost: 410, prereqCivics: ['communism'], inspiration: { predicate: 'win_a_battle', boost: 0.4 }, unlocks: [] },
  social_media: { id: 'social_media', name: '社交媒体', era: 'atomic', cost: 430, prereqCivics: ['feminism'], inspiration: { predicate: 'build_a_district', boost: 0.4 }, unlocks: [] },
  // Information era
  digital_democracy: { id: 'digital_democracy', name: '数字民主', era: 'information', cost: 500, prereqCivics: ['global_governance'], inspiration: { predicate: 'build_a_district', boost: 0.4 }, unlocks: ['digital_democracy_gov'] },
  future_civic: { id: 'future_civic', name: '未来市政', era: 'information', cost: 520, prereqCivics: ['social_media'], inspiration: { predicate: 'build_a_campus', boost: 0.4 }, unlocks: [] },
  smart_cities: { id: 'smart_cities', name: '智慧城市', era: 'information', cost: 510, prereqCivics: ['environmentalism'], inspiration: { predicate: 'build_a_industrial', boost: 0.4 }, unlocks: [] },
};

export type GovernmentId =
  | 'chiefdom' | 'oligarchy' | 'autocracy' | 'classical_republic'
  | 'monarchy' | 'theocracy' | 'merchant_republic' | 'democracy'
  | 'fascism' | 'communism_gov' | 'digital_democracy_gov';

export interface GovernmentDef {
  id: GovernmentId;
  name: string;
  militarySlots: number;
  economicSlots: number;
  wildcardSlots: number;
  bonus: string;
  unlockCivic: string;
}

export const GOVERNMENTS: Record<GovernmentId, GovernmentDef> = {
  chiefdom: { id: 'chiefdom', name: '酋邦', militarySlots: 1, economicSlots: 1, wildcardSlots: 0, bonus: '每城 +1 产能', unlockCivic: 'code_of_laws' },
  oligarchy: { id: 'oligarchy', name: '寡头', militarySlots: 2, economicSlots: 1, wildcardSlots: 0, bonus: '近战/骑兵 +4 CS', unlockCivic: 'military_tradition' },
  autocracy: { id: 'autocracy', name: '独裁', militarySlots: 1, economicSlots: 1, wildcardSlots: 1, bonus: '全单位 +2 CS', unlockCivic: 'state_workforce' },
  classical_republic: { id: 'classical_republic', name: '古典共和', militarySlots: 1, economicSlots: 2, wildcardSlots: 0, bonus: '每城 +1 产能 +1 文化', unlockCivic: 'political_philosophy' },
  monarchy: { id: 'monarchy', name: '君主', militarySlots: 2, economicSlots: 1, wildcardSlots: 1, bonus: '每城 +2 金币', unlockCivic: 'feudalism' },
  theocracy: { id: 'theocracy', name: '神权', militarySlots: 1, economicSlots: 1, wildcardSlots: 1, bonus: '圣地信仰产出 +50%（被动，不消费信仰）', unlockCivic: 'theology' },
  merchant_republic: { id: 'merchant_republic', name: '商业共和', militarySlots: 1, economicSlots: 2, wildcardSlots: 1, bonus: '每城 +2 金币', unlockCivic: 'guilds' },
  democracy: { id: 'democracy', name: '民主', militarySlots: 1, economicSlots: 3, wildcardSlots: 1, bonus: '每城 +1 住房', unlockCivic: 'enlightenment' },
  fascism: { id: 'fascism', name: '法西斯主义', militarySlots: 3, economicSlots: 1, wildcardSlots: 1, bonus: '军事单位 +5 战斗力', unlockCivic: 'totalitarianism' },
  communism_gov: { id: 'communism_gov', name: '共产主义', militarySlots: 2, economicSlots: 2, wildcardSlots: 1, bonus: '每城 +1 产能', unlockCivic: 'communism' },
  digital_democracy_gov: { id: 'digital_democracy_gov', name: '数字民主', militarySlots: 1, economicSlots: 3, wildcardSlots: 2, bonus: '每城 +1 科技', unlockCivic: 'digital_democracy' },
};

export type PolicyCardType = 'military' | 'economic' | 'wildcard' | 'diplomatic';

export interface PolicyCardDef {
  id: string;
  name: string;
  type: PolicyCardType;
  effect: string;
  unlockCivic: string;
}

// MVP 11 张（外交卡 diplomatic 类型枚举保留但不发放）
export const POLICY_CARDS: Record<string, PolicyCardDef> = {
  discipline: { id: 'discipline', name: '纪律', type: 'military', effect: '对蛮族 +5 CS', unlockCivic: 'code_of_laws' },
  maneuver: { id: 'maneuver', name: '谋略', type: 'military', effect: '近战 +4 CS', unlockCivic: 'military_tradition' },
  discipline_b: { id: 'discipline_b', name: '战意', type: 'military', effect: '远程单位 +5 CS', unlockCivic: 'military_tradition' },
  urban_planning: { id: 'urban_planning', name: '城市规划', type: 'economic', effect: '每城 +1 产能', unlockCivic: 'state_workforce' },
  intermediate: { id: 'intermediate', name: '内部事务', type: 'economic', effect: '每城 +1 金币', unlockCivic: 'political_philosophy' },
  natural_philosophy: { id: 'natural_philosophy', name: '自然哲学', type: 'economic', effect: '学院相邻加成 ×2', unlockCivic: 'political_philosophy' },
  mason: { id: 'mason', name: '砖瓦匠', type: 'economic', effect: '城墙产能成本 -50%', unlockCivic: 'state_workforce' },
  fisheries: { id: 'fisheries', name: '渔业', type: 'economic', effect: '渔船 +1 食物', unlockCivic: 'code_of_laws' },
  craftsman: { id: 'craftsman', name: '工匠', type: 'economic', effect: '工坊 +1 产能', unlockCivic: 'guilds' },
  enlightenment_card: { id: 'enlightenment_card', name: '启蒙', type: 'wildcard', effect: '每城 +1 科技', unlockCivic: 'enlightenment' },
  drama: { id: 'drama', name: '戏剧', type: 'wildcard', effect: '剧院区域 +2 文化', unlockCivic: 'drama_poetry' },
};
