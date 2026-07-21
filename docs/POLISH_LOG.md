# POLISH_LOG

对齐：v0.4.0 Phase 1 上线收尾后打磨 / 游戏维度 / 5 轮 / 红线（确定性、覆盖率≥80%、分层门禁、不引新依赖、不动逻辑层契约）。

## Round 0 基线（游戏维度）

| 维度 | 分 | 证据 |
|------|---|------|
| 玩法完整性 | 8 | 核心 4X 循环完整，5 种胜利条件，AI/贸易/宗教/城邦/大人物全机制，Phase 2 系统 UI 已接入 |
| 视觉与音效 | 7 | 迷雾/河流/城市标签/手绘产出图标/SVG 图标；剩余 UI 过渡动画/视觉效果缺失 |
| 性能 | 7 | 分片订阅 + mapVersion + AI 异步；PixiMap 池化但无严格视口剔除 |
| 可靠性 | 8 | 398 测试，golden replay，critical-paths 门禁，存档 round-trip |
| 代码质量 | 8 | 三层架构 + depcruise 强制 + 统一 query API，类型安全基本覆盖 |
| 测试覆盖 | 8 | 43 文件 398 测试，逻辑层 88.24%，render 层覆盖不足 |

最弱：视觉与音效(7)。Round 1 聚焦：视觉与音效。

## Round 1 - 视觉与音效（完成）
- 改进：① 选中单位脉冲动画（PixiJS ticker 驱动 alpha 呼吸效果，0.5±0.4 范围内变化）② 选中单位环高亮（ring 引用存储 + 独立动画循环）
- 体验痛点：选中单位无视觉反馈，难以区分选中状态
- 评分：视觉与音效 7->8（选中单位动画反馈 + 高亮）；其余不变
- 测试：398（无新增，纯 UI 改动）；覆盖率 88.24/83.62/89.08；tsc/build/门禁全绿
- 变更：`src/render/PixiMap.tsx`（pulseRef + selectedRingRef + ticker 动画）

## Round 2 - 性能（完成）
- 改进：6 个组件切换到分片 selector（CityPanel/DiplomacyPanel/VictoryProgressPanel/ReligionPanel/CityStatePanel/TradeRoutePanel），不再订阅整 state
- 体验痛点：无直观体验变化，但 AI 回合/endTurn 时侧栏面板不再整树重渲染
- 评分：性能 7->8（分片 selector 减少无意义重渲染）；其余不变
- 测试：398（无新增，纯 selector 替换）；覆盖率 88.24/83.62/89.08；tsc/build/门禁全绿
- 变更：`src/render/CityPanel.tsx`、`DiplomacyPanel.tsx`、`VictoryProgressPanel.tsx`、`ReligionPanel.tsx`、`CityStatePanel.tsx`、`TradeRoutePanel.tsx`

## Round 3 - 代码质量（完成）
- 改进：CityPanel 移除所有 `any` 类型，使用 `UnitDef`/`BuildingDef`/`WonderDef`/`DistrictDef` 类型注解
- 体验痛点：无直接体验变化，但类型安全提升减少运行时错误
- 评分：代码质量 8->9（类型安全全面覆盖，`any` 类型清除）；其余不变
- 测试：398（无新增，纯类型注解替换）；覆盖率 88.24/83.61/89.08；tsc/build/门禁全绿
- 变更：`src/render/CityPanel.tsx`（类型注解替换）

## Round 4 - 测试覆盖（完成）
- 改进：新增 3 个测试文件（YieldIcon/VictoryProgressPanel/AIProgressOverlay），+8 测试
- 体验痛点：无直接体验变化，但新增组件有测试覆盖
- 评分：测试覆盖 8->9（新增 8 测试，render 组件覆盖提升）；其余不变
- 测试：406（+8 新增）；覆盖率 88.24/83.61/89.08；tsc/build/门禁全绿
- 变更：`tests/render/YieldIcon.spec.tsx`、`VictoryProgressPanel.spec.tsx`、`AIProgressOverlay.spec.tsx`

