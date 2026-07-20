// 小地图组件（Canvas 2D overlay，右下角显示）
// 增强功能：迷雾、单位、视口矩形、精确点击跳转
import { useEffect, useRef } from 'react';
import { useGame } from './store';
import { hexToPixel, viewportHexBounds } from '../logic/hex';
import { TERRAIN_COLOR } from './assets';
import { theme } from './theme';

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const HEX_SCALE = 0.15;
const DISP = 22;

export function Minimap() {
  const state = useGame((s) => s.state);
  const cameraOffset = useGame((s) => s.cameraOffset);
  const selectUnit = useGame((s) => s.selectUnit);
  const selectCity = useGame((s) => s.selectCity);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

    if (!state.map) return;

    const bounds = state.map.bounds;

    // 绘制地形 + 迷雾
    for (const tile of state.map.tiles) {
      const p = hexToPixel(tile.coord, DISP);
      const x = Math.round(p.x * HEX_SCALE);
      const y = Math.round(p.y * HEX_SCALE);
      if (x < -2 || x > MINIMAP_W + 2 || y < -2 || y > MINIMAP_H + 2) continue;

      if (tile.visibility === 'unexplored') {
        ctx.fillStyle = '#111';
        ctx.fillRect(x, y, 3, 3);
        continue;
      }

      const color = TERRAIN_COLOR[tile.terrain] ?? 0x444444;
      const r = (color >> 16) & 0xff;
      const g = (color >> 8) & 0xff;
      const b = color & 0xff;
      ctx.fillStyle = `rgb(${r},${g},${b})`;

      if (tile.visibility === 'explored') {
        ctx.globalAlpha = 0.5;
      } else {
        ctx.globalAlpha = 1;
      }
      ctx.fillRect(x, y, 3, 3);
      ctx.globalAlpha = 1;
    }

    // 绘制单位（小点）
    for (const p of state.players) {
      for (const u of p.units) {
        const pos = hexToPixel(u.tile, DISP);
        const x = pos.x * HEX_SCALE;
        const y = pos.y * HEX_SCALE;
        const tile = state.map.tiles.find((t) => t.coord.q === u.tile.q && t.coord.r === u.tile.r);
        if (tile && tile.visibility === 'unexplored') continue;
        ctx.fillStyle = p.id === state.players[0].id ? '#44ff44' : '#ff4444';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 绘制城市
    for (const p of state.players) {
      for (const c of p.cities) {
        const pos = hexToPixel(c.tile, DISP);
        const x = pos.x * HEX_SCALE;
        const y = pos.y * HEX_SCALE;
        const tile = state.map.tiles.find((t) => t.coord.q === c.tile.q && t.coord.r === c.tile.r);
        if (tile && tile.visibility === 'unexplored') continue;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 绘制视口矩形
    if (cameraOffset && canvas.width > 0 && canvas.height > 0) {
      const vb = viewportHexBounds(cameraOffset, canvas.width, canvas.height, bounds, DISP, 0);
      const corners = [
        { q: vb.minQ, r: vb.minR },
        { q: vb.maxQ, r: vb.minR },
        { q: vb.maxQ, r: vb.maxR },
        { q: vb.minQ, r: vb.maxR },
      ].map((c) => {
        const p = hexToPixel(c, DISP);
        return { x: p.x * HEX_SCALE, y: p.y * HEX_SCALE };
      });
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [state.map, state.players, cameraOffset]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 反算地图坐标
    const q = Math.round((mx / HEX_SCALE - DISP) / (DISP * Math.sqrt(3)));
    const r = Math.round((my / HEX_SCALE - DISP - q * DISP * (Math.sqrt(3) / 2)) / (DISP * 1.5));
    const coord = { q, r };

    // 先找单位，再找城市，最后纯跳转
    const unit = state.players.flatMap((p) => p.units).find((u) => u.tile.q === q && u.tile.r === r);
    if (unit) {
      selectUnit(unit.id);
      return;
    }
    const city = state.players.flatMap((p) => p.cities).find((c) => c.tile.q === q && c.tile.r === r);
    if (city) {
      selectCity(city.id);
      return;
    }
    // 纯跳转：取消选中，设置 cameraTarget（通过 selectUnit(null) 清除选中）
    selectUnit(null);
    selectCity(null);
    // 直接设置 cameraTarget 需要 store 方法
    const { setCameraOffset } = useGame.getState();
    // 计算偏移使点击位置居中
    const p = hexToPixel(coord, DISP);
    const cam = {
      x: canvasRef.current!.width / 2 - (p.x + DISP),
      y: canvasRef.current!.height / 2 - (p.y + DISP),
    };
    setCameraOffset(cam);
  };

  return (
    <canvas
      ref={canvasRef}
      width={MINIMAP_W}
      height={MINIMAP_H}
      onClick={handleClick}
      style={{
        position: 'absolute',
        bottom: 8,
        right: 8,
        border: `1px solid ${theme.colors.accent}`,
        borderRadius: 4,
        background: theme.colors.bgCard,
        cursor: 'pointer',
        zIndex: 10,
        opacity: 0.85,
      }}
      title="点击小地图跳转"
    />
  );
}