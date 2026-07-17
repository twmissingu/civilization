// 宗教数据定义（万神殿、信仰名称、单位成本）

export interface PantheonDef {
  id: string;
  name: string;
  effect: string;
  effectType: string;
  effectValue?: number;
  effectTarget?: string;
}

export const PANTHEONS: Record<string, PantheonDef> = {
  fertility_rites: { id: 'fertility_rites', name: '丰产仪式', effect: '城市人口增长速度 +10%', effectType: 'food_bonus', effectValue: 10 },
  god_of_the_forge: { id: 'god_of_the_forge', name: '锻造之神', effect: '训练军事单位时产能 +25%', effectType: 'military_production', effectValue: 25 },
  god_of_the_sea: { id: 'god_of_the_sea', name: '海洋之神', effect: '渔船 +1 产能', effectType: 'sea_improvement', effectValue: 1 },
  god_of_the_open_sky: { id: 'god_of_the_open_sky', name: '天空之神', effect: '牧场 +1 文化', effectType: 'pasture_culture', effectValue: 1 },
  goddess_of_the_hunt: { id: 'goddess_of_the_hunt', name: '狩猎女神', effect: '营地 +1 食物 +1 产能', effectType: 'camp_bonus', effectValue: 1 },
  monument_to_the_gods: { id: 'monument_to_the_gods', name: '众神纪念碑', effect: '奇观建造速度 +15%', effectType: 'wonder_production', effectValue: 15 },
  religious_settlements: { id: 'religious_settlements', name: '宗教定居', effect: '城市边界扩张速度 +15%', effectType: 'border_growth', effectValue: 15 },
  city_patron: { id: 'city_patron', name: '城市守护神', effect: '圣城 +1 产能 +1 金币', effectType: 'holy_city_yield', effectValue: 1 },
};

/** 创立宗教所需信仰值 */
export const RELIGION_FOUND_FAITH_COST = 100;

/** 选择万神殿所需信仰值 */
export const PANTHEON_FAITH_THRESHOLD = 25;

/** 传教士信仰成本 */
export const MISSIONARY_FAITH_COST = 100;

/** 使徒信仰成本 */
export const APOSTLE_FAITH_COST = 200;

/** 传教士传播压力 */
export const MISSIONARY_SPREAD_PRESSURE = 10;

/** 使徒传播压力 */
export const APOSTLE_SPREAD_PRESSURE = 20;

/** 被动压力每回合（圣城所在城市对其余城市产生） */
export const PASSIVE_PRESSURE_PER_TURN = 1;

/** 转化阈值：某宗教压力超过此值时城市改宗 */
export const CONVERSION_THRESHOLD = 15;

/** 宗教名称列表 */
export const RELIGION_NAMES = [
  '佛教', '基督教', '伊斯兰教', '印度教', '道教', '儒教', '神道教', '犹太教',
];