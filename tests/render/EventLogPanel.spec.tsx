// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EventLogPanel } from '../../src/render/EventLogPanel';

describe('EventLogPanel', () => {
  it('renders nothing when no events', () => {
    const { container } = render(<EventLogPanel />);
    expect(container.firstChild).toBeNull();
  });
});