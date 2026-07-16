// 游戏结束横幅
import { useGame } from './store';

export function VictoryBanner() {
  const state = useGame((s) => s.state);

  if (state.status !== 'finished') return null;

  return (
    <div style={{ padding: 8, background: '#3a2a1e', color: '#fc8', textAlign: 'center' }}>
      游戏结束 - 胜者：{state.winner}（{state.victoryType}）
    </div>
  );
}
