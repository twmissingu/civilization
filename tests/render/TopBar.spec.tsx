// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { currentPlayer } from '../../src/logic/state/query';
import { TopBar } from '../../src/render/TopBar';
import type { GameConfig } from '../../src/logic/state/types';

const mockEndTurn = vi.fn();
const mockSave = vi.fn();
const mockLoad = vi.fn();
const mockNewGame = vi.fn();

vi.mock('../../src/render/store', () => ({
  useGame: (selector: (s: Record<string, unknown>) => unknown) => {
    const config: GameConfig = {
      mapSize: { width: 16, height: 12 },
      civChoices: [{ id: 'rome', isAI: false }],
      difficulty: 'prince',
      maxTurns: 300,
    };
    const state = createInitialState(42, config);
    currentPlayer(state);
    const store = {
      state,
      message: '',
      endTurn: mockEndTurn,
      save: mockSave,
      load: mockLoad,
      newGame: mockNewGame,
    };
    return selector ? selector(store) : store;
  },
  useCurrentPlayer: () => {
    const config: GameConfig = {
      mapSize: { width: 16, height: 12 },
      civChoices: [{ id: 'rome', isAI: false }],
      difficulty: 'prince',
      maxTurns: 300,
    };
    const state = createInitialState(42, config);
    return currentPlayer(state);
  },
}));

describe('TopBar', () => {
  it('renders civ name and turn', () => {
    render(<TopBar onShowHelp={vi.fn()} />);
    expect(screen.getByText('罗马（式）')).toBeInTheDocument();
    expect(screen.getByText(/第 1 回合/)).toBeInTheDocument();
  });

  it('renders end turn button', () => {
    render(<TopBar onShowHelp={vi.fn()} />);
    expect(screen.getAllByText(/结束回合/).length).toBeGreaterThan(0);
  });

  it('renders save and load buttons', () => {
    render(<TopBar onShowHelp={vi.fn()} />);
    expect(screen.getAllByText('保存').length).toBeGreaterThan(0);
    expect(screen.getAllByText('读取').length).toBeGreaterThan(0);
  });
});
