// 共享测试夹具：场景测试的 makeState 与 foundCityP0
import { createInitialState } from '../../src/logic/state/createInitialState';
import { applyCommand } from '../../src/logic/state/commands';
import type { GameState, GameConfig, CityState } from '../../src/logic/state/types';

const DEFAULT_CONFIG: GameConfig = {
  mapSize: { width: 16, height: 12 },
  civChoices: [{ id: 'rome', isAI: false }, { id: 'greece', isAI: true }],
  difficulty: 'prince',
  maxTurns: 300,
};

/** 标准 GameState 工厂，默认 16×12 / rome+greece / prince / 300 回合 */
export function makeState(seed = 7, overrides?: Partial<GameConfig>): GameState {
  const config: GameConfig = { ...DEFAULT_CONFIG, ...overrides as unknown as GameConfig };
  return createInitialState(seed, config);
}

/** 找到玩家 0 的第一个开拓者，以 'Roma' 之名建城，返回新 state 与城市 */
export function foundCityP0(state: GameState): { state: GameState; city: CityState } {
  const settler = state.players[0].units.find((u) => u.type === 'settler');
  if (!settler) throw new Error('No settler found for player 0');
  const { state: s2 } = applyCommand(state, { kind: 'foundCity', unitId: settler.id, name: 'Roma' });
  return { state: s2, city: s2.players[0].cities[0] };
}