// 游戏状态类型（逻辑层核心）
// 确定性：所有随机从 GameState.seed 经 createRng(seed).fork(...) 派生，无 mutable RNG 实例存于状态中。

import type { HexCoord } from '../../types';
import type { GameMap } from '../state/mapgen';
import type { DistrictType, GovernmentId, Yield } from '../../gamedata';

export type Difficulty = 'settler' | 'chieftain' | 'warlord' | 'prince' | 'king' | 'emperor';
export type Visibility = 'unexplored' | 'explored' | 'visible';
export type DiplomacyState = 'peace' | 'war';

export interface UnitState {
  id: string;
  ownerId: string;
  type: string; // unit def id
  tile: HexCoord;
  hp: number;
  moveLeft: number;
  xp: number;
  level: number;
  promotions: string[];
  charges?: number; // 建造者充能
  tradeRouteId?: string; // 关联的贸易路线 id
  hasActed: boolean; // 本回合是否已攻击/行动
}

export interface DistrictInstance {
  type: DistrictType;
  tile: HexCoord;
}

export interface ProductionItem {
  kind: 'unit' | 'building' | 'district' | 'wonder' | 'project';
  id: string;
  progress: number; // 已积累产能
  tile?: HexCoord; // 区域/奇观占格
}

export interface CityState {
  id: string;
  ownerId: string;
  name: string;
  tile: HexCoord; // 城中心
  territory: HexCoord[]; // 已归属地块（含城中心）
  workedTiles: HexCoord[]; // 市民工作的地块（长度 ≤ population）
  population: number;
  food: number; // 累积食物
  culture: number; // 累积文化（扩张用）
  housing: number;
  amenities: number;
  buildings: string[];
  districts: DistrictInstance[];
  wonders: { id: string; tile: HexCoord }[];
  queue: ProductionItem[];
  hp: number;
  wallsHp: number;
  wallsMax: number;
  isCapital: boolean;
  rangedStrikeUsed: boolean;
  spaceProject?: { stage: 1 | 2 | 3; progress: number };
  religion: Record<string, number>; // religionId -> 压力值
  dominantReligion: string | null; // 当前主流宗教
}

export interface TradeRouteInstance {
  id: string;
  ownerId: string;
  traderId: string;
  fromCityId: string;
  toCityId: string;
  toPlayerId: string; // 目标城市所属玩家
  turnsCompleted: number;
  turnsTotal: number;
  yieldPerTurn: Yield;
}

export interface PlayerState {
  id: string;
  civId: string;
  isAI: boolean;
  researchedTechs: string[];
  currentResearch: { techId: string; progress: number } | null;
  researchedCivics: string[];
  currentCivic: { civicId: string; progress: number } | null;
  government: GovernmentId;
  policySlots: (string | null)[]; // 卡 id
  gold: number;
  faith: number;
  cities: CityState[];
  units: UnitState[];
  capitalCityId: string | null;
  buildersBuilt: number;
  settlersBuilt: number;
  districtsBuilt: number;
  era: string;
  storedEnvoys: number; // 可用使者数
  greatPersonPoints: Record<string, number>; // greatPersonType -> accumulated points
  recruitedGreatPeople: string[]; // 已招募的大人物 id
  tradeRoutes: TradeRouteInstance[]; // 活跃贸易路线
  tradeRouteCapacity: number; // 贸易路线容量
  pantheon: string | null; // 已选万神殿 id
  religionId: string | null; // 创立宗教 id
  holyCityId: string | null; // 圣城城市 id
  religionName: string | null; // 宗教名称
	totalTourism: number; // 累计旅游产出
  totalCultureGenerated: number; // 累计文化产出
}

export interface GameEvent {
  kind: string;
  turn: number;
  payload: Record<string, unknown>;
}

export interface GameConfig {
  mapSize: { width: number; height: number };
  civChoices: { id: string; isAI: boolean }[]; // 玩家+AI 文明
  difficulty: Difficulty;
  maxTurns: number;
}

export interface CityStateInstance {
  id: string; // 对应 citystate def id
  envoys: Record<string, number>; // playerId -> envoy count
  suzerainId: string | null; // 当前宗主国 playerId
  isAlive: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  config: GameConfig;
  turn: number;
  currentPlayerIndex: number;
  status: 'active' | 'finished';
  winner: string | null;
  victoryType: string | null;
  map: GameMap;
  players: PlayerState[];
  diplomacy: Record<string, Record<string, DiplomacyState>>; // [a][b]
  unitIdCounter: number;
  cityIdCounter: number;
  cityStates: CityStateInstance[]; // 城邦实例
}
