// 胜利进度面板：显示各胜利条件的当前进度
import { useGame, useCurrentPlayer, useAllPlayers } from './store';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

export function VictoryProgressPanel() {
  const turn = useGame((s) => s.state.turn);
  const maxTurns = useGame((s) => s.state.config.maxTurns);
  const player = useCurrentPlayer();
  const allPlayers = useAllPlayers();

  const spaceCity = player.cities.find((c) => c.spaceProject);
  const spaceStage = spaceCity?.spaceProject?.stage ?? 0;
  const spaceProgress = spaceCity?.spaceProject?.progress ?? 0;

  const otherCapitals = allPlayers.filter((p) => p.id !== player.id && p.capitalCityId !== null).length;
  const totalOthers = allPlayers.filter((p) => p.id !== player.id).length;

  const totalCulture = allPlayers
    .filter((p) => p.id !== player.id)
    .reduce((sum, p) => sum + p.totalCultureGenerated, 0);
  const tourismProgress = totalCulture > 0 ? Math.min(100, Math.round((player.totalTourism / (totalCulture * 0.5)) * 100)) : 0;

  const turnProgress = Math.round((turn / maxTurns) * 100);

  return (
    <div style={panelStyle}>
      <b>🏆 胜利进度</b>

      <div style={{ fontSize: 11, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.science }}>
          <span>🔬 科技胜利</span>
          <span>{spaceStage > 0 ? `阶段 ${spaceStage}/3 (${Math.floor(spaceProgress)}/${1500})` : '未开始'}</span>
        </div>
        {spaceStage > 0 && (
          <div style={{ height: 3, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 1 }}>
            <div style={{ height: 3, width: `${Math.min(100, (spaceProgress / 1500) * 100)}%`, background: theme.colors.science, borderRadius: theme.borderRadius }} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.production }}>
          <span>⚔ 统治胜利</span>
          <span>剩余首都 {otherCapitals}/{totalOthers}</span>
        </div>
        {totalOthers > 0 && (
          <div style={{ height: 3, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 1 }}>
            <div style={{ height: 3, width: `${((totalOthers - otherCapitals) / totalOthers) * 100}%`, background: theme.colors.production, borderRadius: theme.borderRadius }} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.culture }}>
          <span>🎭 文化胜利</span>
          <span>{tourismProgress}%</span>
        </div>
        {tourismProgress > 0 && (
          <div style={{ height: 3, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 1 }}>
            <div style={{ height: 3, width: `${tourismProgress}%`, background: theme.colors.culture, borderRadius: theme.borderRadius }} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 11, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.faith }}>
          <span>⛪ 宗教胜利</span>
          <span>{player.religionId ? '已创立' : '未创立'}</span>
        </div>
      </div>

      <div style={{ fontSize: 11, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: theme.colors.textMuted }}>
          <span>📊 分数胜利</span>
          <span>回合 {turn}/{maxTurns}</span>
        </div>
        <div style={{ height: 3, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 1 }}>
          <div style={{ height: 3, width: `${turnProgress}%`, background: theme.colors.textMuted, borderRadius: theme.borderRadius }} />
        </div>
      </div>
    </div>
  );
}