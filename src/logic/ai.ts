// AI 决策（两层 utility AI 简化版）+ 驱动
// 确定性：随机经 createRng(hash(seed, turn, playerIdx))，禁 Math.random
import type { HexCoord } from '../types';
import type { GameState, PlayerState, Difficulty } from './state/types';
import type { GameCommand } from './state/commands';
import { applyCommand } from './state/commands';
import { createRng, hash } from './rng';
import { TECHS, UNITS, CIVICS } from '../gamedata';
import { canResearch } from './state/tech';
import { canResearchCivic } from './state/civic';
import { canBuildImprovement } from './state/builder';
import { getTile } from './state/mapgen';
import { hexDistance, hexNeighbors, inBounds } from './hex';
import { canStartTradeRoute } from './state/traderoute';
import { canFoundReligion, canPurchaseMissionary } from './state/religion';
import { PANTHEONS } from '../gamedata';

function playerIdx(id: string): number {
  const m = id.match(/(\d+)$/);
  return m ? parseInt(m[1], 10) : 0;
}

/** 找邻格的敌方单位（战争状态） */
function adjacentEnemyTarget(state: GameState, unit: { ownerId: string; tile: HexCoord }): HexCoord | null {
  for (const n of hexNeighbors(unit.tile)) {
    if (!inBounds(n, state.map.bounds)) continue;
    for (const p of state.players) {
      if (p.id === unit.ownerId) continue;
      if (state.diplomacy[unit.ownerId]?.[p.id] !== 'war') continue;
      if (p.units.some((u) => u.tile.q === n.q && u.tile.r === n.r)) return n;
    }
  }
  return null;
}

function isLand(state: GameState, coord: HexCoord): boolean {
  const t = getTile(state.map, coord);
  if (!t) return false;
  return t.terrain !== 'ocean' && t.terrain !== 'coast' && t.terrain !== 'mountain';
}

function randomLandNeighbor(state: GameState, tile: HexCoord, rng: ReturnType<typeof createRng>): HexCoord | null {
  const opts = hexNeighbors(tile).filter((n) => inBounds(n, state.map.bounds) && isLand(state, n));
  if (opts.length === 0) return null;
  return opts[Math.floor(rng.next() * opts.length)];
}

