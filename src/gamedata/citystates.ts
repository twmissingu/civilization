// 城邦数据定义
export type CityStateType = 'cultural' | 'scientific' | 'military' | 'economic' | 'religious' | 'industrial';

export interface CityStateDef {
  id: string;
  name: string;
  type: CityStateType;
  /** 宗主国加成描述 */
  suzerainBonus: { name: string; description: string };
  /** 城邦类型加成（所有派遣使者玩家均享受） */
  typeBonus: { name: string; description: string };
}

export const CITY_STATES: Record<string, CityStateDef> = {
  geneva: {
    id: 'geneva',
    name: '日内瓦',
    type: 'scientific',
    suzerainBonus: { name: '科学之国', description: '和平时期科技产出 +15%' },
    typeBonus: { name: '科技城邦', description: '每使者 +2 科技/回合' },
  },
  kabul: {
    id: 'kabul',
    name: '喀布尔',
    type: 'military',
    suzerainBonus: { name: '战争之犬', description: '单位升级花费用 -25%' },
    typeBonus: { name: '军事城邦', description: '每使者 +2 产能/回合用于训练单位' },
  },
  zanzibar: {
    id: 'zanzibar',
    name: '桑给巴尔',
    type: 'economic',
    suzerainBonus: { name: '香料之路', description: '每城 +4 金币' },
    typeBonus: { name: '经济城邦', description: '每使者 +3 金币/回合' },
  },
  antananarivo: {
    id: 'antananarivo',
    name: '塔那那利佛',
    type: 'cultural',
    suzerainBonus: { name: '文化之都', description: '奇观提供 +2 文化/回合' },
    typeBonus: { name: '文化城邦', description: '每使者 +2 文化/回合' },
  },
  jerusalem: {
    id: 'jerusalem',
    name: '耶路撒冷',
    type: 'religious',
    suzerainBonus: { name: '圣城', description: '自动获得该城邦信仰的宗教（MVP 中 +2 信仰/城）' },
    typeBonus: { name: '宗教城邦', description: '每使者 +2 信仰/回合' },
  },
  hong_kong: {
    id: 'hong_kong',
    name: '香港',
    type: 'industrial',
    suzerainBonus: { name: '东方之珠', description: '区域建造速度 +20%' },
    typeBonus: { name: '工业城邦', description: '每使者 +2 产能/回合' },
  },
  auckland: {
    id: 'auckland',
    name: '奥克兰',
    type: 'industrial',
    suzerainBonus: { name: '海洋之城', description: '沿海城市 +2 产能' },
    typeBonus: { name: '工业城邦', description: '每使者 +2 产能/回合' },
  },
  fez: {
    id: 'fez',
    name: '非斯',
    type: 'scientific',
    suzerainBonus: { name: '学术之城', description: '大学 +2 科技' },
    typeBonus: { name: '科技城邦', description: '每使者 +2 科技/回合' },
  },
  nan_madol: {
    id: 'nan_madol',
    name: '南马都尔',
    type: 'cultural',
    suzerainBonus: { name: '海上明珠', description: '沿海城市 +2 文化' },
    typeBonus: { name: '文化城邦', description: '每使者 +2 文化/回合' },
  },
  valletta: {
    id: 'valletta',
    name: '瓦莱塔',
    type: 'religious',
    suzerainBonus: { name: '信仰堡垒', description: '可用信仰购买城墙和建筑' },
    typeBonus: { name: '宗教城邦', description: '每使者 +2 信仰/回合' },
  },
  wolin: {
    id: 'wolin',
    name: '沃林',
    type: 'military',
    suzerainBonus: { name: '维京传承', description: '海军单位 +1 视野' },
    typeBonus: { name: '军事城邦', description: '每使者 +2 产能/回合用于训练单位' },
  },
  jakarta: {
    id: 'jakarta',
    name: '雅加达',
    type: 'economic',
    suzerainBonus: { name: '香料群岛', description: '贸易路线 +2 金币' },
    typeBonus: { name: '经济城邦', description: '每使者 +3 金币/回合' },
  },
};

/** 城邦类型名称映射 */
export const CITY_STATE_TYPE_LABEL: Record<CityStateType, string> = {
  cultural: '文化',
  scientific: '科技',
  military: '军事',
  economic: '经济',
  religious: '宗教',
  industrial: '工业',
};