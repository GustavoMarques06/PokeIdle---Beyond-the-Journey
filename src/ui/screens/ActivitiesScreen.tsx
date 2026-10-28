// ATIVIDADES: tudo que roda em paralelo às batalhas — creche, expedições, jardim,
// fósseis, Torre de Batalha, torneio, Safari, Game Corner e caça ao shiny.

import { useEffect, useState, type ReactNode } from 'react';
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
import { TAB_TIPS, seenFlag, tabOpen, tipFlag, unseenTabs, type Tab } from './activities/tabs';
import { useEngine } from '../useGame';

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'daycare', label: 'CRECHE', icon: <PixelIcon name="egg" scale={2} /> },
  { id: 'expeditions', label: 'EXPEDIÇÕES', icon: <ItemIcon id="explorer-kit" size={22} /> },
  { id: 'garden', label: 'JARDIM', icon: <ItemIcon id="oran-berry" size={22} /> },
  { id: 'fossils', label: 'FÓSSEIS', icon: <ItemIcon id="helix-fossil" size={22} /> },
  { id: 'training', label: 'TREINO', icon: <ItemIcon id="macho-brace" size={22} /> },
  { id: 'raids', label: 'RAIDES', icon: <PixelIcon name="boss" scale={2} /> },
  { id: 'hunt', label: 'CAÇA SHINY', icon: <PixelIcon name="target" scale={2} /> },
  { id: 'legendary', label: 'LENDÁRIOS', icon: <PixelIcon name="star" scale={2} /> },
  { id: 'tower', label: 'TORRE', icon: <PixelIcon name="trophy" scale={2} /> },
  { id: 'tournament', label: 'TORNEIO', icon: <PixelIcon name="star" scale={2} /> },
  { id: 'safari', label: 'SAFARI', icon: <ItemIcon id="safari-ball" size={22} /> },
  { id: 'gamecorner', label: 'GAME CORNER', icon: <ItemIcon id="coin-case" size={22} /> },
];

/** As 12 abas em três grupos de quatro. */
const GROUPS: { label: string; tabs: Tab[] }[] = [
  { label: 'CRIAÇÃO', tabs: ['daycare', 'garden', 'fossils', 'training'] },
  { label: 'DESAFIOS', tabs: ['raids', 'legendary', 'tower', 'tournament'] },
  { label: 'EXPLORAR', tabs: ['expeditions', 'safari', 'hunt', 'gamecorner'] },
];

export function ActivitiesScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  // Abre na primeira atividade nova, se houver; senão, na creche.
  const [tab, setTab] = useState<Tab>(() => unseenTabs(state)[0] ?? 'daycare');
  const now = state.lastTimerAt;
  const unseen = new Set(unseenTabs(state));
  const open = tabOpen(state, tab);
  const isNew = open && unseen.has(tab);
  const showTip = open && !state.flags.includes(tipFlag(tab));
  // Abrir a aba conta como "vista": o selo NOVO some (a dica fica até o jogador fechá-la).
  useEffect(() => {
    if (isNew) engine.dispatch((s) => void s.flags.push(seenFlag(tab)));
  }, [engine, isNew, tab]);
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
              const isOpen = tabOpen(state, t.id);
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  aria-label={`${t.label}${isOpen ? '' : ' (bloqueada)'}${unseen.has(t.id) ? ' (nova)' : ''}`}
                  className={`activity-tab ${tab === t.id ? 'active' : ''} ${isOpen ? '' : 'locked'}`}
                  onClick={() => setTab(t.id)}
                >
                  {isOpen ? t.icon : <PixelIcon name="lock" scale={2} />}
                  <span>{t.label}</span>
                  {unseen.has(t.id) && <span className="new-badge">NOVO</span>}
                  {ready[t.id] && <span className="menu-alert" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {showTip && (
        <div className="activity-tip frame frame-dialog" role="note">
          <p>
            <strong>Dica:</strong> {TAB_TIPS[tab]}
          </p>
          <button
            className="pbtn small"
            onClick={() => engine.dispatch((s) => void s.flags.push(tipFlag(tab)))}
          >
            Entendi
          </button>
        </div>
      )}
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
