import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { createRng } from './logic/rng';
import { generateMap, type TerrainType, type GameMap } from './logic/state/mapgen';

const TERRAIN_COLORS: Record<TerrainType, string> = {
  grassland: '#7BA05B',
  plains: '#C4B878',
  desert: '#E0C880',
  tundra: '#A8B8A0',
  snow: '#E8E8F0',
  hills: '#9A8868',
  mountain: '#808078',
  coast: '#5C9EAD',
  ocean: '#3A6B8C',
};

const FEATURE_MARK: Record<string, string> = {
  forest: '🌲',
  rainforest: '🌴',
  geothermal: '♨',
  oasis: '💧',
  marsh: '~',
  floodplains: '~',
};

function HexGrid({ map, size }: { map: GameMap; size: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${map.bounds.width}, ${size}px)`,
        fontFamily: 'monospace',
      }}
    >
      {map.tiles.map((t) => (
        <div
          key={`${t.coord.q},${t.coord.r}`}
          title={`${t.coord.q},${t.coord.r} ${t.terrain}${t.feature ? '/' + t.feature : ''}${t.resource ? '/' + t.resource.id : ''}`}
          style={{
            width: size,
            height: size,
            background: TERRAIN_COLORS[t.terrain],
            fontSize: size * 0.6,
            textAlign: 'center',
            lineHeight: `${size}px`,
          }}
        >
          {t.feature ? FEATURE_MARK[t.feature] ?? '' : t.resource ? '·' : ''}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [seed, setSeed] = useState(42);
  const [size, setSize] = useState(14);
  // 固定 seed 派生地图（确定性）
  const map = generateMap({ width: 30, height: 18 }, createRng(seed));

  return (
    <div style={{ padding: 12 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 16 }}>文明 · 开源复现（M1 占位渲染）</h1>
      <div style={{ marginBottom: 8 }}>
        <label>seed </label>
        <input
          type="number"
          value={seed}
          onChange={(e) => setSeed(Number(e.target.value) || 0)}
          style={{ width: 70 }}
        />
        <label style={{ marginLeft: 12 }}>tile </label>
        <input
          type="range"
          min={6}
          max={24}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
        />
        <span style={{ marginLeft: 8 }}>{size}px</span>
      </div>
      <HexGrid map={map} size={size} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
