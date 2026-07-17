// 回合结算（确定性）
import type { GameState } from './types';
import { UNITS, TECHS, CIVICS } from '../../gamedata';
import { settleCity } from './city';
import { advanceResearch, computeEra } from './tech';
import { advanceCivic } from './civic';
import { playerYield } from './yield';
import { checkVictory } from './victory';
import { processTradeRoutes } from './traderoute';
import { computePassiveReligiousPressure } from './religion';
import { techCost } from '../../gamedata';

export function resolveTurn(state: GameState): void {
  state.turn += 1;
  // 处理贸易路线（在所有玩家产出结算前，先处理路线完成和金币产出）
  processTradeRoutes(state);
  // 处理被动宗教压力
  computePassiveReligiousPressure(state);
  for (const player of state.players) {
    for (const city of player.cities) settleCity(state, city);
    const y = playerYield(state, player);
    // 苏格拉底之问（希腊）：文化 +10%
    const science = player.civId === 'china' ? Math.round(y.science * 1.1) : y.science;
    const culture = player.civId === 'greece' ? Math.round(y.culture * 1.1) : y.culture;
    // 朝代更替（中国）：时代进阶时，在建科技/市政 +20% 进度
    const newEra = computeEra(player.researchedTechs);
    if (player.civId === 'china' && newEra !== player.era) {
      if (player.currentResearch) {
        const t = TECHS[player.currentResearch.techId];
        if (t) player.currentResearch.progress += Math.round(techCost(t, player.researchedTechs.length) * 0.2);
      }
      if (player.currentCivic) {
        const c = CIVICS[player.currentCivic.civicId];
        if (c) player.currentCivic.progress += Math.round(c.cost * 0.2);
      }
    }
    player.era = newEra;
    if (player.currentResearch) advanceResearch(player, science);
    if (player.currentCivic) advanceCivic(player, culture);
    player.gold += y.gold;
    player.faith += y.faith;
    player.totalTourism += Math.floor(y.culture * 0.5);
    player.totalCultureGenerated += y.culture;
    const maintenance = player.units.reduce((a, u) => a + (UNITS[u.type]?.maintenance ?? 0), 0);
    player.gold -= maintenance;
    for (const u of player.units) {
      u.moveLeft = UNITS[u.type]?.move ?? 2;
      u.hasActed = false;
      if (u.hp < 100) u.hp = Math.min(100, u.hp + 10);
    }
    for (const c of player.cities) c.rangedStrikeUsed = false;
    // Rebellion: cities with amenities < 0 lose population
    for (const c of player.cities) {
      if (c.amenities < 0 && c.population > 1) {
        c.food = 0;
        c.population -= 1;
        state.log.push({ kind: 'CityRebellion', turn: state.turn, payload: { cityId: c.id, ownerId: player.id, population: c.population } });
      }
    }
  }
  const v = checkVictory(state);
  if (v) {
    state.status = 'finished';
    state.winner = v.winnerId;
    state.victoryType = v.type;
  }
}
