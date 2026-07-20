// 回合估算辅助函数（渲染层只读，复用逻辑层纯函数）
import type { PlayerState, CityState } from '../logic/state/types';
import type { GameState } from '../logic/state/types';
import { getCityYield, getFoodThreshold, getPlayerYield } from '../logic/state/query';
import { techCost } from '../gamedata';
import { TECHS, CIVICS } from '../gamedata';

export function turnsToCompleteTech(state: GameState, player: PlayerState, techId: string, progress: number): number | null {
  const tech = TECHS[techId];
  if (!tech) return null;
  const total = getPlayerYield(state, player.id);
  if (total.science <= 0) return null;
  const remaining = techCost(tech, player.researchedTechs.length) - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / total.science);
}

export function turnsToCompleteCivic(state: GameState, player: PlayerState, civicId: string, progress: number): number | null {
  const civic = CIVICS[civicId];
  if (!civic) return null;
  const total = getPlayerYield(state, player.id);
  if (total.culture <= 0) return null;
  const remaining = civic.cost - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / total.culture);
}

export function turnsToCompleteProduction(state: GameState, city: CityState, cost: number, progress: number): number | null {
  const y = getCityYield(state, city.id);
  if (y.production <= 0) return null;
  const remaining = cost - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / y.production);
}

export function turnsToPopulationGrowth(state: GameState, city: CityState): number | null {
  const y = getCityYield(state, city.id);
  const netFood = y.food - city.population * 2;
  if (netFood <= 0) return null;
  const threshold = getFoodThreshold(city.population);
  const remaining = threshold - city.food;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / netFood);
}

export function formatTurns(n: number | null): string {
  if (n === null) return '∞';
  if (n <= 0) return '完成';
  return `约 ${n} 回合`;
}
