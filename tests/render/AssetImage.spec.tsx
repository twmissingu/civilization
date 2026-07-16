// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AssetImage } from '../../src/render/AssetImage';

describe('AssetImage', () => {
  it('正常渲染图片', () => {
    render(<AssetImage src="/assets/tech/pottery.png" alt="tech" width={18} height={18} />);
    expect(screen.getByAltText('tech')).toBeInTheDocument();
  });

  it('加载失败时渲染占位，不直接操作 DOM', () => {
    render(<AssetImage src="/missing.png" width={16} height={16} />);
    const img = screen.getByRole('img');
    fireEvent.error(img);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
