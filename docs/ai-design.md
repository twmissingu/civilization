# AI 设计（AI Design）

> 状态：现在定稿项 = 打分维度名称与分类、tie-break 三重排序、难度档数量与机制类型、AI 走同一命令接口；可调参项（权重值/阈值/top-k 的 k/softmax 温度）标 `默认`，M8 迭代。
> 来源：jiuqing-roles-debate AI 工程师提案 + 评审收敛。

---

## 1. 架构：两层 utility AI

- **战略层**（文明级，每回合 1 次）：科技选择、政体/政策切换、外交姿态（战/和）、奇观优先级。输出作为战术层打分权重的修饰因子。
- **战术层**（实体级，逐实体评估）：单位移动/攻击、城市生产队列、建造者改良。
- MVP 不上复杂规划（无 MCTS/行为树）。

---

## 2. 效用打分公式

```
效用分 = Σ(wi × di),  di ∈ [0,1] 归一化维度值,  wi 权重,  Σwi = 1
所有分数为定点整数（×1000），禁浮点。
动作执行阈值：score ≥ threshold（默认 600，可按难度调整）
```

### 2.1 核心动作打分维度（默认权重，M8 调参）

#### declareWar(target)
- d1 = military_advantage_ratio = min(our_power / their_power, 2) / 2  [w=0.40]
- d2 = economic_value = target_cities_total_yield / norm               [w=0.30]
- d3 = proximity = 1 - min(dist_to_target / 6, 1)                       [w=0.15]
- d4 = -war_fatigue = 1 - (recent_losses / threshold)                  [w=0.15]
- 阈值默认 650

#### foundCity(location)
- d1 = terrain_yield_score = workable_tiles_yield / max                 [w=0.35]
- d2 = fresh_water = has_river_or_lake ? 1 : 0                          [w=0.25]
- d3 = -proximity_penalty = 1 - min(dist_to_nearest_own_city / 6, 1)    [w=0.20]
- d4 = -threat_exposure = 1 - nearby_enemy_military / threshold         [w=0.20]
- 阈值默认 550

#### buildWonder(wonder_id)  ← US37"优先抢奇观"对应维度
- d1 = wonder_bonus_value = bonus_magnitude / norm                      [w=0.35]
- d2 = tech_progress = 1 - (turns_to_unlock / max_turns)                [w=0.25]
- d3 = competition_urgency = 1 - (opponent_progress / wonder_cost)      [w=0.25]
- d4 = city_capacity = has_eligible_city ? 1 : 0                        [w=0.15]
- 阈值默认 600

#### suePeace(target)
- d1 = military_disadvantage = max(their_power / our_power, 2) / 2      [w=0.40]
- d2 = city_loss_risk = threatened_cities / total_cities                [w=0.35]
- d3 = war_duration = min(turns_at_war / 20, 1)                         [w=0.25]
- 阈值默认 600

#### research(tech_id)
- d1 = unlock_value = unlocked_units_buildings_count / norm              [w=0.35]
- d2 = eureka_active = has_eureka ? 1 : 0                                [w=0.25]
- d3 = path_priority = 1 / (depth_in_tree + 1)                          [w=0.20]
- d4 = era_relevance = current_era_match ? 1 : 0.5                      [w=0.20]
- 始终选最高分（必选一个科技）

#### wonderPriority（独立战略层维度）
- 评估可建奇观列表、剩余回合、是否有竞争者也在建，作为 buildWonder 的 competition_urgency 输入。

> 信仰值维度：MVP 保留 faith 在打分框架中但默认权重近 0（宗教排除，信仰仅计分），AI 不主动为信仰建圣地。

---

## 3. 确定性 tie-break（三重排序，全序无歧义）

```
候选排序: score DESC
        -> action_type_priority ASC（静态优先级表）
        -> entity_id ASC（轴向坐标 q,r 字典序）
```

### 动作类型静态优先级表（同分时生效）

| 优先级 | 动作（=命令 kind） | 备注 |
|-------|------------------|------|
| 1 | foundCity | |
| 2 | research | 必选一个科技 |
| 3 | switchPolicy | 原 adopt_policy |
| 4 | buildWonder | |
| 5 | trainUnit | 原 build_unit |
| 6 | placeDistrict | 原 build_district |
| 7 | buildImprovement | 原 improve_tile |
| 8 | moveUnit | 原 move_military |
| 9 | declareWar | |
| 10 | suePeace | |
| 99 | pass | 无命令（实体跳过） |

