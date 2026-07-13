// 主界面：资源条 + 地图 + 侧栏（研究/市政/单位/城市）
import { useGame } from './store';
import { PixiMap } from './PixiMap';
import { currentPlayer, findUnit, findCity } from '../logic/state/commands';
import { playerYield } from '../logic/state/yield';
import { canResearch } from '../logic/state/tech';
import { computeEra } from '../logic/state/tech';
import { playerScore } from '../logic/state/victory';
import { canResearchCivic } from '../logic/state/civic';
import { TECHS, CIVICS, UNITS, techCost, CIVILIZATIONS, BUILDINGS, WONDERS, GOVERNMENTS, POLICY_CARDS } from '../gamedata';
import { portraitAssetUrl } from './assets';
import { describeTile } from '../logic/state/describe';
import { productionCost } from '../logic/state/city';
import { canChangeGovernment, canSwitchPolicy } from '../logic/state/civic';
import { previewCombat } from '../logic/state/combat';
import type { PlayerState } from '../logic/state/types';

function firstEmptySlot(player: PlayerState, cardType: string): number | null {
  const gov = GOVERNMENTS[player.government];
  for (let i = 0; i < player.policySlots.length; i++) {
    if (player.policySlots[i] !== null) continue;
    const slotType = i < gov.militarySlots ? 'military' : i < gov.militarySlots + gov.economicSlots ? 'economic' : 'wildcard';
    if (slotType === 'wildcard' || slotType === cardType) return i;
  }
  return null;
}

const EVENT_LABELS: Record<string, string> = {
  CityFounded: '🏙 建城', CombatResolved: '⚔ 战斗', CityAttacked: '⚔ 攻城',
  WonderBuilt: '🏛 奇观建成', TechCompleted: '🔬 科技完成', CivicCompleted: '📜 市政完成',
  WarDeclared: '⚔ 宣战', PeaceDeclared: '🕊 求和', GovernmentChanged: '🏛 政体更迭',
  GameWon: '🏆 胜利', UnitTrained: '⚔ 单位训练', DistrictPlaced: '🏫 区域放置',
};
function eventLabel(kind: string): string {
  return EVENT_LABELS[kind] ?? kind;
}

