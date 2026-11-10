// Laboratório de fósseis: entregue um fóssil e, depois de algumas horas reais, o
// Pokémon revivido entra para a coleção.

import { BALANCE, FOSSILS } from '../game-data';
import { activityUnlocked, addToCollection } from './collection';
import type { GameEvent, GameState } from './game';
import { randomIvs, rollShiny, type PokemonInstance } from './pokemon';
import { rngFrom } from './rng';

export interface FossilRun {
  item: string;
  speciesId: number;
  readyAt: number;
  notified?: boolean;
}

export function ownedFossils(state: GameState) {
  return FOSSILS.filter((f) => (state.items[f.item] ?? 0) > 0);
}

export function startRevive(state: GameState, item: string, now: number): boolean {
  const def = FOSSILS.find((f) => f.item === item);
  if (!def || !activityUnlocked(state, 'fossils') || (state.items[item] ?? 0) <= 0) return false;
  if (state.fossils.length >= BALANCE.fossils.slots) return false;
  state.items[item]--;
  state.fossils.push({ item, speciesId: def.speciesId, readyAt: now + def.hours * 3_600_000 });
  return true;
}

export function claimFossil(state: GameState, index: number, now: number): PokemonInstance | null {
  const run = state.fossils[index];
  if (!run || now < run.readyAt) return null;
  state.fossils.splice(index, 1);
  const rng = rngFrom(state);
  const museum = (state.fossilsRevived ??= {});
  museum[run.speciesId] = (museum[run.speciesId] ?? 0) + 1;
  return addToCollection(
    state,
    run.speciesId,
    BALANCE.fossils.reviveLevel,
    randomIvs(rng),
    rollShiny(rng),
    now,
    'Laboratório',
  );
}

export function fossilTimers(state: GameState, now: number, events: GameEvent[]): void {
  for (const run of state.fossils) {
    if (!run.notified && now >= run.readyAt) {
      run.notified = true;
      events.push({ type: 'fossilReady', speciesId: run.speciesId });
    }
  }
}
