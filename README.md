[![English](https://img.shields.io/badge/English-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/中文-red.svg)](README_zh.md)

---

# Civilization — Open-Source Civ6-Style 4X

A free, open-source, browser-playable turn-based 4X strategy game inspired by Civilization VI, built with TypeScript + PixiJS + React + Vite. No install — open the URL and play.

## Why This Project?

Existing open-source Civ clones (FreeCiv, Unciv) target older Civ versions and miss Civ VI's two signature mechanics: **district adjacency bonuses** and **the civics tree + policy-card governments**. This project reproduces the full Civ VI core loop — explore, expand, exploit, exterminate — with those signature mechanics, in a browser, for free, with original hand-painted-style art.

The architecture cleanly separates a **deterministic headless logic layer** (pure TypeScript, fully unit-testable, golden-replay-verifiable) from a thin render layer — so the game is verifiable and the rules are not coupled to the screen.

## Features

- 🗺️ Hex map (pointy-top) with deterministic Simplex map generation + fog of war + rivers
- 🏛️ **Signature mechanic**: districts with adjacency bonuses (campus, holy site, commercial, etc.)
- 📜 **Signature mechanic**: civics tree + 11 governments + policy cards (military/economic/wildcard)
- 🚢 Trade routes: merchants, route management, automatic yields
- ⛪ Religion: pantheons (8), founders, missionaries, apostles, pressure mechanics
- 🏙️ City-states: 11 city-states, envoys, suzerain bonuses
- 🏆 Great People: 5 categories with unique effects
- 🏘️ 11 civilizations (Rome, China, Greece, Egypt, Aztec, England, America, Japan, Germany, France, Russia)
- 🔬 70-node tech tree with Eureka boosts; 34-node civic tree with Inspiration
- ⚔️ Combat with CS formula, city walls, siege units, zone of control, A* pathfinding
- 🤖 Utility AI opponents (6 difficulty tiers) — runs asynchronously without blocking the UI
- 🎨 105 AI-generated art assets, compressed 177MB → 0.5MB (99.5%) with WebP support
- 🏆 5 victory types: science (space race), domination, score, religion, culture
- 💾 Save/load (IndexedDB + JSON export)
- 🧪 406 tests, coverage ≥88%, layering enforced by dependency-cruiser + purity checks + critical-paths gate + golden replay

## Quick Start

### Prerequisites
- Node.js 20+

### Installation
```bash
git clone <repo-url>
cd civilization
npm install
```

### Run
```bash
npm run dev       # start dev server (Vite HMR)
```
Open the URL, pick your civ, found a city, and play.

### Verify
```bash
npm test               # 406 logic-layer + render tests
npm run test:coverage   # coverage ≥80%
npm run check           # purity + depcruise + critical-paths + coverage + golden-replay gates
npm run build           # production build
```

## For AI Agents

This project is designed for seamless AI agent interaction:

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd civilization
   npm install
   ```
2. **Understand the architecture** — read `docs/ARCHITECTURE.md` and `docs/PRD-civilization6-clone.md`. The logic layer (`src/logic/`) is headless pure TS; the main seam is `applyCommand(state, cmd) -> { state, events }`.
3. **Run tests** — `npm test`. All gameplay rules are tested via `tests/scenarios/`.
4. **Edit rules** — data tables in `src/gamedata/`; rules in `src/logic/state/`. Logic must stay headless (no DOM/Pixi/React), enforced by `npm run check:depcruise`.
5. **Read `AGENTS.md`** for behavioral rules.

## Architecture

- **Logic layer** (`src/logic/`, headless pure TS, zero browser deps): game state machine + rules engine. Deterministic (seeded RNG, no `Math.random`/`Date.now`).
- **Data layer** (`src/gamedata/`): tech/civic/district/building/unit/wonder/civ tables — the single source of truth, transcribed to code.
- **Render layer** (`src/render/`, PixiJS + React + Zustand): reads snapshots, sends commands.

See `docs/architecture/README.md` for full contracts.

## Documentation

`docs/` — PRD, gamedata, architecture, ai-design, art-spec, testing, setup, mapgen. `CONTEXT.md` — domain glossary.

## Contributing

PRs welcome. Follow existing style (strict TS, immutable state transitions via `structuredClone`, logic/render separation). Add a scenario test for new gameplay. Run `npm run check` before submitting.

## License

[MIT](LICENSE) — code and AI-generated art assets are open source. Art is original (AI-generated), does not depend on Civilization VI original assets.

## Status

Phase 1 MVP complete (v0.4.0) — fog of war, rivers, full city management UI, asset compression pipeline, 6 Phase-2 system UI panels, victory progress, deterministic golden-replay verification, 406 tests. See `docs/ROADMAP.md`.
