// 六边形地图渲染层（layers）
// 包含 terrain / dynamic / river / districts / fog 五层渲染
import { Container, Graphics, Text, Polygon, Sprite, Texture } from 'pixi.js';
import { hexToPixel, hexAdd, inBounds } from '../../logic/hex';
import { HEX_DIRECTIONS } from '../../types';
import { cityAt, getReachableTiles, getTileAt, terrainLabel, featureLabel, resourceLabel } from '../../logic/state/query';
import type { Tile } from '../../logic/state/mapgen';
import { makeHexTexture, TERRAIN_COLOR } from '../assets';
import { RESOURCES } from '../../gamedata';
import type { ResourceCategory } from '../../gamedata';
import type { HexCoord } from '../../types';
import type { PlayerState, UnitState, CityState, GameState } from '../../logic/state/types';

// ---------- Constants ----------

export const DISP = 22;
export const PLAYER_TINT = [0x4a8aff, 0xff5050, 0xffaa30, 0x50ff80];
export const UNIT_MARK: Record<string, string> = {
  settler: '⌂', builder: '⚒', warrior: '⚔', archer: '弓', slinger: '石',
  swordsman: '剑', cavalry: '骑', knight: '骑', siege_tower: '塔', catapult: '投',
  cannon: '炮', trireme: '船', quadrireme: '船', musketman: '枪',
};
export const FEATURE_MARK: Record<string, string> = {
  forest: '🌲', rainforest: '🌴', marsh: '░', geothermal: '♨', oasis: '💧', floodplains: '░',
};
export const RESOURCE_COLOR: Record<ResourceCategory, number> = {
  bonus: 0x66ff66,
  luxury: 0xffd700,
  strategic: 0xff5555,
};

// ---------- Shared context for all layer functions ----------

export interface ViewBounds {
  minQ: number;
  maxQ: number;
  minR: number;
  maxR: number;
}

export interface LayerContext {
  // Pool maps
  terrainPool: Map<string, Sprite>;
  dynamicPool: Map<string, Container>;
  districtPool: Map<string, Sprite>;
  riverPool: Map<string, Graphics>;
  fogPool: Map<string, Graphics>;

  // Texture maps
  terrainTex: Map<string, Texture>;
  unitTex: Map<string, Texture>;
  districtTex: Map<string, Texture>;
  featureTex: Map<string, Texture>;

  // Layer containers
  terrainLayer: Container;
  dynamicLayer: Container;
  riverLayer: Container;
  districtsLayer: Container;
  fogLayer: Container;

  // Interaction
  tooltip: Text | null;
  setHoveredTile: (c: HexCoord | null) => void;
  onTile: (c: HexCoord) => void;

  // Animation state
  pulse: number;
  selectedRing: { current: Graphics | null };

  // Game state
  gs: GameState;
  selectedUnitId: string | null;
}

// ---------- Helpers ----------

export function hexPolyPoints(cx: number, cy: number, size: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(cx + size * Math.cos(a), cy + size * Math.sin(a));
  }
  return pts;
}

export function tileKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

// ---------- Ensure functions (object pool) ----------

export function ensureTerrainSprite(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  layer: Container,
): Sprite {
  const key = tileKey(t.coord);
  const existing = ctx.terrainPool.get(key);
  const sprite = existing ?? new Sprite();
  if (!existing) {
    sprite.anchor.set(0.5);
    sprite.eventMode = 'static';
    sprite.hitArea = new Polygon(hexPolyPoints(0, 0, DISP));
    sprite.on('pointertap', () => ctx.onTile(t.coord));
    sprite.on('pointerenter', () => {
      ctx.setHoveredTile(t.coord);
      const tt = ctx.tooltip;
      if (tt) {
        tt.text = `${terrainLabel(t.terrain)}${t.feature ? ` (${featureLabel(t.feature)})` : ''}${t.resource ? ` [${resourceLabel(t.resource.id)}]` : ''}`;
        tt.x = sprite.x;
        tt.y = sprite.y + DISP * 0.7;
        tt.alpha = 1;
      }
    });
    sprite.on('pointerleave', () => {
      ctx.setHoveredTile(null);
      if (ctx.tooltip) ctx.tooltip.alpha = 0;
    });
    ctx.terrainPool.set(key, sprite);
    layer.addChild(sprite);
  }
  const tex = ctx.terrainTex.get(t.terrain) ?? makeHexTexture(TERRAIN_COLOR[t.terrain] ?? 0x444444, DISP);
  sprite.texture = tex;
  sprite.x = cx;
  sprite.y = cy;
  sprite.visible = true;
  return sprite;
}

