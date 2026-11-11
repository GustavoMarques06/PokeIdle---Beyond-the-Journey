// Game Corner de Celadon: compra de fichas com moedas, caça-níqueis e balcão de prêmios.

import { BALANCE, PRIZES, SLOT_BET, SLOT_SINGLE_CHERRY, SLOT_SYMBOLS } from '../game-data';
import { activityUnlocked, addToCollection, giveItems, unlockTm } from './collection';
import type { GameEvent, GameState } from './game';
import { giveForm } from './forms';
import { progressMission } from './missions';
import { randomIvs, rollShiny } from './pokemon';
import { pickWeighted, rngFrom } from './rng';
import { cornerState, weeklyPrize, type HiLoRound, type JackpotRecord } from './voltorb';

export interface SpinResult {
  reels: [string, string, string];
  payout: number;
}

export function buyTokens(state: GameState, packs: number): boolean {
  const g = BALANCE.gameCorner;
  const cost = packs * g.packPrice;
  if (!activityUnlocked(state, 'gamecorner') || packs <= 0 || state.coins < cost) return false;
  state.coins -= cost;
  state.tokens += packs * g.tokensPerPack;
  return true;
}

/** Prêmio em fichas para uma combinação (três iguais, dois primeiros iguais ou cereja). */
export function slotPayout(reels: readonly string[]): number {
  const [a, b, c] = reels;
  const sym = SLOT_SYMBOLS.find((s) => s.id === a)!;
  if (a === b && b === c) return sym.three;
  if (a === b) return sym.two;
  return a === 'cherry' ? SLOT_SINGLE_CHERRY : 0;
}

/** Retorno esperado por ficha apostada (usado no teste de balanceamento). */
export function slotReturnRate(): number {
  const total = SLOT_SYMBOLS.reduce((s, x) => s + x.weight, 0);
  let ev = 0;
  for (const a of SLOT_SYMBOLS)
    for (const b of SLOT_SYMBOLS)
      for (const c of SLOT_SYMBOLS)
        ev += ((a.weight * b.weight * c.weight) / total ** 3) * slotPayout([a.id, b.id, c.id]);
  return ev / SLOT_BET;
}

/** Apostas possíveis: multiplicam o custo e o prêmio do giro. */
export const SLOT_MULTS = [1, 2, 5] as const;

export function spinSlots(state: GameState, events: GameEvent[] = [], mult = 1): SpinResult | null {
  const bet = SLOT_BET * mult;
  if (!activityUnlocked(state, 'gamecorner') || !SLOT_MULTS.includes(mult as 1) || state.tokens < bet) return null;
  const rng = rngFrom(state);
  state.tokens -= bet;
  const reels = [0, 1, 2].map(() => pickWeighted(rng, SLOT_SYMBOLS).id) as [string, string, string];
  const payout = slotPayout(reels) * mult;
  state.tokens += payout;
  state.stats.slotsSpun++;
  // Mural: prêmios de 10× a aposta ou mais entram (fica com os 5 maiores).
  if (payout >= bet * 10) {
    const c = cornerState(state);
    const entry: JackpotRecord = { payout, reels, mult, at: state.lastTimerAt };
    c.jackpots = [...(c.jackpots ?? []), entry].sort((a, b) => b.payout - a.payout).slice(0, 5);
  }
  progressMission(state, 'slots', 1, events);
  return { reels, payout };
}

// --- Maior ou Menor --------------------------------------------------------------------------------

/** As 13 cartas, do 1 ao 13, cada uma com um Pokémon. */
export const HILO_CARDS = [129, 19, 16, 10, 52, 25, 54, 39, 133, 63, 147, 143, 149];
export const HILO_ENTRY = 5;
const HILO_GROWTH = 1.7;
/** Sequência máxima: aí o prêmio sai sozinho. */
export const HILO_MAX = 8;

export const hiloPot = (streak: number) => Math.round(HILO_ENTRY * HILO_GROWTH ** streak);

const drawCard = (state: GameState) => 1 + Math.floor(rngFrom(state).next() * HILO_CARDS.length);

export function startHiLo(state: GameState): boolean {
  const c = cornerState(state);
  if (!activityUnlocked(state, 'gamecorner') || (c.hilo && !c.hilo.over) || state.tokens < HILO_ENTRY) return false;
  state.tokens -= HILO_ENTRY;
  c.hilo = { card: drawCard(state), streak: 0, pot: HILO_ENTRY };
  return true;
}

/** Palpite: a próxima carta é maior ou menor? Empate não conta (vira a carta e segue). */
export function guessHiLo(state: GameState, guess: 'high' | 'low'): HiLoRound | null {
  const c = cornerState(state);
  const r = c.hilo;
  if (!r || r.over) return null;
  const next = drawCard(state);
  if (next === r.card) {
    r.last = { card: next, result: 'tie' };
    return r;
  }
  const right = guess === 'high' ? next > r.card : next < r.card;
  r.card = next;
  if (!right) {
    r.last = { card: next, result: 'wrong' };
    r.over = 'lost';
    r.pot = 0;
    return r;
  }
  r.streak++;
  r.pot = hiloPot(r.streak);
  r.last = { card: next, result: 'right' };
  c.hiloBest = Math.max(c.hiloBest ?? 0, r.streak);
  if (r.streak >= HILO_MAX) cashHiLo(state);
  return r;
}

/** Para e leva o pote (só depois de acertar ao menos uma). */
export function cashHiLo(state: GameState): number {
  const r = cornerState(state).hilo;
  if (!r || r.over || r.streak === 0) return 0;
  state.tokens += r.pot;
  r.over = 'cashed';
  return r.pot;
}

/** Preço de um prêmio agora (o da semana sai com 30% de desconto). */
export function prizePrice(index: number, now: number): number {
  const w = weeklyPrize(now);
  return w.index === index ? w.tokens : PRIZES[index].tokens;
}

export function buyPrize(state: GameState, index: number, now: number): boolean {
  const prize = PRIZES[index];
  const price = prize ? prizePrice(index, now) : 0;
  if (!prize || !activityUnlocked(state, 'gamecorner') || state.tokens < price) return false;
  if (prize.kind === 'tm' && state.tms.includes(prize.move)) return false;
  state.tokens -= price;
  if (prize.kind === 'pokemon') {
    const rng = rngFrom(state);
    const p = addToCollection(
      state,
      prize.speciesId,
      prize.level,
      randomIvs(rng),
      rollShiny(rng),
      now,
      'Game Corner',
    );
    giveForm(state, p, rng, now);
  } else if (prize.kind === 'tm') unlockTm(state, prize.move);
  else giveItems(state, { [prize.item]: prize.qty });
  return true;
}
