// 研究面板 — 科技树网络图可视化
import { forwardRef, useMemo } from 'react';
import { useGame } from './store';
import { currentPlayer, canPlayerResearch } from '../logic/state/query';
import { TECHS, techCost } from '../gamedata';
import { TechTreeView } from './TechTreeView';
import { theme } from './theme';
import { formatTurns, turnsToCompleteTech } from './eta';

export const ResearchPanel = forwardRef<HTMLDivElement>(function ResearchPanel(_, ref) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const player = currentPlayer(state);
  const current = player.currentResearch;

  const nodes = useMemo(() => {
    return Object.values(TECHS).map((t) => ({
      id: t.id,
      name: t.name,
      era: t.era,
      cost: t.cost,
      prereqs: t.prereqTechs ?? [],
      progress: current?.techId === t.id ? current.progress : (player.researchedTechs.includes(t.id) ? t.cost : 0),
      status: (player.researchedTechs.includes(t.id) ? 'researched'
        : canPlayerResearch(state, t.id) ? 'available'
        : 'locked') as 'researched' | 'available' | 'locked',
    }));
  }, [state, player.researchedTechs, current]);

  const researchProgress = current
    ? `${current.progress}/${techCost(TECHS[current.techId], player.researchedTechs.length)} · ${formatTurns(turnsToCompleteTech(state, player, current.techId, current.progress))}`
    : '空闲';

  return (
    <div ref={ref} style={{ marginBottom: theme.spacing.md }}>
      <b>研究</b>：{current ? TECHS[current.techId]?.name : '无'} ({researchProgress})
      {current && (
        <div style={{ height: 4, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 4 }}>
          <div style={{
            height: 4,
            width: `${Math.min(100, Math.round((current.progress / techCost(TECHS[current.techId], player.researchedTechs.length)) * 100))}%`,
            background: theme.colors.science,
            borderRadius: theme.borderRadius,
          }} />
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <TechTreeView
          nodes={nodes}
          currentId={current?.techId ?? null}
          onSelect={(id) => command({ kind: 'research', techId: id })}
          assetPrefix="tech"
          accentColor={theme.colors.science}
        />
      </div>
    </div>
  );
});