// 市政面板 — 市政树网络图可视化
import { forwardRef, useMemo } from 'react';
import { useGame } from './store';
import { currentPlayer, canPlayerResearchCivic } from '../logic/state/query';
import { CIVICS } from '../gamedata';
import { TechTreeView } from './TechTreeView';
import { theme } from './theme';
import { formatTurns, turnsToCompleteCivic } from './eta';

export const CivicsPanel = forwardRef<HTMLDivElement>(function CivicsPanel(_, ref) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const player = currentPlayer(state);
  const current = player.currentCivic;

  const nodes = useMemo(() => {
    return Object.values(CIVICS).map((c) => ({
      id: c.id,
      name: c.name,
      era: c.era,
      cost: c.cost,
      prereqs: c.prereqCivics ?? [],
      progress: current?.civicId === c.id ? current.progress : (player.researchedCivics.includes(c.id) ? c.cost : 0),
      status: (player.researchedCivics.includes(c.id) ? 'researched'
        : canPlayerResearchCivic(state, c.id) ? 'available'
        : 'locked') as 'researched' | 'available' | 'locked',
    }));
  }, [state, player.researchedCivics, current]);

  const civicProgress = current
    ? `${current.progress}/${CIVICS[current.civicId]?.cost} · ${formatTurns(turnsToCompleteCivic(state, player, current.civicId, current.progress))}`
    : '空闲';

  return (
    <div ref={ref} style={{ marginBottom: theme.spacing.md }}>
      <b>市政</b>：{current ? `${CIVICS[current.civicId]?.name} (${civicProgress})` : '无'}
      {current && (
        <div style={{ height: 4, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 4 }}>
          <div style={{
            height: 4,
            width: `${Math.min(100, Math.round((current.progress / CIVICS[current.civicId].cost) * 100))}%`,
            background: theme.colors.culture,
            borderRadius: theme.borderRadius,
          }} />
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <TechTreeView
          nodes={nodes}
          currentId={current?.civicId ?? null}
          onSelect={(id) => command({ kind: 'researchCivic', civicId: id })}
          assetPrefix="civic"
          accentColor={theme.colors.culture}
        />
      </div>
    </div>
  );
});