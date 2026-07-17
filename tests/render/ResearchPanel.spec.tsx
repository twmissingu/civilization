// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResearchPanel } from '../../src/render/ResearchPanel';

describe('ResearchPanel', () => {
  it('renders research section', () => {
    render(<ResearchPanel />);
    expect(screen.getByText(/研究/)).toBeInTheDocument();
  });
});