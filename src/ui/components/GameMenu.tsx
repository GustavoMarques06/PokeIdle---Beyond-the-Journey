// Menu do jogo: uma fileira de abas com ícones de itens em pixel art. Só a aba aberta mostra o
// nome (as outras, na dica); as setas andam pelas abas (com o bipe dos menus) e Enter abre.

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { useEngine } from '../useGame';
import { RESEARCH } from '../../game-data';
import { audio } from '../audio';
import { claimableMilestones } from '../../core/dex';
import { expeditionDone } from '../../core/expeditions';
import type { GameState } from '../../core/game';
import { plotReady } from '../../core/garden';
import { claimableMissions } from '../../core/missions';
import type { ScreenId } from '../battle/BattleDialog';
import { unseenTabs } from '../screens/activities/tabs';
import { ItemIcon, PixelIcon } from './common';

export const MENU_ITEMS: {
  id: ScreenId;
  label: string;
  icon: ReactNode;
  key?: string;
  external?: boolean;
}[] = [
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
  { id: 'help', label: 'AJUDA', icon: <PixelIcon name="help" scale={3} />, key: 'h', external: true },
];

/** Tecla de atalho de cada item: 1–9 e, para o décimo, 0; a AJUDA usa o H. */
export const menuKey = (i: number) => MENU_ITEMS[i]?.key ?? String((i + 1) % 10);

/**
 * Abas presentes desde o primeiro minuto (TREINADOR tem as opções e o salvamento). As outras
 * aparecem conforme o jogo pede por elas, para quem começa não encarar dez ícones de uma vez.
 */
const ALWAYS: ScreenId[] = ['party', 'dex', 'bag', 'trainer', 'help'];
const CHEAPEST_RESEARCH = Math.min(...RESEARCH.map((r) => r.baseCost));

/** Gravada quando a aba é aberta pela primeira vez: some o selo NOVO e ela fica no menu. */
export const menuFlag = (id: ScreenId) => `menu:${id}`;

export function menuUnlocked(state: GameState, id: ScreenId): boolean {
  if (ALWAYS.includes(id) || state.prestige.count > 0 || state.flags.includes(menuFlag(id))) return true;
  const routes = Object.values(state.routes);
  switch (id) {
    case 'pc':
      return state.collection.length >= 2; // a primeira captura
    case 'shop':
      return state.stats.totalKills >= 10; // já tem algum dinheiro
    case 'map':
      return routes.filter((r) => r.unlocked).length >= 2; // há para onde ir
    case 'missions':
      return state.stats.totalKills >= 30;
    case 'upgrades':
      // Quando já dá para comprar a primeira melhoria (o inicial sozinho não basta).
      return state.research.points >= CHEAPEST_RESEARCH || Object.keys(state.research.levels).length > 0;
    case 'activities':
      return routes.some((r) => r.bossDefeated); // a primeira insígnia
    default:
      return true;
  }
}

/** Liberada e ainda não aberta: ganha o selo NOVO. */
export const menuIsNew = (state: GameState, id: ScreenId) =>
  !ALWAYS.includes(id) && menuUnlocked(state, id) && !state.flags.includes(menuFlag(id));

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
  // Quem já jogava bastante antes das abas aparecerem aos poucos não vê todas como NOVAS.
  const engine = useEngine();
  const migrated = state.flags.includes(MENU_MIGRATION);
  useEffect(() => {
    if (migrated) return;
    engine.dispatch((s) => {
      if (s.stats.totalKills > 200) {
        for (const item of MENU_ITEMS) if (menuUnlocked(s, item.id)) s.flags.push(menuFlag(item.id));
      }
      s.flags.push(MENU_MIGRATION);
    });
  }, [engine, migrated]);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // A tecla de cada aba segue a posição dela na lista completa (não muda quando outra aparece).
  const visible = MENU_ITEMS.map((item, i) => ({ ...item, key: menuKey(i) })).filter((item) =>
    menuUnlocked(state, item.id),
  );
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const from = buttons.current.indexOf(document.activeElement as HTMLButtonElement);
    if (from < 0) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const n = visible.length;
    buttons.current[(from + step + n) % n]?.focus();
    audio.sfx('cursor');
  };
  return (
    <nav className="game-menu frame frame-menu" aria-label="Menu" id="game-menu" onKeyDown={onKeyDown}>
      {visible.map((item, i) => {
        const fresh = menuIsNew(state, item.id);
        return (
          <button
            key={item.id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            onMouseEnter={() => audio.sfx('cursor')}
            title={`${item.label} (tecla ${item.key})${item.external ? ' · abre em outra aba' : ''}${fresh ? ' · novo!' : ''}`}
            className={`menu-item ${current === item.id ? 'active' : ''} ${fresh ? 'fresh' : ''}`}
            aria-current={current === item.id}
            // detail 0 = ativado pelo teclado (Enter/Espaço), não pelo mouse ou toque.
            onClick={(e) => {
              audio.sfx('click');
              onSelect(item.id, e.detail === 0);
            }}
          >
            {item.icon}
            <span className="menu-label">{item.label}</span>
            {fresh ? (
              <span className="new-badge menu-new">NOVO</span>
            ) : (
              alerts[item.id] && <span className="menu-alert" title="Há algo esperando por você aqui" />
            )}
          </button>
        );
      })}
    </nav>
  );
}

const MENU_MIGRATION = 'menus';
