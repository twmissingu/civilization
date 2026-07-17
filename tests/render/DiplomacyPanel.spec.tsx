// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DiplomacyPanel } from '../../src/render/DiplomacyPanel';

describe('DiplomacyPanel', () => {
  it('renders diplomacy section', () => {
    render(<DiplomacyPanel onRequestWar={vi.fn()} />);
    expect(screen.getByText(/外交/)).toBeInTheDocument();
  });
});