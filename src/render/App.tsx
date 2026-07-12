// 主界面：资源条 + 地图 + 侧栏（研究/市政/单位/城市）
import { useGame } from './store';
import { PixiMap } from './PixiMap';
import { currentPlayer, findUnit, findCity } from '../logic/state/commands';
import { playerYield } from '../logic/state/yield';
import { canResearch } from '../logic/state/tech';
import { canResearchCivic } from '../logic/state/civic';
import { TECHS, CIVICS, UNITS, techCost, CIVILIZATIONS } from '../gamedata';

export function App() {
  const { state, selectedUnitId, selectedCityId, command, endTurn, newGame, save, load, message } = useGame();
  const player = currentPlayer(state);
  const y = playerYield(state, player);
  const civ = CIVILIZATIONS[player.civId];
  const unit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
  const city = selectedCityId ? findCity(state, selectedCityId) : null;
  const availableTechs = Object.values(TECHS).filter((t) => canResearch(player, t.id)).slice(0, 8);
  const availableCivics = Object.values(CIVICS).filter((c) => canResearchCivic(player, c.id)).slice(0, 6);

  const researchProgress = player.currentResearch
    ? `${player.currentResearch.progress}/${techCost(TECHS[player.currentResearch.techId], player.researchedTechs.length)}`
    : '空闲';

  const bar: React.CSSProperties = { display: 'flex', gap: 12, alignItems: 'center', padding: '6px 10px', background: '#2a2a3e', color: '#eee', fontFamily: 'monospace', fontSize: 13, borderBottom: '1px solid #444' };
  const btn: React.CSSProperties = { padding: '4px 8px', background: '#4a6', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: 3 };
  const panel: React.CSSProperties = { marginBottom: 10, padding: 6, background: '#2c2c44', borderRadius: 4 };
  const item: React.CSSProperties = { cursor: 'pointer', padding: '2px 4px' };

  return (
    <div style={{ fontFamily: 'monospace', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e', color: '#eee' }}>
      <div style={bar}>
        <b>{civ?.name ?? player.civId}</b>
        <span>第 {state.turn} 回合</span>
        <span style={{ color: '#ffd700' }}>金 {player.gold}(+{y.gold})</span>
        <span style={{ color: '#4af' }}>科 +{y.science}</span>
        <span style={{ color: '#a8f' }}>文 +{y.culture}</span>
        <span style={{ color: '#fff' }}>信 {player.faith}(+{y.faith})</span>
        <span>城 {player.cities.length}</span>
        <span style={{ marginLeft: 'auto', color: '#8af' }}>{message}</span>
        <button style={btn} onClick={() => endTurn()}>结束回合 ▶</button>
        <button style={{ ...btn, background: '#48a' }} onClick={() => save()}>保存</button>
        <button style={{ ...btn, background: '#48a' }} onClick={() => load()}>读取</button>
        <button style={{ ...btn, background: '#a64' }} onClick={() => newGame()}>新局</button>
      </div>

      {state.status === 'finished' && (
        <div style={{ padding: 8, background: '#3a2a1e', color: '#fc8', textAlign: 'center' }}>
          🏆 游戏结束 - 胜者：{state.winner}（{state.victoryType}）
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
          <PixiMap />
        </div>
        <div style={{ width: 270, padding: 10, background: '#22223a', overflowY: 'auto', fontSize: 12 }}>
          <div style={{ marginBottom: 10 }}>
            <b>研究</b>：{player.currentResearch ? TECHS[player.currentResearch.techId]?.name : '无'} ({researchProgress})
            <div style={{ marginTop: 4 }}>
              {availableTechs.map((t) => (
                <div key={t.id} style={{ ...item, color: '#8cf' }} onClick={() => command({ kind: 'research', techId: t.id })}>
                  • {t.name} ({t.cost})
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>市政</b>：{player.currentCivic ? CIVICS[player.currentCivic.civicId]?.name : '无'}
            <div style={{ marginTop: 4 }}>
              {availableCivics.map((c) => (
                <div key={c.id} style={{ ...item, color: '#c8f' }} onClick={() => command({ kind: 'researchCivic', civicId: c.id })}>
                  • {c.name} ({c.cost})
                </div>
              ))}
            </div>
          </div>

          {unit && (
            <div style={panel}>
              <b>单位</b>：{UNITS[unit.type]?.name}
              <div>HP {unit.hp} 移动 {unit.moveLeft}/{UNITS[unit.type]?.move}</div>
              {unit.type === 'settler' && (
                <button style={btn} onClick={() => command({ kind: 'foundCity', unitId: unit.id, name: `${civ?.id}-${player.cities.length + 1}` })}>建城</button>
              )}
              {unit.type === 'builder' && unit.charges !== undefined && <div>充能 {unit.charges}</div>}
            </div>
          )}

          {city && city.ownerId === player.id && (
            <div style={panel}>
              <b>{city.name}</b> (人口 {city.population})
              <div>领土 {city.territory.length} 住房 {city.housing}</div>
              <div>队列：{city.queue.map((q) => q.id).join(', ') || '空'}</div>
              <div style={{ marginTop: 4 }}>训练：</div>
              {Object.values(UNITS).filter((u) => u.unlockTech === 'initial' || player.researchedTechs.includes(u.unlockTech)).slice(0, 6).map((u) => (
                <button key={u.id} style={{ ...btn, margin: 1, fontSize: 11 }} onClick={() => command({ kind: 'trainUnit', cityId: city.id, unitType: u.id })}>{u.name}</button>
              ))}
            </div>
          )}

          {player.cities.length === 0 && (
            <div style={{ color: '#fc8' }}>选中你的开拓者（⌂），点侧栏"建城"开始。</div>
          )}
        </div>
      </div>
    </div>
  );
}
