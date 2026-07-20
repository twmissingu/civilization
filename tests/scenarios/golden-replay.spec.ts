// golden replay 测试：固定 seed + 命令序列 → 期望 state hash
// 确保同一命令序列在保存前后产生完全相同状态
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { serialize, deserialize, roundTripEquivalent } from '../../src/logic/state/serialize';
import type { GameConfig, GameState } from '../../src/logic/state/types';

const CONFIG: GameConfig = {
  mapSize: { width: 10, height: 8 },
  civChoices: [
    { id: 'rome', isAI: false },
    { id: 'greece', isAI: true },
    { id: 'china', isAI: true },
  ],
  difficulty: 'prince',
  maxTurns: 300,
};

/** 计算 state 的确定性哈希（忽略数组引用差异） */
function stateHash(s: GameState): string {
  const { map, ...rest } = s;
  // 只哈希关键字段，排除 map 这种大对象
  const key = `${rest.version}|${rest.seed}|${rest.turn}|${rest.currentPlayerIndex}|${rest.status}|${rest.winner}|${rest.victoryType}|${rest.unitIdCounter}|${rest.cityIdCounter}|${rest.players.length}|${rest.players.map((p) => `${p.id}:${p.cities.length}:${p.units.length}:${p.gold}:${p.faith}`).join('|')}|${rest.diplomacy ? Object.keys(rest.diplomacy).length : 0}`;
  return key;
}

function applySequence(seed: number, commands: { kind: string }[]): GameState {
  let state = createInitialState(seed, CONFIG);
  for (const cmd of commands) {
    const result = applyCommand(state, cmd as any);
    if (result.state !== state) {
      state = result.state;
    }
  }
  return state;
}

describe('golden replay', () => {
  it('round-trip serialization preserves state', () => {
    const state = createInitialState(42, CONFIG);
    expect(roundTripEquivalent(state)).toBe(true);
  });

  it('round-trip after endTurn', () => {
    const state = createInitialState(42, CONFIG);
    const { state: s2 } = applyCommand(state, { kind: 'endTurn' });
    expect(roundTripEquivalent(s2)).toBe(true);
  });

  it('same seed + commands produces same hash', () => {
    const seed = 42;
    const commands = [
      { kind: 'endTurn' },
    ];

    const s1 = applySequence(seed, commands);
    const s2 = applySequence(seed, commands);

    expect(stateHash(s1)).toBe(stateHash(s2));
  });

  it('save-load round-trip preserves deterministic replay', () => {
    const seed = 42;
    const state = createInitialState(seed, CONFIG);
    const { state: afterEndTurn } = applyCommand(state, { kind: 'endTurn' });

    // 保存并加载
    const saved = serialize(afterEndTurn);
    const loaded = deserialize(saved);

    // 保存后执行命令与加载后执行命令应产生相同结果
    const { state: afterAttack1 } = applyCommand(afterEndTurn, { kind: 'endTurn' });
    const { state: afterAttack2 } = applyCommand(loaded, { kind: 'endTurn' });

    expect(stateHash(afterAttack1)).toBe(stateHash(afterAttack2));
  });
});