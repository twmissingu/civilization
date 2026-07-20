// 单位移动与 A* 寻路
import type { HexCoord } from '../../types';
import type { GameState, UnitState } from './types';
import { getTile } from './mapgen';
import { TERRAINS, UNITS, exertsZOC } from '../../gamedata';
import { hexDistance, hexEquals, hexNeighbors, inBounds } from '../hex';

export function tileMoveCost(state: GameState, coord: HexCoord): number {
  const t = getTile(state.map, coord);
  if (!t) return Infinity;
  const def = TERRAINS[t.terrain];
  if (def?.impassable) return Infinity;
  return def?.moveCost ?? 1;
}

/** 该格是否有敌方 ZOC 单位相邻（会强制停步） */
function inEnemyZOC(state: GameState, coord: HexCoord, mover: UnitState): boolean {
  for (const n of hexNeighbors(coord)) {
    if (!inBounds(n, state.map.bounds)) continue;
    for (const p of state.players) {
      if (p.id === mover.ownerId) continue;
      if (state.diplomacy[p.id]?.[mover.ownerId] !== 'war') continue;
      for (const u of p.units) {
        if (hexEquals(u.tile, n)) {
          const def = UNITS[u.type];
          if (def && exertsZOC(def)) return true;
        }
      }
    }
  }
  return false;
}

/** 该格被敌方军事单位占据（不可通行，需攻击） */
export function isBlocked(state: GameState, coord: HexCoord, mover: UnitState): boolean {
  for (const p of state.players) {
    if (state.diplomacy[p.id]?.[mover.ownerId] !== 'war' && p.id !== mover.ownerId) {
      // 中立/和平方单位也算阻挡
    }
    for (const u of p.units) {
      if (hexEquals(u.tile, coord) && u.ownerId !== mover.ownerId) {
        const def = UNITS[u.type];
        if (def && def.unitClass === 'military') return true;
      }
    }
  }
  return false;
}

/** A* 寻路（返回从 from 下一格到 to 的路径，含 to 不含 from） */
export function findPath(state: GameState, unit: UnitState, to: HexCoord): HexCoord[] | null {
  const from = unit.tile;
  if (hexEquals(from, to)) return [];
  const bounds = state.map.bounds;
  const open = new Map<string, { coord: HexCoord; g: number; f: number }>();
  const cameFrom = new Map<string, HexCoord | null>();
  const gScore = new Map<string, number>();
  const startKey = `${from.q},${from.r}`;
  gScore.set(startKey, 0);
  open.set(startKey, { coord: from, g: 0, f: hexDistance(from, to) });
  cameFrom.set(startKey, null);

  while (open.size > 0) {
    let best: { coord: HexCoord; g: number; f: number } | null = null;
    for (const v of open.values()) if (!best || v.f < best.f) best = v;
    if (!best) break;
    const current = best.coord;
    const curKey = `${current.q},${current.r}`;
    if (hexEquals(current, to)) {
      // reconstruct
      const path: HexCoord[] = [];
      let c: HexCoord | null = current;
      while (c && !hexEquals(c, from)) {
        path.unshift(c);
        c = cameFrom.get(`${c.q},${c.r}`) ?? null;
      }
      return path;
    }
    open.delete(curKey);
    for (const n of hexNeighbors(current)) {
      if (!inBounds(n, bounds)) continue;
      if (!hexEquals(n, to) && isBlocked(state, n, unit)) continue;
      const cost = tileMoveCost(state, n);
      if (!isFinite(cost)) continue;
      const tentG = best.g + cost;
      const nKey = `${n.q},${n.r}`;
      if (tentG < (gScore.get(nKey) ?? Infinity)) {
        gScore.set(nKey, tentG);
        cameFrom.set(nKey, current);
        open.set(nKey, { coord: n, g: tentG, f: tentG + hexDistance(n, to) });
      }
    }
  }
  return null;
}

/** 返回单位在当前移动力下可到达的所有相邻格子（BFS） */
export function reachableTiles(state: GameState, unit: UnitState): HexCoord[] {
  const start = unit.tile;
  const visited = new Map<string, { coord: HexCoord; cost: number }>();
  visited.set(`${start.q},${start.r}`, { coord: start, cost: 0 });
  const queue: { coord: HexCoord; cost: number }[] = [{ coord: start, cost: 0 }];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const n of hexNeighbors(current.coord)) {
      if (!inBounds(n, state.map.bounds)) continue;
      const cost = tileMoveCost(state, n);
      if (!isFinite(cost)) continue;
      const total = current.cost + cost;
      if (total > unit.moveLeft) continue;
      const key = `${n.q},${n.r}`;
      const existing = visited.get(key);
      if (existing && existing.cost <= total) continue;
      visited.set(key, { coord: n, cost: total });
      queue.push({ coord: n, cost: total });
    }
  }
  const result: HexCoord[] = [];
  for (const [key, v] of visited) {
    if (key === `${start.q},${start.r}`) continue;
    result.push(v.coord);
  }
  return result;
}

/** 执行移动：沿路径推进，消耗移动力，遇 ZOC 停步 */
export function moveUnit(state: GameState, unit: UnitState, path: HexCoord[]): void {
  for (const step of path) {
    const cost = tileMoveCost(state, step);
    if (!isFinite(cost)) break;
    if (unit.moveLeft < cost) break;
    unit.moveLeft -= cost;
    unit.tile = step;
    if (inEnemyZOC(state, step, unit)) break; // ZOC 强制停步
  }
  // 移动后更新视野：reveal 周围 2 格
  revealArea(state, unit.tile, 2);
}

/** 视野半径 map */
const SIGHT_RANGES: Record<string, number> = {
  settler: 2, builder: 2, warrior: 2, archer: 2, slinger: 2,
  swordsman: 2, cavalry: 3, knight: 3, siege_tower: 2, catapult: 2,
  cannon: 2, trireme: 3, quadrireme: 3, musketman: 2,
};

/** 更新指定坐标周围半径内的地块可见性 */
export function revealArea(state: GameState, center: HexCoord, range: number): void {
  const { map } = state;
  for (let dq = -range; dq <= range; dq++) {
    const rMin = Math.max(-range, -dq - range);
    const rMax = Math.min(range, -dq + range);
    for (let dr = rMin; dr <= rMax; dr++) {
      const coord: HexCoord = { q: center.q + dq, r: center.r + dr };
      if (!inBounds(coord, map.bounds)) continue;
      const idx = coord.r * map.bounds.width + coord.q;
      const tile = map.tiles[idx];
      if (tile) {
        if (tile.visibility === 'unexplored') tile.visibility = 'explored';
        tile.visibility = 'visible';
      }
    }
  }
}

/** 更新地图上所有当前玩家单位的视野 */
export function updatePlayerVisibility(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;
  // 先重置所有 tile 可见性（仅保留 explored 标记）
  for (const tile of state.map.tiles) {
    if (tile.visibility === 'visible') tile.visibility = 'explored';
  }
  // 按单位视野重新 reveal
  for (const unit of player.units) {
    const range = SIGHT_RANGES[unit.type] ?? 2;
    revealArea(state, unit.tile, range);
  }
  // 按城市视野重新 reveal
  for (const city of player.cities) {
    revealArea(state, city.tile, 3);
  }
}
