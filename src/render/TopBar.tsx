// 顶部资源条与全局操作
import { Tooltip, ResourceTooltip } from './Tooltip';
import { theme } from './theme';
import { useGame, useCurrentPlayer } from './store';
import { CIVILIZATIONS } from '../gamedata';
import { getPlayerYield } from '../logic/state/query';
import { YieldIcon } from './YieldIcon';

interface TopBarProps {
  onShowHelp: () => void;
}

function computeTodoCount(player: { units: { moveLeft: number; hasActed: boolean }[]; cities: { queue: unknown[] }[] }): number {
  let count = 0;
  for (const u of player.units) if (u.moveLeft > 0 && !u.hasActed) count++;
  for (const c of player.cities) if (c.queue.length === 0) count++;
  return count;
}

export function TopBar({ onShowHelp }: TopBarProps) {
  const message = useGame((s) => s.message);
  const endTurn = useGame((s) => s.endTurn);
  const save = useGame((s) => s.save);
  const load = useGame((s) => s.load);
  const newGame = useGame((s) => s.newGame);
  const turn = useGame((s) => s.state.turn);
  const state = useGame((s) => s.state);
  const player = useCurrentPlayer();
  const yieldTotal = getPlayerYield(state);
  const civName = CIVILIZATIONS[player.civId]?.name ?? player.civId;
  const todoCount = computeTodoCount(player);
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
        <span style={{ color: theme.colors.gold, cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <YieldIcon type="gold" size={12} />{player.gold}(+{yieldTotal.gold})
        </span>
      </ResourceTooltip>
      <ResourceTooltip type="science">
        <span style={{ color: theme.colors.science, cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <YieldIcon type="science" size={12} />+{yieldTotal.science}
        </span>
      </ResourceTooltip>
      <ResourceTooltip type="culture">
        <span style={{ color: theme.colors.culture, cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <YieldIcon type="culture" size={12} />+{yieldTotal.culture}
        </span>
      </ResourceTooltip>
      <ResourceTooltip type="faith">
        <span style={{ color: theme.colors.faith, cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <YieldIcon type="faith" size={12} />{player.faith}(+{yieldTotal.faith})
        </span>
      </ResourceTooltip>
      <span>城 {player.cities.length}</span>

      <span style={{ marginLeft: 'auto', color: theme.colors.science }}>{message}</span>
      <Tooltip content={`结束当前回合（空格）${todoCount > 0 ? `，仍有 ${todoCount} 项待办，建议先处理` : ''}`}>
        <button
          onClick={endTurn}
          disabled={todoCount > 0}
          style={{
            ...btnBase,
            background: todoCount > 0 ? theme.colors.disabled : theme.colors.primary,
            fontWeight: 'bold',
            padding: '5px 14px',
            position: 'relative',
            cursor: todoCount > 0 ? 'not-allowed' : 'pointer',
            opacity: todoCount > 0 ? 0.6 : 1,
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
        <button onClick={save} style={{ ...btnBase, background: theme.colors.info }}>保存</button>
      </Tooltip>
      <Tooltip content="读取已保存的游戏进度">
        <button onClick={load} style={{ ...btnBase, background: theme.colors.info }}>读取</button>
      </Tooltip>
      <Tooltip content="开始新游戏">
        <button onClick={() => newGame()} style={{ ...btnBase, background: theme.colors.danger }}>新局</button>
      </Tooltip>
      <Tooltip content="查看游戏帮助和规则（?）">
        <button onClick={onShowHelp} style={{ ...btnBase, background: theme.colors.disabled }} aria-label="帮助">?</button>
      </Tooltip>
    </div>
  );
}
