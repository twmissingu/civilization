// 选中城市面板
import { useGame } from './store';
import { currentPlayer, findCity } from '../logic/state/commands';
import { cityYield } from '../logic/state/yield';
import { productionCost } from '../logic/state/city';
import { UNITS, BUILDINGS, WONDERS, CIVILIZATIONS } from '../gamedata';
import { turnsToCompleteProduction, turnsToPopulationGrowth, formatTurns } from './eta';
import { theme } from './theme';
import { panelStyle, btnStyle } from './uiStyles';
import { AssetImage } from './AssetImage';

const YIELD_ICON: Record<keyof typeof theme.colors & ('food' | 'production' | 'gold' | 'science' | 'culture' | 'faith'), string> = {
  food: '🍞',
  production: '⚒',
  gold: '💰',
  science: '📖',
  culture: '🎭',
  faith: '⛪',
};

export function CityPanel() {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const player = currentPlayer(state);
  const city = selectedCityId ? findCity(state, selectedCityId) : null;
  const builtWonderIds = new Set(
    state.players.flatMap((p) => p.cities.flatMap((c) => c.wonders.map((w) => w.id)))
  );

  if (!city) return null;

  if (city.ownerId === player.id) {
    const cy = cityYield(state, city);
    const tokens = [
      { label: YIELD_ICON.food, value: cy.food, color: theme.colors.food },
      { label: YIELD_ICON.production, value: cy.production, color: theme.colors.production },
      { label: YIELD_ICON.gold, value: cy.gold, color: theme.colors.gold },
      { label: YIELD_ICON.science, value: cy.science, color: theme.colors.science },
      { label: YIELD_ICON.culture, value: cy.culture, color: theme.colors.culture },
      { label: YIELD_ICON.faith, value: cy.faith, color: theme.colors.faith },
    ];

    return (
      <div style={panelStyle}>
        <b>{city.name}</b> (人口 {city.population})
        <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>
          领土 {city.territory.length} · 住房 {city.housing} · 人口增长 {formatTurns(turnsToPopulationGrowth(state, city))}
        </div>
        <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 6, flexWrap: 'wrap' }}>
          {tokens.map((t) =>
            t.value !== 0 ? (
              <span key={t.label} style={{ color: t.color }}>
                {t.label}{t.value > 0 ? `+${t.value}` : t.value}
              </span>
            ) : null
          )}
        </div>
        <div style={{ marginTop: 4 }}>队列：</div>
        {city.queue.length === 0 ? (
          <div style={{ color: theme.colors.textDim }}>空</div>
        ) : (
          city.queue.map((q, i) => {
            const cost = productionCost(state, city, q);
            const name =
              q.kind === 'unit'
                ? UNITS[q.id]?.name
                : q.kind === 'building'
                ? BUILDINGS[q.id]?.name
                : q.kind === 'wonder'
                ? WONDERS[q.id]?.name
                : q.id;
            const pct = cost > 0 && isFinite(cost) ? Math.min(100, Math.round((q.progress / cost) * 100)) : 0;
            const eta = turnsToCompleteProduction(state, city, cost, q.progress);
            const iconSrc = q.kind === 'unit' ? `/assets/units/${q.id}.png` : q.kind === 'building' ? `/assets/buildings/${q.id}.png` : q.kind === 'wonder' ? `/assets/wonders/${q.id}.png` : null;
            return (
              <div key={i} style={{ fontSize: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {iconSrc && <AssetImage src={iconSrc} alt="" width={14} height={14} />}
                    {name}
                  </span>
                  <span style={{ color: theme.colors.textDim }}>{pct}% · {formatTurns(eta)}</span>
                </div>
                <div style={{ height: 4, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 1 }}>
                  <div
                    style={{
                      height: 4,
                      width: `${pct}%`,
                      background: theme.colors.primary,
                      borderRadius: theme.borderRadius,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}
        <div style={{ marginTop: 6 }}>训练单位：</div>
        {Object.values(UNITS)
          .filter((u) => u.unlockTech === 'initial' || player.researchedTechs.includes(u.unlockTech))
          .slice(0, 6)
          .map((u) => (
            <button
              key={u.id}
              style={{ ...btnStyle, margin: 1, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => command({ kind: 'trainUnit', cityId: city.id, unitType: u.id })}
            >
              <AssetImage src={`/assets/units/${u.id}.png`} alt="" width={14} height={14} />
              {u.name}
            </button>
          ))}
        <div style={{ marginTop: 6 }}>建造建筑：</div>
        {Object.values(BUILDINGS)
          .filter(
            (b) =>
              (!b.unlockTech || player.researchedTechs.includes(b.unlockTech)) &&
              (!b.unlockCivic || player.researchedCivics.includes(b.unlockCivic)) &&
              !city.buildings.includes(b.id) &&
              (b.district === 'city_center' || city.districts.some((d) => d.type === b.district))
          )
          .slice(0, 6)
          .map((b) => (
            <button
              key={b.id}
              style={{ ...btnStyle, margin: 1, fontSize: 11, background: theme.colors.info, display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => command({ kind: 'buildBuilding', cityId: city.id, buildingType: b.id })}
            >
              <AssetImage src={`/assets/buildings/${b.id}.png`} alt="" width={16} height={16} />
              {b.name}
            </button>
          ))}
        <div style={{ marginTop: 6 }}>建造奇观：</div>
        {Object.values(WONDERS)
          .filter(
            (w) =>
              (!w.unlockTech || player.researchedTechs.includes(w.unlockTech)) &&
              (!w.unlockCivic || player.researchedCivics.includes(w.unlockCivic)) &&
              !builtWonderIds.has(w.id) &&
              !city.queue.some((q) => q.kind === 'wonder' && q.id === w.id)
          )
          .slice(0, 5)
          .map((w) => (
            <button
              key={w.id}
              style={{ ...btnStyle, margin: 1, fontSize: 11, background: theme.colors.government, display: 'inline-flex', alignItems: 'center', gap: 3 }}
              onClick={() => command({ kind: 'buildWonder', cityId: city.id, wonderType: w.id, tile: city.tile })}
            >
              <AssetImage src={`/assets/wonders/${w.id}.png`} alt="" width={16} height={16} />
              {w.name} ({w.cost})
            </button>
          ))}
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <b>敌方城市</b>：{city.name}
      <div>人口 {city.population} · HP {city.hp} · 所属 {CIVILIZATIONS[state.players.find((p) => p.id === city.ownerId)?.civId ?? '']?.name}</div>
    </div>
  );
}
