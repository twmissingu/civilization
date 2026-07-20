// 本回合待办面板：列出所有未行动单位、空闲城市、未选科技/市政/空政策槽等
import { theme } from './theme';
import { useGame } from './store';
import { UNITS, TECHS, CIVICS, POLICY_CARDS } from '../gamedata';
import { canPlayerSwitchPolicy } from '../logic/state/query';
import type { PlayerState } from '../logic/state/types';

interface TurnTodoPanelProps {
  player: PlayerState;
  onSelectUnit: (id: string) => void;
  onSelectCity: (id: string) => void;
  onOpenResearch: () => void;
  onOpenCivics: () => void;
}

export function TurnTodoPanel({ player, onSelectUnit, onSelectCity, onOpenResearch, onOpenCivics }: TurnTodoPanelProps) {
  const state = useGame((s) => s.state);
  const items: { id: string; label: string; kind: 'unit' | 'city' | 'tech' | 'civic' | 'policy'; onClick: () => void }[] = [];

  for (const u of player.units) {
    if (u.ownerId === player.id && u.moveLeft > 0 && !u.hasActed) {
      items.push({
        id: `unit-${u.id}`,
        label: `${UNITS[u.type]?.name ?? u.type} 待移动`,
        kind: 'unit',
        onClick: () => onSelectUnit(u.id),
      });
    }
  }

  for (const c of player.cities) {
    if (c.ownerId === player.id && c.queue.length === 0) {
      items.push({
        id: `city-${c.id}`,
        label: `${c.name} 生产空闲`,
        kind: 'city',
        onClick: () => onSelectCity(c.id),
      });
    }
  }

  if (!player.currentResearch) {
    const first = Object.values(TECHS).find((t) => !player.researchedTechs.includes(t.id));
    if (first) {
      items.push({
        id: 'tech-none',
        label: '未选择科技',
        kind: 'tech',
        onClick: onOpenResearch,
      });
    }
  }

  if (!player.currentCivic) {
    const first = Object.values(CIVICS).find((c) => !player.researchedCivics.includes(c.id));
    if (first) {
      items.push({
        id: 'civic-none',
        label: '未选择市政',
        kind: 'civic',
        onClick: onOpenCivics,
      });
    }
  }

  const emptySlotIndex = player.policySlots.findIndex((s) => s === null);
  const hasAssignablePolicy =
    emptySlotIndex !== -1 &&
    Object.values(POLICY_CARDS).some(
      (c) => player.researchedCivics.includes(c.unlockCivic) && canPlayerSwitchPolicy(state, c.id, emptySlotIndex)
    );
  if (hasAssignablePolicy) {
    items.push({
      id: 'policy-empty',
      label: '有未装备的政策卡',
      kind: 'policy',
      onClick: onOpenCivics,
    });
  }

  if (items.length === 0) return null;

  const kindEmoji: Record<string, string> = {
    unit: '⚔',
    city: '🏙',
    tech: '🔬',
    civic: '📜',
    policy: '⚖',
  };

  return (
    <div style={{
      marginBottom: theme.spacing.md,
      padding: theme.spacing.sm,
      background: theme.colors.bg,
      borderRadius: theme.borderRadius,
      border: `1px solid ${theme.colors.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <b>本回合待办</b>
        <span style={{ fontSize: 11, color: theme.colors.textDim }}>共 {items.length} 项</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((it) => (
          <button
            key={it.id}
            onClick={it.onClick}
            style={{
              textAlign: 'left',
              background: theme.colors.bgCard,
              border: 'none',
              color: theme.colors.text,
              padding: '4px 6px',
              borderRadius: theme.borderRadius,
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: theme.fontFamily,
            }}
          >
            <span style={{ marginRight: 4 }}>{kindEmoji[it.kind]}</span>
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
