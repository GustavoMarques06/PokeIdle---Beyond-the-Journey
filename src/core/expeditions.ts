// Expedições: Pokémon de apoio/duplicados saem por 1, 4 ou 8 horas reais e voltam
// com itens, moedas, pesquisa, TMs ou até um Pokémon novo. O resultado é sorteado
// com uma semente fixada na partida, então recarregar o jogo não muda a recompensa.

import { BALANCE, EXPEDITIONS, TM_POOL, getSpecies, type ExpeditionDef } from '../game-data';
import { activityUnlocked, addToCollection, busyUids, findPokemon, routeDone, unlockTm } from './collection';
import { giveGiftEgg } from './daycare';
import type { GameEvent, GameState } from './game';
import { giveForm } from './forms';
import { addFriendship } from './friendship';
import { progressMission } from './missions';
import { randomIvs, rollShiny } from './pokemon';
import { setLevel } from './progression';
import { pickWeighted, randInt, rngFrom, seededRng } from './rng';

export interface ExpeditionRun {
  id: string;
  uids: number[];
  hours: number;
  startedAt: number;
  endsAt: number;
  seed: number;
  notified?: boolean;
  /** Bifurcação no meio do caminho: a trilha segura ou o atalho arriscado (escolhida pelo jogador). */
  fork?: ExpeditionFork;
}

export type ExpeditionFork = 'safe' | 'risky';

/** Uma frase de cada Pokémon do grupo na volta. */
export interface ExpeditionStory {
  uid: number;
  speciesId: number;
  line: string;
}

export interface ExpeditionLoot {
  coins: number;
  research: number;
  items: Record<string, number>;
  pokemon: { uid: number; speciesId: number; shiny: boolean }[];
  tms: string[];
  levels: { uid: number; from: number; to: number }[];
  /** Ovos raros de presente (vão para o ninho da Creche). */
  eggs: number;
  /** Como foi a bifurcação: a trilha segura, o atalho que deu certo ou o que deu errado. */
  fork?: 'safe' | 'lucky' | 'unlucky';
  /** O que cada um conta da viagem (e a amizade que ganhou). */
  stories?: ExpeditionStory[];
  /** Primeira vez neste destino: um cartão-postal novo no álbum. */
  newPostcard?: boolean;
}

/** A bifurcação aparece na metade da viagem e fica aberta até a volta. */
export function forkOpen(run: ExpeditionRun, now: number): boolean {
  return !run.fork && now >= (run.startedAt + run.endsAt) / 2 && now < run.endsAt;
}

export function chooseFork(state: GameState, id: string, fork: ExpeditionFork, now: number): boolean {
  const run = state.expeditions.find((r) => r.id === id);
  if (!run || !forkOpen(run, now)) return false;
  run.fork = fork;
  return true;
}

/** O atalho dá certo? Sai da semente da viagem, então não muda ao recarregar. */
export const riskyLucky = (run: ExpeditionRun) => seededRng(run.seed ^ 0x5f3759df).next() < 0.55;

/** Amizade que cada membro ganha ao voltar. */
export const EXPEDITION_FRIENDSHIP = 10;

const STORIES = [
  'Achei uma pedra brilhante e quis trazer para você!',
  'Teve uma hora que choveu e eu adorei.',
  'Fiz um amigo selvagem no caminho.',
  'Dormi debaixo de uma árvore enorme.',
  'Corri na frente o caminho todo!',
  'Senti saudade, mas foi muito divertido.',
  'Vi um Pokémon que nunca tinha visto!',
  'Aprendi a atravessar o rio pulando nas pedras.',
  'Quero ir de novo amanhã!',
  'Carreguei a mochila do grupo sozinho.',
]

export function expeditionSlots(state: GameState): number {
  return BALANCE.expeditions.slots.filter((r) => routeDone(state, r)).length;
}

export function availableExpeditions(state: GameState): ExpeditionDef[] {
  return EXPEDITIONS.filter((e) => routeDone(state, e.requires));
}

/** Quantos membros do grupo têm um dos tipos favorecidos pela expedição. */
export function typeMatches(state: GameState, def: ExpeditionDef, uids: number[]): number {
  return uids.filter((uid) => {
    const p = findPokemon(state, uid);
    return !!p && getSpecies(p.speciesId).types.some((t) => def.types.includes(t));
  }).length;
}

export function expeditionRolls(state: GameState, def: ExpeditionDef, uids: number[], hours: number): number {
  const e = BALANCE.expeditions;
  const sizeFactor = 0.6 + 0.4 * (uids.length / e.maxParty);
  return Math.max(
    1,
    Math.round(hours * e.rollsPerHour * sizeFactor * (1 + e.typeBonus * typeMatches(state, def, uids))),
  );
}

