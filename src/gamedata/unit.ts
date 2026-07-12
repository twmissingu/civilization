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
  warrior: { id: 'warrior', name: '战士', domain: 'melee', unitClass: 'military', csMelee: 20, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 40, maintenance: 1, unlockTech: 'initial' },
  slinger: { id: 'slinger', name: '投石手', domain: 'ranged', unitClass: 'military', csMelee: 15, csRanged: 15, hp: 100, move: 2, vision: 2, cost: 35, maintenance: 1, unlockTech: 'initial', ranged: 1 },
  archer: { id: 'archer', name: '弓手', domain: 'ranged', unitClass: 'military', csMelee: 15, csRanged: 25, hp: 100, move: 2, vision: 2, cost: 60, maintenance: 1, unlockTech: 'archery', ranged: 2, upgradesFrom: 'slinger' },
  swordsman: { id: 'swordsman', name: '剑士', domain: 'melee', unitClass: 'military', csMelee: 35, csRanged: 0, hp: 100, move: 2, vision: 2, cost: 90, maintenance: 2, unlockTech: 'bronze_working', upgradesFrom: 'warrior' },
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
};

/** 单位是否施加 ZOC（近战/骑乘/海军近战） */
export function exertsZOC(u: UnitDef): boolean {
  return u.domain === 'melee' || u.domain === 'cavalry' || u.domain === 'naval_melee';
}
