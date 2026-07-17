// 最小语义色板与样式 token — 暖棕羊皮纸系（v2）
export const theme = {
  fontFamily: "'Inter', 'Noto Sans SC', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMono: "'SF Mono', 'Menlo', monospace",
  colors: {
    // 背景色（暖棕羊皮纸衬底）
    bg: '#1a1410',
    bgPanel: '#2a1e14',
    bgCard: '#3a2a1a',
    bgInput: '#1a1410',
    // 羊皮纸亮色区（用于科技树/政策卡等）
    parchment: '#E8D5A8',
    parchmentDark: '#C4A86E',
    // 边框
    border: '#5a4030',
    borderLight: '#8B7330',
    // 文本
    text: '#E8D5A8',
    textMuted: '#A09070',
    textDim: '#706050',
    textOnParchment: '#2a1e14',
    // 金色系
    accent: '#c9a84c',
    accentLight: '#F0D070',
    accentDark: '#8B7330',
    // 语义色
    primary: '#2d6a3f',
    primaryHover: '#357a4a',
    info: '#4A7FA8',
    infoHover: '#5a8fb8',
    danger: '#a53d2f',
    dangerHover: '#b74a3a',
    government: '#6b3f6b',
    disabled: '#5a4a3a',
    // 产出色
    gold: '#E8C840',
    science: '#6AB0FF',
    culture: '#C080FF',
    faith: '#E8E0D0',
    food: '#80CC80',
    production: '#E08060',
    // 新增语义色
    progressTrack: '#4a3a2a',
    bgOverlay: '#1a1410',
    warning: '#E0A030',
  },
  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  borderRadius: 4,
  focusRing: {
    outline: '2px solid #8cf',
    outlineOffset: '2px',
  },
} as const;

export type Theme = typeof theme;