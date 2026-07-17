// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip } from '../../src/render/Tooltip';

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

describe('Tooltip', () => {
  beforeEach(() => {
    HTMLElement.prototype.getBoundingClientRect = vi.fn(() => ({
      left: 100, top: 100, right: 120, bottom: 120, width: 20, height: 20, x: 100, y: 100, toJSON: () => ({}),
    }));
  });

  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('shows tooltip on hover', async () => {
    render(
      <Tooltip content="tooltip-content">
        <button>hover me</button>
      </Tooltip>
    );
    fireEvent.mouseEnter(screen.getByText('hover me'));
    await waitFor(() => expect(screen.queryByText('tooltip-content')).toBeInTheDocument(), { timeout: 500 });
  });
});