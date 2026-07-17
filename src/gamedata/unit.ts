// 单位属性表（gamedata §6）

export type UnitDomain = 'melee' | 'ranged' | 'cavalry' | 'siege' | 'siege_ranged' | 'naval_melee' | 'naval_ranged' | 'civilian';
export type UnitClass = 'military' | 'civilian' | 'support';

export interface UnitDef {
  id: string;
  name: string;
  domain: UnitDomain;
  unitClass: UnitClass;
  csMelee: number;
  csRanged: number;
  hp: number;
  move: number;
  vision: number;
  cost: number;
  maintenance: number;
  unlockTech: string; // 'initial' = 开局可造
  upgradesFrom?: string;
  ranged?: number; // 射程
}

export const UNITS: Record<string, UnitDef> = {
  warrior: { id: 'warrior', name: '战士', domain: 'melee', unitClass: 'military', csMelee: 18, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 40, maintenance: 1, unlockTech: 'initial' },
  slinger: { id: 'slinger', name: '投石手', domain: 'ranged', unitClass: 'military', csMelee: 15, csRanged: 15, hp: 100, move: 2, vision: 2, cost: 35, maintenance: 1, unlockTech: 'initial', ranged: 1 },
  archer: { id: 'archer', name: '弓手', domain: 'ranged', unitClass: 'military', csMelee: 15, csRanged: 25, hp: 100, move: 2, vision: 2, cost: 60, maintenance: 1, unlockTech: 'archery', ranged: 2, upgradesFrom: 'slinger' },
  swordsman: { id: 'swordsman', name: '剑士', domain: 'melee', unitClass: 'military', csMelee: 32, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 90, maintenance: 2, unlockTech: 'bronze_working', upgradesFrom: 'warrior' },
  musketman: { id: 'musketman', name: '步枪兵', domain: 'melee', unitClass: 'military', csMelee: 40, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 280, maintenance: 3, unlockTech: 'steel', upgradesFrom: 'swordsman' },
  cavalry: { id: 'cavalry', name: '骑兵', domain: 'cavalry', unitClass: 'military', csMelee: 36, csRanged: 0, hp: 100, move: 4, vision: 2, cost: 120, maintenance: 3, unlockTech: 'horseback_riding' },
  knight: { id: 'knight', name: '骑士', domain: 'cavalry', unitClass: 'military', csMelee: 44, csRanged: 0, hp: 100, move: 4, vision: 2, cost: 180, maintenance: 3, unlockTech: 'chivalry', upgradesFrom: 'cavalry' },
  siege_tower: { id: 'siege_tower', name: '攻城塔', domain: 'siege', unitClass: 'military', csMelee: 30, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 120, maintenance: 3, unlockTech: 'siege_tactics' },
  catapult: { id: 'catapult', name: '投石机', domain: 'siege_ranged', unitClass: 'military', csMelee: 15, csRanged: 35, hp: 100, move: 2, vision: 2, cost: 180, maintenance: 3, unlockTech: 'mathematics', ranged: 2 },
  cannon: { id: 'cannon', name: '大炮', domain: 'siege_ranged', unitClass: 'military', csMelee: 20, csRanged: 45, hp: 100, move: 2, vision: 2, cost: 280, maintenance: 4, unlockTech: 'gunpowder', ranged: 2, upgradesFrom: 'catapult' },
  trireme: { id: 'trireme', name: '三列桨', domain: 'naval_melee', unitClass: 'military', csMelee: 25, csRanged: 0, hp: 100, move: 3, vision: 2, cost: 80, maintenance: 1, unlockTech: 'sailing' },
  quadrireme: { id: 'quadrireme', name: '四列桨', domain: 'naval_ranged', unitClass: 'military', csMelee: 20, csRanged: 30, hp: 100, move: 3, vision: 2, cost: 120, maintenance: 2, unlockTech: 'shipbuilding', ranged: 1, upgradesFrom: 'trireme' },
  builder: { id: 'builder', name: '建造者', domain: 'civilian', unitClass: 'civilian', csMelee: 0, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 50, maintenance: 0, unlockTech: 'initial' },
  settler: { id: 'settler', name: '开拓者', domain: 'civilian', unitClass: 'civilian', csMelee: 0, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 50, maintenance: 0, unlockTech: 'initial' },
  trader: { id: 'trader', name: '商人', domain: 'civilian', unitClass: 'civilian', csMelee: 0, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 50, maintenance: 0, unlockTech: 'currency' },
  missionary: { id: 'missionary', name: '传教士', domain: 'civilian', unitClass: 'civilian', csMelee: 0, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 0, maintenance: 0, unlockTech: 'astrology' },
  apostle: { id: 'apostle', name: '使徒', domain: 'civilian', unitClass: 'civilian', csMelee: 0, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 0, maintenance: 0, unlockTech: 'astrology' },
  crossbowman: { id: 'crossbowman', name: '弩手', domain: 'ranged', unitClass: 'military', csMelee: 20, csRanged: 35, hp: 100, move: 2, vision: 2, cost: 120, maintenance: 2, unlockTech: 'machinery', ranged: 2, upgradesFrom: 'archer' },
  pikeman: { id: 'pikeman', name: '长枪兵', domain: 'melee', unitClass: 'military', csMelee: 40, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 130, maintenance: 2, unlockTech: 'construction', upgradesFrom: 'swordsman' },
  infantry: { id: 'infantry', name: '步兵', domain: 'melee', unitClass: 'military', csMelee: 55, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 300, maintenance: 4, unlockTech: 'rifling', upgradesFrom: 'musketman' },
  tank: { id: 'tank', name: '坦克', domain: 'cavalry', unitClass: 'military', csMelee: 60, csRanged: 0, hp: 100, move: 4, vision: 2, cost: 350, maintenance: 5, unlockTech: 'combustion', upgradesFrom: 'knight' },
  fighter: { id: 'fighter', name: '战斗机', domain: 'ranged', unitClass: 'military', csMelee: 30, csRanged: 50, hp: 100, move: 2, vision: 4, cost: 400, maintenance: 5, unlockTech: 'advanced_flight', ranged: 2 },
  bomber: { id: 'bomber', name: '轰炸机', domain: 'siege_ranged', unitClass: 'military', csMelee: 20, csRanged: 60, hp: 100, move: 2, vision: 2, cost: 500, maintenance: 6, unlockTech: 'combined_arms', ranged: 3 },
  battleship: { id: 'battleship', name: '战列舰', domain: 'naval_ranged', unitClass: 'military', csMelee: 30, csRanged: 60, hp: 100, move: 3, vision: 2, cost: 400, maintenance: 5, unlockTech: 'steam_engine', ranged: 2, upgradesFrom: 'quadrireme' },
  submarine: { id: 'submarine', name: '潜艇', domain: 'naval_melee', unitClass: 'military', csMelee: 50, csRanged: 0, hp: 100, move: 3, vision: 3, cost: 350, maintenance: 4, unlockTech: 'electronics' },
  AT_crew: { id: 'AT_crew', name: '反坦克组', domain: 'melee', unitClass: 'military', csMelee: 50, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 250, maintenance: 3, unlockTech: 'replaceable_parts', upgradesFrom: 'pikeman' },
  machine_gun: { id: 'machine_gun', name: '机枪兵', domain: 'ranged', unitClass: 'military', csMelee: 20, csRanged: 55, hp: 100, move: 2, vision: 2, cost: 350, maintenance: 4, unlockTech: 'steel', ranged: 1, upgradesFrom: 'crossbowman' },
};

