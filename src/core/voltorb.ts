// Voltorb Flip (Game Corner): um tabuleiro 5×5 de cartas viradas com 1, 2, 3 ou um Voltorb. Cada linha e coluna
// mostra a soma das cartas e quantos Voltorbs tem. Virar multiplica as fichas da rodada; virar um Voltorb perde tudo
// dela. Virando todos os 2 e 3, a rodada é ganha e o nível sobe (até 8). Perdendo, o nível cai para o número de cartas
// viradas. Entrar numa rodada custa algumas fichas a partir do nível 3. Fora disso: fichas no chão uma vez por dia e o prêmio da semana.

import { PRIZES } from '../game-data';
import { activityUnlocked } from './collection';
import type { GameState } from './game';
import { localDay } from './missions';
import { randInt, rngFrom, seededRng } from './rng';

export const VF_SIZE = 5;
export const VF_MAX_LEVEL = 8;
export const VF_ENTRY = 10;

/**
 * Entrada de uma rodada pelo nível. Nos níveis 1 e 2 o tabuleiro inteiro paga só 18 a 54 fichas e a entrada de 10
 * comia o ganho (numa simulação, um jogador que usa as pistas empatava ou perdia fichas e nunca subia de nível).
 * Lá em cima uma rodada paga milhares, então a entrada sobe.
 */
export const voltorbEntry = (level: number) => (level <= 2 ? 0 : level <= 5 ? VF_ENTRY : VF_ENTRY * 2);
/** Teto de fichas que uma rodada paga (nos níveis altos a multiplicação explode). */
export const VF_CAP = 5000;

/** Por nível: as combinações possíveis de [quantos 2, quantos 3, quantos Voltorbs] (como em HeartGold/SoulSilver). */
const LEVELS: [number, number, number][][] = [
  [
    [3, 1, 6],
    [0, 3, 6],
    [5, 0, 6],
    [2, 2, 6],
    [4, 1, 6],
  ],
  [
    [1, 3, 7],
    [6, 0, 7],
    [3, 2, 7],
    [0, 4, 7],
    [5, 1, 7],
  ],
  [
    [2, 3, 8],
    [7, 0, 8],
    [4, 2, 8],
    [1, 4, 8],
    [6, 1, 8],
  ],
  [
    [3, 3, 8],
    [0, 5, 8],
    [8, 0, 10],
    [5, 2, 10],
    [2, 4, 10],
  ],
  [
    [7, 1, 10],
    [4, 3, 10],
    [1, 5, 10],
    [9, 0, 10],
    [6, 2, 10],
  ],
  [
    [3, 4, 10],
    [0, 6, 10],
    [8, 1, 10],
    [5, 3, 10],
    [2, 5, 10],
  ],
  [
    [7, 2, 10],
    [4, 4, 10],
    [1, 6, 13],
    [9, 1, 13],
    [6, 3, 10],
  ],
  [
    [0, 7, 10],
    [8, 2, 10],
    [5, 4, 10],
    [2, 6, 10],
    [7, 3, 10],
  ],
];

export interface VoltorbRound {
  /** Valor de cada carta, linha a linha (0 = Voltorb). */
  board: number[];
  flipped: boolean[];
  /** Fichas acumuladas na rodada (0 até a primeira carta). */
  coins: number;
  over?: 'won' | 'lost';
}

export interface CornerState {
  level: number;
  round: VoltorbRound | null;
  best: number;
  wins: number;
  /** Dia em que já pegou as fichas do chão. */
  floorDay: number | null;
  /** Mural dos maiores prêmios do caça-níquel (os 5 maiores). */
  jackpots?: JackpotRecord[];
  /** Maior ou Menor: a rodada atual e a maior sequência já feita. */
  hilo?: HiLoRound | null;
  hiloBest?: number;
}

export interface JackpotRecord {
  payout: number;
  reels: [string, string, string];
  mult: number;
  at: number;
}

export interface HiLoRound {
  /** Valor da carta virada (1 a 13). */
  card: number;
  streak: number;
  pot: number;
  over?: 'lost' | 'cashed';
  /** A carta que acabou de sair e se o palpite acertou (para a animação). */
  last?: { card: number; result: 'right' | 'wrong' | 'tie' };
}

