// 右侧边栏
import { useGame, useCurrentPlayer } from './store';
import { CivHeader } from './CivHeader';
import { EventLogPanel } from './EventLogPanel';
import { TurnTodoPanel } from './TurnTodoPanel';
import { ResearchPanel } from './ResearchPanel';
import { CivicsPanel } from './CivicsPanel';
import { GovernmentPanel } from './GovernmentPanel';
import { DiplomacyPanel } from './DiplomacyPanel';
import { UnitPanel } from './UnitPanel';
import { CityPanel } from './CityPanel';
import { TileInfoPanel } from './TileInfoPanel';
import { ReligionPanel } from './ReligionPanel';
import { CityStatePanel } from './CityStatePanel';
import { GreatPeoplePanel } from './GreatPeoplePanel';
import { TradeRoutePanel } from './TradeRoutePanel';
import { VictoryProgressPanel } from './VictoryProgressPanel';
import { theme } from './theme';

interface SidebarProps {
  researchRef: React.RefObject<HTMLDivElement>;
  civicRef: React.RefObject<HTMLDivElement>;
  onRequestWar: (targetCivId: string) => void;
  onRequestFoundCity: (unitId: string, name: string) => void;
}

export function Sidebar({ researchRef, civicRef, onRequestWar, onRequestFoundCity }: SidebarProps) {
  const player = useCurrentPlayer();
  const selectUnit = useGame((s) => s.selectUnit);
  const selectCity = useGame((s) => s.selectCity);

  const scrollToResearch = () => researchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const scrollToCivics = () => civicRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div
      style={{
        width: 300,
        padding: theme.spacing.md,
        background: theme.colors.bgPanel,
        overflowY: 'auto',
        fontSize: 12,
        fontFamily: theme.fontFamily,
      }}
    >
      <TurnTodoPanel
        player={player}
        onSelectUnit={selectUnit}
        onSelectCity={selectCity}
        onOpenResearch={scrollToResearch}
        onOpenCivics={scrollToCivics}
      />
      <UnitPanel onRequestFoundCity={onRequestFoundCity} />
      <CityPanel />
      <TileInfoPanel />
      <CivHeader />
      <VictoryProgressPanel />
      <ReligionPanel />
      <CityStatePanel />
      <GreatPeoplePanel />
      <TradeRoutePanel />
      <ResearchPanel ref={researchRef} />
      <CivicsPanel ref={civicRef} />
      <GovernmentPanel />
      <DiplomacyPanel onRequestWar={onRequestWar} />
      <EventLogPanel />
    </div>
  );
}
