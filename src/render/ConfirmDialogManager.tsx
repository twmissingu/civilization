// 集中管理确认对话框
import { useGame } from './store';
import { findUnit } from '../logic/state/query';
import { cityAt, getCombatPreview, getTileAt } from '../logic/state/query';
import { UNITS, CIVILIZATIONS } from '../gamedata';
import { ConfirmDialog } from './ConfirmDialog';
import { theme } from './theme';
import type { HexCoord } from '../types';

export type PendingConfirm =
  | { type: 'war'; targetCivId: string }
  | { type: 'attack'; attackerId: string; targetTile: HexCoord }
  | { type: 'foundCity'; unitId: string; name: string };

interface ConfirmDialogManagerProps {
  pendingConfirm: PendingConfirm | null;
  onClose: () => void;
}

export function ConfirmDialogManager({ pendingConfirm, onClose }: ConfirmDialogManagerProps) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);

  if (!pendingConfirm) return null;

  if (pendingConfirm.type === 'war') {
    const opponent = state.players.find((p) => p.id === pendingConfirm.targetCivId);
    const oppCiv = opponent ? CIVILIZATIONS[opponent.civId] : null;
    return (
      <ConfirmDialog
        isOpen
        title="确认宣战"
        danger
        onCancel={onClose}
        onConfirm={() => {
          command({ kind: 'declareWar', targetCivId: pendingConfirm.targetCivId });
          onClose();
        }}
      >
        确定向 <strong>{oppCiv?.name ?? '未知文明'}</strong> 宣战吗？
        <div style={{ marginTop: 8, color: theme.colors.textDim, fontSize: 12 }}>
          宣战后双方单位可互相攻击，且无法立即恢复和平。
        </div>
      </ConfirmDialog>
    );
  }

  if (pendingConfirm.type === 'attack') {
    const attacker = findUnit(state, pendingConfirm.attackerId);
    const pv = attacker ? getCombatPreview(state, attacker.id, pendingConfirm.targetTile) : null;
    const targetUnit = state.players
      .flatMap((p) => p.units)
      .find((u) => u.tile.q === pendingConfirm.targetTile.q && u.tile.r === pendingConfirm.targetTile.r);
    const targetCity = cityAt(state, pendingConfirm.targetTile);
    const targetName = targetUnit ? UNITS[targetUnit.type]?.name : targetCity ? targetCity.name : '目标';
    return (
      <ConfirmDialog
        isOpen
        title="确认攻击"
        danger
        onCancel={onClose}
        onConfirm={() => {
          command({
            kind: 'attack',
            attackerId: pendingConfirm.attackerId,
            targetTile: pendingConfirm.targetTile,
          });
          onClose();
        }}
      >
        {pv ? (
          <div>
            <div>
              攻击：{UNITS[attacker!.type]?.name}（CS{pv.attackerCS}） → {targetName}（CS{pv.defenderCS}）
            </div>
            <div style={{ marginTop: 6, color: theme.colors.production }}>
              预计伤害：{pv.estDamage}
              {pv.target === 'unit' ? `（目标 HP${pv.defenderHp}）` : '（城市）'}
            </div>
          </div>
        ) : (
          <div>确定攻击 {targetName} 吗？</div>
        )}
      </ConfirmDialog>
    );
  }

  // foundCity
  const settler = findUnit(state, pendingConfirm.unitId);
  const tile = settler ? getTileAt(state, settler.tile) : null;
  return (
    <ConfirmDialog
      isOpen
      title="确认建城"
      onCancel={onClose}
      onConfirm={() => {
        command({ kind: 'foundCity', unitId: pendingConfirm.unitId, name: pendingConfirm.name });
        onClose();
      }}
    >
      在 ({settler?.tile.q}, {settler?.tile.r}) 建立城市 <strong>{pendingConfirm.name}</strong> 吗？
      {tile && (
        <div style={{ marginTop: 8, color: theme.colors.textDim, fontSize: 12 }}>
          中心格：{tile.terrain}{tile.feature ? ` / ${tile.feature}` : ''}
        </div>
      )}
    </ConfirmDialog>
  );
}
