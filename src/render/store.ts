// 游戏状态 store（Zustand）+ 命令分发 + AI 驱动
import { create } from 'zustand';
import type { GameState, GameConfig, GameEvent } from '../logic/state/types';
import type { HexCoord } from '../types';
import type { GameCommand } from '../logic/state/commands';
import { applyCommand } from '../logic/state/commands';
import { createInitialState } from '../logic/state/createInitialState';
import { runAIUntilHuman } from '../logic/ai';
import { saveGame, loadGame } from './save';
import { formatEvent } from './eventLog';

function defaultConfig(): GameConfig {
  return {
    mapSize: { width: 24, height: 16 },
    civChoices: [
      { id: 'rome', isAI: false },
      { id: 'greece', isAI: true },
      { id: 'china', isAI: true },
    ],
    difficulty: 'standard',
    maxTurns: 300,
  };
}

interface GameStore {
  state: GameState;
  selectedUnitId: string | null;
  selectedCityId: string | null;
  hoveredTile: HexCoord | null;
  message: string;
  eventLog: GameEvent[];
  command: (cmd: GameCommand) => void;
  endTurn: () => void;
  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  setHoveredTile: (c: HexCoord | null) => void;
  newGame: (seed?: number) => void;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

export const useGame = create<GameStore>((set, get) => ({
  state: createInitialState(42, defaultConfig()),
  selectedUnitId: null,
  selectedCityId: null,
  hoveredTile: null,
  message: '',
  eventLog: [],
  command: (cmd) => {
    const { state } = get();
    const { state: s2, events } = applyCommand(state, cmd);
    if (s2 === state) {
      set({ message: '无效操作' });
      return;
    }
    set({
      state: s2,
      eventLog: s2.log.slice(-6),
      message: events.length > 0 ? formatEvent(s2, events[events.length - 1]) : '',
    });
    if (s2.status === 'finished') set({ message: `胜利：${s2.victoryType}` });
  },
  endTurn: () => {
    let s = applyCommand(get().state, { kind: 'endTurn' }).state;
    s = runAIUntilHuman(s);
    const lastEvent = s.log.length > 0 ? s.log[s.log.length - 1] : null;
    set({
      state: s,
      selectedUnitId: null,
      selectedCityId: null,
      eventLog: s.log.slice(-6),
      message: s.status === 'finished' ? `胜利：${s.victoryType}` : (lastEvent ? formatEvent(s, lastEvent) : `第 ${s.turn} 回合`),
    });
  },
  selectUnit: (id) => set({ selectedUnitId: id, selectedCityId: null }),
  selectCity: (id) => set({ selectedCityId: id, selectedUnitId: null }),
  setHoveredTile: (c) => set({ hoveredTile: c }),
  newGame: (seed = Math.floor(Math.random() * 100000)) => {
    set({ state: createInitialState(seed, defaultConfig()), selectedUnitId: null, selectedCityId: null, eventLog: [], message: `新游戏 seed=${seed}` });
  },
  save: async () => {
    try {
      await saveGame(get().state);
      set({ message: '已保存' });
    } catch (e) {
      set({ message: '保存失败' });
    }
  },
  load: async () => {
    try {
      const s = await loadGame();
      if (s) set({ state: s, eventLog: s.log.slice(-6), message: '已读取' });
      else set({ message: '无存档' });
    } catch (e) {
      set({ message: '读取失败' });
    }
  },
}));
