// 主界面：资源条 + 地图 + 侧栏（研究/市政/单位/城市）
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useGame } from './store';
import { PixiMap } from './PixiMap';
import { TopBar } from './TopBar';
import { currentPlayer, findUnit, findCity } from '../logic/state/commands';
import { playerYield, cityYield } from '../logic/state/yield';
import { canResearch } from '../logic/state/tech';
import { computeEra } from '../logic/state/tech';
import { playerScore } from '../logic/state/victory';
import { canResearchCivic } from '../logic/state/civic';
import { TECHS, CIVICS, UNITS, techCost, CIVILIZATIONS, BUILDINGS, WONDERS, GOVERNMENTS, POLICY_CARDS, IMPROVEMENTS } from '../gamedata';
import { portraitAssetUrl } from './assets';
import { describeTile } from '../logic/state/describe';
import { getTile } from '../logic/state/mapgen';
import { productionCost } from '../logic/state/city';
import { canChangeGovernment, canSwitchPolicy } from '../logic/state/civic';
import { canBuildImprovement } from '../logic/state/builder';
import { previewCombat, cityAt } from '../logic/state/combat';
import { HelpModal } from './HelpModal';
import { TurnTodoPanel } from './TurnTodoPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip, TechTooltip, CivicTooltip } from './Tooltip';
import { formatEvent } from './eventLog';
import { theme } from './theme';
import './styles.css';
import { formatTurns, turnsToCompleteTech, turnsToCompleteCivic, turnsToCompleteProduction, turnsToPopulationGrowth } from './eta';
import type { PlayerState } from '../logic/state/types';
import type { HexCoord } from '../types';

function firstEmptySlot(player: PlayerState, cardType: string): number | null {
  const gov = GOVERNMENTS[player.government];
  for (let i = 0; i < player.policySlots.length; i++) {
    if (player.policySlots[i] !== null) continue;
    const slotType = i < gov.militarySlots ? 'military' : i < gov.militarySlots + gov.economicSlots ? 'economic' : 'wildcard';
    if (slotType === 'wildcard' || slotType === cardType) return i;
  }
  return null;
}

const IMPROVEMENT_NAMES: Record<string, string> = {
  farm: '农场', mine: '矿场', lumber_mill: '伐木场', pasture: '牧场',
  plantation: '种植园', quarry: '采石场', fishing_boats: '渔船', fort: '堡垒',
};

function policySlotTypeLabel(player: PlayerState, slotIndex: number): string {
  const gov = GOVERNMENTS[player.government];
  if (slotIndex < gov.militarySlots) return '军事';
  if (slotIndex < gov.militarySlots + gov.economicSlots) return '经济';
  return '万能';
}

