// PixiJS 六边形地图渲染器（pointy-top）
import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, Polygon, Sprite, Texture } from 'pixi.js';
import { useGame } from './store';
import { hexToPixel, hexNeighbors, hexAdd, inBounds } from '../logic/hex';
import { HEX_DIRECTIONS } from '../types';
import { findUnit, currentPlayer } from '../logic/state/commands';
import { cityAt } from '../logic/state/combat';
import type { GameMap } from '../logic/state/mapgen';
import { tileMoveCost } from '../logic/state/unitMove';
import { makeHexTexture, TERRAIN_COLOR, makeCircleTextureFromImage, unitAssetUrl, districtAssetUrl } from './assets';
import { terrainLabel, featureLabel, resourceLabel } from '../logic/state/describe';
import { RESOURCES } from '../gamedata';
import type { ResourceCategory } from '../gamedata';
import type { HexCoord } from '../types';
import type { PlayerState, GameState, UnitState } from '../logic/state/types';

const UNIT_MARK: Record<string, string> = {
  settler: '⌂', builder: '⚒', warrior: '⚔', archer: '弓', slinger: '石',
  swordsman: '剑', cavalry: '骑', knight: '骑', siege_tower: '塔', catapult: '投',
  cannon: '炮', trireme: '船', quadrireme: '船', musketman: '枪',
};
const FEATURE_MARK: Record<string, string> = {
  forest: '🌲', rainforest: '🌴', marsh: '░', geothermal: '♨', oasis: '💧', floodplains: '░',
};
const DISP = 22;
const PLAYER_TINT = [0x4a8aff, 0xff5050, 0xffaa30, 0x50ff80];
const RESOURCE_COLOR: Record<ResourceCategory, number> = {
  bonus: 0x66ff66,
  luxury: 0xffd700,
  strategic: 0xff5555,
};

function hexPolyPoints(cx: number, cy: number, size: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(cx + size * Math.cos(a), cy + size * Math.sin(a));
  }
  return pts;
}

function tileKey(c: HexCoord): string {
  return `${c.q},${c.r}`;
}

function reachableTiles(state: GameState, unit: UnitState): HexCoord[] {
  const start = unit.tile;
  const visited = new Map<string, { coord: HexCoord; cost: number }>();
  visited.set(tileKey(start), { coord: start, cost: 0 });
  const queue: { coord: HexCoord; cost: number }[] = [{ coord: start, cost: 0 }];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++];
    for (const n of hexNeighbors(current.coord)) {
      if (!inBounds(n, state.map.bounds)) continue;
      const cost = tileMoveCost(state, n);
      if (!isFinite(cost)) continue;
      const total = current.cost + cost;
      if (total > unit.moveLeft) continue;
      const key = tileKey(n);
      const existing = visited.get(key);
      if (existing && existing.cost <= total) continue;
      visited.set(key, { coord: n, cost: total });
      queue.push({ coord: n, cost: total });
    }
  }
  const result: HexCoord[] = [];
  for (const [key, v] of visited) {
    if (key === tileKey(start)) continue;
    result.push(v.coord);
  }
  return result;
}

function cameraOffsetFor(player: PlayerState | undefined, bounds: { width: number; height: number }, canvasW: number, canvasH: number): { x: number; y: number } {
  if (!player) return { x: 0, y: 0 };
  const centers: { x: number; y: number }[] = [];
  for (const u of player.units) {
    const p = hexToPixel(u.tile, DISP);
    centers.push({ x: p.x + DISP, y: p.y + DISP });
  }
  for (const c of player.cities) {
    const p = hexToPixel(c.tile, DISP);
    centers.push({ x: p.x + DISP, y: p.y + DISP });
  }
  if (centers.length === 0) {
    const p = hexToPixel({ q: Math.floor(bounds.width / 2), r: Math.floor(bounds.height / 2) }, DISP);
    return { x: canvasW / 2 - (p.x + DISP), y: canvasH / 2 - (p.y + DISP) };
  }
  const avgX = centers.reduce((s, c) => s + c.x, 0) / centers.length;
  const avgY = centers.reduce((s, c) => s + c.y, 0) / centers.length;
  return { x: canvasW / 2 - avgX, y: canvasH / 2 - avgY };
}

function resizeAppToHost(app: Application, host: HTMLDivElement) {
  const rect = host.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  if (app.renderer.width !== width || app.renderer.height !== height) {
    app.renderer.resize(width, height);
  }
}

interface PixiMapProps {
  onRequestAttack?: (targetTile: HexCoord) => void;
}

