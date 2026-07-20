// 大人物信息面板（只读，Phase 2 系统入口）
import { useCurrentPlayer } from './store';
import { GREAT_PEOPLE } from '../gamedata';
import { theme } from './theme';
import { panelStyle } from './uiStyles';

const GP_TYPE_LABEL: Record<string, string> = {
  scientist: '大科学家', merchant: '大商人', engineer: '大工程师',
  general: '大将军', admiral: '大海军', prophet: '大先知', writer: '大作家', artist: '大艺术家', musician: '大音乐家',
};

export function GreatPeoplePanel() {
  const player = useCurrentPlayer();
  const hasPoints = Object.keys(player.greatPersonPoints).length > 0;
  const hasRecruited = player.recruitedGreatPeople.length > 0;

  if (!hasPoints && !hasRecruited) return null;

  return (
    <div style={panelStyle}>
      <b>🎖 大人物</b>
      <div style={{ fontSize: 11, marginTop: 4, color: theme.colors.textMuted }}>
        已招募：{player.recruitedGreatPeople.length} 人
      </div>
      {Object.entries(player.greatPersonPoints).filter(([, pts]) => pts > 0).map(([type, pts]) => (
        <div key={type} style={{ fontSize: 11, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
          <span>{GP_TYPE_LABEL[type] ?? type}</span>
          <span style={{ color: theme.colors.science }}>{Math.floor(pts)} 点</span>
        </div>
      ))}
      {player.recruitedGreatPeople.length > 0 && (
        <div style={{ fontSize: 10, marginTop: 4, color: theme.colors.textDim }}>
          {player.recruitedGreatPeople.map((id) => {
            const gp = GREAT_PEOPLE[id];
            return gp?.name ?? id;
          }).join('、')}
        </div>
      )}
    </div>
  );
}