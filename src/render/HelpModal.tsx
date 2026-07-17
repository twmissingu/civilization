// 帮助模态框：规则、快速入门、图例、操作说明、胜利条件、术语表、提示
import { useState, useEffect, useRef } from 'react';
import { TERRAINS, FEATURES, RESOURCES } from '../gamedata';
import { terrainLabel, featureLabel, resourceLabel, RESOURCE_CATEGORY_LABELS } from '../logic/state/describe';
import { theme } from './theme';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'quickstart' | 'rules' | 'legend' | 'controls' | 'victory' | 'glossary' | 'tips';

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('quickstart');
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeBtnRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'quickstart', label: '快速入门' },
    { id: 'rules', label: '游戏规则' },
    { id: 'legend', label: '图例' },
    { id: 'controls', label: '操作说明' },
    { id: 'victory', label: '胜利条件' },
    { id: 'glossary', label: '术语表' },
    { id: 'tips', label: '提示' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: theme.colors.bgOverlay + 'cc',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: theme.colors.bg,
        borderRadius: 8,
        width: '80%',
        maxWidth: 800,
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${theme.colors.border}`,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
        }}>
          <h2 id="help-title" style={{ margin: 0, color: theme.colors.accent, fontSize: 18 }}>游戏帮助</h2>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label="关闭"
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.textDim,
              fontSize: 20,
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="帮助分类"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            borderBottom: `1px solid ${theme.colors.border}`,
            padding: '0 16px',
          }}
        >
          {tabs.map((tab) => (
            <button
              role="tab"
              aria-selected={activeTab === tab.id}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 14px',
                background: activeTab === tab.id ? theme.colors.bgCard : 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
                color: activeTab === tab.id ? theme.colors.accent : theme.colors.textDim,
                cursor: 'pointer',
                fontSize: 13,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '16px',
          fontSize: 13,
          lineHeight: 1.6,
        }}>
          {activeTab === 'quickstart' && <QuickStartContent />}
          {activeTab === 'rules' && <RulesContent />}
          {activeTab === 'legend' && <LegendContent />}
          {activeTab === 'controls' && <ControlsContent />}
          {activeTab === 'victory' && <VictoryContent />}
          {activeTab === 'glossary' && <GlossaryContent />}
          {activeTab === 'tips' && <TipsContent />}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 16px',
          borderTop: `1px solid ${theme.colors.border}`,
          textAlign: 'right',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 16px',
              background: theme.colors.primary,
              border: 'none',
              color: '#fff',
              borderRadius: theme.borderRadius,
              cursor: 'pointer',
            }}
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickStartContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>快速入门</h3>

      <h4 style={{ color: theme.colors.accent }}>第一步：建城</h4>
      <ol style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>选择你的开拓者（⌂图标）</li>
        <li>移动到理想位置（建议靠近资源）</li>
        <li>点击右侧面板的"建城"按钮</li>
      </ol>

      <h4 style={{ color: theme.colors.accent }}>第二步：发展</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li><strong>研究科技</strong> - 在右侧面板选择科技</li>
        <li><strong>训练单位</strong> - 点击城市选择要训练的单位</li>
        <li><strong>建造建筑</strong> - 点击城市选择要建造的建筑</li>
        <li><strong>探索地图</strong> - 用战士探索周围区域</li>
      </ul>

      <h4 style={{ color: theme.colors.accent }}>第三步：扩张</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li><strong>建造开拓者</strong> - 训练新的开拓者建立新城市</li>
        <li><strong>建造者</strong> - 训练建造者改良地块</li>
        <li><strong>区域规划</strong> - 在城市旁放置区域获得加成</li>
        <li><strong>政策卡</strong> - 研究市政解锁政策卡</li>
      </ul>

      <h4 style={{ color: theme.colors.accent }}>第四步：胜利</h4>
      <ul style={{ paddingLeft: 16 }}>
        <li><strong>科技胜利</strong> - 研究火箭技术，完成太空项目</li>
        <li><strong>统治胜利</strong> - 征服所有对手的首都</li>
        <li><strong>分数胜利</strong> - 300回合结束时分数最高</li>
      </ul>
    </div>
  );
}

function RulesContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>核心玩法</h3>
      <p>文明6是一款回合制4X策略游戏。你需要带领一个文明从石器时代发展到信息时代，通过探索、扩张、征服和发展来取得胜利。</p>

      <h4 style={{ color: theme.colors.culture }}>每回合你可以：</h4>
      <ul>
        <li><strong>移动单位</strong> - 点击单位选择，再点击目标格子移动</li>
        <li><strong>管理城市</strong> - 点击城市查看生产队列、训练单位、建造建筑</li>
        <li><strong>研究科技</strong> - 在右侧面板选择要研究的科技</li>
        <li><strong>研究市政</strong> - 在右侧面板选择要研究的市政</li>
        <li><strong>管理政策</strong> - 装备政策卡获得加成</li>
        <li><strong>外交互动</strong> - 与其他文明宣战或求和</li>
        <li><strong>结束回合</strong> - 点击右上角"结束回合"按钮或按空格键</li>
      </ul>

      <h4 style={{ color: theme.colors.culture }}>资源类型</h4>
      <ul>
        <li><strong style={{ color: theme.colors.gold }}>金币</strong> - 用于购买单位、建筑和地块</li>
        <li><strong style={{ color: theme.colors.science }}>科技</strong> - 研究新科技，解锁更强单位和建筑</li>
        <li><strong style={{ color: theme.colors.culture }}>文化</strong> - 研究市政，解锁政策卡和政体</li>
        <li><strong style={{ color: theme.colors.faith }}>信仰</strong> - 用于购买宗教单位（MVP中仅计入分数）</li>
        <li><strong style={{ color: theme.colors.food }}>食物</strong> - 城市人口增长所需</li>
        <li><strong style={{ color: theme.colors.production }}>产能</strong> - 建造单位和建筑的速度</li>
      </ul>

      <h4 style={{ color: theme.colors.culture }}>地形与移动</h4>
      <ul>
        <li><strong>平原/草地</strong> - 移动消耗1，提供食物和产能</li>
        <li><strong>丘陵</strong> - 移动消耗2，提供更多产能</li>
        <li><strong>森林</strong> - 提供食物和产能，可建造伐木场</li>
        <li><strong>山脉</strong> - 不可通行，但提供圣地相邻加成</li>
        <li><strong>水域</strong> - 需要航海科技才能进入</li>
      </ul>
    </div>
  );
}

function LegendContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>图例</h3>

      <h4 style={{ color: theme.colors.accent }}>地形</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {Object.values(TERRAINS).filter(t => !t.impassable).map(terrain => (
          <div key={terrain.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', background: theme.colors.bgCard, borderRadius: theme.borderRadius }}>
            <div style={{ width: 12, height: 12, borderRadius: 2, background: getTerrainColor(terrain.id) }} />
            <span>{terrainLabel(terrain.id)}</span>
          </div>
        ))}
      </div>

      <h4 style={{ color: theme.colors.accent }}>特征</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {Object.values(FEATURES).map(feature => (
          <div key={feature.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', background: theme.colors.bgCard, borderRadius: theme.borderRadius }}>
            <span>{getFeatureIcon(feature.id)}</span>
            <span>{featureLabel(feature.id)}</span>
          </div>
        ))}
      </div>

      <h4 style={{ color: theme.colors.accent }}>资源</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {Object.values(RESOURCES).map(resource => (
          <div key={resource.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 4px', background: theme.colors.bgCard, borderRadius: theme.borderRadius }}>
            <span>{getResourceIcon(resource.id)}</span>
            <span>{resourceLabel(resource.id)}</span>
            <span style={{ color: theme.colors.textDim, fontSize: 10 }}>({getResourceCategoryName(resource.category)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlsContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>操作说明</h3>

      <h4 style={{ color: theme.colors.culture }}>鼠标操作</h4>
      <ul>
        <li><strong>左键点击</strong> - 选择单位/城市，移动单位</li>
        <li><strong>左键点击地块</strong> - 选中单位后点击目标格子移动或攻击</li>
      </ul>

      <h4 style={{ color: theme.colors.culture }}>键盘快捷键</h4>
      <ul>
        <li><strong>空格</strong> - 结束回合</li>
        <li><strong>Tab</strong> - 切换到下一个未行动单位/城市</li>
        <li><strong>Shift + Tab</strong> - 切换到上一个单位/城市</li>
        <li><strong>Esc</strong> - 取消当前选择</li>
        <li><strong>Enter</strong> - 执行当前选中单位/城市的主要动作</li>
        <li><strong>?</strong> - 打开/关闭帮助</li>
      </ul>

      <h4 style={{ color: theme.colors.culture }}>单位操作</h4>
      <ul>
        <li><strong>移动</strong> - 选择单位后点击目标格子（黄色高亮）</li>
        <li><strong>攻击</strong> - 点击敌方单位或城市</li>
        <li><strong>驻扎</strong> - 选择单位后点击当前格子</li>
        <li><strong>建城</strong> - 开拓者单位可点击"建城"按钮</li>
        <li><strong>改良</strong> - 建造者单位可选择改良类型</li>
      </ul>

      <h4 style={{ color: theme.colors.culture }}>城市操作</h4>
      <ul>
        <li><strong>训练单位</strong> - 在城市面板选择要训练的单位</li>
        <li><strong>建造建筑</strong> - 在城市面板选择要建造的建筑</li>
        <li><strong>生产队列</strong> - 可添加多个项目到队列</li>
        <li><strong>城市详情</strong> - 查看人口、住房、领土等信息</li>
      </ul>

      <h4 style={{ color: theme.colors.culture }}>界面操作</h4>
      <ul>
        <li><strong>结束回合</strong> - 右上角绿色按钮</li>
        <li><strong>保存/读取</strong> - 右上角蓝色按钮</li>
        <li><strong>新局</strong> - 右上角红色按钮</li>
        <li><strong>帮助</strong> - 点击右上角"?"按钮或按 ? 键</li>
      </ul>
    </div>
  );
}

function VictoryContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>胜利条件</h3>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ color: theme.colors.gold }}>科技胜利</h4>
        <p>完成太空项目，发射火星殖民飞船。需要研究火箭技术、卫星、纳米技术等高级科技，并在城市中建造太空项目阶段。</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ color: theme.colors.danger }}>统治胜利</h4>
        <p>征服所有对手的首都。占领敌方城市时，该城市会变为你的城市。</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <h4 style={{ color: theme.colors.culture }}>分数胜利</h4>
        <p>在300回合结束时，分数最高的文明获胜。分数来源于：</p>
        <ul>
          <li>城市数量和人口</li>
          <li>已研究的科技和市政</li>
          <li>拥有的奇观</li>
          <li>军事力量</li>
          <li>信仰总量</li>
        </ul>
      </div>

      <h4 style={{ color: theme.colors.culture }}>其他胜利方式（MVP未实现）</h4>
      <ul>
        <li>文化胜利 - 通过旅游业绩吸引其他文明的游客</li>
        <li>宗教胜利 - 使世界上大多数文明信奉你的宗教</li>
        <li>外交胜利 - 在世界议会中获得足够的外交支持</li>
      </ul>
    </div>
  );
}

function GlossaryContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>术语表</h3>

      <dl>
        <dt><strong>CS (Combat Strength)</strong></dt>
        <dd>战斗力，决定战斗结果。近战单位有近战CS，远程单位有远程CS。</dd>

        <dt><strong>ZOC (Zone of Control)</strong></dt>
        <dd>控制区。近战/骑乘单位施加ZOC，敌方进入ZOC必须停步。</dd>

        <dt><strong>尤里卡 (Eureka)</strong></dt>
        <dd>科技加速条件，满足时该科技+40%研究进度。</dd>

        <dt><strong>灵感 (Inspiration)</strong></dt>
        <dd>市政加速条件，满足时该市政+40%文化进度。</dd>

        <dt><strong>区域 (District)</strong></dt>
        <dd>城市周边放置的专属格子，提供相邻加成。如学院、商业中心等。</dd>

        <dt><strong>政体 (Government)</strong></dt>
        <dd>治理形式，决定军事/经济/万能槽位数与加成。</dd>

        <dt><strong>政策卡 (Policy Card)</strong></dt>
        <dd>装入政体槽的加成卡，分军事/经济/万能三类。</dd>

        <dt><strong>宜居度 (Amenity)</strong></dt>
        <dd>城市幸福度资源，由奢侈资源/娱乐建筑提供。过低触发叛乱。</dd>

        <dt><strong>住房 (Housing)</strong></dt>
        <dd>城市人口上限，由建筑和区域提供。</dd>

        <dt><strong>奇观 (Wonder)</strong></dt>
        <dd>占独立地图格、给全局加成的特殊建造。</dd>

        <dt><strong>奢侈资源 (Luxury)</strong></dt>
        <dd>提供宜居度，文明范围内共享。</dd>

        <dt><strong>战略资源 (Strategic)</strong></dt>
        <dd>解锁高级单位，如铁、马、硝石。</dd>

        <dt><strong>加成资源 (Bonus)</strong></dt>
        <dd>仅给出加成，如牛、铜、石头。</dd>
      </dl>
    </div>
  );
}

function TipsContent() {
  return (
    <div>
      <h3 style={{ color: theme.colors.science, marginTop: 0 }}>提示</h3>

      <h4 style={{ color: theme.colors.accent }}>开局技巧</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>优先研究畜牧或采矿，解锁牧场/矿场</li>
        <li>早期建造纪念碑提升文化</li>
        <li>保持至少一个战士探索地图</li>
        <li>在资源旁建城获得更多加成</li>
      </ul>

      <h4 style={{ color: theme.colors.accent }}>战斗技巧</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>利用丘陵获得防御加成</li>
        <li>远程单位可以无伤攻击</li>
        <li>占领城市前先削弱城墙</li>
        <li>保持单位HP高于50%</li>
      </ul>

      <h4 style={{ color: theme.colors.accent }}>经济技巧</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>奢侈品资源提供宜居度</li>
        <li>商业中心增加金币收入</li>
        <li>学院区域提升科技产出</li>
        <li>剧院区域提升文化产出</li>
      </ul>

      <h4 style={{ color: theme.colors.accent }}>常见错误</h4>
      <ul style={{ paddingLeft: 16 }}>
        <li>不要过度扩张，保持城市数量合理</li>
        <li>不要忽视宜居度，否则会叛乱</li>
        <li>不要忘记研究市政解锁政策卡</li>
        <li>不要让单位闲置，保持探索</li>
      </ul>
    </div>
  );
}

// 辅助函数
function getTerrainColor(id: string): string {
  const colors: Record<string, string> = {
    grassland: '#4a7c4f',
    plains: '#8f7c4f',
    hills: '#7c6f4f',
    desert: '#c9a84c',
    tundra: '#8f8f8f',
    snow: '#ffffff',
    coast: '#4a8fc9',
    ocean: '#2a4f8f',
  };
  return colors[id] || '#888';
}

function getFeatureIcon(id: string): string {
  const icons: Record<string, string> = {
    forest: '🌲',
    rainforest: '🌴',
    marsh: '🌿',
    geothermal: '🌋',
    oasis: '🏝',
    floodplains: '🌊',
  };
  return icons[id] || '❓';
}

function getResourceIcon(id: string): string {
  const icons: Record<string, string> = {
    cattle: '🐄',
    sheep: '🐑',
    wheat: '🌾',
    copper: '⛏',
    stone: '🪨',
    iron: '⚔',
    horse: '🐴',
    spice: '🌶',
    silk: '🧵',
  };
  return icons[id] || '❓';
}

function getResourceCategoryName(category: string): string {
  return RESOURCE_CATEGORY_LABELS[category] || category;
}
