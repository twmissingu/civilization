// 游戏状态类型（逻辑层核心）
// 确定性：所有随机从 GameState.seed 经 createRng(seed).fork(...) 派生，无 mutable RNG 实例存于状态中。

import type { HexCoord } from '../../types';
import type { GameMap } from '../state/mapgen';
import type { DistrictType, GovernmentId } from '../../gamedata';

export type Difficulty = 'easy' | 'standard' | 'hard';
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
  log: GameEvent[];
}
