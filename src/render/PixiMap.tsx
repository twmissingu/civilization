// PixiJS 六边形地图渲染器（pointy-top）
import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Text, Polygon, Sprite, Texture } from 'pixi.js';
import { useGame } from './store';
import { hexToPixel, hexAdd, inBounds, viewportHexBounds } from '../logic/hex';
import { HEX_DIRECTIONS } from '../types';
import { findUnit, currentPlayer } from '../logic/state/query';
import { cityAt, getReachableTiles, terrainLabel, featureLabel, resourceLabel, getTileAt } from '../logic/state/query';
import type { Tile } from '../logic/state/mapgen';
import { makeHexTexture, TERRAIN_COLOR, makeHexTextureFromImage, makeCircleTextureFromImage, unitAssetUrl, districtAssetUrl, terrainAssetUrl, featureAssetUrl } from './assets';
import { RESOURCES } from '../gamedata';
import type { ResourceCategory } from '../gamedata';
import type { HexCoord } from '../types';
import type { PlayerState, UnitState, CityState } from '../logic/state/types';

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

function cameraOffsetFor(player: PlayerState | undefined, bounds: { width: number; height: number }, canvasW: number, canvasH: number, cameraTarget?: HexCoord | null): { x: number; y: number } {
  if (cameraTarget) {
    const p = hexToPixel(cameraTarget, DISP);
    return { x: canvasW / 2 - (p.x + DISP), y: canvasH / 2 - (p.y + DISP) };
  }
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
  const terrainTexRef = useRef<Map<string, Texture>>(new Map());
  const featureTexRef = useRef<Map<string, Texture>>(new Map());
  const terrainLayerRef = useRef<Container | null>(null);
  const riverLayerRef = useRef<Container | null>(null);
  const dynamicLayerRef = useRef<Container | null>(null);
  const districtsLayerRef = useRef<Container | null>(null);
  const fogLayerRef = useRef<Container | null>(null);
  const tooltipRef = useRef<Text | null>(null);
  const terrainPoolRef = useRef<Map<string, Sprite>>(new Map());
  const dynamicPoolRef = useRef<Map<string, Container>>(new Map());
  const districtPoolRef = useRef<Map<string, Sprite>>(new Map());
  const riverPoolRef = useRef<Map<string, Graphics>>(new Map());
  const fogPoolRef = useRef<Map<string, Graphics>>(new Map());
  const [status, setStatus] = useState<string>('加载中…');
  const state = useGame((s) => s.state);
  const mapVersion = useGame((s) => s.mapVersion);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const cameraTarget = useGame((s) => s.cameraTarget);
  const setHoveredTile = useGame((s) => s.setHoveredTile);
  // 镜头平滑插值
  const currentCamRef = useRef<{ x: number; y: number } | null>(null);
  const targetCamRef = useRef<{ x: number; y: number } | null>(null);
  const animatingRef = useRef(false);
  // 选中单位脉冲动画
  const pulseRef = useRef(0);
  const selectedRingRef = useRef<Graphics | null>(null);

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
        // 镜头平滑动画：每帧插值 currentCam → targetCam
        app.ticker.add(() => {
          if (!animatingRef.current || !currentCamRef.current || !targetCamRef.current) return;
          const cur = currentCamRef.current;
          const tgt = targetCamRef.current;
          const dx = tgt.x - cur.x;
          const dy = tgt.y - cur.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 0.5) {
            cur.x = tgt.x;
            cur.y = tgt.y;
            animatingRef.current = false;
          } else {
            cur.x += dx * 0.12;
            cur.y += dy * 0.12;
          }
          draw();
        });
        // 选中单位脉冲动画
        app.ticker.add(() => {
          pulseRef.current = (pulseRef.current + 0.04) % (Math.PI * 2);
          if (selectedRingRef.current) {
            const alpha = 0.5 + Math.sin(pulseRef.current) * 0.4;
            selectedRingRef.current.alpha = alpha;
          }
        });
        draw();
        const unitTypes = ['warrior', 'archer', 'settler', 'builder', 'swordsman', 'cavalry', 'slinger', 'knight', 'catapult', 'trireme', 'quadrireme', 'musketman', 'cannon', 'siege_tower'];
        const districtTypes = ['campus', 'commercial', 'holy', 'industrial', 'encampment', 'theater', 'harbor'];
        const terrainTypes = ['grassland', 'plains', 'desert', 'tundra', 'snow', 'hills', 'mountain', 'coast', 'ocean'];
        const featureTypes = ['forest', 'rainforest', 'marsh', 'geothermal', 'oasis', 'floodplains'];
        Promise.allSettled([
          ...unitTypes.map(async (u) => { try { unitTexRef.current.set(u, await makeCircleTextureFromImage(unitAssetUrl(u), DISP * 0.8)); } catch { /* */ } }),
          ...districtTypes.map(async (d) => { try { districtTexRef.current.set(d, await makeCircleTextureFromImage(districtAssetUrl(d), DISP * 0.6)); } catch { /* */ } }),
          ...terrainTypes.map(async (t) => { try { terrainTexRef.current.set(t, await makeHexTextureFromImage(terrainAssetUrl(t), DISP)); } catch { /* */ } }),
          ...featureTypes.map(async (f) => { try { featureTexRef.current.set(f, await makeHexTextureFromImage(featureAssetUrl(f), DISP * 0.7)); } catch { /* */ } }),
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
      riverLayerRef.current = null;
      dynamicLayerRef.current = null;
      districtsLayerRef.current = null;
      fogLayerRef.current = null;
      tooltipRef.current = null;
      terrainPoolRef.current.clear();
      dynamicPoolRef.current.clear();
      districtPoolRef.current.clear();
      riverPoolRef.current.clear();
      fogPoolRef.current.clear();
    };
    // 初始化 effect 只需运行一次；draw 依赖的 state/refs 在闭包中访问，不必加入 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appRef.current) draw();
    // draw 内通过 useGame.getState() 获取最新 state，订阅 mapVersion 触发重绘
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapVersion, selectedUnitId]);

  function onTile(coord: HexCoord) {
    const { state: latestState, selectedUnitId: latestSelectedUnitId, command: latestCommand, selectUnit: latestSelectUnit, selectCity: latestSelectCity } = useGame.getState();
    const player = currentPlayer(latestState);
    const selectedUnit = latestSelectedUnitId ? findUnit(latestState, latestSelectedUnitId) : null;
    const unitAt = latestState.players.flatMap((p) => p.units).find((u) => u.tile.q === coord.q && u.tile.r === coord.r);
    if (selectedUnit && selectedUnit.ownerId === player.id) {
      const city = cityAt(latestState, coord);
      if (unitAt && unitAt.ownerId !== player.id) {
        if (onRequestAttack) { onRequestAttack(coord); return; }
        latestCommand({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (city && city.ownerId !== player.id) {
        if (onRequestAttack) { onRequestAttack(coord); return; }
        latestCommand({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (!unitAt) { latestCommand({ kind: 'moveUnit', unitId: selectedUnit.id, to: coord }); return; }
    }
    if (unitAt) { latestSelectUnit(unitAt.id); return; }
    const city = cityAt(latestState, coord);
    if (city) latestSelectCity(city.id);
  }

  function ensureLayers(app: Application) {
    if (!terrainLayerRef.current) {
      terrainLayerRef.current = new Container();
      app.stage.addChild(terrainLayerRef.current);
    }
    if (!riverLayerRef.current) {
      riverLayerRef.current = new Container();
      app.stage.addChild(riverLayerRef.current);
    }
    if (!dynamicLayerRef.current) {
      dynamicLayerRef.current = new Container();
      app.stage.addChild(dynamicLayerRef.current);
    }
    if (!districtsLayerRef.current) {
      districtsLayerRef.current = new Container();
      app.stage.addChild(districtsLayerRef.current);
    }
    if (!fogLayerRef.current) {
      fogLayerRef.current = new Container();
      app.stage.addChild(fogLayerRef.current);
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

  function ensureTerrainSprite(t: Tile, cx: number, cy: number, layer: Container): Sprite {
    const key = tileKey(t.coord);
    const existing = terrainPoolRef.current.get(key);
    const sprite = existing ?? new Sprite();
    if (!existing) {
      sprite.anchor.set(0.5);
      sprite.eventMode = 'static';
      sprite.hitArea = new Polygon(hexPolyPoints(0, 0, DISP));
      sprite.on('pointertap', () => onTile(t.coord));
      sprite.on('pointerenter', () => {
        setHoveredTile(t.coord);
        const tt = tooltipRef.current;
        if (tt) {
          tt.text = `${terrainLabel(t.terrain)}${t.feature ? ` (${featureLabel(t.feature)})` : ''}${t.resource ? ` [${resourceLabel(t.resource.id)}]` : ''}`;
          tt.x = sprite.x;
          tt.y = sprite.y + DISP * 0.7;
          tt.alpha = 1;
        }
      });
      sprite.on('pointerleave', () => {
        setHoveredTile(null);
        if (tooltipRef.current) tooltipRef.current.alpha = 0;
      });
      terrainPoolRef.current.set(key, sprite);
      layer.addChild(sprite);
    }
    const tex = terrainTexRef.current.get(t.terrain) ?? makeHexTexture(TERRAIN_COLOR[t.terrain] ?? 0x444444, DISP);
    sprite.texture = tex;
    sprite.x = cx;
    sprite.y = cy;
    sprite.visible = true;
    return sprite;
  }

  function ensureGraphics(key: string, layer: Container): Graphics {
    let g = dynamicPoolRef.current.get(key) as Graphics | undefined;
    if (!g) {
      g = new Graphics();
      g.eventMode = 'none';
      dynamicPoolRef.current.set(key, g);
      layer.addChild(g);
    }
    g.clear();
    g.visible = true;
    return g;
  }

  function ensureText(key: string, layer: Container, initial: { text: string; style: object }): Text {
    let txt = dynamicPoolRef.current.get(key) as Text | undefined;
    if (!txt) {
      txt = new Text(initial);
      txt.eventMode = 'none';
      dynamicPoolRef.current.set(key, txt);
      layer.addChild(txt);
    }
    txt.visible = true;
    return txt;
  }

  function ensureSprite(key: string, layer: Container): Sprite {
    let s = dynamicPoolRef.current.get(key) as Sprite | undefined;
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5);
      s.eventMode = 'none';
      dynamicPoolRef.current.set(key, s);
      layer.addChild(s);
    }
    s.visible = true;
    return s;
  }

  function ensureRiverGraphics(key: string, layer: Container): Graphics {
    let g = riverPoolRef.current.get(key);
    if (!g) {
      g = new Graphics();
      g.eventMode = 'none';
      riverPoolRef.current.set(key, g);
      layer.addChild(g);
    }
    g.clear();
    g.visible = true;
    return g;
  }

  function ensureFogGraphics(key: string, layer: Container): Graphics {
    let g = fogPoolRef.current.get(key);
    if (!g) {
      g = new Graphics();
      g.eventMode = 'none';
      fogPoolRef.current.set(key, g);
      layer.addChild(g);
    }
    g.clear();
    g.visible = true;
    return g;
  }

  function updateTerritoryOverlay(t: Tile, cx: number, cy: number, owner: number, layer: Container, usedKeys: Set<string>) {
    const key = `territory:${tileKey(t.coord)}`;
    usedKeys.add(key);
    const g = ensureGraphics(key, layer);
    g.position.set(cx, cy);
    const ownerColor = PLAYER_TINT[owner % PLAYER_TINT.length];
    g.poly(hexPolyPoints(0, 0, DISP)).fill({ color: ownerColor, alpha: 0.18 });
  }

  function updateBorder(t: Tile, cx: number, cy: number, owner: number, ownerByTile: Map<string, number>, layer: Container, usedKeys: Set<string>) {
    const key = `border:${tileKey(t.coord)}`;
    usedKeys.add(key);
    const g = ensureGraphics(key, layer);
    g.position.set(cx, cy);
    const ownerColor = PLAYER_TINT[owner % PLAYER_TINT.length];
    const pts = hexPolyPoints(0, 0, DISP);
    for (let e = 0; e < 6; e++) {
      const n = hexAdd(t.coord, HEX_DIRECTIONS[e]);
      const nOwner = inBounds(n, state.map.bounds) ? ownerByTile.get(tileKey(n)) : undefined;
      if (nOwner === owner) continue;
      const i1 = e;
      const i2 = (e + 1) % 6;
      g.poly([pts[i1 * 2], pts[i1 * 2 + 1], pts[i2 * 2], pts[i2 * 2 + 1]]).stroke({ width: 1.5, color: ownerColor });
    }
  }

  function updateFeature(t: Tile, cx: number, cy: number, layer: Container, usedKeys: Set<string>) {
    if (!t.feature) return;
    const fTex = featureTexRef.current.get(t.feature);
    if (fTex) {
      const spriteKey = `feature-sprite:${tileKey(t.coord)}`;
      const textKey = `feature-text:${tileKey(t.coord)}`;
      usedKeys.add(spriteKey);
      const s = ensureSprite(spriteKey, layer);
      s.texture = fTex;
      s.position.set(cx, cy - DISP * 0.2);
      s.alpha = 0.85;
      const oldText = dynamicPoolRef.current.get(textKey);
      if (oldText) oldText.visible = false;
    } else if (FEATURE_MARK[t.feature]) {
      const spriteKey = `feature-sprite:${tileKey(t.coord)}`;
      const textKey = `feature-text:${tileKey(t.coord)}`;
      usedKeys.add(textKey);
      const txt = ensureText(textKey, layer, { text: FEATURE_MARK[t.feature]!, style: { fontSize: DISP * 0.9 } });
      txt.text = FEATURE_MARK[t.feature]!;
      txt.anchor.set(0.5);
      txt.position.set(cx, cy - DISP * 0.1);
      const oldSprite = dynamicPoolRef.current.get(spriteKey);
      if (oldSprite) oldSprite.visible = false;
    } else {
      const spriteKey = `feature-sprite:${tileKey(t.coord)}`;
      const textKey = `feature-text:${tileKey(t.coord)}`;
      const oldSprite = dynamicPoolRef.current.get(spriteKey);
      const oldText = dynamicPoolRef.current.get(textKey);
      if (oldSprite) oldSprite.visible = false;
      if (oldText) oldText.visible = false;
    }
  }

  function updateResource(t: Tile, cx: number, cy: number, layer: Container, usedKeys: Set<string>) {
    if (!t.resource) return;
    const key = `resource:${tileKey(t.coord)}`;
    usedKeys.add(key);
    const def = RESOURCES[t.resource.id];
    const category = (def?.category as ResourceCategory) ?? 'bonus';
    const rc = RESOURCE_COLOR[category];
    const g = ensureGraphics(key, layer);
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

  function updateSelection(t: Tile, cx: number, cy: number, isSel: boolean, reach: boolean, layer: Container, usedKeys: Set<string>) {
    if (!isSel && !reach) return;
    const key = `selection:${tileKey(t.coord)}`;
    usedKeys.add(key);
    const g = ensureGraphics(key, layer);
    g.position.set(cx, cy);
    g.poly(hexPolyPoints(0, 0, DISP)).stroke({ width: 2.5, color: isSel ? 0xffffff : 0xffff00 });
  }

  function updateCity(city: CityState, cx: number, cy: number, player: PlayerState, layer: Container, usedKeys: Set<string>) {
    const key = `city:${tileKey(city.tile)}`;
    const popKey = `city-pop:${tileKey(city.tile)}`;
    const nameKey = `city-name:${tileKey(city.tile)}`;
    usedKeys.add(key);
    usedKeys.add(popKey);
    usedKeys.add(nameKey);

    const g = ensureGraphics(key, layer);
    g.position.set(cx, cy);
    const col = city.ownerId === player.id ? 0x44aaff : 0xff4444;
    g.circle(0, 0, DISP * 0.5).fill(col).stroke({ width: 1.5, color: 0xffffff });

    const popT = ensureText(popKey, layer, { text: `${city.population}`, style: { fill: '#ffffff', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' } });
    popT.text = `${city.population}`;
    popT.anchor.set(0.5);
    popT.position.set(cx, cy);

    // 城市名称标签（在圆下方）
    const nameT = ensureText(nameKey, layer, { text: city.name, style: { fill: '#ffffff', fontSize: 8, fontFamily: 'monospace', stroke: { color: '#000000', width: 2 } } });
    nameT.text = city.name.length > 6 ? city.name.slice(0, 6) + '..' : city.name;
    nameT.anchor.set(0.5);
    nameT.position.set(cx, cy + DISP * 0.8);
  }

  function updateUnit(unit: UnitState, cx: number, cy: number, player: PlayerState, layer: Container, usedKeys: Set<string>) {
    const ownerIdx = state.players.findIndex((pp) => pp.id === unit.ownerId);
    const ringCol = unit.ownerId === player.id ? 0x44ff44 : (ownerIdx >= 0 ? PLAYER_TINT[ownerIdx % PLAYER_TINT.length] : 0xff4444);
    const acted = unit.moveLeft === 0 || unit.hasActed;

    const ringKey = `unit-ring:${unit.id}`;
    const spriteIconKey = `unit-icon-sprite:${unit.id}`;
    const textIconKey = `unit-icon-text:${unit.id}`;
    usedKeys.add(ringKey);

    const ring = ensureGraphics(ringKey, layer);
    ring.position.set(cx, cy);
    ring.circle(0, 0, DISP * 0.72).fill({ color: ringCol, alpha: acted ? 0.4 : 0.9 }).stroke({ width: 1.5, color: 0x000000, alpha: 0.5 });
    // 记录选中单位的环，用于脉冲动画
    if (unit.id === selectedUnitId) {
      selectedRingRef.current = ring;
      ring.alpha = 0.9;
    } else if (selectedRingRef.current === ring) {
      selectedRingRef.current = null;
    }

    const uTex = unitTexRef.current.get(unit.type);
    if (uTex) {
      usedKeys.add(spriteIconKey);
      const us = ensureSprite(spriteIconKey, layer);
      us.texture = uTex;
      us.position.set(cx, cy);
      us.alpha = acted ? 0.55 : 1;
      const oldText = dynamicPoolRef.current.get(textIconKey);
      if (oldText) oldText.visible = false;
    } else {
      usedKeys.add(textIconKey);
      const txt = ensureText(textIconKey, layer, { text: UNIT_MARK[unit.type] ?? '?', style: { fill: '#ffffff', fontSize: 14, fontFamily: 'monospace', fontWeight: 'bold' } });
      txt.text = UNIT_MARK[unit.type] ?? '?';
      txt.anchor.set(0.5);
      txt.position.set(cx, cy + 1);
      txt.alpha = acted ? 0.55 : 1;
      const oldSprite = dynamicPoolRef.current.get(spriteIconKey);
      if (oldSprite) oldSprite.visible = false;
    }

    if (unit.hp < 100) {
      const hpBgKey = `unit-hp-bg:${unit.id}`;
      const hpFgKey = `unit-hp-fg:${unit.id}`;
      usedKeys.add(hpBgKey);
      usedKeys.add(hpFgKey);
      const hpW = DISP * 1.1;
      const hpPct = Math.max(0, unit.hp) / 100;

      const hpBg = ensureGraphics(hpBgKey, layer);
      hpBg.position.set(cx, cy);
      hpBg.rect(-hpW / 2, -DISP * 0.95, hpW, 3).fill(0x330000);

      const hpFg = ensureGraphics(hpFgKey, layer);
      hpFg.position.set(cx, cy);
      hpFg.rect(-hpW / 2, -DISP * 0.95, hpW * hpPct, 3).fill(hpPct > 0.5 ? 0x33ff33 : hpPct > 0.25 ? 0xffaa00 : 0xff3333);
    }
  }

  function renderTile(
    t: Tile,
    cx: number,
    cy: number,
    player: PlayerState,
    selectedUnit: UnitState | null,
    ownerByTile: Map<string, number>,
    unitByTile: Map<string, UnitState>,
    isReachable: (c: HexCoord) => boolean,
    layer: Container,
    usedKeys: Set<string>
  ) {
    const owner = ownerByTile.get(tileKey(t.coord));
    if (owner !== undefined) {
      updateTerritoryOverlay(t, cx, cy, owner, layer, usedKeys);
      updateBorder(t, cx, cy, owner, ownerByTile, layer, usedKeys);
    }
    if (t.feature) updateFeature(t, cx, cy, layer, usedKeys);
    if (t.resource) updateResource(t, cx, cy, layer, usedKeys);
    const isSel = selectedUnit && selectedUnit.tile.q === t.coord.q && selectedUnit.tile.r === t.coord.r;
    const reach = isReachable(t.coord);
    if (isSel || reach) updateSelection(t, cx, cy, Boolean(isSel), reach, layer, usedKeys);
    const city = cityAt(state, t.coord);
    if (city) updateCity(city, cx, cy, player, layer, usedKeys);
    const unit = unitByTile.get(tileKey(t.coord));
    if (unit) updateUnit(unit, cx, cy, player, layer, usedKeys);
  }

  function renderDynamicLayer(
    cam: { x: number; y: number },
    vb: { minQ: number; maxQ: number; minR: number; maxR: number },
    player: PlayerState,
    selectedUnit: UnitState | null,
    usedKeys: Set<string>
  ) {
    const layer = dynamicLayerRef.current!;
    const reachable = selectedUnit && selectedUnit.ownerId === player.id
      ? new Set(getReachableTiles(state, selectedUnit.id).map(tileKey))
      : new Set<string>();
    const isReachable = (c: HexCoord) => reachable.has(tileKey(c));
    const ownerByTile = new Map<string, number>();
    state.players.forEach((p, idx) => { for (const c of p.cities) for (const tile of c.territory) ownerByTile.set(tileKey(tile), idx); });
    const unitByTile = new Map<string, UnitState>();
    for (const p of state.players) {
      for (const u of p.units) {
        unitByTile.set(tileKey(u.tile), u);
      }
    }

    for (const t of state.map.tiles) {
      if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
      const p = hexToPixel(t.coord, DISP);
      const cx = p.x + DISP + cam.x;
      const cy = p.y + DISP + cam.y;
      renderTile(t, cx, cy, player, selectedUnit, ownerByTile, unitByTile, isReachable, layer, usedKeys);
    }
  }

  function renderDistrictsLayer(
    cam: { x: number; y: number },
    vb: { minQ: number; maxQ: number; minR: number; maxR: number },
    usedKeys: Set<string>
  ) {
    const dlayer = districtsLayerRef.current!;
    for (const p of state.players) for (const c of p.cities) for (const d of c.districts) {
      if (d.tile.q < vb.minQ || d.tile.q > vb.maxQ || d.tile.r < vb.minR || d.tile.r > vb.maxR) continue;
      const key = `${c.id}:${d.type}:${tileKey(d.tile)}`;
      usedKeys.add(key);
      const dTex = districtTexRef.current.get(d.type);
      if (!dTex) continue;
      let ds = districtPoolRef.current.get(key);
      if (!ds) {
        ds = new Sprite(dTex);
        ds.anchor.set(0.5);
        ds.eventMode = 'none';
        districtPoolRef.current.set(key, ds);
        dlayer.addChild(ds);
      }
      ds.texture = dTex;
      const dp = hexToPixel(d.tile, DISP);
      ds.x = dp.x + DISP + cam.x;
      ds.y = dp.y + DISP + cam.y;
      ds.visible = true;
    }
  }

  function renderFogLayer(
    cam: { x: number; y: number },
    vb: { minQ: number; maxQ: number; minR: number; maxR: number },
    usedKeys: Set<string>
  ) {
    const layer = fogLayerRef.current!;
    for (const t of state.map.tiles) {
      if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
      const isVisible = t.visibility === 'visible';
      if (isVisible) continue; // 完全可见的不画雾
      const key = `fog:${tileKey(t.coord)}`;
      usedKeys.add(key);
      const g = ensureFogGraphics(key, layer);
      const p = hexToPixel(t.coord, DISP);
      g.position.set(p.x + DISP + cam.x, p.y + DISP + cam.y);
      if (t.visibility === 'unexplored') {
        g.poly(hexPolyPoints(0, 0, DISP)).fill({ color: 0x000000, alpha: 0.85 });
      } else {
        // explored: 半透明雾 + 微弱的轮廓线
        g.poly(hexPolyPoints(0, 0, DISP)).fill({ color: 0x000000, alpha: 0.45 });
        g.poly(hexPolyPoints(0, 0, DISP)).stroke({ width: 0.5, color: 0x000000, alpha: 0.3 });
      }
    }
  }

  function renderRiverLayer(
    cam: { x: number; y: number },
    vb: { minQ: number; maxQ: number; minR: number; maxR: number },
    usedKeys: Set<string>
  ) {
    const layer = riverLayerRef.current!;
    for (const t of state.map.tiles) {
      if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
      if (!t.isRiver) continue;
      // 只画可见/已探索区域的河流
      if (t.visibility === 'unexplored') continue;
      // 画河流：从当前格中心到相邻河流格中心画线
      for (const dir of HEX_DIRECTIONS) {
        const n = hexAdd(t.coord, dir);
        if (!inBounds(n, state.map.bounds)) continue;
        const nt = getTileAt(state, n);
        if (!nt || !nt.isRiver) continue;
        // 只画一次（按坐标排序避免重复）
        const key = `river:${tileKey(t.coord)}-${tileKey(n)}`;
        if (usedKeys.has(key)) continue;
        const key2 = `river:${tileKey(n)}-${tileKey(t.coord)}`;
        if (usedKeys.has(key2)) continue;
        usedKeys.add(key);
        const g = ensureRiverGraphics(key, layer);
        const p1 = hexToPixel(t.coord, DISP);
        const p2 = hexToPixel(n, DISP);
        const cx1 = p1.x + DISP + cam.x;
        const cy1 = p1.y + DISP + cam.y;
        const cx2 = p2.x + DISP + cam.x;
        const cy2 = p2.y + DISP + cam.y;
        g.moveTo(cx1, cy1);
        g.lineTo(cx2, cy2);
        g.stroke({ width: 3, color: 0x4488cc, alpha: 0.7 });
      }
    }
  }

  function draw() {
    const app = appRef.current;
    if (!app) return;
    try {
      ensureLayers(app);
      const state = useGame.getState().state;
      const player = currentPlayer(state);
      const targetCam = cameraOffsetFor(player, state.map.bounds, app.screen.width, app.screen.height, cameraTarget);
      // 更新小地图相机偏移
      useGame.getState().setCameraOffset(targetCam);

      // 镜头平滑插值：如果是新目标，启动动画
      if (!currentCamRef.current) {
        currentCamRef.current = { x: targetCam.x, y: targetCam.y };
      }
      if (!targetCamRef.current || targetCamRef.current.x !== targetCam.x || targetCamRef.current.y !== targetCam.y) {
        targetCamRef.current = { x: targetCam.x, y: targetCam.y };
        if (!animatingRef.current && cameraTarget) {
          animatingRef.current = true;
        }
      }
      // 使用当前动画位置（如果不在动画中，直接等于 target）
      const cam = currentCamRef.current ?? targetCam;
      if (!animatingRef.current && currentCamRef.current) {
        currentCamRef.current.x = targetCam.x;
        currentCamRef.current.y = targetCam.y;
      }
      const selectedUnit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
      const vb = viewportHexBounds(cam, app.screen.width, app.screen.height, state.map.bounds, DISP, 2);

      const terrainUsed = new Set<string>();
      const dynamicUsed = new Set<string>();
      const districtUsed = new Set<string>();
      const fogUsed = new Set<string>();
      const riverUsed = new Set<string>();
      const terrainLayer = terrainLayerRef.current!;

      for (const t of state.map.tiles) {
        if (t.coord.q < vb.minQ || t.coord.q > vb.maxQ || t.coord.r < vb.minR || t.coord.r > vb.maxR) continue;
        const p = hexToPixel(t.coord, DISP);
        const cx = p.x + DISP + cam.x;
        const cy = p.y + DISP + cam.y;
        ensureTerrainSprite(t, cx, cy, terrainLayer);
        terrainUsed.add(tileKey(t.coord));
      }
      for (const [key, sprite] of terrainPoolRef.current) {
        if (!terrainUsed.has(key)) sprite.visible = false;
      }

      renderDynamicLayer(cam, vb, player, selectedUnit ?? null, dynamicUsed);
      for (const [key, obj] of dynamicPoolRef.current) {
        if (!dynamicUsed.has(key)) obj.visible = false;
      }

      renderDistrictsLayer(cam, vb, districtUsed);
      for (const [key, sprite] of districtPoolRef.current) {
        if (!districtUsed.has(key)) sprite.visible = false;
      }

      renderRiverLayer(cam, vb, riverUsed);
      for (const [key, g] of riverPoolRef.current) {
        if (!riverUsed.has(key)) { g.visible = false; g.clear(); }
      }

      renderFogLayer(cam, vb, fogUsed);
      for (const [key, g] of fogPoolRef.current) {
        if (!fogUsed.has(key)) { g.visible = false; g.clear(); }
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
