// 主界面：资源条 + 地图 + 侧栏
import { useState, useRef, useCallback } from 'react';
import { useGame } from './store';
import { PixiMap } from './PixiMap';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { VictoryBanner } from './VictoryBanner';
import { EventLogOverlay } from './EventLogOverlay';
import { HelpModal } from './HelpModal';
import { ConfirmDialogManager, type PendingConfirm } from './ConfirmDialogManager';
import { Minimap } from './Minimap';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { currentPlayer } from '../logic/state/commands';
import { playerYield } from '../logic/state/yield';
import { CIVILIZATIONS } from '../gamedata';
import { formatEvent } from './eventLog';
import { theme } from './theme';
import './styles.css';
import type { PlayerState } from '../logic/state/types';

function computeTodoCount(player: PlayerState): number {
  let count = 0;
  for (const u of player.units) if (u.moveLeft > 0 && !u.hasActed) count++;
  for (const c of player.cities) if (c.queue.length === 0) count++;
  return count;
}

export function App() {
  const {
    state,
    selectedUnitId,
    selectedCityId,
    endTurn,
    newGame,
    save,
    load,
    message,
    eventLog,
    selectUnit,
    selectCity,
  } = useGame();
  const [showHelp, setShowHelp] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const researchRef = useRef<HTMLDivElement>(null);
  const civicRef = useRef<HTMLDivElement>(null);

  const player = currentPlayer(state);
  const y = playerYield(state, player);
  const civ = CIVILIZATIONS[player.civId];
  const todoCount = computeTodoCount(player);

  const cycleUnitOrCity = useCallback((direction: 1 | -1) => {
    const ownUnits = player.units.filter((u) => u.moveLeft > 0 && !u.hasActed);
    const ownCities = player.cities.filter((c) => c.queue.length === 0);
    const targets: { kind: 'unit' | 'city'; id: string }[] = [
      ...ownUnits.map((u) => ({ kind: 'unit' as const, id: u.id })),
      ...ownCities.map((c) => ({ kind: 'city' as const, id: c.id })),
    ];
    if (targets.length === 0) return;
    const currentId = selectedUnitId ?? selectedCityId ?? null;
    let idx = targets.findIndex((t) => t.id === currentId);
    if (idx === -1) idx = direction === 1 ? 0 : targets.length - 1;
    else idx = (idx + direction + targets.length) % targets.length;
    const target = targets[idx];
    if (target.kind === 'unit') selectUnit(target.id);
    else selectCity(target.id);
  }, [player.cities, player.units, selectedCityId, selectedUnitId, selectCity, selectUnit]);

  useKeyboardShortcuts({
    endTurn,
    cycleUnitOrCity,
    selectUnit,
    selectCity,
    showHelp,
    setShowHelp,
  });

  return (
    <div
      style={{
        fontFamily: theme.fontFamily,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: theme.colors.bg,
        color: theme.colors.text,
        position: 'relative',
      }}
    >
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {[
          message,
          eventLog.length > 0 ? `最新事件：${formatEvent(state, eventLog[eventLog.length - 1])}` : '',
          todoCount > 0 ? `${todoCount} 项待办` : '',
        ].filter(Boolean).join('；')}
      </div>

      <TopBar
        civName={civ?.name ?? player.civId}
        turn={state.turn}
        player={player}
        yieldTotal={y}
        message={message}
        onEndTurn={endTurn}
        onSave={save}
        onLoad={load}
        onNewGame={newGame}
        onShowHelp={() => setShowHelp(true)}
        todoCount={todoCount}
      />

      <VictoryBanner />
      <EventLogOverlay />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', padding: 0, position: 'relative' }}>
          <PixiMap
            onRequestAttack={(targetTile) => {
              if (selectedUnitId) {
                setPendingConfirm({ type: 'attack', attackerId: selectedUnitId, targetTile });
              }
            }}
          />
          <Minimap />
        </div>
        <Sidebar
          researchRef={researchRef}
          civicRef={civicRef}
          onRequestWar={(targetCivId) => setPendingConfirm({ type: 'war', targetCivId })}
          onRequestFoundCity={(unitId, name) => setPendingConfirm({ type: 'foundCity', unitId, name })}
        />
      </div>

      <ConfirmDialogManager pendingConfirm={pendingConfirm} onClose={() => setPendingConfirm(null)} />
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
