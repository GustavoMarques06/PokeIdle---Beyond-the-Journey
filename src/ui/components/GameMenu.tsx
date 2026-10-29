// Menu do jogo: uma fileira de abas com ícones de itens em pixel art. Só a aba aberta mostra o
// nome (as outras, na dica); as setas andam pelas abas (com o bipe dos menus) e Enter abre.

import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { audio } from '../audio';
import { claimableMilestones } from '../../core/dex';
import { expeditionDone } from '../../core/expeditions';
import type { GameState } from '../../core/game';
import { plotReady } from '../../core/garden';
import { claimableMissions } from '../../core/missions';
import type { ScreenId } from '../battle/BattleDialog';
import { unseenTabs } from '../screens/activities/tabs';
import { ItemIcon, PixelIcon } from './common';

export const MENU_ITEMS: { id: ScreenId; label: string; icon: ReactNode }[] = [
  { id: 'party', label: 'POKéMON', icon: <ItemIcon id="poke-ball" size={28} /> },
  { id: 'dex', label: 'POKéDEX', icon: <PixelIcon name="pokedex" scale={2} /> },
  { id: 'bag', label: 'MOCHILA', icon: <ItemIcon id="explorer-kit" size={28} /> },
  { id: 'shop', label: 'LOJA', icon: <ItemIcon id="coin-case" size={28} /> },
  { id: 'map', label: 'MAPA', icon: <ItemIcon id="town-map" size={28} /> },
  { id: 'activities', label: 'ATIVIDADES', icon: <ItemIcon id="mystery-egg" size={27} /> },
  { id: 'missions', label: 'MISSÕES', icon: <ItemIcon id="fame-checker" size={28} /> },
  { id: 'trainer', label: 'TREINADOR', icon: <ItemIcon id="vs-seeker" size={28} /> },
  { id: 'upgrades', label: 'MELHORIAS', icon: <ItemIcon id="up-grade" size={28} /> },
  { id: 'pc', label: 'PC', icon: <ItemIcon id="pokemon-box" size={28} /> },
];

/** Tecla de atalho de cada item: 1–9 e, para o décimo, 0. */
export const menuKey = (i: number) => String((i + 1) % 10);

export function GameMenu({
  state,
  current,
  onSelect,
}: {
  state: GameState;
  current: ScreenId;
  onSelect: (id: ScreenId, viaKeyboard?: boolean) => void;
}) {
  const now = state.lastTimerAt;
  const alerts: Partial<Record<ScreenId, boolean>> = {
    party: state.collection.some((p) => p.pendingEvolution),
    dex: claimableMilestones(state) > 0,
    activities:
      unseenTabs(state).length > 0 ||
      state.garden.some((p) => plotReady(p, now)) ||
      state.expeditions.some((r) => expeditionDone(r, now)) ||
      state.fossils.some((f) => now >= f.readyAt),
    missions: claimableMissions(state) > 0,
  };
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const from = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
    if (from < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = MENU_ITEMS.length;
    buttons.current[(from + step + n) % n]?.focus();
    audio.sfx('cursor');
  };
  return (
    <nav className="game-menu frame frame-menu" aria-label="Menu" id="game-menu" onKeyDown={onKeyDown}>
      {MENU_ITEMS.map((item, i) => (
        <button
          key={item.id}
          ref={(el) => {
            buttons.current[i] = el;
          }}
          onMouseEnter={() => audio.sfx('cursor')}
          title={`${item.label} (tecla ${menuKey(i)})`}
          className={`menu-item ${current === item.id ? 'active' : ''}`}
          aria-current={current === item.id}
          // detail 0 = ativado pelo teclado (Enter/Espaço), não pelo mouse ou toque.
          onClick={(e) => {
            audio.sfx('click');
            onSelect(item.id, e.detail === 0);
          }}
        >
          {item.icon}
          <span className="menu-label">{item.label}</span>
          {alerts[item.id] && <span className="menu-alert" title="Há algo esperando por você aqui" />}
        </button>
      ))}
    </nav>
  );
}
