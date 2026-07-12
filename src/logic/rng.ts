// 确定性 RNG（mulberry32 + FNV-1a hash + fork 子流）
// 逻辑层禁止 Math.random/Date.now/performance.now（由 purity 脚本与门禁强制）

export interface RngState {
  algorithm: 'mulberry32';
  state: number[]; // [当前内部状态]
}

export interface Rng {
  next(): number; // [0,1)
  int(maxExclusive: number): number;
  pick<T>(arr: readonly T[]): T;
  shuffle<T>(arr: readonly T[]): T[];
  fork(branch: string): Rng;
  serialize(): RngState;
}

/** FNV-1a 32-bit hash，跨平台一致 */
export function hash(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    const s = String(p);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
  }
  return h >>> 0;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0 || 1;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const fork = (branch: string): Rng => createRng(hash(seed, branch));

  return {
    next,
    int: (max) => Math.floor(next() * max),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
      }
      return a;
    },
    fork,
    serialize: () => ({ algorithm: 'mulberry32', state: [state] }),
  };
}

/** 从序列化状态恢复 RNG，继续产生与存档时相同的随机序列 */
export function restoreRng(s: RngState): Rng {
  return createRng(s.state[0] ?? 1);
}
