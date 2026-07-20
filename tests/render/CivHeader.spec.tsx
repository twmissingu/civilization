// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CivHeader } from '../../src/render/CivHeader';
import { createInitialState } from '../../src/logic/state/createInitialState';
import type { GameConfig, GameState } from '../../src/logic/state/types';
import type { HexCoord } from '../../src/types';

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
  const config: GameConfig = { mapSize: { width: 16, height: 12 }, civChoices: [{ id: 'rome', isAI: false }], difficulty: 'prince', maxTurns: 300 };
  return createInitialState(42, config);
}

describe('CivHeader', () => {
  it('renders civ info', () => {
    const state = makeState();
    const store = { state, selectedUnitId: null as string | null, selectedCityId: null as string | null, hoveredTile: null as HexCoord | null, message: '', eventLog: [], command: vi.fn(), endTurn: vi.fn(), selectUnit: vi.fn(), selectCity: vi.fn(), setHoveredTile: vi.fn(), newGame: vi.fn(), save: vi.fn(), load: vi.fn() };
    mockUseGame.mockImplementation((selector: any) => selector(store));
    mockUseCurrentPlayer.mockReturnValue(state.players[0]);
    mockUseAllPlayers.mockReturnValue(state.players);
    render(<CivHeader />);
    expect(screen.getByText(/罗马/)).toBeInTheDocument();
  });
});