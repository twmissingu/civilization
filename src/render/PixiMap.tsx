// PixiJS 六边形地图渲染器（pointy-top）
// 简化后的 React 组件壳：生命周期、镜头动画、事件处理、调度层渲染
import { useEffect, useRef, useState } from 'react';
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { useGame } from './store';
import { hexToPixel, viewportHexBounds } from '../logic/hex';
import { findUnit, currentPlayer, cityAt } from '../logic/state/query';
import { makeHexTextureFromImage, makeCircleTextureFromImage, unitAssetUrl, districtAssetUrl, terrainAssetUrl, featureAssetUrl } from './assets';
import type { HexCoord } from '../types';
import type { PlayerState } from '../logic/state/types';
import { DISP, renderTerrainLayer, renderDynamicLayer, renderDistrictsLayer, renderRiverLayer, renderFogLayer, type LayerContext, type ViewBounds } from './pixi/layers';
import { spawnEffect, updateEffects, type Effect } from './pixi/effects';

interface PixiMapProps {
  onRequestAttack?: (targetTile: HexCoord) => void;
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
  const effectsLayerRef = useRef<Container | null>(null);
  const effectsRef = useRef<Effect[]>([]);
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
  // 增量渲染：cameraContainer 整体平移，避免每帧全量 draw()
  const cameraContainerRef = useRef<Container | null>(null);
  const lastDrawVersionRef = useRef<number>(-1);

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
        // 优化：动画期间仅平移 cameraContainer，不调用全量 draw()
        app.ticker.add(() => {
          if (animatingRef.current && currentCamRef.current && targetCamRef.current) {
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
            // 仅平移 cameraContainer，不重建 Graphics
            if (cameraContainerRef.current) {
              cameraContainerRef.current.x = cur.x;
              cameraContainerRef.current.y = cur.y;
            }
          }
          // 选中单位脉冲动画
          pulseRef.current = (pulseRef.current + 0.04) % (Math.PI * 2);
          if (selectedRingRef.current && selectedRingRef.current.visible) {
            selectedRingRef.current.alpha = 0.5 + Math.sin(pulseRef.current) * 0.4;
          } else {
            pulseRef.current = 0;
          }
          // 视觉特效动画（奇观建成/战斗粒子）
          updateEffects(effectsRef.current);
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
      effectsLayerRef.current = null;
      tooltipRef.current = null;
      terrainPoolRef.current.clear();
      dynamicPoolRef.current.clear();
      districtPoolRef.current.clear();
      riverPoolRef.current.clear();
      fogPoolRef.current.clear();
      effectsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (appRef.current) draw();
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
    if (!cameraContainerRef.current) {
      cameraContainerRef.current = new Container();
      app.stage.addChild(cameraContainerRef.current);
    }
    const cc = cameraContainerRef.current;
    if (!terrainLayerRef.current) {
      terrainLayerRef.current = new Container();
      cc.addChild(terrainLayerRef.current);
    }
    if (!riverLayerRef.current) {
      riverLayerRef.current = new Container();
      cc.addChild(riverLayerRef.current);
    }
    if (!dynamicLayerRef.current) {
      dynamicLayerRef.current = new Container();
      cc.addChild(dynamicLayerRef.current);
    }
    if (!districtsLayerRef.current) {
      districtsLayerRef.current = new Container();
      cc.addChild(districtsLayerRef.current);
    }
    if (!fogLayerRef.current) {
      fogLayerRef.current = new Container();
      cc.addChild(fogLayerRef.current);
    }
    if (!effectsLayerRef.current) {
      effectsLayerRef.current = new Container();
      effectsLayerRef.current.eventMode = 'none';
      cc.addChild(effectsLayerRef.current);
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

  function processEvents(app: Application) {
    const events = useGame.getState().eventLog ?? [];
    for (const event of events) {
      if (event.turn !== state.turn) continue;
      if (event.kind === 'WonderBuilt') {
        const cityId = event.payload?.cityId as string;
        if (!cityId) continue;
        const city = state.players.flatMap((p) => p.cities).find((c) => c.id === cityId);
        if (!city) continue;
        if (!animatingRef.current) {
          const p = hexToPixel(city.tile, DISP);
          targetCamRef.current = { x: app.screen.width / 2 - (p.x + DISP), y: app.screen.height / 2 - (p.y + DISP) };
          animatingRef.current = true;
        }
        spawnEffect('wonder', city.tile, effectsLayerRef.current, effectsRef.current);
      } else if (event.kind === 'CombatResolved') {
        const defenderTile = event.payload?.defenderTile as { q: number; r: number } | undefined;
        if (!defenderTile) continue;
        if (!animatingRef.current) {
          const p = hexToPixel(defenderTile, DISP);
          targetCamRef.current = { x: app.screen.width / 2 - (p.x + DISP), y: app.screen.height / 2 - (p.y + DISP) };
          animatingRef.current = true;
        }
        spawnEffect('combat', defenderTile, effectsLayerRef.current, effectsRef.current);
      }
    }
  }

  function draw() {
    const app = appRef.current;
    if (!app) return;
    try {
      ensureLayers(app);
      const { state: gs, selectedUnitId: selId } = useGame.getState();
      const player = currentPlayer(gs);
      const targetCam = cameraOffsetFor(player, gs.map.bounds, app.screen.width, app.screen.height, cameraTarget);
      // 更新小地图相机偏移
      useGame.getState().setCameraOffset(targetCam);

      // 事件触发镜头聚焦和视觉特效（奇观建成/战斗事件）
      processEvents(app);

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
      // 增量渲染：如果地图内容未变，仅更新 cameraContainer 位置，跳过全量重建
      if (mapVersion === lastDrawVersionRef.current && cameraContainerRef.current) {
        cameraContainerRef.current.x = cam.x;
        cameraContainerRef.current.y = cam.y;
        return;
      }
      lastDrawVersionRef.current = mapVersion;

      const selectedUnit = selId ? findUnit(gs, selId) : null;
      const vb: ViewBounds = viewportHexBounds(cam, app.screen.width, app.screen.height, gs.map.bounds, DISP, 2);

      // 构建 LayerContext
      const ctx: LayerContext = {
        gs,
        selectedUnitId: selId,
        terrainPool: terrainPoolRef.current,
        dynamicPool: dynamicPoolRef.current,
        districtPool: districtPoolRef.current,
        riverPool: riverPoolRef.current,
        fogPool: fogPoolRef.current,
        terrainTex: terrainTexRef.current,
        unitTex: unitTexRef.current,
        districtTex: districtTexRef.current,
        featureTex: featureTexRef.current,
        terrainLayer: terrainLayerRef.current!,
        dynamicLayer: dynamicLayerRef.current!,
        riverLayer: riverLayerRef.current!,
        districtsLayer: districtsLayerRef.current!,
        fogLayer: fogLayerRef.current!,
        tooltip: tooltipRef.current,
        setHoveredTile,
        onTile,
        pulse: pulseRef.current,
        selectedRing: selectedRingRef,
      };

      // 设置 cameraContainer 位置，所有子 layer 坐标相对于容器
      if (cameraContainerRef.current) {
        cameraContainerRef.current.x = cam.x;
        cameraContainerRef.current.y = cam.y;
      }

      // 地形层
      const terrainUsed = renderTerrainLayer(ctx, vb);
      for (const [key, sprite] of terrainPoolRef.current) {
        if (!terrainUsed.has(key)) sprite.visible = false;
      }

      // 动态层（单位、城市、领土、边界、资源、选择）
      const dynamicUsed = new Set<string>();
      renderDynamicLayer(ctx, { x: 0, y: 0 }, vb, player, selectedUnit ?? null, dynamicUsed);
      for (const [key, obj] of dynamicPoolRef.current) {
        if (!dynamicUsed.has(key)) obj.visible = false;
      }

      // 区域层
      const districtUsed = new Set<string>();
      renderDistrictsLayer(ctx, vb, districtUsed);
      for (const [key, sprite] of districtPoolRef.current) {
        if (!districtUsed.has(key)) sprite.visible = false;
      }

      // 河流层
      const riverUsed = new Set<string>();
      renderRiverLayer(ctx, vb, riverUsed);
      for (const [key, g] of riverPoolRef.current) {
        if (!riverUsed.has(key)) { g.visible = false; g.clear(); }
      }

      // 迷雾层
      const fogUsed = new Set<string>();
      renderFogLayer(ctx, vb, fogUsed);
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
