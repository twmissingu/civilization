// 城邦信息面板（只读，Phase 2 系统入口）
import { useGame, useCurrentPlayer } from './store';
import { CITY_STATES } from '../gamedata';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

export function CityStatePanel() {
  const cityStates = useGame((s) => s.state.cityStates);
  const player = useCurrentPlayer();

  if (cityStates.length === 0) return null;

  return (
    <div style={panelStyle}>
      <b>🏛 城邦（使者 {player.storedEnvoys}）</b>
      {cityStates.filter((cs) => cs.isAlive).map((cs) => {
        const def = CITY_STATES[cs.id];
        const myEnvoys = cs.envoys[player.id] ?? 0;
        return (
          <div key={cs.id} style={{ fontSize: 11, marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>{def?.name ?? cs.id}</span>
            <span style={{ color: cs.suzerainId === player.id ? theme.colors.gold : theme.colors.textMuted }}>
              {cs.suzerainId === player.id ? '★ 宗主' : `${myEnvoys}使者`}
            </span>
          </div>
        );
      })}
    </div>
  );
}