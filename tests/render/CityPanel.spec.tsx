// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { CityPanel } from '../../src/render/CityPanel';

describe('CityPanel', () => {
  it('renders nothing when no city selected', () => {
    const { container } = render(<CityPanel />);
    expect(container.firstChild).toBeNull();
  });
});