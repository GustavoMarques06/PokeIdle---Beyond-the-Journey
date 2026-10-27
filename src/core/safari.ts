// Jogo do Safari: sem batalha. Paga-se a entrada, recebe-se um saco de Safari Balls e cada
// encontro se resolve com bola, isca (ele foge menos, mas é mais difícil de pegar) ou pedra (o
// contrário). Depois de cada ação ele pode fugir. Acaba quando as bolas acabam.

import { BALANCE, SAFARI_ENCOUNTERS, getSpecies, speciesId } from '../game-data';
import { computeModifiers } from './bonuses';
import { captureChance } from './capture';
import { addToCollection, dexEntry } from './collection';
import { addResearch, researchBonus } from './dexresearch';
import { recordForm, rollForm } from './forms';
import { progressMission } from './missions';
import { randomIvs, rollShiny } from './pokemon';
import { pickWeighted, randInt, rngFrom, type Rng } from './rng';
import type { Ivs } from './stats';
import type { GameEvent, GameState } from './state';

export interface SafariEnemy {
  speciesId: number;
  level: number;
  ivs: Ivs;
  shiny: boolean;
  form?: string;
  /** Iscas e pedras jogadas neste encontro (até BALANCE.safari.maxStacks cada). */
  bait: number;
  rock: number;
}

export interface SafariState {
  balls: number;
  enemy: SafariEnemy | null;
  /** Espécies capturadas nesta visita. */
  caught: number[];
}

export type SafariAction = 'ball' | 'bait' | 'rock' | 'run';

let table: { speciesId: number; weight: number }[] | null = null;
function encounters() {
  return (table ??= SAFARI_ENCOUNTERS.map(([slug, weight]) => ({ speciesId: speciesId(slug), weight })));
}

export function safariUnlocked(state: GameState): boolean {
  return !!state.routes[BALANCE.safari.unlock]?.unlocked;
}

function spawn(state: GameState, rng: Rng, now: number): SafariEnemy {
  const cfg = BALANCE.safari;
  const id = pickWeighted(rng, encounters()).speciesId;
  dexEntry(state, id).seen = true;
  return {
    speciesId: id,
    level: randInt(rng, cfg.levels[0], cfg.levels[1]),
    ivs: randomIvs(rng),
    shiny: rollShiny(rng, computeModifiers(state).shiny),
    form: rollForm(id, rng, now),
    bait: 0,
    rock: 0,
  };
}

export function startSafari(state: GameState, now: number): boolean {
  const cfg = BALANCE.safari;
  if (state.safari || !safariUnlocked(state) || state.coins < cfg.fee) return false;
  state.coins -= cfg.fee;
  state.safari = { balls: cfg.balls, enemy: spawn(state, rngFrom(state), now), caught: [] };
  return true;
}

export function safariCatchChance(state: GameState, enemy: SafariEnemy): number {
  const cfg = BALANCE.safari;
  const base = captureChance(getSpecies(enemy.speciesId).captureRate, 1, 1, 'safari-ball');
  const mult =
    cfg.bait.catch ** enemy.bait *
    cfg.rock.catch ** enemy.rock *
    computeModifiers(state).capture *
    researchBonus(state, enemy.speciesId).capture;
  return Math.min(1, base * mult);
}

export function safariFleeChance(enemy: SafariEnemy): number {
  const cfg = BALANCE.safari;
  const base = cfg.fleeBase + getSpecies(enemy.speciesId).baseStats.spe * cfg.fleePerSpeed;
  return Math.min(0.9, base * cfg.bait.flee ** enemy.bait * cfg.rock.flee ** enemy.rock);
}

/** Uma ação do jogador. Devolve os eventos (captura, fuga, fim da visita). */
export function safariAct(state: GameState, action: SafariAction, now: number): GameEvent[] {
  const s = state.safari;
  const events: GameEvent[] = [];
  if (!s?.enemy) return events;
  const rng = rngFrom(state);
  const cfg = BALANCE.safari;
  const enemy = s.enemy;
  const result = (outcome: Extract<GameEvent, { type: 'safariResult' }>['outcome']) =>
    events.push({ type: 'safariResult', speciesId: enemy.speciesId, action, outcome });

  if (action === 'run') {
    result('left');
    s.enemy = spawn(state, rng, now);
    return events;
  }
  if (action === 'ball') {
    s.balls--;
    if (rng.next() < safariCatchChance(state, enemy)) {
      catchIt(state, enemy, now, events);
      s.caught.push(enemy.speciesId);
      result('caught');
      return next(state, rng, now, events);
    }
    result('missed');
  } else if (action === 'bait') {
    enemy.bait = Math.min(cfg.maxStacks, enemy.bait + 1);
    enemy.rock = 0;
  } else {
    enemy.rock = Math.min(cfg.maxStacks, enemy.rock + 1);
    enemy.bait = 0;
  }
  if (rng.next() < safariFleeChance(enemy)) {
    result('fled');
    return next(state, rng, now, events);
  }
  if (action !== 'ball') result('stayed');
  if (s.balls <= 0) end(state, events);
  return events;
}

/** Próximo encontro (ou fim, se as bolas acabaram). */
function next(state: GameState, rng: Rng, now: number, events: GameEvent[]): GameEvent[] {
  const s = state.safari!;
  if (s.balls <= 0) end(state, events);
  else s.enemy = spawn(state, rng, now);
  return events;
}

function end(state: GameState, events: GameEvent[]): void {
  events.push({ type: 'safariEnded', caught: state.safari?.caught.length ?? 0 });
  state.safari = null;
}

/** Desiste da visita (as bolas que sobraram se perdem). */
export function leaveSafari(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.safari) end(state, events);
  return events;
}

function catchIt(state: GameState, enemy: SafariEnemy, now: number, events: GameEvent[]): void {
  const isNew = !dexEntry(state, enemy.speciesId).caught;
  const p = addToCollection(state, enemy.speciesId, enemy.level, enemy.ivs, enemy.shiny, now, 'Zona Safari');
  if (enemy.form) p.form = enemy.form;
  recordForm(state, enemy.speciesId, enemy.form);
  state.stats.totalCaptures++;
  state.stats.safariCaptures++;
  progressMission(state, 'captures', 1, events);
  progressMission(state, 'capture-type', 1, events, getSpecies(enemy.speciesId).types);
  addResearch(state, enemy.speciesId, { night: state.env.period === 'night' ? 1 : 0 }, events);
  events.push({ type: 'captured', uid: p.uid, speciesId: p.speciesId, shiny: p.shiny, isNew });
}
