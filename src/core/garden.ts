// Jardim de berries: plantar uma berry, esperar o tempo real e colher várias. Comer
// uma berry dá um bônus temporário, contado em tempo de jogo.

import { BALANCE, BERRIES, type BuffKind } from '../game-data';
import { routeDone } from './collection';
import type { GameEvent, GameState } from './game';
import { progressMission } from './missions';
import { randInt, rngFrom } from './rng';

export interface GardenPlot {
  berry: string;
  plantedAt: number;
  readyAt: number;
  notified?: boolean;
}

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
  state.garden[plot] = { berry, plantedAt: now, readyAt: now + def.growMinutes * 60_000 };
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
  const qty = randInt(rngFrom(state), def.yield[0], def.yield[1]);
  state.items[p.berry] = (state.items[p.berry] ?? 0) + qty;
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
  for (const p of state.garden) {
    if (p && !p.notified && plotReady(p, now)) {
      p.notified = true;
      events.push({ type: 'berryReady', berry: p.berry });
    }
  }
}
