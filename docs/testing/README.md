# 测试规格（Testing）

> 状态：现在定稿项 = 关键路径清单格式与门禁语义、命令-事件 schema 骨架、覆盖率阈值策略、场景测试 harness 形状；全量枚举随里程碑增长（现在猜 M8 内容违反 YAGNI）。
> 主接缝：确定性游戏逻辑层（headless pure TS），`applyCommand(state, cmd) -> { state, events }`。
> 来源：jiuqing-roles-debate 测试工程师提案 + 第 2 轮评审收敛。

---

## 1. 关键路径清单（CP-XX）

每条 CP 对应至少一个场景测试文件，CI 解析 `critical-paths.yaml`，PR 触及对应玩法目录时检查是否有匹配测试。

```
CP-00 六边形坐标数学                   # M1 切片
CP-01 首回合建城并产出
CP-02 地图生成 seed 确定性               # M1 切片
CP-03 改良地块并产出变化
CP-04 完成一个科技并解锁单位/区域
CP-05 造兵并移动到邻格
CP-06 近战攻击并占领敌方城市
CP-07 城市扩张并买地
CP-08 区域相邻加成计算
CP-09 政体切换与政策卡合法性
CP-10 AI 在给定 seed 下完成一轮决策
CP-11 存档 round-trip 后行为等价
CP-12 触发一种胜利并终局
```

### `critical-paths.yaml` schema 示例

```yaml
- id: CP-00
  src: src/logic/hex/**
  test: tests/scenarios/hex.spec.ts
- id: CP-02
  src: src/logic/state/mapgen**
  test: tests/scenarios/mapgen.spec.ts
# ... 其余随里程碑补
```

匹配脚本逻辑：扫描测试文件中的 `CP-XX` 标注，校验 (a) 清单内每条 CP 存在对应通过的场景测试；(b) PR diff 命中某 CP 的 `src` glob 时，对应 `test` 文件须存在且被修改（否则告警/fail）。

- M1 须列 CP-00、CP-02；其余随里程碑增长。
- "关键路径 100%" = 清单内每条 CP 存在对应通过的场景测试，由专用脚本校验，不依赖覆盖率数字。

---

## 2. 命令-事件 schema（代码内，lint 强制）

- 命令契约落地为 TS discriminated union + JSON Schema 文件（见 `docs/architecture/README.md §2`）。
- lint 规则：每命令必须在契约内、走两阶段校验（`validate`/`canExecute`/`execute`）。
- 事件同此：可序列化 discriminated union（判别字段 `kind`），测试经 `events` 数组断言副作用，不探查内部字段。
- 私有函数边界：导出的纯函数可单测（不算场景测）；场景测只走 `applyCommand`。

---

## 3. 覆盖率阈值与 CI 门禁

- 工具：Vitest + `@vitest/coverage-v8`
- 配置 `vitest.config.ts`：`coverage.thresholds = { lines: 90, branches: 85, functions: 90, perFile: true }`（仅逻辑层目录，渲染层排除）
- CI：`vitest run --coverage` 失败即阻断合并
- 场景测试必带门禁：约定路径映射 `src/logic/combat/* -> tests/scenarios/combat.spec.ts`；PR 修改 `src/logic/**` 但未修改 `tests/scenarios/**` 时告警或 fail（与 `critical-paths.yaml` 联动）

---

## 4. 场景测试 harness / DSL

### 4.1 GameBuilder（fixture DSL，构造中途状态，不从第 1 回合硬跑）

```typescript
const game = new GameBuilder()
  .withMap({ w: 24, h: 18 })                    // 测试用小地图（尺寸+seed 生成；地图预设系统留待 Phase 2）
  .withCiv('red', { cities: [{ at: tile(5,5), pop: 3 }] })
  .withCiv('blue', { cities: [{ at: tile(10,10), militaryStrength: 5 }] })
  .withTech('red', 'medieval')
  .withSeed(42)
  .build();
```

> 命名统一为 `GameBuilder`（architecture §1.3 的 `withSeed` helper 即此 builder 的链式方法）。

### 4.2 Scenario DSL（剧本式，AAA；断言走查询 API，不探查内部字段）

```typescript
scenario('建城->改良->研究->造兵->攻击->占领', CP-06)
  .given(g => g.withSettler(at(5,5)).withEnemyCity(at(6,6)))
  .when(g => applyCommand(g, { kind:'foundCity', unitId: settlerId, name: 'Roma' }))
  .then(g => expect(queryTileInfo(g, at(5,5)).owner).toBe('red'))
  .when(...)
  .then(g => expect(queryTileInfo(g, enemyCityTile).owner).toBe('red'))
  .run();
```

> `withBuilder`（建造者）与 `withSettler`（开拓者）区分：建城用开拓者。断言经 `queryTileInfo`/`queryReachable` 等查询 API，不直接访问 `g.cities`/`g.tiles` 内部字段（与 §2"不探查内部字段"原则一致）。

### 4.3 快进 helper

- `game.skipTurns(n, { autoResearch: 'cheapest' })`：`autoResearch` 可选值 `'cheapest'`（选当前最便宜可研究科技）/ `'ai-standard'`（按 ai-design 标准档策略）；均经 seeded RNG，禁 `Math.random`。
- 强制解锁：`game.forceTech('gunpowder')` 触达晚期玩法，避免真实推进数十回合。

### 4.4 断言模式（三选一，禁止混用）
- 状态快照 `toMatchGameState`
- 事件序列 `toMatchEvents`
- 不变式 `expect(invariantHolds(game)).toBe(true)`

---

## 5. AI 测试 oracle

