[![English](https://img.shields.io/badge/English-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/中文-red.svg)](README_zh.md)

---

# Civilization — Open-Source Civ6-Style 4X

A free, open-source, browser-playable turn-based 4X strategy game inspired by Civilization VI, built with TypeScript + PixiJS + React + Vite. No install — open the URL and play.

## Why This Project?

Existing open-source Civ clones (FreeCiv, Unciv) target older Civ versions and miss Civ VI's two signature mechanics: **district adjacency bonuses** and **the civics tree + policy-card governments**. This project reproduces the full Civ VI core loop — explore, expand, exploit, exterminate — with those signature mechanics, in a browser, for free, with original hand-painted-style art.

The architecture cleanly separates a **deterministic headless logic layer** (pure TypeScript, fully unit-testable, future multiplayer-ready) from a thin render layer — so the game is verifiable and the rules are not coupled to the screen.

## Features

- 🗺️ Hex map (pointy-top) with deterministic Simplex map generation + fog of war
- 🏛️ **Signature mechanic**: districts with adjacency bonuses (campus, holy site, commercial, etc.)
- 📜 **Signature mechanic**: civics tree + 8 governments + policy cards (military/economic/wildcard)
- 🔬 34-node tech tree with Eureka boosts; civic tree with Inspiration
- ⚔️ Combat with CS formula, city walls, siege units, zone of control, A* pathfinding
- 🤖 Utility AI opponents (3 difficulty tiers: easy/standard/hard)
- 🎨 67 AI-generated art assets (hand-painted parchment style) across all categories
- 🏆 3 victory types: science (space race), domination, score
- 💾 Save/load (IndexedDB + JSON export)
- 🧪 116 tests, coverage ≥80%, layering enforced by dependency-cruiser + purity checks

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
npm test               # 116 logic-layer tests
npm run test:coverage   # coverage ≥80%
npm run check           # purity + depcruise + coverage gates
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

Phase 1 MVP (v0.1.0). Full Civ VI base-game mechanics is the north star (later phases). See `docs/ROADMAP.md`.
