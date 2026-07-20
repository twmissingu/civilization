// 带加载/失败状态的图片组件 + 全局缓存 + WebP 优先
import { useState, useEffect, useRef } from 'react';

interface AssetImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

const imageCache = new Map<string, HTMLImageElement>();

function webpSrc(src: string): string {
  // 尝试加载 .webp 版本，fallback 到原文件
  if (src.endsWith('.png')) {
    return src.replace(/\.png$/, '.webp');
  }
  return src;
}

export function AssetImage({ src, alt = '', width = 16, height = 16, style }: AssetImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(
    imageCache.has(src) ? 'loaded' : 'loading'
  );
  const mountedRef = useRef(true);
  const webp = webpSrc(src);

  useEffect(() => {
    mountedRef.current = true;
    if (imageCache.has(src)) {
      setState('loaded');
      return;
    }
    setState('loading');
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, img);
      if (mountedRef.current) setState('loaded');
    };
    img.onerror = () => {
      // WebP 加载失败，fallback 到 PNG
      if (img.src !== src) {
        img.src = src;
        return;
      }
      if (mountedRef.current) setState('failed');
    };
    img.src = webp;
    return () => { mountedRef.current = false; };
  }, [src, webp]);

  if (state === 'failed') {
    return (
      <span
        style={{
          display: 'inline-block',
          width,
          height,
          borderRadius: 2,
          background: '#5a4a3a',
          border: '1px dashed #8B7330',
          boxSizing: 'border-box',
          ...style,
        }}
        title="图标加载失败"
      />
    );
  }

  if (state === 'loading') {
    return (
      <span
        style={{
          display: 'inline-block',
          width,
          height,
          borderRadius: 2,
          background: '#4a3a2a',
          ...style,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      style={{ borderRadius: 2, ...style }}
    />
  );
}