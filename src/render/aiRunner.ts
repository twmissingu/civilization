// AI 回合异步执行器：分片执行 AI 回合，避免阻塞主线程
// 使用 requestAnimationFrame 分片，每片执行少量 AI 决策
import type { GameState, GameEvent } from '../logic/state/types';
import { runAIUntilHuman } from '../logic/ai';

export type AIProgressCallback = (info: { current: number; total: number; playerName: string }) => void;
export type AICompleteCallback = (result: { state: GameState; events: GameEvent[] }) => void;

interface AIChunk {
  state: GameState;
  events: GameEvent[];
  guard: number;
  maxSteps: number;
}

/**
 * 异步执行 AI 回合：分片执行，每片 yield 给浏览器
 * @param state 当前游戏状态（endTurn 后）
 * @param onProgress 进度回调
 * @param onComplete 完成回调
 */
export function runAIAsync(
  state: GameState,
  onProgress: AIProgressCallback,
  onComplete: AICompleteCallback
): void {
  const totalAI = state.players.filter((p) => p.isAI).length;

  const chunk: AIChunk = {
    state,
    events: [],
    guard: 0,
    maxSteps: totalAI * 10,
  };

  function step() {
    const result = runAIUntilHuman(chunk.state);
    chunk.state = result.state;
    chunk.events = chunk.events.concat(result.events);

    // 检查是否还有 AI 需要执行
    const currentPlayer = chunk.state.players[chunk.state.currentPlayerIndex];
    const aiDone = !currentPlayer || !currentPlayer.isAI || chunk.state.status === 'finished';

    if (aiDone) {
      onComplete({ state: chunk.state, events: chunk.events });
      return;
    }

    // 报告进度
    const aiIndex = chunk.state.players.findIndex((p) => p.id === currentPlayer.id);
    onProgress({
      current: aiIndex + 1,
      total: totalAI,
      playerName: currentPlayer.civId,
    });

    // 下一片
    chunk.guard++;
    if (chunk.guard > chunk.maxSteps) {
      onComplete({ state: chunk.state, events: chunk.events });
      return;
    }
    requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}