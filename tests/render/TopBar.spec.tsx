// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { currentPlayer } from '../../src/logic/state/commands';
import { TopBar } from '../../src/render/TopBar';
import type { GameConfig } from '../../src/logic/state/types';

function makePlayer() {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }],
    difficulty: 'prince',
    maxTurns: 300,
  };
  const state = createInitialState(42, config);
  return currentPlayer(state);
}

describe('TopBar', () => {
  it('renders civ name and turn', () => {
    const player = makePlayer();
    render(
      <TopBar
        civName="Rome"
        turn={7}
        player={player}
        yieldTotal={{ food: 2, production: 3, gold: 5, science: 8, culture: 4, faith: 1 }}
        message=""
        onEndTurn={vi.fn()}
        onSave={vi.fn()}
        onLoad={vi.fn()}
        onNewGame={vi.fn()}
        onShowHelp={vi.fn()}
      />
    );
    expect(screen.getByText('Rome')).toBeInTheDocument();
    expect(screen.getByText(/第 7 回合/)).toBeInTheDocument();
  });
});