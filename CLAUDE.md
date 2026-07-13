# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

文明6 开源复现 -- Web 端回合制 4X 策略游戏（TypeScript + PixiJS + React + Vite）。Phase 1 MVP。完整设计文档在 `docs/`，行为规范见 `AGENTS.md`。

## Commands

```bash
npm install              # 安装依赖
npm run dev              # Vite 开发服务器（HMR），浏览器即开即玩
npm test                 # 运行全部逻辑层测试（vitest）
npx vitest run tests/scenarios/<file>.spec.ts   # 跑单个测试文件
npm run test:coverage    # 覆盖率（逻辑层 ≥80% 为门禁）
npm run build            # tsc 类型检查 + Vite 生产构建
npm run check            # 完整门禁：纯度 + depcruise + 覆盖率（提交前必跑）
```

`npm run check` 是硬门禁，三道全绿才能提交：`check:purity`（逻辑层无非确定性 API）、`check:depcruise`（分层无违规）、`test:coverage`（覆盖率 ≥80%）。

## Architecture

三层严格分离，分层由工具强制（不是约定）：

- **逻辑层** `src/logic/` -- headless 纯 TS，零浏览器依赖（禁 DOM/Pixi/React）。游戏状态机 + 规则引擎。核心接缝：`applyCommand(state, cmd) -> { state, events }`（`src/logic/state/commands.ts`），纯函数，内部 `structuredClone(state)` 后改动克隆体。`canExecute(state, cmd)` 做两阶段校验（结构 + 语境），暴露给 UI 判按钮可用性。
- **数据层** `src/gamedata/` -- 玩法规则数据表的**单一真相源**（科技/市政/政体/区域/建筑/单位/奇观/文明/地形产出）。改数值改这里，逻辑层只读。
- **渲染层** `src/render/` -- PixiJS WebGL 地图（`PixiMap.tsx`）+ React HUD（`App.tsx`）+ Zustand store（`store.ts`）。只读逻辑快照、只发命令，不持业务规则。

### 确定性（逻辑层硬约束）

逻辑层禁止 `Math.random()` / `Date.now()` / `performance.now()` / `window` / `document`（`scripts/check-purity.mjs` 扫描强制）。所有随机经 `createRng(seed).fork(branch)`（`src/logic/rng.ts`，mulberry32 + FNV-1a hash）。GameState 不存 Rng 实例，只存 `seed`；存档序列化存 seed，加载后所有 fork 可重建。这保证测试可复现 + 未来联机确定性同步。

### 不可变状态

`applyCommand` 不 mutate 输入：先 `canExecute`（只读），通过后 `structuredClone` 再改克隆体返回。GameState 可序列化字段禁用 `Map`/`Set`/`BigInt`（用 plain object 或有序数组）。

### 回合流

玩家发命令 -> `endTurn` 推进 `currentPlayerIndex` -> 轮末 wrap 时 `resolveTurn`（`turnResolution.ts`）结算所有玩家：城市增长/生产/扩张、科技/市政推进、金币/维护、单位治疗/移动力重置、胜利判定。AI 由 `runAIUntilHuman`（`src/logic/ai.ts`）批量发命令驱动。

### 分层强制

`.dependency-cruiser.cjs`：`src/logic/**` 不得依赖 `src/render/**` / `pixi.js` / `react` / `react-dom`。tsconfig 单配置 + 严格模式（`noUnusedLocals` 等）。

## Conventions

- **新玩法规则**：数据加到 `src/gamedata/`，逻辑加到 `src/logic/state/`，并写一个 `tests/scenarios/*.spec.ts` 场景测（走 `applyCommand`，固定 seed）。质量门要求新增玩法必带场景测试。
- **测试**：场景化优先（"建城->改良->研究->造兵->攻击->占领"一条龙），只测外部行为（`applyCommand` 输入输出），不测内部私有函数。关键路径清单见 `docs/testing/`（CP-00..CP-12）。
- **美术资产**：`assets/raw/` 为源，`public/assets/` 为 Vite 服务副本。新增资产经 `/jiuqing-image-generate` 生成，按 `docs/art-spec.md` 风格模板。逻辑层只存 `assetId` 字符串，渲染层 `src/render/assets.ts` 维护 `assetId -> 纹理` 映射（逻辑层不 import 美术）。
- **文档**：所有 `.md` 放 `docs/`（PRD/gamedata/architecture/ai-design/art-spec/testing/setup/mapgen + VISION/ROADMAP/POLISH_LOG/DELIVERY_REPORT）。根目录仅 `AGENTS.md`/`README.md`/`README_zh.md`/`CLAUDE.md`/`LICENSE`/`CHANGELOG`/`CONTEXT.md`。
- **提交**：未经用户明确同意不 `git commit`/`git push`。提交前跑 `npm run check`。遵循 `CHANGELOG.md`（keepachangelog）与 semver。

## Design Docs

改架构/玩法前先读对应 `docs/`：`PRD-civilization6-clone.md`（产品范围+里程碑）、`architecture/README.md`（确定性契约+命令/存档/状态桥）、`gamedata/README.md`（数据表）、`art-spec.md`（美术管线）、`testing/README.md`（测试规格）。`CONTEXT.md` 是领域术语表。`docs/` 下设计文档已定稿，改动需经评审（见 `AGENTS.md`）。
