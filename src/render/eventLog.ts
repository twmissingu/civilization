// 事件日志结构化文本（渲染层只读）
import type { GameState, GameEvent } from '../logic/state/types';
import { CIVILIZATIONS, GOVERNMENTS, UNITS } from '../gamedata';
import type { GovernmentId } from '../gamedata';

function playerById(state: GameState, playerId: string) {
  return state.players.find((p) => p.id === playerId);
}

function civName(state: GameState, playerId: string): string {
  const p = playerById(state, playerId);
  return CIVILIZATIONS[p?.civId ?? '']?.name ?? '未知文明';
}

function unitById(state: GameState, unitId: string) {
  return state.players.flatMap((p) => p.units).find((u) => u.id === unitId);
}

function unitName(state: GameState, unitId: string): string {
  const u = unitById(state, unitId);
  return UNITS[u?.type ?? '']?.name ?? '单位';
}

function cityById(state: GameState, cityId: string) {
  return state.players.flatMap((p) => p.cities).find((c) => c.id === cityId);
}

function cityName(state: GameState, cityId: string): string {
  return cityById(state, cityId)?.name ?? '城市';
}

function coordStr(coord: { q: number; r: number }): string {
  return `(${coord.q},${coord.r})`;
}

function getString(p: Record<string, unknown>, key: string, fallback = ''): string {
  const v = p[key];
  return typeof v === 'string' ? v : fallback;
}

function getNumber(p: Record<string, unknown>, key: string, fallback = 0): number {
  const v = p[key];
  return typeof v === 'number' ? v : fallback;
}

function getBool(p: Record<string, unknown>, key: string, fallback = false): boolean {
  const v = p[key];
  return typeof v === 'boolean' ? v : fallback;
}

function getCoord(p: Record<string, unknown>, key: string, fallback = { q: 0, r: 0 }): { q: number; r: number } {
  const v = p[key];
  if (v && typeof v === 'object' && 'q' in v && 'r' in v) {
    const c = v as { q: unknown; r: unknown };
    if (typeof c.q === 'number' && typeof c.r === 'number') return { q: c.q, r: c.r };
  }
  return fallback;
}

export function formatEvent(state: GameState, event: GameEvent): string {
  const p = event.payload;
  switch (event.kind) {
    case 'CityFounded': {
      const cityId = getString(p, 'cityId');
      const ownerId = cityById(state, cityId)?.ownerId ?? '';
      return `第 ${event.turn} 回合 · ${civName(state, ownerId)} 建立 ${cityName(state, cityId)}`;
    }
    case 'CombatResolved': {
      const attackerId = getString(p, 'attackerId');
      const defenderId = getString(p, 'defenderId');
      const killed = getBool(p, 'defenderKilled');
      const damage = getNumber(p, 'defenderDamage');
      const defenderTile = getCoord(p, 'defenderTile', unitById(state, defenderId)?.tile ?? { q: 0, r: 0 });
      const attackerOwner = unitById(state, attackerId)?.ownerId ?? '';
      const defenderOwner = unitById(state, defenderId)?.ownerId ?? '';
      if (killed) {
        return `第 ${event.turn} 回合 · ${civName(state, attackerOwner)} 在 ${coordStr(defenderTile)} 击败 ${civName(state, defenderOwner)} ${unitName(state, defenderId)}`;
      }
      return `第 ${event.turn} 回合 · ${civName(state, attackerOwner)} ${unitName(state, attackerId)} 攻击 ${civName(state, defenderOwner)} ${unitName(state, defenderId)}，造成 ${damage} 伤害`;
    }
    case 'CityAttacked': {
      const attackerId = getString(p, 'attackerId');
      const cityId = getString(p, 'cityId');
      const damage = getNumber(p, 'defenderDamage');
      return `第 ${event.turn} 回合 · ${civName(state, playerById(state, attackerId)?.id ?? '')} 攻击 ${cityName(state, cityId)}，造成 ${damage} 伤害`;
    }
    case 'WarDeclared': {
      const attackerId = getString(p, 'attackerId');
      const targetId = getString(p, 'targetCivId');
      return `第 ${event.turn} 回合 · ${civName(state, attackerId)} 向 ${civName(state, targetId)} 宣战`;
    }
    case 'PeaceDeclared': {
      return `第 ${event.turn} 回合 · ${civName(state, getString(p, 'civA'))} 与 ${civName(state, getString(p, 'civB'))} 议和`;
    }
    case 'GovernmentChanged': {
      const govId = getString(p, 'governmentType') as GovernmentId;
      const govName = GOVERNMENTS[govId]?.name ?? p.governmentType;
      return `第 ${event.turn} 回合 · ${civName(state, getString(p, 'playerId'))} 切换政体为 ${govName}`;
    }
    case 'GameWon': {
      return `第 ${event.turn} 回合 · ${civName(state, getString(p, 'victor'))} 取得 ${getString(p, 'victoryType', '未知')} 胜利！🏆`;
    }
    case 'UnitPromoted': {
      return `第 ${event.turn} 回合 · ${unitName(state, getString(p, 'unitId'))} 获得晋升！⭐`;
    }
    case 'WonderBuilt': {
      return `第 ${event.turn} 回合 · ${civName(state, getString(p, 'builderId'))} 建成 ${getString(p, 'wonderId', '奇观')}！✨`;
    }
    case 'CityRebellion': {
      return `第 ${event.turn} 回合 · ${cityName(state, getString(p, 'cityId'))} 发生叛乱（宜居度过低），人口减少`;
    }
    default:
      return `第 ${event.turn} 回合 · ${event.kind}`;
  }
}
