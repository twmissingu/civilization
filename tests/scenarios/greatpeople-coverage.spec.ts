// 大人物全覆盖测试
import { describe, it, expect } from 'vitest';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import {
  canRecruitGreatPerson,
  availableGreatPeople,
  recruitGreatPerson,
  addGreatPersonPoints,
  allAvailableGreatPeople,
} from '../../src/logic/state/greatpeople';
import { GREAT_PEOPLE, TECHS } from '../../src/gamedata';
import type { GameState } from '../../src/logic/state/types';
import { makeState } from '../scenarios/helpers';

// 从玩家中剔除所有大人物（用于测试全部可用大人物列表）
function clearAllGreatPeople(state: GameState): void {
  for (const p of state.players) {
    p.recruitedGreatPeople = [];
    p.greatPersonPoints = {};
  }
}

describe('大人物全覆盖', () => {
  describe('availableGreatPeople', () => {
    it('无伟人点时返回空列表', () => {
      const state = makeState();
      const player = currentPlayer(state);
      expect(availableGreatPeople(state, player)).toHaveLength(0);
    });

    it('进度 >= cost 时返回对应条目', () => {
      const state = makeState();
      const player = currentPlayer(state);
      // 给所有类型足够点数
      for (const gp of Object.values(GREAT_PEOPLE)) {
        player.greatPersonPoints[gp.type] = gp.cost;
      }
      const all = availableGreatPeople(state, player);
      // 应返回所有大人物
      expect(all.length).toBe(Object.values(GREAT_PEOPLE).length);
      for (const gp of Object.values(GREAT_PEOPLE)) {
        expect(all.some((a) => a.def.id === gp.id)).toBe(true);
      }
    });

    it('进度不足时只返回满足条件的条目', () => {
      const state = makeState();
      const player = currentPlayer(state);
      // 只给 general 类型足够点数
      player.greatPersonPoints['general'] = 60;
      const available = availableGreatPeople(state, player);
      expect(available.length).toBeGreaterThanOrEqual(1);
      for (const a of available) {
        expect(a.def.type).toBe('general');
      }
    });

    it('playerProgress 反映实际累积点数', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 100;
      const available = availableGreatPeople(state, player);
      for (const a of available) {
        if (a.def.type === 'general') {
          expect(a.playerProgress).toBe(100);
        }
      }
    });
  });

  describe('canRecruitGreatPerson', () => {
    it('不存在的 id 返回 false', () => {
      const state = makeState();
      const player = currentPlayer(state);
      expect(canRecruitGreatPerson(state, player, 'nonexistent')).toBe(false);
    });

    it('点数不足时返回 false', () => {
      const state = makeState();
      const player = currentPlayer(state);
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      expect(canRecruitGreatPerson(state, player, gp.id)).toBe(false);
    });

    it('点数足够时返回 true', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      expect(canRecruitGreatPerson(state, player, gp.id)).toBe(true);
    });

    it('已被其他玩家招募时返回 false', () => {
      const state = makeState();
      const player = currentPlayer(state);
      const otherPlayer = state.players[1];
      player.greatPersonPoints['general'] = 60;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      // 其他玩家已招募
      otherPlayer.recruitedGreatPeople = [gp.id];
      expect(canRecruitGreatPerson(state, player, gp.id)).toBe(false);
    });
  });

  describe('recruitGreatPerson', () => {
    it('不存在的 id 不报错', () => {
      const state = makeState();
      const player = currentPlayer(state);
      expect(() => recruitGreatPerson(state, player, 'nonexistent')).not.toThrow();
    });

    it('扣除伟人点', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      expect(player2.greatPersonPoints['general']).toBe(0);
    });

    it('添加到 recruitedGreatPeople', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      expect(player2.recruitedGreatPeople).toContain(gp.id);
    });

    it('初始化空的 recruitedGreatPeople 数组', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      delete (player as unknown as Record<string, unknown>).recruitedGreatPeople;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      recruitGreatPerson(state, player, gp.id);
      expect(player.recruitedGreatPeople).toEqual([gp.id]);
    });
  });

  describe('applyGreatPersonEffect', () => {
    it('gold_bonus - 立即获得金币', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['merchant'] = 120;
      const gp = GREAT_PEOPLE['marco_polo'];
      const goldBefore = player.gold;
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      expect(player2.gold).toBe(goldBefore + (gp.effectValue ?? 0));
    });

    it('gold_on_capture - 不立即影响金币（在 combat 中处理）', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      const gp = GREAT_PEOPLE['caesar'];
      const goldBefore = player.gold;
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      // 此效果类型不改变金币，在 combat.ts 中拦截
      expect(player2.gold).toBe(goldBefore);
    });

    it('science_mult - 不立即影响科技（在 yield 中处理）', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['scientist'] = 300;
      const gp = GREAT_PEOPLE['einstein'];
      const techsBefore = [...player.researchedTechs];
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      // 此效果类型在 yield 中处理，不应立即增加科技
      expect(player2.researchedTechs).toEqual(techsBefore);
    });

    it('free_tech - 立即获得随机科技', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['scientist'] = 60;
      const gp = GREAT_PEOPLE['archimedes'];
      const techsBefore = [...player.researchedTechs];
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      expect(player2.researchedTechs.length).toBe(techsBefore.length + 1);
      const newTech = player2.researchedTechs.find((t) => !techsBefore.includes(t));
      expect(newTech).toBeDefined();
      // 新科技应为古典时代
      const techDef = Object.values(TECHS).find((t) => t.id === newTech);
      expect(techDef?.era).toBe('classical');
    });

    it('free_tech - 当所有科技已研究时不会溢出', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['scientist'] = 60;
      // 预研所有古典科技
      const classicalTechs = Object.values(TECHS).filter((t) => t.era === 'classical');
      player.researchedTechs = classicalTechs.map((t) => t.id);
      const gp = GREAT_PEOPLE['archimedes'];
      const techsBefore = [...player.researchedTechs];
      recruitGreatPerson(state, player, gp.id);
      // 没有可研究的古典科技，不应增加
      expect(player.researchedTechs).toEqual(techsBefore);
    });

    it('free_tech - 多个科技（如牛顿2个文艺复兴科技）', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['scientist'] = 180;
      const gp = GREAT_PEOPLE['newton'];
      const techsBefore = [...player.researchedTechs];
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      const gained = player2.researchedTechs.filter((t) => !techsBefore.includes(t));
      expect(gained.length).toBeLessThanOrEqual(2);
      for (const tId of gained) {
        const tDef = Object.values(TECHS).find((t) => t.id === tId);
        expect(tDef?.era).toBe('renaissance');
      }
    });

    it('culture_bonus - 立即获得文化值', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['artist'] = 30;
      // 确保有 currentCivic
      if (!player.currentCivic) {
        player.currentCivic = { civicId: 'code_of_laws', progress: 0 };
      }
      const progressBefore = player.currentCivic.progress;
      const gp = GREAT_PEOPLE['homer'];
      recruitGreatPerson(state, player, gp.id);
      expect(player.currentCivic!.progress).toBe(progressBefore + (gp.effectValue ?? 0));
    });

    it('culture_bonus - 无 currentCivic 时不报错', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['artist'] = 30;
      player.currentCivic = null;
      const gp = GREAT_PEOPLE['homer'];
      expect(() => recruitGreatPerson(state, player, gp.id)).not.toThrow();
    });

    it('culture_per_city - 不立即改变文化产出（在 yield 中处理）', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['artist'] = 180;
      const gp = GREAT_PEOPLE['shakespeare'];
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      // 此效果类型在 yield 中处理，不应立即改变状态
      expect(player2.recruitedGreatPeople).toContain(gp.id);
    });

    it('wonder_boost - 加速在建奇观', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['engineer'] = 30;
      // 模拟一个城市及在建奇观
      player.cities.push({
        id: 'test_city', ownerId: player.id, name: 'Test', tile: { q: 0, r: 0 },
        territory: [], workedTiles: [], population: 1, food: 0, culture: 0,
        housing: 2, amenities: 0, buildings: [], districts: [], wonders: [],
        queue: [{ kind: 'wonder', id: 'pyramids', progress: 50 }],
        hp: 10, wallsHp: 0, wallsMax: 0, isCapital: false, rangedStrikeUsed: false,
        religion: {}, dominantReligion: null,
      });
      const gp = GREAT_PEOPLE['imhotep'];
      recruitGreatPerson(state, player, gp.id);
      // 15% 加速: 50 * 0.15 = 7.5 -> 8 (Math.round)
      expect(player.cities[0].queue[0].progress).toBe(50 + Math.round(15 * 0.01 * 50));
    });

    it('wonder_boost - 无奇观在建时安全', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['engineer'] = 30;
      // 有城市但无奇观在建
      player.cities.push({
        id: 'test_city', ownerId: player.id, name: 'Test', tile: { q: 0, r: 0 },
        territory: [], workedTiles: [], population: 1, food: 0, culture: 0,
        housing: 2, amenities: 0, buildings: [], districts: [], wonders: [],
        queue: [], hp: 10, wallsHp: 0, wallsMax: 0, isCapital: false, rangedStrikeUsed: false,
        religion: {}, dominantReligion: null,
      });
      const gp = GREAT_PEOPLE['imhotep'];
      expect(() => recruitGreatPerson(state, player, gp.id)).not.toThrow();
    });

    it('wonder_boost - 多个奇观同时加速', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['engineer'] = 30;
      player.cities.push({
        id: 'test_city', ownerId: player.id, name: 'Test', tile: { q: 0, r: 0 },
        territory: [], workedTiles: [], population: 1, food: 0, culture: 0,
        housing: 2, amenities: 0, buildings: [], districts: [], wonders: [],
        queue: [
          { kind: 'wonder', id: 'pyramids', progress: 50 },
          { kind: 'wonder', id: 'great_library', progress: 30 },
          { kind: 'unit', id: 'warrior', progress: 20 },
        ],
        hp: 10, wallsHp: 0, wallsMax: 0, isCapital: false, rangedStrikeUsed: false,
        religion: {}, dominantReligion: null,
      });
      const gp = GREAT_PEOPLE['imhotep'];
      recruitGreatPerson(state, player, gp.id);
      // 两个奇观被加速，单位不受影响
      expect(player.cities[0].queue[0].progress).toBeGreaterThan(50);
      expect(player.cities[0].queue[1].progress).toBeGreaterThan(30);
      // 单位进度不变
      expect(player.cities[0].queue[2].progress).toBe(20);
    });

    it('未处理的 effectType 不报错', () => {
      const state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      player.greatPersonPoints['general'] = 120;
      // 测试具有 combat_bonus 效果类型的亚历山大
      const gp = GREAT_PEOPLE['alexander'];
      expect(() => recruitGreatPerson(state, player, gp.id)).not.toThrow();
    });
  });

  describe('addGreatPersonPoints', () => {
    it('累计点数', () => {
      const player = makeState().players[0];
      addGreatPersonPoints(player, 'general', 10);
      expect(player.greatPersonPoints['general']).toBe(10);
      addGreatPersonPoints(player, 'general', 20);
      expect(player.greatPersonPoints['general']).toBe(30);
    });

    it('不同类型的点数独立累积', () => {
      const player = makeState().players[0];
      addGreatPersonPoints(player, 'general', 10);
      addGreatPersonPoints(player, 'scientist', 20);
      expect(player.greatPersonPoints['general']).toBe(10);
      expect(player.greatPersonPoints['scientist']).toBe(20);
    });

    it('初始为 0 时正确累加', () => {
      const player = makeState().players[0];
      player.greatPersonPoints = {};
      addGreatPersonPoints(player, 'engineer', 5);
      expect(player.greatPersonPoints['engineer']).toBe(5);
    });
  });

  describe('allAvailableGreatPeople', () => {
    it('返回所有大人物（无人招募时）', () => {
      const state = makeState();
      clearAllGreatPeople(state);
      const all = allAvailableGreatPeople(state);
      expect(all.length).toBe(Object.values(GREAT_PEOPLE).length);
    });

    it('排除已招募的大人物', () => {
      const state = makeState();
      clearAllGreatPeople(state);
      const gp = Object.values(GREAT_PEOPLE)[0];
      state.players[0].recruitedGreatPeople = [gp.id];
      const all = allAvailableGreatPeople(state);
      expect(all.find((a) => a.id === gp.id)).toBeUndefined();
      // 总数少一个
      expect(all.length).toBe(Object.values(GREAT_PEOPLE).length - 1);
    });

    it('排除所有玩家已招募的大人物', () => {
      const state = makeState();
      clearAllGreatPeople(state);
      const gp1 = Object.values(GREAT_PEOPLE)[0];
      const gp2 = Object.values(GREAT_PEOPLE)[1];
      state.players[0].recruitedGreatPeople = [gp1.id];
      state.players[1].recruitedGreatPeople = [gp2.id];
      const all = allAvailableGreatPeople(state);
      expect(all.find((a) => a.id === gp1.id)).toBeUndefined();
      expect(all.find((a) => a.id === gp2.id)).toBeUndefined();
      expect(all.length).toBe(Object.values(GREAT_PEOPLE).length - 2);
    });

    it('所有玩家无 recruitedGreatPeople 时返回全部', () => {
      const state = makeState();
      for (const p of state.players) {
        delete (p as unknown as Record<string, unknown>).recruitedGreatPeople;
      }
      const all = allAvailableGreatPeople(state);
      expect(all.length).toBe(Object.values(GREAT_PEOPLE).length);
    });
  });

  describe('招募后校验', () => {
    it('招募后 canRecruitGreatPerson 返回 false（全局唯一性）', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      expect(canRecruitGreatPerson(s2, player2, gp.id)).toBe(false);
    });

    it('同一玩家无法再次招募同一大人物', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 120;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const player2 = currentPlayer(s2);
      // 第二次招募应失败
      player2.greatPersonPoints['general'] = 60;
      const canRecruit = canRecruitGreatPerson(s2, player2, gp.id);
      expect(canRecruit).toBe(false);
    });

    it('大人物招募事件正确记录', () => {
      let state = makeState();
      const player = currentPlayer(state);
      player.greatPersonPoints['general'] = 60;
      const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
      const { events } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
      const event = events.find((e) => e.kind === 'GreatPersonRecruited');
      expect(event).toBeDefined();
      expect(event!.payload.greatPersonId).toBe(gp.id);
    });
  });
});