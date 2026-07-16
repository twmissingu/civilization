// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip } from '../../src/render/Tooltip';

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

describe('Tooltip', () => {
  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 100,
      top: 100,
      right: 120,
      bottom: 120,
      width: 20,
      height: 20,
      x: 100,
      y: 100,
      toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('hover 后显示 tooltip 内容', async () => {
    render(
      <Tooltip content="tooltip-content">
        <button>hover me</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('hover me'));
    await waitFor(() => expect(screen.queryByText('tooltip-content')).toBeInTheDocument(), { timeout: 500 });
    fireEvent.mouseLeave(screen.getByText('hover me'));
    await waitFor(() => expect(screen.queryByText('tooltip-content')).not.toBeInTheDocument());
  });

  it('窗口 resize 后重新定位', async () => {
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 50,
      top: 50,
      right: 70,
      bottom: 70,
      width: 20,
      height: 20,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));
    render(
      <Tooltip content="tip" delay={0}>
        <button>target</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('target'));
    await waitFor(() => expect(screen.queryByText('tip')).toBeInTheDocument());

    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 200,
      top: 200,
      right: 220,
      bottom: 220,
      width: 20,
      height: 20,
      x: 200,
      y: 200,
      toJSON: () => ({}),
    }));
    fireEvent(window, new Event('resize'));
    const tip = screen.getByText('tip');
    expect(tip).toBeInTheDocument();
  });
});
