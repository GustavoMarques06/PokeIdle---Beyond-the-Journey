// Jogo do Safari: sem batalha. Paga-se a entrada, escolhe-se a zona e recebe-se um saco de Safari Balls e um tanto de
// passos. A cada passo você escolhe o caminho (grama baixa, grama alta com os raros, ou o lago para pescar) e cada
// encontro se resolve com bola, isca (ou uma berry do Jardim: a favorita da espécie funciona melhor), pedra, Lama ou
// Pokébloco, que mudam o humor dele (comendo, irritado, enlameado). Também dá para fotografar. A visita acaba quando
// as bolas ou os passos acabam. Fora das visitas: Pontos de Safari (loja), pedidos semanais do Guarda, surto da
// semana, dica do Guarda (a berry favorita de uma espécie), Pokédex de cada zona, recordes (inclusive o maior Pokémon)
// e o Guia do Safari, que entra sozinho por algumas horas e traz capturas mesmo com o jogo fechado.

import {
  BALANCE,
  BERRIES,
  MEGAS,
  SAFARI_GUIDE,
  SAFARI_PATHS,
  SAFARI_SHOP,
  SAFARI_ZONES,
  SAFARI_ZONE_REWARD,
  getSpecies,
  heightMeters,
  speciesId,
  type SafariPath,
  type SafariZone,
  type SafariZoneId,
} from '../game-data';
import { computeModifiers } from './bonuses';
import { captureChance } from './capture';
import { activityUnlocked, addToCollection, dexEntry } from './collection';
import { giveGiftEgg, nestSize } from './daycare';
import { addResearch, researchBonus } from './dexresearch';
import { recordForm, rollForm } from './forms';
import { progressMission } from './missions';
import { randomIvs, rollShiny } from './pokemon';
import { pickWeighted, randInt, rngFrom, seededRng, type Rng } from './rng';
import type { Ivs } from './stats';
import type { GameEvent, GameState } from './state';

export type SafariMood = 'watching' | 'eating' | 'angry' | 'muddy';

export interface SafariEnemy {
  speciesId: number;
  level: number;
  ivs: Ivs;
  shiny: boolean;
  form?: string;
  /** Caminho em que apareceu (o lago é pesca). */
  path?: SafariPath;
  /** Humor (como nos jogos de GBA) e quantas ações ele ainda dura. */
  mood?: SafariMood;
  moodTurns?: number;
  /** Comeu um Pokébloco ou a berry favorita: o "comendo" não atrapalha a captura. */
  happy?: boolean;
  /** Já foi fotografado neste encontro. */
  photographed?: boolean;
  /** Camada da zona em que apareceu (0 borda, 1 mata, 2 coração): muda a fuga e os pontos. */
  depth?: number;
  /** Veio de um rastro seguido. */
  tracked?: boolean;
  /** Saves antigos (isca e pedra acumuladas). */
  bait?: number;
  rock?: number;
}

export interface SafariState {
  zone?: SafariZoneId;
  balls: number;
  /** Passos que sobram (cada caminho gasta alguns). */
  steps?: number;
  /** Encontro atual (null: escolhendo o caminho). */
  enemy: SafariEnemy | null;
  /** Espécies capturadas nesta visita. */
  caught: number[];
  /** Pontos de Safari ganhos nesta visita. */
  points?: number;
  /** Espécies fotografadas nesta visita (cada uma vale pontos uma vez). */
  photos?: number[];
  /** Camada da zona em que você está (0 borda, 1 mata, 2 coração). */
  depth?: number;
  /** Rastro achado no chão: seguir leva direto a essa espécie. */
  track?: { speciesId: number; path: SafariPath };
}

/**
 * Camadas da zona. Entrar mais fundo custa passos (`enter`) e cada caminhada fica mais cara (`walk`), mas os raros
 * aparecem mais (`rare`), os comuns menos (`common`), os níveis sobem, o shiny fica mais provável e cada captura vale
 * mais pontos. Lá no fundo os Pokémon também são mais ariscos (`flee`).
 */
export const SAFARI_DEPTHS = [
  { name: 'Borda', enter: 0, walk: 1, rare: 1, common: 1, level: 0, shiny: 1, points: 1, flee: 1 },
  { name: 'Mata', enter: 80, walk: 1.25, rare: 2, common: 0.8, level: 3, shiny: 1.5, points: 1.25, flee: 1.05 },
  { name: 'Coração', enter: 120, walk: 1.6, rare: 4, common: 0.5, level: 6, shiny: 2.5, points: 1.5, flee: 1.15 },
] as const;

