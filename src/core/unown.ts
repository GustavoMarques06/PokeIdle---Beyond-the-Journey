// Unown e as Ruínas de Alph: duas formas de caçar as letras sem depender só do sorteio das expedições.
// - Tabuletas: a Escavação às vezes esconde uma tabuleta de pedra; descoberta inteira, vira um Unown de uma letra que
//   ainda falta na coleção.
// - Palavra da semana: as ruínas pedem uma palavra. Quem tiver um Unown de cada letra dela (os repetidos contam: "HOOH"
//   pede dois H e dois O) ganha moedas e outro Unown de uma letra que falta. Os Unown não são gastos.

import { formSet } from '../game-data';
import { addToCollection } from './collection';
import { formsCaught, recordForm } from './forms';
import type { GameEvent, GameState } from './game';
import { randomIvs, rollShiny, type PokemonInstance } from './pokemon';
import { weekOf } from './records';
import { rngFrom, type Rng } from './rng';

export const UNOWN_ID = 201;
/** Tesouro da Escavação que vira um Unown (não é um item da Mochila). */
export const UNOWN_TABLET = 'unown-tablet';
export const UNOWN_WORD_COINS = 30_000;
const UNOWN_LEVEL = 25;

/** Palavras das ruínas, uma por semana, em rodízio. Só letras de A a Z. */
const WORDS = [
  'MEW',
  'ALPH',
  'LUGIA',
  'RUINA',
  'HOOH',
  'LENDA',
  'ENTEI',
  'PEDRA',
  'NOITE',
  'KANTO',
  'JOHTO',
  'SHINY',
  'ZAPDOS',
  'ONIX',
  'KALOS',
  'UNOVA',
  'JYNX',
  'CELEBI',
  'FOGO',
  'BRAVO',
  'QUARTZ',
  'WOBBUFFET',
];

/** Letras (e sinais) de Unown que ainda faltam na coleção. */
export function missingUnownForms(state: GameState): string[] {
  const have = formsCaught(state, UNOWN_ID);
  return (formSet(UNOWN_ID)?.forms ?? []).filter((f) => !have.includes(f));
}

/** Entrega um Unown de uma letra que ainda falta (ou de uma qualquer, com a coleção completa). */
export function giveUnown(state: GameState, now: number, origin: string, rng: Rng = rngFrom(state)): PokemonInstance {
  const missing = missingUnownForms(state);
  const pool = missing.length ? missing : (formSet(UNOWN_ID)?.forms ?? ['a']);
  const form = pool[Math.floor(rng.next() * pool.length)];
  const p = addToCollection(state, UNOWN_ID, UNOWN_LEVEL, randomIvs(rng), rollShiny(rng), now, origin);
  p.form = form;
  recordForm(state, UNOWN_ID, form);
  return p;
}

export const unownWord = (now: number): string => WORDS[weekOf(now) % WORDS.length];

/** A palavra da semana, letra a letra: quais você já cobre com os Unown da coleção e se o prêmio já saiu. */
export function unownWordStatus(state: GameState, now: number) {
  const word = unownWord(now);
  const owned: Record<string, number> = {};
  for (const p of state.collection) {
    if (p.speciesId === UNOWN_ID && p.form) owned[p.form] = (owned[p.form] ?? 0) + 1;
  }
  const used: Record<string, number> = {};
  const letters = word
    .toLowerCase()
    .split('')
    .map((letter) => {
      used[letter] = (used[letter] ?? 0) + 1;
      return { letter, have: (owned[letter] ?? 0) >= used[letter] };
    });
  const claimed = state.unown?.week === weekOf(now) && state.unown.claimed;
  return { word, letters, ready: letters.every((l) => l.have), claimed };
}

/** Resgata o prêmio da palavra da semana (uma vez por semana). */
export function claimUnownWord(state: GameState, now: number): GameEvent[] {
  const status = unownWordStatus(state, now);
  if (!status.ready || status.claimed) return [];
  state.unown = { week: weekOf(now), claimed: true };
  state.coins += UNOWN_WORD_COINS;
  state.stats.coinsEarned += UNOWN_WORD_COINS;
  const p = giveUnown(state, now, 'Ruínas de Alph · palavra da semana');
  return [{ type: 'unownWord', word: status.word, form: p.form ?? 'a', coins: UNOWN_WORD_COINS, shiny: p.shiny }];
}
