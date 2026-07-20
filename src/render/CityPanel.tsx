// 选中城市面板——渐进增强版
// 功能：区域放置、金币买地、队列管理(上下移/删除)、市民分配
import { useGame, useCurrentPlayer } from './store';
import { findCity, getCityYield, getProductionCost, getBuyTilePrice } from '../logic/state/query';
import { DISTRICTS, UNITS, BUILDINGS, WONDERS, CIVILIZATIONS } from '../gamedata';
import type { DistrictType } from '../gamedata';
import { turnsToCompleteProduction, turnsToPopulationGrowth, formatTurns } from './eta';
import { hexEquals, hexInRange } from '../logic/hex';
import type { HexCoord } from '../types';
import type { CityState, PlayerState } from '../logic/state/types';
import type { GameCommand } from '../logic/state/commands';
import { theme } from './theme';
import { panelStyle, btnStyle } from './uiStyles';
import { AssetImage } from './AssetImage';
import { YieldValue } from './YieldIcon';

// 子组件 prop 接口
interface CitySubProps { city: CityState; command: (cmd: GameCommand) => void; }
interface CityPlayerSubProps extends CitySubProps { player: PlayerState; }

export function CityPanel() {
  const state = useGame((s) => s.state);
  const command = useGame((s) => s.command);
  const selectedCityId = useGame((s) => s.selectedCityId);
  const player = useCurrentPlayer();
  const city = selectedCityId ? findCity(state, selectedCityId) : null;
  const builtWonderIds = new Set(
    state.players.flatMap((p) => p.cities.flatMap((c) => c.wonders.map((w) => w.id)))
  );

  if (!city) return null;

  if (city.ownerId !== player.id) {
    return (
      <div style={panelStyle}>
        <b>敌方城市</b>：{city.name}
        <div>人口 {city.population} · HP {city.hp} · 所属 {CIVILIZATIONS[state.players.find((p) => p.id === city.ownerId)?.civId ?? '']?.name}</div>
      </div>
    );
  }

  const cy = getCityYield(state, city.id);

  return (
    <div style={panelStyle}>
      <b>{city.name}</b> (人口 {city.population})
      <div style={{ fontSize: 11, color: theme.colors.textMuted, marginBottom: 4 }}>
        领土 {city.territory.length} · 住房 {city.housing} · 人口增长 {formatTurns(turnsToPopulationGrowth(state, city))}
      </div>
      <div style={{ display: 'flex', gap: 8, fontSize: 11, marginBottom: 6, flexWrap: 'wrap' }}>
        <YieldValue type="food" value={cy.food} />
        <YieldValue type="production" value={cy.production} />
        <YieldValue type="gold" value={cy.gold} />
        <YieldValue type="science" value={cy.science} />
        <YieldValue type="culture" value={cy.culture} />
        <YieldValue type="faith" value={cy.faith} />
      </div>

      {/* 生产队列 */}
      <ProductionQueueSection city={city} command={command} />

      {/* 训练单位 */}
      <TrainUnitSection city={city} player={player} command={command} />

      {/* 建造建筑 */}
      <BuildBuildingSection city={city} player={player} command={command} />

      {/* 放置区域 */}
      <DistrictSection city={city} player={player} command={command} />

      {/* 建造奇观 */}
      <WonderSection city={city} player={player} builtWonderIds={builtWonderIds} command={command} />

      {/* 金币买地 */}
      <BuyTileSection city={city} player={player} command={command} />

      {/* 市民分配 */}
      <CitizenSection city={city} command={command} />
    </div>
  );
}

// ---------- 子组件 ----------