### 5.1 确定性测试
- 固定 seed + 固定状态 + 固定难度 -> 断言 AI 命令序列（golden replay），存 `ai-golden/*.json`，CI 对比。
- golden 按 **(seed, 难度, 剧本) 三元组**版本化。难度经 `GameConfig.difficulty` 与 `GameState.difficulty` 携带（见 architecture §9），`replay()` 签名含 config，保证跨 CI 复现。

### 5.2 行为剧本测试（数值化）
- "当敌方综合军力 ≤ 己方 60% 且距离 ≤ 3 格时，AI 在 N 回合内发出 declareWar 命令"。
- 断言点 `events.some(e => e.kind === 'WarDeclared')`（事件 kind 为 PascalCase，见 architecture §3）。
- **优先断言不变量**（"弱邻存在则 N 回合内宣战"）而非精确移动序列--后者对平衡调优过脆易腐。
- 确需精确序列：用固定脚本 AI 而非效用 AI。

### 5.3 搜索深度约束
- 测试模式 AI 搜索深度/候选数上限可注入（`aiDepth: 'test'`），保证单测 < 100ms。

### 5.4 golden replay 再生治理
- 确定性逻辑有意变更时，用 **blessed 再生命令**再生 golden：
  - 再生命令单独 commit
  - golden 文件版本 pin
  - CI 对意外漂移失败，对 blessed 再生放行
- 无此规则则 golden 要么腐烂要么阻塞合法改动。

### 5.5 禁止 oracle 反模式
- 不写"AI 做了人类觉得对的决定"，只写可数值化前置条件 -> 可观测命令/事件。

---

## 6. 存档 round-trip 与损坏测试矩阵

### 6.1 双轨等价性
- 结构等价：`deepEqual(state, deserialize(serialize(state)))`（自定义 reviver 处理 Map/Set/类实例）
- 行为等价：`applyCommand(state, cmd)` 与 `applyCommand(deserialize(serialize(state)), cmd)` 产生的新状态与事件序列 deepEqual（覆盖 CP-01..CP-12）

### 6.2 序列化协议
- 非 JSON 类型映射：Map -> `[k,v][]`，类实例 -> `{ _type, ...fields }`，round-trip 测试强制每类字段覆盖。

### 6.3 损坏测试矩阵（对应用户故事 55）

| 损坏类型 | 期望行为 |
|---------|---------|
| JSON 语法错误 | 抛 `SaveParseError`，UI 提示，不崩溃 |
| 顶层字段缺失（如 rngState） | 抛 `SaveSchemaError`，提示字段名 |
| 字段类型错误 | `SaveSchemaError` 或迁移 |
| 版本号不支持 | `SaveVersionError`，提示不支持 |
| 迁移失败（篡改版本号到需迁移旧版 + 破坏迁移函数） | `SaveMigrationError`，提示版本 |
| round-trip 校验不通过（序列化后篡改 state） | `SaveCorruptedError`，提示损坏 |
| 截断文件 | `SaveParseError` |

- 用 JSON Schema（ajv）加载时校验，每类损坏注入断言错误类型。错误码定义为 architecture §4.3 的 `SaveError` union。

### 6.4 版本迁移测试
- 每个 version 增量写迁移 + 迁移测试（`migrate(save, from, to)`，与 architecture §4.2 签名一致）。

---

## 7. 分层纯净度强制

- 工具：`dependency-cruiser` 或 `eslint-plugin-boundaries`，`src/logic/**` 不得依赖 `src/render/**`/`pixi.js`/`react`/`react-dom`/DOM 全局。配置见 architecture §7.1。
- tsconfig project references 隔离逻辑层与渲染层。
- CI：`depcruise --fail-on` 纳入 CI；逻辑层 eslint 用 `no-restricted-globals`（`window`/`document`）+ `no-restricted-properties`（`Math.random`/`Date.now`/`performance.now`），允许 `Math.floor` 等纯函数（见 architecture §7.2）。
- 回归：一个"逻辑层可在无 jsdom 环境下 import 全部模块"的冒烟测试。

---

## 8. 胜利判定测试

- 胜利类型清单与触发条件数值化（见 `docs/gamedata/README.md §10`）：科技三段、统治占全部原始首都、分数（回合上限综合分）。
- 终局断言点：游戏进入 `status: 'finished'`，发出 `{ kind: 'GameWon', payload: { victor, victoryType } }` 事件，后续 `applyCommand` 抛 `GameAlreadyFinishedError`。
- 多胜利并发：构造"同回合科技与统治同时满足"fixture，断言按预定义优先级只触发一种。
- 每类胜利至少一个场景测试，纳入关键路径清单（CP-12）。

---

## 9. 性能门禁（US39 < 3s/回合）

- line 87 验收标准需可验证入口。MVP 至少占位一条 perf 场景测：
  - 后期满载 fixture（2 AI × 15 城 × 40 单位），断言单回合 < 3000ms。
- CI 性能预算断言噪声大，方案待定：固定机器/统计阈值，或降为手动 perf 剧本。M8 交付基准数据时定。

---

## 10. 渲染层冒烟测试边界

- 用 `@testing-library/react` 挂载根组件，断言不抛异常且 Pixi canvas 节点存在。
- "快照渲染"改为"首次渲染后 1 帧内无 console.error"（Pixi 无内置快照，勿误导）。
- 冒烟范围：挂载 + 注入 fixture 状态 + 模拟一次 endTurn，断言无异常。不做像素级断言。
- **M1 渲染验收 fixture**：60×36 随机生成地图（seed 固定），无单位，全 visible，注入 placeholder 地形贴图。
- 渲染层中的纯逻辑（快照 diff 推断、坐标转换、selector 映射）提取为纯函数并测试；业务规则判定（可见性/可达性/相邻加成）必须下沉逻辑层，不得留渲染层。
