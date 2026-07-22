[![English](https://img.shields.io/badge/English-blue.svg)](README.md)
[![中文](https://img.shields.io/badge/中文-red.svg)](README_zh.md)

---

# 文明 · 开源 Civ6 风格 4X

免费、开源、浏览器即开即玩的回合制 4X 策略游戏，灵感来自文明6。技术栈：TypeScript + PixiJS + React + Vite。无需安装，打开链接即玩。

## 为什么做这个项目？

现有开源文明克隆（FreeCiv、Unciv）对标更早的文明版本，缺失文明6 的两个签名机制：**区域相邻加成**与**市政树+政策卡政体**。本项目在浏览器中复现文明6 的完整核心循环（探索-扩张-开发-消灭）与这两个签名机制，免费、可改，配原创手绘风美术。

架构上把**确定性 headless 逻辑层**（纯 TypeScript，可单测、golden replay 可复现）与薄渲染层彻底分离——规则可验证、不与画面耦合。

## 特性

- 🗺️ 六边形地图（pointy-top）+ 确定性 Simplex 地图生成 + 战争迷雾 + 河流
- 🏛️ **签名机制**：区域与相邻加成（学院/圣地/商业中心等 8 种）
- 📜 **签名机制**：市政树 + 11 政体 + 政策卡（军/经/万能）
- 🚢 贸易路线：商人单位、路线管理、自动产出
- ⛪ 宗教系统：万神殿（8种）、创教、传教士/使徒、宗教压力
- 🏙️ 城邦系统：11 城邦、使者、宗主国加成
- 🏆 大人物：5 类伟人招募与独特效果
- 🏘️ 11 文明（罗马/中国/希腊/埃及/阿兹特克/英格兰/美国/日本/德国/法国/俄罗斯）
- 🔬 70 节点科技树 + 尤里卡；34 节点市政树 + 灵感
- ⚔️ 战斗（CS 公式/城墙/攻城/ZOC）+ A* 寻路
- 🤖 utility AI 对手（6 档难度），异步执行不阻塞 UI
- 🎨 105 AI 生成美术资产，压缩 177MB→0.5MB（99.5%），支持 WebP
- 🏆 5 种胜利：科技（航天）/ 统治 / 分数 / 宗教 / 文化
- 💾 存档/读档（IndexedDB + JSON 导出）
- 🧪 540 测试，覆盖率 ≥91%，分层门禁 + 关键路径 + golden replay

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
npm test               # 540 个测试（逻辑层+渲染层）
npm run test:coverage   # 覆盖率 ≥80%
npm run check           # 纯度 + depcruise + 关键路径 + 覆盖率门禁
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

Phase 1 MVP 完成（v0.6.0）——战争迷雾/河流/完整城市管理 UI/11 文明/资产压缩管线/6 个 Phase 2 系统 UI 面板/胜利进度/奇观建成与战斗特效/命令注册表模式/golden replay 确定性验证/540 测试。见 `docs/ROADMAP.md`。
