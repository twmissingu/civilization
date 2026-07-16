// 市政面板
import { forwardRef } from 'react';
import { useGame } from './store';
import { currentPlayer } from '../logic/state/commands';
import { canResearchCivic } from '../logic/state/civic';
import { CIVICS } from '../gamedata';
import { CivicTooltip } from './Tooltip';
import { ExpandableList } from './ExpandableList';
import { AssetImage } from './AssetImage';
import { theme } from './theme';
import { itemStyle } from './uiStyles';
import { formatTurns, turnsToCompleteCivic } from './eta';

export const CivicsPanel = forwardRef<HTMLDivElement>(function CivicsPanel(_, ref) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const player = currentPlayer(state);
  const current = player.currentCivic;
  const availableCivics = Object.values(CIVICS).filter((c) => canResearchCivic(player, c.id));

  const civicProgress = current
    ? `${current.progress}/${CIVICS[current.civicId]?.cost} · ${formatTurns(
        turnsToCompleteCivic(state, player, current.civicId, current.progress)
      )}`
    : '空闲';

  return (
    <div ref={ref} style={{ marginBottom: theme.spacing.md }}>
      <b>市政</b>：{current ? `${CIVICS[current.civicId]?.name} (${civicProgress})` : '无'}
      {current && (
        <div style={{ height: 4, background: '#333', borderRadius: theme.borderRadius, marginTop: 4 }}>
          <div
            style={{
              height: 4,
              width: `${Math.min(100, Math.round((current.progress / CIVICS[current.civicId].cost) * 100))}%`,
              background: theme.colors.culture,
              borderRadius: theme.borderRadius,
            }}
          />
        </div>
      )}
      <div style={{ marginTop: 4 }}>
        <ExpandableList
          items={availableCivics}
          maxInitial={6}
          renderItem={(c) => (
            <CivicTooltip key={c.id} civic={c} turnsLeft={turnsToCompleteCivic(state, player, c.id, 0)}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`研究市政 ${c.name}`}
                style={{ ...itemStyle, color: theme.colors.culture, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => command({ kind: 'researchCivic', civicId: c.id })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') command({ kind: 'researchCivic', civicId: c.id }); }}
              >
                <AssetImage src={`/assets/civic/${c.id}.png`} alt="" width={18} height={18} />
                • {c.name} ({c.cost})
              </div>
            </CivicTooltip>
          )}
        />
      </div>
    </div>
  );
});