export function ensureGraphics(ctx: LayerContext, key: string, layer: Container): Graphics {
  let g = ctx.dynamicPool.get(key) as Graphics | undefined;
  if (!g) {
    g = new Graphics();
    g.eventMode = 'none';
    ctx.dynamicPool.set(key, g);
    layer.addChild(g);
  }
  g.clear();
  g.visible = true;
  return g;
}

export function ensureText(ctx: LayerContext, key: string, layer: Container, initial: { text: string; style: object }): Text {
  let txt = ctx.dynamicPool.get(key) as Text | undefined;
  if (!txt) {
    txt = new Text(initial);
    txt.eventMode = 'none';
    ctx.dynamicPool.set(key, txt);
    layer.addChild(txt);
  }
  txt.visible = true;
  return txt;
}

export function ensureSprite(ctx: LayerContext, key: string, layer: Container): Sprite {
  let s = ctx.dynamicPool.get(key) as Sprite | undefined;
  if (!s) {
    s = new Sprite();
    s.anchor.set(0.5);
    s.eventMode = 'none';
    ctx.dynamicPool.set(key, s);
    layer.addChild(s);
  }
  s.visible = true;
  return s;
}

export function ensureRiverGraphics(ctx: LayerContext, key: string, layer: Container): Graphics {
  let g = ctx.riverPool.get(key);
  if (!g) {
    g = new Graphics();
    g.eventMode = 'none';
    ctx.riverPool.set(key, g);
    layer.addChild(g);
  }
  g.clear();
  g.visible = true;
  return g;
}

export function ensureFogGraphics(ctx: LayerContext, key: string, layer: Container): Graphics {
  let g = ctx.fogPool.get(key);
  if (!g) {
    g = new Graphics();
    g.eventMode = 'none';
    ctx.fogPool.set(key, g);
    layer.addChild(g);
  }
  g.clear();
  g.visible = true;
  return g;
}

// ---------- Update functions (per-tile overlay) ----------

export function updateTerritoryOverlay(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  owner: number,
  layer: Container,
  usedKeys: Set<string>,
) {
  const key = `territory:${tileKey(t.coord)}`;
  usedKeys.add(key);
  const g = ensureGraphics(ctx, key, layer);
  g.position.set(cx, cy);
  const ownerColor = PLAYER_TINT[owner % PLAYER_TINT.length];
  g.poly(hexPolyPoints(0, 0, DISP)).fill({ color: ownerColor, alpha: 0.18 });
}

export function updateBorder(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  owner: number,
  ownerByTile: Map<string, number>,
  layer: Container,
  usedKeys: Set<string>,
) {
  const key = `border:${tileKey(t.coord)}`;
  usedKeys.add(key);
  const g = ensureGraphics(ctx, key, layer);
  g.position.set(cx, cy);
  const ownerColor = PLAYER_TINT[owner % PLAYER_TINT.length];
  const pts = hexPolyPoints(0, 0, DISP);
  for (let e = 0; e < 6; e++) {
    const n = hexAdd(t.coord, HEX_DIRECTIONS[e]);
    const nOwner = inBounds(n, ctx.gs.map.bounds) ? ownerByTile.get(tileKey(n)) : undefined;
    if (nOwner === owner) continue;
    const i1 = e;
    const i2 = (e + 1) % 6;
    g.poly([pts[i1 * 2], pts[i1 * 2 + 1], pts[i2 * 2], pts[i2 * 2 + 1]]).stroke({ width: 1.5, color: ownerColor });
  }
}

export function updateFeature(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  layer: Container,
  usedKeys: Set<string>,
) {
  if (!t.feature) return;
  const fTex = ctx.featureTex.get(t.feature);
  if (fTex) {
    const spriteKey = `feature-sprite:${tileKey(t.coord)}`;
    const textKey = `feature-text:${tileKey(t.coord)}`;
    usedKeys.add(spriteKey);
    const s = ensureSprite(ctx, spriteKey, layer);
    s.texture = fTex;
    s.position.set(cx, cy - DISP * 0.2);
    s.alpha = 0.85;
    const oldText = ctx.dynamicPool.get(textKey);
    if (oldText) oldText.visible = false;
  } else if (FEATURE_MARK[t.feature]) {
    const spriteKey = `feature-sprite:${tileKey(t.coord)}`;
    const textKey = `feature-text:${tileKey(t.coord)}`;
    usedKeys.add(textKey);
    const txt = ensureText(ctx, textKey, layer, { text: FEATURE_MARK[t.feature]!, style: { fontSize: DISP * 0.9 } });
    txt.text = FEATURE_MARK[t.feature]!;
    txt.anchor.set(0.5);
    txt.position.set(cx, cy - DISP * 0.1);
    const oldSprite = ctx.dynamicPool.get(spriteKey);
    if (oldSprite) oldSprite.visible = false;
  } else {
    const spriteKey = `feature-sprite:${tileKey(t.coord)}`;
    const textKey = `feature-text:${tileKey(t.coord)}`;
    const oldSprite = ctx.dynamicPool.get(spriteKey);
    const oldText = ctx.dynamicPool.get(textKey);
    if (oldSprite) oldSprite.visible = false;
    if (oldText) oldText.visible = false;
  }
}

