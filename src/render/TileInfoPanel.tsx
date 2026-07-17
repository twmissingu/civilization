// 悬停地块信息面板
import { useGame } from './store';
import { currentPlayer, findUnit } from '../logic/state/commands';
import { describeTile } from '../logic/state/describe';
import { previewCombat } from '../logic/state/combat';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

export function TileInfoPanel() {
  const state = useGame((s) => s.state);
  const hoveredTile = useGame((s) => s.hoveredTile);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const player = currentPlayer(state);
  const unit = selectedUnitId ? findUnit(state, selectedUnitId) : null;

  if (!hoveredTile) return null;

  return (
    <div style={{ ...panelStyle, background: theme.colors.bg }}>
      <b>地块信息</b>
      <div style={{ fontSize: 11, color: theme.colors.textMuted, whiteSpace: 'pre-line' }}>{describeTile(state, hoveredTile)}</div>
      {unit && unit.ownerId === player.id && (() => {
        const pv = previewCombat(state, unit.id, hoveredTile);
        if (!pv) return null;
        return (
          <div style={{ fontSize: 11, color: theme.colors.warning, marginTop: 4 }}>
            战斗：我 CS{pv.attackerCS} vs 敌 CS{pv.defenderCS}
            {pv.target === 'unit' ? `（HP${pv.defenderHp}）预计伤害 ${pv.estDamage}` : '（城市）'}
          </div>
        );
      })()}
    </div>
  );
}
