// 视觉特效系统（奇观建成/战斗粒子）
import { Graphics } from 'pixi.js';
import { hexToPixel } from '../../logic/hex';
import { DISP } from './layers';

export interface Effect {
  g: Graphics;
  age: number;
  lifetime: number;
  type: 'wonder' | 'combat';
}

export function spawnEffect(
  type: 'wonder' | 'combat',
  tile: { q: number; r: number },
  effectsLayer: { addChild: (child: Graphics) => void } | null,
  effects: Effect[]
) {
  if (!effectsLayer) return;
  const g = new Graphics();
  g.eventMode = 'none';
  const p = hexToPixel(tile, DISP);
  g.position.set(p.x + DISP, p.y + DISP);
  effectsLayer.addChild(g);
  effects.push({ g, age: 0, lifetime: type === 'wonder' ? 60 : 30, type });
}

export function updateEffects(effects: Effect[]) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const ef = effects[i];
    ef.age++;
    const progress = ef.age / ef.lifetime;
    if (progress >= 1) {
      ef.g.visible = false;
      ef.g.clear();
      effects.splice(i, 1);
      continue;
    }
    ef.g.clear();
    if (ef.type === 'wonder') {
      const scale = 0.5 + Math.sin(progress * Math.PI) * 1.5;
      const alpha = 1 - progress;
      ef.g.circle(0, 0, DISP * scale).fill({ color: 0xffd700, alpha: alpha * 0.6 });
      ef.g.circle(0, 0, DISP * scale * 0.6).fill({ color: 0xffffff, alpha: alpha * 0.3 });
    } else {
      const scale = 0.3 + progress * 1.2;
      const alpha = 1 - progress;
      ef.g.circle(0, 0, DISP * scale).fill({ color: 0xff3333, alpha: alpha * 0.5 });
      ef.g.circle(0, 0, DISP * scale * 0.4).fill({ color: 0xffff00, alpha: alpha * 0.2 });
    }
  }
}