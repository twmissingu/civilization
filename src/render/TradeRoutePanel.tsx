// 贸易路线信息面板（只读，Phase 2 系统入口）
import { useGame, useCurrentPlayer } from './store';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

const YIELD_LABEL: Record<string, string> = {
  food: '🍞', production: '⚒', gold: '💰', science: '📖', culture: '🎭', faith: '⛪',
};

export function TradeRoutePanel() {
  const state = useGame((s) => s.state);
  const player = useCurrentPlayer();

  if (player.tradeRoutes.length === 0 && player.tradeRouteCapacity === 0) return null;

  return (
    <div style={panelStyle}>
      <b>🚚 贸易路线（{player.tradeRoutes.length}/{player.tradeRouteCapacity}）</b>
      {player.tradeRoutes.length === 0 ? (
        <div style={{ fontSize: 11, color: theme.colors.textDim, marginTop: 4 }}>无活跃贸易路线</div>
      ) : (
        player.tradeRoutes.map((tr) => {
          const fromCity = player.cities.find((c) => c.id === tr.fromCityId);
          const toPlayer = state.players.find((p) => p.id === tr.toPlayerId);
          const toCity = toPlayer?.cities.find((c) => c.id === tr.toCityId);
          const yieldStr = Object.entries(tr.yieldPerTurn)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `${YIELD_LABEL[k] ?? k}+${v}`)
            .join(' ');
          return (
            <div key={tr.id} style={{ fontSize: 11, marginTop: 4 }}>
              {fromCity?.name ?? '?'} → {toCity?.name ?? '?'}（{toPlayer ? `${tr.turnsCompleted}/${tr.turnsTotal}回合` : '?'}）
              <div style={{ color: theme.colors.textMuted, fontSize: 10 }}>{yieldStr}</div>
            </div>
          );
        })
      )}
    </div>
  );
}