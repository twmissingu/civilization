// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelpModal } from '../../src/render/HelpModal';

describe('HelpModal', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<HelpModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders help content when visible', () => {
    render(<HelpModal isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText(/游戏帮助/)).toBeInTheDocument();
  });
});