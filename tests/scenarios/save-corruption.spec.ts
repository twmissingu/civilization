import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { serialize, deserialize } from '../../src/logic/state/serialize';
import { aiDecide } from '../../src/logic/ai';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(42, config);
}

describe('存档损坏矩阵', () => {
  it('合法 round-trip', () => {
    const state = makeState();
    const restored = deserialize(serialize(state));
    expect(JSON.stringify(restored)).toBe(JSON.stringify(state));
  });

  it('版本过低 -> SaveVersionError', () => {
    const state = makeState();
    const data = serialize(state);
    (data as unknown as { version: number }).version = 0;
    expect(() => deserialize(data)).toThrow(/版本/);
  });

  it('缺 state -> SaveSchemaError', () => {
    const state = makeState();
    const data = serialize(state);
    (data as unknown as { state: unknown }).state = undefined;
    expect(() => deserialize(data)).toThrow(/state/);
  });

  it('非对象 -> SaveCorruptedError', () => {
    expect(() => deserialize(null as unknown as Parameters<typeof deserialize>[0])).toThrow();
  });
});

describe('失败玩家处理', () => {
  it('AI 无城无单位时以 endTurn 结尾（不卡住）', () => {
    const state = makeState();
    state.currentPlayerIndex = 1;
    const p1 = state.players[1];
    p1.cities = [];
    p1.units = [];
    const cmds = aiDecide(state, p1);
    expect(cmds[cmds.length - 1].kind).toBe('endTurn');
  });

  it('行为等价：存档后继续命令与未存档一致', () => {
    const state = makeState();
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    const s2 = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'R' }).state;
    const restored = deserialize(serialize(s2));
    const a = applyCommand(restored, { kind: 'endTurn' }).state;
    const b = applyCommand(s2, { kind: 'endTurn' }).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
