// 地图右上角浮动最近事件
import { useGame } from './store';
import { formatEvent } from './eventLog';
import { theme } from './theme';

export function EventLogOverlay() {
  const state = useGame((s) => s.state);
  const eventLog = useGame((s) => s.eventLog);

  if (eventLog.length === 0 || state.status !== 'active') return null;

  return (
    <div
      style={{
        position: 'absolute',
        right: 310,
        top: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        pointerEvents: 'none',
      }}
    >
      {eventLog.slice(-4).map((e, i) => (
        <div
          key={`${e.kind}-${e.turn}-${i}`}
          style={{
            padding: '3px 8px',
            background: theme.colors.bgOverlay + 'cc',
            color: theme.colors.warning,
            borderRadius: theme.borderRadius,
            fontSize: 11,
            animation: 'fadein 0.3s',
          }}
        >
          {formatEvent(state, e)}
        </div>
      ))}
    </div>
  );
}
