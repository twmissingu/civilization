// 游戏状态 store（Zustand）+ 命令分发 + AI 驱动
// 分片订阅：每个 selector 只订阅需要的最小字段，避免整树重渲染
import { create } from 'zustand';
import type { GameState, GameConfig, GameEvent, PlayerState, UnitState, CityState } from '../logic/state/types';
import type { HexCoord } from '../types';
import type { GameCommand } from '../logic/state/commands';
import { applyCommand } from '../logic/state/commands';
import { createInitialState } from '../logic/state/createInitialState';
import { saveGame, loadGame } from './save';
import { runAIAsync } from './aiRunner';
import { formatEvent } from './eventLog';
import { updatePlayerVisibility } from '../logic/state/unitMove';
import { getPlayerYield } from '../logic/state/query';

function defaultConfig(): GameConfig {
  return {
    mapSize: { width: 24, height: 16 },
    civChoices: [
      { id: 'rome', isAI: false },
      { id: 'greece', isAI: true },
      { id: 'china', isAI: true },
    ],
    difficulty: 'prince',
    maxTurns: 300,
  };
}

interface GameStore {
  state: GameState;
  mapVersion: number;
  cameraOffset: { x: number; y: number } | null;
  selectedUnitId: string | null;
  gameConfig: GameConfig;
  selectedCityId: string | null;
  hoveredTile: HexCoord | null;
  cameraTarget: HexCoord | null;
  message: string;
  eventLog: GameEvent[];
  aiRunning: boolean;
  aiProgress: { current: number; total: number; playerName: string } | null;
  command: (cmd: GameCommand) => void;
  endTurn: () => void;
  selectUnit: (id: string | null) => void;
  selectCity: (id: string | null) => void;
  setHoveredTile: (c: HexCoord | null) => void;
  setCameraOffset: (offset: { x: number; y: number } | null) => void;
  newGame: (seed?: number, config?: GameConfig) => void;
  save: () => Promise<void>;
  load: () => Promise<void>;
}

export const useGame = create<GameStore>((set, get) => ({
  state: createInitialState(42, defaultConfig()),
  mapVersion: 0,
  cameraOffset: null,
  gameConfig: defaultConfig(),
  aiRunning: false,
  aiProgress: null,
  selectedUnitId: null,
  selectedCityId: null,
  hoveredTile: null,
  cameraTarget: null,
  message: '',
  eventLog: [],
  command: (cmd) => {
    const { state } = get();
    const { state: s2, events } = applyCommand(state, cmd);
    if (s2 === state) {
      set({ message: '无效操作' });
      return;
    }
    const lastEvent = events.length > 0 ? events[events.length - 1] : null;
    set({
      state: s2,
      mapVersion: get().mapVersion + 1,
      eventLog: events.slice(-6),
      message: lastEvent ? formatEvent(s2, lastEvent) : '',
    });
    if (s2.status === 'finished') set({ message: `胜利：${s2.victoryType}` });
  },
  endTurn: () => {
    const humanState = get().state;
    const { state: afterEndTurn, events: humanEvents } = applyCommand(humanState, { kind: 'endTurn' });
    // 异步执行 AI 回合
    set({ aiRunning: true, aiProgress: { current: 0, total: afterEndTurn.players.filter((p) => p.isAI).length, playerName: '' } });
    runAIAsync(
      afterEndTurn,
      (progress) => {
        set({ aiProgress: progress });
      },
      (result) => {
        const s = result.state;
        const allEvents = [...humanEvents, ...result.events];
        // 更新人类玩家视野
        updatePlayerVisibility(s, s.players[0].id);
        const lastEvent = allEvents.length > 0 ? allEvents[allEvents.length - 1] : null;
        set({
          state: s,
          mapVersion: get().mapVersion + 1,
          selectedUnitId: null,
          selectedCityId: null,
          cameraTarget: null,
          aiRunning: false,
          aiProgress: null,
          eventLog: allEvents.slice(-6),
          message: s.status === 'finished' ? `胜利：${s.victoryType}` : (lastEvent ? formatEvent(s, lastEvent) : `第 ${s.turn} 回合`),
        });
      }
    );
  },
  selectUnit: (id) => {
    const state = get().state;
    const unit = id ? state.players.flatMap((p) => p.units).find((u) => u.id === id) : null;
    set({ selectedUnitId: id, selectedCityId: null, cameraTarget: unit ? unit.tile : null });
  },
  selectCity: (id) => {
    const state = get().state;
    const city = id ? state.players.flatMap((p) => p.cities).find((c) => c.id === id) : null;
    set({ selectedCityId: id, selectedUnitId: null, cameraTarget: city ? city.tile : null });
  },
  setHoveredTile: (c) => set({ hoveredTile: c }),
  setCameraOffset: (offset) => set({ cameraOffset: offset }),
  newGame: (seed = Math.floor(Math.random() * 100000), config?: GameConfig) => {
    const cfg = config ?? defaultConfig();
    set({ state: createInitialState(seed, cfg), gameConfig: cfg, mapVersion: 0, selectedUnitId: null, selectedCityId: null, cameraTarget: null, eventLog: [], message: `新游戏 seed=${seed}` });
  },
  save: async () => {
    try {
      await saveGame(get().state);
      set({ message: '已保存' });
    } catch (_e) {
      set({ message: '保存失败' });
    }
  },
  load: async () => {
    try {
      const s = await loadGame();
      if (s) set({ state: s, mapVersion: 0, eventLog: [], message: '已读取' });
      else set({ message: '无存档' });
    } catch (_e) {
      set({ message: '读取失败' });
    }
  },
}));

