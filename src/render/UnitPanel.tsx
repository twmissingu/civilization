// 选中单位面板
import { useGame } from './store';
import { currentPlayer, findUnit } from '../logic/state/commands';
import { UNITS, IMPROVEMENTS, CIVILIZATIONS } from '../gamedata';
import { canBuildImprovement } from '../logic/state/builder';
import { theme } from './theme';
import { panelStyle, btnStyle } from './uiStyles';

const IMPROVEMENT_NAMES: Record<string, string> = {
  farm: '农场', mine: '矿场', lumber_mill: '伐木场', pasture: '牧场',
  plantation: '种植园', quarry: '采石场', fishing_boats: '渔船', fort: '堡垒',
};

interface UnitPanelProps {
  onRequestFoundCity: (unitId: string, name: string) => void;
}

export function UnitPanel({ onRequestFoundCity }: UnitPanelProps) {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const selectedUnitId = useGame((s) => s.selectedUnitId);
  const player = currentPlayer(state);
  const unit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
  const civ = CIVILIZATIONS[player.civId];

  if (!unit) return null;

  if (unit.ownerId === player.id) {
    const buildableImprovements =
      unit.type === 'builder' && unit.charges !== undefined
        ? Object.values(IMPROVEMENTS).filter((imp) => canBuildImprovement(state, unit, imp.id))
        : [];
    return (
      <div style={panelStyle}>
        <b>单位</b>：{UNITS[unit.type]?.name}
        <div>HP {unit.hp} 移动 {unit.moveLeft}/{UNITS[unit.type]?.move}</div>
        {unit.type === 'settler' && (
          <button
            style={btnStyle}
            onClick={() => onRequestFoundCity(unit.id, `${civ?.id ?? '城'}-${player.cities.length + 1}`)}
          >
            建城
          </button>
        )}
        {unit.type === 'builder' && unit.charges !== undefined && (
          <div style={{ marginTop: 6 }}>
            <div>充能 {unit.charges}</div>
            <div style={{ marginTop: 4 }}>改良：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {buildableImprovements.map((imp) => (
                <button
                  key={imp.id}
                  style={{ ...btnStyle, fontSize: 10, padding: '2px 6px' }}
                  onClick={() => command({ kind: 'buildImprovement', builderId: unit.id, improvementId: imp.id })}
                >
                  {IMPROVEMENT_NAMES[imp.id] ?? imp.id}
                </button>
              ))}
              {buildableImprovements.length === 0 && (
                <span style={{ color: theme.colors.textDim, fontSize: 11 }}>当前地块无可执行改良</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <b>敌方单位</b>：{UNITS[unit.type]?.name}
      <div>
        HP {unit.hp} · 所属 {CIVILIZATIONS[state.players.find((p) => p.id === unit.ownerId)?.civId ?? '']?.name}
      </div>
    </div>
  );
}
