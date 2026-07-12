# 文明 · 开源复现

Web 端开源文明6 风格回合制 4X 策略游戏（TypeScript + PixiJS + React + Vite）。分阶段交付，Phase 1 = 可玩 MVP。

设计文档见 `docs/`（PRD / gamedata / architecture / ai-design / art-spec / testing / setup / mapgen）。术语表见 `CONTEXT.md`。

## Quick Start

```bash
npm install
npm run dev        # 启动开发服务器（Vite HMR）
npm test           # 运行逻辑层测试
npm run test:coverage   # 覆盖率（逻辑层 ≥80%）
npm run check      # 纯净度 + 分层门禁 + 测试
npm run build      # 类型检查 + 生产构建
```

## 架构

- **逻辑层**（`src/logic/`，headless 纯 TS，零浏览器依赖）：游戏状态机 + 规则引擎，可被 Vitest 直接测试。
- **渲染层**（`src/render/`，PixiJS + React HUD）：只读逻辑快照、只发命令。
- 分层由 `dependency-cruiser` + 纯度脚本强制（`npm run check`）。

详见 `docs/architecture/README.md`。
