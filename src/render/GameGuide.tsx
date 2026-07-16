// 游戏指南组件：资源图例、快速入门、游戏提示
import { useState } from 'react';
import { TERRAINS, FEATURES, RESOURCES } from '../gamedata';

interface GameGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GameGuide({ isOpen, onClose }: GameGuideProps) {
  const [activeSection, setActiveSection] = useState<'legend' | 'quickstart' | 'tips'>('legend');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: 16,
      width: 300,
      maxHeight: 'calc(100vh - 100px)',
      background: '#1a1a2e',
      borderRadius: 8,
      border: '1px solid #444',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 900,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid #444',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveSection('legend')}
            style={{
              padding: '4px 8px',
              background: activeSection === 'legend' ? '#2a2a3e' : 'transparent',
              border: 'none',
              color: activeSection === 'legend' ? '#c9a84c' : '#888',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            图例
          </button>
          <button
            onClick={() => setActiveSection('quickstart')}
            style={{
              padding: '4px 8px',
              background: activeSection === 'quickstart' ? '#2a2a3e' : 'transparent',
              border: 'none',
              color: activeSection === 'quickstart' ? '#c9a84c' : '#888',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            快速入门
          </button>
          <button
            onClick={() => setActiveSection('tips')}
            style={{
              padding: '4px 8px',
              background: activeSection === 'tips' ? '#2a2a3e' : 'transparent',
              border: 'none',
              color: activeSection === 'tips' ? '#c9a84c' : '#888',
              cursor: 'pointer',
              fontSize: 12,
            }}
          >
            提示
          </button>
        </div>
        <button
          onClick={onClose}
          aria-label="关闭"
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px',
        fontSize: 12,
        lineHeight: 1.5,
      }}>
        {activeSection === 'legend' && <LegendContent />}
        {activeSection === 'quickstart' && <QuickStartContent />}
        {activeSection === 'tips' && <TipsContent />}
      </div>
    </div>
  );
}

function LegendContent() {
  return (
    <div>
      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>地形</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {Object.values(TERRAINS).filter(t => !t.impassable).map(terrain => (
          <div key={terrain.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            padding: '2px 4px',
            background: '#2a2a3e',
            borderRadius: 3,
          }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: getTerrainColor(terrain.id),
            }} />
            <span>{getTerrainName(terrain.id)}</span>
          </div>
        ))}
      </div>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>特征</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {Object.values(FEATURES).map(feature => (
          <div key={feature.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            padding: '2px 4px',
            background: '#2a2a3e',
            borderRadius: 3,
          }}>
            <span>{getFeatureIcon(feature.id)}</span>
            <span>{getFeatureName(feature.id)}</span>
          </div>
        ))}
      </div>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>资源</h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
        {Object.values(RESOURCES).map(resource => (
          <div key={resource.id} style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 6,
            padding: '2px 4px',
            background: '#2a2a3e',
            borderRadius: 3,
          }}>
            <span>{getResourceIcon(resource.id)}</span>
            <span>{getResourceName(resource.id)}</span>
            <span style={{ color: '#888', fontSize: 10 }}>
              ({getResourceCategoryName(resource.category)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickStartContent() {
  return (
    <div>
      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>第一步：建城</h4>
      <ol style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>选择你的开拓者（🏠图标）</li>
        <li>移动到理想位置（建议靠近资源）</li>
        <li>点击右侧面板的"建城"按钮</li>
        <li>输入城市名称</li>
      </ol>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>第二步：发展</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li><strong>研究科技</strong> - 在右侧面板选择科技</li>
        <li><strong>训练单位</strong> - 点击城市选择要训练的单位</li>
        <li><strong>建造建筑</strong> - 点击城市选择要建造的建筑</li>
        <li><strong>探索地图</strong> - 用战士探索周围区域</li>
      </ul>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>第三步：扩张</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li><strong>建造开拓者</strong> - 训练新的开拓者建立新城市</li>
        <li><strong>建造者</strong> - 训练建造者改良地块</li>
        <li><strong>区域规划</strong> - 在城市旁放置区域获得加成</li>
        <li><strong>政策卡</strong> - 研究市政解锁政策卡</li>
      </ul>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>第四步：胜利</h4>
      <ul style={{ paddingLeft: 16 }}>
        <li><strong>科技胜利</strong> - 研究火箭技术，完成太空项目</li>
        <li><strong>统治胜利</strong> - 征服所有对手的首都</li>
        <li><strong>分数胜利</strong> - 300回合结束时分数最高</li>
      </ul>
    </div>
  );
}

function TipsContent() {
  return (
    <div>
      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>开局技巧</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>优先研究畜牧或采矿，解锁牧场/矿场</li>
        <li>早期建造纪念碑提升文化</li>
        <li>保持至少一个战士探索地图</li>
        <li>在资源旁建城获得更多加成</li>
      </ul>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>战斗技巧</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>利用丘陵获得防御加成</li>
        <li>远程单位可以无伤攻击</li>
        <li>占领城市前先削弱城墙</li>
        <li>保持单位HP高于50%</li>
      </ul>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>经济技巧</h4>
      <ul style={{ paddingLeft: 16, marginBottom: 12 }}>
        <li>奢侈品资源提供宜居度</li>
        <li>商业中心增加金币收入</li>
        <li>学院区域提升科技产出</li>
        <li>剧院区域提升文化产出</li>
      </ul>

      <h4 style={{ color: '#c9a84c', marginTop: 0, marginBottom: 8 }}>常见错误</h4>
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

function getTerrainName(id: string): string {
  const names: Record<string, string> = {
    grassland: '草地',
    plains: '平原',
    hills: '丘陵',
    desert: '沙漠',
    tundra: '冻土',
    snow: '雪地',
    coast: '海岸',
    ocean: '海洋',
  };
  return names[id] || id;
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

function getFeatureName(id: string): string {
  const names: Record<string, string> = {
    forest: '森林',
    rainforest: '雨林',
    marsh: '沼泽',
    geothermal: '地热',
    oasis: '绿洲',
    floodplains: '泛滥平原',
  };
  return names[id] || id;
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

function getResourceName(id: string): string {
  const names: Record<string, string> = {
    cattle: '牛',
    sheep: '羊',
    wheat: '小麦',
    copper: '铜',
    stone: '石头',
    iron: '铁',
    horse: '马',
    spice: '香料',
    silk: '丝绸',
  };
  return names[id] || id;
}

function getResourceCategoryName(category: string): string {
  const names: Record<string, string> = {
    bonus: '加成',
    luxury: '奢侈',
    strategic: '战略',
  };
  return names[category] || category;
}
