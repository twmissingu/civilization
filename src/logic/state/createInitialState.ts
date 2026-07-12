// 初始状态构造
import type { GameState, PlayerState, UnitState, GameConfig } from './types';
import type { HexCoord } from '../../types';
import { createRng } from '../rng';
import { generateMap, getTile } from './mapgen';
import { CIVILIZATIONS } from '../../gamedata';
import { allTiles, hexDistance, type MapBounds } from '../hex';

function findSpawns(bounds: MapBounds, count: number, seed: number): HexCoord[] {
  const rng = createRng(seed).fork('spawns');
  const tmpMap = generateMap(bounds, createRng(seed));
  const landTiles = allTiles(bounds).filter((c) => {
    const t = getTile(tmpMap, c);
    if (!t) return false;
    return t.terrain !== 'ocean' && t.terrain !== 'coast' && t.terrain !== 'mountain';
  });
  const spawns: HexCoord[] = [];
  const minDist = Math.max(6, Math.floor(Math.sqrt((bounds.width * bounds.height) / count)));
  let attempts = 0;
  while (spawns.length < count && attempts < 5000) {
    attempts++;
    const c = landTiles[Math.floor(rng.next() * landTiles.length)];
    if (!c) continue;
    if (spawns.some((s) => hexDistance(s, c) < minDist)) continue;
    spawns.push(c);
  }
  while (spawns.length < count) {
    const c = landTiles[spawns.length % landTiles.length];
    if (c) spawns.push(c);
    else break;
  }
  return spawns;
}

export function createInitialState(seed: number, config: GameConfig): GameState {
  const bounds: MapBounds = { width: config.mapSize.width, height: config.mapSize.height };
  const map = generateMap(bounds, createRng(seed));
  const spawns = findSpawns(bounds, config.civChoices.length, seed);

  const players: PlayerState[] = config.civChoices.map((choice, i) => {
    const civ = CIVILIZATIONS[choice.id] ?? CIVILIZATIONS.rome;
    const spawn = spawns[i] ?? { q: 0, r: 0 };
    const units: UnitState[] = [
      {
        id: `unit-${i * 2}`,
        ownerId: `player-${i}`,
        type: 'settler',
        tile: spawn,
        hp: 100,
        moveLeft: 2,
        xp: 0,
        level: 1,
        promotions: [],
        charges: undefined,
        hasActed: false,
      },
      {
        id: `unit-${i * 2 + 1}`,
        ownerId: `player-${i}`,
        type: 'warrior',
        tile: spawn,
        hp: 100,
        moveLeft: 2,
        xp: 0,
        level: 1,
        promotions: [],
        charges: undefined,
        hasActed: false,
      },
    ];
    return {
      id: `player-${i}`,
      civId: civ.id,
      isAI: choice.isAI,
      researchedTechs: [],
      currentResearch: null,
      researchedCivics: ['code_of_laws'],
      currentCivic: null,
      government: 'chiefdom',
      policySlots: [null, null], // chiefdom: 1 军 + 1 经
      gold: 0,
      faith: 0,
      cities: [],
      units,
      capitalCityId: null,
      buildersBuilt: 0,
      settlersBuilt: 0,
      districtsBuilt: 0,
      era: 'ancient',
    };
  });

  const diplomacy: Record<string, Record<string, 'peace' | 'war'>> = {};
  for (const a of players) {
    diplomacy[a.id] = {};
    for (const b of players) {
      if (a.id !== b.id) diplomacy[a.id][b.id] = 'peace';
    }
  }

  return {
    version: 1,
    seed,
    config,
    turn: 1,
    currentPlayerIndex: 0,
    status: 'active',
    winner: null,
    victoryType: null,
    map,
    players,
    diplomacy,
    unitIdCounter: config.civChoices.length * 2,
    cityIdCounter: 0,
    log: [],
  };
}
