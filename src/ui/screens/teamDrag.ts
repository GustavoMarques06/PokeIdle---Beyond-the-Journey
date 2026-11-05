// Arrastar um Pokémon do PC para a equipe: o PC grava o uid no arraste e tanto a equipe do próprio PC quanto a da
// coluna lateral aceitam a soltura. No toque (sem arrastar), o caminho é "Mover" e tocar na equipe.

import type { DragEvent } from 'react';

/** Pokémon saindo de uma caixa do PC. */
export const PC_DRAG = 'application/x-pokeidle-pc';
/** Pokémon saindo da equipe (soltar numa caixa o devolve ao PC). */
export const TEAM_DRAG = 'application/x-pokeidle-team';

/** Props de quem aceita receber um Pokémon do PC. */
export function teamDropProps(onDrop: (uid: number) => void) {
  return {
    onDragOver: (e: DragEvent) => {
      if (e.dataTransfer.types.includes(PC_DRAG)) e.preventDefault();
    },
    onDrop: (e: DragEvent) => {
      const uid = Number(e.dataTransfer.getData(PC_DRAG));
      if (!uid) return;
      e.preventDefault();
      onDrop(uid);
    },
  };
}
