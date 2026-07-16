[![English](https://img.shields.io/badge/English-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/中文-red.svg)](README_zh.md)

---

# 文明 · 开源 Civ6 风格 4X

免费、开源、浏览器即开即玩的回合制 4X 策略游戏，灵感来自文明6。技术栈：TypeScript + PixiJS + React + Vite。无需安装，打开链接即玩。

## 为什么做这个项目？

现有开源文明克隆（FreeCiv、Unciv）对标更早的文明版本，缺失文明6 的两个签名机制：**区域相邻加成**与**市政树+政策卡政体**。本项目在浏览器中复现文明6 的完整核心循环（探索-扩张-开发-消灭）与这两个签名机制，免费、可改，配原创手绘风美术。

架构上把**确定性 headless 逻辑层**（纯 TypeScript，可单测、golden replay 可复现）与薄渲染层彻底分离——规则可验证、不与画面耦合。

## 特性

- 🗺️ 六边形地图（pointy-top）+ 确定性 Simplex 地图生成 + 战争迷雾
- 🏛️ **签名机制**：区域与相邻加成（学院/圣地/商业中心等 7 种）
- 📜 **签名机制**：市政树 + 8 政体 + 政策卡（军/经/万能）
- 🔬 34 节点科技树 + 尤里卡；市政树 + 灵感
- ⚔️ 战斗（CS 公式/城墙/攻城/ZOC）+ A* 寻路
- 🤖 utility AI 对手（3 档难度：简单/标准/困难）
- 🎨 67 AI 生成美术资产（手绘羊皮纸风，全 10 类目）
- 🏆 3 种胜利：科技（航天）/ 统治 / 分数
- 💾 存档读档（IndexedDB + JSON 导出）
- 🧪 116 测试，覆盖率 ≥80%，分层由 dependency-cruiser + 纯度脚本强制

## 快速开始

### 前置
- Node.js 20+

### 安装
```bash
git clone <repo-url>
cd civilization
npm install
```

### 运行
```bash
npm run dev       # 启动开发服务器（Vite HMR）
```
打开链接，选文明，建城，开玩。

### 验证
```bash
npm test               # 116 个逻辑层测试
npm run test:coverage   # 覆盖率 ≥80%
npm run check           # 纯度 + depcruise + 覆盖率门禁
npm run build           # 生产构建
```

## 给 AI Agent

本项目为 AI agent 友好：

1. **克隆安装**
   ```bash
   git clone <repo-url>
   cd civilization
   npm install
   ```
2. **理解架构** — 读 `docs/ARCHITECTURE.md` 与 `docs/PRD-civilization6-clone.md`。逻辑层（`src/logic/`）headless 纯 TS；主接缝是 `applyCommand(state, cmd) -> { state, events }`。
3. **跑测试** — `npm test`。玩法规则经 `tests/scenarios/` 测试。
4. **改规则** — 数据表在 `src/gamedata/`；规则在 `src/logic/state/`。逻辑层须 headless（禁 DOM/Pixi/React），由 `npm run check:depcruise` 强制。
5. **读 `AGENTS.md`** 了解行为规范。

## 架构

- **逻辑层**（`src/logic/`，headless 纯 TS，零浏览器依赖）：状态机 + 规则引擎。确定性（seeded RNG，禁 Math.random/Date.now）。
- **数据层**（`src/gamedata/`）：科技/市政/区域/建筑/单位/奇观/文明表，单一真相源。
- **渲染层**（`src/render/`，PixiJS + React + Zustand）：只读快照、发命令。

详见 `docs/architecture/README.md`。

## 文档

`docs/` — PRD / gamedata / architecture / ai-design / art-spec / testing / setup / mapgen。`CONTEXT.md` — 领域术语表。

## 贡献

欢迎 PR。遵循现有风格（严格 TS、`structuredClone` 不可变状态、逻辑/渲染分离）。新玩法须带场景测试。提交前跑 `npm run check`。

## 许可证

[MIT](LICENSE) — 代码与 AI 生成美术资产均开源。美术为 AI 生成原创，不依赖文明6 原版资源。

## 状态

Phase 1 MVP（v0.1.0）。完整文明6 基础版机制为北极星（后续阶段）。见 `docs/ROADMAP.md`。