export function updateResource(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  layer: Container,
  usedKeys: Set<string>,
) {
  if (!t.resource) return;
  const key = `resource:${tileKey(t.coord)}`;
  usedKeys.add(key);
  const def = RESOURCES[t.resource.id];
  const category = (def?.category as ResourceCategory) ?? 'bonus';
  const rc = RESOURCE_COLOR[category];
  const g = ensureGraphics(ctx, key, layer);
  g.position.set(cx, cy);
  const rx = DISP * 0.4;
  const ry = -DISP * 0.4;
  if (category === 'bonus') {
    g.circle(rx, ry, 2.5).fill(rc);
  } else if (category === 'luxury') {
    const s = 2.5;
    g.poly([rx, ry - s, rx + s, ry, rx, ry + s, rx - s, ry]).fill(rc);
  } else {
    const s = 2.2;
    g.rect(rx - s, ry - s, s * 2, s * 2).fill(rc);
  }
}

export function updateSelection(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  isSel: boolean,
  reach: boolean,
  layer: Container,
  usedKeys: Set<string>,
) {
  if (!isSel && !reach) return;
  const key = `selection:${tileKey(t.coord)}`;
  usedKeys.add(key);
  const g = ensureGraphics(ctx, key, layer);
  g.position.set(cx, cy);
  g.poly(hexPolyPoints(0, 0, DISP)).stroke({ width: 2.5, color: isSel ? 0xffffff : 0xffff00 });
}

