// 共享 UI 样式对象
import { theme } from './theme';

export const panelStyle: React.CSSProperties = {
  marginBottom: theme.spacing.md,
  padding: theme.spacing.sm,
  background: theme.colors.bgCard,
  borderRadius: theme.borderRadius,
};

export const itemStyle: React.CSSProperties = {
  cursor: 'pointer',
  padding: '2px 4px',
  fontFamily: theme.fontFamily,
};

export const btnStyle: React.CSSProperties = {
  padding: '4px 8px',
  background: theme.colors.primary,
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  borderRadius: theme.borderRadius,
  fontFamily: theme.fontFamily,
  fontSize: 12,
};