/** Passos para seguir um rastro e a chance de achar um depois de cada encontro. */
export const TRACK_STEPS = 30;
const TRACK_CHANCE = 0.35;

const depthOf = (depth: number | undefined) => SAFARI_DEPTHS[Math.max(0, Math.min(SAFARI_DEPTHS.length - 1, depth ?? 0))];

/** Passos que uma caminhada custa na camada em que você está. */
export const walkCost = (s: SafariState, path: SafariPath) =>
  Math.ceil(SAFARI_PATHS[path].steps * depthOf(s.depth).walk);

/** Multiplicador dos pontos de uma captura feita nessa camada. */
export const depthPoints = (depth: number | undefined) => depthOf(depth).points;

export interface SafariRequest {
  id: string;
  kind: 'catch' | 'photo' | 'zone';
  speciesId?: number;
  zone?: SafariZoneId;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

/** Progresso do Safari fora das visitas. */
export interface SafariProgress {
  points: number;
  visits: number;
  /** Mais capturas numa visita e shinies capturados no Safari. */
  best: number;
  shinies: number;
  /** Espécies já capturadas em cada zona e zonas completas. */
  zoneCaught: Partial<Record<SafariZoneId, number[]>>;
  zonesDone: SafariZoneId[];
  upgrades: { steps: number; goodRod: boolean; superRod: boolean };
  /** Bolas extras compradas para a próxima visita. */
  extraBalls: number;
  requests?: { week: number; list: SafariRequest[] };
  /** O maior Pokémon já capturado no Safari (em relação ao tamanho normal da espécie). */
  biggest?: { speciesId: number; meters: number; mult: number; shiny: boolean };
  /** Guia do Safari: entra numa zona sozinho e volta com capturas. */
  guide?: SafariGuideRun;
  /** Álbum de fotos: a melhor foto de cada espécie (shiny e tamanho contam). */
  album?: Record<number, SafariPhoto>;
}

export interface SafariPhoto {
  at: number;
  zone: SafariZoneId;
  shiny: boolean;
  form?: string;
  /** Tamanho em relação ao normal da espécie (0,8× a 1,2×) e o humor na hora do clique. */
  size: number;
  mood: SafariMood;
}

/** Nota da foto: shiny vale muito; tamanho fora do comum e um humor diferente valem um pouco. */
export const photoScore = (p: SafariPhoto) =>
  (p.shiny ? 100 : 0) + Math.round(Math.abs(p.size - 1) * 100) + (p.mood === 'watching' ? 0 : 5);

// --- Clima dentro da zona ------------------------------------------------------------------------

/** O clima da zona: a chuva traz Pokémon de água para a grama; a neblina deixa todos mais calmos. */
export function safariWeather(state: GameState): 'rain' | 'fog' | undefined {
  const w = state.env.weather;
  return w === 'rain' || w === 'fog' ? w : undefined;
}
const FOG_FLEE = 0.8;
const RAIN_WATER_WEIGHT = 0.5;

export interface SafariGuideRun {
  zone: SafariZoneId;
  startedAt: number;
  endsAt: number;
  seed: number;
  notified?: boolean;
}

export type SafariAction = 'ball' | 'bait' | 'berry' | 'rock' | 'mud' | 'block' | 'photo' | 'run';

const BASE_STEPS = 600;
const STEPS_PER_UPGRADE = 200;

export function safariProgress(state: GameState): SafariProgress {
  return (state.safariProgress ??= {
    points: 0,
    visits: 0,
    best: 0,
    shinies: 0,
    zoneCaught: {},
    zonesDone: [],
    upgrades: { steps: 0, goodRod: false, superRod: false },
    extraBalls: 0,
  });
}

export function safariUnlocked(state: GameState): boolean {
  return !!state.routes[BALANCE.safari.unlock]?.unlocked;
}

export const getZone = (id: SafariZoneId | undefined): SafariZone =>
  SAFARI_ZONES.find((z) => z.id === id) ?? SAFARI_ZONES[0];

export function zoneOpen(state: GameState, zone: SafariZone): boolean {
  return !!state.routes[zone.unlock]?.unlocked;
}

export const openZones = (state: GameState) => SAFARI_ZONES.filter((z) => zoneOpen(state, z));

const idCache = new Map<string, number>();
const sid = (slug: string) => {
  let id = idCache.get(slug);
  if (id === undefined) idCache.set(slug, (id = speciesId(slug)));
  return id;
};

/** Todas as espécies de uma zona (para a Pokédex do Safari). */
export function zoneSpecies(zone: SafariZone): number[] {
  return [...new Set([...zone.grass, ...zone.tall, ...zone.water].map(([slug]) => sid(slug)))];
}

/** Peso da espécie na zona (o menor entre os caminhos): quanto menor, mais rara. */
function rarityWeight(zone: SafariZone, id: number): number {
  const ws = [...zone.grass, ...zone.tall, ...zone.water].filter(([s]) => sid(s) === id).map(([, w]) => w);
  return ws.length ? Math.min(...ws) : 10;
}

/** Pontos de Safari por capturar: os raros valem mais. */
export function capturePoints(zone: SafariZone, id: number, shiny: boolean): number {
  const w = rarityWeight(zone, id);
  const base = w >= 10 ? 5 : w >= 6 ? 10 : w >= 4 ? 20 : w >= 2 ? 35 : 50;
  return base * (shiny ? 3 : 1);
}

// --- Surto da semana e pedidos do Guarda ------------------------------------------------------------

const WEEK_MS = 7 * 86_400_000;
export const safariWeek = (now: number) => Math.floor(now / WEEK_MS);

/** A espécie em surto nesta semana (aparece 5× mais e com shiny 3×), numa das zonas abertas. */
export function outbreakOf(state: GameState, now: number): { zone: SafariZoneId; speciesId: number } | undefined {
  const zones = openZones(state);
  if (!zones.length) return undefined;
  const rng = seededRng(safariWeek(now) * 7919 + 17);
  const zone = zones[Math.floor(rng.next() * zones.length)];
  const pool = [...zone.grass, ...zone.tall];
  return { zone: zone.id, speciesId: sid(pool[Math.floor(rng.next() * pool.length)][0]) };
}

/** Os 3 pedidos do Guarda desta semana (sorteados de novo quando a semana vira). */
export function safariRequests(state: GameState, now: number): SafariRequest[] {
  const prog = safariProgress(state);
  const week = safariWeek(now);
  if (prog.requests?.week === week) return prog.requests.list;
  const zones = openZones(state);
  const rng = seededRng(week * 104729 + 3);
  const list: SafariRequest[] = [];
  if (zones.length) {
    const z1 = zones[Math.floor(rng.next() * zones.length)];
    const [catchSlug] = z1.grass[Math.floor(rng.next() * z1.grass.length)];
    list.push({ id: `${week}-c`, kind: 'catch', speciesId: sid(catchSlug), target: 2, progress: 0, reward: 80, claimed: false });
    const z2 = zones[Math.floor(rng.next() * zones.length)];
    const [photoSlug] = z2.tall[Math.floor(rng.next() * z2.tall.length)];
    list.push({ id: `${week}-p`, kind: 'photo', speciesId: sid(photoSlug), target: 1, progress: 0, reward: 100, claimed: false });
    const z3 = zones[Math.floor(rng.next() * zones.length)];
    list.push({ id: `${week}-z`, kind: 'zone', zone: z3.id, target: 5, progress: 0, reward: 120, claimed: false });
  }
  prog.requests = { week, list };
  return list;
}

function progressRequests(state: GameState, kind: 'catch' | 'photo', id: number, zone: SafariZoneId, now: number): void {
  for (const r of safariRequests(state, now)) {
    if (r.claimed || r.progress >= r.target) continue;
    if ((r.kind === kind && r.speciesId === id) || (kind === 'catch' && r.kind === 'zone' && r.zone === zone)) r.progress++;
  }
}

/** Dica do Guarda desta semana: a berry favorita de uma espécie das zonas abertas. */
export function guardTip(state: GameState, now: number): { speciesId: number; berry: string; zone: SafariZoneId } | undefined {
  const zones = openZones(state);
  if (!zones.length) return undefined;
  const rng = seededRng(safariWeek(now) * 6151 + 29);
  const zone = zones[Math.floor(rng.next() * zones.length)];
  const pool = zoneSpecies(zone);
  const id = pool[Math.floor(rng.next() * pool.length)];
  return { speciesId: id, berry: favoriteBerry(id), zone: zone.id };
}

/** O jogador sabe qual é a berry favorita desta espécie (já a capturou, ou o Guarda contou nesta semana). */
export function knowsFavorite(state: GameState, id: number, now: number): boolean {
  return !!state.pokedex[id]?.caught || guardTip(state, now)?.speciesId === id;
}

export function claimSafariRequest(state: GameState, id: string, now: number): boolean {
  const r = safariRequests(state, now).find((x) => x.id === id);
  if (!r || r.claimed || r.progress < r.target) return false;
  r.claimed = true;
  safariProgress(state).points += r.reward;
  return true;
}

// --- Loja ----------------------------------------------------------------------------------------

export function safariShopBought(state: GameState, id: string): number {
  const u = safariProgress(state).upgrades;
  if (id === 'steps') return u.steps;
  if (id === 'good-rod') return u.goodRod ? 1 : 0;
  if (id === 'super-rod') return u.superRod ? 1 : 0;
  return 0;
}

/** Mega Stones que o jogador ainda não tem (nem na mochila, nem segurada por um Pokémon). */
export function missingMegaStones(state: GameState): string[] {
  const held = new Set(state.collection.map((p) => p.held));
  return MEGAS.map((m) => m.stone).filter((id) => !(state.items[id] > 0) && !held.has(id));
}

/** Por que um item da loja não pode ser comprado agora (fora o preço), ou undefined. */
export function safariShopBlocked(state: GameState, id: string): string | undefined {
  if (id === 'egg') {
    if (!activityUnlocked(state, 'daycare')) return 'Libere a Creche primeiro.';
    if (state.eggs.length >= nestSize(state)) return 'O ninho da Creche está cheio.';
  }
  if (id === 'mega' && !missingMegaStones(state).length) return 'Você já tem todas as Mega Stones.';
  return undefined;
}

export function buySafari(state: GameState, id: string): boolean {
  const entry = SAFARI_SHOP.find((e) => e.id === id);
  const prog = safariProgress(state);
  if (!entry || prog.points < entry.cost) return false;
  if (entry.max !== undefined && safariShopBought(state, id) >= entry.max) return false;
  if (safariShopBlocked(state, id)) return false;
  prog.points -= entry.cost;
  if (id === 'balls') prog.extraBalls += 10;
  else if (id === 'egg') giveGiftEgg(state, rngFrom(state), 'Loja do Safari');
  else if (id === 'mega') {
    const options = missingMegaStones(state);
    const stone = options[Math.floor(rngFrom(state).next() * options.length)];
    state.items[stone] = (state.items[stone] ?? 0) + 1;
  }
  else if (id === 'steps') prog.upgrades.steps++;
  else if (id === 'good-rod') prog.upgrades.goodRod = true;
  else if (id === 'super-rod') prog.upgrades.superRod = true;
  else if (entry.item) state.items[entry.item] = (state.items[entry.item] ?? 0) + (entry.qty ?? 1);
  return true;
}

// --- Visita --------------------------------------------------------------------------------------

/** A berry favorita de cada espécie (sempre a mesma). */
export function favoriteBerry(id: number): string {
  return BERRIES[(Math.imul(id, 2654435761) >>> 0) % BERRIES.length].id;
}

function spawn(state: GameState, path: SafariPath, rng: Rng, now: number, forced?: number): SafariEnemy {
  const s = state.safari!;
  const zone = getZone(s.zone);
  const prog = safariProgress(state);
  const outbreak = outbreakOf(state, now);
  const depth = depthOf(s.depth);
  const rodMult = prog.upgrades.superRod ? 4 : prog.upgrades.goodRod ? 2 : 1;
  const table = zone[path].map(([slug, w]) => {
    const id = sid(slug);
    // Mais fundo, os raros aparecem mais e os comuns menos.
    let weight = w * (w <= 4 ? depth.rare : w >= 10 ? depth.common : 1);
    if (path === 'water' && w <= 4) weight *= rodMult;
    if (outbreak?.zone === zone.id && outbreak.speciesId === id) weight *= 5;
    return { speciesId: id, weight };
  });
  if (path !== 'water' && safariWeather(state) === 'rain') {
    for (const [slug, w] of zone.water)
      if (!table.some((t) => t.speciesId === sid(slug))) table.push({ speciesId: sid(slug), weight: w * RAIN_WATER_WEIGHT });
  }
  // O surto também aparece na grama baixa da zona dele, mesmo se for da grama alta.
  if (path === 'grass' && outbreak?.zone === zone.id && !table.some((t) => t.speciesId === outbreak.speciesId))
    table.push({ speciesId: outbreak.speciesId, weight: 25 });
  // Um rastro seguido leva direto à espécie que o deixou.
  const id = forced ?? pickWeighted(rng, table).speciesId;
  dexEntry(state, id).seen = true;
  const shinyMult = computeModifiers(state).shiny * (outbreak?.speciesId === id ? 3 : 1) * depth.shiny;
  return {
    speciesId: id,
    level: Math.min(
      BALANCE.maxLevel,
      randInt(rng, zone.levels[0], zone.levels[1]) + (path === 'tall' ? 4 : 0) + depth.level,
    ),
    ivs: randomIvs(rng),
    shiny: rollShiny(rng, shinyMult),
    form: rollForm(id, rng, now),
    path,
    mood: 'watching',
    moodTurns: 0,
    depth: s.depth ?? 0,
    ...(forced !== undefined ? { tracked: true } : {}),
  };
}

/** Um rastro no chão: de preferência de uma espécie que ainda falta na Pokédex da zona (senão, um raro da grama alta). */
function rollTrack(state: GameState, rng: Rng): SafariState['track'] {
  const zone = getZone(state.safari!.zone);
  const have = safariProgress(state).zoneCaught[zone.id] ?? [];
  const land = (['grass', 'tall'] as SafariPath[]).flatMap((path) =>
    zone[path].map(([slug, weight]) => ({ speciesId: sid(slug), path, weight })),
  );
  const missing = land.filter((t) => !have.includes(t.speciesId));
  const pool = missing.length ? missing : land.filter((t) => t.path === 'tall');
  if (!pool.length) return undefined;
  const pick = pickWeighted(rng, pool);
  return { speciesId: pick.speciesId, path: pick.path };
}

export function startSafari(state: GameState, now: number, zoneId: SafariZoneId = 'plains'): boolean {
  const cfg = BALANCE.safari;
  const zone = getZone(zoneId);
  if (state.safari || !safariUnlocked(state) || !zoneOpen(state, zone) || state.coins < cfg.fee) return false;
  const prog = safariProgress(state);
  state.coins -= cfg.fee;
  state.safari = {
    zone: zone.id,
    balls: cfg.balls + prog.extraBalls,
    steps: BASE_STEPS + prog.upgrades.steps * STEPS_PER_UPGRADE,
    enemy: null,
    caught: [],
    points: 0,
    photos: [],
  };
  prog.extraBalls = 0;
  prog.visits++;
  safariRequests(state, now);
  return true;
}

/** Anda pelo caminho escolhido: gasta passos e encontra um Pokémon. */
export function safariWalk(state: GameState, path: SafariPath, now: number): GameEvent[] {
  const s = state.safari;
  const events: GameEvent[] = [];
  if (!s || s.enemy) return events;
  const cost = walkCost(s, path);
  const steps = s.steps ?? BASE_STEPS;
  if (steps < cost) return events;
  s.steps = steps - cost;
  // Quem vai por outro caminho deixa o rastro para trás.
  s.track = undefined;
  s.enemy = spawn(state, path, rngFrom(state), now);
  events.push({ type: 'safariResult', speciesId: s.enemy.speciesId, action: 'walk', outcome: 'appeared' });
  return events;
}

/** Segue o rastro achado no chão: gasta passos e encontra a espécie que o deixou. */
export function safariFollow(state: GameState, now: number): GameEvent[] {
  const s = state.safari;
  const events: GameEvent[] = [];
  if (!s || s.enemy || !s.track) return events;
  const steps = s.steps ?? BASE_STEPS;
  if (steps < TRACK_STEPS) return events;
  s.steps = steps - TRACK_STEPS;
  const { speciesId, path } = s.track;
  s.track = undefined;
  s.enemy = spawn(state, path, rngFrom(state), now, speciesId);
  events.push({ type: 'safariResult', speciesId, action: 'walk', outcome: 'appeared' });
  return events;
}

/** Entra uma camada mais fundo na zona (gasta passos). Devolve se entrou. */
export function safariDeeper(state: GameState): boolean {
  const s = state.safari;
  const depth = s?.depth ?? 0;
  if (!s || s.enemy || depth >= SAFARI_DEPTHS.length - 1) return false;
  const cost = SAFARI_DEPTHS[depth + 1].enter;
  const steps = s.steps ?? BASE_STEPS;
  if (steps < cost) return false;
  s.steps = steps - cost;
  s.depth = depth + 1;
  s.track = undefined;
  return true;
}

/** Volta para a borda da zona (de graça; para entrar de novo, paga outra vez). */
export function safariRetreat(state: GameState): boolean {
  const s = state.safari;
  if (!s || s.enemy || !s.depth) return false;
  s.depth = 0;
  s.track = undefined;
  return true;
}

const MOOD = {
  watching: { catch: 1, flee: 1 },
  eating: { catch: 0.8, flee: 0.45 },
  angry: { catch: 1.7, flee: 1.7 },
  muddy: { catch: 1.15, flee: 0.35 },
} as const;

export function safariCatchChance(state: GameState, enemy: SafariEnemy): number {
  const cfg = BALANCE.safari;
  const base = captureChance(getSpecies(enemy.speciesId).captureRate, 1, 1, 'safari-ball');
  const mood = enemy.mood ?? 'watching';
  const moodMult = mood === 'eating' && enemy.happy ? 1.3 : MOOD[mood].catch;
  // Saves de antes dos humores: isca e pedra acumuladas.
  const legacy = cfg.bait.catch ** (enemy.bait ?? 0) * cfg.rock.catch ** (enemy.rock ?? 0);
  const mult = moodMult * legacy * computeModifiers(state).capture * researchBonus(state, enemy.speciesId).capture;
  return Math.min(1, base * mult);
}

export function safariFleeChance(enemy: SafariEnemy, state?: GameState): number {
  const cfg = BALANCE.safari;
  const base = cfg.fleeBase + getSpecies(enemy.speciesId).baseStats.spe * cfg.fleePerSpeed;
  const legacy = cfg.bait.flee ** (enemy.bait ?? 0) * cfg.rock.flee ** (enemy.rock ?? 0);
  const fog = state && safariWeather(state) === 'fog' ? FOG_FLEE : 1;
  return Math.min(0.9, base * MOOD[enemy.mood ?? 'watching'].flee * legacy * depthOf(enemy.depth).flee * fog);
}

function setMood(enemy: SafariEnemy, mood: SafariMood, turns: number, happy = false): void {
  enemy.mood = mood;
  enemy.moodTurns = turns;
  enemy.happy = happy;
  enemy.bait = 0;
  enemy.rock = 0;
}

/** Uma ação do jogador. `item`: a berry usada como isca. Devolve os eventos (captura, fuga, fim da visita). */
export function safariAct(state: GameState, action: SafariAction, now: number, item?: string): GameEvent[] {
  const s = state.safari;
  const events: GameEvent[] = [];
  if (!s?.enemy) return events;
  const rng = rngFrom(state);
  const enemy = s.enemy;
  const zone = getZone(s.zone);
  let sizeRecord = false;
  const result = (outcome: Extract<GameEvent, { type: 'safariResult' }>['outcome']) =>
    events.push({
      type: 'safariResult',
      speciesId: enemy.speciesId,
      action,
      outcome,
      mood: enemy.mood,
      shiny: enemy.shiny,
      form: enemy.form,
      ...(action === 'berry' && item ? { item } : {}),
      ...(sizeRecord ? { sizeRecord } : {}),
    });

  if (action === 'run') {
    result('left');
    return next(state, events);
  }
  // Ação que não pode acontecer (foto repetida, item que acabou) não gasta nada, nem o humor.
  const has = (id: string) => (state.items[id] ?? 0) > 0;
  if (
    (action === 'photo' && enemy.photographed) ||
    (action === 'berry' && !(item && has(item))) ||
    (action === 'block' && !has('pokeblock')) ||
    (action === 'mud' && !has('safari-mud'))
  )
    return events;
  // O humor dura algumas ações.
  if (enemy.mood && enemy.mood !== 'watching') {
    enemy.moodTurns = (enemy.moodTurns ?? 1) - 1;
    if (enemy.moodTurns <= 0) setMood(enemy, 'watching', 0);
  }
  if (action === 'photo') {
    enemy.photographed = true;
    const album = (safariProgress(state).album ??= {});
    const shot: SafariPhoto = {
      at: now,
      zone: zone.id,
      shiny: enemy.shiny,
      ...(enemy.form ? { form: enemy.form } : {}),
      size: sizeMultiplier(enemy.ivs),
      mood: enemy.mood ?? 'watching',
    };
    const old = album[enemy.speciesId];
    if (!old || photoScore(shot) > photoScore(old)) album[enemy.speciesId] = shot;
    const photos = (s.photos ??= []);
    if (!photos.includes(enemy.speciesId)) {
      photos.push(enemy.speciesId);
      const pts = Math.max(2, Math.round(capturePoints(zone, enemy.speciesId, enemy.shiny) / 2));
      s.points = (s.points ?? 0) + pts;
      safariProgress(state).points += pts;
      state.research.points += Math.max(1, Math.round(pts / 5));
      progressRequests(state, 'photo', enemy.speciesId, zone.id, now);
    }
    result('photo');
  } else if (action === 'ball') {
    s.balls--;
    if (rng.next() < safariCatchChance(state, enemy)) {
      sizeRecord = catchIt(state, zone, enemy, now, events, `Safari · ${zone.name}`, true, depthPoints(enemy.depth));
      s.caught.push(enemy.speciesId);
      result('caught');
      return next(state, events);
    }
    result('missed');
  } else if (action === 'bait') {
    setMood(enemy, 'eating', randInt(rng, 1, 3));
  } else if (action === 'berry') {
    state.items[item!]--;
    const fav = favoriteBerry(enemy.speciesId) === item;
    setMood(enemy, 'eating', fav ? randInt(rng, 3, 5) : randInt(rng, 2, 3), fav);
  } else if (action === 'block') {
    state.items.pokeblock--;
    setMood(enemy, 'eating', randInt(rng, 2, 4), true);
  } else if (action === 'mud') {
    state.items['safari-mud']--;
    setMood(enemy, 'muddy', 2);
  } else {
    setMood(enemy, 'angry', randInt(rng, 1, 3));
  }
  if (action !== 'photo' && rng.next() < safariFleeChance(enemy, state)) {
    result('fled');
    return next(state, events);
  }
  if (action !== 'ball' && action !== 'photo') result('stayed');
  if (s.balls <= 0) end(state, events);
  return events;
}

/** Fim do encontro: volta a escolher o caminho (ou acaba, sem bolas ou passos). */
function next(state: GameState, events: GameEvent[]): GameEvent[] {
  const s = state.safari!;
  s.enemy = null;
  // Voltar à borda é de graça, então a visita só acaba quando nem a caminhada mais barata de lá cabe.
  const minStep = Math.min(...Object.values(SAFARI_PATHS).map((p) => p.steps));
  if (s.balls <= 0 || (s.steps ?? BASE_STEPS) < minStep) {
    end(state, events);
    return events;
  }
  // De vez em quando o Pokémon que saiu (ou outro) deixa um rastro no chão.
  const rng = rngFrom(state);
  s.track = rng.next() < TRACK_CHANCE ? rollTrack(state, rng) : undefined;
  return events;
}

function end(state: GameState, events: GameEvent[]): void {
  const s = state.safari;
  const prog = safariProgress(state);
  const caught = s?.caught.length ?? 0;
  const record = caught > prog.best;
  if (record) prog.best = caught;
  events.push({
    type: 'safariEnded',
    caught,
    points: s?.points ?? 0,
    record,
    species: s?.caught ?? [],
    zone: s?.zone ?? 'plains',
  });
  state.safari = null;
}

/** Desiste da visita (as bolas e os passos que sobraram se perdem). */
export function leaveSafari(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  if (state.safari) end(state, events);
  return events;
}

/** Tamanho de um Pokémon em relação ao normal da espécie (0,8× a 1,2×, quase sempre perto de 1), tirado dos IVs. */
export function sizeMultiplier(ivs: Ivs): number {
  const a = ((ivs.hp ^ ivs.def) & 31) / 31;
  const b = ((ivs.atk ^ ivs.spe) & 31) / 31;
  return 0.8 + 0.2 * (a + b);
}

/** Altura deste Pokémon em metros. */
export const pokemonMeters = (id: number, ivs: Ivs, form?: string) => heightMeters(id, form) * sizeMultiplier(ivs);

/** Registra a captura (Pokédex da zona, pontos, pedidos, recorde de tamanho). Devolve se bateu o recorde de tamanho. */
function catchIt(
  state: GameState,
  zone: SafariZone,
  enemy: SafariEnemy,
  now: number,
  events: GameEvent[],
  origin: string,
  /** Captura da sua visita (os pontos entram no resumo dela); o Guia passa false. */
  inVisit: boolean,
  pointsMult = 1,
): boolean {
  const s = inVisit ? state.safari : null;
  const prog = safariProgress(state);
  const isNew = !dexEntry(state, enemy.speciesId).caught;
  const p = addToCollection(state, enemy.speciesId, enemy.level, enemy.ivs, enemy.shiny, now, origin);
  if (enemy.form) p.form = enemy.form;
  p.ball = 'safari-ball';
  recordForm(state, enemy.speciesId, enemy.form);
  state.stats.totalCaptures++;
  state.stats.safariCaptures++;
  if (enemy.shiny) prog.shinies++;
  const pts = Math.round(capturePoints(zone, enemy.speciesId, enemy.shiny) * pointsMult);
  if (s) s.points = (s.points ?? 0) + pts;
  prog.points += pts;
  // Recorde de tamanho: o mais avantajado em relação à própria espécie.
  const mult = sizeMultiplier(enemy.ivs);
  const record = !prog.biggest || mult > prog.biggest.mult;
  if (record)
    prog.biggest = {
      speciesId: enemy.speciesId,
      meters: pokemonMeters(enemy.speciesId, enemy.ivs, enemy.form),
      mult,
      shiny: enemy.shiny,
    };
  // Pokédex da zona.
  const list = (prog.zoneCaught[zone.id] ??= []);
  if (!list.includes(enemy.speciesId)) list.push(enemy.speciesId);
  if (!prog.zonesDone.includes(zone.id) && zoneSpecies(zone).every((id) => list.includes(id))) {
    prog.zonesDone.push(zone.id);
    prog.points += SAFARI_ZONE_REWARD.points;
    state.coins += SAFARI_ZONE_REWARD.coins;
    events.push({ type: 'safariZoneComplete', zone: zone.id });
  }
  progressRequests(state, 'catch', enemy.speciesId, zone.id, now);
  progressMission(state, 'captures', 1, events);
  progressMission(state, 'capture-type', 1, events, getSpecies(enemy.speciesId).types);
  addResearch(state, enemy.speciesId, { night: state.env.period === 'night' ? 1 : 0 }, events);
  events.push({ type: 'captured', uid: p.uid, speciesId: p.speciesId, shiny: p.shiny, isNew });
  return record;
}

// --- Guia do Safari ------------------------------------------------------------------------------

export const guideDone = (run: SafariGuideRun, now: number) => now >= run.endsAt;

/** Manda o Guia para uma zona: paga a entrada e ele volta em algumas horas (vale com o jogo fechado). */
export function startSafariGuide(state: GameState, zoneId: SafariZoneId, now: number): boolean {
  const prog = safariProgress(state);
  const zone = getZone(zoneId);
  if (prog.guide || !safariUnlocked(state) || !zoneOpen(state, zone) || state.coins < SAFARI_GUIDE.fee) return false;
  state.coins -= SAFARI_GUIDE.fee;
  const seed = (rngFrom(state).next() * 2 ** 32) | 0;
  prog.guide = { zone: zone.id, startedAt: now, endsAt: now + SAFARI_GUIDE.hours * 3_600_000, seed };
  return true;
}

/** Recebe o que o Guia trouxe: de 1 a 3 Pokémon da zona (metade dos Pontos de Safari de uma captura sua). */
export function claimSafariGuide(state: GameState, now: number, events: GameEvent[] = []): number[] {
  const prog = safariProgress(state);
  const run = prog.guide;
  if (!run || !guideDone(run, now)) return [];
  prog.guide = undefined;
  const zone = getZone(run.zone);
  const rng = seededRng(run.seed);
  const count = 1 + (rng.next() < 0.55 ? 1 : 0) + (rng.next() < 0.2 ? 1 : 0);
  const caught: number[] = [];
  for (let i = 0; i < count; i++) {
    const path: SafariPath = rng.next() < 0.7 ? 'grass' : 'tall';
    const id = pickWeighted(rng, zone[path].map(([slug, weight]) => ({ id: sid(slug), weight }))).id;
    dexEntry(state, id).seen = true;
    const enemy: SafariEnemy = {
      speciesId: id,
      level: randInt(rng, zone.levels[0], zone.levels[1]) + (path === 'tall' ? 4 : 0),
      ivs: randomIvs(rng),
      shiny: rollShiny(rng, computeModifiers(state).shiny),
      form: rollForm(id, rng, now),
    };
    catchIt(state, zone, enemy, now, events, `Guia do Safari · ${zone.name}`, false, 0.5);
    caught.push(id);
  }
  events.push({ type: 'safariGuideBack', species: caught, zone: zone.id });
  return caught;
}

/** Avisa uma vez quando o Guia volta (chamado pelos cronômetros). */
export function safariGuideTimer(state: GameState, now: number, events: GameEvent[]): void {
  const run = state.safariProgress?.guide;
  if (run && !run.notified && guideDone(run, now)) {
    run.notified = true;
    events.push({ type: 'safariGuideReady' });
  }
}
