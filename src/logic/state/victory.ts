// 胜利判定（科技/统治/分数/宗教）
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
  // 宗教胜利：某玩家宗教是其他所有存活玩家城市的主流宗教
  for (const p of state.players) {
    if (!p.religionId) continue;
    const others = state.players.filter((o) => o.id !== p.id && o.cities.length > 0);
    if (others.length === 0) continue;
    const allConverted = others.every((o) =>
      o.cities.every((c) => c.dominantReligion === p.religionId)
    );
    if (allConverted) {
      return { winnerId: p.id, type: 'religion' };
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
  // 文化胜利：某玩家旅游产出超过其他所有玩家累计文化产出的 50%
  for (const p of state.players) {
    if (p.totalTourism <= 0) continue;
    const others = state.players.filter((o) => o.id !== p.id);
    if (others.length === 0) continue;
    const allExceeded = others.every((o) => p.totalTourism > o.totalCultureGenerated * 0.5);
    if (allExceeded) {
      return { winnerId: p.id, type: 'culture' };
    }
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
