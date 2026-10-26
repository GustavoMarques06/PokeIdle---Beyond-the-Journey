// ATIVIDADES: tudo que roda em paralelo às batalhas — creche, expedições, jardim,
// fósseis, Torre de Batalha, Game Corner e caça ao shiny.

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
import { TowerPanel } from './activities/TowerPanel';

type Tab = 'daycare' | 'expeditions' | 'garden' | 'fossils' | 'hunt' | 'legendary' | 'tower' | 'gamecorner';

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
  { id: 'hunt', label: 'CAÇA SHINY', icon: <PixelIcon name="target" scale={2} /> },
  { id: 'legendary', label: 'LENDÁRIOS', icon: <PixelIcon name="star" scale={2} /> },
  { id: 'tower', label: 'TORRE', icon: <PixelIcon name="trophy" scale={2} />, unlock: 'tower' },
  {
    id: 'gamecorner',
    label: 'GAME CORNER',
    icon: <ItemIcon id="coin-case" size={22} />,
    unlock: 'gamecorner',
  },
];

export function ActivitiesScreen({ state }: { state: GameState }) {
  const [tab, setTab] = useState<Tab>('daycare');
  const now = state.lastTimerAt;
  const ready: Partial<Record<Tab, boolean>> = {
    daycare: state.eggs.some((e) => e.progress / e.cycles > 0.9),
    expeditions: state.expeditions.some((r) => expeditionDone(r, now)),
    garden: state.garden.some((p) => plotReady(p, now)),
    fossils: state.fossils.some((f) => now >= f.readyAt),
  };

  return (
    <div className="activities-screen">
      <div className="activity-tabs frame frame-menu" role="tablist">
        {TABS.map((t) => {
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
      {tab === 'daycare' && <DaycarePanel state={state} />}
      {tab === 'expeditions' && <ExpeditionsPanel state={state} />}
      {tab === 'garden' && <GardenPanel state={state} />}
      {tab === 'fossils' && <FossilPanel state={state} />}
      {tab === 'hunt' && <HuntPanel state={state} />}
      {tab === 'legendary' && <LegendaryPanel state={state} />}
      {tab === 'tower' && <TowerPanel state={state} />}
      {tab === 'gamecorner' && <GameCornerPanel state={state} />}
    </div>
  );
}
