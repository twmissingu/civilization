// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AIProgressOverlay } from '../../src/render/AIProgressOverlay';

vi.mock('../../src/render/store', () => ({
  useGame: (selector: any) => {
    const store = { aiRunning: false, aiProgress: null };
    return selector ? selector(store) : store;
  },
}));

describe('AIProgressOverlay', () => {
  it('returns null when AI is not running', () => {
    const { container } = render(<AIProgressOverlay />);
    expect(container.innerHTML).toBe('');
  });
});