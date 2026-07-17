// 区域与相邻加成规则（gamedata §2，签名机制 #1）

export type DistrictType =
  | 'campus' | 'commercial' | 'holy' | 'industrial'
  | 'encampment' | 'theater' | 'harbor' | 'aerodrome';

export interface DistrictDef {
  id: DistrictType;
  name: string;
  unlockTech: string;
}

export const DISTRICTS: Record<DistrictType, DistrictDef> = {
  campus: { id: 'campus', name: '学院', unlockTech: 'astrology' },
  commercial: { id: 'commercial', name: '商业中心', unlockTech: 'currency' },
  holy: { id: 'holy', name: '圣地', unlockTech: 'astrology' },
  industrial: { id: 'industrial', name: '工业区', unlockTech: 'iron_working' },
  encampment: { id: 'encampment', name: '军营', unlockTech: 'bronze_working' },
  theater: { id: 'theater', name: '剧院', unlockTech: 'drama_poetry_civic' },
  harbor: { id: 'harbor', name: '港口', unlockTech: 'sailing' },
  aerodrome: { id: 'aerodrome', name: '机场', unlockTech: 'advanced_flight' },
};

// 相邻加成来源类型
export type AdjacencySourceType = 'terrain' | 'feature' | 'resource' | 'district' | 'improvement' | 'building' | 'wonder';

export interface AdjacencyRule {
  district: DistrictType;
  source: string; // 地形/特征/资源/区域/改良/建筑/奇观的 id 或类别
  sourceType: AdjacencySourceType;
  bonus: number; // 每格加成（可为负）
  yieldType: 'science' | 'gold' | 'faith' | 'production' | 'culture' | 'food';
}

export const ADJACENCY_RULES: AdjacencyRule[] = [
  { district: 'campus', source: 'mountain', sourceType: 'terrain', bonus: 1, yieldType: 'science' },
  { district: 'campus', source: 'geothermal', sourceType: 'feature', bonus: 2, yieldType: 'science' },
  { district: 'campus', source: 'rainforest', sourceType: 'feature', bonus: 0.5, yieldType: 'science' },
  { district: 'campus', source: 'district', sourceType: 'district', bonus: -0.5, yieldType: 'science' },
  { district: 'commercial', source: 'river', sourceType: 'terrain', bonus: 2, yieldType: 'gold' },
  { district: 'commercial', source: 'harbor', sourceType: 'district', bonus: 2, yieldType: 'gold' },
  { district: 'commercial', source: 'district', sourceType: 'district', bonus: -0.5, yieldType: 'gold' },
  { district: 'holy', source: 'mountain', sourceType: 'terrain', bonus: 1, yieldType: 'faith' },
  { district: 'holy', source: 'district', sourceType: 'district', bonus: -0.5, yieldType: 'faith' },
  { district: 'industrial', source: 'strategic', sourceType: 'resource', bonus: 1, yieldType: 'production' },
  { district: 'industrial', source: 'quarry', sourceType: 'improvement', bonus: 1, yieldType: 'production' },
  { district: 'industrial', source: 'aqueduct', sourceType: 'building', bonus: 2, yieldType: 'production' },
  { district: 'industrial', source: 'district', sourceType: 'district', bonus: -0.5, yieldType: 'production' },
  { district: 'encampment', source: 'strategic', sourceType: 'resource', bonus: 1, yieldType: 'production' },
  { district: 'theater', source: 'wonder', sourceType: 'wonder', bonus: 2, yieldType: 'culture' },
  { district: 'theater', source: 'district', sourceType: 'district', bonus: -0.5, yieldType: 'culture' },
  { district: 'harbor', source: 'ocean_resource', sourceType: 'resource', bonus: 1, yieldType: 'gold' },
  { district: 'harbor', source: 'coast', sourceType: 'terrain', bonus: 1, yieldType: 'food' },
];
