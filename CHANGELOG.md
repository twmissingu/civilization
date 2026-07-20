# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-07-20

### Added

#### 性能与架构基线
- 统一 query API：所有渲染层通过 `query.ts` 访问逻辑层，禁用 `commands.ts` 直接导入
- 分片订阅：新增 `useCurrentPlayer`/`usePlayerUnits`/`usePlayerCities` 等 hooks
- PixiMap 脏标记优化：`mapVersion` 计数器避免不必要的重绘
- 镜头平滑插值：requestAnimationFrame lerp 动画

#### 视觉反馈
- 迷雾遮罩：`revealArea` + `updatePlayerVisibility`，初始只露出玩家单位周围
- 河流渲染：地图生成连续河流 + 蓝色河流线 overlay
- 城市名称标签：城市名称显示在 PixiMap 城市圆点下方
- SVG 手绘风格产出图标：`<YieldIcon>` 组件替代旧 emoji

#### 城市操作闭环
- 区域放置入口：列出可用区域，点击加入生产队列
- 金币买地入口：显示可购买地块及价格
- 生产队列管理：上移/下移/删除按钮
- 市民分配入口：显示已工作/可工作地块，点击分配/取消

#### Phase 2 系统 UI 入口
- 宗教面板：万神殿/宗教/信仰/宗教单位
- 城邦面板：使者/宗主国状态
- 大人物面板：伟人点数/已招募
- 贸易路线面板：活跃路线/产出
- 胜利进度面板：5 种胜利条件进度条

#### 小地图增强
- 迷雾渲染：未探索/已探索区域不同灰度
- 单位显示：绿点(己方)/红点(敌方)
- 视口矩形：白色边框随镜头实时更新
- 精确点击跳转：点击坐标使用 hex 算法

#### 质量门禁
- critical-paths.yaml：16 条关键路径定义 + 门禁脚本
- golden replay 测试：4 个 round-trip 确定性测试
- `npm run check` 集成：critical-paths + golden-replay

### Changed
- 公共 API 统一：`currentPlayer`/`findUnit`/`findCity` 从 `query.ts` 导出
- 外交面板增强：分数对比、科技/市政数量显示
- 政体面板：政策卡效果 tooltip + 政体加成显示
- CityPanel 重构：提取 7 个独立子组件，类型安全

### Fixed
- `buyTile` 命令添加 `hexDistance <= 3` 范围校验
- 资产压缩脚本移除冗余 `copyFileSync`，添加 `.tmp` 清理

### Infrastructure
- `scripts/compress-assets.mjs`：PNG 压缩 + WebP 生成管线
- `scripts/check-critical-paths.mjs`：关键路径门禁检查
- 生产构建资产：177MB → 0.5MB（99.5% 缩减）

## [0.3.0] - 2026-07-17

### Added

#### Phase 2 核心扩展
- 贸易路线：商人单位、路线建立、自动产出、AI 使用
- 宗教系统：万神殿(8选1)、创立宗教、传教士/使徒、宗教压力、宗教胜利
- 文化胜利：旅游业绩系统，基于文化产出
- 城邦系统：11城邦、使者分配、宗主国加成
- 大人物系统：5类伟人招募与效果
- 机场区域 + 新增奇观/建筑/政体

#### Phase 3 数据扩展
- 科技树：34→70节点，覆盖全时代
- 市政树：10→34节点，新增法西斯/共产主义/数字民主政体
- 文明：3→11（罗马/中国/希腊/埃及/阿兹特克/英格兰/美国/日本/德国/法国/俄罗斯）
- 新增单位：弩手/长枪兵/步兵/坦克/战斗机/轰炸机/战列舰/潜艇/机枪兵/反坦克组
- AI 难度：6档（开拓者/酋长/亲王/国王/皇帝）

#### HUD/UX 全面打磨
- 组件化重构：App.tsx 瘦身（-625行），提取 ~20 独立 UI 组件
  （Sidebar/CityPanel/UnitPanel/ResearchPanel/CivicsPanel/GovernmentPanel/
   DiplomacyPanel/VictoryBanner/TurnTodoPanel/TileInfoPanel/EventLogPanel/
   EventLogOverlay/CivHeader/ConfirmDialogManager/Tooltip/AssetImage/ExpandableList）
