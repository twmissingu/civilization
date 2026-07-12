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

export function serialize(state: GameState): SaveData {
  return {
    version: 1,
    createdAt: '',
    state,
    rngState: { algorithm: 'mulberry32', state: [state.seed] },
  };
}

export function deserialize(data: SaveData): GameState {
  if (data.version < MIN_SUPPORTED_VERSION) {
    throw Object.assign(new Error(`存档版本 ${data.version} 不受支持`), { code: 'SaveVersionError' });
  }
  return structuredClone(data.state);
}

/** round-trip 行为等价：deserialize 后执行命令应与原状态执行命令产生相同结果 */
export function roundTripEquivalent(state: GameState): boolean {
  const restored = deserialize(serialize(state));
  return JSON.stringify(restored) === JSON.stringify(state);
}
