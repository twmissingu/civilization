// 科技推进
import type { PlayerState } from './types';
import { TECHS, techCost } from '../../gamedata';

export const ERA_ORDER = ['ancient', 'classical', 'medieval', 'renaissance', 'industrial', 'modern', 'atomic', 'information'];

export function computeEra(researchedTechs: string[]): string {
  let maxIdx = 0;
  for (const id of researchedTechs) {
    const t = TECHS[id];
    if (t) {
      const idx = ERA_ORDER.indexOf(t.era);
      if (idx > maxIdx) maxIdx = idx;
    }
  }
  return ERA_ORDER[maxIdx];
}

export function canResearch(player: PlayerState, techId: string): boolean {
  const t = TECHS[techId];
  if (!t) return false;
  if (player.researchedTechs.includes(techId)) return false;
  if (!t.prereqTechs.every((p) => player.researchedTechs.includes(p))) return false;
  if (!(t.prereqCivics ?? []).every((c) => player.researchedCivics.includes(c))) return false;
  return true;
}

/** 推进当前研究；返回是否完成 */
export function advanceResearch(player: PlayerState, science: number): string | null {
  if (!player.currentResearch) return null;
  const t = TECHS[player.currentResearch.techId];
  if (!t) return null;
  player.currentResearch.progress += science;
  const cost = techCost(t, player.researchedTechs.length);
  if (player.currentResearch.progress >= cost) {
    player.researchedTechs.push(t.id);
    player.currentResearch = null;
    return t.id;
  }
  return null;
}

/** 尤里卡触发：+40% 成本进度 */
export function triggerEureka(player: PlayerState, techId: string): void {
  if (!player.currentResearch || player.currentResearch.techId !== techId) return;
  const t = TECHS[techId];
  if (!t) return;
  const cost = techCost(t, player.researchedTechs.length);
  player.currentResearch.progress += Math.round(cost * t.eureka.boost);
}
