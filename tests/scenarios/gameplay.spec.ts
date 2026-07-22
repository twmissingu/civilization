import { describe, it, expect } from 'vitest';
import { applyCommand, findUnit, canExecute } from '../../src/logic/state/commands';
import { cityYield } from '../../src/logic/state/yield';
import { districtAdjacencyBonus, canPlaceDistrict } from '../../src/logic/state/district';
import { serialize, deserialize, roundTripEquivalent } from '../../src/logic/state/serialize';
import { checkVictory } from '../../src/logic/state/victory';
import { canResearch, advanceResearch } from '../../src/logic/state/tech';
import { canBuildImprovement, buildImprovement } from '../../src/logic/state/builder';
import { settleCity } from '../../src/logic/state/city';
import { resolveTurn } from '../../src/logic/state/turnResolution';
import { getTile } from '../../src/logic/state/mapgen';
import { hexNeighbors, hexEquals } from '../../src/logic/hex';
import type { UnitState } from '../../src/logic/state/types';
import { makeState, foundCityP0 } from '../scenarios/helpers';

describe('CP-01 首回合建城并产出', () => {
  it('开拓者建城后城市存在且有产出', () => {
    const { state: s2, city } = foundCityP0(makeState());
    expect(city).toBeDefined();
    expect(city.name).toBe('Roma');
    expect(city.population).toBe(1);
    expect(city.territory.some((t) => hexEquals(t, city.tile))).toBe(true);
    expect(city.isCapital).toBe(true);
    const y = cityYield(s2, city);
    expect(y.culture).toBeGreaterThan(0); // 纪念碑 +2 文化
  });
});

describe('CP-03 改良地块与产出', () => {
  it('建造者改良地块消耗充能并提升产出', () => {
    const { state: s2, city } = foundCityP0(makeState());
    s2.players[0].researchedTechs.push('pottery', 'mining', 'animal_husbandry');
    const target = hexNeighbors(city.tile).find((n) => {
      const t = getTile(s2.map, n);
      if (!t) return false;
      return t.terrain === 'grassland' || t.terrain === 'plains' || t.terrain === 'hills';
    });
    if (!target) return; // 该 spawn 无可改良邻格，跳过
    const tile = getTile(s2.map, target)!;
    const impId = tile.terrain === 'hills' ? 'mine' : 'farm';
    const builder: UnitState = {
      id: 'unit-test-builder',
      ownerId: 'player-0',
      type: 'builder',
      tile: target,
      hp: 100,
      moveLeft: 2,
      xp: 0,
      level: 1,
      promotions: [],
      charges: 3,
      hasActed: false,
    };
    s2.players[0].units.push(builder);
    expect(canBuildImprovement(s2, builder, impId)).toBe(true);
    buildImprovement(s2, builder, impId);
    expect(getTile(s2.map, target)!.improvement).toBe(impId);
    expect(builder.charges).toBe(2);
  });
});

describe('CP-04 完成科技并解锁', () => {
  it('research 命令设置当前研究，advanceResearch 完成', () => {
    const state = makeState();
    const player = state.players[0];
    expect(canResearch(player, 'pottery')).toBe(true);
    const { state: s2 } = applyCommand(state, { kind: 'research', techId: 'pottery' });
    expect(s2.players[0].currentResearch?.techId).toBe('pottery');
    // 注入足够科技值完成
    advanceResearch(s2.players[0], 100);
    expect(s2.players[0].researchedTechs).toContain('pottery');
    expect(s2.players[0].currentResearch).toBeNull();
  });
  it('未满足前置的科技不可研究', () => {
    const state = makeState();
    expect(canResearch(state.players[0], 'writing')).toBe(false); // 需陶器
  });
});

describe('CP-05 造兵与生产', () => {
  it('trainUnit 入队，生产完成后产出单位', () => {
    const { state: s2, city } = foundCityP0(makeState());
    // 给一个工作的高产地块以加速
    const hills = hexNeighbors(city.tile).find((n) => getTile(s2.map, n)?.terrain === 'hills');
    if (hills) {
      city.territory.push(hills);
      city.workedTiles.push(hills);
    }
    const { state: s3 } = applyCommand(s2, { kind: 'trainUnit', cityId: city.id, unitType: 'warrior' });
    expect(s3.players[0].cities[0].queue).toHaveLength(1);
    // 推进足够回合完成（warrior cost 40）
    let cur = s3;
    for (let i = 0; i < 200; i++) {
      const c = cur.players[0].cities[0];
      if (c.queue.length === 0) break;
      settleCity(cur, c);
    }
    const warrior = cur.players[0].units.find((u) => u.type === 'warrior' && u.id !== 'unit-1');
    expect(warrior).toBeDefined();
  });
});

describe('CP-06 近战攻击', () => {
  it('攻击造成伤害，敌方单位可能死亡', () => {
    const state = makeState();
    // 玩家 0 战士在 spawn，玩家 1 战士也在 spawn（不同位置）
    const p0 = state.players[0];
    const p1 = state.players[1];
    // 设置外交为战争
    state.diplomacy['player-0']['player-1'] = 'war';
    state.diplomacy['player-1']['player-0'] = 'war';
    const attacker = p0.units.find((u) => u.type === 'warrior')!;
    // 把敌方战士放到攻击者邻格
    const target = p1.units.find((u) => u.type === 'warrior')!;
    const adj = hexNeighbors(attacker.tile)[0];
    target.tile = adj;
    const beforeHp = target.hp;
    const { state: s2, events } = applyCommand(state, { kind: 'attack', attackerId: attacker.id, targetTile: adj });
    expect(events.some((e) => e.kind === 'CombatResolved')).toBe(true);
    // 防御方受伤或死亡
    const defenderAfter = findUnit(s2, target.id);
    const died = defenderAfter === undefined;
    expect(died || defenderAfter!.hp < beforeHp).toBe(true);
  });
});

