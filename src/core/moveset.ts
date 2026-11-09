// Golpes escolhidos à mão: o jogador monta até 4 golpes a partir do que o Pokémon
// aprendeu por nível, dos TMs liberados que a espécie consegue aprender, dos golpes de ovo
// herdados e dos golpes da pré-evolução lembrados no Relembrador.

import { BALANCE, NO_SUPPORT, SPECIES, getSpecies, hasMove, learnedSupportMoves } from '../game-data';
import { findPokemon } from './collection';
import type { GameState } from './game';
import { levelUpMoves, type PokemonInstance } from './pokemon';

export interface LearnableMove {
  move: string;
  source: 'level' | 'tm' | 'egg' | 'relearn';
}

/** Pré-evoluções da espécie, da mais próxima à primeira. */
function preEvolutions(speciesId: number): number[] {
  const out: number[] = [];
  for (let id = speciesId, guard = 0; guard < 4; guard++) {
    const pre = SPECIES.find((s) => s.evolutions.some((e) => e.to === id));
    if (!pre) break;
    out.push(pre.id);
    id = pre.id;
  }
  return out;
}

/**
 * Relembrador: golpes que as pré-evoluções aprendem até o nível atual e que a espécie atual
 * não aprende sozinha (ainda não lembrados).
 */
export function relearnableMoves(p: PokemonInstance): string[] {
  const own = new Set(levelUpMoves(getSpecies(p.speciesId), p.level));
  const done = new Set(p.relearned ?? []);
  const out = new Set<string>();
  for (const id of preEvolutions(p.speciesId))
    for (const move of levelUpMoves(getSpecies(id), p.level))
      if (!own.has(move) && !done.has(move) && hasMove(move)) out.add(move);
  return [...out];
}

/** Paga o Relembrador para que o Pokémon volte a poder usar o golpe. */
export function relearnMove(state: GameState, uid: number, move: string): boolean {
  const p = findPokemon(state, uid);
  const cost = BALANCE.relearnCost;
  if (!p || state.coins < cost || !relearnableMoves(p).includes(move)) return false;
  state.coins -= cost;
  p.relearned = [...(p.relearned ?? []), move];
  return true;
}

export function learnableMoves(state: GameState, p: PokemonInstance): LearnableMove[] {
  const species = getSpecies(p.speciesId);
  const out: LearnableMove[] = levelUpMoves(species, p.level).map((move) => ({ move, source: 'level' }));
  const known = new Set(out.map((m) => m.move));
  for (const move of species.tmMoves) {
    if (state.tms.includes(move) && !known.has(move) && hasMove(move)) out.push({ move, source: 'tm' });
  }
  for (const [list, source] of [
    [p.eggMoves, 'egg'],
    [p.relearned, 'relearn'],
  ] as const)
    for (const move of list ?? [])
      if (!out.some((m) => m.move === move) && hasMove(move)) out.push({ move, source });
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

/** Golpes de apoio que o Pokémon pode levar: os que já aprendeu por nível e o que já estava escolhido. */
export function supportOptions(p: PokemonInstance): string[] {
  const out = learnedSupportMoves(p.speciesId, p.level).map((m) => m.id);
  if (p.support && p.support !== NO_SUPPORT && !out.includes(p.support)) out.push(p.support);
  return out;
}

/** Escolhe o golpe de apoio: um id da lista, `'none'` para nenhum, ou `undefined` para voltar ao automático. */
export function setSupport(state: GameState, uid: number, move: string | undefined): boolean {
  const p = findPokemon(state, uid);
  if (!p) return false;
  if (move !== undefined && move !== NO_SUPPORT && !supportOptions(p).includes(move)) return false;
  if (move === undefined) delete p.support;
  else p.support = move;
  return true;
}