export function startExpedition(
  state: GameState,
  id: string,
  uids: number[],
  hours: number,
  now: number,
): boolean {
  const def = availableExpeditions(state).find((e) => e.id === id);
  const e = BALANCE.expeditions;
  if (!def || !activityUnlocked(state, 'expeditions') || !e.durations.includes(hours)) return false;
  if (state.expeditions.length >= expeditionSlots(state)) return false;
  if (state.expeditions.some((run) => run.id === id)) return false;
  const unique = [...new Set(uids)];
  if (!unique.length || unique.length > e.maxParty) return false;
  const busy = busyUids(state);
  if (unique.some((uid) => busy.has(uid) || !findPokemon(state, uid))) return false;
  const seed = (rngFrom(state).next() * 2 ** 32) | 0;
  state.expeditions.push({ id, uids: unique, hours, startedAt: now, endsAt: now + hours * 3_600_000, seed });
  return true;
}

export function expeditionDone(run: ExpeditionRun, now: number): boolean {
  return now >= run.endsAt;
}

/** Cancela sem recompensa (os Pokémon voltam). */
export function recallExpedition(state: GameState, id: string): void {
  state.expeditions = state.expeditions.filter((r) => r.id !== id);
}

export function claimExpedition(
  state: GameState,
  id: string,
  now: number,
  events: GameEvent[] = [],
): ExpeditionLoot | null {
  const run = state.expeditions.find((r) => r.id === id);
  const def = EXPEDITIONS.find((e) => e.id === id);
  if (!run || !def || !expeditionDone(run, now)) return null;
  state.expeditions = state.expeditions.filter((r) => r !== run);

  const uids = run.uids.filter((uid) => findPokemon(state, uid));
  const rng = seededRng(run.seed);
  const loot: ExpeditionLoot = { coins: 0, research: 0, items: {}, pokemon: [], tms: [], levels: [], eggs: 0 };
  const table = def.rewards.map((r) => ({ ...r, weight: r.w }));
  let rolls = expeditionRolls(state, def, uids, run.hours);
  // A bifurcação: a trilha segura dá um achado a mais; o atalho dá muito mais… ou se perde um.
  if (run.fork === 'safe') {
    rolls += 1;
    loot.fork = 'safe';
  } else if (run.fork === 'risky') {
    const lucky = riskyLucky(run);
    rolls = lucky ? rolls + Math.max(2, Math.round(rolls / 2)) : Math.max(1, rolls - 1);
    loot.fork = lucky ? 'lucky' : 'unlucky';
  }
  for (let i = 0; i < rolls; i++) {
    const r = pickWeighted(rng, table);
    if ('coins' in r) loot.coins += randInt(rng, r.coins[0], r.coins[1]);
    else if ('research' in r) loot.research += randInt(rng, r.research[0], r.research[1]);
    else if ('item' in r) loot.items[r.item] = (loot.items[r.item] ?? 0) + randInt(rng, r.qty[0], r.qty[1]);
    else if ('tm' in r) {
      const options = TM_POOL.filter((m) => !state.tms.includes(m) && !loot.tms.includes(m));
      if (options.length) loot.tms.push(options[Math.floor(rng.next() * options.length)]);
      else loot.coins += 500;
    } else if ('speciesId' in r) {
      const level = randInt(rng, r.level[0], r.level[1]);
      const p = addToCollection(state, r.speciesId, level, randomIvs(rng), rollShiny(rng), now, def.name);
      giveForm(state, p, rng, now);
      loot.pokemon.push({ uid: p.uid, speciesId: p.speciesId, shiny: p.shiny });
    }
  }
  state.coins += loot.coins;
  state.research.points += loot.research;
  for (const [item, qty] of Object.entries(loot.items)) state.items[item] = (state.items[item] ?? 0) + qty;
  for (const tm of loot.tms) unlockTm(state, tm);

  for (const uid of uids) {
    const p = findPokemon(state, uid)!;
    const gain = Math.max(
      1,
      Math.round((run.hours * BALANCE.expeditions.levelsPerHour * 20) / Math.max(20, p.level)),
    );
    const from = p.level;
    setLevel(p, p.level + gain);
    if (p.level > from) loot.levels.push({ uid, from, to: p.level });
    // Voltam mais apegados, cada um com uma história.
    addFriendship(p, EXPEDITION_FRIENDSHIP);
    (loot.stories ??= []).push({ uid, speciesId: p.speciesId, line: STORIES[Math.floor(rng.next() * STORIES.length)] });
  }
  // Álbum de cartões-postais: um por destino.
  const album = (state.postcards ??= {});
  loot.newPostcard = !album[def.id];
  album[def.id] = (album[def.id] ?? 0) + 1;
  // Ovo raro de presente: mais chance quanto mais longa a expedição.
  const giftChance = Math.min(BALANCE.daycare.giftEggMax, run.hours * BALANCE.daycare.giftEggPerHour);
  if (rng.next() < giftChance && giveGiftEgg(state, rng, def.name)) loot.eggs = 1;
  // As asas de Johto (chaves de Lugia e Ho-Oh) também aparecem em expedições longas.
  const wing = ['silver-wing', 'rainbow-wing'].find((w) => !(state.items[w] > 0) && !loot.items[w]);
  if (wing && run.hours >= 4 && rng.next() < 0.1) loot.items[wing] = 1;
  state.stats.expeditionsDone++;
  progressMission(state, 'expeditions', 1, events);
  return loot;
}
