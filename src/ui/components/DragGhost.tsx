// O Pokémon arrastado (PC e equipe): um sprite que acompanha o mouse, balançando, no lugar da "foto" translúcida
// que o navegador desenharia. Quem pode ser arrastado marca `data-drag-sprite` com a espécie (e `data-drag-shiny`).

import { useEffect, useState } from 'react';
import { PokemonSprite } from './common';

export function DragGhost() {
  const [drag, setDrag] = useState<{ speciesId: number; shiny: boolean; x: number; y: number } | null>(null);
  useEffect(() => {
    const start = (e: DragEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('[data-drag-sprite]');
      if (!el) return;
      setDrag({
        speciesId: Number(el.dataset.dragSprite),
        shiny: el.dataset.dragShiny === '1',
        x: e.clientX,
        y: e.clientY,
      });
    };
    // Durante o arrastar, só o `dragover` traz a posição do mouse de forma confiável.
    const over = (e: DragEvent) => setDrag((d) => (d && (e.clientX || e.clientY) ? { ...d, x: e.clientX, y: e.clientY } : d));
    const end = () => setDrag(null);
    document.addEventListener('dragstart', start);
    document.addEventListener('dragover', over);
    document.addEventListener('dragend', end);
    document.addEventListener('drop', end);
    return () => {
      document.removeEventListener('dragstart', start);
      document.removeEventListener('dragover', over);
      document.removeEventListener('dragend', end);
      document.removeEventListener('drop', end);
    };
  }, []);
  if (!drag) return null;
  return (
    <span className="drag-ghost" style={{ transform: `translate(${drag.x}px, ${drag.y}px)` }} aria-hidden>
      <PokemonSprite speciesId={drag.speciesId} kind="icon" shiny={drag.shiny} />
    </span>
  );
}
