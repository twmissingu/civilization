// 文明头像与全局进度概览
import { useGame } from './store';
import { currentPlayer } from '../logic/state/commands';
import { computeEra } from '../logic/state/tech';
import { playerScore } from '../logic/state/victory';
import { CIVILIZATIONS } from '../gamedata';
import { portraitAssetUrl } from './assets';
import { theme } from './theme';

export function CivHeader() {
  const state = useGame((s) => s.state);
  const player = currentPlayer(state);
  const civ = CIVILIZATIONS[player.civId];
  const spaceCity = player.cities.find((c) => c.spaceProject);
  const spaceStage = spaceCity?.spaceProject?.stage;
  const playerScoreValue = playerScore(player);
  const rank = state.players.reduce((count, p) => (playerScore(p) > playerScoreValue ? count + 1 : count), 0) + 1;

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: theme.spacing.md }}>
      <img
        src={portraitAssetUrl(player.civId)}
        alt={civ?.name}
        style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.accent}` }}
      />
      <div>
        <div style={{ fontSize: 13, color: theme.colors.accent }}>{civ?.name ?? player.civId}</div>
        <div style={{ fontSize: 10, color: theme.colors.textDim }}>{civ?.ability.name}</div>
      </div>

      <div style={{ marginLeft: 'auto', fontSize: 11, color: theme.colors.textMuted, textAlign: 'right' }}>
        <div>时代：{computeEra(player.researchedTechs)} · 回合 {state.turn}/{state.config.maxTurns}</div>
        <div style={{ color: theme.colors.science }}>科技胜利：{spaceStage ? `阶段 ${spaceStage}` : '未开始'}</div>
        <div style={{ color: theme.colors.production }}>统治：剩余首都 {state.players.filter((p) => p.id !== player.id && p.capitalCityId).length}</div>
        <div style={{ color: '#fc8' }}>
          分数：{playerScoreValue} · 排名 {rank}/{state.players.length}
        </div>
      </div>
    </div>
  );
}
