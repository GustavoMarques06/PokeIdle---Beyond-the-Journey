// Pedidos do cientista do Laboratório: um por dia, sorteado pelo dia. Ele pede tesouros que saem da Escavação e paga
// em moedas e num item raro. Os itens entregues somem da Mochila.

import { FOSSILS } from '../game-data';
import { activityUnlocked } from './collection';
import type { GameState } from './game';
import { localDay } from './missions';
import { seededRng } from './rng';

export interface LabRequest {
  day: number;
  items: Record<string, number>;
  coins: number;
  reward: string;
  line: string;
}

const STONES = ['fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone'];
const TREASURES = ['star-piece', 'nugget', 'hard-stone', 'everstone'];
const REWARDS = ['rare-candy', 'ability-capsule', 'rare-candy', 'bottle-cap'];

/** O pedido de hoje (o mesmo o dia inteiro). */
export function labRequest(now: number): LabRequest {
  const day = localDay(now);
  const rng = seededRng(day * 7349 + 17);
  const pick = <T,>(list: T[]) => list[Math.floor(rng.next() * list.length)];
  const kind = Math.floor(rng.next() * 3);
  const reward = pick(REWARDS);
  if (kind === 0) {
    const fossil = pick(FOSSILS).item;
    return {
      day,
      items: { [fossil]: 1 },
      coins: 20_000,
      reward,
      line: 'Estou estudando a evolução dos Pokémon antigos. Você me traria um destes fósseis para comparar?',
    };
  }
  if (kind === 1) {
    const stone = pick(STONES);
    return {
      day,
      items: { [stone]: 2 },
      coins: 12_000,
      reward,
      line: 'Preciso de pedras de evolução para um experimento. Duas destas resolveriam!',
    };
  }
  const t = pick(TREASURES);
  return {
    day,
    items: { [t]: 3 },
    coins: 9_000,
    reward,
    line: 'A Escavação está cheia de tesouros. Junte três destes para o meu acervo, por favor!',
  };
}

export const labRequestDone = (state: GameState, now: number) => state.labDone === localDay(now);

export const labRequestReady = (state: GameState, now: number) =>
  Object.entries(labRequest(now).items).every(([id, n]) => (state.items[id] ?? 0) >= n);

/** Entrega o pedido de hoje. Devolve o pedido entregue, ou null se ainda não dá. */
export function claimLabRequest(state: GameState, now: number): LabRequest | null {
  const req = labRequest(now);
  if (!activityUnlocked(state, 'fossils') || labRequestDone(state, now) || !labRequestReady(state, now)) return null;
  for (const [id, n] of Object.entries(req.items)) state.items[id] -= n;
  state.coins += req.coins;
  state.stats.coinsEarned += req.coins;
  state.items[req.reward] = (state.items[req.reward] ?? 0) + 1;
  state.labDone = req.day;
  return req;
}
