// Menu do jogo (como o menu START dos portáteis), com ícones de itens em pixel art.

import type { ReactNode } from 'react';
import { claimableMilestones } from '../../core/dex';
import { expeditionDone } from '../../core/expeditions';
import type { GameState } from '../../core/game';
import { plotReady } from '../../core/garden';
import { claimableMissions } from '../../core/missions';
import type { ScreenId } from '../battle/BattleDialog';
import { ItemIcon, PixelIcon } from './common';

export const MENU_ITEMS: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: 'party', label: 'POKéMON', icon: <ItemIcon id="poke-ball" size={28} /> },
  { id: 'dex', label: 'POKéDEX', icon: <PixelIcon name="pokedex" scale={2} /> },
  { id: 'bag', label: 'MOCHILA', icon: <ItemIcon id="explorer-kit" size={28} /> },
  { id: 'shop', label: 'LOJA', icon: <ItemIcon id="coin-case" size={28} /> },
  { id: 'map', label: 'MAPA', icon: <ItemIcon id="town-map" size={28} /> },
  { id: 'activities', label: 'ATIVIDADES', icon: <PixelIcon name="egg" scale={3} /> },
  { id: 'missions', label: 'MISSÕES', icon: <ItemIcon id="fame-checker" size={28} /> },
  { id: 'trainer', label: 'TREINADOR', icon: <ItemIcon id="vs-seeker" size={28} /> },
  { id: 'upgrades', label: 'MELHORIAS', icon: <ItemIcon id="up-grade" size={28} /> },
];

export function GameMenu({
  state,
  current,
  onSelect,
}: {
  state: GameState;
  current: ScreenId;
  onSelect: (id: ScreenId) => void;
}) {
  const now = state.lastTimerAt;
  const alerts: Partial<Record<ScreenId, boolean>> = {
    party: state.collection.some((p) => p.pendingEvolution),
    dex: claimableMilestones(state) > 0,
    activities:
      state.garden.some((p) => plotReady(p, now)) ||
      state.expeditions.some((r) => expeditionDone(r, now)) ||
      state.fossils.some((f) => now >= f.readyAt),
    missions: claimableMissions(state) > 0,
  };
  return (
    <nav className="game-menu frame frame-menu" aria-label="Menu">
      {MENU_ITEMS.map((item, i) => (
        <button
          key={item.id}
          title={`${item.label} (tecla ${i + 1})`}
          className={`menu-item ${current === item.id ? 'active' : ''}`}
          aria-current={current === item.id}
          onClick={() => onSelect(item.id)}
        >
          {item.icon}
          <span>{item.label}</span>
          {alerts[item.id] && <span className="menu-alert" title="Há algo esperando por você aqui" />}
        </button>
      ))}
    </nav>
  );
}
