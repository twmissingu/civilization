# 美术规范（Art Spec）

> 状态：M0b 必须定稿项 = 风格基准（色板/style anchor）、assetId 命名约定与目录结构、交付格式基线；资产逐项清单按里程碑渐进细化。
> 美术-数据接口（assetId 桥接）见 PRD；本文档为管线内部规范，独立版本化。
> 来源：jiuqing-roles-debate 美术/TA 提案 + 评审收敛。

---

## 1. 资产清单估算表（~250–350 静态 / ~400–600 含动画帧）

| 资产类别 | 明细 | 数量估算 |
|---------|------|---------|
| 地形基础贴图 | 9 类地形（overlay 分层，每类 1 张 + 2–3 变体） | 9–27 |
| 地貌 overlay | 森林/雨林/沼泽/泛滥/绿洲（透明 sprite） | 5 |
| 河流/道路 overlay | 河流 ×6 方向 + 道路 ×6 方向 | 12 |
| 海岸过渡 | 浅海→深海渐变 overlay | 2–3 |
| 资源图标 | 加成/奢侈/战略，MVP ~15–20 种 | 15–20 |
| 改良设施 sprite | 农场/矿山/种植园/牧场/伐木场/渔船等 | 8–10 |
| 单位精灵 | 建造者/开拓者/战士/弓手/投石/剑士/骑兵/攻城×2/海军×2 + 3 特色 | 15–17 |
| 区域插画 | 学院/商业/圣地/工业/军营/剧院/港口 | 7 |
| 建筑插画 | 城中心 ~12 + 各区域建筑 ~20 | ~32 |
| 奇观插画 | 地图放置图 + 成就图，5 奇观 | 10 |
| 领袖肖像 | 3 文明 × 1 张（中性态） | 3 |
| 文明徽记 | 3 | 3 |
| 科技节点插画 | ~35 节点（64×64） | 35 |
| 市政节点插画 | ~20 节点（64×64） | 20 |
| 政策卡视觉 | 军/经/万能 × 各 3–5 张 | 12–15 |
| 政体插画 | 8 种 | 8 |
| UI 面板背景 | 城市/科技树/市政树/外交/生产/资源条（九宫格） | 6–8 |
| UI 边框/按钮 | 面板边框/按钮 normal+hover+pressed+disabled | 30–40 |
| 胜利结算图 | 科技/统治/分数（1920×1080） | 3 |
| 迷雾贴图 | 未探索/已探索两态 | 2 |
| **合计** | | **~250–350（静态）** |

> 含动画帧（单位 idle/move/attack）则 ×3 动作 ×4–8 帧 = +168–384 帧。MVP 单位建议**静态 sprite**（见 §6）。

---

## 2. 风格基准规范

### 2.1 色板（hex）

- 羊皮纸底：主 `#E8D5A8` / 暗 `#C4A86E` / 高光 `#F5E6C8`
- 金边：主 `#C9A84C` / 高光 `#F0D070` / 阴影 `#8B7330`
- 地形：草地 `#7BA05B` / 平原 `#C4B878` / 沙漠 `#E0C880` / 冻土 `#A8B8A0` / 雪原 `#E8E8F0` / 丘陵 `#9A8868` / 山脉 `#808078` / 海岸 `#5C9EAD` / 海洋 `#3A6B8C`
- 油画肖像：暗背景 `#2A1E14` / 肌肤高光 `#D4A574` / 肌肤暗 `#8B6238`
- 强调色：科技蓝 `#4A7FA8` / 文化紫 `#8B5FA8` / 金币金 `#C9A84C` / 信仰白 `#E8E0D0`

### 2.2 风格 prompt 模板结构

每个资产类别独立模板，含固定段（风格前缀）+ 变量段（内容）：

```
[风格前缀-固定]
hand-painted illustration, warm parchment tone, visible brush texture,
soft golden border accent, muted earth-tone palette, no text, no watermark,
high detail, game asset quality

[类别段-地形]
top-down hexagonal terrain tile, {terrain_type} terrain, {feature} overlay,
seamless tileable edges, 256x256, transparent background outside hex

[类别段-领袖肖像]
oil painting portrait, {leader_name}, {era} attire, dramatic chiaroscuro lighting,
dark background, shoulder-up composition, 512x640, museum quality

[类别段-UI]
parchment texture panel with golden filigree border, {panel_type} layout,
nine-slice compatible corners, warm tone, 256x256 sample
```

### 2.3 风格基准图集（style anchor）

- 每个资产类别先生成 1 张"风格锚定图"，人工确认后作为该类别后续生成参考基准。
- 基准图集共 ~10 张（地形/地貌/资源/单位/建筑/区域/奇观/领袖/UI 面板/科技节点各 1）。
- 后续生成 prompt 附 style anchor 作参考图输入（若 /jiuqing-image-generate 支持）。
- 验收：新生成图与 anchor 色调偏差在可接受范围（人工目检或色直方图对比）。

---

## 3. assetId 命名约定与目录结构（M0b 定）

### 3.1 命名
- 前缀：`terrain_`/`feature_`/`res_`/`unit_`/`district_`/`building_`/`wonder_`/`portrait_`/`tech_`/`civic_`/`gov_`/`policy_`/`ui_`
- 后缀：`_map`（地图放置图）/`_icon`（小图标）/`_achievement`（成就大图）/`_idle`/`_move`/`_attack`（动画帧）

