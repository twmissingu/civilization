// 胜利结算画面：排名/耗时/关键统计
import { useGame, useCurrentPlayer, useAllPlayers } from './store';
import { getPlayerScore } from '../logic/state/query';
import { CIVILIZATIONS } from '../gamedata';
import { portraitAssetUrl } from './assets';
import { theme } from './theme';

export function VictoryScreen() {
  const state = useGame((s) => s.state);
  const player = useCurrentPlayer();
  const allPlayers = useAllPlayers();

  if (state.status !== 'finished') return null;

  const winner = allPlayers.find((p) => p.id === state.winner);
  const isPlayerWinner = state.winner === player.id;
  const sorted = [...allPlayers].sort((a, b) => getPlayerScore(state, b.id) - getPlayerScore(state, a.id));

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: theme.fontFamily,
    }}>
      <div style={{
        background: theme.colors.bgPanel, padding: 32, borderRadius: theme.borderRadius,
        maxWidth: 500, width: '90%', maxHeight: '85vh', overflowY: 'auto',
        border: `2px solid ${theme.colors.accent}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, color: isPlayerWinner ? theme.colors.gold : theme.colors.text, marginBottom: 8 }}>
          {isPlayerWinner ? '🏆 胜利！' : '😞 败北'}
        </div>
        <div style={{ fontSize: 14, color: theme.colors.textMuted, marginBottom: 20 }}>
          第 {state.turn} 回合 · {state.victoryType === 'science' ? '科技胜利' : state.victoryType === 'domination' ? '统治胜利' : state.victoryType === 'culture' ? '文化胜利' : state.victoryType === 'religion' ? '宗教胜利' : '分数胜利'}
        </div>

        {winner && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            <img src={portraitAssetUrl(winner.civId)} alt="" width={40} height={50} style={{ borderRadius: 4, objectFit: 'cover' }} />
            <div>
              <div style={{ fontSize: 16, color: theme.colors.accent }}>{CIVILIZATIONS[winner.civId]?.name} 文明</div>
              <div style={{ fontSize: 12, color: theme.colors.textDim }}>得分 {getPlayerScore(state, winner.id)}</div>
            </div>
          </div>
        )}

        <div style={{ fontSize: 14, color: theme.colors.text, marginBottom: 8 }}>排名</div>
        {sorted.map((p, i) => {
          const civ = CIVILIZATIONS[p.civId];
          const score = getPlayerScore(state, p.id);
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
              background: p.id === player.id ? '#2a3a2a' : 'transparent',
              borderRadius: theme.borderRadius, marginBottom: 4,
            }}>
              <span style={{ width: 20, fontSize: 12, color: theme.colors.textMuted }}>#{i + 1}</span>
              <img src={portraitAssetUrl(p.civId)} alt="" width={24} height={30} style={{ borderRadius: 2, objectFit: 'cover' }} />
              <span style={{ flex: 1, fontSize: 12, color: theme.colors.text }}>{civ?.name ?? p.civId}</span>
              <span style={{ fontSize: 11, color: theme.colors.science }}>{score} 分</span>
              <span style={{ fontSize: 10, color: theme.colors.textDim }}>{p.cities.length} 城</span>
            </div>
          );
        })}

        <div style={{ marginTop: 20, fontSize: 11, color: theme.colors.textDim, textAlign: 'left' }}>
          <div>总回合数：{state.turn}</div>
          <div>地图尺寸：{state.config.mapSize.width}×{state.config.mapSize.height}</div>
          <div>难度：{state.config.difficulty}</div>
        </div>
      </div>
    </div>
  );
}