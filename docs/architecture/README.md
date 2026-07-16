# 架构工程契约（Architecture）

> 状态：M1 前必须定稿项 = 契约边界/接口/不变量；边界内实现选择（如具体 PRNG 算法）可延后。
> 本文档定义确定性主接缝的工程契约，是逻辑层可测、可复现、golden replay 回放验证的基础。
> 来源：jiuqing-roles-debate 确定性逻辑引擎工程师 + 前端/渲染架构师提案 + 第 2 轮评审收敛。

---

## 0. 核心类型定义

```typescript
interface HexCoord { q: number; r: number }   // 轴向坐标，pointy-top

interface RngState {                            // RNG 可序列化状态（存档用）
  algorithm: 'mulberry32' | 'xorshift';
  cursor: number;
  state: number[];
}

interface GameState {
  version: number;
  seed: number;
  turn: number;
  currentPlayerId: string;
  status: 'active' | 'finished';
  winner?: string;
  victoryType?: string;
  difficulty: Difficulty;                       // 难度作可序列化字段（golden replay 输入）
  rng: Rng;                                     // 运行时实例；序列化时排除（见 §4.4）
  players: PlayerState[];                       // 按 ID 升序
  map: MapState;                                // 含每格 visibility
  techState: TechState;
  civicState: CivicState;
  // ... 子状态类型分节定义，字段引用 gamedata
}

type Difficulty = 'easy' | 'standard' | 'hard';

interface AdjacencyBonus {
  total: number;
  breakdown: { source: string; amount: number }[];
}

interface PathResult {
  reachable: boolean;
  path: HexCoord[];
  unreachableReason?: string;
}

interface TileInfo {
  terrain: string;
  feature?: string;
  resource?: string;
  improvement?: string;
  owner?: string;
  yield: { food: number; production: number; gold: number };
  visibility: 'unexplored' | 'explored' | 'visible';
}
```

> `PlayerState`/`MapState`/`TechState`/`CivicState` 等子结构随里程碑补全字段；此处锁定顶层骨架与关键不变量（`status`/`winner`/`difficulty`/`rng`）。

---

## 1. 确定性 RNG 架构

### 1.1 Rng 接口

```typescript
interface Rng {
  next(): number;            // [0,1)
  int(maxExclusive: number): number;
  pick<T>(arr: T[]): T;
  shuffle<T>(arr: T[]): T[];
  fork(branch: string): Rng;  // 派生子流，互不干扰
  serialize(): RngState;       // 内部状态可序列化（存档用）
}
```

- 实现为可 seed 的 PRNG（mulberry32 / xorshift，**算法可延后**，但状态必须可序列化）。
- seed 为 `number` 或 `string`。
- 逻辑层禁止直接 `Math.random()` / `Date.now()` / `performance.now()`（lint 强制，见 §7.2）。

### 1.2 子流隔离

- `Rng` 由游戏 seed 初始化，作为 `GameState` 的运行时字段持有（序列化时提取为 `rngState`，见 §4.4）。
- 子系统经 `rng.fork(name)` 派生独立子流：地图生成、战斗、AI、遗迹奖励各用子流。
- `fork(branch)` 内部用 `hash(mainSeed, branch)` 派生；`hash` 定义为 **FNV-1a 32-bit**（确定、跨平台一致）。
- **AI 子流隔离**（关键）：每个 AI 玩家每回合用独立子流 `rng.fork(\`ai-turn${turn}-p${playerIdx}\`)`（等价于 `hash(mainSeed, turn, playerIdx)`），每回合重新 fork（非持久）。使难度选择（困难档不消费 PRNG、简单档消费 1 次）不干扰主 RNG 序列。

### 1.3 注入方式

- `Rng` 实例由状态派生；命令处理时从状态取 seed 流推进，新状态携带推进后的 seed 游标。
- 测试 helper：`withSeed(seed, (game) => {...})` 固定 seed 断言随机结果（builder 链式 `.withSeed(42)` 见 testing §4.1）。

---

## 2. 命令契约