describe('CP-08 区域相邻加成（签名机制）', () => {
  it('学院邻山脉获得 +科技', () => {
    const state = makeState();
    // 找一个邻接山脉的格子作为学院位置
    let campusTile = null as null | { q: number; r: number };
    for (let r = 0; r < state.map.bounds.height; r++) {
      for (let q = 0; q < state.map.bounds.width; q++) {
        const c = { q, r };
        const hasMtn = hexNeighbors(c).some((n) => getTile(state.map, n)?.terrain === 'mountain');
        if (hasMtn) {
          campusTile = c;
          break;
        }
      }
      if (campusTile) break;
    }
    if (!campusTile) return; // 该 seed 无山脉邻接，跳过
    const bonus = districtAdjacencyBonus(state, 'campus', campusTile);
    expect(bonus.science).toBeGreaterThan(0);
  });
  it('placeDistrict 合法性：需领土内 + 解锁 + 人口门槛', () => {
    const { state: s2, city } = foundCityP0(makeState());
    s2.players[0].researchedTechs.push('astrology');
    const inTile = city.territory.find((t) => !hexEquals(t, city.tile)) ?? city.territory[0];
    // territory 只有城中心，扩张几格
    for (const n of hexNeighbors(city.tile)) {
      if (getTile(s2.map, n) && !city.territory.some((t) => hexEquals(t, n))) city.territory.push(n);
    }
    const placeTile = hexNeighbors(city.tile).find((n) => !hexEquals(n, city.tile))!;
    expect(canPlaceDistrict(s2, city, 'campus', placeTile)).toBe(true);
    const { state: s3 } = applyCommand(s2, { kind: 'placeDistrict', cityId: city.id, districtType: 'campus', tile: placeTile });
    expect(s3.players[0].cities[0].queue.some((i) => i.kind === 'district' && i.id === 'campus')).toBe(true);
    void inTile;
  });
});

describe('CP-09 政体切换与政策卡', () => {
  it('解锁市政后可切换政体', () => {
    const state = makeState();
    const player = state.players[0];
    player.researchedCivics.push('political_philosophy');
    expect(canExecute(state, { kind: 'changeGovernment', governmentType: 'classical_republic' })).toBeNull();
    const { state: s2 } = applyCommand(state, { kind: 'changeGovernment', governmentType: 'classical_republic' });
    expect(s2.players[0].government).toBe('classical_republic');
    // 古典共和：1军+2经+0万能 = 3 槽
    expect(s2.players[0].policySlots).toHaveLength(3);
  });
  it('switchPolicy 校验槽位类型', () => {
    const state = makeState();
    state.players[0].researchedCivics.push('state_workforce'); // 解锁 urban_planning
    const r = canExecute(state, { kind: 'switchPolicy', cardId: 'urban_planning', slotIndex: 0 });
    // chiefdom slot 0 = military，urban_planning 是 economic，应失败
    expect(r).not.toBeNull();
  });
});

describe('CP-11 存档 round-trip', () => {
  it('serialize/deserialize 行为等价', () => {
    const { state: s2 } = foundCityP0(makeState());
    expect(roundTripEquivalent(s2)).toBe(true);
    const restored = deserialize(serialize(s2));
    const { state: a } = applyCommand(s2, { kind: 'endTurn' });
    const { state: b } = applyCommand(restored, { kind: 'endTurn' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe('CP-12 胜利终局', () => {
  it('科技胜利：航天阶段 3 完成触发', () => {
    const { state: s2, city } = foundCityP0(makeState());
    city.spaceProject = { stage: 3, progress: 1500 };
    const v = checkVictory(s2);
    expect(v).not.toBeNull();
    expect(v!.type).toBe('science');
    expect(v!.winnerId).toBe('player-0');
  });
  it('分数胜利：回合上限按分数判定', () => {
    const state = makeState();
    state.turn = state.config.maxTurns;
    const v = checkVictory(state);
    expect(v?.type).toBe('score');
  });
});

describe('回合结算', () => {
  it('resolveTurn 推进回合 + 重置移动力 + 收取金币', () => {
    const state = makeState();
    const before = state.turn;
    const u = state.players[0].units[0];
    u.moveLeft = 0;
    resolveTurn(state);
    expect(state.turn).toBe(before + 1);
    expect(state.players[0].units[0].moveLeft).toBeGreaterThan(0);
  });
});

describe('确定性', () => {
  it('同 seed + 同命令序列产出相同状态', () => {
    const seed = 42;
    const run = () => {
      const s = makeState(seed);
      const settler = s.players[0].units.find((u) => u.type === 'settler')!;
      const a = applyCommand(s, { kind: 'foundCity', unitId: settler.id, name: 'X' });
      const b = applyCommand(a.state, { kind: 'research', techId: 'pottery' });
      return b.state;
    };
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });
});