export function App() {
  const {
    state,
    selectedUnitId,
    selectedCityId,
    command,
    endTurn,
    newGame,
    save,
    load,
    message,
    eventLog,
    hoveredTile,
    selectUnit,
    selectCity,
  } = useGame();
  const [showHelp, setShowHelp] = useState(false);
  const [showEventLog, setShowEventLog] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<
    | { type: 'war'; targetCivId: string }
    | { type: 'attack'; attackerId: string; targetTile: HexCoord }
    | { type: 'foundCity'; unitId: string; name: string }
    | null
  >(null);
  const researchRef = useRef<HTMLDivElement>(null);
  const civicRef = useRef<HTMLDivElement>(null);
  const player = currentPlayer(state);
  const y = playerYield(state, player);
  const civ = CIVILIZATIONS[player.civId];
  const unit = selectedUnitId ? findUnit(state, selectedUnitId) : null;
  const city = selectedCityId ? findCity(state, selectedCityId) : null;

  const availableTechs = useMemo(
    () => Object.values(TECHS).filter((t) => canResearch(player, t.id)).slice(0, 8),
    [player]
  );
  const availableCivics = useMemo(
    () => Object.values(CIVICS).filter((c) => canResearchCivic(player, c.id)).slice(0, 6),
    [player]
  );

  const researchInfo = useMemo(() => {
    if (!player.currentResearch) return null;
    const tech = TECHS[player.currentResearch.techId];
    if (!tech) return null;
    const cost = techCost(tech, player.researchedTechs.length);
    return {
      pct: cost > 0 ? Math.min(100, Math.round((player.currentResearch.progress / cost) * 100)) : 0,
      turns: turnsToCompleteTech(state, player, player.currentResearch.techId, player.currentResearch.progress),
    };
  }, [player, state]);

  const civicInfo = useMemo(() => {
    if (!player.currentCivic) return null;
    const civic = CIVICS[player.currentCivic.civicId];
    if (!civic) return null;
    return {
      pct: civic.cost > 0 ? Math.min(100, Math.round((player.currentCivic.progress / civic.cost) * 100)) : 0,
      turns: turnsToCompleteCivic(state, player, player.currentCivic.civicId, player.currentCivic.progress),
    };
  }, [player, state]);

  const researchProgress = player.currentResearch
    ? `${player.currentResearch.progress}/${techCost(TECHS[player.currentResearch.techId], player.researchedTechs.length)} · ${formatTurns(researchInfo?.turns ?? null)}`
    : '空闲';

  const civicProgress = player.currentCivic
    ? `${player.currentCivic.progress}/${CIVICS[player.currentCivic.civicId]?.cost} · ${formatTurns(civicInfo?.turns ?? null)}`
    : '空闲';

  // 待办数量（用于结束回合按钮徽章）
  const todoCount = useMemo(() => {
    let count = 0;
    for (const u of player.units) if (u.ownerId === player.id && u.moveLeft > 0 && !u.hasActed) count++;
    for (const c of player.cities) if (c.ownerId === player.id && c.queue.length === 0) count++;
    if (!player.currentResearch && Object.values(TECHS).some((t) => !player.researchedTechs.includes(t.id))) count++;
    if (!player.currentCivic && Object.values(CIVICS).some((c) => !player.researchedCivics.includes(c.id))) count++;
    return count;
  }, [player]);

  const scrollToResearch = () => researchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToCivics = () => civicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Keyboard shortcuts
  const cycleUnitOrCity = useCallback((direction: 1 | -1) => {
    const ownUnits = player.units.filter((u) => u.ownerId === player.id && u.moveLeft > 0 && !u.hasActed);
    const ownCities = player.cities.filter((c) => c.ownerId === player.id && c.queue.length === 0);
    const targets: { kind: 'unit' | 'city'; id: string }[] = [
      ...ownUnits.map((u) => ({ kind: 'unit' as const, id: u.id })),
      ...ownCities.map((c) => ({ kind: 'city' as const, id: c.id })),
    ];
    if (targets.length === 0) return;
    const currentId = selectedUnitId ?? selectedCityId ?? null;
    let idx = targets.findIndex((t) => t.id === currentId);
    if (idx === -1) idx = direction === 1 ? 0 : targets.length - 1;
    else idx = (idx + direction + targets.length) % targets.length;
    const target = targets[idx];
    if (target.kind === 'unit') selectUnit(target.id);
    else selectCity(target.id);
  }, [player.cities, player.units, selectedCityId, selectedUnitId, selectCity, selectUnit]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showHelp) {
        if (e.key === 'Escape') setShowHelp(false);
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        endTurn();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        cycleUnitOrCity(e.shiftKey ? -1 : 1);
      } else if (e.key === 'Escape') {
        selectUnit(null);
        selectCity(null);
      } else if (e.key === 'Enter') {
        // 当前选中单位/城市的主要动作由侧栏按钮处理，这里仅聚焦
      } else if (e.key === '?' || e.key === '？') {
        setShowHelp(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cycleUnitOrCity, endTurn, selectCity, selectUnit, showHelp]);

  const panel: React.CSSProperties = {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.sm,
    background: theme.colors.bgCard,
    borderRadius: theme.borderRadius,
  };
  const item: React.CSSProperties = {
    cursor: 'pointer',
    padding: '2px 4px',
    fontFamily: theme.fontFamily,
  };
  const btn: React.CSSProperties = {
    padding: '4px 8px',
    background: theme.colors.primary,
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: theme.borderRadius,
    fontFamily: theme.fontFamily,
    fontSize: 12,
  };

  return (
    <div
      style={{
        fontFamily: theme.fontFamily,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: theme.colors.bg,
        color: theme.colors.text,
        position: 'relative',
      }}
    >
      {/* 屏幕阅读器播报区 */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {[
          message,
          eventLog.length > 0 ? `最新事件：${formatEvent(state, eventLog[eventLog.length - 1])}` : '',
          unit ? `选中单位：${UNITS[unit.type]?.name ?? unit.type}` : city ? `选中城市：${city.name}` : '',
          todoCount > 0 ? `${todoCount} 项待办` : '',
        ].filter(Boolean).join('；')}
      </div>

      <TopBar
        civName={civ?.name ?? player.civId}
        turn={state.turn}
        player={player}
        yieldTotal={y}
        message={message}
        onEndTurn={endTurn}
        onSave={save}
        onLoad={load}
        onNewGame={newGame}
        onShowHelp={() => setShowHelp(true)}
        todoCount={todoCount}
      />

      {state.status === 'finished' && (
        <div style={{ padding: 8, background: '#3a2a1e', color: '#fc8', textAlign: 'center' }}>
          游戏结束 - 胜者：{state.winner}（{state.victoryType}）
        </div>
      )}

      {eventLog.length > 0 && state.status === 'active' && (
        <div
          style={{
            position: 'absolute',
            right: 290,
            top: 50,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            pointerEvents: 'none',
          }}
        >
          {eventLog.slice(-4).map((e, i) => (
            <div
              key={`${e.kind}-${e.turn}-${i}`}
              style={{
                padding: '3px 8px',
                background: 'rgba(0,0,0,0.6)',
                color: '#fc8',
                borderRadius: theme.borderRadius,
                fontSize: 11,
                animation: 'fadein 0.3s',
              }}
            >
              {formatEvent(state, e)}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes fadein { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1 } }`}</style>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, overflow: 'hidden', padding: 0 }}>
          <PixiMap onRequestAttack={(targetTile) => {
            if (selectedUnitId) setPendingConfirm({ type: 'attack', attackerId: selectedUnitId, targetTile });
          }} />
        </div>
        <div
          style={{
            width: 300,
            padding: theme.spacing.md,
            background: theme.colors.bgPanel,
            overflowY: 'auto',
            fontSize: 12,
            fontFamily: theme.fontFamily,
          }}
        >
          {/* 文明头像与进度 */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: theme.spacing.md }}>
            <img
              src={portraitAssetUrl(player.civId)}
              alt={civ?.name}
              style={{ width: 56, height: 70, objectFit: 'cover', borderRadius: theme.borderRadius, border: `1px solid ${theme.colors.accent}` }}
            />
            <div>
              <div style={{ fontSize: 13, color: theme.colors.accent }}>{civ?.name ?? player.civId}</div>
              <div style={{ fontSize: 10, color: theme.colors.textDim }}>{civ?.ability.name}</div>
            </div>
          </div>

          <div style={{ ...panel, background: theme.colors.bg }}>
            <b>进度</b>
            <div style={{ fontSize: 11, color: theme.colors.textMuted }}>
              时代：{computeEra(player.researchedTechs)} · 回合 {state.turn}/{state.config.maxTurns}
            </div>
            <div style={{ fontSize: 11, color: theme.colors.science }}>
              科技胜利：{player.cities.find((c) => c.spaceProject)?.spaceProject ? `阶段 ${player.cities.find((c) => c.spaceProject)!.spaceProject!.stage}` : '未开始'}
            </div>
            <div style={{ fontSize: 11, color: theme.colors.production }}>
              统治：剩余首都 {state.players.filter((p) => p.id !== player.id && p.capitalCityId).length}
            </div>
            <div style={{ fontSize: 11, color: '#fc8' }}>
              分数：{playerScore(player)} · 排名 {[...state.players].sort((a, b) => playerScore(b) - playerScore(a)).findIndex((p) => p.id === player.id) + 1}/{state.players.length}
            </div>
          </div>

          {/* 事件日志 */}
          {eventLog.length > 0 && (
            <div style={{ ...panel, background: theme.colors.bg }}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowEventLog(!showEventLog)}
                role="button"
                tabIndex={0}
                aria-expanded={showEventLog}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setShowEventLog(!showEventLog); }}
              >
                <b>事件日志</b>
                <span style={{ color: theme.colors.textDim, fontSize: 11 }}>{showEventLog ? '收起' : '展开'}</span>
              </div>
              <div style={{ maxHeight: showEventLog ? 200 : 72, overflow: 'hidden', transition: 'max-height 0.2s' }}>
                {[...eventLog].reverse().map((e, i) => (
                  <div key={`${e.kind}-${e.turn}-${i}`} style={{ fontSize: 11, color: '#fc8', padding: '2px 0', borderBottom: `1px solid ${theme.colors.border}` }}>
                    {formatEvent(state, e)}
                  </div>
                ))}
              </div>
            </div>
          )}

          <TurnTodoPanel
            player={player}
            onSelectUnit={selectUnit}
            onSelectCity={selectCity}
            onOpenResearch={scrollToResearch}
            onOpenCivics={scrollToCivics}
          />

          {/* 研究 */}
          <div ref={researchRef} style={{ marginBottom: theme.spacing.md }}>
            <b>研究</b>：{player.currentResearch ? TECHS[player.currentResearch.techId]?.name : '无'} ({researchProgress})
            {researchInfo && (
              <div style={{ height: 4, background: '#333', borderRadius: theme.borderRadius, marginTop: 4 }}>
                <div style={{ height: 4, width: `${researchInfo.pct}%`, background: theme.colors.science, borderRadius: theme.borderRadius }} />
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              {availableTechs.map((t) => (
                <TechTooltip key={t.id} tech={t} turnsLeft={turnsToCompleteTech(state, player, t.id, 0)}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`研究 ${t.name}`}
                    style={{ ...item, color: theme.colors.science, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => command({ kind: 'research', techId: t.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') command({ kind: 'research', techId: t.id }); }}
                  >
                    <img src={`/assets/tech/${t.id}.png`} alt="" width={18} height={18} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    • {t.name} ({t.cost})
                  </div>
                </TechTooltip>
              ))}
            </div>
          </div>

          {/* 市政 */}
          <div ref={civicRef} style={{ marginBottom: theme.spacing.md }}>
            <b>市政</b>：{player.currentCivic ? `${CIVICS[player.currentCivic.civicId]?.name} (${civicProgress})` : '无'}
            {civicInfo && (
              <div style={{ height: 4, background: '#333', borderRadius: theme.borderRadius, marginTop: 4 }}>
                <div style={{ height: 4, width: `${civicInfo.pct}%`, background: theme.colors.culture, borderRadius: theme.borderRadius }} />
              </div>
            )}
            <div style={{ marginTop: 4 }}>
              {availableCivics.map((c) => (
                <CivicTooltip key={c.id} civic={c} turnsLeft={turnsToCompleteCivic(state, player, c.id, 0)}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`研究市政 ${c.name}`}
                    style={{ ...item, color: theme.colors.culture, display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={() => command({ kind: 'researchCivic', civicId: c.id })}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') command({ kind: 'researchCivic', civicId: c.id }); }}
                  >
                    <img src={`/assets/civic/${c.id}.png`} alt="" width={18} height={18} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    • {c.name} ({c.cost})
                  </div>
                </CivicTooltip>
              ))}
            </div>
          </div>

          {/* 政体与政策卡 */}
          <div style={{ marginBottom: theme.spacing.md }}>
            <b>政体</b>：{GOVERNMENTS[player.government]?.name}
            <div style={{ fontSize: 10, color: theme.colors.textMuted, marginBottom: 2 }}>
              槽位：
              {player.policySlots.map((s, i) => (
                <span key={i} style={{ marginRight: 4 }}>
                  [{policySlotTypeLabel(player, i)}]
                  {s ? (
                    <Tooltip content={POLICY_CARDS[s]?.name ?? s}>
                      <span style={{ color: theme.colors.accent, cursor: 'help' }}>{POLICY_CARDS[s]?.name ?? s}</span>
                    </Tooltip>
                  ) : (
                    <span style={{ color: theme.colors.textDim }}>空</span>
                  )}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: theme.colors.textDim }}>切换：</div>
            {Object.values(GOVERNMENTS).filter((g) => canChangeGovernment(player, g.id) && g.id !== player.government).slice(0, 5).map((g) => (
              <button key={g.id} style={{ ...btn, margin: 1, fontSize: 10, background: theme.colors.government }} onClick={() => command({ kind: 'changeGovernment', governmentType: g.id })}>
                {g.name}
              </button>
            ))}
            <div style={{ fontSize: 10, color: theme.colors.textDim, marginTop: 4 }}>政策卡（点选装入空槽）：</div>
            {Object.values(POLICY_CARDS).filter((c) => player.researchedCivics.includes(c.unlockCivic) && c.type !== 'diplomatic').slice(0, 8).map((c) => {
              const slot = firstEmptySlot(player, c.type);
              const canAssign = slot !== null && canSwitchPolicy(player, c.id, slot);
              return (
                <button
                  key={c.id}
                  disabled={!canAssign}
                  style={{
                    ...btn,
                    margin: 1,
                    fontSize: 10,
                    background: canAssign ? theme.colors.primary : theme.colors.disabled,
                    opacity: canAssign ? 1 : 0.5,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                  onClick={() => slot !== null && command({ kind: 'switchPolicy', cardId: c.id, slotIndex: slot })}
                >
                  <img src={`/assets/policy/${c.id}.png`} alt="" width={14} height={14} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* 外交 */}
          <div style={{ marginBottom: theme.spacing.md }}>
            <b>外交</b>
            {state.players.filter((p) => p.id !== player.id).map((opponent) => {
              const oppCiv = CIVILIZATIONS[opponent.civId];
              const atWar = state.diplomacy[player.id]?.[opponent.id] === 'war';
              return (
                <div key={opponent.id} style={{ ...panel, background: atWar ? '#3a1a1a' : '#1a2a1e', padding: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <img src={portraitAssetUrl(opponent.civId)} alt={oppCiv?.name} width={28} height={36} style={{ borderRadius: 3, border: `1px solid ${theme.colors.accent}`, objectFit: 'cover' }} />
                    <div>
                      <div>{oppCiv?.name} {atWar ? '战争' : '和平'}</div>
                      <div style={{ fontSize: 10, color: theme.colors.textDim }}>分数 {playerScore(opponent)} · 城 {opponent.cities.length} · 单位 {opponent.units.length}</div>
                    </div>
                  </div>
                  {atWar ? (
                    <button style={{ ...btn, marginTop: 4, fontSize: 10, background: theme.colors.primary }} onClick={() => command({ kind: 'suePeace', targetCivId: opponent.id })}>求和</button>
                  ) : (
                    <button style={{ ...btn, marginTop: 4, fontSize: 10, background: theme.colors.danger }} onClick={() => setPendingConfirm({ type: 'war', targetCivId: opponent.id })}>宣战</button>
                  )}
                </div>
              );
            })}
          </div>

          {/* 单位 */}
          {unit && unit.ownerId === player.id && (
            <div style={panel}>
              <b>单位</b>：{UNITS[unit.type]?.name}
              <div>HP {unit.hp} 移动 {unit.moveLeft}/{UNITS[unit.type]?.move}</div>
              {unit.type === 'settler' && (
                <button style={btn} onClick={() => setPendingConfirm({ type: 'foundCity', unitId: unit.id, name: `${civ?.id}-${player.cities.length + 1}` })}>建城</button>
              )}
              {unit.type === 'builder' && unit.charges !== undefined && (
                <div style={{ marginTop: 6 }}>
                  <div>充能 {unit.charges}</div>
                  <div style={{ marginTop: 4 }}>改良：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {Object.values(IMPROVEMENTS).filter((imp) => canBuildImprovement(state, unit, imp.id)).map((imp) => (
                      <button
                        key={imp.id}
                        style={{ ...btn, fontSize: 10, padding: '2px 6px' }}
                        onClick={() => command({ kind: 'buildImprovement', builderId: unit.id, improvementId: imp.id })}
                      >
                        {IMPROVEMENT_NAMES[imp.id] ?? imp.id}
                      </button>
                    ))}
                    {Object.values(IMPROVEMENTS).filter((imp) => canBuildImprovement(state, unit, imp.id)).length === 0 && (
                      <span style={{ color: theme.colors.textDim, fontSize: 11 }}>当前地块无可执行改良</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {unit && unit.ownerId !== player.id && (
            <div style={panel}>
              <b>敌方单位</b>：{UNITS[unit.type]?.name}
              <div>HP {unit.hp} · 所属 {CIVILIZATIONS[state.players.find((p) => p.id === unit.ownerId)?.civId ?? '']?.name}</div>
            </div>
          )}

          {/* 城市 */}
          {city && city.ownerId === player.id && (
            <div style={panel}>
              <b>{city.name}</b> (人口 {city.population})
              <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>
                领土 {city.territory.length} · 住房 {city.housing} · 人口增长 {formatTurns(turnsToPopulationGrowth(state, city))}
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 6, flexWrap: 'wrap' }}>
                {(() => {
                  const cy = cityYield(state, city);
                  const tokens = [
                    { label: '🍞', value: cy.food, color: theme.colors.food },
                    { label: '⚒', value: cy.production, color: theme.colors.production },
                    { label: '💰', value: cy.gold, color: theme.colors.gold },
                    { label: '📖', value: cy.science, color: theme.colors.science },
                    { label: '🎭', value: cy.culture, color: theme.colors.culture },
                    { label: '⛪', value: cy.faith, color: theme.colors.faith },
                  ];
                  return tokens.map((t) => t.value !== 0 && (
                    <span key={t.label} style={{ color: t.color }}>{t.label}{t.value > 0 ? `+${t.value}` : t.value}</span>
                  ));
                })()}
              </div>
              <div style={{ marginTop: 4 }}>队列：</div>
              {city.queue.length === 0 ? <div style={{ color: theme.colors.textDim }}>空</div> : city.queue.map((q, i) => {
                const cost = productionCost(state, city, q);
                const name = q.kind === 'unit' ? UNITS[q.id]?.name : q.kind === 'building' ? BUILDINGS[q.id]?.name : q.kind === 'wonder' ? WONDERS[q.id]?.name : q.id;
                const pct = cost > 0 && isFinite(cost) ? Math.min(100, Math.round((q.progress / cost) * 100)) : 0;
                const eta = turnsToCompleteProduction(state, city, cost, q.progress);
                return (
                  <div key={i} style={{ fontSize: 11 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{name}</span>
                      <span style={{ color: theme.colors.textDim }}>{pct}% · {formatTurns(eta)}</span>
                    </div>
                    <div style={{ height: 4, background: '#333', borderRadius: theme.borderRadius, marginTop: 1 }}>
                      <div style={{ height: 4, width: `${pct}%`, background: theme.colors.primary, borderRadius: theme.borderRadius }} />
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
                <button key={b.id} style={{ ...btn, margin: 1, fontSize: 11, background: theme.colors.info, display: 'inline-flex', alignItems: 'center', gap: 3 }} onClick={() => command({ kind: 'buildBuilding', cityId: city.id, buildingType: b.id })}>
                  <img src={`/assets/buildings/${b.id}.png`} alt="" width={16} height={16} style={{ borderRadius: 2 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  {b.name}
                </button>
              ))}
            </div>
          )}

          {city && city.ownerId !== player.id && (
            <div style={panel}>
              <b>敌方城市</b>：{city.name}
              <div>人口 {city.population} · HP {city.hp} · 所属 {CIVILIZATIONS[state.players.find((p) => p.id === city.ownerId)?.civId ?? '']?.name}</div>
            </div>
          )}

          {/* 地块信息 */}
          {hoveredTile && (
            <div style={{ ...panel, background: theme.colors.bg }}>
              <b>地块信息</b>
              <div style={{ fontSize: 11, color: theme.colors.textMuted, whiteSpace: 'pre-line' }}>{describeTile(state, hoveredTile)}</div>
              {unit && unit.ownerId === player.id && (() => {
                const pv = previewCombat(state, unit.id, hoveredTile);
                if (!pv) return null;
                return (
                  <div style={{ fontSize: 11, color: '#fc8', marginTop: 4 }}>
                    战斗：我 CS{pv.attackerCS} vs 敌 CS{pv.defenderCS}
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

      {pendingConfirm?.type === 'war' && (() => {
        const opponent = state.players.find((p) => p.id === pendingConfirm.targetCivId);
        const oppCiv = opponent ? CIVILIZATIONS[opponent.civId] : null;
        return (
          <ConfirmDialog
            isOpen
            title="确认宣战"
            danger
            onCancel={() => setPendingConfirm(null)}
            onConfirm={() => { command({ kind: 'declareWar', targetCivId: pendingConfirm.targetCivId }); setPendingConfirm(null); }}
          >
            确定向 <strong>{oppCiv?.name ?? '未知文明'}</strong> 宣战吗？
            <div style={{ marginTop: 8, color: theme.colors.textDim, fontSize: 12 }}>
              宣战后双方单位可互相攻击，且无法立即恢复和平。
            </div>
          </ConfirmDialog>
        );
      })()}

      {pendingConfirm?.type === 'attack' && (() => {
        const attacker = selectedUnitId ? findUnit(state, selectedUnitId) : null;
        const pv = attacker ? previewCombat(state, attacker.id, pendingConfirm.targetTile) : null;
        const targetUnit = state.players.flatMap((p) => p.units).find((u) => u.tile.q === pendingConfirm.targetTile.q && u.tile.r === pendingConfirm.targetTile.r);
        const targetCity = cityAt(state, pendingConfirm.targetTile);
        const targetName = targetUnit ? UNITS[targetUnit.type]?.name : targetCity ? targetCity.name : '目标';
        return (
          <ConfirmDialog
            isOpen
            title="确认攻击"
            danger
            onCancel={() => setPendingConfirm(null)}
            onConfirm={() => { command({ kind: 'attack', attackerId: pendingConfirm.attackerId, targetTile: pendingConfirm.targetTile }); setPendingConfirm(null); }}
          >
            {pv ? (
              <div>
                <div>攻击：{UNITS[attacker!.type]?.name}（CS{pv.attackerCS}） → {targetName}（CS{pv.defenderCS}）</div>
                <div style={{ marginTop: 6, color: theme.colors.production }}>
                  预计伤害：{pv.estDamage}{pv.target === 'unit' ? `（目标 HP${pv.defenderHp}）` : '（城市）'}
                </div>
              </div>
            ) : (
              <div>确定攻击 {targetName} 吗？</div>
            )}
          </ConfirmDialog>
        );
      })()}

      {pendingConfirm?.type === 'foundCity' && (() => {
        const settler = findUnit(state, pendingConfirm.unitId);
        const tile = settler ? getTile(state.map, settler.tile) : null;
        return (
          <ConfirmDialog
            isOpen
            title="确认建城"
            onCancel={() => setPendingConfirm(null)}
            onConfirm={() => { command({ kind: 'foundCity', unitId: pendingConfirm.unitId, name: pendingConfirm.name }); setPendingConfirm(null); }}
          >
            在 ({settler?.tile.q}, {settler?.tile.r}) 建立城市 <strong>{pendingConfirm.name}</strong> 吗？
            {tile && (
              <div style={{ marginTop: 8, color: theme.colors.textDim, fontSize: 12 }}>
                中心格：{tile.terrain}{tile.feature ? ` / ${tile.feature}` : ''}
              </div>
            )}
          </ConfirmDialog>
        );
      })()}

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}
