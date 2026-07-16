// 带加载失败占位的图片组件
import { useState } from 'react';

interface AssetImageProps {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
}

export function AssetImage({ src, alt = '', width = 16, height = 16, style }: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        style={{
          display: 'inline-block',
          width,
          height,
          borderRadius: 2,
          background: 'transparent',
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
      onError={() => setFailed(true)}
    />
  );
}
