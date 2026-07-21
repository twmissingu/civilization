// 首回合引导弹窗 — 帮助新玩家完成建城
import { useState, useEffect } from 'react';
import { useGame, useCurrentPlayer } from './store';
import { theme } from './theme';

const STEPS = [
  {
    title: '欢迎来到文明',
    text: '你面前有一个开拓者和一个战士。开拓者可以建立新城市，战士可以探索和战斗。',
    action: '下一步',
  },
  {
    title: '第一步：选择开拓者',
    text: '点击地图上的开拓者（带⌂标记的单位），然后在右侧面板点击"建城"按钮。',
    action: '下一步',
  },
  {
    title: '第二步：探索地图',
    text: '选择战士，右键点击地图上的其他格子来移动。探索周围环境，寻找建城的好位置。',
    action: '开始游戏',
  },
];

export function TutorialOverlay() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const turn = useGame((s) => s.state.turn);
  const player = useCurrentPlayer();

  // 只在第 1 回合、玩家无城市时显示
  const hasCity = player.cities.length > 0;
  useEffect(() => {
    if (turn > 1 || hasCity || dismissed) return;
    // 如果玩家已经建城，自动跳过引导
    if (hasCity) setDismissed(true);
  }, [turn, hasCity, dismissed]);

  if (turn > 1 || hasCity || dismissed) return null;

  const s = STEPS[step];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        fontFamily: theme.fontFamily,
      }}
      onClick={() => {
        if (step < STEPS.length - 1) setStep(step + 1);
        else setDismissed(true);
      }}
    >
      <div
        style={{
          background: theme.colors.bgPanel,
          padding: '32px 40px',
          borderRadius: theme.borderRadius,
          maxWidth: 420,
          textAlign: 'center',
          border: `2px solid ${theme.colors.accent}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          cursor: 'pointer',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 20, color: theme.colors.accent, marginBottom: 12 }}>
          {s.title}
        </div>
        <div style={{ fontSize: 14, color: theme.colors.text, lineHeight: 1.6, marginBottom: 20 }}>
          {s.text}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {step > 0 && (
            <button
              style={{
                padding: '6px 16px',
                background: theme.colors.disabled,
                color: '#fff',
                border: 'none',
                borderRadius: theme.borderRadius,
                cursor: 'pointer',
                fontSize: 13,
                fontFamily: theme.fontFamily,
              }}
              onClick={() => setStep(step - 1)}
            >
              上一步
            </button>
          )}
          <button
            style={{
              padding: '6px 16px',
              background: theme.colors.primary,
              color: '#fff',
              border: 'none',
              borderRadius: theme.borderRadius,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
              fontFamily: theme.fontFamily,
            }}
            onClick={() => {
              if (step < STEPS.length - 1) setStep(step + 1);
              else setDismissed(true);
            }}
          >
            {s.action}
          </button>
          <button
            style={{
              padding: '6px 16px',
              background: 'transparent',
              color: theme.colors.textMuted,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: theme.fontFamily,
            }}
            onClick={() => setDismissed(true)}
          >
            跳过引导
          </button>
        </div>
        <div style={{ fontSize: 11, color: theme.colors.textDim, marginTop: 12 }}>
          第 {step + 1}/{STEPS.length} 步
        </div>
      </div>
    </div>
  );
}