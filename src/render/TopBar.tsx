// 顶部资源条与全局操作
import { Tooltip } from './Tooltip';
import { ResourceTooltip } from './Tooltip';
import { theme } from './theme';
import type { PlayerState } from '../logic/state/types';
import type { Yield } from '../gamedata/types';

interface TopBarProps {
  civName: string;
  turn: number;
  player: PlayerState;
  yieldTotal: Yield;
  message: string;
  onEndTurn: () => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
  onShowHelp: () => void;
  todoCount?: number;
}

export function TopBar({
  civName,
  turn,
  player,
  yieldTotal,
  message,
  onEndTurn,
  onSave,
  onLoad,
  onNewGame,
  onShowHelp,
  todoCount = 0,
}: TopBarProps) {
  const btnBase: React.CSSProperties = {
    padding: '4px 10px',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: theme.borderRadius,
    fontSize: 12,
    fontFamily: theme.fontFamily,
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '6px 10px',
        background: theme.colors.bgPanel,
        color: theme.colors.text,
        fontFamily: theme.fontFamily,
        fontSize: 13,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}
    >
      <b>{civName}</b>
      <span>第 {turn} 回合</span>
      <ResourceTooltip type="gold">
        <span style={{ color: theme.colors.gold, cursor: 'help' }}>金 {player.gold}(+{yieldTotal.gold})</span>
      </ResourceTooltip>
      <ResourceTooltip type="science">
        <span style={{ color: theme.colors.science, cursor: 'help' }}>科 +{yieldTotal.science}</span>
      </ResourceTooltip>
      <ResourceTooltip type="culture">
        <span style={{ color: theme.colors.culture, cursor: 'help' }}>文 +{yieldTotal.culture}</span>
      </ResourceTooltip>
      <ResourceTooltip type="faith">
        <span style={{ color: theme.colors.faith, cursor: 'help' }}>信 {player.faith}(+{yieldTotal.faith})</span>
      </ResourceTooltip>
      <span>城 {player.cities.length}</span>

      <span style={{ marginLeft: 'auto', color: theme.colors.science }}>{message}</span>
      <Tooltip content={`结束当前回合（空格）${todoCount > 0 ? `，仍有 ${todoCount} 项待办` : ''}`}>
        <button
          onClick={onEndTurn}
          style={{
            ...btnBase,
            background: theme.colors.primary,
            fontWeight: 'bold',
            padding: '5px 14px',
            position: 'relative',
          }}
        >
          结束回合 (空格) ▶
          {todoCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -6,
              right: -6,
              background: theme.colors.danger,
              color: '#fff',
              borderRadius: '50%',
              fontSize: 10,
              width: 16,
              height: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {todoCount}
            </span>
          )}
        </button>
      </Tooltip>
      <Tooltip content="保存当前游戏进度">
        <button onClick={onSave} style={{ ...btnBase, background: theme.colors.info }}>保存</button>
      </Tooltip>
      <Tooltip content="读取已保存的游戏进度">
        <button onClick={onLoad} style={{ ...btnBase, background: theme.colors.info }}>读取</button>
      </Tooltip>
      <Tooltip content="开始新游戏">
        <button onClick={onNewGame} style={{ ...btnBase, background: theme.colors.danger }}>新局</button>
      </Tooltip>
      <Tooltip content="查看游戏帮助和规则（?）">
        <button onClick={onShowHelp} style={{ ...btnBase, background: theme.colors.disabled }} aria-label="帮助">?</button>
      </Tooltip>
    </div>
  );
}
