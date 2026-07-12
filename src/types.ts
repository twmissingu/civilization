// 共享类型（逻辑层与渲染层都可引用）

/** 轴向坐标（pointy-top 六边形） */
export interface HexCoord {
  q: number;
  r: number;
}

/** 6 邻格方向（pointy-top） */
export const HEX_DIRECTIONS: readonly HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
] as const;
