// 游戏结束横幅
import { useGame } from './store';
import { CIVILIZATIONS } from '../gamedata';
import { AssetImage } from './AssetImage';
import { theme } from './theme';

const VICTORY_ICON: Record<string, string> = {
  science: '/assets/victory/science.png',
  domination: '/assets/victory/domination.png',
  score: '/assets/victory/score.png',
  religion: '/assets/victory/religion.png',
  culture: '/assets/victory/culture.png',
};

const VICTORY_LABEL: Record<string, string> = {
  science: '科技胜利',
  domination: '统治胜利',
  score: '分数胜利',
  religion: '宗教胜利',
  culture: '文化胜利',
};

export function VictoryBanner() {
  const state = useGame((s) => s.state);

  if (state.status !== 'finished') return null;

  const winner = state.players.find((p) => p.id === state.winner);
  const winnerCiv = winner ? CIVILIZATIONS[winner.civId] : null;
  const winnerName = winnerCiv?.name ?? state.winner;
  const vicType = state.victoryType ?? '';

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #3a2a1e, #5a3a2e)',
        color: theme.colors.warning,
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderBottom: '2px solid #c8a060',
        animation: 'victoryPulse 1.5s ease-in-out',
        fontSize: 15,
        fontWeight: 'bold',
      }}
    >
      {VICTORY_ICON[vicType] && <AssetImage src={VICTORY_ICON[vicType]} alt="" width={28} height={28} />}
      <span>🏆 游戏结束 — {VICTORY_LABEL[vicType] ?? vicType}！胜者：{winnerName}</span>
    </div>
  );
}
