// 数据层共享类型与工具

export interface Yield {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

export const ZERO_YIELD: Yield = {
  food: 0,
  production: 0,
  gold: 0,
  science: 0,
  culture: 0,
  faith: 0,
};

export function addYield(a: Yield, b: Partial<Yield>): Yield {
  return {
    food: a.food + (b.food ?? 0),
    production: a.production + (b.production ?? 0),
    gold: a.gold + (b.gold ?? 0),
    science: a.science + (b.science ?? 0),
    culture: a.culture + (b.culture ?? 0),
    faith: a.faith + (b.faith ?? 0),
  };
}

/** 科技/市政/建筑/单位成本缩放（见 gamedata §12） */
export function scaledCost(base: number, built: number, factor: number): number {
  return Math.round(base * (1 + factor * built));
}
