// Jardim de berries: plantar uma berry, esperar o tempo real e colher várias. Comer
// uma berry dá um bônus temporário, contado em tempo de jogo. Para dar vida ao canteiro: regar (até 3 vezes, cada
// uma adianta o crescimento e 3 regas rendem +1 berry; a chuva rega sozinha), um Pokémon de planta na equipe faz
// crescer mais rápido, às vezes um inseto vem beliscar (espantar rende pesquisa; deixar custa 1 berry) e duas
// berries diferentes lado a lado podem gerar uma mutação: uma berry mais rara na colheita.

import { BALANCE, BERRIES, getSpecies, speciesId, type BuffKind } from '../game-data';
import { routeDone } from './collection';
import type { GameEvent, GameState } from './game';
import { progressMission } from './missions';
import { randInt, rngFrom } from './rng';
import { teamPokemon } from './team';
import { seasonAt } from './forms';
import { SEASONS, type Season } from '../game-data';

export interface GardenPlot {
  berry: string;
  plantedAt: number;
  readyAt: number;
  notified?: boolean;
  /** Tempo total de crescimento quando foi plantada (as regas tiram uma parte). */
  growMs?: number;
  /** Regas (até MAX_WATER) e quando foi a última. */
  waters?: number;
  wateredAt?: number;
  /** Inseto que vem beliscar: quando chega, quem é e se já foi espantado. */
  pestAt?: number;
  pest?: number;
  shooed?: boolean;
}

export const MAX_WATER = 3;
/** Intervalo mínimo entre duas regas do mesmo canteiro. */
export const WATER_COOLDOWN = 15 * 60_000;
/** Cada rega adianta esta fração do crescimento total. */
const WATER_CUT = 0.12;
/** Com um Pokémon de planta na equipe, cresce 10% mais rápido. */
const HELPER_SPEED = 0.9;
const PEST_CHANCE = 0.4;
const MUTATION_CHANCE = 0.2;
// --- Estações, abelhas e guardião ---------------------------------------------------------------

/** Cada estação favorece uma parte das berries (em rodízio pela lista): plantadas na estação, crescem mais rápido. */
const SEASON_SPEED = 0.8;
export function berryInSeason(berry: string, season: Season): boolean {
  const i = BERRIES.findIndex((b) => b.id === berry);
  return i >= 0 && i % SEASONS.length === SEASONS.indexOf(season);
}
export const gardenSeason = (now: number) => seasonAt(now);

/** Os Combee passam 10 minutos a cada meia hora polinizando: colher nessa hora dobra a chance de mutação. */
const BEE_WINDOW = 10 * 60_000;
const BEE_CYCLE = 30 * 60_000;
export const beesVisiting = (now: number) => now % BEE_CYCLE < BEE_WINDOW;
/** Quando os Combee voltam (ou até quando ficam, se já estão aqui). */
export const beesNext = (now: number) =>
  beesVisiting(now) ? now - (now % BEE_CYCLE) + BEE_WINDOW : now - (now % BEE_CYCLE) + BEE_CYCLE;

/** Guardião do jardim: um Pokémon Voador ou de Fogo na equipe espanta os insetos sozinho. */
export function gardenGuardian(state: GameState) {
  return teamPokemon(state).find((p) => getSpecies(p.speciesId).types.some((t) => t === 'flying' || t === 'fire'));
}

const PESTS = ['caterpie', 'weedle', 'wurmple', 'combee', 'ledyba', 'sewaddle', 'scatterbug'];

/** O Pokémon de planta da equipe que ajuda no jardim (o primeiro), se houver. */
export function gardenHelper(state: GameState) {
  return teamPokemon(state).find((p) => getSpecies(p.speciesId).types.includes('grass'));
}

/** O inseto está no canteiro agora (chegou, não foi espantado e a planta ainda não amadureceu). */
export function pestActive(plot: GardenPlot | null | undefined, now: number): boolean {
  return !!plot?.pest && !plot.shooed && now >= (plot.pestAt ?? Infinity);
}

/** Pode regar agora? */
export function canWater(plot: GardenPlot | null | undefined, now: number): boolean {
  return !!plot && !plotReady(plot, now) && (plot.waters ?? 0) < MAX_WATER &&
    (plot.wateredAt === undefined || now - plot.wateredAt >= WATER_COOLDOWN);
}

/** A berry que a mutação de duas berries gera: uma acima da mais rara das duas (a lista vai da comum à rara). */
export function mutationOf(a: string, b: string): string | undefined {
  if (a === b) return undefined;
  const i = Math.max(
    BERRIES.findIndex((x) => x.id === a),
    BERRIES.findIndex((x) => x.id === b),
  );
  return BERRIES[Math.min(BERRIES.length - 1, i + 1)]?.id;
}

export const mutationFlag = (berry: string) => `mutation:${berry}`;

export function berryDef(id: string) {
  return BERRIES.find((b) => b.id === id);
}

export function gardenPlots(state: GameState): number {
  return BALANCE.garden.plots.filter((r) => routeDone(state, r)).length;
}