### 2.1 命令为 discriminated union（可序列化 plain object）

```typescript
type DistrictType = 'campus' | 'commercial' | 'holy' | 'industrial' | 'encampment' | 'theater' | 'harbor';
type GovernmentType = 'chiefdom' | 'oligarchy' | 'autocracy' | 'classical_republic' | 'monarchy' | 'theocracy' | 'merchant_republic' | 'democracy';

type GameCommand =
  | { kind: 'foundCity'; unitId: string; name: string }
  | { kind: 'buildImprovement'; builderId: string; tileId: HexCoord }
  | { kind: 'research'; techId: string }
  | { kind: 'endTurn' }
  | { kind: 'moveUnit'; unitId: string; to: HexCoord }
  | { kind: 'attack'; attackerId: string; targetId: string }
  | { kind: 'trainUnit'; cityId: string; unitType: string }
  | { kind: 'buildBuilding'; cityId: string; buildingType: string }
  | { kind: 'placeDistrict'; cityId: string; districtType: DistrictType; tileId: HexCoord }
  | { kind: 'buildWonder'; cityId: string; wonderType: string; tileId: HexCoord }
  | { kind: 'buyTile'; cityId: string; tileId: HexCoord }
  | { kind: 'assignCitizen'; cityId: string; fromTileId: HexCoord | null; toTileId: HexCoord | null }
  | { kind: 'switchPolicy'; cardId: string; slotIndex: number }
  | { kind: 'changeGovernment'; governmentType: GovernmentType }
  | { kind: 'declareWar'; targetCivId: string }
  | { kind: 'suePeace'; targetCivId: string }
  | { kind: 'startSpaceProject'; cityId: string; projectType: string }
  // ... 随里程碑增长
```

- 必须是 plain object（无 class 实例、无函数引用），可 `JSON.stringify`。
- `districtType`/`governmentType` 为字面量联合（值域由 gamedata 锁定）；`techId`/`cardId`/`cityId`/`unitId` 等运行时生成的 ID 保留 `string`，但 JSON Schema 约束格式。
- 同时落地为 **JSON Schema 文件**，由 lint 强制"每命令在契约内"。

### 2.2 执行为纯函数

```typescript
function applyCommand(state: GameState, cmd: GameCommand): { state: GameState; events: GameEvent[] }
```

- 纯函数：禁止读取外部状态、禁止 IO、禁止调用非确定性 API；随机性只能经 state 内 `Rng` 取得。
- **执行顺序（区分两种模式）**：
  - (a) **玩家回合内即时命令**：单一玩家在己方回合发出的命令按接收顺序依次执行（来源单一，接收序 = 执行序，可复现）。
  - (b) **回合结算阶段**：所有玩家 `endTurn` 后进入结算，按 §5 固定序解析。
- 单条命令即最小原子单位（不支持批处理原子性）；单条校验失败不影响其他命令。

### 2.3 两阶段校验与错误契约

```typescript
interface ValidationError { code: string; field?: string; message: string }
interface RuleError { code: string; message: string; context?: Record<string, unknown> }

function validate(cmd: unknown): ValidationError | GameCommand;            // 结构校验
function canExecute(state: GameState, cmd: GameCommand): RuleError | null;  // 语境校验（null = 可执行）
function execute(state: GameState, cmd: GameCommand): { state: GameState; events: GameEvent[] };
```

- 只有 `canExecute` 返回 `null` 的命令才 `execute`。
- `canExecute` 作为独立可测函数暴露：UI 层做按钮可用性判断。
- 非法命令不影响 RNG 状态（不消费随机数），保证确定性不被探测行为破坏。
- **execute 错误契约**：`execute` 假定 `canExecute` 已通过；若遇到不可恢复状态（如游戏已结束），抛 `GameAlreadyFinishedError`（`class extends Error`）。合法异常仅此一类（及其明确子类）。
- 命令 API 被拒时返回 `{ ok: false; error: RuleError }` 而非静默（与 `canExecute` 返回一致）。

---

