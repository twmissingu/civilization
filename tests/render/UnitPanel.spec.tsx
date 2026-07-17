// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { UnitPanel } from '../../src/render/UnitPanel';

describe('UnitPanel', () => {
  it('renders empty when no unit selected', () => {
    const { container } = render(<UnitPanel onRequestFoundCity={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});