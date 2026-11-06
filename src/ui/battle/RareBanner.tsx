// O que é raro merece mais que um aviso comum: faixa sobre a cena quando aparece um shiny ou quando se captura um shiny
// ou um Pokémon perfeito. Também dá o toque de vibração (só no Android: o iPhone não permite em sites).

import { useCallback, useState } from 'react';
import type { GameEvent } from '../../core/game';
import { speciesName } from '../i18n/pt-BR';
import { useGameEvents } from '../useGame';

const SHOW_MS = 4200;

const vibrate = (pattern: number | number[]) => {
  if (!document.documentElement.classList.contains('reduced-motion')) navigator.vibrate?.(pattern);
};

/** A mensagem de destaque de um evento, se ele merecer uma. */
export function rareMessage(e: GameEvent): string | null {
  // Só o que dá para capturar: num Pokémon de treinador, a faixa e a fanfarra não fariam sentido.
  if (e.type === 'spawn' && e.shiny && !e.boss) return `Um ${speciesName(e.speciesId)} SHINY apareceu!`;
  if (e.type === 'captured' && e.shiny) return `${speciesName(e.speciesId)} SHINY capturado!`;
  if (e.type === 'captured' && e.perfect) return `${speciesName(e.speciesId)} PERFEITO capturado!`;
  return null;
}

export function RareBanner() {
  const [banner, setBanner] = useState<{ id: number; text: string } | null>(null);
  useGameEvents(
    useCallback((events: GameEvent[]) => {
      for (const e of events) {
        if (e.type === 'bossDefeated') vibrate(60);
        const text = rareMessage(e);
        if (!text) continue;
        vibrate([40, 40, 40, 40, 80]);
        const id = Date.now() + Math.random();
        setBanner({ id, text });
        setTimeout(() => setBanner((cur) => (cur?.id === id ? null : cur)), SHOW_MS);
      }
    }, []),
  );
  if (!banner) return null;
  return (
    <div key={banner.id} className="rare-banner frame frame-dialog" role="status">
      ✦ {banner.text} ✦
    </div>
  );
}
