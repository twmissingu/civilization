// 游戏状态 store（Zustand）+ 命令分发 + AI 驱动
import { create } from 'zustand';
import type { GameState, GameConfig } from '../logic/state/types';
import type { GameCommand } from '../logic/state/commands';
import { applyCommand } from '../logic/state/commands';
import { createInitialState } from '../logic/state/createInitialState';
import { runAIUntilHuman } from '../logic/ai';
import { saveGame, loadGame } from './save';

function defaultConfig(): GameConfig {
  return {
    mapSize: { width: 24, height: 16 },
    civChoices: [
      { id: 'rome', isAI: false },
      { id: 'greece', isAI: true },
    ],
    difficulty: 'standard',
    maxTurns: 300,
  };
}

interface GameStore {
  state: GameState;
  selectedUnitId: string | null;
  selectedCityId: string | null;
  message: string;
  command: (cmd: GameCommand) => void;
  endTurn: () => void;
  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  newGame: (seed?: number) => void;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

export const useGame = create<GameStore>((set, get) => ({
  state: createInitialState(42, defaultConfig()),
  selectedUnitId: null,
  selectedCityId: null,
  message: '',
  command: (cmd) => {
    const { state } = get();
    const { state: s2, events } = applyCommand(state, cmd);
    if (s2 === state) {
      set({ message: '无效操作' });
      return;
    }
    set({ state: s2, message: events.length > 0 ? events[events.length - 1].kind : '' });
    if (s2.status === 'finished') set({ message: `胜利：${s2.victoryType}` });
  },
  endTurn: () => {
    let s = applyCommand(get().state, { kind: 'endTurn' }).state;
    s = runAIUntilHuman(s);
    set({ state: s, selectedUnitId: null, selectedCityId: null, message: s.status === 'finished' ? `胜利：${s.victoryType}` : `第 ${s.turn} 回合` });
  },
  selectUnit: (id) => set({ selectedUnitId: id, selectedCityId: null }),
  selectCity: (id) => set({ selectedCityId: id, selectedUnitId: null }),
  newGame: (seed = Math.floor(Math.random() * 100000)) => {
    set({ state: createInitialState(seed, defaultConfig()), selectedUnitId: null, selectedCityId: null, message: `新游戏 seed=${seed}` });
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
      if (s) set({ state: s, message: '已读取' });
      else set({ message: '无存档' });
    } catch (e) {
      set({ message: '读取失败' });
    }
  },
}));