function ProductionQueueSection({ city, command }: CitySubProps) {
  const state = useGame.getState().state;
  return (
    <div style={{ marginTop: 4 }}>
      <div>队列：</div>
      {city.queue.length === 0 ? (
        <div style={{ color: theme.colors.textDim }}>空</div>
      ) : (
        city.queue.map((q: any, i: number) => {
          const cost = getProductionCost(state, city.id, q);
          const name = q.kind === 'unit' ? UNITS[q.id]?.name
            : q.kind === 'building' ? BUILDINGS[q.id]?.name
            : q.kind === 'wonder' ? WONDERS[q.id]?.name : q.id;
          const pct = cost > 0 && isFinite(cost) ? Math.min(100, Math.round((q.progress / cost) * 100)) : 0;
          const eta = turnsToCompleteProduction(state, city, cost, q.progress);
          return (
            <div key={i} style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{name}</span>
                  <span style={{ color: theme.colors.textDim }}>{pct}% · {formatTurns(eta)}</span>
                </div>
                <div style={{ height: 4, background: theme.colors.progressTrack, borderRadius: theme.borderRadius, marginTop: 1 }}>
                  <div style={{ height: 4, width: `${pct}%`, background: theme.colors.primary, borderRadius: theme.borderRadius }} />
                </div>
              </div>
              {/* 队列操作按钮 */}
              {i > 0 && (
                <button style={{ ...miniBtn, fontSize: 10 }} onClick={() => command({ kind: 'reorderQueue', cityId: city.id, fromIndex: i, toIndex: i - 1 })} title="上移">↑</button>
              )}
              {i < city.queue.length - 1 && (
                <button style={{ ...miniBtn, fontSize: 10 }} onClick={() => command({ kind: 'reorderQueue', cityId: city.id, fromIndex: i, toIndex: i + 1 })} title="下移">↓</button>
              )}
              <button style={{ ...miniBtn, fontSize: 10, color: theme.colors.danger }} onClick={() => command({ kind: 'removeFromQueue', cityId: city.id, index: i })} title="移除">✕</button>
            </div>
          );
        })
      )}
    </div>
  );
}

