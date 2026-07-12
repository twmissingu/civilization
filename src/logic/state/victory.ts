// 胜利判定（科技/统治/分数）
import type { GameState, PlayerState } from './types';

export function checkVictory(state: GameState): { winnerId: string; type: string } | null {
  // 科技胜利：某玩家完成航天阶段 3
  for (const p of state.players) {
    for (const c of p.cities) {
      if (c.spaceProject && c.spaceProject.stage >= 3 && c.spaceProject.progress >= 1500) {
        return { winnerId: p.id, type: 'science' };
      }
    }
  }
  // 统治胜利：占领全部其他文明的原始首都
  const alive = state.players.filter((p) => p.cities.length > 0 || p.capitalCityId);
  for (const p of alive) {
    const others = alive.filter((o) => o.id !== p.id);
    if (others.length === 0) continue;
    const allCapsCaptured = others.every((o) => o.capitalCityId === null);
    if (allCapsCaptured && p.cities.length > 0) {
      return { winnerId: p.id, type: 'domination' };
    }
  }
  // 分数胜利：回合上限
  if (state.turn >= state.config.maxTurns) {
    let best: PlayerState | null = null;
    let bestScore = -1;
    for (const p of state.players) {
      const s = playerScore(p);
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (best) return { winnerId: best.id, type: 'score' };
  }
  return null;
}

export function playerScore(p: PlayerState): number {
  const cities = p.cities.length;
  const pop = p.cities.reduce((a, c) => a + c.population, 0);
  const techs = p.researchedTechs.length;
  const wonders = p.cities.reduce((a, c) => a + c.wonders.length, 0);
  const territory = p.cities.reduce((a, c) => a + c.territory.length, 0);
  const civics = p.researchedCivics.length;
  const faith = p.faith;
  return (
    cities * 5 +
    pop * 1 +
    techs * 3 +
    wonders * 10 +
    Math.floor(territory * 0.5) +
    civics * 3 +
    Math.floor(faith * 0.1)
  );
}
