# 项目骨架初始化（Setup）

> 状态：M1 启动前定稿。从本文件可导出可执行的 `npm create` + 装包 + 配置流程，保证不同开发者搭出一致骨架。
> 来源：jiuqing-roles-debate M1 启动可行性评估者 + 架构契约审查者提案 + 第 2 轮评审收敛。

---

## 1. 脚手架与依赖

```bash
npm create vite@latest civilization -- --template react-ts
cd civilization
npm install
# 渲染层
npm install pixi.js zustand framer-motion immer
# 逻辑层
npm install -D typescript @types/node
# 测试
npm install -D vitest @vitest/coverage-v8 @testing-library/react jsdom
# 分层强制
npm install -D dependency-cruiser eslint
```

> 版本号由 `npm install` 时锁定到 `package.json`；启动时确认 PixiJS/React/Vite 主版本。

---

## 2. 目录树

```
src/
  logic/              # 逻辑层（headless，零浏览器依赖）
    hex/              # 六边形数学
    pathfinding/      # A*
    combat/
    tech/  civic/
    city/
    district/
    ai/
    victory/
    state/            # GameState/applyCommand/turnResolution.ts
  render/             # 渲染层（Pixi + React HUD）
    pixi/             # 场景图（瓦片/单位/特效/迷雾层）
    hud/              # React HUD（面板/资源条）
  gamedata/           # 数据源（转录自 docs/gamedata）
  types/              # 共享类型（HexCoord/GameState 等，见 architecture §0）
tests/
  scenarios/          # 场景测试
  ai-golden/          # golden replay 文件
docs/                 # 本文档集
```

---

## 3. tsconfig project references

逻辑层与渲染层分属不同 project，逻辑层 `paths` 不含渲染层：

`tsconfig.json`（solution）:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.logic.json" },
    { "path": "./tsconfig.render.json" }
  ]
}
```

`tsconfig.logic.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "rootDir": "src",
    "outDir": "dist/logic",
    "lib": ["ES2022"],
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/logic/**", "src/gamedata/**", "src/types/**"]
}
```

`tsconfig.render.json`（含 DOM lib，引用逻辑层）:
```json
{
  "compilerOptions": {
    "composite": true,
    "strict": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["node"]
  },
  "include": ["src/render/**", "src/types/**"],
  "references": [{ "path": "./tsconfig.logic.json" }]
}
```

---

## 4. `.dependency-cruiser.js`

```js
module.exports = {
  forbidden: [
    { name: 'logic-to-render', from: { path: 'src/logic/**' }, to: { path: 'src/render/**' } },
    { name: 'logic-to-pixi', from: { path: 'src/logic/**' }, to: { path: 'pixi.js' } },
    { name: 'logic-to-react', from: { path: 'src/logic/**' }, to: { path: 'react' } },
    { name: 'logic-to-react-dom', from: { path: 'src/logic/**' }, to: { path: 'react-dom' } },
  ],
};
```

CI: `depcruise --fail-on src --tsconfig tsconfig.json`，违规即 fail。

---

## 5. `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',           // 逻辑层默认无 jsdom
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/logic/**'],
      exclude: ['src/render/**', 'src/**/*.d.ts'],
      thresholds: { lines: 90, branches: 85, functions: 90, perFile: true },
    },
  },
});
```

---

## 6. eslint 配置

```json
{
  "root": true,
  "env": { "es2022": true, "node": true },
  "parserOptions": { "ecmaVersion": 2022, "sourceType": "module" },
  "overrides": [
    {
      "files": ["src/logic/**"],
      "rules": {
        "no-restricted-globals": ["error", "window", "document"],
        "no-restricted-properties": ["error",
          { "object": "Math", "property": "random" },
          { "object": "Date", "property": "now" },
          { "object": "performance", "property": "now" }
        ]
      }
    },
    {
      "files": ["tests/**"],
      "env": { "node": true }
    }
  ]
}
```

---

## 7. M1 第一个可写代码任务

依赖上述骨架就位 + architecture §0/§1 契约，M1 第一任务：

1. 实现 `Rng` 接口（architecture §1.1，mulberry32 + `fork`/`serialize`，hash 用 FNV-1a）。
2. 实现 `src/logic/hex/` 六边形数学（pointy-top，`hexToPixel`/`getNeighbors`/`distance`/`range`，边界 q∈[0,59]、r∈[0,35]）。
3. 写 CP-00（六边形坐标数学）场景测试。
4. 实现地图生成器（Simplex + seed，参数见 `docs/mapgen.md`）+ CP-02（seed 确定性）测试。

被阻断任务（等骨架 + 朝向决策，现已定 pointy-top）：六边形渲染网格、地图生成器、M1 验收测试。
