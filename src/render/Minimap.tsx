// 小地图组件（Canvas 2D overlay，右下角显示）
import { useEffect, useRef } from 'react';
import { useGame } from './store';
import { hexToPixel } from '../logic/hex';
import { TERRAIN_COLOR } from './assets';
import { theme } from './theme';

const MINIMAP_W = 180;
const MINIMAP_H = 120;
const HEX_SCALE = 0.15;

export function Minimap() {
  const state = useGame((s) => s.state);
  const selectUnit = useGame((s) => s.selectUnit);
  const selectCity = useGame((s) => s.selectCity);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MINIMAP_W, MINIMAP_H);

    // 绘制地形
    if (state.map) {
      for (const tile of state.map.tiles) {
        const p = hexToPixel(tile.coord, 22);
        const x = Math.round(p.x * HEX_SCALE);
        const y = Math.round(p.y * HEX_SCALE);
        if (x < 0 || x > MINIMAP_W || y < 0 || y > MINIMAP_H) continue;
        const color = TERRAIN_COLOR[tile.terrain] ?? 0x444444;
        const r = (color >> 16) & 0xff;
        const g = (color >> 8) & 0xff;
        const b = color & 0xff;
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }

    // 绘制城市（白点）
    for (const p of state.players) {
      for (const c of p.cities) {
        const pos = hexToPixel(c.tile, 22);
        const x = pos.x * HEX_SCALE;
        const y = pos.y * HEX_SCALE;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [state.map, state.players]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    // 反算地图坐标 (近似)
    const q = Math.round((mx / HEX_SCALE - 22) / (22 * Math.sqrt(3)));
    const r = Math.round((my / HEX_SCALE - 22 - q * 22 * (Math.sqrt(3) / 2)) / (22 * 1.5));
    // 清理选中，触发地图居中
    selectUnit(null);
    selectCity(null);
    // 实际地图居中由 store 的 cameraTarget 处理
    const unit = state.players.flatMap((p) => p.units).find((u) => u.tile.q === q && u.tile.r === r);
    if (unit) selectUnit(unit.id);
    else {
      const city = state.players.flatMap((p) => p.cities).find((c) => c.tile.q === q && c.tile.r === r);
      if (city) selectCity(city.id);
    }
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