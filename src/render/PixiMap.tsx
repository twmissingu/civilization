// PixiJS 六边形地图渲染器（pointy-top）
import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, Polygon, Sprite, Texture } from 'pixi.js';
import { useGame } from './store';
import { hexToPixel, hexNeighbors, inBounds } from '../logic/hex';
import { findUnit, currentPlayer } from '../logic/state/commands';
import { cityAt } from '../logic/state/combat';
import { getTile } from '../logic/state/mapgen';
import { makeHexTexture, TERRAIN_COLOR, makeHexTextureFromImage, terrainAssetUrl, makeCircleTextureFromImage, unitAssetUrl, districtAssetUrl } from './assets';
import type { HexCoord } from '../types';

const UNIT_MARK: Record<string, string> = {
  settler: '⌂', builder: '⚒', warrior: '⚔', archer: '弓', slinger: '石',
  swordsman: '剑', cavalry: '骑', knight: '骑', siege_tower: '塔', catapult: '投',
  cannon: '炮', trireme: '船', quadrireme: '船', musketman: '枪',
};

const DISP = 15;
const PLAYER_TINT = [0x4a8aff, 0xff5050, 0xffaa30, 0x50ff80];

function hexPolyPoints(cx: number, cy: number, size: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(cx + size * Math.cos(a), cy + size * Math.sin(a));
  }
  return pts;
}

