// 研究面板
import { forwardRef } from 'react';
import { useGame } from './store';
import { currentPlayer } from '../logic/state/query';
import { canPlayerResearch } from '../logic/state/query';
import { TECHS, techCost } from '../gamedata';
import { TechTooltip } from './Tooltip';
import { ExpandableList } from './ExpandableList';
import { AssetImage } from './AssetImage';
import { theme } from './theme';
import { itemStyle } from './uiStyles';
import { formatTurns, turnsToCompleteTech } from './eta';

export const ResearchPanel = forwardRef<HTMLDivElement>(function ResearchPanel(_, ref) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const player = currentPlayer(state);
  const current = player.currentResearch;
  const availableTechs = Object.values(TECHS).filter((t) => canPlayerResearch(state, t.id));

  const researchProgress = current
    ? `${current.progress}/${techCost(TECHS[current.techId], player.researchedTechs.length)} · ${formatTurns(
        turnsToCompleteTech(state, player, current.techId, current.progress)
      )}`
    : '空闲';

  return (
    <div ref={ref} style={{ marginBottom: theme.spacing.md }}>
      <b>研究</b>：{current ? TECHS[current.techId]?.name : '无'} ({researchProgress})
      {current && (
        <div style={{ height: 4, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 4 }}>
          <div
            style={{
              height: 4,
              width: `${Math.min(
                100,
                Math.round((current.progress / techCost(TECHS[current.techId], player.researchedTechs.length)) * 100)
              )}%`,
              background: theme.colors.science,
              borderRadius: theme.borderRadius,
            }}
          />
        </div>
      )}
      <div style={{ marginTop: 4 }}>
        <ExpandableList
          items={availableTechs}
          maxInitial={8}
          renderItem={(t) => (
            <TechTooltip key={t.id} tech={t} turnsLeft={turnsToCompleteTech(state, player, t.id, 0)}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`研究 ${t.name}`}
                style={{ ...itemStyle, color: theme.colors.science, display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => command({ kind: 'research', techId: t.id })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') command({ kind: 'research', techId: t.id }); }}
              >
                <AssetImage src={`/assets/tech/${t.id}.png`} alt="" width={18} height={18} />
                • {t.name} ({t.cost})
              </div>
            </TechTooltip>
          )}
        />
      </div>
    </div>
  );
});