## Round 5 - 可靠性（完成）
- 改进：添加 ErrorBoundary 组件，包裹 Sidebar 中 6 个面板（ReligionPanel/CityStatePanel/GreatPeoplePanel/TradeRoutePanel/GovernmentPanel/DiplomacyPanel），单个面板崩溃不影响其余 UI
- 体验痛点：无直接体验变化，但极端情况下不会白屏
- 评分：可靠性 8->9（错误边界 + 降级 UI）；其余不变
- 测试：406（无新增，纯 UI 组件）；覆盖率 88.24/83.59/89.08；tsc/build/门禁全绿
- 变更：`src/render/ErrorBoundary.tsx`、`Sidebar.tsx`（包裹面板）

| 维度 | 分 | 证据 |
|------|---|------|
| 玩法完整性 | 7 | M1-M9 全机制可玩（smoke 80 回合无崩溃）；平衡粗（AI/战斗/增长数值未调）；civ 能力已接线但深度有限 |
| 视觉与音效 | 5 | 55 AI 资产已接入地形/单位/区域/肖像；UI 极简（无 tooltip/队列进度/战斗预览/研究树视图）；美术 55/~250；无音频(排除) |
| 性能 | 6 | 小图流畅（smoke 219ms/80回合）；无 <3s 基准；Pixi 每次 state 变更全量重绘（大图潜在卡顿）；AI guard<200 |
| 可靠性 | 7 | 101 测试 + 门禁绿；存档 round-trip 测；边界/AI 卡住/损坏处理覆盖不足 |
| 代码质量 | 7 | 分层+严格类型；commands.ts 较密；部分模块有重复/粗糙 |
| 测试覆盖 | 8 | lines 92.3 / branches 82.66 / functions 95.55 |

最弱：视觉与音效(5)。Round 1 聚焦：视觉与音效。

## Round 1 - 视觉与音效（完成）
- 改进：① 地块悬停信息（`describeTile` 纯函数 + Pixi pointerenter/leave + 侧栏地块面板，显示坐标/地形/特征/资源/产出/单位/城市）② 城市面板队列进度条 + 建筑训练按钮
- 体验痛点：无 tooltip 不知地块产出；城市队列仅逗号拼接不可读
- 评分：视觉与音效 5->6（UI 可读性提升，美术仍不全）；其余不变
- 测试：+4 describe 测试（105 总）；覆盖率 92.25/81.75/95.65；tsc/build/纯度/depcruise 全绿
- 变更：`src/logic/state/describe.ts`、`tests/scenarios/describe.spec.ts`、`store.ts`、`PixiMap.tsx`、`App.tsx`

## Round 2 - 性能（完成）
- 改进：加性能基准测试 `perf.spec.ts`，验证 US39（AI 回合 <3s）：24×16/3 文明 5 回合 <15s、40×24/4 文明 3 回合 <9s、20 命令 <1s。实测 ~13ms/回合。
- 体验痛点：无性能门禁/基准，<3s 未验证
- 评分：性能 6->8（已验证 + 基准门禁）；其余不变
- 测试：+3 perf（108 总）；覆盖率 92.25/81.8/95.65；tsc/build/门禁绿
- 变更：`tests/scenarios/perf.spec.ts`

## Round 3 - 视觉与音效（完成）
- 改进：① 政体/政策卡面板（显示当前政体+槽位+切换政体按钮+政策卡装槽，暴露签名机制）② 地图领土着色（按玩家色半透明叠加，可视化城市版图）
- 体验痛点：政体/政策卡机制无 UI 入口；城市领土边界不可见
- 评分：视觉与音效 6->7（核心机制 UI 齐备 + 领土可视化）；其余不变
- 测试：108（无新增，UI 改动）；覆盖率 92.25/81.83/95.65；tsc/build/门禁绿
- 变更：`PixiMap.tsx`、`App.tsx`

## Round 4 - 玩法完整性（完成）
- 改进：AI 难度差异化（easy: 35% 怠工+随机研究；standard: 10% 怠工；hard: 不怠工+优先补军事+多建城）
- 体验痛点：3 档难度行为无差异
- 评分：玩法完整性 7->8（难度可感知差异化）；其余不变
- 测试：+2 AI 难度测试（110 总）；覆盖率 92.05/81.54/95.65；tsc/build/门禁绿
- 变更：`src/logic/ai.ts`、`tests/scenarios/ai.spec.ts`

