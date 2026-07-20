// 政体与政策卡面板
import { useGame } from './store';
import { currentPlayer } from '../logic/state/query';
import { canPlayerChangeGovernment, canPlayerSwitchPolicy } from '../logic/state/query';
import { GOVERNMENTS, POLICY_CARDS } from '../gamedata';
import { Tooltip } from './Tooltip';
import { AssetImage } from './AssetImage';
import { theme } from './theme';
import { btnStyle } from './uiStyles';
import type { PlayerState } from '../logic/state/types';

function firstEmptySlot(player: PlayerState, cardType: string): number | null {
  const gov = GOVERNMENTS[player.government];
  for (let i = 0; i < player.policySlots.length; i++) {
    if (player.policySlots[i] !== null) continue;
    const slotType =
      i < gov.militarySlots ? 'military' : i < gov.militarySlots + gov.economicSlots ? 'economic' : 'wildcard';
    if (slotType === 'wildcard' || slotType === cardType) return i;
  }
  return null;
}

function policySlotTypeLabel(player: PlayerState, slotIndex: number): string {
  const gov = GOVERNMENTS[player.government];
  if (slotIndex < gov.militarySlots) return '军事';
  if (slotIndex < gov.militarySlots + gov.economicSlots) return '经济';
  return '万能';
}

export function GovernmentPanel() {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const player = currentPlayer(state);

  return (
    <div style={{ marginBottom: theme.spacing.md }}>
      <b>政体</b>：{GOVERNMENTS[player.government]?.name}
      <div style={{ fontSize: 10, color: theme.colors.textMuted, marginBottom: 4 }}>
        {GOVERNMENTS[player.government]?.bonus && (
          <div style={{ color: theme.colors.accent, fontSize: 10, marginBottom: 2 }}>
            {GOVERNMENTS[player.government]?.bonus}
          </div>
        )}
        槽位：
        {player.policySlots.map((s, i) => (
          <span key={i} style={{ marginRight: 4 }}>
            [{policySlotTypeLabel(player, i)}]
            {s ? (
              <Tooltip content={`${POLICY_CARDS[s]?.name}: ${POLICY_CARDS[s]?.effect ?? ''}`}>
                <span style={{ color: theme.colors.accent, cursor: 'help' }}>{POLICY_CARDS[s]?.name ?? s}</span>
              </Tooltip>
            ) : (
              <span style={{ color: theme.colors.textDim }}>空</span>
            )}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 10, color: theme.colors.textDim }}>切换：</div>
      {Object.values(GOVERNMENTS)
        .filter((g) => canPlayerChangeGovernment(state, g.id) && g.id !== player.government)
        .slice(0, 5)
        .map((g) => (
          <button
            key={g.id}
            style={{ ...btnStyle, margin: 1, fontSize: 10, background: theme.colors.government }}
            onClick={() => command({ kind: 'changeGovernment', governmentType: g.id })}
          >
            {g.name}
          </button>
        ))}
      <div style={{ fontSize: 10, color: theme.colors.textDim, marginTop: 4 }}>政策卡（点选装入空槽）：</div>
      {Object.values(POLICY_CARDS)
        .filter((c) => player.researchedCivics.includes(c.unlockCivic) && c.type !== 'diplomatic')
        .slice(0, 8)
        .map((c) => {
          const slot = firstEmptySlot(player, c.type);
          const canAssign = slot !== null && canPlayerSwitchPolicy(state, c.id, slot);
          return (
            <button
              key={c.id}
              disabled={!canAssign}
              style={{
                ...btnStyle,
                margin: 1,
                fontSize: 10,
                background: canAssign ? theme.colors.primary : theme.colors.disabled,
                opacity: canAssign ? 1 : 0.5,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
              onClick={() => slot !== null && command({ kind: 'switchPolicy', cardId: c.id, slotIndex: slot })}
            >
              <AssetImage src={`/assets/policy/${c.id}.png`} alt="" width={14} height={14} />
              {c.name}
            </button>
          );
        })}
    </div>
  );
}
