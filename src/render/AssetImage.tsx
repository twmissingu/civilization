// 带加载/失败状态的图片组件 + 全局缓存
import { useState, useEffect, useRef } from 'react';

interface AssetImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

const imageCache = new Map<string, HTMLImageElement>();

export function AssetImage({ src, alt = '', width = 16, height = 16, style }: AssetImageProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(
    imageCache.has(src) ? 'loaded' : 'loading'
  );
  const mountedRef = useRef(true);

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
      if (mountedRef.current) setState('failed');
    };
    img.src = src;
    return () => { mountedRef.current = false; };
  }, [src]);

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