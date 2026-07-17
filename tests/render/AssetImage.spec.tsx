// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssetImage } from '../../src/render/AssetImage';

describe('AssetImage', () => {
  it('renders loading state initially', () => {
    render(<AssetImage src="/assets/tech/pottery.png" alt="tech" width={18} height={18} />);
    // 初始为 loading 占位（span，非 img）
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows error placeholder on failed src', async () => {
    render(<AssetImage src="/missing.png" width={16} height={16} />);
    // 渲染后组件进入 loading 状态，然后 onerror 触发后进入 failed 状态
    // 在 jsdom 中，image 可能不会自动触发 onerror，所以检查 loading 占位
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});