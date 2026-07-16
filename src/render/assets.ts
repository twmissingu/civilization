// 美术资产管理：AssetManifest 接口 + 程序化六边形纹理（占位，可被 /jiuqing-image-generate 资产替换）
import { Texture } from 'pixi.js';

// art-spec §3 的 assetId 命名约定；渲染层维护 assetId -> 资源映射
export interface AssetManifest {
  textures: Record<string, { sheet: string; frame: string }>;
  reactAssets: Record<string, string>;
}

/** terrain -> 颜色（与 art-spec 色板一致） */
export const TERRAIN_COLOR: Record<string, number> = {
  grassland: 0x7ba05b, plains: 0xc4b878, desert: 0xe0c880, tundra: 0xa8b8a0,
  snow: 0xe8e8f0, hills: 0x9a8868, mountain: 0x808078, coast: 0x5c9ead, ocean: 0x3a6b8c,
};

const hexCache = new Map<string, Texture>();

function toHex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

/** 生成 pointy-top 六边形纹理（base 色 + 噪点纹理，六边形外透明） */
export function makeHexTexture(color: number, size: number): Texture {
  const key = `${color}-${size}`;
  const cached = hexCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  const s = Math.ceil(size * 2) + 2;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const cx = s / 2;
  const cy = s / 2;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(a);
    const y = cy + size * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // 基色渐变（手绘风：中心略亮）
  const grad = ctx.createRadialGradient(cx, cy, size * 0.2, cx, cy, size);
  const base = toHex(color);
  grad.addColorStop(0, lighten(base, 0.12));
  grad.addColorStop(1, base);
  ctx.fillStyle = grad;
  ctx.fill();

  // 噪点纹理
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 28; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
  }
  ctx.restore();

  // 描边
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const tex = Texture.from(canvas);
  hexCache.set(key, tex);
  return tex;
}

function lighten(hex: string, amt: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const f = (v: number) => Math.min(255, Math.round(v + (255 - v) * amt));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

/** 清空纹理缓存（HMR/换资产时） */
export function clearHexTextureCache(): void {
  hexCache.clear();
  hexImageCache.clear();
}

const hexImageCache = new Map<string, Texture>();

/** 从图片 URL 生成六边形裁剪纹理（加载真实 AI 资产） */
export async function makeHexTextureFromImage(url: string, size: number): Promise<Texture> {
  const key = `${url}-${size}`;
  const cached = hexImageCache.get(key);
  if (cached) return cached;

  const img = new Image();
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`load fail: ${url}`));
  });

  const canvas = document.createElement('canvas');
  const s = Math.ceil(size * 2) + 2;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const cx = s / 2;
  const cy = s / 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    const x = cx + size * Math.cos(a);
    const y = cy + size * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - size, cy - size, size * 2, size * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const tex = Texture.from(canvas);
  hexImageCache.set(key, tex);
  return tex;
}

/** 地形 -> public 资产 URL */
export function terrainAssetUrl(terrain: string): string {
  return `/assets/terrain/${terrain}.png`;
}

/** 单位 -> public 资产 URL */
export function unitAssetUrl(unitType: string): string {
  return `/assets/units/${unitType}.png`;
}

/** 领袖肖像 -> public 资产 URL */
export function portraitAssetUrl(civId: string): string {
  const map: Record<string, string> = {
    rome: 'rome_caesar',
    china: 'china_emperor',
    greece: 'greece_leader',
  };
  return `/assets/portraits/${map[civId] ?? 'rome_caesar'}.png`;
}

const circleCache = new Map<string, Texture>();

/** 从图片 URL 生成圆形遮罩纹理（单位 token） */
export async function makeCircleTextureFromImage(url: string, size: number): Promise<Texture> {
  const key = `${url}-${size}`;
  const cached = circleCache.get(key);
  if (cached) return cached;
  const img = new Image();
  img.src = url;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`load fail: ${url}`));
  });
  const canvas = document.createElement('canvas');
  const s = Math.ceil(size * 2) + 2;
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d')!;
  const cx = s / 2;
  const cy = s / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, cx - size, cy - size, size * 2, size * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const tex = Texture.from(canvas);
  circleCache.set(key, tex);
  return tex;
}

/** 区域 -> public 资产 URL */
export function districtAssetUrl(d: string): string {
  return `/assets/districts/${d}.png`;
}

/** 奇观 -> public 资产 URL */
export function wonderAssetUrl(id: string): string {
  return `/assets/wonders/${id}.png`;
}

/** 地貌 -> public 资产 URL */
export function featureAssetUrl(id: string): string {
  return `/assets/features/${id}.png`;
}
