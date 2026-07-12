import { describe, it, expect } from 'vitest';
import {
  hexNeighbors,
  hexDistance,
  hexInRange,
  hexToPixel,
  pixelToHex,
  hexRound,
  inBounds,
  allTiles,
  hexAdd,
} from '../../src/logic/hex';

describe('CP-00 六边形坐标数学', () => {
  it('hexNeighbors 返回 6 个邻格', () => {
    const n = hexNeighbors({ q: 3, r: 3 });
    expect(n).toHaveLength(6);
    expect(n).toContainEqual({ q: 4, r: 3 });
    expect(n).toContainEqual({ q: 3, r: 4 });
  });

  it('hexDistance 自身为 0 且对称', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: 0 })).toBe(3);
    expect(hexDistance({ q: 3, r: 0 }, { q: 0, r: 0 })).toBe(3);
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -2 })).toBe(2);
  });

  it('hexInRange 返回正确数量（1/7/19）', () => {
    expect(hexInRange({ q: 0, r: 0 }, 0)).toHaveLength(1);
    expect(hexInRange({ q: 5, r: 5 }, 1)).toHaveLength(7);
    expect(hexInRange({ q: 5, r: 5 }, 2)).toHaveLength(19);
  });

  it('hexToPixel 与 pixelToHex 互逆', () => {
    const hex = { q: 5, r: 3 };
    const p = hexToPixel(hex);
    expect(pixelToHex(p.x, p.y)).toEqual(hex);
    const hex2 = { q: -2, r: 7 };
    const p2 = hexToPixel(hex2);
    expect(pixelToHex(p2.x, p2.y)).toEqual(hex2);
  });

  it('hexRound 四舍五入分数坐标', () => {
    expect(hexRound({ q: 0.2, r: -0.1 })).toEqual({ q: 0, r: 0 });
    expect(hexRound({ q: 0.8, r: 0.1 })).toEqual({ q: 1, r: 0 });
    expect(hexRound({ q: 1.4, r: 1.4 })).toEqual({ q: 1, r: 2 });
  });

  it('hexAdd 向量相加', () => {
    expect(hexAdd({ q: 1, r: 2 }, { q: 3, r: 4 })).toEqual({ q: 4, r: 6 });
  });

  it('inBounds 遵守边界', () => {
    const bounds = { width: 60, height: 36 };
    expect(inBounds({ q: 0, r: 0 }, bounds)).toBe(true);
    expect(inBounds({ q: 59, r: 35 }, bounds)).toBe(true);
    expect(inBounds({ q: 60, r: 0 }, bounds)).toBe(false);
    expect(inBounds({ q: -1, r: 0 }, bounds)).toBe(false);
    expect(inBounds({ q: 0, r: 36 }, bounds)).toBe(false);
  });

  it('allTiles 产出 width*height 格', () => {
    expect(allTiles({ width: 10, height: 5 })).toHaveLength(50);
    expect(allTiles({ width: 60, height: 36 })).toHaveLength(2160);
  });
});
