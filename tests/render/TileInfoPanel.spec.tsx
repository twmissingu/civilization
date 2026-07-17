// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TileInfoPanel } from '../../src/render/TileInfoPanel';

describe('TileInfoPanel', () => {
  it('renders nothing when no tile hovered', () => {
    const { container } = render(<TileInfoPanel />);
    expect(container.firstChild).toBeNull();
  });
});