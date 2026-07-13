# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
