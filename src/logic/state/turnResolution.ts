// 回合结算（确定性）
import type { GameState } from './types';
import { UNITS } from '../../gamedata';
import { settleCity } from './city';
import { advanceResearch } from './tech';
import { advanceCivic } from './civic';
import { playerYield } from './yield';
import { checkVictory } from './victory';

export function resolveTurn(state: GameState): void {
  state.turn += 1;
  for (const player of state.players) {
    for (const city of player.cities) settleCity(state, city);
    const y = playerYield(state, player);
    if (player.currentResearch) advanceResearch(player, y.science);
    if (player.currentCivic) advanceCivic(player, y.culture);
    player.gold += y.gold;
    player.faith += y.faith;
    const maintenance = player.units.reduce((a, u) => a + (UNITS[u.type]?.maintenance ?? 0), 0);
    player.gold -= maintenance;
    for (const u of player.units) {
      u.moveLeft = UNITS[u.type]?.move ?? 2;
      u.hasActed = false;
      if (u.hp < 100) u.hp = Math.min(100, u.hp + 10);
    }
    for (const c of player.cities) c.rangedStrikeUsed = false;
  }
  const v = checkVictory(state);
  if (v) {
    state.status = 'finished';
    state.winner = v.winnerId;
    state.victoryType = v.type;
  }
}