export function aiDecide(state: GameState, player: PlayerState): GameCommand[] {
  const commands: GameCommand[] = [];
  const rng = createRng(hash(state.seed, state.turn, playerIdx(player.id)));
  const difficulty = state.config.difficulty;
  const skipChanceMap: Record<Difficulty, number> = {
    settler: 0.5,
    chieftain: 0.35,
    warlord: 0.2,
    prince: 0.1,
    king: 0.05,
    emperor: 0,
  };
  const skipChance = skipChanceMap[difficulty];
  const isHard = difficulty === 'king' || difficulty === 'emperor';

  // 战略层：研究（settler/chieftain 随机，其余选最便宜）
  if (!player.currentResearch) {
    const available = Object.values(TECHS).filter((t) => canResearch(player, t.id));
    if (available.length > 0) {
      const pick =
        difficulty === 'settler' || difficulty === 'chieftain'
          ? available[Math.floor(rng.next() * available.length)]
          : available.sort((a, b) => a.cost - b.cost)[0];
      commands.push({ kind: 'research', techId: pick.id });
    }
  }
  // 战略层：市政
  if (!player.currentCivic) {
    const available = Object.values(CIVICS).filter((c) => canResearchCivic(player, c.id));
    if (available.length > 0) {
      available.sort((a, b) => a.cost - b.cost);
      commands.push({ kind: 'researchCivic', civicId: available[0].id });
    }
  }

  // 宗教层：万神殿/创立宗教/购买传教士
  if (player.faith >= 25 && !player.pantheon) {
    const pantheonIds = Object.keys(PANTHEONS);
    if (pantheonIds.length > 0) {
      commands.push({ kind: 'foundPantheon', pantheonId: pantheonIds[Math.floor(rng.next() * pantheonIds.length)] });
    }
  }
  if (canFoundReligion(state, player)) {
    commands.push({ kind: 'foundReligion' });
  }
  // 购买传教士
  if (player.religionId) {
    const holyCity = player.cities.find((c) => c.id === player.holyCityId);
    if (holyCity && canPurchaseMissionary(state, player, holyCity.id)) {
      commands.push({ kind: 'purchaseMissionary', cityId: holyCity.id });
    }
  }

  // 战术层：城市生产（hard 优先补军事）
  const militaryCount = player.units.filter((u) => ['warrior', 'archer', 'swordsman', 'cavalry', 'knight'].includes(u.type)).length;
  for (const city of player.cities) {
    if (city.queue.length > 0) continue;
    const builderCount = player.units.filter((u) => u.type === 'builder').length;
    let unitType = 'warrior';
    if (isHard && militaryCount < player.cities.length) {
      unitType = player.researchedTechs.includes('archery') ? 'archer' : 'warrior';
    } else if (builderCount < player.cities.length) {
      unitType = 'builder';
    } else if (player.cities.length < (isHard ? 6 : 3) && player.researchedTechs.length > 1) {
      unitType = 'settler';
    } else if (player.researchedTechs.includes('currency') && player.tradeRouteCapacity > 0 && (player.tradeRoutes?.length ?? 0) < player.tradeRouteCapacity) {
      unitType = 'trader';
    } else if (player.researchedTechs.includes('archery')) {
      unitType = 'archer';
    }
    if (UNITS[unitType] && (UNITS[unitType].unlockTech === 'initial' || player.researchedTechs.includes(UNITS[unitType].unlockTech))) {
      commands.push({ kind: 'trainUnit', cityId: city.id, unitType });
    }
  }

  // 战术层：单位行动（easy/standard 按 skipChance 怠工）
  for (const unit of player.units) {
    if (rng.next() < skipChance) continue;
    if (unit.type === 'settler') {
      const far = player.cities.every((c) => hexDistance(c.tile, unit.tile) >= 3);
      if (far && isLand(state, unit.tile) && player.cities.length < 8) {
        commands.push({ kind: 'foundCity', unitId: unit.id, name: `${player.civId}-${player.cities.length + 1}` });
        continue;
      }
      const dest = randomLandNeighbor(state, unit.tile, rng);
      if (dest) commands.push({ kind: 'moveUnit', unitId: unit.id, to: dest });
    } else if (unit.type === 'builder') {
      const imps = ['farm', 'mine', 'pasture', 'plantation', 'quarry', 'lumber_mill', 'fishing_boats'];
      const imp = imps.find((i) => canBuildImprovement(state, unit, i));
      if (imp) {
        commands.push({ kind: 'buildImprovement', builderId: unit.id, improvementId: imp });
      } else {
        const dest = randomLandNeighbor(state, unit.tile, rng);
        if (dest) commands.push({ kind: 'moveUnit', unitId: unit.id, to: dest });
      }
    } else if (unit.type === 'missionary' || unit.type === 'apostle') {
      // 传教士/使徒：找敌方城市传教
      if (unit.charges !== undefined && unit.charges > 0 && player.religionId) {
        // 找非己方且非该宗教的城市
        let target: { id: string } | null = null;
        for (const p of state.players) {
          if (p.id === player.id) continue;
          for (const c of p.cities) {
            if (c.dominantReligion !== player.religionId) {
              target = c;
              break;
            }
          }
          if (target) break;
        }
        if (target) {
          commands.push({ kind: 'spreadReligion', unitId: unit.id, targetCityId: target.id });
        }
      }
    } else if (unit.type === 'trader') {
      // 商人：寻找贸易路线目标
      if (!unit.tradeRouteId) {
        // 找可贸易的目标城市
        let targetCity: { id: string } | null = null;
        for (const p of state.players) {
          if (p.id === player.id) continue;
          for (const c of p.cities) {
            if (canStartTradeRoute(state, player, unit.id, c.id)) {
              targetCity = c;
              break;
            }
          }
          if (targetCity) break;
        }
        // 也可以贸易到自己的城市
        if (!targetCity) {
          for (const c of player.cities) {
            if (canStartTradeRoute(state, player, unit.id, c.id)) {
              targetCity = c;
              break;
            }
          }
        }
        if (targetCity) {
          commands.push({ kind: 'startTradeRoute', traderId: unit.id, toCityId: targetCity.id });
        }
      }
    } else {
      // 军事：攻击邻敌，否则探索
      const target = adjacentEnemyTarget(state, unit);
      if (target) {
        commands.push({ kind: 'attack', attackerId: unit.id, targetTile: target });
      } else {
        const dest = randomLandNeighbor(state, unit.tile, rng);
        if (dest) commands.push({ kind: 'moveUnit', unitId: unit.id, to: dest });
      }
    }
  }

  commands.push({ kind: 'endTurn' });
  return commands;
}

/** 运行 AI 回合直到轮到人类玩家或游戏结束 */
export function runAIUntilHuman(state: GameState): GameState {
  let s = state;
  let guard = 0;
  while (s.status === 'active' && s.players[s.currentPlayerIndex].isAI && guard < 200) {
    guard++;
    const player = s.players[s.currentPlayerIndex];
    const cmds = aiDecide(s, player);
    let progressed = false;
    for (const cmd of cmds) {
      const res = applyCommand(s, cmd);
      if (res.state !== s) {
        s = res.state;
        progressed = true;
      }
      if (cmd.kind === 'endTurn') break;
      if (s.status === 'finished') break;
    }
    if (!progressed) {
      s = applyCommand(s, { kind: 'endTurn' }).state;
    }
    if (s.status === 'finished') break;
  }
  return s;
}
