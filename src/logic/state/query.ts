// 查询助手（只读访问游戏状态）
import type { HexCoord } from '../../types';
import type { GameState, PlayerState, UnitState, CityState } from './types';
import { hexEquals } from '../hex';

export function findUnit(state: GameState, unitId: string): UnitState | undefined {
  for (const p of state.players) for (const u of p.units) if (u.id === unitId) return u;
  return undefined;
}

export function findCity(state: GameState, cityId: string): CityState | undefined {
  for (const p of state.players) for (const c of p.cities) if (c.id === cityId) return c;
  return undefined;
}

export function currentPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex];
}

export function unitAt(state: GameState, coord: HexCoord): UnitState | undefined {
  for (const p of state.players) for (const u of p.units) if (hexEquals(u.tile, coord)) return u;
  return undefined;
}