function TrainUnitSection({ city, player, command }: CityPlayerSubProps) {
  return (
    <>
      <div style={{ marginTop: 6 }}>训练单位：</div>
      {Object.values(UNITS).filter((u: any) => u.unlockTech === 'initial' || player.researchedTechs.includes(u.unlockTech)).slice(0, 6).map((u: any) => (
        <button key={u.id} style={{ ...btnStyle, margin: 1, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          onClick={() => command({ kind: 'trainUnit', cityId: city.id, unitType: u.id })}>
          <AssetImage src={`/assets/units/${u.id}.png`} alt="" width={14} height={14} />
          {u.name}
        </button>
      ))}
    </>
  );
}

function BuildBuildingSection({ city, player, command }: CityPlayerSubProps) {
  return (
    <>
      <div style={{ marginTop: 6 }}>建造建筑：</div>
      {Object.values(BUILDINGS).filter((b: any) =>
        (!b.unlockTech || player.researchedTechs.includes(b.unlockTech)) &&
        (!b.unlockCivic || player.researchedCivics.includes(b.unlockCivic)) &&
        !city.buildings.includes(b.id) &&
        (b.district === 'city_center' || city.districts.some((d: any) => d.type === b.district))
      ).slice(0, 6).map((b: any) => (
        <button key={b.id} style={{ ...btnStyle, margin: 1, fontSize: 11, background: theme.colors.info, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          onClick={() => command({ kind: 'buildBuilding', cityId: city.id, buildingType: b.id })}>
          <AssetImage src={`/assets/buildings/${b.id}.png`} alt="" width={16} height={16} />
          {b.name}
        </button>
      ))}
    </>
  );
}

function DistrictSection({ city, player, command }: CityPlayerSubProps) {
  const maxDistricts = Math.floor(city.population / 3) + 1;
  const canPlaceMore = city.districts.length < maxDistricts;

  return (
    <>
      <div style={{ marginTop: 6 }}>区域 ({city.districts.length}/{maxDistricts})：</div>
      {Object.values(DISTRICTS).filter((d: any) => {
        const def = d as { id: DistrictType; unlockTech: string; name: string };
        if (def.id === 'theater') return player.researchedCivics.includes('drama_poetry');
        return def.unlockTech === 'astrology' || player.researchedTechs.includes(def.unlockTech);
      }).slice(0, 5).map((d: any) => {
        const def = d as { id: DistrictType; name: string };
        const alreadyPlaced = city.districts.some((dd: any) => dd.type === def.id) || city.queue.some((qi: any) => qi.kind === 'district' && qi.id === def.id);
        return (
          <button key={def.id} disabled={!canPlaceMore || alreadyPlaced}
            style={{ ...btnStyle, margin: 1, fontSize: 11, background: canPlaceMore && !alreadyPlaced ? theme.colors.government : theme.colors.disabled, display: 'inline-flex', alignItems: 'center', gap: 3 }}
            onClick={() => {
              // 找第一个可用格子（领土内非城中心非已有区域）
              const tile = city.territory.find((t: HexCoord) =>
                !hexEquals(t, city.tile) && !city.districts.some((dd: any) => hexEquals(dd.tile, t))
              );
              if (tile) command({ kind: 'placeDistrict', cityId: city.id, districtType: def.id, tile });
            }}>
            <AssetImage src={`/assets/districts/${def.id}.png`} alt="" width={14} height={14} />
            {def.name}{alreadyPlaced ? ' (已有)' : ''}
          </button>
        );
      })}
    </>
  );
}

function WonderSection({ city, player, builtWonderIds, command }: CityPlayerSubProps & { builtWonderIds: Set<string> }) {
  return (
    <>
      <div style={{ marginTop: 6 }}>建造奇观：</div>
      {Object.values(WONDERS).filter((w: any) =>
        (!w.unlockTech || player.researchedTechs.includes(w.unlockTech)) &&
        (!w.unlockCivic || player.researchedCivics.includes(w.unlockCivic)) &&
        !builtWonderIds.has(w.id) &&
        !city.queue.some((q: any) => q.kind === 'wonder' && q.id === w.id)
      ).slice(0, 5).map((w: any) => (
        <button key={w.id} style={{ ...btnStyle, margin: 1, fontSize: 11, background: theme.colors.government, display: 'inline-flex', alignItems: 'center', gap: 3 }}
          onClick={() => command({ kind: 'buildWonder', cityId: city.id, wonderType: w.id, tile: city.tile })}>
          <AssetImage src={`/assets/wonders/${w.id}.png`} alt="" width={16} height={16} />
          {w.name} ({w.cost})
        </button>
      ))}
    </>
  );
}

function BuyTileSection({ city, player, command }: CityPlayerSubProps) {
  const state = useGame.getState().state;
  // 找可买地块：城中心 3 格内、未归属、非其他城市领土
  const buyable = hexInRange(city.tile, 3).filter((t) => {
    if (city.territory.some((ct: HexCoord) => hexEquals(ct, t))) return false;
    if (!hexInRange(city.tile, 3).some((ct) => hexEquals(ct, t))) return false;
    // 不属于其他城市
    for (const p of state.players) for (const c of p.cities) {
      if (c.id === city.id) continue;
      if (c.territory.some((ct: HexCoord) => hexEquals(ct, t))) return false;
    }
    return true;
  }).slice(0, 5);

  if (buyable.length === 0) return null;

  return (
    <>
      <div style={{ marginTop: 6 }}>金币买地（金 {player.gold}）：</div>
      {buyable.map((tile: HexCoord) => {
        const price = getBuyTilePrice(state, city.id, tile);
        return (
          <button key={`${tile.q},${tile.r}`} disabled={player.gold < price}
            style={{ ...btnStyle, margin: 1, fontSize: 10, background: player.gold >= price ? theme.colors.gold : theme.colors.disabled }}
            onClick={() => command({ kind: 'buyTile', cityId: city.id, tile })}>
            ({tile.q},{tile.r}) {price}金
          </button>
        );
      })}
    </>
  );
}

function CitizenSection({ city, command }: CitySubProps) {
  // 未工作领土格（可分配市民）
  const unworked = city.territory.filter((t: HexCoord) =>
    !hexEquals(t, city.tile) && !city.workedTiles.some((wt: HexCoord) => hexEquals(wt, t))
  );
  const canAssign = city.workedTiles.length < city.population;

  if (city.territory.length <= 1) return null;

  return (
    <>
      <div style={{ marginTop: 6 }}>市民分配（{city.workedTiles.length}/{city.population}）：</div>
      <div style={{ fontSize: 10, color: theme.colors.textDim, marginBottom: 2 }}>
        已工作：{city.workedTiles.filter((t: HexCoord) => !hexEquals(t, city.tile)).length} 格
      </div>
      {city.workedTiles.filter((t: HexCoord) => !hexEquals(t, city.tile)).map((t: HexCoord) => (
        <button key={`w-${t.q},${t.r}`} style={{ ...miniBtn, fontSize: 10 }}
          onClick={() => command({ kind: 'unassignCitizen', cityId: city.id, tile: t })}>
          ✕ ({t.q},{t.r})
        </button>
      ))}
      {canAssign && unworked.length > 0 && (
        <div style={{ marginTop: 2 }}>
          {unworked.slice(0, 5).map((t: HexCoord) => (
            <button key={`uw-${t.q},${t.r}`} style={{ ...miniBtn, fontSize: 10, background: theme.colors.info }}
              onClick={() => command({ kind: 'assignCitizen', cityId: city.id, tile: t })}>
              + ({t.q},{t.r})
            </button>
          ))}
        </div>
      )}
    </>
  );
}

const miniBtn: React.CSSProperties = {
  padding: '1px 4px', border: 'none', color: '#fff', cursor: 'pointer',
  borderRadius: theme.borderRadius, fontSize: 12, fontFamily: theme.fontFamily,
  background: theme.colors.disabled, margin: '1px',
};

