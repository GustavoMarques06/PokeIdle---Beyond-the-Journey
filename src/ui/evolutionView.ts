// Evolução em cena: a evolução já aconteceu no estado do jogo, mas enquanto a animação roda
// (EvolutionOverlay) a interface continua mostrando a forma antiga — ficha, equipe e avisos
// só revelam a nova forma no clarão, como nos portáteis.

import { useSyncExternalStore } from 'react';

export interface Evolving {
  uid: number;
  from: number;
}

let current: Evolving | null = null;
const listeners = new Set<() => void>();

export function setEvolving(next: Evolving | null): void {
  if (current?.uid === next?.uid && current?.from === next?.from) return;
  current = next;
  for (const l of listeners) l();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useEvolving(): Evolving | null {
  return useSyncExternalStore(subscribe, () => current);
}

/** O Pokémon como deve aparecer agora: com a espécie antiga enquanto evolui em cena. */
export function useShownPokemon<T extends { uid: number; speciesId: number }>(p: T): T {
  const ev = useEvolving();
  return ev && ev.uid === p.uid ? { ...p, speciesId: ev.from } : p;
}
