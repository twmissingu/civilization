import { describe, it, expect } from 'vitest';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import { describeTile, terrainLabel } from '../../src/logic/state/describe';
import type { GameConfig, GameState } from '../../src/logic/state/types';

function makeState(): GameState {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
    difficulty: 'standard',
    maxTurns: 300,
  };
  return createInitialState(42, config);
}

describe('describeTile', () => {
  it('越界返回越界提示', () => {
    const state = makeState();
    expect(describeTile(state, { q: 999, r: 0 })).toContain('越界');
  });

  it('含地形中文标签与坐标', () => {
    const state = makeState();
    const tile = state.map.tiles[0];
    const desc = describeTile(state, tile.coord);
    expect(desc).toContain(`(${tile.coord.q},${tile.coord.r})`);
    expect(desc).toContain(terrainLabel(tile.terrain));
  });

  it('城市格描述含城市名', () => {
    const state = makeState();
    const settler = state.players[0].units.find((u) => u.type === 'settler')!;
    const { state: s2 } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
    const city = s2.players[0].cities[0];
    const desc = describeTile(s2, city.tile);
    expect(desc).toContain('Roma');
    expect(desc).toContain('人口');
  });

  it('单位格描述含单位', () => {
    const state = makeState();
    const unit = state.players[0].units.find((u) => u.type === 'settler')!;
    const desc = describeTile(state, unit.tile);
    expect(desc).toContain('开拓者');
    expect(desc).toContain('HP');
  });
});
