// 外交面板
import { useGame } from './store';
import { currentPlayer } from '../logic/state/commands';
import { CIVILIZATIONS } from '../gamedata';
import { playerScore } from '../logic/state/victory';
import { portraitAssetUrl } from './assets';
import { theme } from './theme';
import { panelStyle, btnStyle } from './uiStyles';

interface DiplomacyPanelProps {
  onRequestWar: (targetCivId: string) => void;
}

export function DiplomacyPanel({ onRequestWar }: DiplomacyPanelProps) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const player = currentPlayer(state);

  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      <b>外交</b>
      {state.players
        .filter((p) => p.id !== player.id)
        .map((opponent) => {
          const oppCiv = CIVILIZATIONS[opponent.civId];
          const atWar = state.diplomacy[player.id]?.[opponent.id] === 'war';
          return (
            <div key={opponent.id} style={{ ...panelStyle, background: atWar ? '#3a1a1a' : '#1a2a1e', padding: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img
                  src={portraitAssetUrl(opponent.civId)}
                  alt={oppCiv?.name}
                  width={28}
                  height={36}
                  style={{ borderRadius: 3, border: `1px solid ${theme.colors.accent}`, objectFit: 'cover' }}
                />
                <div>
                  <div>{oppCiv?.name} {atWar ? '战争' : '和平'}</div>
                  <div style={{ fontSize: 10, color: theme.colors.textDim }}>
                    分数 {playerScore(opponent)} · 城 {opponent.cities.length} · 单位 {opponent.units.length}
                  </div>
                </div>
              </div>
              {atWar ? (
                <button
                  style={{ ...btnStyle, marginTop: 4, fontSize: 10, background: theme.colors.primary }}
                  onClick={() => command({ kind: 'suePeace', targetCivId: opponent.id })}
                >
                  求和
                </button>
              ) : (
                <button
                  style={{ ...btnStyle, marginTop: 4, fontSize: 10, background: theme.colors.danger }}
                  onClick={() => onRequestWar(opponent.id)}
                >
                  宣战
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
}