// ---------- 分片 selector hooks（每个组件只订阅自己需要的数据）----------

/** 当前玩家（只读，从 state 派生） */
export function useCurrentPlayer(): PlayerState {
  return useGame((s) => s.state.players[s.state.currentPlayerIndex]);
}

/** 当前玩家 ID */
export function useCurrentPlayerId(): string {
  return useGame((s) => s.state.players[s.state.currentPlayerIndex]?.id ?? '');
}

/** 当前回合数 */
export function useTurn(): number {
  return useGame((s) => s.state.turn);
}

/** 游戏是否结束 */
export function useGameFinished(): { finished: boolean; winner: string | null; victoryType: string | null } {
  return useGame((s) => ({ finished: s.state.status === 'finished', winner: s.state.winner, victoryType: s.state.victoryType }));
}

/** 选中单位（如果存在） */
export function useSelectedUnit(): UnitState | null {
  return useGame((s) => {
    const id = s.selectedUnitId;
    if (!id) return null;
    for (const p of s.state.players) for (const u of p.units) if (u.id === id) return u;
    return null;
  });
}

/** 选中城市（如果存在） */
export function useSelectedCity(): CityState | null {
  return useGame((s) => {
    const id = s.selectedCityId;
    if (!id) return null;
    for (const p of s.state.players) for (const c of p.cities) if (c.id === id) return c;
    return null;
  });
}

/** 当前玩家单位列表 */
export function usePlayerUnits(): UnitState[] {
  return useGame((s) => s.state.players[s.state.currentPlayerIndex]?.units ?? []);
}

/** 当前玩家城市列表 */
export function usePlayerCities(): CityState[] {
  return useGame((s) => s.state.players[s.state.currentPlayerIndex]?.cities ?? []);
}

/** 当前玩家产出一览 */
export function usePlayerYield() {
  return useGame((s) => {
    const player = s.state.players[s.state.currentPlayerIndex];
    if (!player) return { gold: 0, science: 0, culture: 0, faith: 0, production: 0, food: 0 };
    const y = getPlayerYield(s.state, player.id);
    return { ...y, gold: player.gold, faith: player.faith };
  });
}

/** 当前玩家科技/市政状态 */
export function usePlayerResearch() {
  return useGame((s) => {
    const player = s.state.players[s.state.currentPlayerIndex];
    if (!player) return { currentResearch: null, currentCivic: null, researchedTechs: [] as string[], researchedCivics: [] as string[] };
    return { currentResearch: player.currentResearch, currentCivic: player.currentCivic, researchedTechs: player.researchedTechs, researchedCivics: player.researchedCivics };
  });
}

/** 所有玩家列表（用于外交/排名） */
export function useAllPlayers() {
  return useGame((s) => s.state.players);
}

/** 地图 tiles */
export function useMapTiles() {
  return useGame((s) => s.state.map.tiles);
}

/** 地图边界 */
export function useMapBounds() {
  return useGame((s) => s.state.map.bounds);
}