### 3.2 目录结构
```
assets/
  raw/{category}/          # /jiuqing-image-generate 原始产出
  processed/{category}/    # 筛选+裁切后
  sheets/                  # 打包后 spritesheet (json+png)
  ui/                      # React 独立 PNG
```

---

## 4. 六边形贴图拼接方案（overlay 分层）

```
渲染层级（底→顶）：
L0 基础地形贴图（9 类 × 1–3 变体）
L1 海岸/海洋过渡 overlay
L2 地貌 overlay（森林/雨林/沼泽/泛滥/绿洲）
L3 河流边贴图（6 方向）
L4 资源图标（48×48）
L5 改良设施 sprite
L6 区域/建筑 overlay
L7 单位精灵
L8 迷雾覆盖（未探索=全黑 / 已探索不可见=半透明灰）
```

- **地形过渡**：MVP 硬边 + 地貌 overlay 软化（不做 corner-based sub-tile，复杂度高）。Phase 2 视需引入 edge blend shader。
- **六边形贴图尺寸**：256×256 px（pointy-top，与 PRD 一致）。2160 格同屏最多几百张 tile，Pixi WebGL 批渲染可处理。
- **贴图复用**：同类地形同组贴图（1–3 变体随机分配避免视觉重复），不为每格生成独立贴图。

---

## 5. 交付格式规范

### 5.1 Pixi spritesheet
- 格式：TexturePacker JSON Hash（PixiJS `Spritesheet` 原生支持）
- Atlas 上限 4096×4096，按类别分包：`terrain`/`units`/`resources`/`buildings`/`tech` 等
- 预加载：初始化加载 `terrain` + `resources`；城市面板/科技树按需懒加载

### 5.2 单资产尺寸

| 资产 | 尺寸(px) | 透明通道 |
|------|---------|---------|
| 六边形地形/地貌/河流 | 256×256 | 六边形外透明 |
| 资源图标 | 48×48 | 透明 |
| 改良设施 | 96×96 | 透明 |
| 单位精灵 | 128×128 | 透明 |
| 区域/建筑地图插画 | 128×128 | 透明 |
| 奇观地图插画 | 192×192 | 透明 |
| 奇观成就图 | 960×540 | 不透明 |
| 领袖肖像 | 512×640 | 不透明 |
| 文明徽记 | 128×128 | 透明 |
| 科技/市政节点 | 64×64 | 透明 |
| 胜利结算图 | 1920×1080 | 不透明 |
| UI 面板（九宫格） | 每角 64×64 | 透明 |
| UI 按钮 | 48×48 / 64×64 | 透明 |

### 5.3 React UI 元素
- 独立 PNG（不走 spritesheet），九宫格面板定义 `slice-top/left/right/bottom/center` 像素值，React 用 `border-image`。
- 按钮交付 normal/hover/pressed/disabled 四态。
- 跨层资产（资源图标等）：生成一份高分辨率源图（96×96），导出 48×48 供 Pixi + 48×48 供 React，assetId 统一，`AssetManifest` 的 `textures` 与 `reactAssets` 各注册一份。

---

## 6. 动画帧规范（M0b 定：MVP 静态 vs 帧动画）

- **MVP 决策**：单位纯静态 sprite（性能预算优先，省 2–3 倍资产量）。位移用 Pixi tween 模拟。
- 奇观建成动画：Pixi tween 缩放 + 淡入成就图（1 张静态 PNG 960×540），展示 3 秒自动关闭，不逐帧动画。
- 战斗粒子：`@pixi/particle-emitter` 程序化生成（碰撞迸溅），不需美术粒子贴图。
- 帧动画归 Phase 2（若需 idle/move/attack：每单位 idle 4 帧/move 6 帧/attack 4 帧，128×128，帧间无间隔）。

---

## 7. 领袖肖像与外交面板

- MVP 每领袖 1 张中性态肖像（油画风）。外交关系状态用 UI 叠加层（颜色边框 + icon）表达，不做多表情变体（省 4–6 倍）。Phase 2 视需补多表情。
- 外交面板：背景 + 框架 + 按钮 normal/hover/pressed，约 8–10 UI 资产。

---

## 8. placeholder 策略（M1–M9）

- 地形：纯色块（用 §2.1 色板地形色值），256×256，六边形外形。
- 单位：32×32 纯色方块 + 文字标签（单位名缩写）。
- UI：CSS 纯色背景 + 边框，尺寸比例与正式资产一致。
- placeholder 的 assetId 与正式资产一一对应，M10b 替换时只更新 `AssetManifest` 映射，不改渲染代码。

---

## 9. `/jiuqing-image-generate` 接口需求

- **输入**：prompt 文本（风格前缀 + 类别段 + 内容变量）、目标尺寸（宽×高）、风格参考图（style anchor）、透明背景标记（boolean）
- **输出**：PNG（支持 alpha），分辨率不低于目标尺寸
- **批量**：支持单次请求同类多资产（如"生成 9 类地形贴图，同一风格前缀"）
- **一致性**：支持风格参考图输入
- **筛选**：每项生成 3–4 候选，人工/自动筛选后入库
- **产物路径**：输出到 `assets/raw/{category}/`，筛选+裁切后入 `assets/processed/{category}/`
- **废品率监控**：前 20 张资产统计废品率，若 > 50% 触发风险升级。

> 该技能开发时以本文档为需求输入；其内部实现不在本文档范围。
