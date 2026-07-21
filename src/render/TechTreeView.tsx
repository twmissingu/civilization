// 科技/市政树网络图可视化 — 按时代分列的 DAG 布局
import { useMemo } from 'react';
import { theme } from './theme';
import { AssetImage } from './AssetImage';

interface TechNode {
  id: string;
  name: string;
  era: string;
  cost: number;
  prereqs: string[];
  progress: number;
  status: 'researched' | 'available' | 'locked';
}

interface TechTreeViewProps {
  nodes: TechNode[];
  currentId: string | null;
  onSelect: (id: string) => void;
  assetPrefix: string;
  accentColor: string;
}

const ERA_ORDER = ['ancient', 'classical', 'medieval', 'renaissance', 'industrial', 'modern', 'atomic', 'information'];

export function TechTreeView({ nodes, currentId, onSelect, assetPrefix, accentColor }: TechTreeViewProps) {
  const { columns } = useMemo(() => {
    // 按时代分组
    const eraGroups = new Map<string, TechNode[]>();
    for (const n of nodes) {
      const group = eraGroups.get(n.era) ?? [];
      group.push(n);
      eraGroups.set(n.era, group);
    }
    // 排序
    const cols = ERA_ORDER.filter((e) => eraGroups.has(e)).map((e) => eraGroups.get(e)!);
    // 计算连线
    return { columns: cols };
  }, [nodes]);

  if (nodes.length === 0) return <div style={{ color: theme.colors.textDim, fontSize: 11 }}>无可用科技</div>;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
      <div style={{ display: 'flex', gap: 12, minWidth: 'max-content' }}>
        {columns.map((group, ci) => (
          <div key={ERA_ORDER[ci] ?? ci} style={{ minWidth: 130, maxWidth: 160 }}>
            <div style={{ fontSize: 10, color: theme.colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {ERA_ORDER[ci] ?? '未知'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {group.map((node) => {
                const isCurrent = node.id === currentId;
                const bgColor = node.status === 'researched' ? '#1a3a1a'
                  : node.status === 'available' ? '#1a2a3a'
                  : '#2a2a2a';
                const borderColor = isCurrent ? accentColor
                  : node.status === 'researched' ? theme.colors.food
                  : node.status === 'available' ? accentColor
                  : theme.colors.disabled;
                const pct = node.cost > 0 ? Math.min(100, Math.round((node.progress / node.cost) * 100)) : 0;

                return (
                  <div
                    key={node.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => node.status !== 'locked' && onSelect(node.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && node.status !== 'locked') onSelect(node.id); }}
                    style={{
                      padding: '6px 8px',
                      borderRadius: theme.borderRadius,
                      background: bgColor,
                      border: `1.5px solid ${borderColor}`,
                      cursor: node.status !== 'locked' ? 'pointer' : 'default',
                      opacity: node.status === 'locked' ? 0.5 : 1,
                      fontSize: 11,
                      color: theme.colors.text,
                      fontFamily: theme.fontFamily,
                      transition: 'border-color 0.2s',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                      <AssetImage src={`/assets/${assetPrefix}/${node.id}.png`} alt="" width={14} height={14} />
                      <span style={{ fontWeight: isCurrent ? 'bold' : 'normal' }}>{node.name}</span>
                    </div>
                    <div style={{ fontSize: 9, color: theme.colors.textDim }}>
                      {node.cost} {node.status === 'researched' ? '✓' : ''}
                    </div>
                    {pct > 0 && pct < 100 && (
                      <div style={{ height: 2, background: theme.colors.progressTrack, borderRadius: 1, marginTop: 2 }}>
                        <div style={{ height: 2, width: `${pct}%`, background: accentColor, borderRadius: 1 }} />
                      </div>
                    )}
                    {/* 前置连线指示器 */}
                    {node.prereqs.length > 0 && node.status !== 'researched' && (
                      <div style={{ fontSize: 8, color: theme.colors.textDim, marginTop: 2 }}>
                        ← {node.prereqs.length} 前置
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}