export function cornerState(state: GameState): CornerState {
  return (state.corner ??= { level: 1, round: null, best: 0, wins: 0, floorDay: null });
}

function makeBoard(level: number, seed: number): number[] {
  const rng = seededRng(seed);
  const options = LEVELS[level - 1];
  const [twos, threes, bombs] = options[Math.floor(rng.next() * options.length)];
  const cards = [...Array(twos).fill(2), ...Array(threes).fill(3), ...Array(bombs).fill(0)];
  while (cards.length < VF_SIZE * VF_SIZE) cards.push(1);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Soma e Voltorbs de cada linha e coluna (as pistas do tabuleiro). */
export function voltorbHints(board: number[]): { rows: [number, number][]; cols: [number, number][] } {
  const line = (cells: number[]): [number, number] => [
    cells.reduce((a, b) => a + b, 0),
    cells.filter((v) => v === 0).length,
  ];
  const at = (x: number, y: number) => board[y * VF_SIZE + x];
  const idx = [...Array(VF_SIZE).keys()];
  return {
    rows: idx.map((y) => line(idx.map((x) => at(x, y)))),
    cols: idx.map((x) => line(idx.map((y) => at(x, y)))),
  };
}

export function startVoltorb(state: GameState): boolean {
  const c = cornerState(state);
  if (!activityUnlocked(state, 'gamecorner') || (c.round && !c.round.over) || state.tokens < voltorbEntry(c.level))
    return false;
  state.tokens -= voltorbEntry(c.level);
  c.round = {
    board: makeBoard(c.level, (rngFrom(state).next() * 2 ** 32) | 0),
    flipped: Array(VF_SIZE * VF_SIZE).fill(false),
    coins: 0,
  };
  return true;
}

const needed = (r: VoltorbRound) => r.board.every((v, i) => v <= 1 || r.flipped[i]);

/** Vira uma carta. Devolve o valor dela (0 = Voltorb) ou null se não deu. */
export function flipCard(state: GameState, i: number): number | null {
  const c = cornerState(state);
  const r = c.round;
  if (!r || r.over || r.flipped[i] || i < 0 || i >= r.board.length) return null;
  r.flipped[i] = true;
  const v = r.board[i];
  if (v === 0) {
    r.over = 'lost';
    const flipped = r.flipped.filter(Boolean).length - 1;
    c.level = Math.max(1, Math.min(c.level, flipped));
    r.coins = 0;
    return 0;
  }
  r.coins = Math.min(VF_CAP, (r.coins || 1) * v);
  if (needed(r)) {
    r.over = 'won';
    state.tokens += r.coins;
    c.best = Math.max(c.best, r.coins);
    c.wins++;
    c.level = Math.min(VF_MAX_LEVEL, c.level + 1);
  }
  return v;
}

/** Sai da rodada levando as fichas acumuladas (o nível fica). */
export function cashOutVoltorb(state: GameState): number {
  const c = cornerState(state);
  const r = c.round;
  if (!r || r.over) return 0;
  const coins = r.coins;
  state.tokens += coins;
  c.best = Math.max(c.best, coins);
  r.over = 'won';
  r.flipped = r.flipped.map(() => true);
  return coins;
}

export function closeVoltorb(state: GameState): void {
  const c = cornerState(state);
  if (c.round?.over) c.round = null;
}

// --- Fichas no chão e prêmio da semana -------------------------------------------------------

export const floorAvailable = (state: GameState, now: number) =>
  cornerState(state).floorDay !== localDay(now);

/** Procura fichas esquecidas no chão (uma vez por dia). */
export function searchFloor(state: GameState, now: number): number {
  const c = cornerState(state);
  if (!activityUnlocked(state, 'gamecorner') || !floorAvailable(state, now)) return 0;
  c.floorDay = localDay(now);
  const n = randInt(rngFrom(state), 10, 40);
  state.tokens += n;
  return n;
}

/** O prêmio em promoção nesta semana (índice em PRIZES) e o preço com 30% de desconto. */
export function weeklyPrize(now: number): { index: number; tokens: number } {
  const week = Math.floor(now / (7 * 86_400_000));
  const index = Math.floor(seededRng(week * 7907 + 11).next() * PRIZES.length);
  return { index, tokens: Math.ceil(PRIZES[index].tokens * 0.7) };
}
