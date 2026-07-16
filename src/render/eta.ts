// 回合估算辅助函数（渲染层只读，复用逻辑层纯函数）
import type { PlayerState, CityState } from '../logic/state/types';
import type { GameState } from '../logic/state/types';
import { cityYield } from '../logic/state/yield';
import { foodThreshold } from '../logic/state/city';
import { playerYield } from '../logic/state/yield';
import { techCost } from '../gamedata';
import { TECHS, CIVICS } from '../gamedata';

export function turnsToCompleteTech(state: GameState, player: PlayerState, techId: string, progress: number): number | null {
  const tech = TECHS[techId];
  if (!tech) return null;
  const total = playerYield(state, player);
  if (total.science <= 0) return null;
  const remaining = techCost(tech, player.researchedTechs.length) - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / total.science);
}

export function turnsToCompleteCivic(state: GameState, player: PlayerState, civicId: string, progress: number): number | null {
  const civic = CIVICS[civicId];
  if (!civic) return null;
  const total = playerYield(state, player);
  if (total.culture <= 0) return null;
  const remaining = civic.cost - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / total.culture);
}

export function turnsToCompleteProduction(state: GameState, city: CityState, cost: number, progress: number): number | null {
  const y = cityYield(state, city);
  if (y.production <= 0) return null;
  const remaining = cost - progress;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / y.production);
}

export function turnsToPopulationGrowth(state: GameState, city: CityState): number | null {
  const y = cityYield(state, city);
  const netFood = y.food - city.population * 2;
  if (netFood <= 0) return null;
  const threshold = foodThreshold(city.population);
  const remaining = threshold - city.food;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / netFood);
}

export function formatTurns(n: number | null): string {
  if (n === null) return '∞';
  if (n <= 0) return '完成';
  return `约 ${n} 回合`;
}