- 城市面板：每回合产出与 ETA、奇观建造、防止重复建造、产出图标常量化
- 科技/市政/生产进度条与剩余回合估算
- 全局本回合待办面板（含空政策槽提示）
- 宣战/攻击/建城确认对话框与战斗预览
- 结构化事件日志（保留 payload）
- 地图视觉层级：已行动单位灰显、资源按类别分色、领土边界描边
- 文明头像：显示胜利类型图标、修复排名平局处理
- 胜利横幅：显示文明名称而非玩家 ID
- 键盘快捷键（空格=结束回合/Tab=切换单位/?=帮助）

#### Phase 4 平衡调优
- 城市高人口增长放缓
- 丘陵防御加成 +3 CS
- 地形产出调整
- AI 难度差异化加成

### Changed
- 逻辑层：reachableTiles（BFS 可达格子）、formatYield 抽象、日志上限 1000
- combat 事件新增 attackerOwnerId/defenderOwnerId
- PixiMap：拆分 draw() 渲染函数、添加单位瓦片索引避免 O(n²) 扫描
- 美术资产：加载 AI 生成地形/地貌纹理
- 文档：路线图、架构、交付报告、打磨日志更新

### Fixed
- eventLog combat 事件文明名解析 bug（unit ID→ownerId）
- TurnTodoPanel 测试 DOM 泄漏 + 策略卡待办干扰
- 代码评审发现：isDefeated 去重、宗教胜利检查复用、死代码清理

### Removed
- 未使用的 framer-motion 依赖

## [0.2.0] - 2026-07-13

### Added
- 战斗预览：选中单位悬停敌方显示双方 CS + 预计伤害（`previewCombat` 纯函数 + 面板）
- 胜利进度面板：时代/回合、科技胜利阶段、统治剩余首都、分数排名（US44）
- AI 难度差异化（easy 怠工+随机研究 / standard / hard 优先军事+不怠工）
- 失败玩家（无城无单位）endTurn 跳过，回合轮转不卡淘汰者
- 27 新 AI 美术资产（67 -> 94，覆盖建筑/政策卡/科技/市政/UI 全类目）
- 建筑/政策卡图标接入城市训练与政体面板
- `CLAUDE.md`（架构/命令/约定指引）

### Changed
- AI 扩张更积极（开拓者更早产出、建城距离 >=3），验证 40 回合内建 ≥2 城
- 渲染层 PixiMap 领土着色 + 选中可移动范围高亮

### Fixed
- endTurn 包裹检测改用 `nextActivePlayer`（跳过失败玩家，修正淘汰者卡回合）
- describe.ts 死代码（无操作三元）移除

### Security
- .gitignore 已含 .env* 规则；无 secret 泄露

## [0.1.0] - 2026-07-13

### Added
- 完整 Phase 1 MVP 逻辑层（headless 纯 TypeScript，确定性）：RNG/六边形数学/地图生成(Simplex+seed)/城市增长扩张/建造者充能改良/34 节点科技树+尤里卡/7 区域相邻加成（签名机制）/8 政体+11 政策卡（签名机制）/A*寻路+ZOC/战斗公式+城墙攻城/3 文明差异化/3 种胜利/外交
- 两层 utility AI（2 对手，3 档难度差异化，确定性）
- PixiJS WebGL 渲染 + 交互（选中/移动/攻击/可移动范围/领土着色/政体政策面板/研究市政图标/城市队列进度/地块悬停信息/事件 toast）
- 存档系统（IndexedDB + JSON 导入导出 + 损坏校验矩阵）
- 67 AI 生成美术资产（经 /jiuqing-image-generate，全 10 类目，接入地形/单位/区域/肖像/科技/市政）
- 116 测试，覆盖率 lines 92% / branches 82% / functions 95%（≥80%）
- CI（test + coverage + depcruise + 纯度门禁）
- 完整设计文档集（PRD/gamedata/architecture/ai-design/art-spec/testing/setup/mapgen）

### Changed
- 渲染层从 SVG/DOM 迁移至 PixiJS WebGL
- AI 难度差异化（easy 怠工+随机研究 / standard / hard 优先军事+不怠工）

### Fixed
- 存档损坏校验（版本/缺字段/非对象/不可恢复 -> 类型化错误码）
- 失败玩家（无城无单位）AI 以 endTurn 结尾不卡住
- describe.ts 死代码（无操作三元）移除

### Security
- .gitignore 补全 .env* 规则
- 无 secret 泄露（API key 走环境变量）

[0.1.0]: https://github.com/civ-dev/civilization/releases/tag/v0.1.0
