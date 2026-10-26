// Golpes escolhidos à mão: o jogador monta até 4 golpes a partir do que o Pokémon
// aprendeu por nível e dos TMs liberados que a espécie consegue aprender.

import { BALANCE, getSpecies, hasMove } from '../game-data';
import { findPokemon } from './collection';
import type { GameState } from './game';
import { levelUpMoves, type PokemonInstance } from './pokemon';

export interface LearnableMove {
  move: string;
  source: 'level' | 'tm';
}

export function learnableMoves(state: GameState, p: PokemonInstance): LearnableMove[] {
  const species = getSpecies(p.speciesId);
  const out: LearnableMove[] = levelUpMoves(species, p.level).map((move) => ({ move, source: 'level' }));
  const known = new Set(out.map((m) => m.move));
  for (const move of species.tmMoves) {
    if (state.tms.includes(move) && !known.has(move) && hasMove(move)) out.push({ move, source: 'tm' });
  }
  // Golpes já escolhidos continuam disponíveis mesmo depois de evoluir.
  for (const move of p.moveset ?? [])
    if (!out.some((m) => m.move === move)) out.push({ move, source: 'level' });
  return out;
}

/** Define os golpes do Pokémon. Lista vazia volta ao modo automático. */
export function setMoveset(state: GameState, uid: number, moves: string[]): boolean {
  const p = findPokemon(state, uid);
  if (!p) return false;
  const unique = [...new Set(moves)];
  if (unique.length > BALANCE.maxMoves) return false;
  const allowed = new Set(learnableMoves(state, p).map((m) => m.move));
  if (unique.some((m) => !allowed.has(m))) return false;
  p.moveset = unique.length ? unique : undefined;
  return true;
}