export function updateCity(
  ctx: LayerContext,
  city: CityState,
  cx: number,
  cy: number,
  player: PlayerState,
  layer: Container,
  usedKeys: Set<string>,
) {
  const key = `city:${tileKey(city.tile)}`;
  const popKey = `city-pop:${tileKey(city.tile)}`;
  const nameKey = `city-name:${tileKey(city.tile)}`;
  usedKeys.add(key);
  usedKeys.add(popKey);
  usedKeys.add(nameKey);

  const g = ensureGraphics(ctx, key, layer);
  g.position.set(cx, cy);
  const col = city.ownerId === player.id ? 0x44aaff : 0xff4444;
  g.circle(0, 0, DISP * 0.5).fill(col).stroke({ width: 1.5, color: 0xffffff });

  const popT = ensureText(ctx, popKey, layer, { text: `${city.population}`, style: { fill: '#ffffff', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' } });
  popT.text = `${city.population}`;
  popT.anchor.set(0.5);
  popT.position.set(cx, cy);

  const nameT = ensureText(ctx, nameKey, layer, { text: city.name, style: { fill: '#ffffff', fontSize: 8, fontFamily: 'monospace', stroke: { color: '#000000', width: 2 } } });
  nameT.text = city.name.length > 6 ? city.name.slice(0, 6) + '..' : city.name;
  nameT.anchor.set(0.5);
  nameT.position.set(cx, cy + DISP * 0.8);
}

export function updateUnit(
  ctx: LayerContext,
  unit: UnitState,
  cx: number,
  cy: number,
  player: PlayerState,
  layer: Container,
  usedKeys: Set<string>,
) {
  const ownerIdx = ctx.gs.players.findIndex((pp) => pp.id === unit.ownerId);
  const ringCol = unit.ownerId === player.id ? 0x44ff44 : (ownerIdx >= 0 ? PLAYER_TINT[ownerIdx % PLAYER_TINT.length] : 0xff4444);
  const acted = unit.moveLeft === 0 || unit.hasActed;

  const ringKey = `unit-ring:${unit.id}`;
  const spriteIconKey = `unit-icon-sprite:${unit.id}`;
  const textIconKey = `unit-icon-text:${unit.id}`;
  usedKeys.add(ringKey);

  const ring = ensureGraphics(ctx, ringKey, layer);
  ring.position.set(cx, cy);
  const isInjured = unit.hp < 100;
  const ringAlpha = isInjured ? 0.7 + Math.sin(ctx.pulse * 3) * 0.3 : (acted ? 0.4 : 0.9);
  const ringColor = isInjured ? 0xff3333 : ringCol;
  ring.circle(0, 0, DISP * 0.72).fill({ color: ringColor, alpha: ringAlpha }).stroke({ width: 1.5, color: 0x000000, alpha: 0.5 });
  if (unit.id === ctx.selectedUnitId) {
    ctx.selectedRing.current = ring;
    ring.alpha = 0.9;
  } else if (ctx.selectedRing.current === ring) {
    ctx.selectedRing.current = null;
  }

  const uTex = ctx.unitTex.get(unit.type);
  if (uTex) {
    usedKeys.add(spriteIconKey);
    const us = ensureSprite(ctx, spriteIconKey, layer);
    us.texture = uTex;
    us.position.set(cx, cy);
    us.alpha = acted ? 0.55 : 1;
    const oldText = ctx.dynamicPool.get(textIconKey);
    if (oldText) oldText.visible = false;
  } else {
    usedKeys.add(textIconKey);
    const txt = ensureText(ctx, textIconKey, layer, { text: UNIT_MARK[unit.type] ?? '?', style: { fill: '#ffffff', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' } });
    txt.text = UNIT_MARK[unit.type] ?? '?';
    txt.anchor.set(0.5);
    txt.position.set(cx, cy + 1);
    txt.alpha = acted ? 0.55 : 1;
    const oldSprite = ctx.dynamicPool.get(spriteIconKey);
    if (oldSprite) oldSprite.visible = false;
  }

  if (unit.hp < 100) {
    const hpBgKey = `unit-hp-bg:${unit.id}`;
    const hpFgKey = `unit-hp-fg:${unit.id}`;
    usedKeys.add(hpBgKey);
    usedKeys.add(hpFgKey);
    const hpW = DISP * 1.1;
    const hpPct = Math.max(0, unit.hp) / 100;

    const hpBg = ensureGraphics(ctx, hpBgKey, layer);
    hpBg.position.set(cx, cy);
    hpBg.rect(-hpW / 2, -DISP * 0.95, hpW, 3).fill(0x330000);

    const hpFg = ensureGraphics(ctx, hpFgKey, layer);
    hpFg.position.set(cx, cy);
    hpFg.rect(-hpW / 2, -DISP * 0.95, hpW * hpPct, 3).fill(hpPct > 0.5 ? 0x33ff33 : hpPct > 0.25 ? 0xffaa00 : 0xff3333);
  }
}

// ---------- renderTile (per-tile dispatch) ----------

export function renderTile(
  ctx: LayerContext,
  t: Tile,
  cx: number,
  cy: number,
  player: PlayerState,
  selectedUnit: UnitState | null,
  ownerByTile: Map<string, number>,
  unitByTile: Map<string, UnitState>,
  isReachable: (c: HexCoord) => boolean,
  layer: Container,
  usedKeys: Set<string>,
) {
  const owner = ownerByTile.get(tileKey(t.coord));
  if (owner !== undefined) {
    updateTerritoryOverlay(ctx, t, cx, cy, owner, layer, usedKeys);
    updateBorder(ctx, t, cx, cy, owner, ownerByTile, layer, usedKeys);
  }
  if (t.feature) updateFeature(ctx, t, cx, cy, layer, usedKeys);
  if (t.resource) updateResource(ctx, t, cx, cy, layer, usedKeys);
  const isSel = selectedUnit && selectedUnit.tile.q === t.coord.q && selectedUnit.tile.r === t.coord.r;
  const reach = isReachable(t.coord);
  if (isSel || reach) updateSelection(ctx, t, cx, cy, Boolean(isSel), reach, layer, usedKeys);
  const city = cityAt(ctx.gs, t.coord);
  if (city) updateCity(ctx, city, cx, cy, player, layer, usedKeys);
  const unit = unitByTile.get(tileKey(t.coord));
  if (unit) updateUnit(ctx, unit, cx, cy, player, layer, usedKeys);
}

// ---------- Layer render functions ----------

export function renderTerrainLayer(ctx: LayerContext, vb: ViewBounds): Set<string> {
  const used = new Set<string>();
  const layer = ctx.terrainLayer;
  for (const t of ctx.gs.map.tiles) {
    if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
    const p = hexToPixel(t.coord, DISP);
    const cx = p.x + DISP;
    const cy = p.y + DISP;
    ensureTerrainSprite(ctx, t, cx, cy, layer);
    used.add(tileKey(t.coord));
  }
  return used;
}

export function renderDynamicLayer(
  ctx: LayerContext,
  cam: { x: number; y: number },
  vb: ViewBounds,
  player: PlayerState,
  selectedUnit: UnitState | null,
  usedKeys: Set<string>,
) {
  const layer = ctx.dynamicLayer;
  const reachable = selectedUnit && selectedUnit.ownerId === player.id
    ? new Set(getReachableTiles(ctx.gs, selectedUnit.id).map(tileKey))
    : new Set<string>();
  const isReachable = (c: HexCoord) => reachable.has(tileKey(c));
  const ownerByTile = new Map<string, number>();
  ctx.gs.players.forEach((p, idx) => { for (const c of p.cities) for (const tile of c.territory) ownerByTile.set(tileKey(tile), idx); });
  const unitByTile = new Map<string, UnitState>();
  for (const p of ctx.gs.players) {
    for (const u of p.units) {
      unitByTile.set(tileKey(u.tile), u);
    }
  }

  for (const t of ctx.gs.map.tiles) {
    if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
    const p = hexToPixel(t.coord, DISP);
    const cx = p.x + DISP + cam.x;
    const cy = p.y + DISP + cam.y;
    renderTile(ctx, t, cx, cy, player, selectedUnit, ownerByTile, unitByTile, isReachable, layer, usedKeys);
  }
}

export function renderDistrictsLayer(ctx: LayerContext, vb: ViewBounds, usedKeys: Set<string>) {
  const dlayer = ctx.districtsLayer;
  for (const p of ctx.gs.players) for (const c of p.cities) for (const d of c.districts) {
    if (d.tile.q < vb.minQ || d.tile.q > vb.maxQ || d.tile.r < vb.minR || d.tile.r > vb.maxR) continue;
    const key = `${c.id}:${d.type}:${tileKey(d.tile)}`;
    usedKeys.add(key);
    const dTex = ctx.districtTex.get(d.type);
    if (!dTex) continue;
    let ds = ctx.districtPool.get(key);
    if (!ds) {
      ds = new Sprite(dTex);
      ds.anchor.set(0.5);
      ds.eventMode = 'none';
      ctx.districtPool.set(key, ds);
      dlayer.addChild(ds);
    }
    ds.texture = dTex;
    const dp = hexToPixel(d.tile, DISP);
    ds.x = dp.x + DISP;
    ds.y = dp.y + DISP;
    ds.visible = true;
  }
}

export function renderRiverLayer(ctx: LayerContext, vb: ViewBounds, usedKeys: Set<string>) {
  const layer = ctx.riverLayer;
  for (const t of ctx.gs.map.tiles) {
    if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
    if (!t.isRiver) continue;
    if (t.visibility === 'unexplored') continue;
    for (const dir of HEX_DIRECTIONS) {
      const n = hexAdd(t.coord, dir);
      if (!inBounds(n, ctx.gs.map.bounds)) continue;
      const nt = getTileAt(ctx.gs, n);
      if (!nt || !nt.isRiver) continue;
      const key = `river:${tileKey(t.coord)}-${tileKey(n)}`;
      if (usedKeys.has(key)) continue;
      const key2 = `river:${tileKey(n)}-${tileKey(t.coord)}`;
      if (usedKeys.has(key2)) continue;
      usedKeys.add(key);
      const g = ensureRiverGraphics(ctx, key, layer);
      const p1 = hexToPixel(t.coord, DISP);
      const p2 = hexToPixel(n, DISP);
      const cx1 = p1.x + DISP;
      const cy1 = p1.y + DISP;
      const cx2 = p2.x + DISP;
      const cy2 = p2.y + DISP;
      g.moveTo(cx1, cy1);
      g.lineTo(cx2, cy2);
      g.stroke({ width: 3, color: 0x4488cc, alpha: 0.7 });
    }
  }
}

export function renderFogLayer(ctx: LayerContext, vb: ViewBounds, usedKeys: Set<string>) {
  const layer = ctx.fogLayer;
  for (const t of ctx.gs.map.tiles) {
    if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
    if (t.visibility === 'visible') continue;
    const key = `fog:${tileKey(t.coord)}`;
    usedKeys.add(key);
    const g = ensureFogGraphics(ctx, key, layer);
    const p = hexToPixel(t.coord, DISP);
    g.position.set(p.x + DISP, p.y + DISP);
    if (t.visibility === 'unexplored') {
      g.poly(hexPolyPoints(0, 0, DISP)).fill({ color: 0x000000, alpha: 0.85 });
    } else {
      g.poly(hexPolyPoints(0, 0, DISP)).fill({ color: 0x000000, alpha: 0.45 });
      g.poly(hexPolyPoints(0, 0, DISP)).stroke({ width: 0.5, color: 0x000000, alpha: 0.3 });
    }
  }
}