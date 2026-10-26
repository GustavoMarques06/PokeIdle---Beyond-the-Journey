// Coleção e Pokédex: usado pela captura, ovos, fósseis, prêmios e expedições.

import { BALANCE, RESEARCH_POINTS, getRoute } from '../game-data';
import type { DexEntry, GameState } from './game';
import { createPokemon, type PokemonInstance } from './pokemon';
import type { Ivs } from './stats';

export function dexEntry(state: GameState, speciesId: number): DexEntry {
  return (state.pokedex[speciesId] ??= { seen: false, caught: false, shinyCaught: false });
}

export function markCaught(state: GameState, speciesId: number, shiny: boolean): void {
  const dex = dexEntry(state, speciesId);
  if (!dex.caught) state.research.points += RESEARCH_POINTS.newSpecies;
  dex.seen = true;
  dex.caught = true;
  if (shiny) dex.shinyCaught = true;
}

export function addToCollection(
  state: GameState,
  speciesId: number,
  level: number,
  ivs: Ivs,
  shiny: boolean,
  now: number,
  caughtOn: string,
): PokemonInstance {
  const p = createPokemon(state.nextUid++, speciesId, level, ivs, shiny, now, caughtOn);
  state.collection.push(p);
  markCaught(state, speciesId, shiny);
  return p;
}

/** Pokémon ocupados (ativo, apoio, creche, expedições) não podem ir para outra atividade. */
export function busyUids(state: GameState): Set<number> {
  const busy = new Set<number>([state.activeUid, ...state.passives, ...state.daycare.uids]);
  for (const e of state.expeditions) for (const uid of e.uids) busy.add(uid);
  return busy;
}

export function findPokemon(state: GameState, uid: number): PokemonInstance | undefined {
  return state.collection.find((p) => p.uid === uid);
}

export function giveItems(state: GameState, items: Record<string, number> | undefined): void {
  for (const [id, qty] of Object.entries(items ?? {})) state.items[id] = (state.items[id] ?? 0) + qty;
}

/** Libera um TM (se já tiver, não muda nada). Devolve true se era novo. */
export function unlockTm(state: GameState, move: string): boolean {
  if (state.tms.includes(move)) return false;
  state.tms.push(move);
  return true;
}

/** Rota concluída: chefe vencido (ou vitórias suficientes, se não houver chefe). */
export function routeDone(state: GameState, routeId: string): boolean {
  const prog = state.routes[routeId];
  if (!prog) return false;
  const route = getRoute(routeId);
  return route.boss ? prog.bossDefeated : prog.unlocked && prog.kills >= route.killsRequired;
}

export type Activity = 'daycare' | 'expeditions' | 'garden' | 'fossils' | 'tower' | 'gamecorner';

export function activityUnlocked(state: GameState, activity: Activity): boolean {
  switch (activity) {
    case 'daycare':
      return routeDone(state, BALANCE.daycare.unlock);
    case 'expeditions':
      return routeDone(state, BALANCE.expeditions.slots[0]);
    case 'garden':
      return routeDone(state, BALANCE.garden.plots[0]);
    case 'fossils':
      return routeDone(state, BALANCE.fossils.unlock);
    case 'tower':
      return routeDone(state, BALANCE.tower.unlock);
    case 'gamecorner':
      return routeDone(state, BALANCE.gameCorner.unlock);
  }
}
