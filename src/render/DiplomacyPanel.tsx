// 外交面板（增强版）
import { useState } from 'react';
import { useGame, useCurrentPlayer, useAllPlayers } from './store';
import { CIVILIZATIONS } from '../gamedata';
import { getPlayerScore } from '../logic/state/query';
import { portraitAssetUrl } from './assets';
import { theme } from './theme';
import { panelStyle, btnStyle } from './uiStyles';
import type { GameState } from '../logic/state/types';

interface DiplomacyPanelProps {
  onRequestWar: (targetCivId: string) => void;
}

export function DiplomacyPanel({ onRequestWar }: DiplomacyPanelProps) {
  const [tradeGold, setTradeGold] = useState<Record<string, number>>({});
  const players = useAllPlayers();
  const diplomacy = useGame((s) => s.state.diplomacy);
  const state = { players, diplomacy } as unknown as GameState;
  const command = useGame((s) => s.command);
  const player = useCurrentPlayer();
  const playerScoreVal = getPlayerScore(state, player.id);

  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      <b>外交</b>
      {players
        .filter((p) => p.id !== player.id)
        .map((opponent) => {
          const oppCiv = CIVILIZATIONS[opponent.civId];
          const atWar = diplomacy[player.id]?.[opponent.id] === 'war';
          const oppScore = getPlayerScore(state, opponent.id);
          const scoreDiff = playerScoreVal - oppScore;

          return (
            <div key={opponent.id} style={{ ...panelStyle, background: atWar ? '#3a1a1a' : '#1a2a1e', padding: 6, marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img
                  src={portraitAssetUrl(opponent.civId)}
                  alt={oppCiv?.name}
                  width={28}
                  height={36}
                  style={{ borderRadius: 3, border: `1px solid ${theme.colors.accent}`, objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{oppCiv?.name}</span>
                    <span style={{ fontSize: 10, color: atWar ? theme.colors.danger : theme.colors.textMuted }}>
                      {atWar ? '⚔ 战争' : '☮ 和平'}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: theme.colors.textDim }}>
                    分数 {oppScore} · 城 {opponent.cities.length} · 单位 {opponent.units.length}
                    {scoreDiff > 0 && <span style={{ color: theme.colors.gold, marginLeft: 4 }}>领 +{scoreDiff}</span>}
                    {scoreDiff < 0 && <span style={{ color: theme.colors.danger, marginLeft: 4 }}>落后 {Math.abs(scoreDiff)}</span>}
                  </div>
                  <div style={{ fontSize: 10, color: theme.colors.textDim }}>
                    科技 {opponent.researchedTechs.length} · 市政 {opponent.researchedCivics.length}
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
                <div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    <button
                      style={{ ...btnStyle, fontSize: 10, background: theme.colors.danger, flex: 1 }}
                      onClick={() => onRequestWar(opponent.id)}
                    >
                      宣战
                    </button>
                    <button
                      style={{ ...btnStyle, fontSize: 10, background: theme.colors.gold, flex: 1 }}
                      onClick={() => {
                        const amount = tradeGold[opponent.id] ?? 0;
                        if (amount > 0 && player.gold >= amount) {
                          command({ kind: 'offerTrade', targetCivId: opponent.id, offerGold: amount, demandGold: 0 });
                        }
                      }}
                    >
                      赠金
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 2, alignItems: 'center' }}>
                    <input
                      type="number"
                      min={0}
                      max={player.gold}
                      value={tradeGold[opponent.id] ?? 0}
                      onChange={(e) => setTradeGold({ ...tradeGold, [opponent.id]: Math.max(0, Math.min(player.gold, parseInt(e.target.value) || 0)) })}
                      style={{ width: 60, padding: '2px 4px', fontSize: 10, borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.border}`, background: theme.colors.bg, color: theme.colors.text }}
                      placeholder="金额"
                    />
                    <span style={{ fontSize: 10, color: theme.colors.textDim }}>金 {player.gold}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}