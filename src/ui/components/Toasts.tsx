import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEvent } from '../../core/game';
import { TOAST_EVENTS, describeEvent } from '../i18n/pt-BR';
import { useEvolving } from '../evolutionView';
import { useGameEvents } from '../useGame';
import { PixelIcon, PokemonSprite } from './common';

interface Toast {
  id: number;
  text: string;
  speciesId?: number;
  /** Destaque com brilho: shiny, chefe, conquista, evolução. */
  rare: boolean;
  trophy: boolean;
}

function speciesOf(e: GameEvent): number | undefined {
  if (e.type === 'evolved') return e.to;
  if ('speciesId' in e) return e.speciesId;
  return undefined;
}

const RARE = new Set<GameEvent['type']>([
  'evolved',
  'bossDefeated',
  'achievement',
  'masteryUp',
  'legendaryEnded',
]);

export function Toasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  // Avisos de evolução esperam o clarão da cena de evolução (não estragam a surpresa).
  const held = useRef<Toast[]>([]);
  const evolving = useEvolving();
  const evolvingRef = useRef(evolving);
  useEffect(() => {
    evolvingRef.current = evolving;
  });

  const show = useCallback((fresh: Toast[]) => {
    setToasts((t) => [...t, ...fresh].slice(-3));
    for (const t of fresh) setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 3500);
  }, []);

  useEffect(() => {
    if (evolving || !held.current.length) return;
    // Com a cena ainda por começar (o evento chegou antes dela), espera um instante.
    const t = setTimeout(() => {
      if (!held.current.length) return;
      show(held.current);
      held.current = [];
    }, 600);
    return () => clearTimeout(t);
  }, [evolving, show]);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      const fresh: Toast[] = [];
      for (const e of events) {
        // Conquistas ganham a faixa da medalha (Ceremonies.tsx), não um aviso.
        if (!TOAST_EVENTS.has(e.type) || e.type === 'levelUp' || e.type === 'achievement') continue;
        const text = describeEvent(e);
        if (!text) continue;
        const rare = RARE.has(e.type) || (e.type === 'captured' && (e.shiny || !!e.perfect));
        const toast = {
          id: nextId.current++,
          text,
          speciesId: speciesOf(e),
          rare,
          trophy: false,
        };
        if (e.type === 'evolved') {
          held.current.push(toast);
          // Se a cena não começar (fora da batalha, por exemplo), o aviso não fica preso.
          setTimeout(() => {
            if (evolvingRef.current || !held.current.length) return;
            show(held.current);
            held.current = [];
          }, 1500);
        } else fresh.push(toast);
      }
      if (fresh.length) show(fresh);
    },
    [show],
  );
  useGameEvents(onEvents);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast frame frame-toast ${t.rare ? 'rare' : ''}`}>
          {t.trophy ? (
            <PixelIcon name="medal" scale={2} />
          ) : (
            t.speciesId && <PokemonSprite speciesId={t.speciesId} kind="icon" />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
