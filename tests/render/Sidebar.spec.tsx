// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../../src/render/Sidebar';

describe('Sidebar', () => {
  it('renders sidebar content', () => {
    render(<Sidebar researchRef={{ current: null } as React.RefObject<HTMLDivElement>} civicRef={{ current: null } as React.RefObject<HTMLDivElement>} onRequestWar={vi.fn()} onRequestFoundCity={vi.fn()} />);
    expect(screen.getByText(/罗马/)).toBeInTheDocument();
  });
});