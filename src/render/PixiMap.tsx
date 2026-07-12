// PixiJS 六边形地图渲染器（pointy-top）
import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, Polygon, Sprite } from 'pixi.js';
import { useGame } from './store';
import { hexToPixel, hexNeighbors, inBounds } from '../logic/hex';
import { findUnit, currentPlayer } from '../logic/state/commands';
import { cityAt } from '../logic/state/combat';
import { getTile } from '../logic/state/mapgen';
import { makeHexTexture, TERRAIN_COLOR } from './assets';
import type { HexCoord } from '../types';

const UNIT_MARK: Record<string, string> = {
  settler: '⌂', builder: '⚒', warrior: '⚔', archer: '弓', slinger: '石',
  swordsman: '剑', cavalry: '骑', knight: '骑', siege_tower: '塔', catapult: '投',
  cannon: '炮', trireme: '船', quadrireme: '船', musketman: '枪',
};

const DISP = 15;

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
  const state = useGame((s) => s.state);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const command = useGame((s) => s.command);
  const selectUnit = useGame((s) => s.selectUnit);
  const selectCity = useGame((s) => s.selectCity);

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

    const layer = new Container();
    app.stage.addChild(layer);

    for (const t of state.map.tiles) {
      const p = hexToPixel(t.coord, DISP);
      const cx = p.x + DISP;
      const cy = p.y + DISP;
      const isSel = selectedUnit && selectedUnit.tile.q === t.coord.q && selectedUnit.tile.r === t.coord.r;
      const reach = isReachable(t.coord);
      const tex = makeHexTexture(TERRAIN_COLOR[t.terrain] ?? 0x444444, DISP);
      const sprite = new Sprite(tex);
      sprite.anchor.set(0.5);
      sprite.x = cx;
      sprite.y = cy;
      sprite.eventMode = 'static';
      sprite.hitArea = new Polygon(hexPolyPoints(cx, cy, DISP));
      sprite.on('pointertap', () => onTile(t.coord));
      layer.addChild(sprite);
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

  return <div ref={hostRef} style={{ flex: 1, overflow: 'hidden', minHeight: 400 }} />;
}
