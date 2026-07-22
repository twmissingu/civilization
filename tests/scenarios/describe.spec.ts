import { describe, it, expect } from 'vitest';
import {
  describeTile,
  describeTileShort,
  terrainLabel,
  terrainDescription,
  featureLabel,
  featureDescription,
  resourceLabel,
  resourceDescription,
  improvementDescription,
} from '../../src/logic/state/describe';
import { makeState, foundCityP0 } from '../scenarios/helpers';

describe('describeTile', () => {
  it('越界返回越界提示', () => {
    const state = makeState(42);
    expect(describeTile(state, { q: 999, r: 0 })).toContain('越界');
  });

  it('含地形中文标签与坐标', () => {
    const state = makeState(42);
    const tile = state.map.tiles[0];
    const desc = describeTile(state, tile.coord);
    expect(desc).toContain(`(${tile.coord.q},${tile.coord.r})`);
    expect(desc).toContain(terrainLabel(tile.terrain));
  });

  it('城市格描述含城市名', () => {
    const { state: s2, city } = foundCityP0(makeState(42));
    const desc = describeTile(s2, city.tile);
    expect(desc).toContain('Roma');
    expect(desc).toContain('人口');
  });

  it('单位格描述含单位', () => {
    const state = makeState(42);
    const unit = state.players[0].units.find((u) => u.type === 'settler')!;
    const desc = describeTile(state, unit.tile);
    expect(desc).toContain('开拓者');
    expect(desc).toContain('HP');
  });
});

describe('describeTileShort', () => {
  it('越界返回越界提示', () => {
    const state = makeState(42);
    expect(describeTileShort(state, { q: 999, r: 0 })).toContain('越界');
  });

  it('含地形、特征、资源与产出', () => {
    const state = makeState(42);
    const tile = state.map.tiles.find((t) => t.feature && t.resource) ?? state.map.tiles[0];
    const desc = describeTileShort(state, tile.coord);
    expect(desc).toContain(terrainLabel(tile.terrain));
    if (tile.feature) expect(desc).toContain(featureLabel(tile.feature));
    if (tile.resource) expect(desc).toContain(resourceLabel(tile.resource.id));
  });

  it('含城市与单位', () => {
    const { state: s2, city } = foundCityP0(makeState(42));
    const desc = describeTileShort(s2, city.tile);
    expect(desc).toContain('Roma');
    expect(desc).toContain('单位:');
  });
});

describe('describe helpers', () => {
  it('返回已知地形/特征/资源/改良的中文标签与描述', () => {
    expect(terrainLabel('grassland')).toBe('草原');
    expect(terrainDescription('grassland')).toContain('草地');
    expect(featureLabel('forest')).toBe('森林');
    expect(featureDescription('forest')).toContain('森林');
    expect(resourceLabel('iron')).toBe('铁');
    expect(resourceDescription('iron')).toContain('战略资源');
    expect(improvementDescription('farm')).toContain('农场');
  });

  it('未知键返回原值或默认描述', () => {
    expect(terrainLabel('unknown_terrain')).toBe('unknown_terrain');
    expect(terrainDescription('unknown_terrain')).toBe('未知地形');
    expect(featureDescription('unknown_feature')).toBe('未知特征');
    expect(resourceDescription('unknown_resource')).toBe('未知资源');
    expect(improvementDescription('unknown_improvement')).toBe('未知改良');
  });
});
