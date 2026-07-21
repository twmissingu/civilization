// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { YieldIcon, YieldValue } from '../../src/render/YieldIcon';

describe('YieldIcon', () => {
  it('renders food icon', () => {
    const { container } = render(<YieldIcon type="food" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders production icon', () => {
    const { container } = render(<YieldIcon type="production" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<YieldIcon type="science" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
  });
});

describe('YieldValue', () => {
  it('renders positive value', () => {
    render(<YieldValue type="gold" value={5} />);
    expect(screen.getByText('+5')).toBeInTheDocument();
  });

  it('renders negative value', () => {
    render(<YieldValue type="culture" value={-2} />);
    expect(screen.getByText('-2')).toBeInTheDocument();
  });

  it('returns null for zero value', () => {
    const { container } = render(<YieldValue type="faith" value={0} />);
    expect(container.innerHTML).toBe('');
  });
});