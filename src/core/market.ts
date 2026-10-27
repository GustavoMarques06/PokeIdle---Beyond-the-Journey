// Mercado: venda de itens da Mochila e o mercador viajante, que aparece de tempos em tempos com
// itens raros com desconto e estoque limitado (compra-se de qualquer lugar enquanto ele está aí).

import { BALANCE, MERCHANT_POOL, itemValue } from '../game-data';
import { routeDone } from './collection';
import { currentSample, historyIntervals, ratePerHour } from './history';
import { estimateRoute } from './offline';
import { randInt, type Rng } from './rng';
import type { GameEvent, GameState } from './state';

export interface MerchantOffer {
  id: string;
  price: number;
  /** Preço normal (Loja de Departamentos), para mostrar o desconto. */
  fullPrice: number;
  stock: number;
}

export interface MerchantState {
  until: number;
  offers: MerchantOffer[];
}

// --- Venda ------------------------------------------------------------------------------

/** Quanto o jogador recebe por unidade (0 = não dá para vender). */
export function sellPrice(id: string): number {
  return Math.floor(itemValue(id) * BALANCE.market.sellRate);
}

export function sellItem(state: GameState, id: string, qty = 1): number {
  const have = state.items[id] ?? 0;
  const unit = sellPrice(id);
  const n = Math.min(have, qty);
  if (n <= 0 || unit <= 0) return 0;
  state.items[id] = have - n;
  if (state.items[id] === 0) delete state.items[id];
  const coins = unit * n;
  state.coins += coins;
  state.stats.itemsSold += n;
  return coins;
}

// --- Renda ------------------------------------------------------------------------------------

/**
 * Moedas por hora: a média real das últimas 2 h (histórico) ou, sem dados, a estimativa do
 * Pokémon ativo na rota atual. Serve para a loja dizer quanto tempo de farm custa cada item.
 */
export function incomePerHour(state: GameState, now: number): number {
  const real = ratePerHour(historyIntervals(state.history, currentSample(state, now)), 'coins', now, 2);
  if (real && real > 0) return real;
  const est = estimateRoute(state, state.currentRouteId);
  return est.cycleMs > 0 ? (est.winRate * est.coinsPerWin * 3_600_000) / est.cycleMs : 0;
}

// --- Mercador viajante ----------------------------------------------------------------------

export function merchantUnlocked(state: GameState): boolean {
  return routeDone(state, BALANCE.merchant.unlock);
}

/** Sorteia as ofertas (sem repetir item); a Master Ball é rara mesmo aqui. */
export function rollOffers(rng: Rng): MerchantOffer[] {
  const cfg = BALANCE.merchant;
  const pool = [...MERCHANT_POOL];
  const offers: MerchantOffer[] = [];
  while (offers.length < cfg.offers && pool.length) {
    const i = Math.floor(rng.next() * pool.length);
    const [entry] = pool.splice(i, 1);
    if (entry.id === 'master-ball' && rng.next() > 0.25) continue;
    const discount = cfg.discount[0] + rng.next() * (cfg.discount[1] - cfg.discount[0]);
    offers.push({
      id: entry.id,
      fullPrice: entry.price,
      price: Math.max(1, Math.round((entry.price * (1 - discount)) / 50) * 50),
      stock: entry.id === 'master-ball' ? 1 : randInt(rng, cfg.stock[0], cfg.stock[1]),
    });
  }
  return offers;
}

export function updateMerchant(state: GameState, now: number, rng: Rng, events: GameEvent[]): void {
  const cfg = BALANCE.merchant;
  if (state.merchant && now >= state.merchant.until) {
    state.merchant = null;
    events.push({ type: 'merchantLeft' });
  }
  if (state.merchant || !merchantUnlocked(state)) return;
  if (!state.nextMerchantAt) {
    state.nextMerchantAt = now + randInt(rng, 30, 90) * 60_000;
    return;
  }
  if (now < state.nextMerchantAt) return;
  state.nextMerchantAt = now + randInt(rng, cfg.minHours * 60, cfg.maxHours * 60) * 60_000;
  state.merchant = { until: now + cfg.activeMinutes * 60_000, offers: rollOffers(rng) };
  events.push({ type: 'merchantAppeared' });
}

export function buyFromMerchant(state: GameState, id: string, now: number): boolean {
  const m = state.merchant;
  if (!m || now >= m.until) return false;
  const offer = m.offers.find((o) => o.id === id);
  if (!offer || offer.stock <= 0 || state.coins < offer.price) return false;
  state.coins -= offer.price;
  offer.stock--;
  state.items[id] = (state.items[id] ?? 0) + 1;
  state.stats.merchantBuys++;
  return true;
}
