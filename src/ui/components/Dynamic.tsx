// Peças que deixam as telas mais vivas:
// - Empty: tela vazia com um desenho e o que fazer.
// - Loading: Poké Ball girando no lugar do "Carregando…".
// - useFlip: itens de uma lista deslizam até o lugar novo quando a ordem muda.
// - useHintFold: as explicações longas das telas ficam numa linha, com "?" para abrir.
// - windowSummary: o resumo vivo ao lado do título da janela.

import { useLayoutEffect, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { SPECIES } from '../../game-data';
import type { GameState } from '../../core/game';
import { activityStatus } from '../screens/activities/status';
import type { Tab } from '../screens/activities/tabs';
import { formatNumber } from '../i18n/pt-BR';
import { ItemIcon, PokemonSprite } from './common';

export function Empty({
  icon,
  speciesId,
  children,
  action,
}: {
  icon?: string;
  speciesId?: number;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-art" aria-hidden>
        {speciesId ? <PokemonSprite speciesId={speciesId} kind="icon" /> : <ItemIcon id={icon ?? 'poke-ball'} size={30} />}
      </span>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function Loading() {
  return (
    <p className="screen-loading" role="status">
      <span className="loading-ball" aria-hidden />
      Carregando…
    </p>
  );
}

/** Os filhos com `data-flip` deslizam do lugar antigo até o novo quando a lista muda de ordem. */
export function useFlip(ref: RefObject<HTMLElement | null>) {
  const last = useRef(new Map<string, { left: number; top: number }>());
  const lastOrder = useRef('');
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const items = [...box.querySelectorAll<HTMLElement>('[data-flip]')];
    // Só quando a ordem muda: o jogo redesenha a lista várias vezes por segundo, e sem isto qualquer mudança de
    // tamanho em volta (ou a rolagem) virava um "deslize" dos cartões.
    const order = items.map((el) => el.dataset.flip).join('|');
    const moved = !!lastOrder.current && order !== lastOrder.current;
    lastOrder.current = order;
    // A posição é medida em relação à própria lista, não à tela: rolar a página não move nada aqui dentro.
    const origin = box.getBoundingClientRect();
    const reduced = document.documentElement.classList.contains('reduced-motion');
    const now = new Map<string, { left: number; top: number }>();
    for (const el of items) {
      const key = el.dataset.flip!;
      const b = el.getBoundingClientRect();
      const r = { left: b.left - origin.left, top: b.top - origin.top };
      now.set(key, r);
      const before = last.current.get(key);
      if (!moved || !before || reduced) continue;
      const dx = before.left - r.left;
      const dy = before.top - r.top;
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }], {
        duration: 260,
        easing: 'steps(6, end)',
      });
    }
    last.current = now;
  });
}

/**
 * Explicações (`.hint`) das telas: as longas ficam numa linha só, com um "?" para abrir e fechar. As curtas não
 * mudam. Observa a área da janela, porque as telas trocam de conteúdo sem desmontar a janela.
 */
export function useHintFold(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    // A área da tela é recriada a cada troca de tela: observa a janela, que continua a mesma.
    const box = (ref.current?.closest('.screen-window') as HTMLElement | null) ?? ref.current;
    if (!box) return;
    let raf = 0;
    const mark = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Só as novas (o jogo atualiza a tela várias vezes por segundo: medir todas a cada vez pesaria).
        for (const el of box.querySelectorAll<HTMLElement>('p.hint:not(.hint-fold):not(.hint-open), li.hint:not(.hint-fold):not(.hint-open)')) {
          // Avisos e respostas (regra de desafio, bloqueio, "salvo!") ficam sempre abertos: dobrar esconderia o recado.
          if (el.closest('.empty-state') || el.matches('.alert, [role="status"]')) continue;
          el.classList.add('hint-fold');
          el.toggleAttribute('data-more', el.scrollHeight > el.clientHeight + 2);
        }
      });
    };
    mark();
    const mo = new MutationObserver(mark);
    mo.observe(box, { childList: true, subtree: true });
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('button, a, input, select, label')) return;
      const hint = t.closest<HTMLElement>('.hint[data-more], .hint.hint-open');
      if (!hint) return;
      hint.classList.toggle('hint-open');
      hint.classList.toggle('hint-fold');
    };
    box.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      box.removeEventListener('click', onClick);
    };
  }, [ref]);
}

const ALL_TABS: Tab[] = [
  'daycare',
  'expeditions',
  'garden',
  'fossils',
  'training',
  'raids',
  'hunt',
  'legendary',
  'tower',
  'tournament',
  'safari',
  'gamecorner',
  'trade',
  'duel',
];

/** Resumo ao lado do título da janela: muda com o jogo. */
export function windowSummary(state: GameState, screen: string): string | null {
  const now = state.lastTimerAt;
  switch (screen) {
    case 'bag': {
      const n = Object.values(state.items).filter((q) => q > 0).length;
      return `${n} ${n === 1 ? 'item' : 'itens'} · ${state.tms.length} TMs`;
    }
    case 'activities': {
      const ready = ALL_TABS.filter((t) => activityStatus(state, t, now)?.tone === 'ready').length;
      return ready ? `${ready} ${ready === 1 ? 'pronta' : 'prontas'}!` : null;
    }
    case 'missions': {
      const list = [...state.missions.daily, ...state.missions.weekly];
      const claim = list.filter((m) => m.progress >= m.target && !m.claimed).length;
      const done = list.filter((m) => m.claimed).length;
      return claim ? `${claim} para receber!` : `${done}/${list.length} concluídas`;
    }
    case 'dex': {
      const caught = SPECIES.filter((s) => state.pokedex[s.id]?.caught).length;
      return `${caught}/${SPECIES.length} capturados`;
    }
    case 'shop':
      return `₽${formatNumber(state.coins)}`;
    case 'pc':
      return `${state.collection.length} Pokémon`;
    case 'upgrades':
      return `${state.research.points} pontos de pesquisa`;
    case 'party':
      return `${state.battleTeam.length}/6 na equipe`;
    default:
      return null;
  }
}
