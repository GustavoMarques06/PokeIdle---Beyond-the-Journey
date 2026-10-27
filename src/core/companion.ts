// Pokémon acompanhante: o favorito anda com o treinador (cartão e mapa). Ganha amizade com o
// tempo, mesmo fora da batalha, e de vez em quando traz um item que achou pelo caminho.

import { BALANCE, FOUND_ITEMS } from '../game-data';
import { findPokemon, giveItems } from './collection';
import { addFriendship } from './friendship';
import { pickWeighted, randInt, type Rng } from './rng';
import type { GameEvent, GameState } from './state';

export interface CompanionState {
  uid: number;
  /** Último instante em que a amizade passiva foi contada. */
  lastAt: number;
  nextFindAt: number;
}

export function setCompanion(state: GameState, uid: number | null, now: number, rng: Rng): boolean {
  if (uid === null) {
    state.companion = null;
    return true;
  }
  if (!findPokemon(state, uid)) return false;
  const [min, max] = BALANCE.companion.findMinutes;
  state.companion = { uid, lastAt: now, nextFindAt: now + randInt(rng, min, max) * 60_000 };
  return true;
}

export function companionTick(state: GameState, now: number, rng: Rng, events: GameEvent[]): void {
  const c = state.companion;
  if (!c) return;
  const p = findPokemon(state, c.uid);
  if (!p) {
    state.companion = null;
    return;
  }
  if (now < c.lastAt) {
    // Relógio voltou: só reancora.
    c.lastAt = now;
    c.nextFindAt = Math.min(c.nextFindAt, now + BALANCE.companion.findMinutes[1] * 60_000);
    return;
  }
  const cfg = BALANCE.companion;
  const step = cfg.friendshipEveryMinutes * 60_000;
  const points = Math.floor((now - c.lastAt) / step);
  if (points > 0) {
    addFriendship(p, points);
    c.lastAt += points * step;
  }
  for (let i = 0; i < cfg.maxFindsAtOnce && now >= c.nextFindAt; i++) {
    const item = pickWeighted(rng, FOUND_ITEMS).id;
    giveItems(state, { [item]: 1 });
    events.push({ type: 'companionFound', uid: p.uid, speciesId: p.speciesId, item });
    c.nextFindAt += randInt(rng, cfg.findMinutes[0], cfg.findMinutes[1]) * 60_000;
  }
  // Muito tempo fora: não acumula achados além do limite.
  if (now >= c.nextFindAt) c.nextFindAt = now + randInt(rng, cfg.findMinutes[0], cfg.findMinutes[1]) * 60_000;
}
