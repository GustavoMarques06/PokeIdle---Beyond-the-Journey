// Organização da Caixa: favoritos (protegidos de transferência), etiquetas coloridas com nome
// editável, filtros e ações em lote (etiquetar, favoritar, transferir várias duplicatas).

import { getSpecies, type TypeName } from '../game-data';
import type { GameState } from './game';
import { canTransfer, transferPokemon } from './meta';
import { isPerfect, type PokemonInstance } from './pokemon';

export const TAG_IDS = ['red', 'blue', 'green', 'yellow', 'purple', 'gray'] as const;
export type TagId = (typeof TAG_IDS)[number];

export const DEFAULT_TAG_NAMES: Record<TagId, string> = {
  red: 'Batalha',
  blue: 'Criação',
  green: 'Coleção',
  yellow: 'Para transferir',
  purple: 'Projeto',
  gray: 'Outros',
};

export const isTagId = (v: unknown): v is TagId => TAG_IDS.includes(v as TagId);

export function tagName(state: GameState, tag: TagId): string {
  return state.tagNames?.[tag] || DEFAULT_TAG_NAMES[tag];
}

export function renameTag(state: GameState, tag: TagId, name: string): void {
  const clean = name.trim().slice(0, 16);
  state.tagNames ??= {};
  if (!clean || clean === DEFAULT_TAG_NAMES[tag]) delete state.tagNames[tag];
  else state.tagNames[tag] = clean;
}

/** Marca ou desmarca como favorito; com `on` definido, aplica a todos os uids. */
export function setFavorite(state: GameState, uids: number[], on: boolean): void {
  const set = new Set(uids);
  for (const p of state.collection) {
    if (!set.has(p.uid)) continue;
    if (on) p.favorite = true;
    else delete p.favorite;
  }
}

export function toggleFavorite(state: GameState, uid: number): void {
  const p = state.collection.find((x) => x.uid === uid);
  if (p) setFavorite(state, [uid], !p.favorite);
}

/** Etiqueta (ou tira a etiqueta, com `null`) de vários Pokémon de uma vez. */
export function setTag(state: GameState, uids: number[], tag: TagId | null): void {
  const set = new Set(uids);
  for (const p of state.collection) {
    if (!set.has(p.uid)) continue;
    if (tag) p.tag = tag;
    else delete p.tag;
  }
}

export interface BoxFilter {
  text: string;
  type: TypeName | '';
  tag: TagId | 'none' | '';
  favorites: boolean;
  shiny: boolean;
  perfect: boolean;
  /** Só espécies com mais de um exemplar. */
  duplicates: boolean;
}

export const EMPTY_FILTER: BoxFilter = {
  text: '',
  type: '',
  tag: '',
  favorites: false,
  shiny: false,
  perfect: false,
  duplicates: false,
};

export const filterActive = (f: BoxFilter) =>
  !!(f.text.trim() || f.type || f.tag || f.favorites || f.shiny || f.perfect || f.duplicates);

/** Aplica o filtro; `nameOf` traduz a espécie (a busca aceita nome ou número da Pokédex). */
export function filterBox(
  state: GameState,
  f: BoxFilter,
  nameOf: (speciesId: number) => string,
): PokemonInstance[] {
  const text = f.text.trim().toLowerCase();
  const count = new Map<number, number>();
  if (f.duplicates)
    for (const p of state.collection) count.set(p.speciesId, (count.get(p.speciesId) ?? 0) + 1);
  return state.collection.filter((p) => {
    if (text && !nameOf(p.speciesId).toLowerCase().includes(text) && String(p.speciesId) !== text)
      return false;
    if (f.type && !getSpecies(p.speciesId).types.includes(f.type)) return false;
    if (f.tag === 'none' ? !!p.tag : f.tag && p.tag !== f.tag) return false;
    if (f.favorites && !p.favorite) return false;
    if (f.shiny && !p.shiny) return false;
    if (f.perfect && !isPerfect(p.ivs)) return false;
    if (f.duplicates && (count.get(p.speciesId) ?? 0) < 2) return false;
    return true;
  });
}

/** Quais dos uids podem ser transferidos juntos (sem nunca levar o último de uma espécie). */
export function transferPlan(state: GameState, uids: number[]): PokemonInstance[] {
  const left = new Map<number, number>();
  for (const p of state.collection) left.set(p.speciesId, (left.get(p.speciesId) ?? 0) + 1);
  const out: PokemonInstance[] = [];
  for (const uid of uids) {
    const p = state.collection.find((x) => x.uid === uid);
    if (!p || !canTransfer(state, uid) || (left.get(p.speciesId) ?? 0) < 2) continue;
    left.set(p.speciesId, left.get(p.speciesId)! - 1);
    out.push(p);
  }
  return out;
}

/** Transfere em lote. Devolve quantos foram e os pontos de pesquisa ganhos. */
export function transferMany(state: GameState, uids: number[]): { count: number; points: number } {
  let count = 0;
  let points = 0;
  for (const p of transferPlan(state, uids)) {
    const got = transferPokemon(state, p.uid);
    if (got > 0) {
      count++;
      points += got;
    }
  }
  return { count, points };
}
