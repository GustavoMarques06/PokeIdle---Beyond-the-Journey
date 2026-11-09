// Game Corner de Celadon: compra de fichas com moedas, caça-níqueis e balcão de prêmios.

import { BALANCE, PRIZES, SLOT_BET, SLOT_SINGLE_CHERRY, SLOT_SYMBOLS } from '../game-data';
import { activityUnlocked, addToCollection, giveItems, unlockTm } from './collection';
import type { GameEvent, GameState } from './game';
import { giveForm } from './forms';
import { progressMission } from './missions';
import { randomIvs, rollShiny } from './pokemon';
import { pickWeighted, rngFrom } from './rng';

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

export function spinSlots(state: GameState, events: GameEvent[] = []): SpinResult | null {
  if (!activityUnlocked(state, 'gamecorner') || state.tokens < SLOT_BET) return null;
  const rng = rngFrom(state);
  state.tokens -= SLOT_BET;
  const reels = [0, 1, 2].map(() => pickWeighted(rng, SLOT_SYMBOLS).id) as [string, string, string];
  const payout = slotPayout(reels);
  state.tokens += payout;
  state.stats.slotsSpun++;
  progressMission(state, 'slots', 1, events);
  return { reels, payout };
}

export function buyPrize(state: GameState, index: number, now: number): boolean {
  const prize = PRIZES[index];
  if (!prize || !activityUnlocked(state, 'gamecorner') || state.tokens < prize.tokens) return false;
  if (prize.kind === 'tm' && state.tms.includes(prize.move)) return false;
  state.tokens -= prize.tokens;
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
