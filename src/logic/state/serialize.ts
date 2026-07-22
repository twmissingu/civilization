// 存档序列化（逻辑层不调 Date/IO；createdAt 由浏览器层填充）
import type { GameState } from './types';

export interface RngState {
  algorithm: 'mulberry32';
  state: number[];
}

export interface SaveData {
  version: number;
  createdAt: string; // 浏览器层写入
  state: GameState;
  rngState: RngState;
}

export const MIN_SUPPORTED_VERSION = 1;
export const CURRENT_SAVE_VERSION = 2;

/**
 * 版本迁移链：将旧版本数据升级到当前版本。
 * 每个迁移函数接收上一版本的 SaveData，返回升级后的 SaveData，
 * 同时更新 version 字段。
 */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {
  // 1 → 2：添加 turn 字段兼容性（keyed by target version，即 key=2 表示从 v1→v2）
  2: (data) => {
    // 确保 state.turn 存在
    if (data.state && typeof data.state === 'object') {
      const s = data.state as Record<string, unknown>;
      if (typeof s.turn !== 'number') s.turn = 1;
    }
    return { ...data, version: 2 };
  },
};

export function serialize(state: GameState): SaveData {
  return {
    version: CURRENT_SAVE_VERSION,
    createdAt: '',
    state,
    rngState: { algorithm: 'mulberry32', state: [state.seed] },
  };
}

export function deserialize(data: SaveData | Record<string, unknown>): GameState {
  if (!data || typeof data !== 'object') {
    throw Object.assign(new Error('存档不是有效对象'), { code: 'SaveCorruptedError' });
  }
  const raw = data as Record<string, unknown>;
  if (raw.version === undefined || raw.version === null) {
    throw Object.assign(new Error('存档缺 version 字段'), { code: 'SaveSchemaError' });
  }
  const version = Number(raw.version);
  if (Number.isNaN(version) || version < MIN_SUPPORTED_VERSION) {
    throw Object.assign(new Error(`存档版本 ${raw.version} 不受支持`), { code: 'SaveVersionError' });
  }
  // 链式迁移：从当前版本逐步升级到最新
  let migrated = raw;
  for (let v = version; v < CURRENT_SAVE_VERSION; v++) {
    const next = v + 1;
    const migrate = MIGRATIONS[next];
    if (migrate) {
      migrated = migrate(migrated);
    }
  }
  if (!migrated.state) {
    throw Object.assign(new Error('存档缺 state 字段'), { code: 'SaveSchemaError' });
  }
  try {
    return structuredClone(migrated.state) as GameState;
  } catch {
    throw Object.assign(new Error('存档 state 不可恢复'), { code: 'SaveCorruptedError' });
  }
}

/** round-trip 行为等价：deserialize 后执行命令应与原状态执行命令产生相同结果 */
export function roundTripEquivalent(state: GameState): boolean {
  const restored = deserialize(serialize(state));
  return JSON.stringify(restored) === JSON.stringify(state);
}
