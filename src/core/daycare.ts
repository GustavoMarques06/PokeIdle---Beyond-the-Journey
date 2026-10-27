// Creche: dois Pokémon compatíveis produzem ovos com as vitórias do jogador.
// Os ovos chocam com vitórias ou com o tempo real (o que vier antes).

import { BALANCE, getSpecies, lineRoot, speciesId } from '../game-data';
import { computeModifiers } from './bonuses';
import { activityUnlocked, addToCollection, busyUids, findPokemon } from './collection';
import type { GameEvent, GameState } from './game';
import { progressMission } from './missions';
import { isPerfect, randomIvs, rollShiny, type PokemonInstance } from './pokemon';
import { setLevel } from './progression';
import { rngFrom } from './rng';
import type { Ivs } from './stats';

export interface Egg {
  id: number;
  speciesId: number;
  ivs: Ivs;
  shiny: boolean;
  /** Ciclos necessários para chocar e ciclos já cumpridos. */
  cycles: number;
  progress: number;
}

export interface DaycareState {
  uids: number[];
  /** Vitórias acumuladas para o próximo ovo e para o próximo nível dos hóspedes. */
  eggProgress: number;
  levelProgress: number;
}

export const emptyDaycare = (): DaycareState => ({ uids: [], eggProgress: 0, levelProgress: 0 });

const DITTO = speciesId('ditto');
const NO_EGGS = new Set(['no-eggs', 'undiscovered']);

function canBreed(id: number): boolean {
  const s = getSpecies(id);
  return !s.legendary && !s.eggGroups.some((g) => NO_EGGS.has(g)) && s.eggGroups.length > 0;
}

/** Dois Pokémon podem ter ovos se compartilham um grupo de ovos (ou um deles é Ditto). */
export function compatible(a: { speciesId: number }, b: { speciesId: number }): boolean {
  if (!canBreed(a.speciesId) || !canBreed(b.speciesId)) return false;
  if (a.speciesId === DITTO || b.speciesId === DITTO) return a.speciesId !== b.speciesId;
  const groups = getSpecies(b.speciesId).eggGroups;
  return getSpecies(a.speciesId).eggGroups.some((g) => groups.includes(g));
}

export function daycarePokemon(state: GameState): PokemonInstance[] {
  return state.daycare.uids.map((uid) => findPokemon(state, uid)).filter((p): p is PokemonInstance => !!p);
}

/** Espécie que sai do ovo: a primeira da linha do pai que não é Ditto. */
export function eggSpeciesOf(a: { speciesId: number }, b: { speciesId: number }): number {
  const parent = a.speciesId === DITTO ? b : a;
  return lineRoot(parent.speciesId);
}

export function daycareCompatible(state: GameState): boolean {
  const [a, b] = daycarePokemon(state);
  return !!a && !!b && compatible(a, b);
}

export function putInDaycare(state: GameState, uid: number): boolean {
  if (!activityUnlocked(state, 'daycare') || state.daycare.uids.length >= BALANCE.daycare.slots) return false;
  if (!findPokemon(state, uid) || busyUids(state).has(uid)) return false;
  state.daycare.uids.push(uid);
  state.daycare.eggProgress = 0;
  return true;
}

export function takeFromDaycare(state: GameState, uid: number): void {
  state.daycare.uids = state.daycare.uids.filter((x) => x !== uid);
  state.daycare.eggProgress = 0;
}

function makeEgg(state: GameState): Egg {
  const [a, b] = daycarePokemon(state);
  const rng = rngFrom(state);
  const ivs = randomIvs(rng);
  // Herda alguns IVs de um dos pais, sorteados sem repetir o atributo.
  const keys = Object.keys(ivs) as (keyof Ivs)[];
  for (let i = 0; i < (isPerfect(ivs) ? 0 : BALANCE.daycare.inheritedIvs); i++) {
    const key = keys.splice(Math.floor(rng.next() * keys.length), 1)[0];
    ivs[key] = (rng.next() < 0.5 ? a : b).ivs[key];
  }
  const species = eggSpeciesOf(a, b);
  const shiny = rollShiny(rng, BALANCE.daycare.shinyMultiplier * computeModifiers(state).shiny);
  return {
    id: state.nextUid++,
    speciesId: species,
    ivs,
    shiny,
    cycles: getSpecies(species).hatchCounter,
    progress: 0,
  };
}

/** Vitórias em batalha: geram ovos, fazem os ovos andarem e treinam os hóspedes. */
export function daycareKills(state: GameState, kills: number): void {
  const d = BALANCE.daycare;
  for (const egg of state.eggs) egg.progress += kills / d.killsPerCycle;
  const guests = daycarePokemon(state);
  if (!guests.length) return;

  state.daycare.levelProgress += kills;
  const levels = Math.floor(state.daycare.levelProgress / d.killsPerLevel);
  state.daycare.levelProgress -= levels * d.killsPerLevel;
  if (levels > 0) for (const p of guests) setLevel(p, p.level + levels);

  if (!daycareCompatible(state)) return;
  state.daycare.eggProgress += kills;
  while (state.daycare.eggProgress >= d.killsPerEgg && state.eggs.length < d.maxEggs) {
    state.daycare.eggProgress -= d.killsPerEgg;
    state.eggs.push(makeEgg(state));
  }
  if (state.eggs.length >= d.maxEggs)
    state.daycare.eggProgress = Math.min(state.daycare.eggProgress, d.killsPerEgg);
}

/** Tempo real: cada ciclo também passa sozinho a cada N minutos. */
export function daycareTime(state: GameState, ms: number): void {
  const perCycle = BALANCE.daycare.minutesPerCycle * 60_000;
  for (const egg of state.eggs) egg.progress += ms / perCycle;
}

export function hatchReadyEggs(state: GameState, now: number, events: GameEvent[]): void {
  const ready = state.eggs.filter((e) => e.progress >= e.cycles);
  if (!ready.length) return;
  state.eggs = state.eggs.filter((e) => e.progress < e.cycles);
  for (const egg of ready) {
    const isNew = !state.pokedex[egg.speciesId]?.caught;
    const p = addToCollection(
      state,
      egg.speciesId,
      BALANCE.daycare.hatchLevel,
      egg.ivs,
      egg.shiny,
      now,
      'Creche',
    );
    p.friendship = BALANCE.friendship.hatch;
    state.stats.hatched++;
    progressMission(state, 'hatch', 1, events);
    events.push({ type: 'hatched', uid: p.uid, speciesId: p.speciesId, shiny: p.shiny, isNew });
  }
}
