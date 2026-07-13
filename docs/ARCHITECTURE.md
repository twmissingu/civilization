# ARCHITECTURE（当前快照）

详细契约见 `docs/architecture/README.md`。本轮快照：

- **逻辑层**（`src/logic/`，headless 纯 TS，零浏览器依赖）：`rng`/`hex`/`state/{mapgen,types,createInitialState,commands,turnResolution,serialize,yield,city,tech,civic,district,builder,unitMove,combat,victory}` + `ai`。
- **数据层**（`src/gamedata/`）：terrain/tech/civic/district/building/unit/wonder/civ。
- **渲染层**（`src/render/`，PixiJS+React）：`PixiMap`（WebGL 地图）、`App`（HUD/侧栏）、`store`（Zustand）、`assets`（纹理/AssetManifest）、`save`（IndexedDB）。
- **入口**：`src/main.tsx` -> `App`。
- **测试**：`tests/scenarios/*.spec.ts`（hex/mapgen/gameplay/rules/coverage/canExecute/ai/smoke）。
- **门禁**：`scripts/check-purity.mjs` + `.dependency-cruiser.cjs` + `vitest.config.ts`（覆盖率 80/80/80）。

核心接缝：`applyCommand(state, cmd) -> { state, events }`（纯函数，structuredClone）。
