import { useCallback, useRef, useState } from 'react';
import type { GameEvent } from '../../core/game';
import { TOAST_EVENTS, describeEvent } from '../i18n/pt-BR';
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

  const onEvents = useCallback((events: GameEvent[]) => {
    const fresh: Toast[] = [];
    for (const e of events) {
      if (!TOAST_EVENTS.has(e.type) || e.type === 'levelUp') continue;
      const text = describeEvent(e);
      if (!text) continue;
      const rare = RARE.has(e.type) || (e.type === 'captured' && (e.shiny || !!e.perfect));
      fresh.push({
        id: nextId.current++,
        text,
        speciesId: speciesOf(e),
        rare,
        trophy: e.type === 'achievement',
      });
    }
    if (!fresh.length) return;
    setToasts((t) => [...t, ...fresh].slice(-3));
    for (const t of fresh) setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 3500);
  }, []);
  useGameEvents(onEvents);

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast frame frame-toast ${t.rare ? 'rare' : ''}`}>
          {t.trophy ? (
            <PixelIcon name="trophy" scale={2} />
          ) : (
            t.speciesId && <PokemonSprite speciesId={t.speciesId} kind="icon" />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
