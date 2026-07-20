// AI 回合进度指示器
import { useGame } from './store';
import { theme } from './theme';

export function AIProgressOverlay() {
  const aiRunning = useGame((s) => s.aiRunning);
  const aiProgress = useGame((s) => s.aiProgress);

  if (!aiRunning) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        fontFamily: theme.fontFamily,
      }}
    >
      <div
        style={{
          background: theme.colors.bgPanel,
          padding: '24px 32px',
          borderRadius: theme.borderRadius,
          textAlign: 'center',
          border: `1px solid ${theme.colors.border}`,
        }}
      >
        <div style={{ fontSize: 18, color: theme.colors.text, marginBottom: 8 }}>
          AI 回合进行中…
        </div>
        {aiProgress && (
          <div style={{ fontSize: 13, color: theme.colors.textMuted }}>
            处理 {aiProgress.current}/{aiProgress.total} AI 文明
          </div>
        )}
        <div
          style={{
            marginTop: 12,
            height: 4,
            background: theme.colors.progressTrack,
            borderRadius: theme.borderRadius,
            overflow: 'hidden',
            width: 200,
          }}
        >
          <div
            style={{
              height: 4,
              width: aiProgress ? `${(aiProgress.current / aiProgress.total) * 100}%` : '50%',
              background: theme.colors.primary,
              borderRadius: theme.borderRadius,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
    </div>
  );
}