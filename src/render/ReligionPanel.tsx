// 宗教信息面板（只读，Phase 2 系统入口）
import { useGame, useCurrentPlayer } from './store';
import { PANTHEONS } from '../gamedata';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

export function ReligionPanel() {
  const state = useGame((s) => s.state);
  const player = useCurrentPlayer();

  if (!player.pantheon && !player.religionId) return null;

  return (
    <div style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <b>⛪ 宗教</b>
        <span style={{ fontSize: 11, color: theme.colors.faith }}>信仰 {player.faith}</span>
      </div>
      {player.pantheon && (
        <div style={{ fontSize: 11, marginTop: 4 }}>
          万神殿：{PANTHEONS[player.pantheon]?.name ?? player.pantheon}
        </div>
      )}
      {player.religionId && (
        <div style={{ fontSize: 11, marginTop: 2 }}>
          宗教：{player.religionName ?? player.religionId}
          {player.holyCityId && (
            <span style={{ color: theme.colors.textMuted }}>
              ｜圣城：{state.players.flatMap((p) => p.cities).find((c) => c.id === player.holyCityId)?.name ?? '未知'}
            </span>
          )}
        </div>
      )}
      {player.faith >= 200 && !player.pantheon && (
        <div style={{ fontSize: 10, color: theme.colors.warning, marginTop: 4 }}>
          可创立万神殿
        </div>
      )}
      {player.faith >= 200 && player.pantheon && !player.religionId && (
        <div style={{ fontSize: 10, color: theme.colors.warning, marginTop: 4 }}>
          可创立宗教
        </div>
      )}
      <div style={{ fontSize: 11, marginTop: 4, color: theme.colors.textMuted }}>
        宗教单位：传教士({player.units.filter((u) => u.type === 'missionary').length}) ·
        使徒({player.units.filter((u) => u.type === 'apostle').length})
      </div>
    </div>
  );
}