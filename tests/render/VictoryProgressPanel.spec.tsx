// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { VictoryProgressPanel } from '../../src/render/VictoryProgressPanel';
import type { GameConfig, GameState } from '../../src/logic/state/types';

const { useGame: mockUseGame, useCurrentPlayer: mockUseCurrentPlayer, useAllPlayers: mockUseAllPlayers } = vi.hoisted(() => ({
  useGame: vi.fn(),
  useCurrentPlayer: vi.fn(),
  useAllPlayers: vi.fn(),
}));

vi.mock('../../src/render/store', () => ({
  useGame: mockUseGame,
  useCurrentPlayer: mockUseCurrentPlayer,
  useAllPlayers: mockUseAllPlayers,
}));

function makeState(): GameState {
  const config: GameConfig = { mapSize: { width: 10, height: 8 }, civChoices: [{ id: 'rome', isAI: false }], difficulty: 'prince', maxTurns: 300 };
  return createInitialState(42, config);
}

describe('VictoryProgressPanel', () => {
  it('renders victory progress info', () => {
    const state = makeState();
    const store = { state, selectedUnitId: null, selectedCityId: null, hoveredTile: null, message: '', eventLog: [], command: vi.fn(), endTurn: vi.fn(), selectUnit: vi.fn(), selectCity: vi.fn(), setHoveredTile: vi.fn(), newGame: vi.fn(), save: vi.fn(), load: vi.fn() };
    mockUseGame.mockImplementation((selector: any) => selector(store));
    mockUseCurrentPlayer.mockReturnValue(state.players[0]);
    mockUseAllPlayers.mockReturnValue(state.players);
    render(<VictoryProgressPanel />);
    expect(screen.getByText(/胜利进度/)).toBeInTheDocument();
    expect(screen.getByText(/科技胜利/)).toBeInTheDocument();
    expect(screen.getByText(/统治胜利/)).toBeInTheDocument();
  });
});