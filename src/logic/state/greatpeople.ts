// 大人物逻辑：伟人点积累、招募、效果
import type { GameState, PlayerState } from './types';
import { GREAT_PEOPLE, TECHS, type GreatPersonType, type GreatPersonDef } from '../../gamedata';

/** 获取玩家可招募的大人物列表 */
export function availableGreatPeople(_state: GameState, player: PlayerState): { def: GreatPersonDef; playerProgress: number }[] {
  const result: { def: GreatPersonDef; playerProgress: number }[] = [];
  for (const gp of Object.values(GREAT_PEOPLE)) {
    const progress = player.greatPersonPoints[gp.type] ?? 0;
    if (progress >= gp.cost) {
      result.push({ def: gp, playerProgress: progress });
    }
  }
  return result;
}

/** 检查玩家能否招募某大人物 */
export function canRecruitGreatPerson(state: GameState, player: PlayerState, greatPersonId: string): boolean {
  const def = GREAT_PEOPLE[greatPersonId];
  if (!def) return false;
  const progress = player.greatPersonPoints[def.type] ?? 0;
  if (progress < def.cost) return false;
  // 检查是否已被招募（全局唯一性）
  for (const p of state.players) {
    if (p.recruitedGreatPeople?.includes(greatPersonId)) return false;
  }
  return true;
}

/** 招募大人物 */
export function recruitGreatPerson(state: GameState, player: PlayerState, greatPersonId: string): void {
  const def = GREAT_PEOPLE[greatPersonId];
  if (!def) return;
  player.greatPersonPoints[def.type] = (player.greatPersonPoints[def.type] ?? 0) - def.cost;
  if (!player.recruitedGreatPeople) player.recruitedGreatPeople = [];
  player.recruitedGreatPeople.push(greatPersonId);
  applyGreatPersonEffect(state, player, def);
}

/** 应用大人物效果 */
function applyGreatPersonEffect(_state: GameState, player: PlayerState, def: GreatPersonDef): void {
  switch (def.effectType) {
    case 'gold_bonus':
      player.gold += def.effectValue ?? 0;
      break;
    case 'gold_on_capture':
      // 效果在 combat.ts 中拦截
      break;
    case 'science_mult':
      // 在 yield.ts 中处理
      break;
    case 'free_tech': {
      const era = def.effectTarget ?? 'classical';
      const available = Object.values(TECHS).filter((t) => t.era === era && !player.researchedTechs.includes(t.id));
      for (let i = 0; i < (def.effectValue ?? 1) && i < available.length; i++) {
        player.researchedTechs.push(available[i].id);
      }
      break;
    }
    case 'culture_bonus':
      if (player.currentCivic) player.currentCivic.progress += def.effectValue ?? 0;
      break;
    case 'culture_per_city':
      // 常量，在 yield 中处理
      break;
    case 'wonder_boost':
      for (const c of player.cities) {
        for (const q of c.queue) {
          if (q.kind === 'wonder') q.progress += Math.round((def.effectValue ?? 15) * 0.01 * (q.progress || 1));
        }
      }
      break;
  }
}

/** 给玩家增加伟人点 */
export function addGreatPersonPoints(player: PlayerState, type: GreatPersonType, points: number): void {
  player.greatPersonPoints[type] = (player.greatPersonPoints[type] ?? 0) + points;
}

/** 获取所有待招募的大人物列表（全局池） */
export function allAvailableGreatPeople(state: GameState): GreatPersonDef[] {
  const recruited = new Set<string>();
  for (const p of state.players) {
    for (const id of p.recruitedGreatPeople ?? []) recruited.add(id);
  }
  return Object.values(GREAT_PEOPLE).filter((gp) => !recruited.has(gp.id));
}