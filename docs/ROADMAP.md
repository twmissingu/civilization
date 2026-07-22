# ROADMAP

## v0.6.0 — 代码质量重构 + 视觉特效

- 命令注册表模式：commands.ts 委派给 commandRegistry.ts，25+ 命令 handler 分离为独立模块
- PixiMap 渲染层拆分：五层渲染（terrain/dynamic/river/districts/fog）提取到 `src/render/pixi/layers.ts` + 视觉特效系统 `effects.ts`
- 奇观建成金色光环动画 + 战斗爆炸粒子特效 + 镜头聚焦
- 存档版本迁移链：MIGRATIONS 记录支持 v1→v2 自动升级
- ESLint + Prettier 工具链集成 + Playwright E2E 框架
- 类型安全修复：serialize.ts unsafe cast 消除、isDefeated/nextActivePlayer 去重
- **540 测试**（+67），语句 91.34%，分支 85.04%
- 验证：tsc 零错误，build 1.57s，门禁全绿

## 已实现（v0.5.0 — Phase 1 上线收尾 + 打磨）

### 架构基线（第一批）
- 统一 query API：渲染层通过 `query.ts` 访问逻辑层，禁止直接 import `commands.ts`
- 分片订阅 hooks：`useCurrentPlayer`/`usePlayerUnits`/`usePlayerCities` 等
- PixiMap 脏标记优化：`mapVersion` 计数器避免不必要重绘
- 事件从 GameState.log 剥离（已验证 GameState 无 log 字段）
- 迷雾遮罩渲染：`revealArea` + `updatePlayerVisibility`，初始只露出玩家单位周围
- 河流 overlay 渲染：地图生成连续河流 + 蓝色河流线

### 城市 UI + 资产管线（第二批）
- CityPanel 渐进增强：区域放置、金币买地、队列拖拽排序、市民分配
- 城市名称标签显示在 PixiMap 城市圆点下方
- 资产压缩管线：177MB → 0.5MB（99.5% 缩减），WebP + PNG 双格式
- SVG 手绘风格产出图标（`<YieldIcon>` 组件替代 emoji）

### 体验打磨（第三批）
- 小地图增强：迷雾/单位/视口矩形/精确点击跳转
- 回合待办强制阻止 endTurn：有待办时按钮禁用
- 政体政策数值实时反馈：政策卡效果 tooltip + 政体加成显示
- 胜利进度面板：5 种胜利条件进度条
- Phase 2 系统 UI 入口：宗教/城邦/大人物/贸易路线面板
- 镜头平滑插值：requestAnimationFrame lerp 动画
- 外交面板增强：分数对比/科技/市政数量
- AI 回合异步化：分片执行 + 进度指示器覆盖层

### 验证闭环（第四批）
- golden replay 测试：4 个 round-trip 确定性测试
- critical-paths.yaml 门禁：16 条关键路径
- RNG 序列化 round-trip 验证

### 第五轮打磨（当前）
- 选中单位脉冲动画（PixiJS ticker 驱动 alpha 呼吸效果）
- 分片 selector 优化（6 个组件切换到粒度订阅）
- CityPanel 类型安全全面覆盖（所有 `any` 类型替换）
- 新增 8 个测试（406 总测试，46 测试文件）
- ErrorBoundary 包裹 6 个面板

## 已收敛（全维度 ≥8，多数 9）
玩法完整性 8 / 视觉与音效 8 / 性能 8 / 可靠性 9 / 代码质量 9 / 测试覆盖 9

## 后续迭代（Phase 2+）
- 科技/市政树网络图可视化（XL）
- CityPanel 全屏重构（XL）
- 平衡专项调优（战斗/增长数值）
- 音频系统（Phase 5）