## Round 5 - 可靠性（完成）
- 改进：① 存档损坏校验矩阵（版本/缺 state/非对象/不可恢复 -> 类型化错误码）② 失败玩家（无城无单位）AI 以 endTurn 结尾不卡住
- 体验痛点：存档损坏无校验；失败玩家可能卡回合
- 评分：可靠性 7->8（损坏处理 + 失败处理 + 测试）；其余不变
- 测试：+6 save-corruption（116 总）；覆盖率 91.98/81.66/95.65；tsc/build/门禁绿
- 变更：`src/logic/state/serialize.ts`、`tests/scenarios/save-corruption.spec.ts`

## Round 6 - 视觉与音效（完成）
- 改进：① 生成 12 科技/市政图标（67 资产总计）② 研究/市政面板接入图标（img + onError 回退）
- 体验痛点：研究/市政列表纯文字不直观
- 评分：视觉与音效 7->8（图标化 + 美术 67）；其余不变
- 测试：116（UI 改动）；tsc/build/门禁绿
- 变更：`App.tsx`、`assets/raw/{tech,civic}/*.png`

## Round 7 - 代码质量（完成，收敛轮）
- 改进：抽取查询助手（findUnit/findCity/currentPlayer/unitAt）到 `src/logic/state/query.ts`，commands.ts 瘦身、关注点分离；commands re-export 保持兼容
- 评分：代码质量 7->8；全部维度 ≥8
- 测试：116 全绿（无回归）；覆盖率 91.99/81.68/95.65；tsc/build/depcruise/纯度全绿
- 变更：`src/logic/state/query.ts`（新）、`src/logic/state/commands.ts`

## 收敛判定
7 轮后全部维度 ≥8（玩法8/视觉8/性能8/可靠8/代码8/测试8），可交付目标（UX+平衡+性能）达成，无 P0/P1 未完成。终止迭代。

---

# 第二轮打磨（v0.1.0 已发布；聚焦：美术+平衡+UX；上限 12 轮）

## Round 0 基线（第二轮）

| 维度 | 分 | 证据 |
|------|---|------|
| 玩法完整性 | 8 | 全机制可玩；平衡为 MVP 级（战斗/增长/AI 数值可调） |
| 视觉与音效 | 7 | 67/~250 资产（~27%），UI 已图标化但研究树/战斗预览缺；无音频(排除) |
| 性能 | 8 | <3s 验证（实测 ~13ms/回合） |
| 可靠性 | 8 | 存档损坏矩阵 + 失败玩家处理 + 116 测试 |
| 代码质量 | 8 | 分层 + query.ts 抽取 + 严格类型 |
| 测试覆盖 | 8 | lines 92 / branches 82 / functions 95 |

最弱：视觉与音效(7，美术不全)。Round 1 聚焦：视觉与音效（补美术）。

## Round 1（第二轮）- 视觉与音效（完成）
- 改进：生成 12 资产（8 建筑 + 4 政策卡，79 总）+ 城市建筑训练按钮接入建筑图标 + 政体面板政策卡按钮接入政策卡图标
- 评分：视觉与音效 7->8（建筑/政策卡图标化，美术 79）
- 测试：116（UI 改动）；tsc/build 绿
- 变更：`App.tsx`、`assets/raw/{buildings,policy}/*.png`

## Round 2（第二轮）- 玩法完整性（完成）
- 改进：AI 扩张更积极（开拓者更早产出：科技>1 即可；建城距离 >=3）；加测试验证 AI 40 回合内建 ≥2 城
- 评分：玩法完整性 8->9（扩张动态性 + 验证）
- 测试：+1 smoke（117 总）；覆盖率 92.12/81.8/95.65；tsc/build/门禁绿
- 变更：`src/logic/ai.ts`、`tests/scenarios/smoke.spec.ts`

## Round 3（第二轮）- 视觉与音效（完成）
- 改进：战斗预览 `previewCombat`（纯函数，返回双方 CS + 预计伤害）+ 选中单位悬停敌方时面板显示"我CS vs 敌CS + 预计伤害"
- 评分：视觉与音效 8->9（战斗决策 UX）
- 测试：+2 previewCombat（119 总）；覆盖率 92.01/81.58/95.69；tsc/build 绿
- 变更：`src/logic/state/combat.ts`、`App.tsx`、`tests/scenarios/coverage.spec.ts`

