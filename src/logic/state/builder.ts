// 建造者改良
import type { GameState, UnitState } from './types';
import { IMPROVEMENTS } from '../../gamedata';
import { getTile } from './mapgen';

export function canBuildImprovement(state: GameState, builder: UnitState, improvementId: string): boolean {
  const imp = IMPROVEMENTS[improvementId];
  if (!imp) return false;
  const owner = state.players.find((p) => p.id === builder.ownerId);
  if (!owner || !owner.researchedTechs.includes(imp.techId)) return false;
  const tile = getTile(state.map, builder.tile);
  if (!tile) return false;
  const okTerrain = imp.validTerrains.includes(tile.terrain);
  const okFeature = tile.feature ? imp.validTerrains.includes(tile.feature) : false;
  if (!okTerrain && !okFeature) return false;
  if (builder.charges === undefined || builder.charges <= 0) return false;
  return true;
}

export function buildImprovement(state: GameState, builder: UnitState, improvementId: string): void {
  const tile = getTile(state.map, builder.tile);
  if (!tile) return;
  tile.improvement = improvementId;
  if (builder.charges !== undefined) builder.charges -= 1;
}