export function App() {
  const { state, selectedUnitId, selectedCityId, command, endTurn, newGame, save, load, message, eventLog, hoveredTile } = useGame();
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
    <div style={{ fontFamily: 'monospace', height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a1a2e', color: '#eee', position: 'relative' }}>
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

      {eventLog.length > 0 && state.status === 'active' && (
        <div style={{ position: 'absolute', right: 290, top: 50, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
          {eventLog.slice(-4).map((e, i) => (
            <div key={`${e}-${i}`} style={{ padding: '3px 8px', background: 'rgba(0,0,0,0.6)', color: '#fc8', borderRadius: 3, fontSize: 11, animation: 'fadein 0.3s' }}>
              {eventLabel(e)}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1 } }`}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
          <PixiMap />
        </div>
        <div style={{ width: 270, padding: 10, background: '#22223a', overflowY: 'auto', fontSize: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <img src={portraitAssetUrl(player.civId)} alt={civ?.name} style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: 4, border: '1px solid #c9a84c' }} />
            <div>
              <div style={{ fontSize: 13, color: '#c9a84c' }}>{civ?.name ?? player.civId}</div>
              <div style={{ fontSize: 10, color: '#888' }}>{civ?.ability.name}</div>
            </div>
          </div>
          <div style={{ ...panel, background: '#1a1a2e' }}>
            <b>进度</b>
            <div style={{ fontSize: 11, color: '#ccc' }}>
              时代：{computeEra(player.researchedTechs)} · 回合 {state.turn}/{state.config.maxTurns}
            </div>
            <div style={{ fontSize: 11, color: '#8cf' }}>
              科技胜利：{player.cities.find((c) => c.spaceProject)?.spaceProject ? `阶段 ${player.cities.find((c) => c.spaceProject)!.spaceProject!.stage}` : '未开始'}
            </div>
            <div style={{ fontSize: 11, color: '#f88' }}>
              统治：剩余首都 {state.players.filter((p) => p.id !== player.id && p.capitalCityId).length}
            </div>
            <div style={{ fontSize: 11, color: '#fc8' }}>
              分数：{playerScore(player)} · 排名 {[...state.players].sort((a, b) => playerScore(b) - playerScore(a)).findIndex((p) => p.id === player.id) + 1}/{state.players.length}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>研究</b>：{player.currentResearch ? TECHS[player.currentResearch.techId]?.name : '无'} ({researchProgress})
            <div style={{ marginTop: 4 }}>
              {availableTechs.map((t) => (
                <div key={t.id} style={{ ...item, color: '#8cf', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => command({ kind: 'research', techId: t.id })}>
                  <img src={`/assets/tech/${t.id}.png`} alt="" width={18} height={18} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  • {t.name} ({t.cost})
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>市政</b>：{player.currentCivic ? CIVICS[player.currentCivic.civicId]?.name : '无'}
            <div style={{ marginTop: 4 }}>
              {availableCivics.map((c) => (
                <div key={c.id} style={{ ...item, color: '#c8f', display: 'flex', alignItems: 'center', gap: 4 }} onClick={() => command({ kind: 'researchCivic', civicId: c.id })}>
                  <img src={`/assets/civic/${c.id}.png`} alt="" width={18} height={18} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  • {c.name} ({c.cost})
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <b>政体</b>：{GOVERNMENTS[player.government]?.name}
            <div style={{ fontSize: 10, color: '#999', marginBottom: 2 }}>槽位：{player.policySlots.map((s) => s ? POLICY_CARDS[s]?.name?.slice(0, 2) : '空').join(' ')}</div>
            <div style={{ fontSize: 10, color: '#888' }}>切换：</div>
            {Object.values(GOVERNMENTS).filter((g) => canChangeGovernment(player, g.id) && g.id !== player.government).slice(0, 5).map((g) => (
              <button key={g.id} style={{ ...btn, margin: 1, fontSize: 10, background: '#846' }} onClick={() => command({ kind: 'changeGovernment', governmentType: g.id })}>{g.name}</button>
            ))}
            <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>政策卡（点选装入空槽）：</div>
            {Object.values(POLICY_CARDS).filter((c) => player.researchedCivics.includes(c.unlockCivic) && c.type !== 'diplomatic').slice(0, 8).map((c) => {
              const slot = firstEmptySlot(player, c.type);
              const canAssign = slot !== null && canSwitchPolicy(player, c.id, slot);
              return (
                <button key={c.id} disabled={!canAssign} style={{ ...btn, margin: 1, fontSize: 10, background: canAssign ? '#486' : '#555', opacity: canAssign ? 1 : 0.5, display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => slot !== null && command({ kind: 'switchPolicy', cardId: c.id, slotIndex: slot })}>
                  <img src={`/assets/policy/${c.id}.png`} alt="" width={14} height={14} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />{c.name}
                </button>
              );
            })}
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
              <div style={{ marginTop: 4 }}>队列：</div>
              {city.queue.length === 0 ? <div style={{ color: '#888' }}>空</div> : city.queue.map((q, i) => {
                const cost = productionCost(state, city, q);
                const name = q.kind === 'unit' ? UNITS[q.id]?.name : q.kind === 'building' ? BUILDINGS[q.id]?.name : q.kind === 'wonder' ? WONDERS[q.id]?.name : q.id;
                const pct = cost > 0 && isFinite(cost) ? Math.min(100, Math.round((q.progress / cost) * 100)) : 0;
                return (
                  <div key={i} style={{ fontSize: 11 }}>
                    {name} {pct}%
                    <div style={{ height: 4, background: '#333', borderRadius: 2, marginTop: 1 }}>
                      <div style={{ height: 4, width: `${pct}%`, background: '#4a6', borderRadius: 2 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 6 }}>训练单位：</div>
              {Object.values(UNITS).filter((u) => u.unlockTech === 'initial' || player.researchedTechs.includes(u.unlockTech)).slice(0, 6).map((u) => (
                <button key={u.id} style={{ ...btn, margin: 1, fontSize: 11 }} onClick={() => command({ kind: 'trainUnit', cityId: city.id, unitType: u.id })}>{u.name}</button>
              ))}
              <div style={{ marginTop: 6 }}>建造建筑：</div>
              {Object.values(BUILDINGS).filter((b) => (!b.unlockTech || player.researchedTechs.includes(b.unlockTech)) && (!b.unlockCivic || player.researchedCivics.includes(b.unlockCivic)) && !city.buildings.includes(b.id) && b.district === 'city_center').slice(0, 6).map((b) => (
                <button key={b.id} style={{ ...btn, margin: 1, fontSize: 11, background: '#48a', display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => command({ kind: 'buildBuilding', cityId: city.id, buildingType: b.id })}>
                  <img src={`/assets/buildings/${b.id}.png`} alt="" width={16} height={16} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />{b.name}
                </button>
              ))}
            </div>
          )}

          {hoveredTile && (
            <div style={{ ...panel, background: '#1a1a2e' }}>
              <b>地块</b>
              <div style={{ fontSize: 11, color: '#ccc' }}>{describeTile(state, hoveredTile)}</div>
              {unit && unit.ownerId === player.id && (() => {
                const pv = previewCombat(state, unit.id, hoveredTile);
                if (!pv) return null;
                return (
                  <div style={{ fontSize: 11, color: '#fc8', marginTop: 4 }}>
                    ⚔ 战斗：我 CS{pv.attackerCS} vs 敌 CS{pv.defenderCS}
                    {pv.target === 'unit' ? `（HP${pv.defenderHp}）预计伤害 ${pv.estDamage}` : '（城市）'}
                  </div>
                );
              })()}
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
