// 全局键盘快捷键
import { useEffect } from 'react';

interface UseKeyboardShortcutsOptions {
  endTurn: () => void;
  cycleUnitOrCity: (direction: 1 | -1) => void;
  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  showHelp: boolean;
  setShowHelp: (v: boolean) => void;
}

export function useKeyboardShortcuts({
  endTurn,
  cycleUnitOrCity,
  selectUnit,
  selectCity,
  showHelp,
  setShowHelp,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showHelp) {
        if (e.key === 'Escape') setShowHelp(false);
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        endTurn();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        cycleUnitOrCity(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        selectUnit(null);
        selectCity(null);
      } else if (e.key === '?' || e.key === '？') {
        setShowHelp(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [endTurn, cycleUnitOrCity, selectUnit, selectCity, showHelp, setShowHelp]);
}