## Round 4（第二轮）- 视觉与音效（完成）
- 改进：生成 15 资产（6 科技 + 3 市政 + 3 政策卡 + 3 UI，94 总），科技/市政/政策图标覆盖更全
- 评分：视觉与音效 9（保持，美术 79->94，痛点=美术缺口收窄）
- 测试：119（无代码改动）；build 绿
- 变更：`assets/raw/{tech,civic,policy,ui}/*.png`

## Round 5（第二轮）- 视觉与音效（完成）
- 改进：胜利进度面板（时代/回合、科技胜利阶段、统治剩余首都、分数排名 US44）
- 评分：视觉与音效 9（保持，UX 痛点=胜利进度可见性 已解决）
- 测试：119；build 绿
- 变更：`App.tsx`

## Round 6（第二轮）- 可靠性（完成）
- 改进：endTurn 跳过已失败玩家（无城无单位）-- `isDefeated` + `nextActivePlayer`，回合轮转不再卡在淘汰者；加测试验证跳过
- 评分：可靠性 8->9（淘汰玩家处理 + 测试）
- 测试：+1 smoke（120 总）；覆盖率 91.95/81.57/95.78；tsc/build/depcruise 绿
- 变更：`src/logic/state/commands.ts`、`tests/scenarios/smoke.spec.ts`

## Round 7（第二轮）- 测试覆盖（完成，收敛轮）
- 改进：isDefeated/nextActivePlayer 边界测试（全失败返回当前、isDefeated 真假）+ 新代码边界覆盖
- 评分：测试覆盖 8（保持 92.08/81.74/95.78，新代码边界已测）
- 测试：121；build 绿
- 变更：`tests/scenarios/smoke.spec.ts`

## 第二轮收敛判定
7 轮后焦点（美术+平衡+UX）均已推进：美术 67->94、平衡（AI 扩张）、UX（战斗预览+胜利进度+面板）；全维度 ≥8（玩法9/视觉9/性能8/可靠9/代码8/测试8）。终止迭代。

---

# 第三轮打磨（v0.2.0 已发布；聚焦：稳定现有 HUD/UX 重构 + 修复测试；上限 10 轮）

## Round 0 基线（第三轮，工作区有进行中的 P0 HUD/UX 重构）

| 维度 | 分 | 证据 |
|------|---|------|
| 玩法完整性 | 9 | 全机制 + 新增 `reachableTiles`/日志上限/formatYield 重构 |
| 视觉与音效 | 9 | 94 资产 + 胜利进度面板 + 战斗预览，UI 组件已提取为独立文件 |
| 性能 | 8 | <3s 基准 + 日志上限 1000 防无限增长 |
| 可靠性 | 7 | ↓ combat 事件文明名解析 bug + 4 测试失败 |
| 代码质量 | 8 | App.tsx ~600→~100 行，query.ts/describe.ts 重构，关注点分离 |
| 测试覆盖 | 6 | ↓ 141 测试中 4 失败（eventLog + TurnTodoPanel） |

## Round 1（第三轮）- 测试覆盖（完成）
- 改进：① `formatEvent` CombatResolved 修复 — 通过 `unitById(attackerId)?.ownerId` 代替错误的 `playerById(unitId)` 查找攻击方/防御方所属文明 ② TurnTodoPanel 测试修复 — `fillPolicySlots` 排除策略卡干扰 + `within(container)` 限定查询范围避免跨测试 DOM 泄漏
- 体验痛点：直接在代码走读中定位，无终端用户影响
- 评分：测试覆盖 6→8（141/141 全绿），可靠性 7→9（bug 修复后回归正常）
- 验证：npm test 141/141、npm run build、npm run check:purity、depcruise 全绿
- 变更：`src/render/eventLog.ts`、`tests/render/TurnTodoPanel.spec.tsx`

## 第三轮 Round 1 收敛判定
所有维度 ≥8，未完成 P0/P1 任务。本轮达成"稳定可用"（修复+测试全绿）。按收敛决策树检测：consecutiveSkips=0，所有维度≥7，无可交付阻断。**建议终止迭代**——v0.2.0 状态稳定，后续可转 v0.3.0 开发周期（补美术/平衡专项/视口剔除）。