export function plantBerry(state: GameState, plot: number, berry: string, now: number): boolean {
  const def = berryDef(berry);
  if (!def || plot < 0 || plot >= gardenPlots(state) || state.garden[plot]) return false;
  if ((state.items[berry] ?? 0) <= 0) return false;
  state.items[berry]--;
  const rng = rngFrom(state);
  const growMs =
    def.growMinutes *
    60_000 *
    (gardenHelper(state) ? HELPER_SPEED : 1) *
    (berryInSeason(berry, gardenSeason(now)) ? SEASON_SPEED : 1);
  const pest = rng.next() < PEST_CHANCE;
  state.garden[plot] = {
    berry,
    plantedAt: now,
    readyAt: now + growMs,
    growMs,
    ...(pest
      ? { pest: speciesId(PESTS[Math.floor(rng.next() * PESTS.length)]), pestAt: now + growMs * (0.2 + rng.next() * 0.5) }
      : {}),
  };
  return true;
}

/** Rega o canteiro: adianta o crescimento (e 3 regas rendem +1 berry na colheita). */
export function waterPlot(state: GameState, plot: number, now: number): boolean {
  const p = state.garden[plot];
  if (!p || !canWater(p, now)) return false;
  const grow = p.growMs ?? p.readyAt - p.plantedAt;
  p.waters = (p.waters ?? 0) + 1;
  p.wateredAt = now;
  p.readyAt = Math.max(now, p.readyAt - grow * WATER_CUT);
  return true;
}

/** Espanta o inseto: ele vai embora e deixa um pouco de pesquisa. */
export function shooPest(state: GameState, plot: number, now: number): boolean {
  const p = state.garden[plot];
  if (!p || !pestActive(p, now)) return false;
  p.shooed = true;
  state.research.points += 1;
  return true;
}

export function plotReady(plot: GardenPlot | null | undefined, now: number): boolean {
  return !!plot && now >= plot.readyAt;
}

/** Colhe a planta pronta e devolve quantas berries vieram. */
export function harvest(state: GameState, plot: number, now: number, events: GameEvent[] = []): number {
  const p = state.garden[plot];
  if (!p || !plotReady(p, now)) return 0;
  const def = berryDef(p.berry)!;
  const rng = rngFrom(state);
  const watered = (p.waters ?? 0) >= MAX_WATER ? 1 : 0;
  const nibbled = pestActive(p, now) ? 1 : 0;
  const qty = Math.max(1, randInt(rng, def.yield[0], def.yield[1]) + watered - nibbled);
  state.items[p.berry] = (state.items[p.berry] ?? 0) + qty;
  // Mutação: uma berry diferente plantada ao lado pode gerar uma mais rara.
  const neighbors = [state.garden[plot - 1], state.garden[plot + 1]].filter((n): n is GardenPlot => !!n && n.berry !== p.berry);
  if (neighbors.length && rng.next() < MUTATION_CHANCE * (beesVisiting(now) ? 2 : 1)) {
    const other = neighbors[Math.floor(rng.next() * neighbors.length)];
    const mutated = mutationOf(p.berry, other.berry);
    if (mutated) {
      state.items[mutated] = (state.items[mutated] ?? 0) + 1;
      const isNew = !state.flags.includes(mutationFlag(mutated));
      if (isNew) state.flags.push(mutationFlag(mutated));
      events.push({ type: 'gardenMutation', berry: mutated, from: [p.berry, other.berry], isNew });
    }
  }
  state.garden[plot] = null;
  state.stats.harvests += qty;
  progressMission(state, 'harvest', qty, events);
  return qty;
}

export function harvestAll(state: GameState, now: number, events: GameEvent[] = []): number {
  let total = 0;
  for (let i = 0; i < state.garden.length; i++) total += harvest(state, i, now, events);
  return total;
}

/** Come uma berry: soma duração ao bônus do mesmo tipo (até o limite). */
export function eatBerry(state: GameState, berry: string): boolean {
  const def = berryDef(berry);
  if (!def || (state.items[berry] ?? 0) <= 0) return false;
  const max = BALANCE.garden.maxBuffMinutes * 60_000;
  const current = state.buffs[def.buff.kind]?.ms ?? 0;
  if (current >= max) return false;
  state.items[berry]--;
  state.buffs[def.buff.kind] = {
    ms: Math.min(max, current + def.buff.minutes * 60_000),
    value: def.buff.value,
  };
  return true;
}

export function buffValue(state: GameState, kind: BuffKind): number {
  const b = state.buffs[kind];
  return b && b.ms > 0 ? b.value : 0;
}

export function tickBuffs(state: GameState, ms: number): void {
  for (const [kind, b] of Object.entries(state.buffs)) {
    if (!b) continue;
    b.ms -= ms;
    if (b.ms <= 0) delete state.buffs[kind as BuffKind];
  }
}

/** Primeira vez que o jardim abre: algumas berries para começar. */
export function gardenGift(state: GameState): void {
  if (state.flags.includes('garden-gift') || gardenPlots(state) === 0) return;
  state.flags.push('garden-gift');
  for (const [id, qty] of Object.entries(BALANCE.garden.gift)) state.items[id] = (state.items[id] ?? 0) + qty;
}

export function gardenTimers(state: GameState, now: number, events: GameEvent[]): void {
  gardenGift(state);
  while (state.garden.length < BALANCE.garden.plots.length) state.garden.push(null);
  // Chuva: o jardim se rega sozinho.
  if (state.env.weather === 'rain') state.garden.forEach((p, i) => canWater(p, now) && waterPlot(state, i, now));
  // O guardião espanta os insetos assim que chegam (e a pesquisa vem do mesmo jeito).
  if (gardenGuardian(state)) state.garden.forEach((p, i) => pestActive(p, now) && shooPest(state, i, now));
  for (const p of state.garden) {
    if (p && !p.notified && plotReady(p, now)) {
      p.notified = true;
      events.push({ type: 'berryReady', berry: p.berry });
    }
  }
}
