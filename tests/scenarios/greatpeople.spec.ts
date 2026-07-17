// CP-14 大人物招募 + 效果
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand, currentPlayer } from '../../src/logic/state/commands';
import { canRecruitGreatPerson, availableGreatPeople } from '../../src/logic/state/greatpeople';
import { GREAT_PEOPLE } from '../../src/gamedata';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(seed = 42): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  return createInitialState(seed, config);
}

describe('CP-14 大人物', () => {
  it('初始无伟人点时可招募列表为空', () => {
    const state = makeState();
    const player = currentPlayer(state);
    expect(availableGreatPeople(state, player)).toHaveLength(0);
  });

  it('积累伟人点后可招募', () => {
    const state = makeState();
    const player = currentPlayer(state);
    // 给足够伟人点
    player.greatPersonPoints['general'] = 60;
    const available = availableGreatPeople(state, player);
    expect(available.length).toBeGreaterThanOrEqual(1);
    expect(available.some((a) => a.def.type === 'general')).toBe(true);
  });

  it('canRecruitGreatPerson 校验', () => {
    const state = makeState();
    const player = currentPlayer(state);
    const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
    expect(canRecruitGreatPerson(state, player, gp.id)).toBe(false);
    player.greatPersonPoints['general'] = 60;
    expect(canRecruitGreatPerson(state, player, gp.id)).toBe(true);
  });

  it('招募大人物扣除伟人点并添加效果', () => {
    let state = makeState();
    const player = currentPlayer(state);
    player.greatPersonPoints['general'] = 60;
    const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
    const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
    const player2 = currentPlayer(s2);
    expect(player2.greatPersonPoints['general']).toBe(0);
    expect(player2.recruitedGreatPeople).toContain(gp.id);
  });

  it('大人物全局唯一性（同一人物不能被招募两次）', () => {
    let state = makeState();
    const player = currentPlayer(state);
    player.greatPersonPoints['general'] = 60;
    const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'general')!;
    const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
    const player2 = currentPlayer(s2);
    expect(canRecruitGreatPerson(s2, player2, gp.id)).toBe(false);
  });

  it('大商人提供金币', () => {
    let state = makeState();
    const player = currentPlayer(state);
    player.greatPersonPoints['merchant'] = 120;
    const gp = Object.values(GREAT_PEOPLE).find((g) => g.type === 'merchant')!;
    const goldBefore = player.gold;
    const { state: s2 } = applyCommand(state, { kind: 'recruitGreatPerson', greatPersonId: gp.id });
    const player2 = currentPlayer(s2);
    expect(player2.gold).toBeGreaterThan(goldBefore);
  });
});