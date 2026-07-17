// 产出计算（地块/城市/玩家）
import type { Tile } from './mapgen';
import type { CityState, GameState, PlayerState } from './types';
import { TERRAINS, FEATURES, RESOURCES, IMPROVEMENTS, BUILDINGS, GOVERNMENTS } from '../../gamedata';
import { addYield, ZERO_YIELD, type Yield } from '../../gamedata/types';
import { getTile } from './mapgen';
import { districtAdjacencyBonus } from './district';
import { cityStateYieldBonus } from './citystate';
import { tradeRouteYield } from './traderoute';

export function tileYield(tile: Tile, worked: boolean): Yield {
  if (!worked) return ZERO_YIELD;
  const t = TERRAINS[tile.terrain];
  if (!t) return ZERO_YIELD;
  let y: Yield = { ...t.yield };
  if (tile.feature && FEATURES[tile.feature]) y = addYield(y, FEATURES[tile.feature].yieldBonus);
  if (tile.resource && RESOURCES[tile.resource.id]) y = addYield(y, RESOURCES[tile.resource.id].yieldBonus);
  if (tile.improvement && IMPROVEMENTS[tile.improvement]) y = addYield(y, IMPROVEMENTS[tile.improvement].yieldBonus);
  return y;
}

export function cityYield(state: GameState, city: CityState): Yield {
  let y: Yield = ZERO_YIELD;
  const center = getTile(state.map, city.tile);
  if (center) y = addYield(y, tileYield(center, true));
  for (const wt of city.workedTiles) {
    const t = getTile(state.map, wt);
    if (t) y = addYield(y, tileYield(t, true));
  }
  for (const bId of city.buildings) {
    const b = BUILDINGS[bId];
    if (b) y = addYield(y, b.yield);
  }
  for (const d of city.districts) {
    y = addYield(y, districtAdjacencyBonus(state, d.type, d.tile));
  }
  for (const w of city.wonders) {
    if (w.id === 'great_library') y = addYield(y, { science: 4 });
    if (w.id === 'oracle') y = addYield(y, { science: 1 });
    if (w.id === 'colosseum') y = addYield(y, { culture: 3 });
  }
  const owner = state.players.find((p) => p.id === city.ownerId);
  if (owner) {
    if (owner.civId === 'rome') y = addYield(y, { production: 1 });
    if (owner.civId === 'china') {
      const w = city.wonders.length;
      y = addYield(y, { science: w, culture: w }); // 天命：每个奇观 +1 科技 +1 文化
    }
    if (owner.government === 'chiefdom') y = addYield(y, { production: 1 });
    if (owner.government === 'classical_republic') y = addYield(y, { production: 1, culture: 1 });
    if (owner.government === 'monarchy' || owner.government === 'merchant_republic') y = addYield(y, { gold: 2 });
    if (owner.government === 'theocracy') y = addYield(y, { faith: Math.floor(y.faith * 0.5) });
    // AI 难度加成：emperor 首都 +1 产能
    if (owner.isAI && city.isCapital && state.config.difficulty === 'emperor') {
      y = addYield(y, { production: 1 });
    }
  }
  return y;
}

export function playerYield(state: GameState, player: PlayerState): Yield {
  let y: Yield = ZERO_YIELD;
  for (const c of player.cities) y = addYield(y, cityYield(state, c));
  // 城邦加成
  const csBonus = cityStateYieldBonus(state, player);
  y = addYield(y, csBonus);
  // 贸易路线产出
  const trYield = tradeRouteYield(player);
  y = addYield(y, trYield);
  // AI 难度加成：king/emperor 金币和科技
  if (player.isAI) {
    if (state.config.difficulty === 'king') {
      y = addYield(y, { gold: 2, science: 1 });
    } else if (state.config.difficulty === 'emperor') {
      y = addYield(y, { gold: 4, science: 2 });
    }
  }
  return y;
}

export function GOVERNMENT_REF(): typeof GOVERNMENTS {
  return GOVERNMENTS;
}