## 3. 事件系统

事件为可序列化 **discriminated union**，判别字段统一为 `kind`（与命令一致）：

```typescript
type GameEvent =
  | { kind: 'UnitMoved'; turn: number; payload: { unitId: string; from: HexCoord; to: HexCoord } }
  | { kind: 'CombatResolved'; turn: number; payload: { attackerId: string; defenderId: string; result: string } }
  | { kind: 'UnitTrained'; turn: number; payload: { cityId: string; unitType: string } }
  | { kind: 'TechCompleted'; turn: number; payload: { techId: string } }
  | { kind: 'CivicCompleted'; turn: number; payload: { civicId: string } }
  | { kind: 'CityGrowth'; turn: number; payload: { cityId: string; newPop: number } }
  | { kind: 'DistrictPlaced'; turn: number; payload: { cityId: string; districtType: DistrictType; tileId: HexCoord } }
  | { kind: 'WonderBuilt'; turn: number; payload: { cityId: string; wonderType: string } }
  | { kind: 'GovernmentChanged'; turn: number; payload: { governmentType: GovernmentType } }
  | { kind: 'PolicySwitched'; turn: number; payload: { cardId: string; slotIndex: number } }
  | { kind: 'WarDeclared'; turn: number; payload: { attackerId: string; targetCivId: string } }
  | { kind: 'PeaceDeclared'; turn: number; payload: { civA: string; civB: string } }
  | { kind: 'GameWon'; turn: number; payload: { victor: string; victoryType: string } }
```

- 事件是命令执行副产品，**不进入 GameState**（不参与序列化），但可被渲染层订阅用于动画/音效/日志。
- 事件是快照附属物：丢失只影响表现，不影响游戏正确性。
- MVP 可先不实现事件通道，动画靠快照 diff 推断（接受不完美）；M10c 补齐。

---

## 4. 存档格式与迁移

### 4.1 存档结构

```typescript
interface SaveData {
  version: number;       // 整数 schema 版本号，从 1 起
  createdAt: string;     // ISO 时间（浏览器层写入，非逻辑层）
  state: GameState;      // 不含运行时 Rng 实例（见 §4.4）
  rngState: RngState;    // RNG 完整内部状态（独立存储）
}
```

- `rngState` 必须包含游标位置 + 内部状态字，加载后恢复的 `Rng` 继续产生与存档时相同的随机序列。

### 4.2 版本迁移

- 每次发布修改 `GameState` 结构时递增 `version`，编写迁移函数：

```typescript
const MIN_SUPPORTED_VERSION = 1;
function migrate(data: unknown, fromVersion: number, toVersion: number): SaveData;  // 链式: for v in from+1..to: data = migrations[v](data)
```

- 加载时先校验 `version`，若版本不受支持（高于当前或低于 `MIN_SUPPORTED_VERSION`）返回 `SaveVersionError`。

### 4.3 损坏定义与错误码（对应用户故事 55）

错误码定义为 discriminated union：

```typescript
type SaveError =
  | { kind: 'SaveParseError'; message: string }
  | { kind: 'SaveSchemaError'; field: string }
  | { kind: 'SaveVersionError'; version: number }
  | { kind: 'SaveMigrationError'; fromVersion: number }
  | { kind: 'SaveCorruptedError' };
```

| 损坏类型 | 错误码 | 处理 |
|---------|--------|------|
| JSON 解析失败 | `SaveParseError` | UI 提示，不崩溃 |
| 顶层字段缺失（如 rngState） | `SaveSchemaError` | 提示字段名 |
| 字段类型错误 | `SaveSchemaError` | 或迁移 |
| 版本号不支持 | `SaveVersionError` | 提示不支持 |
| 迁移失败 | `SaveMigrationError` | 提示版本 |
| round-trip 校验不通过 | `SaveCorruptedError` | 提示损坏 |

- 用 JSON Schema（ajv）做加载时校验。

### 4.4 序列化规则