export function PixiMap() {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const terrainTexRef = useRef<Map<string, Texture>>(new Map());
  const unitTexRef = useRef<Map<string, Texture>>(new Map());
  const districtTexRef = useRef<Map<string, Texture>>(new Map());
  const state = useGame((s) => s.state);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const command = useGame((s) => s.command);
  const selectUnit = useGame((s) => s.selectUnit);
  const selectCity = useGame((s) => s.selectCity);
  const setHoveredTile = useGame((s) => s.setHoveredTile);

  useEffect(() => {
    let destroyed = false;
    const app = new Application();
    app
      .init({
        width: 900,
        height: 560,
        background: 0x1a1a2e,
        resizeTo: hostRef.current ?? undefined,
        antialias: true,
      })
      .then(() => {
        if (destroyed) {
          app.destroy(true);
          return;
        }
        appRef.current = app;
        if (hostRef.current) hostRef.current.appendChild(app.canvas);
        draw();
        // 预加载 AI 地形纹理
        const terrains = ['grassland', 'plains', 'hills', 'desert', 'tundra', 'snow', 'coast', 'ocean', 'mountain'];
        const unitTypes = ['warrior', 'archer', 'settler', 'builder', 'swordsman', 'cavalry', 'slinger', 'knight', 'trireme', 'quadrireme', 'musketman', 'cannon', 'siege_tower'];
        const districtTypes = ['campus', 'commercial', 'holy', 'industrial', 'encampment', 'theater', 'harbor'];
        Promise.allSettled([
          ...terrains.map(async (t) => { try { terrainTexRef.current.set(t, await makeHexTextureFromImage(terrainAssetUrl(t), DISP)); } catch { /* fallback */ } }),
          ...unitTypes.map(async (u) => { try { unitTexRef.current.set(u, await makeCircleTextureFromImage(unitAssetUrl(u), DISP * 0.85)); } catch { /* fallback */ } }),
          ...districtTypes.map(async (d) => { try { districtTexRef.current.set(d, await makeCircleTextureFromImage(districtAssetUrl(d), DISP * 0.65)); } catch { /* fallback */ } }),
        ]).then(() => draw());
      });
    return () => {
      destroyed = true;
      app.destroy(true);
      appRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appRef.current) draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, selectedUnitId]);

  function onTile(coord: HexCoord) {
    const player = currentPlayer(state);
    const selectedUnit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
    const unitAt = state.players.flatMap((p) => p.units).find((u) => u.tile.q === coord.q && u.tile.r === coord.r);
    if (selectedUnit && selectedUnit.ownerId === player.id) {
      const city = cityAt(state, coord);
      if (unitAt && unitAt.ownerId !== player.id) {
        command({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (city && city.ownerId !== player.id) {
        command({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (!unitAt) {
        command({ kind: 'moveUnit', unitId: selectedUnit.id, to: coord });
        return;
      }
    }
    if (unitAt && unitAt.ownerId === player.id) {
      selectUnit(unitAt.id);
      return;
    }
    const city = cityAt(state, coord);
    if (city) selectCity(city.id);
  }

  function draw() {
    const app = appRef.current;
    if (!app) return;
    app.stage.removeChildren();
    const player = currentPlayer(state);
    const selectedUnit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
    const bounds = state.map.bounds;

    const reachable: HexCoord[] = [];
    if (selectedUnit && selectedUnit.ownerId === player.id) {
      for (const n of hexNeighbors(selectedUnit.tile)) {
        if (!inBounds(n, bounds)) continue;
        const t = getTile(state.map, n);
        if (!t || t.terrain === 'ocean' || t.terrain === 'mountain') continue;
        reachable.push(n);
      }
    }
    const isReachable = (c: HexCoord) => reachable.some((r) => r.q === c.q && r.r === c.r);

    // 领土归属
    const ownerByTile = new Map<string, number>();
    state.players.forEach((p, idx) => {
      for (const c of p.cities) for (const tile of c.territory) ownerByTile.set(`${tile.q},${tile.r}`, idx);
    });

    const layer = new Container();
    app.stage.addChild(layer);

    for (const t of state.map.tiles) {
      const p = hexToPixel(t.coord, DISP);
      const cx = p.x + DISP;
      const cy = p.y + DISP;
      const isSel = selectedUnit && selectedUnit.tile.q === t.coord.q && selectedUnit.tile.r === t.coord.r;
      const reach = isReachable(t.coord);
      const aiTex = terrainTexRef.current.get(t.terrain);
      const tex = aiTex ?? makeHexTexture(TERRAIN_COLOR[t.terrain] ?? 0x444444, DISP);
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.x = cx;
      sprite.y = cy;
      sprite.eventMode = 'static';
      sprite.hitArea = new Polygon(hexPolyPoints(cx, cy, DISP));
      sprite.on('pointertap', () => onTile(t.coord));
      sprite.on('pointerenter', () => setHoveredTile(t.coord));
      sprite.on('pointerleave', () => setHoveredTile(null));
      layer.addChild(sprite);
      // 领土着色
      const owner = ownerByTile.get(`${t.coord.q},${t.coord.r}`);
      if (owner !== undefined) {
        const ov = new Graphics();
        ov.poly(hexPolyPoints(cx, cy, DISP)).fill({ color: PLAYER_TINT[owner % PLAYER_TINT.length], alpha: 0.2 });
        layer.addChild(ov);
      }
      if (isSel || reach) {
        const stroke = new Graphics();
        stroke.poly(hexPolyPoints(cx, cy, DISP)).stroke({ width: 2, color: isSel ? 0xffffff : 0xffff00 });
        layer.addChild(stroke);
      }

      const city = cityAt(state, t.coord);
      if (city) {
        const c = new Graphics().circle(cx, cy, DISP * 0.55).fill(city.ownerId === player.id ? 0x44aaff : 0xff4444).stroke({ width: 1, color: 0xffffff });
        layer.addChild(c);
      }
      const unit = state.players.flatMap((pp) => pp.units).find((u) => u.tile.q === t.coord.q && u.tile.r === t.coord.r);
      if (unit) {
        const uTex = unitTexRef.current.get(unit.type);
        if (uTex) {
          const us = new Sprite(uTex);
          us.anchor.set(0.5);
          us.x = cx;
          us.y = cy;
          us.tint = unit.ownerId === player.id ? 0xffffff : 0xff6666;
          layer.addChild(us);
        } else {
          const txt = new Text({
            text: UNIT_MARK[unit.type] ?? '?',
            style: { fill: unit.ownerId === player.id ? '#ffffff' : '#ff8888', fontSize: 12, fontFamily: 'monospace' },
          });
          txt.anchor.set(0.5);
          txt.x = cx;
          txt.y = cy + 1;
          layer.addChild(txt);
        }
      }
    }

    // 区域图标叠加
    for (const p of state.players) {
      for (const c of p.cities) {
        for (const d of c.districts) {
          const dTex = districtTexRef.current.get(d.type);
          if (!dTex) continue;
          const dp = hexToPixel(d.tile, DISP);
          const ds = new Sprite(dTex);
          ds.anchor.set(0.5);
          ds.x = dp.x + DISP;
          ds.y = dp.y + DISP;
          layer.addChild(ds);
        }
      }
    }
  }

  return <div ref={hostRef} style={{ flex: 1, overflow: 'hidden', minHeight: 400 }} />;
}
