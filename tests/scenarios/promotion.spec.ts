// 单位晋升系统测试
import { describe, it, expect, beforeEach } from 'vitest';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import { availablePromotions, applyPromotion, canLevelUp } from '../../src/logic/state/combat';
import { makeState } from '../scenarios/helpers';

describe('单位晋升系统', () => {
  beforeEach(() => {
    // 重置计数器
  });

  it('availablePromotions 返回空当单位类型不存在', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'nonexistent', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false,
    };
    expect(availablePromotions(u)).toEqual([]);
  });

  it('availablePromotions 返回空当满级', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 5, promotions: [], hasActed: false,
    };
    expect(availablePromotions(u)).toEqual([]);
  });

  it('availablePromotions 返回近战晋升给 warrior', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false,
    };
    const list = availablePromotions(u);
    // level 1 近战：discipline
    expect(list).toContain('discipline');
    expect(list).toContain('discipline');
    expect(list).not.toContain('charge'); // requiresLevel 2
    expect(list).not.toContain('veteran'); // requiresLevel 3
  });

  it('availablePromotions 返回远程晋升给 archer', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'archer', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false,
    };
    const list = availablePromotions(u);
    expect(list).toContain('volley');
    expect(list).not.toContain('discipline');
  });

  it('availablePromotions 返回骑兵晋升给 cavalry', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'cavalry', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 1, promotions: [], hasActed: false,
    };
    const list = availablePromotions(u);
    expect(list).toContain('maneuver');
  });

  it('availablePromotions 排除已选晋升', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 0, level: 2, promotions: ['discipline'], hasActed: false,
    };
    const list = availablePromotions(u);
    expect(list).not.toContain('discipline');
    // level 2 时可选 charge, shock
    expect(list).toContain('charge');
    expect(list).toContain('shock');
  });

  it('applyPromotion 添加晋升到列表', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: [], hasActed: false,
    };
    const result = applyPromotion(u, 'discipline');
    expect(result).toBe(true);
    expect(u.promotions).toContain('discipline');
    expect(u.xp).toBe(0); // 经验重置
  });

  it('applyPromotion 返回 false 对不存在晋升', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: [], hasActed: false,
    };
    const result = applyPromotion(u, 'nonexistent');
    expect(result).toBe(false);
    expect(u.promotions).toEqual([]);
  });

  it('applyPromotion 返回 false 对重复晋升', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: ['discipline'], hasActed: false,
    };
    const result = applyPromotion(u, 'discipline');
    expect(result).toBe(false);
  });

  it('canLevelUp 返回 true 当 xp 足够且未满级', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: [], hasActed: false,
    };
    expect(canLevelUp(u)).toBe(true);
  });

  it('canLevelUp 返回 false 当 xp 不足', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 5, level: 1, promotions: [], hasActed: false,
    };
    expect(canLevelUp(u)).toBe(false);
  });

  it('canLevelUp 返回 false 当满级', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'warrior', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 100, level: 5, promotions: [], hasActed: false,
    };
    expect(canLevelUp(u)).toBe(false);
  });

  it('canLevelUp 返回 false 当无可用晋升', () => {
    const u = {
      id: 'foo', ownerId: 'p1', type: 'settler', tile: { q: 0, r: 0 },
      hp: 100, moveLeft: 2, xp: 10, level: 1, promotions: [], hasActed: false,
    };
    // settler 是 civilian，无晋升可用
    expect(canLevelUp(u)).toBe(false);
  });

  it('choosePromotion 命令经 applyCommand 执行', () => {
    const state = makeState();
    const player = currentPlayer(state);
    // 找到 warrior，设定 xp 使其可升级
    const warrior = player.units.find((u) => u.type === 'warrior')!;
    warrior.xp = 10; // level 1, 需要 10xp
    warrior.level = 1;
    const { state: s2 } = applyCommand(state, { kind: 'choosePromotion', unitId: warrior.id, promotionId: 'discipline' });
    const player2 = currentPlayer(s2);
    const w2 = player2.units.find((u) => u.id === warrior.id)!;
    expect(w2.promotions).toContain('discipline');
    expect(w2.xp).toBe(0); // 重置
  });

  it('choosePromotion 命令校验失败当单位未达升级条件', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const warrior = player.units.find((u) => u.type === 'warrior')!;
    // xp = 0, level = 1, 未达升级条件
    const { state: s2 } = applyCommand(state, { kind: 'choosePromotion', unitId: warrior.id, promotionId: 'discipline' });
    const player2 = currentPlayer(s2);
    const w2 = player2.units.find((u) => u.id === warrior.id)!;
    expect(w2.promotions).toEqual([]);
  });

  it('choosePromotion 命令校验失败当可用晋升未选择', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const warrior = player.units.find((u) => u.type === 'warrior')!;
    warrior.xp = 10; // 使可升级
    warrior.level = 1;
    // 选择不存在的晋升 id
    const { state: s2 } = applyCommand(state, { kind: 'choosePromotion', unitId: warrior.id, promotionId: 'nonexistent' });
    const player2 = currentPlayer(s2);
    const w2 = player2.units.find((u) => u.id === warrior.id)!;
    expect(w2.promotions).toEqual([]);
  });
});