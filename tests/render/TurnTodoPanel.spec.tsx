// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, within } from '@testing-library/react';
import { createInitialState } from '../../src/logic/state/createInitialState';
import { currentPlayer } from '../../src/logic/state/commands';
import { TurnTodoPanel } from '../../src/render/TurnTodoPanel';
import type { GameConfig } from '../../src/logic/state/types';

function makePlayer() {
  const config: GameConfig = {
    mapSize: { width: 16, height: 12 },
    civChoices: [{ id: 'rome', isAI: false }],
    difficulty: 'standard',
    maxTurns: 300,
  };
  const state = createInitialState(42, config);
  return currentPlayer(state);
}

/** Fill all policy slots to suppress the "有未装备的政策卡" todo */
function fillPolicySlots(player: ReturnType<typeof makePlayer>) {
  for (let i = 0; i < player.policySlots.length; i++) {
    player.policySlots[i] = 'placeholder';
  }
}

describe('TurnTodoPanel', () => {
  it('无待办时不渲染', () => {
    const player = makePlayer();
    player.units[0].moveLeft = 0;
    player.units[0].hasActed = true;
    player.units[1].moveLeft = 0;
    player.units[1].hasActed = true;
    player.currentResearch = { techId: 'pottery', progress: 0 };
    player.currentCivic = { civicId: 'code_of_laws', progress: 0 };
    fillPolicySlots(player);
    const { container } = render(
      <TurnTodoPanel player={player} onSelectUnit={vi.fn()} onSelectCity={vi.fn()} onOpenResearch={vi.fn()} onOpenCivics={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('渲染单位与城市待办并触发回调', () => {
    const player = makePlayer();
    player.units[0].moveLeft = 2;
    player.units[0].hasActed = false;
    player.cities.push({
      id: 'city-0',
      ownerId: player.id,
      name: 'Roma',
      tile: { q: 1, r: 1 },
      territory: [{ q: 1, r: 1 }],
      workedTiles: [{ q: 1, r: 1 }],
      population: 1,
      food: 0,
      culture: 0,
      housing: 2,
      amenities: 1,
      buildings: [],
      districts: [],
      wonders: [],
      queue: [],
      hp: 200,
      wallsHp: 0,
      wallsMax: 0,
      isCapital: true,
      rangedStrikeUsed: false,
    });
    const onSelectUnit = vi.fn();
    const onSelectCity = vi.fn();
    const { container } = render(
      <TurnTodoPanel player={player} onSelectUnit={onSelectUnit} onSelectCity={onSelectCity} onOpenResearch={vi.fn()} onOpenCivics={vi.fn()} />
    );
    const panel = container.firstChild! as HTMLElement;
    fireEvent.click(within(panel).getAllByText(/待移动/)[0]);
    expect(onSelectUnit).toHaveBeenCalledWith(player.units[0].id);
    fireEvent.click(within(panel).getByText(/生产空闲/));
    expect(onSelectCity).toHaveBeenCalledWith('city-0');
  });

  it('未选科技/市政时显示提示', () => {
    const player = makePlayer();
    player.units[0].moveLeft = 0;
    player.units[0].hasActed = true;
    player.units[1].moveLeft = 0;
    player.units[1].hasActed = true;
    player.currentResearch = null;
    player.currentCivic = null;
    const onOpenResearch = vi.fn();
    const onOpenCivics = vi.fn();
    const { container } = render(
      <TurnTodoPanel player={player} onSelectUnit={vi.fn()} onSelectCity={vi.fn()} onOpenResearch={onOpenResearch} onOpenCivics={onOpenCivics} />
    );
    const panel = container.firstChild! as HTMLElement;
    fireEvent.click(within(panel).getByText('未选择科技'));
    expect(onOpenResearch).toHaveBeenCalled();
    fireEvent.click(within(panel).getByText('未选择市政'));
    expect(onOpenCivics).toHaveBeenCalled();
  });
});