/** 单位晋升定义 */
export interface PromotionDef {
  id: string;
  name: string;
  domains: UnitDomain[];
  csBonus?: number;
  moveBonus?: number;
  healOnPromote?: number;
  requiresLevel?: number;
}

/** 晋升树 */
export const PROMOTIONS: Record<string, PromotionDef> = {
  // 近战晋升
  discipline: { id: 'discipline', name: '纪律', domains: ['melee'], csBonus: 5, requiresLevel: 1 },
  charge: { id: 'charge', name: '冲锋', domains: ['melee', 'cavalry'], csBonus: 7, requiresLevel: 2 },
  veteran: { id: 'veteran', name: '老兵', domains: ['melee', 'ranged'], csBonus: 10, requiresLevel: 3 },
  // 远程晋升
  volley: { id: 'volley', name: '齐射', domains: ['ranged'], csBonus: 5, requiresLevel: 1 },
  sniper: { id: 'sniper', name: '精准', domains: ['ranged'], csBonus: 7, requiresLevel: 2 },
  // 骑兵晋升
  maneuver: { id: 'maneuver', name: '机动', domains: ['cavalry'], moveBonus: 1, requiresLevel: 1 },
  shock: { id: 'shock', name: '冲击', domains: ['cavalry', 'melee'], csBonus: 5, requiresLevel: 2 },
  // 攻城晋升
  bombardment: { id: 'bombardment', name: '轰炸', domains: ['siege', 'siege_ranged'], csBonus: 7, requiresLevel: 1 },
  shell: { id: 'shell', name: '炮击', domains: ['siege_ranged', 'ranged'], csBonus: 5, requiresLevel: 2 },
  // 海军晋升
  naval_maneuver: { id: 'naval_maneuver', name: '航海术', domains: ['naval_melee', 'naval_ranged'], moveBonus: 1, requiresLevel: 1 },
  broadside: { id: 'broadside', name: '舷炮', domains: ['naval_melee', 'naval_ranged'], csBonus: 5, requiresLevel: 2 },
};

/** 单位是否施加 ZOC（近战/骑乘/海军近战） */
export function exertsZOC(u: UnitDef): boolean {
  return u.domain === 'melee' || u.domain === 'cavalry' || u.domain === 'naval_melee';
}
