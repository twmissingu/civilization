// 3 文明定义（gamedata §8）

export interface CivilizationDef {
  id: string;
  name: string;
  ability: { name: string; description: string };
  leaderAbility: { name: string; description: string };
  uniqueUnit: string; // unit id
  uniqueBuilding: string; // building id（替代）
}

export const CIVILIZATIONS: Record<string, CivilizationDef> = {
  rome: {
    id: 'rome',
    name: '罗马（式）',
    ability: { name: '条条大路', description: '每城自动 +1 产能（基础设施优势；道路连接留待 Phase 2）' },
    leaderAbility: { name: '罗马和平', description: '占领城市后宜居度惩罚减半，持续 10 回合' },
    uniqueUnit: 'legion',
    uniqueBuilding: 'baths',
  },
  china: {
    id: 'china',
    name: '中国（式）',
    ability: { name: '朝代更替', description: '每进入新时代，所有在建科技/市政获得 20% 进度加速' },
    leaderAbility: { name: '天命', description: '每个奇观提供 +1 科技 +1 文化（全局）' },
    uniqueUnit: 'chu_ko_nu',
    uniqueBuilding: 'academy_of_arts',
  },
  greece: {
    id: 'greece',
    name: '希腊（式）',
    ability: { name: '柏拉图理想国', description: '每个万能槽额外容纳 1 张任意类型政策卡' },
    leaderAbility: { name: '苏格拉底之问', description: '解锁市政时额外获得 10% 文化值（累积到下一市政）' },
    uniqueUnit: 'hoplite',
    uniqueBuilding: 'acropolis',
  },
};
