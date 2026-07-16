// 可展开列表：默认显示前 N 项，超出时切换
import { useState } from 'react';
import { theme } from './theme';

interface ExpandableListProps<T> {
  items: readonly T[];
  maxInitial: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  moreLabel?: (remaining: number) => string;
  lessLabel?: string;
}

export function ExpandableList<T>({
  items,
  maxInitial,
  renderItem,
  moreLabel = (remaining) => `还有 ${remaining} 项 ▼`,
  lessLabel = '收起 ▲',
}: ExpandableListProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, maxInitial);
  const remaining = Math.max(0, items.length - maxInitial);

  return (
    <div>
      {visible.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
      {remaining > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 4,
            padding: '2px 6px',
            background: 'transparent',
            border: 'none',
            color: theme.colors.textDim,
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: theme.fontFamily,
          }}
        >
          {expanded ? lessLabel : moreLabel(remaining)}
        </button>
      )}
    </div>
  );
}