- 评分函数必须为纯函数：输入仅快照 + 候选动作描述，不读不改可变状态。候选列表生成后一次性评估。

---

## 4. 难度档参数表（MVP 3 档，top-k + softmax）

| 参数 | 简单 | 标准 | 困难 |
|------|------|------|------|
| 起始开拓者 | 1 | 1 | 2 |
| 起始战士 | 1 | 1 | 2 |
| 起始金币 | 0 | 0 | +50 |
| 动作选择 | top-3 + softmax 加权随机 | top-2 + 加权随机（强偏 #1） | top-1 贪心最优 |
| 效用噪声 | 无（弃纯噪声，难测语义不清） | 无 | 无 |
| 动作执行阈值 | 550 | 600 | 600 |
| 奇观竞争倾向 | 低（权重 ×0.7） | 中（×1.0） | 高（×1.3） |

- **确定性约定**：top-k 加权随机的随机源 = PRNG `seed = hash(game_seed, turn, civ_id, action_id)`，调用顺序固定为按候选排序后的顺序。同 seed 下各档决策均可复现。
- 弃"降权重"折中：效果不可预测（不知降多少达目标难度），且扭曲效用排序。
- 弃"减候选"：本质是 N=1 特例，灵活性不足。
- 困难档 top-1 不消耗 PRNG、简单档 top-3 消耗 1 次 → 由 `architecture/README.md §1.2` 的 AI 子流隔离保证难度不干扰主 RNG 序列。

---

## 5. 性能预算（小地图 60×36，3 文明，2 AI）

```
后期规模上限假设: 单 AI ≤ 15 城 + ≤ 40 单位 = 55 实体; 2 AI 合计 ≤ 110 实体
预算分解（总计 ≤ 3000ms）:
  战略层（文明级）:    ≤ 5 决策 × 30ms = 150ms
  战术层-城市（生产）: ≤ 30 城 × 20ms = 600ms
  战术层-单位（移动）: ≤ 80 单位 × 25ms = 2000ms
  降级预留: 250ms
单实体超时硬限: 30ms，超时取当前最优候选或 pass
全局超时降级: 战术层累计 > 2500ms 时，剩余低优先级单位（按 entity_id 尾部）直接 pass
```

- M8 交付须附"后期满载场景（2 AI × 15 城 × 40 单位）单回合耗时"基准数据，作为回归门禁。

---

## 6. 快照可见性过滤

- AI 输入快照 = 逻辑层不可变快照经可见性过滤后的子集。AI 仅可见：
  - (a) 自身完整状态
  - (b) 已探索格子的地形记忆
  - (c) 当前视野内的敌方单位/城市
  - (d) 已知的外交关系
  - (e) 已公开的奇观建设进度
- 不可见敌方城市内部状态。禁止 AI 读全量状态（"作弊"）。

---

## 7. AI 读写接口

- **读**：AI 经状态桥 selector API（`architecture/README.md §6`）消费过滤后快照，不另起独立 snapshot 机制（避免第二条读路径与渲染层分叉）。
- **写**：AI 输出命令序列 = 有序 `GameCommand` 数组，逐条提交逻辑层命令 API 执行，与玩家命令走**同一接口、同一两阶段校验**。动作名即命令 `kind`（见 §3 表，与 `docs/architecture/README.md §2.1` 一致）。
- 命令失败处理：单条校验失败记录日志并跳过，不中止后续命令（非原子）。
- 命令序列提交后逻辑层一次性应用并产出新快照，AI 不在序列执行中途读中间状态。

---

## 8. 边界行为

- AI 无有效候选动作（所有候选 score < 阈值）：该实体 pass，不执行任何命令。
- AI 即将被消灭（仅剩 1 城，敌方兵临城下）：仍正常评估防御/求和动作，不触发特殊逻辑。

---

## 9. AI 行为闭环覆盖（M8 验收）

建城 / 攀科技 / 建军 / 扩张 / 宣战求和 / 争奇观（MVP 无城邦，US37"争城邦"已删）。
