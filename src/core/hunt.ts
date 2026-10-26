// Caça ao shiny: o jogador escolhe uma espécie-alvo; ela aparece com mais frequência
// e cada encontro seguido aumenta a chance de shiny (a sequência quebra ao trocar de
// rota, de alvo ou ao ser derrotado).

import { BALANCE } from '../game-data';
import type { GameState } from './game';

export interface HuntState {
  target: number | null;
  /** Encontros com o alvo desde que a caçada começou. */
  encounters: number;
  chain: number;
  bestChain: number;
  /** Encontros por espécie (todas as espécies, para o contador da Pokédex). */
  counts: Record<number, number>;
  /** Shinies do alvo encontrados nesta caçada e nas anteriores. */
  log: { speciesId: number; encounters: number; at: number }[];
}

export const emptyHunt = (): HuntState => ({
  target: null,
  encounters: 0,
  chain: 0,
  bestChain: 0,
  counts: {},
  log: [],
});

export function setHuntTarget(state: GameState, speciesId: number | null): void {
  if (speciesId !== null && !state.pokedex[speciesId]?.seen) return;
  state.hunt.target = speciesId;
  state.hunt.encounters = 0;
  state.hunt.chain = 0;
}

export function huntWeight(state: GameState, speciesId: number): number {
  return state.hunt.target === speciesId ? BALANCE.hunt.targetWeight : 1;
}

export function huntShinyMultiplier(state: GameState, speciesId: number): number {
  if (state.hunt.target !== speciesId) return 1;
  return 1 + BALANCE.hunt.chainBonus * Math.min(state.hunt.chain, BALANCE.hunt.chainCap);
}

/** Chamado a cada encontro selvagem. */
export function recordEncounter(state: GameState, speciesId: number, shiny: boolean, now: number): void {
  const h = state.hunt;
  h.counts[speciesId] = (h.counts[speciesId] ?? 0) + 1;
  if (h.target !== speciesId) return;
  h.encounters++;
  h.chain++;
  h.bestChain = Math.max(h.bestChain, h.chain);
  if (shiny) {
    h.log.unshift({ speciesId, encounters: h.encounters, at: now });
    h.log = h.log.slice(0, 20);
    h.encounters = 0;
    h.chain = 0;
  }
}

export function breakChain(state: GameState): void {
  state.hunt.chain = 0;
}
