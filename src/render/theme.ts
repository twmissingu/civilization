// 最小语义色板与样式 token
export const theme = {
  fontFamily: "'Inter', 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMono: "'SF Mono', 'Menlo', monospace",
  colors: {
    bg: '#1a1a2e',
    bgPanel: '#22223a',
    bgCard: '#2c2c44',
    bgInput: '#1a1a2e',
    border: '#444',
    text: '#eee',
    textMuted: '#bbb',
    textDim: '#999',
    accent: '#c9a84c',
    primary: '#2d6a3f',
    primaryHover: '#357a4a',
    info: '#1f5f8a',
    infoHover: '#256fa0',
    danger: '#a53d2f',
    dangerHover: '#b74a3a',
    government: '#6b3f6b',
    disabled: '#555',
    gold: '#ffd700',
    science: '#4af',
    culture: '#a8f',
    faith: '#fff',
    food: '#8f8',
    production: '#f88',
  },
  spacing: {
    xs: 4,
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
  },
  borderRadius: 4,
  focusRing: {
    outline: '2px solid #8cf',
    outlineOffset: '2px',
  },
} as const;

export type Theme = typeof theme;

