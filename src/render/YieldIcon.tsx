// 产出图标组件（替代 emoji 的手绘风格 CSS 图标）
import { theme } from './theme';

interface YieldIconProps {
  type: 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith';
  size?: number;
  showLabel?: boolean;
}

const ICON_DATA: Record<string, { path: string; color: string; label: string }> = {
  food: {
    path: 'M8 2v6a4 4 0 0 1-4 4H2V2h2v6h2V2h2z',
    color: theme.colors.food,
    label: '食',
  },
  production: {
    path: 'M4 2h8v2H8v2h4v2H8v2h4v2H4V2z',
    color: theme.colors.production,
    label: '产',
  },
  gold: {
    path: 'M2 4h12v2H2V4zm0 4h8v2H2V8zm0 4h12v2H2v-2z',
    color: theme.colors.gold,
    label: '金',
  },
  science: {
    path: 'M8 1L2 6v5h12V6L8 1zm0 2.5l3 2.5H5l3-2.5z',
    color: theme.colors.science,
    label: '科',
  },
  culture: {
    path: 'M2 14V2l4 2 4-2 4 2v12l-4-2-4 2-4-2z',
    color: theme.colors.culture,
    label: '文',
  },
  faith: {
    path: 'M8 1l2 4h4l-3 3 1 5-4-3-4 3 1-5-3-3h4z',
    color: theme.colors.faith,
    label: '信',
  },
};

export function YieldIcon({ type, size = 12, showLabel = false }: YieldIconProps) {
  const data = ICON_DATA[type];
  if (!data) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, verticalAlign: 'middle' }}>
      <svg width={size} height={size} viewBox="0 0 16 16" fill={data.color} style={{ display: 'block' }}>
        <path d={data.path} />
      </svg>
      {showLabel && <span style={{ fontSize: size - 2, color: data.color, lineHeight: 1 }}>{data.label}</span>}
    </span>
  );
}

/** 产出图标 + 数值 */
export function YieldValue({ type, value }: { type: YieldIconProps['type']; value: number }) {
  if (value === 0) return null;
  const data = ICON_DATA[type];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: data?.color, fontSize: 12 }}>
      <YieldIcon type={type} size={10} />
      <span>{value > 0 ? `+${value}` : value}</span>
    </span>
  );
}