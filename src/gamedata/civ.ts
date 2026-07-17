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
  egypt: {
    id: 'egypt',
    name: '埃及（式）',
    ability: { name: '尼罗河馈赠', description: '沿河城市 +2 食物' },
    leaderAbility: { name: '法老威严', description: '奇观建造速度 +15%' },
    uniqueUnit: 'war_chariot',
    uniqueBuilding: 'sphinx',
  },
  aztec: {
    id: 'aztec',
    name: '阿兹特克（式）',
    ability: { name: '五太阳纪', description: '建造者 +1 次数' },
    leaderAbility: { name: '蒙特祖玛', description: '军事单位 +2 CS' },
    uniqueUnit: 'jaguar',
    uniqueBuilding: 'temple_mayor',
  },
  england: {
    id: 'england',
    name: '英格兰（式）',
    ability: { name: '日不落', description: '港口 +1 金币，海军 +1 移动' },
    leaderAbility: { name: '维多利亚', description: '贸易路线 +4 金币' },
    uniqueUnit: 'redcoat',
    uniqueBuilding: 'royal_navy_dockyard',
  },
  america: {
    id: 'america',
    name: '美国（式）',
    ability: { name: '开国先贤', description: '所有外交政策槽 +1' },
    leaderAbility: { name: '罗斯福', description: '军事单位 +1 视野' },
    uniqueUnit: 'p51_mustang',
    uniqueBuilding: 'film_studio',
  },
  japan: {
    id: 'japan',
    name: '日本（式）',
    ability: { name: '明治维新', description: '区域相邻加成翻倍' },
    leaderAbility: { name: '幕府', description: '海岸城市 +2 产能' },
    uniqueUnit: 'samurai',
    uniqueBuilding: 'electronics_factory',
  },
  germany: {
    id: 'germany',
    name: '德国（式）',
    ability: { name: '帝国自由城市', description: '城区 +1 槽位' },
    leaderAbility: { name: '腓特烈', description: '军事单位 +3 CS' },
    uniqueUnit: 'uboat',
    uniqueBuilding: 'hansa',
  },
  france: {
    id: 'france',
    name: '法国（式）',
    ability: { name: '法国文化', description: '奇观 +20% 建造速度' },
    leaderAbility: { name: '拿破仑', description: '艺术 +2 文化' },
    uniqueUnit: 'garde_imperiale',
    uniqueBuilding: 'chateau',
  },
  russia: {
    id: 'russia',
    name: '俄罗斯（式）',
    ability: { name: '俄罗斯母亲', description: '领土 +3 格' },
    leaderAbility: { name: '彼得大帝', description: '科技 +2 每城' },
    uniqueUnit: 'cossack',
    uniqueBuilding: 'lavra',
  },
};
