// 六边形数学（pointy-top，轴向坐标 q/r）
// 边界：MVP 小地图 60×36（q∈[0,59]，r∈[0,35]）

import { type HexCoord, HEX_DIRECTIONS } from '../../types';

export const HEX_SIZE = 256; // px（与 art-spec 一致）

export interface MapBounds {
  width: number;
  height: number;
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexAdd(a: HexCoord, b: HexCoord): HexCoord {
  return { q: a.q + b.q, r: a.r + b.r };
}

export function hexNeighbors(hex: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => hexAdd(hex, d));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) /
    2
  );
}

export function hexInRange(center: HexCoord, range: number): HexCoord[] {
  const out: HexCoord[] = [];
  for (let dq = -range; dq <= range; dq++) {
    const rMin = Math.max(-range, -dq - range);
    const rMax = Math.min(range, -dq + range);
    for (let dr = rMin; dr <= rMax; dr++) {
      out.push(hexAdd(center, { q: dq, r: dr }));
    }
  }
  return out;
}

export function hexRound(hex: { q: number; r: number }): HexCoord {
  const s = -hex.q - hex.r;
  let rq = Math.round(hex.q);
  let rr = Math.round(hex.r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - hex.q);
  const rDiff = Math.abs(rr - hex.r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) rq = -rr - rs;
  else if (rDiff > sDiff) rr = -rq - rs;
  // 归一化 -0 -> 0
  return { q: rq || 0, r: rr || 0 };
}

export function hexToPixel(hex: HexCoord, size = HEX_SIZE): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
  const y = size * (1.5 * hex.r);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size = HEX_SIZE): HexCoord {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound({ q, r });
}

export function inBounds(hex: HexCoord, bounds: MapBounds): boolean {
  return hex.q >= 0 && hex.q < bounds.width && hex.r >= 0 && hex.r < bounds.height;
}

export function allTiles(bounds: MapBounds): HexCoord[] {
  const out: HexCoord[] = [];
  for (let r = 0; r < bounds.height; r++) {
    for (let q = 0; q < bounds.width; q++) {
      out.push({ q, r });
    }
  }
  return out;
}

export function tileIndex(coord: HexCoord, bounds: MapBounds): number {
  return coord.r * bounds.width + coord.q;
}
