// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useGame } from '../../src/render/store';
import { CivHeader } from '../../src/render/CivHeader';
import { createInitialState } from '../../src/logic/state/createInitialState';
import type { GameConfig, GameState } from '../../src/logic/state/types';
import type { HexCoord } from '../../src/types';

vi.mock('../../src/render/store', () => ({ useGame: vi.fn() }));
const mockedUseGame = vi.mocked(useGame);

function makeState(): GameState {
  const config: GameConfig = { mapSize: { width: 16, height: 12 }, civChoices: [{ id: 'rome', isAI: false }], difficulty: 'prince', maxTurns: 300 };
  return createInitialState(42, config);
}

describe('CivHeader', () => {
  it('renders civ info', () => {
    const state = makeState();
    const store = { state, selectedUnitId: null as string | null, selectedCityId: null as string | null, hoveredTile: null as HexCoord | null, message: '', eventLog: [], command: vi.fn(), endTurn: vi.fn(), selectUnit: vi.fn(), selectCity: vi.fn(), setHoveredTile: vi.fn(), newGame: vi.fn(), save: vi.fn(), load: vi.fn() };
    mockedUseGame.mockImplementation((selector: any) => selector(store));
    render(<CivHeader />);
    expect(screen.getByText(/罗马/)).toBeInTheDocument();
  });
});