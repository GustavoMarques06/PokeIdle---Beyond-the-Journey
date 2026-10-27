// ATIVIDADES: tudo que roda em paralelo às batalhas — creche, expedições, jardim,
// fósseis, Torre de Batalha, torneio, Safari, Game Corner e caça ao shiny.

import { useState, type ReactNode } from 'react';
import { activityUnlocked, type Activity } from '../../core/collection';
import { expeditionDone } from '../../core/expeditions';
import type { GameState } from '../../core/game';
import { plotReady } from '../../core/garden';
import { ItemIcon, PixelIcon } from '../components/common';
import { DaycarePanel } from './activities/DaycarePanel';
import { ExpeditionsPanel } from './activities/ExpeditionsPanel';
import { FossilPanel } from './activities/FossilPanel';
import { GameCornerPanel } from './activities/GameCornerPanel';
import { GardenPanel } from './activities/GardenPanel';
import { HuntPanel } from './activities/HuntPanel';
import { LegendaryPanel } from './activities/LegendaryPanel';
import { RaidsPanel } from './activities/RaidsPanel';
import { SafariPanel } from './activities/SafariPanel';
import { TournamentPanel } from './activities/TournamentPanel';
import { TowerPanel } from './activities/TowerPanel';
import { TrainingPanel } from './activities/TrainingPanel';

type Tab =
  | 'daycare'
  | 'expeditions'
  | 'garden'
  | 'fossils'
  | 'training'
  | 'raids'
  | 'hunt'
  | 'legendary'
  | 'tower'
  | 'tournament'
  | 'safari'
  | 'gamecorner';

const TABS: { id: Tab; label: string; icon: ReactNode; unlock?: Activity }[] = [
  { id: 'daycare', label: 'CRECHE', icon: <PixelIcon name="egg" scale={2} />, unlock: 'daycare' },
  {
    id: 'expeditions',
    label: 'EXPEDIÇÕES',
    icon: <ItemIcon id="explorer-kit" size={22} />,
    unlock: 'expeditions',
  },
  { id: 'garden', label: 'JARDIM', icon: <ItemIcon id="oran-berry" size={22} />, unlock: 'garden' },
  { id: 'fossils', label: 'FÓSSEIS', icon: <ItemIcon id="helix-fossil" size={22} />, unlock: 'fossils' },
  { id: 'training', label: 'TREINO', icon: <ItemIcon id="macho-brace" size={22} />, unlock: 'training' },
  { id: 'raids', label: 'RAIDES', icon: <PixelIcon name="boss" scale={2} />, unlock: 'raids' },
  { id: 'hunt', label: 'CAÇA SHINY', icon: <PixelIcon name="target" scale={2} /> },
  { id: 'legendary', label: 'LENDÁRIOS', icon: <PixelIcon name="star" scale={2} /> },
  { id: 'tower', label: 'TORRE', icon: <PixelIcon name="trophy" scale={2} />, unlock: 'tower' },
  { id: 'tournament', label: 'TORNEIO', icon: <PixelIcon name="star" scale={2} />, unlock: 'tournament' },
  { id: 'safari', label: 'SAFARI', icon: <ItemIcon id="safari-ball" size={22} />, unlock: 'safari' },
  {
    id: 'gamecorner',
    label: 'GAME CORNER',
    icon: <ItemIcon id="coin-case" size={22} />,
    unlock: 'gamecorner',
  },
];

/** As 12 abas em três grupos de quatro. */
const GROUPS: { label: string; tabs: Tab[] }[] = [
  { label: 'CRIAÇÃO', tabs: ['daycare', 'garden', 'fossils', 'training'] },
  { label: 'DESAFIOS', tabs: ['raids', 'legendary', 'tower', 'tournament'] },
  { label: 'EXPLORAR', tabs: ['expeditions', 'safari', 'hunt', 'gamecorner'] },
];

export function ActivitiesScreen({ state }: { state: GameState }) {
  const [tab, setTab] = useState<Tab>('daycare');
  const now = state.lastTimerAt;
  const ready: Partial<Record<Tab, boolean>> = {
    daycare: state.eggs.some((e) => e.progress / e.cycles > 0.9),
    expeditions: state.expeditions.some((r) => expeditionDone(r, now)),
    garden: state.garden.some((p) => plotReady(p, now)),
    fossils: state.fossils.some((f) => now >= f.readyAt),
    raids: !!state.raid,
    safari: !!state.safari,
  };

  return (
    <div className="activities-screen">
      <div className="activity-tabs grouped frame frame-menu" role="tablist">
        {GROUPS.map((g) => (
          <div key={g.label} className="activity-group">
            <h4>{g.label}</h4>
            {g.tabs.map((id) => {
              const t = TABS.find((x) => x.id === id)!;
              const open = !t.unlock || activityUnlocked(state, t.unlock);
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`activity-tab ${tab === t.id ? 'active' : ''} ${open ? '' : 'locked'}`}
                  onClick={() => setTab(t.id)}
                >
                  {open ? t.icon : <PixelIcon name="lock" scale={2} />}
                  <span>{t.label}</span>
                  {ready[t.id] && <span className="menu-alert" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {tab === 'daycare' && <DaycarePanel state={state} />}
      {tab === 'expeditions' && <ExpeditionsPanel state={state} />}
      {tab === 'garden' && <GardenPanel state={state} />}
      {tab === 'fossils' && <FossilPanel state={state} />}
      {tab === 'training' && <TrainingPanel state={state} />}
      {tab === 'raids' && <RaidsPanel state={state} />}
      {tab === 'hunt' && <HuntPanel state={state} />}
      {tab === 'legendary' && <LegendaryPanel state={state} />}
      {tab === 'tower' && <TowerPanel state={state} />}
      {tab === 'tournament' && <TournamentPanel state={state} />}
      {tab === 'safari' && <SafariPanel state={state} />}
      {tab === 'gamecorner' && <GameCornerPanel state={state} />}
    </div>
  );
}
