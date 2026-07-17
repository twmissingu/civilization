// 城邦逻辑：使者分配、宗主国判定、加成计算
import type { GameState, PlayerState, CityStateInstance } from './types';
import { CITY_STATES, type CityStateType } from '../../gamedata';
import { isDefeated } from './commands';

/** 计算所有城邦的宗主国（基于使者数量） */
export function recomputeSuzerains(state: GameState): void {
  for (const cs of state.cityStates) {
    if (!cs.isAlive) { cs.suzerainId = null; continue; }
    let bestPlayer: string | null = null;
    let bestCount = -1;
    for (const [playerId, count] of Object.entries(cs.envoys)) {
      const p = state.players.find((pl) => pl.id === playerId);
      if (!p || isDefeated(p)) continue;
      if (count > bestCount) {
        bestCount = count;
        bestPlayer = playerId;
      }
    }
    cs.suzerainId = bestPlayer;
  }
}

/** 检查玩家能否派遣使者到某城邦 */
export function canSendEnvoy(state: GameState, player: PlayerState, cityStateId: string): boolean {
  if (player.storedEnvoys <= 0) return false;
  const cs = state.cityStates.find((c) => c.id === cityStateId);
  if (!cs || !cs.isAlive) return false;
  return true;
}

/** 派遣使者到城邦 */
export function sendEnvoy(state: GameState, player: PlayerState, cityStateId: string): void {
  player.storedEnvoys -= 1;
  const cs = state.cityStates.find((c) => c.id === cityStateId)!;
  cs.envoys[player.id] = (cs.envoys[player.id] ?? 0) + 1;
  recomputeSuzerains(state);
}

/** 获取玩家在某城邦的使者数 */
export function envoyCount(cs: CityStateInstance, playerId: string): number {
  return cs.envoys[playerId] ?? 0;
}

/** 玩家是否为某城邦宗主国 */
export function isSuzerain(cs: CityStateInstance, playerId: string): boolean {
  return cs.suzerainId === playerId;
}

/** 判断玩家是否拥有至少一个城邦宗主国 */
export function hasAnySuzerain(state: GameState, playerId: string): boolean {
  return state.cityStates.some((cs) => cs.isAlive && cs.suzerainId === playerId);
}

/** 获取城邦类型加成值（每使者产出） */
export function envoyYieldPerEnvoy(type: CityStateType): { science?: number; culture?: number; gold?: number; faith?: number; production?: number } {
  switch (type) {
    case 'scientific': return { science: 2 };
    case 'cultural': return { culture: 2 };
    case 'economic': return { gold: 3 };
    case 'religious': return { faith: 2 };
    case 'military':
    case 'industrial': return { production: 2 };
  }
}

/** 计算玩家从城邦获得的总产出加成 */
export function cityStateYieldBonus(state: GameState, player: PlayerState): { science: number; culture: number; gold: number; faith: number; production: number } {
  const result = { science: 0, culture: 0, gold: 0, faith: 0, production: 0 };
  for (const cs of state.cityStates) {
    if (!cs.isAlive) continue;
    const def = CITY_STATES[cs.id];
    if (!def) continue;
    const count = envoyCount(cs, player.id);
    if (count <= 0) continue;
    const bonus = envoyYieldPerEnvoy(def.type);
    if (bonus.science) result.science += bonus.science * count;
    if (bonus.culture) result.culture += bonus.culture * count;
    if (bonus.gold) result.gold += bonus.gold * count;
    if (bonus.faith) result.faith += bonus.faith * count;
    if (bonus.production) result.production += bonus.production * count;
    // 宗主国额外加成
    if (isSuzerain(cs, player.id)) {
      // 具体加成在 yield.ts 或 turnResolution 中应用
    }
  }
  return result;
}