- `GameState` 可序列化字段**禁用 `Map`/`Set`/`BigInt`**：键值映射用 plain object（键为 string）或有序数组 `[key, value][]`；集合用有序数组。
- 自定义 class 实例实现 `toJSON()` / `fromJSON()`，或统一用 plain object + 工厂函数构造。
- **Rng 提取**：`GameState.rng` 为运行时 `Rng` 实例，不直接序列化；`serialize(state)` 时把 `rng.serialize()` 写入 `SaveData.rngState`，`state` 中排除 rng；`deserialize(SaveData)` 时从 `rngState` 重建 `Rng` 注入 `GameState`。
- 序列化前做结构校验，拒绝循环引用或未知类型。

### 4.5 round-trip 等价性（双轨）

- 结构等价：`deepEqual(state, deserialize(serialize(state)))`（需自定义 reviver）。
- 行为等价（更强）：`applyCommand(state, cmd)` 与 `applyCommand(deserialize(serialize(state)), cmd)` 产生的新状态与事件序列 deepEqual。
- 行为等价须覆盖至少关键路径 CP-01..CP-12。

### 4.6 IO 边界

- 逻辑层负责：`serialize(state) -> SaveData`、`deserialize(SaveData) -> state`、`migrate(data, from, to) -> SaveData`。
- 逻辑层**不负责**：IndexedDB 读写、文件下载/上传、用户交互。浏览器层调用逻辑层 serialize/deserialize 后自行持久化。

---

## 5. 回合时序与命令解析顺序

### 5.1 回合结算顺序（确定性）

- `endTurn` 命令的 `execute` 返回新状态后，若当前玩家为回合内最后一名玩家，触发 `resolveTurn(state): GameState`（即 `turnResolution.ts` 入口）。
- `resolveTurn` 是独立纯函数，不经 `applyCommand`。
- 玩家按 ID 升序依次结算。
- 每名玩家内：城市按 ID 升序结算产出/增长；单位按 ID 升序结算恢复/状态更新。
- 所有"每回合"效果的结算顺序集中在 `src/logic/turnResolution.ts`，禁止散落各子系统。
- 跨玩家同时触发的效果（如战斗双方减血）按"攻击方先结算、防御方后结算"固定规则。

### 5.2 命令解析顺序（回合结算阶段）

- 回合结算阶段多命令入队，按固定序解析：玩家固定序（ID 升序）+ 行动类型优先级。
- **禁止按到达时间处理**（不可复现）。
- 行动类型优先级表见 `docs/ai-design.md §3`（同分 tie-break 规则同源）。

---

## 6. 状态桥详规（四通道）

PRD 已定义不变量，此处为工程详规：

### 6.1 快照
- 不可变，结构化共享（Immer `produce`），只有变更路径引用变化。
- 渲染层经 Zustand selector 分片订阅 + shallow equal；禁止整快照订阅。
- 开发模式 `deepFreeze` 捕获意外 mutation；生产模式跳过 freeze 赖 TS `readonly`。

### 6.2 命令 API
- 写入，走两阶段校验；被拒返回 `{ ok: false; error: RuleError }` 而非静默。

### 6.3 查询 API（纯函数，不变更状态）
- `queryReachable(state, unitId): HexCoord[]`
- `queryDistrictAdjacencyPreview(state, cityId, districtType, tileId): AdjacencyBonus`
- `queryTileInfo(state, tileId): TileInfo`（tooltip）
- `queryPath(state, from, to): PathResult`（含不可达原因）

### 6.4 事件
- 见 §3。渲染层订阅事件驱动动画，瞬时状态（进度/插值/粒子）由 Pixi 内部管理，不回写逻辑层。

### 6.5 三类状态分离
- (a) 游戏状态（逻辑层快照，确定性，可序列化）
- (b) UI 交互状态（Zustand，非确定性，不存档：选中单位 ID/hover 格子/当前面板/镜头中心与缩放）
- (c) 渲染瞬时状态（Pixi 内部：动画进度/粒子/精灵插值）
- 三者不交叉写入。镜头控制：React 发"聚焦坐标"命令到 Pixi（单向），Pixi 内部平滑插值，不回写 React。

