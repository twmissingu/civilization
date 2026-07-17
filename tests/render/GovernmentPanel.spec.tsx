// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GovernmentPanel } from '../../src/render/GovernmentPanel';

describe('GovernmentPanel', () => {
  it('renders government section', () => {
    render(<GovernmentPanel />);
    expect(screen.getByText(/政体/)).toBeInTheDocument();
  });
});