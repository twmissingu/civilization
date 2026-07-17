// 侧边栏事件日志（可折叠）
import { useState } from 'react';
import { useGame } from './store';
import { formatEvent } from './eventLog';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

export function EventLogPanel() {
  const [showEventLog, setShowEventLog] = useState(false);
  const state = useGame((s) => s.state);
  const eventLog = useGame((s) => s.eventLog);

  if (eventLog.length === 0) return null;

  return (
    <div style={{ ...panelStyle, background: theme.colors.bg }}>
      <div
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
        onClick={() => setShowEventLog(!showEventLog)}
        role="button"
        tabIndex={0}
        aria-expanded={showEventLog}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowEventLog(!showEventLog); }}
      >
        <b>事件日志</b>
        <span style={{ color: theme.colors.textDim, fontSize: 11 }}>{showEventLog ? '收起' : '展开'}</span>
      </div>
      <div style={{ maxHeight: showEventLog ? 200 : 72, overflow: 'hidden', transition: 'max-height 0.2s' }}>
        {[...eventLog].reverse().map((e, i) => (
          <div
            key={`${e.kind}-${e.turn}-${i}`}
            style={{ fontSize: 11, color: theme.colors.warning, padding: '2px 0', borderBottom: `1px solid ${theme.colors.border}` }}
          >
            {formatEvent(state, e)}
          </div>
        ))}
      </div>
    </div>
  );
}