### 6.6 发射频率合约
- 玩家回合：每次命令一个新快照（低频）。
- AI 回合：变更批处理，累积 ≤100ms 窗口内的多次变更为一次发射。
- renderer 固定 60fps，每帧至多消费一个合并后快照。

---

## 7. 分层纯净度强制

### 7.1 工具与目录树

```
src/
  logic/              # 逻辑层（headless，零浏览器依赖）
    hex/              # 六边形数学
    pathfinding/      # A*
    combat/           # 战斗结算
    tech/  civic/     # 科技/市政推进
    city/             # 城市增长/产出/扩张
    district/         # 区域与相邻加成
    ai/               # utility AI
    victory/          # 胜利判定
    state/            # GameState/applyCommand/turnResolution.ts
  render/             # 渲染层（Pixi + React HUD）
  gamedata/           # 数据源（转录自 docs/gamedata）
tests/
  scenarios/          # 场景测试（路径映射见 testing §3）
```

- `dependency-cruiser` 或 `eslint-plugin-boundaries`：`src/logic/**` 不得依赖 `src/render/**`、`pixi.js`、`react`、`react-dom`、DOM 全局。
- tsconfig project references：逻辑层与渲染层分属不同 project，逻辑层 `paths` 不含渲染层。

`.dependency-cruiser.js` 最小配置：

```js
module.exports = {
  forbidden: [
    { from: { path: 'src/logic/**' }, to: { path: 'src/render/**' } },
    { from: { path: 'src/logic/**' }, to: { path: 'pixi.js' } },
    { from: { path: 'src/logic/**' }, to: { path: 'react' } },
    { from: { path: 'src/logic/**' }, to: { path: 'react-dom' } },
  ],
};
```

### 7.2 CI 门禁

- `depcruise --fail-on` 纳入 CI，违规即 fail。
- eslint 配置（可粘贴）：

```json
{
  "overrides": [{
    "files": ["src/logic/**"],
    "rules": {
      "no-restricted-globals": ["error", "window", "document"],
      "no-restricted-properties": ["error",
        { "object": "Math", "property": "random" },
        { "object": "Date", "property": "now" },
        { "object": "performance", "property": "now" }
      ]
    }
  }]
}
```

> `no-restricted-globals` 禁 `window`/`document`；`no-restricted-properties` 禁 `Math.random`/`Date.now`/`performance.now`，允许 `Math.floor` 等纯函数。

### 7.3 回归测试

- 一个"逻辑层可在无 jsdom 环境下 import 全部模块"的冒烟测试，确保接缝未破。

---

## 8. asset 运行时生命周期

- 加载策略：游戏初始化预加载 `terrain` + `resources` spritesheet；城市面板/科技树按需懒加载对应 sheet。
- asset 缺失 fallback：`AssetManifest` 查不到 assetId 时回退到纯色 placeholder + 控制台告警，不崩溃。
- HMR：PixiJS 场景（WebGL context/纹理/display object）不支持热替换，Pixi 相关文件变更触发整页刷新；逻辑层纯 TS 模块可热重载但快照实例需重建。

---

## 9. 回放设施

```typescript
interface GameConfig { mapSize: { w: number; h: number }; civCount: number; difficulty: Difficulty }
function createInitialState(seed: number, config: GameConfig): GameState;
function replay(seed: number, config: GameConfig, commands: GameCommand[]): GameState;
```

- `replay` 内部先 `createInitialState(seed, config)`（含地图生成 RNG fork、初始单位放置），再逐条 `applyCommand`。
- 难度作为 `GameConfig` 与 `GameState.difficulty` 字段双重携带，保证 golden replay 跨 CI 复现（见 testing §5.1）。
- 测试框架可导出失败用例的 `(seed, config, commands)` 三元组，直接喂给 replay 复现。
- golden replay 基础：确定性同步只需 replay seed + 命令序列（等价于广播命令/种子），保证回放完全复现。
