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
};

export type GovernmentId =
  | 'chiefdom' | 'oligarchy' | 'autocracy' | 'classical_republic'
  | 'monarchy' | 'theocracy' | 'merchant_republic' | 'democracy';

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
