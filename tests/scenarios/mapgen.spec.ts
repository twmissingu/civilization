import { describe, it, expect } from 'vitest';
import { createRng, hash, restoreRng } from '../../src/logic/rng';
import {
  generateMap,
  getTile,
  TERRAIN_TYPES,
  type MapBounds,
} from '../../src/logic/state/mapgen';

describe('CP-02 地图生成 seed 确定性', () => {
  const bounds: MapBounds = { width: 24, height: 18 };

  it('同 seed 产出完全相同地图', () => {
    const a = generateMap(bounds, createRng(42));
    const b = generateMap(bounds, createRng(42));
    expect(a.tiles.length).toBe(b.tiles.length);
    expect(a.tiles).toEqual(b.tiles);
  });

  it('不同 seed 产出不同地图', () => {
    const a = generateMap(bounds, createRng(42));
    const b = generateMap(bounds, createRng(99));
    expect(a.tiles).not.toEqual(b.tiles);
  });

  it('产出 width*height 个合法地形格', () => {
    const m = generateMap(bounds, createRng(42));
    expect(m.tiles).toHaveLength(24 * 18);
    for (const t of m.tiles) {
      expect(TERRAIN_TYPES).toContain(t.terrain);
      expect(t.coord.q).toBeGreaterThanOrEqual(0);
      expect(t.coord.r).toBeGreaterThanOrEqual(0);
    }
  });

  it('地图含陆地与水域', () => {
    const m = generateMap(bounds, createRng(42));
    const water = m.tiles.filter((t) => t.terrain === 'ocean' || t.terrain === 'coast').length;
    const land = m.tiles.length - water;
    expect(water).toBeGreaterThan(0);
    expect(land).toBeGreaterThan(0);
  });

  it('getTile 越界返回 undefined', () => {
    const m = generateMap(bounds, createRng(42));
    expect(getTile(m, { q: 0, r: 0 })).toBeDefined();
    expect(getTile(m, { q: 100, r: 0 })).toBeUndefined();
    expect(getTile(m, { q: -1, r: 0 })).toBeUndefined();
  });
});

describe('RNG 确定性', () => {
  it('同 seed 同序列', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('fork 子流互不干扰且可复现', () => {
    const r = createRng(42);
    const f1 = r.fork('elevation');
    const f2 = r.fork('moisture');
    const seq1 = Array.from({ length: 3 }, () => f1.next());
    const seq2 = Array.from({ length: 3 }, () => f2.next());
    expect(seq1).not.toEqual(seq2);
    // 重建同分支
    const f1b = createRng(42).fork('elevation');
    expect(Array.from({ length: 3 }, () => f1b.next())).toEqual(seq1);
  });

  it('hash 稳定且确定', () => {
    expect(hash(42, 'elevation')).toBe(hash(42, 'elevation'));
    expect(hash(42, 'a')).not.toBe(hash(42, 'b'));
  });

  it('serialize/restore 保持序列', () => {
    const r = createRng(123);
    r.next();
    r.next();
    const state = r.serialize();
    const expected = [r.next(), r.next(), r.next()];
    const r2 = createRng(123);
    r2.next();
    r2.next();
    const s2 = r2.serialize();
    expect(s2).toEqual(state);
    // restore 后继续产生相同序列
    const restored = createRng(123);
    restored.next();
    restored.next();
    const restSeq = [restored.next(), restored.next(), restored.next()];
    expect(restSeq).toEqual(expected);
  });

  it('pick 返回数组元素', () => {
    const r = createRng(7);
    const arr = ['a', 'b', 'c', 'd'];
    expect(arr).toContain(r.pick(arr));
    // 单元素数组返回该元素
    expect(createRng(7).pick(['x'])).toBe('x');
  });

  it('shuffle 保持元素集合且同 seed 可复现', () => {
    const a = createRng(7).shuffle([1, 2, 3, 4, 5]);
    const b = createRng(7).shuffle([1, 2, 3, 4, 5]);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(a).toEqual(b);
    // 不修改原数组
    const orig = [1, 2, 3];
    createRng(7).shuffle(orig);
    expect(orig).toEqual([1, 2, 3]);
  });

  it('restoreRng 从序列化状态恢复后续序列', () => {
    const r = createRng(555);
    r.next();
    r.next();
    const restored = restoreRng(r.serialize());
    // 两者处于相同内部状态，后续序列一致
    expect(restored.next()).toBe(r.next());
    expect(restored.next()).toBe(r.next());
  });
});
