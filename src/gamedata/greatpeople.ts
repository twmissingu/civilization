// 大人物数据定义
export type GreatPersonType = 'general' | 'scientist' | 'engineer' | 'merchant' | 'artist';

export interface GreatPersonDef {
  id: string;
  name: string;
  type: GreatPersonType;
  era: string;
  cost: number; // 伟人点积累门槛
  effect: { name: string; description: string };
  /** 效果类型，供逻辑层解析 */
  effectType: string;
  /** 效果参数 */
  effectValue?: number;
  /** 效果目标 */
  effectTarget?: string;
}

export const GREAT_PEOPLE: Record<string, GreatPersonDef> = {
  // 大将军
  alexander: {
    id: 'alexander', name: '亚历山大', type: 'general', era: 'classical', cost: 60,
    effect: { name: '征服', description: '所有近战单位 +5 战斗力，持续 10 回合' },
    effectType: 'combat_bonus', effectValue: 5, effectTarget: 'melee',
  },
  caesar: {
    id: 'caesar', name: '凯撒', type: 'general', era: 'classical', cost: 60,
    effect: { name: '高卢战记', description: '占领城市时获得 200 金币' },
    effectType: 'gold_on_capture', effectValue: 200,
  },
  genghis: {
    id: 'genghis', name: '成吉思汗', type: 'general', era: 'medieval', cost: 120,
    effect: { name: '蒙古铁骑', description: '骑乘单位 +1 移动力' },
    effectType: 'move_bonus', effectValue: 1, effectTarget: 'mounted',
  },
  // 大科学家
  archimedes: {
    id: 'archimedes', name: '阿基米德', type: 'scientist', era: 'classical', cost: 60,
    effect: { name: '杠杆原理', description: '立即获得 1 个随机古典科技' },
    effectType: 'free_tech', effectValue: 1, effectTarget: 'classical',
  },
  newton: {
    id: 'newton', name: '牛顿', type: 'scientist', era: 'renaissance', cost: 180,
    effect: { name: '万有引力', description: '立即获得 2 个随机文艺复兴科技' },
    effectType: 'free_tech', effectValue: 2, effectTarget: 'renaissance',
  },
  einstein: {
    id: 'einstein', name: '爱因斯坦', type: 'scientist', era: 'modern', cost: 300,
    effect: { name: '相对论', description: '所有科技产出 +20%' },
    effectType: 'science_mult', effectValue: 20,
  },
  // 大工程师
  imhotep: {
    id: 'imhotep', name: '伊姆霍特普', type: 'engineer', era: 'ancient', cost: 30,
    effect: { name: '金字塔', description: '立即完成当前在建奇观 15% 产能' },
    effectType: 'wonder_boost', effectValue: 15,
  },
  leonardo: {
    id: 'leonardo', name: '达芬奇', type: 'engineer', era: 'renaissance', cost: 180,
    effect: { name: '天才', description: '立即获得 1 个随机文艺复兴科技 + 1 个随机市政' },
    effectType: 'free_tech_civic', effectValue: 1, effectTarget: 'renaissance',
  },
  watts: {
    id: 'watts', name: '瓦特', type: 'engineer', era: 'industrial', cost: 240,
    effect: { name: '蒸汽机', description: '所有工厂 +2 产能' },
    effectType: 'factory_bonus', effectValue: 2,
  },
  // 大商人
  marco_polo: {
    id: 'marco_polo', name: '马可波罗', type: 'merchant', era: 'medieval', cost: 120,
    effect: { name: '东方见闻', description: '立即获得 500 金币' },
    effectType: 'gold_bonus', effectValue: 500,
  },
  columbus: {
    id: 'columbus', name: '哥伦布', type: 'merchant', era: 'renaissance', cost: 180,
    effect: { name: '新大陆', description: '所有城市 +1 贸易路线' },
    effectType: 'trade_route', effectValue: 1,
  },
  // 大艺术家
  homer: {
    id: 'homer', name: '荷马', type: 'artist', era: 'ancient', cost: 30,
    effect: { name: '史诗', description: '立即获得 200 文化值' },
    effectType: 'culture_bonus', effectValue: 200,
  },
  shakespeare: {
    id: 'shakespeare', name: '莎士比亚', type: 'artist', era: 'renaissance', cost: 180,
    effect: { name: '戏剧', description: '所有城市 +2 文化' },
    effectType: 'culture_per_city', effectValue: 2,
  },
  beethoven: {
    id: 'beethoven', name: '贝多芬', type: 'artist', era: 'industrial', cost: 240,
    effect: { name: '交响乐', description: '所有剧院区域 +4 文化' },
    effectType: 'theater_bonus', effectValue: 4,
  },
};

/** 大人物类型产出对应关系（伟人点来源） */
export const GREAT_PERSON_TYPE_LABEL: Record<GreatPersonType, string> = {
  general: '大将军',
  scientist: '大科学家',
  engineer: '大工程师',
  merchant: '大商人',
  artist: '大艺术家',
};

/** 大人物类型对应的产出格言 */
export const GREAT_PERSON_TYPE_YIELD: Record<GreatPersonType, string> = {
  general: 'production',
  scientist: 'science',
  engineer: 'production',
  merchant: 'gold',
  artist: 'culture',
};