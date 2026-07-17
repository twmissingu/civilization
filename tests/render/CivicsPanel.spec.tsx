// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CivicsPanel } from '../../src/render/CivicsPanel';

describe('CivicsPanel', () => {
  it('renders civics panel', () => {
    render(<CivicsPanel />);
    expect(screen.getByText(/市政/)).toBeInTheDocument();
  });
});