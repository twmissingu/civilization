// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { VictoryBanner } from '../../src/render/VictoryBanner';

describe('VictoryBanner', () => {
  it('renders nothing when game is active', () => {
    const { container } = render(<VictoryBanner />);
    expect(container.firstChild).toBeNull();
  });
});