export function PixiMap({ onRequestAttack }: PixiMapProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const unitTexRef = useRef<Map<string, Texture>>(new Map());
  const districtTexRef = useRef<Map<string, Texture>>(new Map());
  const terrainLayerRef = useRef<Container | null>(null);
  const dynamicLayerRef = useRef<Container | null>(null);
  const districtsLayerRef = useRef<Container | null>(null);
  const tooltipRef = useRef<Text | null>(null);
  const terrainSpritesRef = useRef<Map<string, Sprite>>(new Map());
  const lastMapRef = useRef<GameMap | null>(null);
  const [status, setStatus] = useState<string>('加载中…');
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
      .init({ width: 1, height: 1, background: 0x111122, antialias: true, resizeTo: undefined })
      .then(() => {
        if (destroyed) { app.destroy(true); return; }
        appRef.current = app;
        if (hostRef.current) {
          hostRef.current.appendChild(app.canvas);
          resizeAppToHost(app, hostRef.current);
        }
        setStatus('就绪');
        draw();
        const unitTypes = ['warrior', 'archer', 'settler', 'builder', 'swordsman', 'cavalry', 'slinger', 'knight', 'trireme', 'quadrireme', 'musketman', 'cannon', 'siege_tower'];
        const districtTypes = ['campus', 'commercial', 'holy', 'industrial', 'encampment', 'theater', 'harbor'];
        Promise.allSettled([
          ...unitTypes.map(async (u) => { try { unitTexRef.current.set(u, await makeCircleTextureFromImage(unitAssetUrl(u), DISP * 0.8)); } catch { /* */ } }),
          ...districtTypes.map(async (d) => { try { districtTexRef.current.set(d, await makeCircleTextureFromImage(districtAssetUrl(d), DISP * 0.6)); } catch { /* */ } }),
        ]).then(() => draw());
      })
      .catch((err) => { setStatus('Pixi 初始化失败: ' + (err?.message ?? String(err))); });

    const resizeObserver = hostRef.current ? new ResizeObserver(() => {
      if (appRef.current && hostRef.current) {
        resizeAppToHost(appRef.current, hostRef.current);
        draw();
      }
    }) : null;
    if (hostRef.current) resizeObserver?.observe(hostRef.current);

    return () => {
      destroyed = true;
      resizeObserver?.disconnect();
      try { app.destroy(true); } catch { /* */ }
      appRef.current = null;
      terrainLayerRef.current = null;
      dynamicLayerRef.current = null;
      districtsLayerRef.current = null;
      tooltipRef.current = null;
      terrainSpritesRef.current.clear();
      lastMapRef.current = null;
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
        if (onRequestAttack) { onRequestAttack(coord); return; }
        command({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (city && city.ownerId !== player.id) {
        if (onRequestAttack) { onRequestAttack(coord); return; }
        command({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (!unitAt) { command({ kind: 'moveUnit', unitId: selectedUnit.id, to: coord }); return; }
    }
    if (unitAt) { selectUnit(unitAt.id); return; }
    const city = cityAt(state, coord);
    if (city) selectCity(city.id);
  }

  function ensureLayers(app: Application) {
    if (!terrainLayerRef.current) {
      terrainLayerRef.current = new Container();
      app.stage.addChild(terrainLayerRef.current);
    }
    if (!dynamicLayerRef.current) {
      dynamicLayerRef.current = new Container();
      app.stage.addChild(dynamicLayerRef.current);
    }
    if (!districtsLayerRef.current) {
      districtsLayerRef.current = new Container();
      app.stage.addChild(districtsLayerRef.current);
    }
    if (!tooltipRef.current) {
      const tt = new Text({
        text: '',
        style: { fontSize: 10, fill: '#ffffff', fontFamily: 'monospace', stroke: { color: '#000000', width: 2 } }
      });
      tt.anchor.set(0.5);
      tt.alpha = 0;
      tt.eventMode = 'none';
      tooltipRef.current = tt;
      app.stage.addChild(tt);
    }
  }

  function rebuildTerrainLayer(cam: { x: number; y: number }) {
    const layer = terrainLayerRef.current!;
    layer.removeChildren();
    terrainSpritesRef.current.clear();
    for (const t of state.map.tiles) {
      const p = hexToPixel(t.coord, DISP);
      const cx = p.x + DISP + cam.x;
      const cy = p.y + DISP + cam.y;
      const tex = makeHexTexture(TERRAIN_COLOR[t.terrain] ?? 0x444444, DISP);
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.x = cx; sprite.y = cy;
      sprite.eventMode = 'static';
      sprite.hitArea = new Polygon(hexPolyPoints(0, 0, DISP));
      sprite.on('pointertap', () => onTile(t.coord));
      sprite.on('pointerenter', () => {
        setHoveredTile(t.coord);
        const tt = tooltipRef.current;
        if (tt) {
          tt.text = `${terrainLabel(t.terrain)}${t.feature ? ` (${featureLabel(t.feature)})` : ''}${t.resource ? ` [${resourceLabel(t.resource.id)}]` : ''}`;
          tt.x = cx;
          tt.y = cy + DISP * 0.7;
          tt.alpha = 1;
        }
      });
      sprite.on('pointerleave', () => {
        setHoveredTile(null);
        if (tooltipRef.current) tooltipRef.current.alpha = 0;
      });
      layer.addChild(sprite);
      terrainSpritesRef.current.set(tileKey(t.coord), sprite);
    }
  }

  function updateTerrainPositions(cam: { x: number; y: number }) {
    for (const t of state.map.tiles) {
      const sprite = terrainSpritesRef.current.get(tileKey(t.coord));
      if (!sprite) continue;
      const p = hexToPixel(t.coord, DISP);
      sprite.x = p.x + DISP + cam.x;
      sprite.y = p.y + DISP + cam.y;
    }
  }

  function draw() {
    const app = appRef.current;
    if (!app) return;
    try {
      ensureLayers(app);
      const player = currentPlayer(state);
      const cam = cameraOffsetFor(player, state.map.bounds, app.screen.width, app.screen.height);
      const selectedUnit = selectedUnitId ? findUnit(state, selectedUnitId) : null;

      // 地形层：地图变化时重建，否则只更新位置
      const mapChanged = lastMapRef.current !== state.map;
      if (mapChanged) {
        rebuildTerrainLayer(cam);
        lastMapRef.current = state.map;
      } else {
        updateTerrainPositions(cam);
      }

      // 清空动态层与区域层（销毁旧 DisplayObject 避免内存累积）
      const clearLayer = (layer: Container) => {
        const removed = layer.removeChildren();
        for (const child of removed) {
          child.destroy({ children: true, texture: false });
        }
      };
      clearLayer(dynamicLayerRef.current!);
      clearLayer(districtsLayerRef.current!);

      const reachable: HexCoord[] = selectedUnit && selectedUnit.ownerId === player.id
        ? reachableTiles(state, selectedUnit)
        : [];
      const isReachable = (c: HexCoord) => reachable.some((r) => r.q === c.q && r.r === c.r);
      const ownerByTile = new Map<string, number>();
      state.players.forEach((p, idx) => { for (const c of p.cities) for (const tile of c.territory) ownerByTile.set(tileKey(tile), idx); });

      for (const t of state.map.tiles) {
        const p = hexToPixel(t.coord, DISP);
        const cx = p.x + DISP + cam.x;
        const cy = p.y + DISP + cam.y;
        const isSel = selectedUnit && selectedUnit.tile.q === t.coord.q && selectedUnit.tile.r === t.coord.r;
        const reach = isReachable(t.coord);
        const layer = dynamicLayerRef.current!;

        // 领土
        const owner = ownerByTile.get(tileKey(t.coord));
        if (owner !== undefined) {
          const ov = new Graphics();
          const ownerColor = PLAYER_TINT[owner % PLAYER_TINT.length];
          ov.poly(hexPolyPoints(cx, cy, DISP)).fill({ color: ownerColor, alpha: 0.18 });
          ov.eventMode = 'none';
          layer.addChild(ov);
          // 边界描边：只画与异主或地图外相邻的边
          const border = new Graphics();
          const pts = hexPolyPoints(cx, cy, DISP);
          for (let e = 0; e < 6; e++) {
            const n = hexAdd(t.coord, HEX_DIRECTIONS[e]);
            const nOwner = inBounds(n, state.map.bounds) ? ownerByTile.get(tileKey(n)) : undefined;
            if (nOwner === owner) continue;
            const i1 = e;
            const i2 = (e + 1) % 6;
            border.poly([pts[i1 * 2], pts[i1 * 2 + 1], pts[i2 * 2], pts[i2 * 2 + 1]]).stroke({ width: 1.5, color: ownerColor });
          }
          border.eventMode = 'none';
          layer.addChild(border);
        }
        // 地貌
        if (t.feature && FEATURE_MARK[t.feature]) {
          const ft = new Text({ text: FEATURE_MARK[t.feature]!, style: { fontSize: DISP * 0.9 } });
          ft.anchor.set(0.5); ft.x = cx; ft.y = cy - DISP * 0.1;
          ft.eventMode = 'none';
          layer.addChild(ft);
        }
        // 资源（按类别分色/分图标）
        if (t.resource) {
          const def = RESOURCES[t.resource.id];
          const category = (def?.category as ResourceCategory) ?? 'bonus';
          const rc = RESOURCE_COLOR[category];
          const rg = new Graphics();
          const rx = cx + DISP * 0.4;
          const ry = cy - DISP * 0.4;
          if (category === 'bonus') {
            rg.circle(rx, ry, 2.5).fill(rc);
          } else if (category === 'luxury') {
            const s = 2.5;
            rg.poly([rx, ry - s, rx + s, ry, rx, ry + s, rx - s, ry]).fill(rc);
          } else {
            const s = 2.2;
            rg.rect(rx - s, ry - s, s * 2, s * 2).fill(rc);
          }
          rg.eventMode = 'none';
          layer.addChild(rg);
        }
        // 选中/可移动
        if (isSel || reach) {
          const stroke = new Graphics();
          stroke.poly(hexPolyPoints(cx, cy, DISP)).stroke({ width: 2.5, color: isSel ? 0xffffff : 0xffff00 });
          stroke.eventMode = 'none';
          layer.addChild(stroke);
        }
        // 城市
        const city = cityAt(state, t.coord);
        if (city) {
          const col = city.ownerId === player.id ? 0x44aaff : 0xff4444;
          const cg = new Graphics().circle(cx, cy, DISP * 0.5).fill(col).stroke({ width: 1.5, color: 0xffffff });
          cg.eventMode = 'none';
          layer.addChild(cg);
          const popT = new Text({ text: `${city.population}`, style: { fill: '#ffffff', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' } });
          popT.anchor.set(0.5); popT.x = cx; popT.y = cy;
          popT.eventMode = 'none';
          layer.addChild(popT);
        }
        // 单位
        const unit = state.players.flatMap((pp) => pp.units).find((u) => u.tile.q === t.coord.q && u.tile.r === t.coord.r);
        if (unit) {
          const ownerIdx = state.players.findIndex((pp) => pp.id === unit.ownerId);
          const ringCol = unit.ownerId === player.id ? 0x44ff44 : (ownerIdx >= 0 ? PLAYER_TINT[ownerIdx % PLAYER_TINT.length] : 0xff4444);
          const acted = unit.moveLeft === 0 || unit.hasActed;
          const ring = new Graphics().circle(cx, cy, DISP * 0.72).fill({ color: ringCol, alpha: acted ? 0.4 : 0.9 }).stroke({ width: 1.5, color: 0x000000, alpha: 0.5 });
          ring.eventMode = 'none';
          layer.addChild(ring);
          const uTex = unitTexRef.current.get(unit.type);
          if (uTex) {
            const us = new Sprite(uTex);
            us.anchor.set(0.5); us.x = cx; us.y = cy;
            us.alpha = acted ? 0.55 : 1;
            us.eventMode = 'none';
            layer.addChild(us);
          } else {
            const txt = new Text({ text: UNIT_MARK[unit.type] ?? '?', style: { fill: '#ffffff', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' } });
            txt.anchor.set(0.5); txt.x = cx; txt.y = cy + 1;
            txt.alpha = acted ? 0.55 : 1;
            txt.eventMode = 'none';
            layer.addChild(txt);
          }
          if (unit.hp < 100) {
            const hpW = DISP * 1.1;
            const hpPct = Math.max(0, unit.hp) / 100;
            const hpBg = new Graphics().rect(cx - hpW / 2, cy - DISP * 0.95, hpW, 3).fill(0x330000);
            const hpFg = new Graphics().rect(cx - hpW / 2, cy - DISP * 0.95, hpW * hpPct, 3).fill(hpPct > 0.5 ? 0x33ff33 : hpPct > 0.25 ? 0xffaa00 : 0xff3333);
            hpBg.eventMode = 'none';
            hpFg.eventMode = 'none';
            layer.addChild(hpBg); layer.addChild(hpFg);
          }
        }
      }
      // 区域图标
      const dlayer = districtsLayerRef.current!;
      for (const p of state.players) for (const c of p.cities) for (const d of c.districts) {
        const dTex = districtTexRef.current.get(d.type);
        if (!dTex) continue;
        const dp = hexToPixel(d.tile, DISP);
        const ds = new Sprite(dTex); ds.anchor.set(0.5); ds.x = dp.x + DISP + cam.x; ds.y = dp.y + DISP + cam.y;
        ds.eventMode = 'none';
        dlayer.addChild(ds);
      }
    } catch (err) {
      setStatus('渲染错误: ' + (err as Error)?.message);
    }
  }

  return (
    <div ref={hostRef} style={{ flex: 1, overflow: 'hidden', minHeight: 400, position: 'relative' }}>
      {status !== '就绪' && (
        <div style={{ position: 'absolute', top: 10, left: 10, color: status.startsWith('渲染错误') || status.startsWith('Pixi') ? '#f88' : '#888', fontFamily: 'monospace', fontSize: 12, zIndex: 10 }}>
          {status}
        </div>
      )}
    </div>
  );
}
