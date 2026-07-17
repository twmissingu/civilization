// 工具提示组件：为按钮和图标提供悬停说明
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { theme } from './theme';
import { YIELD_LABELS } from '../logic/state/describe';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const GAP = 8;

export function Tooltip({ children, content, position = 'top', delay = 300 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const cx = rect.left + rect.width / 2;
    const cyTop = rect.top;
    const cyBottom = rect.bottom;
    const cyMid = rect.top + rect.height / 2;

    // 优先使用请求方向，超界时翻转
    let pos = position;
    if (position === 'top' && cyTop < 80) pos = 'bottom';
    if (position === 'bottom' && cyBottom > vh - 80) pos = 'top';
    if (position === 'left' && rect.left < 120) pos = 'right';
    if (position === 'right' && rect.right > vw - 120) pos = 'left';

    let x = cx;
    let y = cyMid;
    if (pos === 'top') y = cyTop - GAP;
    if (pos === 'bottom') y = cyBottom + GAP;
    if (pos === 'left') x = rect.left - GAP;
    if (pos === 'right') x = rect.right + GAP;

    // 水平边界修正
    x = Math.max(60, Math.min(vw - 60, x));
    // 垂直边界修正
    y = Math.max(20, Math.min(vh - 20, y));

    setCoords({ x, y });
    setActualPosition(pos);
  }, [position]);

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      computePosition();
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    const handler = () => computePosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isVisible, computePosition]);

  const getTooltipStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: coords.x,
      top: coords.y,
      background: theme.colors.bgCard,
      color: theme.colors.text,
      padding: '6px 10px',
      borderRadius: theme.borderRadius,
      fontSize: 12,
      maxWidth: 250,
      zIndex: 10000,
      pointerEvents: 'none',
      border: `1px solid ${theme.colors.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      fontFamily: theme.fontFamily,
    };

    switch (actualPosition) {
      case 'top':
        return { ...baseStyle, transform: 'translateX(-50%) translateY(-100%)' };
      case 'bottom':
        return { ...baseStyle, transform: 'translateX(-50%)' };
      case 'left':
        return { ...baseStyle, transform: 'translateX(-100%) translateY(-50%)' };
      case 'right':
        return { ...baseStyle, transform: 'translateY(-50%)' };
      default:
        return baseStyle;
    }
  };

  const tooltipNode = isVisible ? (
    <div style={getTooltipStyle()} role="tooltip">
      {content}
    </div>
  ) : null;

  return (
    <div
      ref={triggerRef}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
      style={{ display: 'inline-block' }}
    >
      {children}
      {typeof document !== 'undefined' && createPortal(tooltipNode, document.body)}
    </div>
  );
}

// 资源工具提示
export function ResourceTooltip({ 
  type, 
  children 
}: { 
  type: 'gold' | 'science' | 'culture' | 'faith' | 'food' | 'production';
  children: React.ReactNode;
}) {
  const descriptions = {
    gold: '金币用于购买单位、建筑和地块，也可用于维护军队',
    science: '科技点用于研究新科技，解锁更强单位和建筑',
    culture: '文化点用于研究市政，解锁政策卡和政体',
    faith: '信仰点用于购买宗教单位（MVP中仅计入分数胜利）',
    food: '食物用于城市人口增长，人口越高产出越多',
    production: '产能决定建造单位和建筑的速度',
  };

  return (
    <Tooltip content={descriptions[type]} position="bottom">
      {children}
    </Tooltip>
  );
}

// 单位信息工具提示
export function UnitTooltip({ 
  unit, 
  children 
}: { 
  unit: {
    name: string;
    csMelee: number;
    csRanged: number;
    hp: number;
    move: number;
    domain: string;
  };
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{unit.name}</div>
        <div>类型: {getDomainName(unit.domain)}</div>
        <div>近战CS: {unit.csMelee}</div>
        {unit.csRanged > 0 && <div>远程CS: {unit.csRanged}</div>}
        <div>HP: {unit.hp}</div>
        <div>移动: {unit.move}</div>
      </div>
    } position="right">
      {children}
    </Tooltip>
  );
}

// 建筑信息工具提示
export function BuildingTooltip({ 
  building, 
  children 
}: { 
  building: {
    name: string;
    yield: {
      food: number;
      production: number;
      gold: number;
      science: number;
      culture: number;
      faith: number;
    };
    housing: number;
    amenities: number;
    effects?: Record<string, number>;
  };
  children: React.ReactNode;
}) {
  const yieldEntries = Object.entries(building.yield).filter(([, v]) => v > 0);
  
  return (
    <Tooltip content={
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{building.name}</div>
        {yieldEntries.map(([key, value]) => (
          <div key={key} style={{ color: getYieldColor(key) }}>
            {getYieldName(key)}: +{value}
          </div>
        ))}
        {building.housing > 0 && <div>住房: +{building.housing}</div>}
        {building.amenities > 0 && <div>宜居度: +{building.amenities}</div>}
        {building.effects && Object.entries(building.effects).map(([key, value]) => (
          <div key={key}>{getEffectName(key)}: {value}</div>
        ))}
      </div>
    } position="left">
      {children}
    </Tooltip>
  );
}

// 科技信息工具提示
export function TechTooltip({
  tech,
  turnsLeft,
  children
}: {
  tech: {
    name: string;
    era: string;
    cost: number;
    eureka: { predicate: string; boost: number };
    unlocks: string[];
  };
  turnsLeft?: number | null;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{tech.name}</div>
        <div>时代: {getEraName(tech.era)}</div>
        <div>成本: {tech.cost}</div>
        {turnsLeft !== undefined && turnsLeft !== null && (
          <div style={{ color: '#8cf' }}>预计 {turnsLeft} 回合完成</div>
        )}
        <div>尤里卡: {getEurekaDescription(tech.eureka.predicate)}</div>
        <div>解锁: {tech.unlocks.map(u => getUnlockName(u)).join(', ')}</div>
      </div>
    } position="left">
      {children}
    </Tooltip>
  );
}

// 市政信息工具提示
export function CivicTooltip({
  civic,
  turnsLeft,
  children
}: {
  civic: {
    name: string;
    era: string;
    cost: number;
    inspiration: { predicate: string; boost: number };
    unlocks: string[];
  };
  turnsLeft?: number | null;
  children: React.ReactNode;
}) {
  return (
    <Tooltip content={
      <div>
        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{civic.name}</div>
        <div>时代: {getEraName(civic.era)}</div>
        <div>成本: {civic.cost}</div>
        {turnsLeft !== undefined && turnsLeft !== null && (
          <div style={{ color: '#8cf' }}>预计 {turnsLeft} 回合完成</div>
        )}
        <div>灵感: {getInspirationDescription(civic.inspiration.predicate)}</div>
        <div>解锁: {civic.unlocks.map(u => getUnlockName(u)).join(', ')}</div>
      </div>
    } position="left">
      {children}
    </Tooltip>
  );
}

// 辅助函数
function getDomainName(domain: string): string {
  const names: Record<string, string> = {
    melee: '近战',
    ranged: '远程',
    cavalry: '骑乘',
    siege: '攻城',
    siege_ranged: '攻城远程',
    naval_melee: '海军近战',
    naval_ranged: '海军远程',
    civilian: '平民',
  };
  return names[domain] || domain;
}

function getYieldColor(key: string): string {
  return (theme.colors as Record<string, string>)[key] ?? '#ccc';
}

function getYieldName(key: string): string {
  const label = YIELD_LABELS.find((l) => l.key === key);
  return label?.full || key;
}

function getEffectName(key: string): string {
  const names: Record<string, string> = {
    capital: '首都',
    walls_hp: '城墙HP',
    city_ranged_strike: '城市远程攻击',
    xp_bonus: '经验加成',
    naval_move: '海军移动',
  };
  return names[key] || key;
}

function getEraName(era: string): string {
  const names: Record<string, string> = {
    ancient: '远古',
    classical: '古典',
    medieval: '中世纪',
    renaissance: '文艺复兴',
    industrial: '工业',
    modern: '现代',
    atomic: '原子',
    information: '信息',
  };
  return names[era] || era;
}

function getEurekaDescription(predicate: string): string {
  const descriptions: Record<string, string> = {
    build_a_farm: '建造一座农场',
    find_bonus_or_horse: '发现加成或马资源',
    build_a_mine: '建造一座矿场',
    build_a_quarry: '建造一座采石场',
    find_geothermal: '发现地热资源',
    meet_another_civ: '遇到另一个文明',
    kill_with_slinger: '用投石手击杀单位',
    find_horse: '发现马资源',
    found_coastal_city: '建立沿海城市',
    build_a_harbor: '建造港口区域',
    build_a_campus: '建造学院区域',
    build_an_aqueduct: '建造水渠',
    build_a_commercial: '建造商业中心区域',
    build_an_encampment: '建造军营区域',
    build_a_workshop: '建造工坊',
    build_a_theater: '建造剧院区域',
    build_a_university: '建造大学',
    build_an_improvement: '建造一个改良设施',
  };
  return descriptions[predicate] || predicate;
}

function getInspirationDescription(predicate: string): string {
  const descriptions: Record<string, string> = {
    initial: '初始获得',
    build_a_district: '建造一个区域',
    win_a_battle: '赢得一场战斗',
    meet_3_civs: '遇到3个文明',
    build_a_holy_site: '建造圣地区域',
    build_5_farms: '建造5座农场',
    build_a_commercial: '建造商业中心区域',
    build_a_theater: '建造剧院区域',
    build_a_university: '建造大学',
  };
  return descriptions[predicate] || predicate;
}

function getUnlockName(unlock: string): string {
  const names: Record<string, string> = {
    granary: '粮仓',
    plantation: '种植园',
    pasture: '牧场',
    mine: '矿场',
    quarry: '采石场',
    ancient_walls: '古代城墙',
    pyramids: '金字塔',
    holy_site: '圣地',
    library: '图书馆',
    archer: '弓手',
    swordsman: '剑士',
    barracks: '兵营',
    cavalry: '骑兵',
    stable: '马厩',
    fishing_boats: '渔船',
    lighthouse: '灯塔',
    trireme: '三列桨',
    shipyard: '造船厂',
    quadrireme: '四列桨',
    lumber_mill: '伐木场',
    workshop: '工坊',
    catapult: '投石机',
    aqueduct: '水渠',
    fort: '堡垒',
    market: '市场',
    siege_tower: '攻城塔',
    university: '大学',
    chu_ko_nu: '诸葛弩',
    medieval_walls: '中世纪城墙',
    knight: '骑士',
    cannon: '大炮',
    forbidden_city: '紫禁城',
    bank: '银行',
    zoo: '动物园',
    factory: '工厂',
    musketman: '步枪兵',
    knight_upgrade: '骑士升级',
    farm_bonus: '农场加成',
    factory_bonus: '工厂加成',
    mine_bonus: '矿场加成',
    rocketry_prereq: '火箭技术前置',
    space_project_1: '太空项目阶段1',
    space_project_2: '太空项目阶段2',
    space_project_3: '太空项目阶段3',
    chiefdom: '酋邦',
    discipline: '纪律',
    autocracy: '独裁',
    urban_planning: '城市规划',
    mason: '砖瓦匠',
    oligarchy: '寡头',
    maneuver: '谋略',
    discipline_b: '战意',
    classical_republic: '古典共和',
    intermediate: '内部事务',
    natural_philosophy: '自然哲学',
    theocracy: '神权',
    monarchy: '君主',
    merchant_republic: '商业共和',
    craftsman: '工匠',
    democracy: '民主',
    enlightenment_card: '启蒙',
    theater: '剧院区域',
    drama: '戏剧',
    colosseum: '竞技场',
    museum: '博物馆',
  };
  return names[unlock] || unlock;
}
