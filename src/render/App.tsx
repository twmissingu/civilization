// 主界面：资源条 + 地图 + 侧栏
// 分片订阅：不订阅整 state，只订阅需要的最小字段
import { useState, useRef, useCallback } from 'react';
import { useGame, usePlayerUnits, usePlayerCities } from './store';
import { PixiMap } from './PixiMap';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { VictoryBanner } from './VictoryBanner';
import { EventLogOverlay } from './EventLogOverlay';
import { HelpModal } from './HelpModal';
import { ConfirmDialogManager, type PendingConfirm } from './ConfirmDialogManager';
import { Minimap } from './Minimap';
import { AIProgressOverlay } from './AIProgressOverlay';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { formatEvent } from './eventLog';
import { theme } from './theme';
import './styles.css';

export function App() {
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const endTurn = useGame((s) => s.endTurn);
  const message = useGame((s) => s.message);
  const eventLog = useGame((s) => s.eventLog);
  const selectUnit = useGame((s) => s.selectUnit);
  const selectCity = useGame((s) => s.selectCity);
  // 分片订阅：只订阅当前玩家单位和城市列表，不订阅整 state
  const playerUnits = usePlayerUnits();
  const playerCities = usePlayerCities();
  const [showHelp, setShowHelp] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const researchRef = useRef<HTMLDivElement>(null);
  const civicRef = useRef<HTMLDivElement>(null);

  const cycleUnitOrCity = useCallback((direction: 1 | -1) => {
    const ownUnits = playerUnits.filter((u) => u.moveLeft > 0 && !u.hasActed);
    const ownCities = playerCities.filter((c) => c.queue.length === 0);
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
  }, [playerUnits, playerCities, selectedCityId, selectedUnitId, selectCity, selectUnit]);

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
          eventLog.length > 0 ? `最新事件：${formatEvent(useGame.getState().state, eventLog[eventLog.length - 1])}` : '',
        ].filter(Boolean).join('；')}
      </div>

      <TopBar onShowHelp={() => setShowHelp(true)} />

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
      <AIProgressOverlay />
    </div>
  );
}