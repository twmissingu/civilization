// 游戏结束横幅
import { useGame } from './store';
import { CIVILIZATIONS } from '../gamedata';
import { AssetImage } from './AssetImage';

const VICTORY_ICON: Record<string, string> = {
  science: '/assets/victory/science.png',
  domination: '/assets/victory/domination.png',
  score: '/assets/victory/score.png',
};

const VICTORY_LABEL: Record<string, string> = {
  science: '科技胜利',
  domination: '统治胜利',
  score: '分数胜利',
};

export function VictoryBanner() {
  const state = useGame((s) => s.state);

  if (state.status !== 'finished') return null;

  const winner = state.players.find((p) => p.id === state.winner);
  const winnerCiv = winner ? CIVILIZATIONS[winner.civId] : null;
  const winnerName = winnerCiv?.name ?? state.winner;
  const vicType = state.victoryType ?? '';

  return (
    <div style={{ padding: 8, background: '#3a2a1e', color: '#fc8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {VICTORY_ICON[vicType] && <AssetImage src={VICTORY_ICON[vicType]} alt="" width={24} height={24} />}
      <span>游戏结束 — {VICTORY_LABEL[vicType] ?? vicType}！胜者：{winnerName}</span>
    </div>
  );
}
