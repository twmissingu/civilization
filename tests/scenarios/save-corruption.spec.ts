import { describe, it, expect } from 'vitest';
import { applyCommand } from '../../src/logic/state/commands';
import { serialize, deserialize, CURRENT_SAVE_VERSION } from '../../src/logic/state/serialize';
import { aiDecide } from '../../src/logic/ai';
import { makeState } from '../scenarios/helpers';

describe('存档损坏矩阵', () => {
  it('合法 round-trip', () => {
    const state = makeState(42);
    const restored = deserialize(serialize(state));
    expect(JSON.stringify(restored)).toBe(JSON.stringify(state));
  });

  it('版本过低 -> SaveVersionError', () => {
    const state = makeState(42);
    const data = serialize(state);
    (data as unknown as { version: number }).version = 0;
    expect(() => deserialize(data)).toThrow(/版本/);
  });

  it('缺 state -> SaveSchemaError', () => {
    const state = makeState(42);
    const data = serialize(state);
    (data as unknown as { state: unknown }).state = undefined;
    expect(() => deserialize(data)).toThrow(/state/);
  });

  it('非对象 -> SaveCorruptedError', () => {
    expect(() => deserialize(null as unknown as Parameters<typeof deserialize>[0])).toThrow();
  });

  it('版本迁移：v1 → v2', () => {
    const state = makeState(42);
    const data = serialize(state);
    // 手动降级到 v1
    (data as unknown as { version: number }).version = 1;
    // 删除 turn 字段模拟旧版本
    const oldData = { ...data, state: { ...data.state, turn: undefined } };
    const restored = deserialize(oldData as unknown as Parameters<typeof deserialize>[0]);
    expect(restored.turn).toBe(1);
  });

  it('版本迁移：迁移后 round-trip 一致', () => {
    const state = makeState(42);
    const data = serialize(state);
    // 降级到 v1
    (data as unknown as { version: number }).version = 1;
    // 经过迁移后应可正常读取
    const restored = deserialize(data as unknown as Parameters<typeof deserialize>[0]);
    expect(JSON.stringify(restored)).toBe(JSON.stringify(state));
  });

  it('序列化版本号为 CURRENT_SAVE_VERSION', () => {
    const state = makeState(42);
    const data = serialize(state);
    expect(data.version).toBe(CURRENT_SAVE_VERSION);
  });
});

describe('失败玩家处理', () => {
  it('AI 无城无单位时以 endTurn 结尾（不卡住）', () => {
    const state = makeState(42);
    state.currentPlayerIndex = 1;
    const p1 = state.players[1];
    p1.cities = [];
    p1.units = [];
    const cmds = aiDecide(state, p1);
    expect(cmds[cmds.length - 1].kind).toBe('endTurn');
  });

  it('行为等价：存档后继续命令与未存档一致', () => {
    const state = makeState(42);
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    const s2 = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'R' }).state;
    const restored = deserialize(serialize(s2));
    const a = applyCommand(restored, { kind: 'endTurn' }).state;
    const b = applyCommand(s2, { kind: 'endTurn' }).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
