// SVG 六边形地图（pointy-top）+ 单位/城市/选中/移动范围
import { useGame } from './store';
import { hexToPixel } from '../logic/hex';
import { findUnit, currentPlayer } from '../logic/state/commands';
import { cityAt } from '../logic/state/combat';
import type { HexCoord } from '../types';

const TERRAIN_COLORS: Record<string, string> = {
  grassland: '#7BA05B', plains: '#C4B878', desert: '#E0C880', tundra: '#A8B8A0',
  snow: '#E8E8F0', hills: '#9A8868', mountain: '#808078', coast: '#5C9EAD', ocean: '#3A6B8C',
};

const UNIT_MARK: Record<string, string> = {
  settler: '⌂', builder: '⚒', warrior: '⚔', archer: '弓', slinger: '石',
  swordsman: '剑', cavalry: '骑', knight: '骑', siege_tower: '塔', catapult: '投',
  cannon: '炮', trireme: '船', quadrireme: '船', musketman: '枪',
};

const DISP = 15; // hex 半径 px

function hexPoints(cx: number, cy: number, size: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${(cx + size * Math.cos(ang)).toFixed(1)},${(cy + size * Math.sin(ang)).toFixed(1)}`);
  }
  return pts.join(' ');
}

export function HexMap() {
  const { state, selectedUnitId, command, selectUnit, selectCity } = useGame();
  const player = currentPlayer(state);
  const selectedUnit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
  const bounds = state.map.bounds;
  const width = bounds.width * DISP * Math.sqrt(3) + DISP * 2;
  const height = bounds.height * DISP * 1.5 + DISP * 2;

  const unitAt = (coord: HexCoord) =>
    state.players.flatMap((p) => p.units).find((u) => u.tile.q === coord.q && u.tile.r === coord.r);

  const onTile = (coord: HexCoord) => {
    const own = unitAt(coord);
    if (selectedUnit && selectedUnit.ownerId === player.id) {
      const target = unitAt(coord);
      const city = cityAt(state, coord);
      if (target && target.ownerId !== player.id) {
        command({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (city && city.ownerId !== player.id) {
        command({ kind: 'attack', attackerId: selectedUnit.id, targetTile: coord });
        return;
      }
      if (!target) {
        command({ kind: 'moveUnit', unitId: selectedUnit.id, to: coord });
        return;
      }
    }
    if (own && own.ownerId === player.id) {
      selectUnit(own.id);
      return;
    }
    const city = cityAt(state, coord);
    if (city) selectCity(city.id);
  };

  return (
    <svg width={width} height={height} style={{ background: '#1a1a2e' }}>
      {state.map.tiles.map((t) => {
        const p = hexToPixel(t.coord, DISP);
        const cx = p.x + DISP;
        const cy = p.y + DISP;
        const unit = unitAt(t.coord);
        const city = cityAt(state, t.coord);
        const isSelected = selectedUnit && selectedUnit.tile.q === t.coord.q && selectedUnit.tile.r === t.coord.r;
        return (
          <g key={`${t.coord.q},${t.coord.r}`} onClick={() => onTile(t.coord)} style={{ cursor: 'pointer' }}>
            <polygon
              points={hexPoints(cx, cy, DISP)}
              fill={TERRAIN_COLORS[t.terrain] ?? '#444'}
              stroke={isSelected ? '#fff' : '#222'}
              strokeWidth={isSelected ? 2 : 0.5}
            />
            {t.feature === 'forest' && <text x={cx} y={cy - 3} fontSize={8} textAnchor="middle" fill="#2d4a1f">▲</text>}
            {t.resource && <text x={cx} y={cy + 6} fontSize={6} textAnchor="middle" fill="#ffd700">·</text>}
            {city && (
              <circle cx={cx} cy={cy} r={DISP * 0.6} fill={city.ownerId === player.id ? '#4af' : '#f44'} stroke="#fff" strokeWidth={1} />
            )}
            {unit && (
              <text x={cx} y={cy + 4} fontSize={11} textAnchor="middle" fill={unit.ownerId === player.id ? '#fff' : '#f88'} fontWeight="bold">
                {UNIT_MARK[unit.type] ?? '?'}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
