// Cabo Link: troca de Pokémon e duelo fantasma entre jogadores, sem servidor. Tudo passa por
// códigos de texto no mesmo formato do código de transferência (gzip + checksum):
//  - PKT1: um Pokémon enviado. Ele sai da coleção de quem envia e entra na de quem cola o código.
//    O mesmo código não entra duas vezes no mesmo save, e ninguém recebe o próprio Pokémon.
//  - PKG1: a equipe de batalha (ativo + reservas) de um jogador. Quem cola o código enfrenta essa
//    equipe numa batalha controlada pelo jogo, com os dois lados na mesma força.
// Algumas espécies evoluem ao chegar por troca, como nos jogos (Kadabra, Machoke, Haunter…).

import {
  BALANCE,
  NATURES,
  PLAYER_AVATARS,
  SPECIES,
  getSpecies,
  hasMove,
  hasSpecies,
  isHeldItem,
  speciesId as speciesBySlug,
  cleanOutfit,
  type PlayerAvatar,
  type TrainerOutfit,
} from '../game-data';
import { addToCollection, busyUids, findPokemon, routeDone } from './collection';
import type { GameEvent, GameState, TeamMember } from './game';
import { applyChallengePreset } from './presets';
import { evolutionBlocked, evolve, itemEvolution } from './progression';
import { abilitySlotOf, movesOf, statsOf, type PokemonInstance } from './pokemon';
import { healTeam, reservePokemon } from './team';
import { checksum, packCode, unpackCode } from './transfer';
import { recordEvolution } from './battle';
import { freshBattle } from './state';
import type { Evs, Ivs } from './stats';

export const TRADE_PREFIX = 'PKT1';
export const GHOST_PREFIX = 'PKG1';

/** O que viaja com um Pokémon trocado (sem uid: quem recebe dá um novo). */
export interface TradedPokemon {
  speciesId: number;
  level: number;
  exp: number;
  ivs: Ivs;
  shiny: boolean;
  nature?: string;
  evs?: Evs;
  vitaminEvs?: Evs;
  abilitySlot: 0 | 1 | 2;
  form?: string;
  gender?: 'm' | 'f';
  ball?: string;
  nickname?: string;
  moveset?: string[];
  eggMoves?: string[];
  held?: string;
  friendship?: number;
  caughtAt: number;
  caughtOn: string;
  /** Treinador original (quem capturou, mesmo depois de várias trocas). */
  ot: string;
}

/** Um Pokémon da equipe fantasma, já com a habilidade e os golpes resolvidos. */
export interface GhostMember {
  speciesId: number;
  level: number;
  ivs: Ivs;
  evs?: Evs;
  nature?: string;
  abilitySlot: 0 | 1 | 2;
  held?: string;
  moveset: string[];
  shiny: boolean;
  form?: string;
  gender?: 'm' | 'f';
  nickname?: string;
}

export interface LinkTrainer {
  name: string;
  avatar: PlayerAvatar;
  outfit?: TrainerOutfit;
  /** Identidade do save (não muda com o nome), para recusar os próprios códigos. */
  id: string;
}

interface PacketBase {
  v: 1;
  /** Identidade do código: o mesmo código não entra duas vezes. */
  id: string;
  from: LinkTrainer;
  at: number;
}

export interface TradePacket extends PacketBase {
  kind: 'trade';
  pokemon: TradedPokemon;
}

export interface GhostPacket extends PacketBase {
  kind: 'ghost';
  badges: number;
  team: GhostMember[];
}

export type LinkPacket = TradePacket | GhostPacket;

export interface SentTrade {
  id: string;
  at: number;
  code: string;
  pokemon: TradedPokemon;
}

export interface GhostRecord {
  id: string;
  /** Identidade do save de origem (uma equipe por jogador; um código novo atualiza a antiga). */
  trainerId: string;
  name: string;
  avatar: PlayerAvatar;
  outfit?: TrainerOutfit;
  badges: number;
  team: GhostMember[];
  /** Quando a equipe foi exportada e quando chegou aqui. */
  at: number;
  importedAt: number;
  wins: number;
  losses: number;
  /** Já pagou a recompensa da primeira vitória. */
  rewarded: boolean;
}

export interface LinkState {
  trainerId: string;
  /** Ids dos códigos já recebidos (trocas e equipes). */
  received: string[];
  /** Trocas enviadas: o código continua disponível para copiar de novo. */
  sent: SentTrade[];
  ghosts: GhostRecord[];
}

const MAX_SENT = 10;

// ---------------------------------------------------------------------------
// Estado e liberação

export function linkState(state: GameState): LinkState {
  if (!state.link) {
    state.link = {
      trainerId: checksum(`${state.createdAt}:${state.starterId}:${state.trainerName}`),
      received: [],
      sent: [],
      ghosts: [],
    };
  }
  return state.link;
}

export function linkUnlocked(state: GameState): boolean {
  return routeDone(state, BALANCE.link.unlock);
}

const badgeCount = (state: GameState) =>
  Object.entries(state.routes).filter(([, r]) => r.bossDefeated).length;

function trainerOf(state: GameState): LinkTrainer {
  return {
    name: state.trainerName,
    avatar: state.trainerAvatar,
    outfit: state.trainerOutfit,
    id: linkState(state).trainerId,
  };
}

const packetId = (state: GameState, now: number, salt: string) =>
  checksum(`${linkState(state).trainerId}:${now}:${salt}:${state.nextUid}`);

// ---------------------------------------------------------------------------
// Troca

/** Por que este Pokémon não pode ser enviado (null = pode). */
export function sendBlocker(state: GameState, uid: number): string | null {
  const p = findPokemon(state, uid);
  if (!p) return 'Pokémon não encontrado.';
  if (!linkUnlocked(state)) return 'O Cabo Link ainda não foi liberado.';
  if (uid === state.activeUid) return 'O ativo não pode ser trocado.';
  if (busyUids(state).has(uid)) return 'Tire-o da equipe, do apoio ou da atividade antes.';
  if (p.favorite) return 'Favoritos não podem ser trocados (tire a estrela antes).';
  if (state.challenge === 'nuzlocke') return 'Sem trocas durante o Nuzlocke.';
  return null;
}

export function tradedPokemon(state: GameState, p: PokemonInstance): TradedPokemon {
  return {
    speciesId: p.speciesId,
    level: p.level,
    exp: p.exp,
    ivs: { ...p.ivs },
    shiny: p.shiny,
    nature: p.nature,
    evs: p.evs && { ...p.evs },
    vitaminEvs: p.vitaminEvs && { ...p.vitaminEvs },
    abilitySlot: abilitySlotOf(p),
    form: p.form,
    gender: p.gender,
    ball: p.ball,
    nickname: p.nickname,
    moveset: p.moveset && [...p.moveset],
    eggMoves: p.eggMoves && [...p.eggMoves],
    held: p.held,
    friendship: p.friendship,
    caughtAt: p.caughtAt,
    caughtOn: p.caughtOn,
    ot: p.ot ?? state.trainerName,
  };
}

/** Monta o pacote da troca (sem mexer no jogo); `commitSend` tira o Pokémon depois. */
export function tradePacket(state: GameState, uid: number, now: number): TradePacket | null {
  const p = findPokemon(state, uid);
  if (!p || sendBlocker(state, uid)) return null;
  return {
    v: 1,
    kind: 'trade',
    id: packetId(state, now, `t${uid}`),
    from: trainerOf(state),
    at: now,
    pokemon: tradedPokemon(state, p),
  };
}

export function ghostPacket(state: GameState, now: number): GhostPacket {
  const team = [findPokemon(state, state.activeUid)!, ...reservePokemon(state)].map(ghostMember);
  return {
    v: 1,
    kind: 'ghost',
    id: packetId(state, now, `g${team.map((m) => m.speciesId).join('-')}`),
    from: trainerOf(state),
    at: now,
    badges: badgeCount(state),
    team,
  };
}

function ghostMember(p: PokemonInstance): GhostMember {
  return {
    speciesId: p.speciesId,
    level: p.level,
    ivs: { ...p.ivs },
    evs: p.evs && { ...p.evs },
    nature: p.nature,
    abilitySlot: abilitySlotOf(p),
    held: p.held,
    moveset: movesOf(p),
    shiny: p.shiny,
    form: p.form,
    gender: p.gender,
    nickname: p.nickname,
  };
}

const prefixOf = (packet: LinkPacket) => (packet.kind === 'trade' ? TRADE_PREFIX : GHOST_PREFIX);

export function encodeLinkCode(packet: LinkPacket): Promise<string> {
  return packCode(prefixOf(packet), JSON.stringify(packet));
}

/** Tira o Pokémon da coleção e guarda o código enviado. Falha se ele não puder mais ir. */
export function commitSend(state: GameState, uid: number, packet: TradePacket, code: string): boolean {
  if (sendBlocker(state, uid)) return false;
  const p = findPokemon(state, uid)!;
  removeFromGame(state, uid);
  const link = linkState(state);
  link.sent = [{ id: packet.id, at: packet.at, code, pokemon: tradedPokemon(state, p) }, ...link.sent].slice(
    0,
    MAX_SENT,
  );
  state.stats.tradesSent++;
  return true;
}

/** Tira o Pokémon de todo lugar que guarda uids (o item segurado vai com ele). */
function removeFromGame(state: GameState, uid: number): void {
  state.collection = state.collection.filter((x) => x.uid !== uid);
  state.battleTeam = state.battleTeam.filter((x) => x !== uid);
  if (state.companion?.uid === uid) state.companion = null;
  for (const preset of state.presets ?? []) {
    preset.reserves = preset.reserves.filter((x) => x !== uid);
    delete preset.held[uid];
  }
}

/**
 * Desfaz um envio: o Pokémon volta. Só faz sentido se o amigo ainda não colou o código —
 * o jogo não tem como saber, então a interface avisa antes.
 */
export function cancelSend(state: GameState, id: string, now: number): PokemonInstance | null {
  const link = linkState(state);
  const sent = link.sent.find((s) => s.id === id);
  if (!sent) return null;
  link.sent = link.sent.filter((s) => s.id !== id);
  link.received.push(id);
  state.stats.tradesSent = Math.max(0, state.stats.tradesSent - 1);
  return materialize(state, sent.pokemon, now, sent.pokemon.caughtOn, sent.pokemon.caughtAt);
}

/** Cria o Pokémon recebido na coleção, com uid novo. */
function materialize(
  state: GameState,
  t: TradedPokemon,
  now: number,
  caughtOn: string,
  caughtAt: number,
): PokemonInstance {
  const p = addToCollection(state, t.speciesId, t.level, { ...t.ivs }, t.shiny, now, caughtOn);
  p.exp = Math.max(p.exp, t.exp);
  p.caughtAt = caughtAt;
  p.nature = t.nature ?? p.nature;
  p.abilitySlot = t.abilitySlot;
  if (t.evs) p.evs = { ...t.evs };
  if (t.vitaminEvs) p.vitaminEvs = { ...t.vitaminEvs };
  if (t.form) p.form = t.form;
  if (t.gender) p.gender = t.gender;
  if (t.ball) p.ball = t.ball;
  if (t.nickname) p.nickname = t.nickname;
  if (t.moveset?.length) p.moveset = [...t.moveset];
  if (t.eggMoves?.length) p.eggMoves = [...t.eggMoves];
  if (t.held) p.held = t.held;
  if (t.friendship !== undefined) p.friendship = t.friendship;
  if (t.ot !== state.trainerName) p.ot = t.ot;
  p.currentHp = statsOf(p).hp;
  return p;
}

/** Evoluem ao chegar por troca (nos dados, viraram evolução no nível 38). */
const TRADE_EVOLVERS = new Set(
  [
    'kadabra',
    'machoke',
    'graveler',
    'haunter',
    'boldore',
    'gurdurr',
    'karrablast',
    'shelmet',
    'phantump',
    'pumpkaboo',
  ]
    .filter((slug) => SPECIES.some((s) => s.slug === slug))
    .map(speciesBySlug),
);

/** Itens que, segurados durante a troca, fazem evoluir (Onix + Revestimento Metálico…). */
const TRADE_ITEMS = new Set([
  'kings-rock',
  'metal-coat',
  'dragon-scale',
  'up-grade',
  'dubious-disc',
  'protector',
  'electirizer',
  'magmarizer',
  'reaper-cloth',
  'deep-sea-tooth',
  'deep-sea-scale',
  'prism-scale',
  'sachet',
  'whipped-dream',
]);

/** Evolução que a troca dispara (undefined = nenhuma). Devolve também se gasta o item. */
export function tradeEvolution(p: PokemonInstance): { to: number; usesItem: boolean } | undefined {
  if (evolutionBlocked(p)) return undefined;
  if (p.held && TRADE_ITEMS.has(p.held)) {
    const to = itemEvolution(p, p.held);
    if (to) return { to, usesItem: true };
  }
  if (!TRADE_EVOLVERS.has(p.speciesId)) return undefined;
  const evo = getSpecies(p.speciesId).evolutions.find((e) => e.trigger === 'level');
  return evo ? { to: evo.to, usesItem: false } : undefined;
}

export type ReceiveResult = { ok: true; uid: number; evolvedTo?: number } | { ok: false; error: string };

export function receiveTrade(
  state: GameState,
  packet: TradePacket,
  now: number,
  events: GameEvent[] = [],
): ReceiveResult {
  const link = linkState(state);
  if (!linkUnlocked(state)) return { ok: false, error: 'O Cabo Link ainda não foi liberado.' };
  if (state.challenge === 'nuzlocke') return { ok: false, error: 'Sem trocas durante o Nuzlocke.' };
  if (packet.from.id === link.trainerId) {
    return { ok: false, error: 'Este Pokémon saiu deste jogo. Para trazê-lo de volta, cancele o envio.' };
  }
  if (link.received.includes(packet.id)) return { ok: false, error: 'Este código já foi recebido.' };
  const p = materialize(state, packet.pokemon, now, `Troca com ${packet.from.name}`, now);
  link.received = [...link.received, packet.id].slice(-BALANCE.link.rememberCodes);
  state.stats.tradesReceived++;
  const arrived = p.speciesId;
  const evo = tradeEvolution(p);
  let evolvedTo: number | undefined;
  if (evo) {
    if (evo.usesItem) p.held = undefined;
    if (state.settings.autoEvolve) {
      evolve(p, evo.to);
      recordEvolution(state, evo.to, p.shiny, events);
      evolvedTo = evo.to;
    } else p.pendingEvolution = evo.to;
  }
  events.push({ type: 'tradeReceived', uid: p.uid, speciesId: arrived, from: packet.from.name, evolvedTo });
  return { ok: true, uid: p.uid, evolvedTo };
}

// ---------------------------------------------------------------------------
// Leitura e validação dos códigos

export async function decodeLinkCode(
  text: string,
): Promise<{ ok: true; packet: LinkPacket } | { ok: false; error: string }> {
  const clean = text.replace(/\s+/g, '');
  const prefix = clean.startsWith(`${GHOST_PREFIX}.`) ? GHOST_PREFIX : TRADE_PREFIX;
  if (clean.startsWith('PKI1.')) {
    return { ok: false, error: 'Este é um código de save (use Treinador > Salvar e transferir).' };
  }
  const out = await unpackCode(prefix, clean);
  if (!out.ok) return out;
  let data: unknown;
  try {
    data = JSON.parse(out.json);
  } catch {
    return { ok: false, error: 'código inválido' };
  }
  const packet = parsePacket(data);
  return packet ? { ok: true, packet } : { ok: false, error: 'código com dados inválidos' };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
const isStr = (v: unknown, max = 40): v is string => typeof v === 'string' && v.length > 0 && v.length <= max;
const STAT_KEYS = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'spe'] as const;

function parseIvs(v: unknown): Ivs | null {
  if (!isObj(v) || !STAT_KEYS.every((k) => isInt(v[k], 0, 31))) return null;
  return Object.fromEntries(STAT_KEYS.map((k) => [k, v[k]])) as unknown as Ivs;
}

function parseEvs(v: unknown, cap = 252): Evs | undefined | null {
  if (v === undefined) return undefined;
  if (!isObj(v)) return null;
  const out: Evs = {};
  let total = 0;
  for (const [k, n] of Object.entries(v)) {
    if (!(STAT_KEYS as readonly string[]).includes(k) || !isInt(n, 0, cap)) return null;
    out[k as (typeof STAT_KEYS)[number]] = n;
    total += n;
  }
  return total <= 510 ? out : null;
}

/** Golpes que a linha evolutiva aprende de algum jeito (nível, TM, ovo). */
function possibleMoves(speciesId: number): Set<string> {
  const out = new Set<string>();
  const line = [speciesId];
  for (let id = speciesId, guard = 0; guard < 4; guard++) {
    const pre = SPECIES.find((s) => s.evolutions.some((e) => e.to === id));
    if (!pre) break;
    line.push(pre.id);
    id = pre.id;
  }
  for (const id of line) {
    const s = getSpecies(id);
    for (const e of s.learnset) out.add(e.move);
    for (const m of [...s.tmMoves, ...s.eggMoves]) out.add(m);
  }
  return out;
}

function parseMoves(v: unknown, speciesId: number): string[] | undefined | null {
  if (v === undefined) return undefined;
  if (!Array.isArray(v) || v.length > BALANCE.maxMoves) return null;
  const allowed = possibleMoves(speciesId);
  return v.every((m) => typeof m === 'string' && hasMove(m) && allowed.has(m))
    ? [...new Set(v as string[])]
    : null;
}

/** Campos comuns a trocas e equipes; null se algo estiver fora do lugar. */
function parseCommon(v: Record<string, unknown>) {
  if (!isInt(v.speciesId, 1, 100_000) || !hasSpecies(v.speciesId)) return null;
  if (!isInt(v.level, 1, BALANCE.maxLevel)) return null;
  const ivs = parseIvs(v.ivs);
  const evs = parseEvs(v.evs);
  if (!ivs || evs === null) return null;
  if (v.nature !== undefined && !NATURES.some((n) => n.id === v.nature)) return null;
  if (!isInt(v.abilitySlot, 0, 2)) return null;
  if (v.held !== undefined && !(typeof v.held === 'string' && isHeldItem(v.held))) return null;
  if (v.gender !== undefined && v.gender !== 'm' && v.gender !== 'f') return null;
  if (v.form !== undefined && !isStr(v.form, 20)) return null;
  if (v.nickname !== undefined && !isStr(v.nickname, 12)) return null;
  const moveset = parseMoves(v.moveset, v.speciesId);
  if (moveset === null) return null;
  return {
    speciesId: v.speciesId,
    level: v.level,
    ivs,
    evs,
    nature: v.nature as string | undefined,
    abilitySlot: v.abilitySlot as 0 | 1 | 2,
    held: v.held as string | undefined,
    gender: v.gender as 'm' | 'f' | undefined,
    form: v.form as string | undefined,
    nickname: v.nickname as string | undefined,
    moveset,
    shiny: v.shiny === true,
  };
}

function parseTraded(v: unknown): TradedPokemon | null {
  if (!isObj(v)) return null;
  const c = parseCommon(v);
  if (!c) return null;
  const vitaminEvs = parseEvs(v.vitaminEvs, 100);
  const eggMoves = parseMoves(v.eggMoves, c.speciesId);
  if (vitaminEvs === null || eggMoves === null) return null;
  if (!isInt(v.exp, 0, 2_000_000) || !isStr(v.caughtOn, 60) || !isStr(v.ot, 12)) return null;
  if (typeof v.caughtAt !== 'number' || !Number.isFinite(v.caughtAt)) return null;
  if (v.ball !== undefined && !isStr(v.ball, 30)) return null;
  if (v.friendship !== undefined && !isInt(v.friendship, 0, 255)) return null;
  return {
    ...c,
    exp: v.exp,
    vitaminEvs,
    eggMoves,
    caughtAt: v.caughtAt,
    caughtOn: v.caughtOn,
    ot: v.ot,
    ball: v.ball as string | undefined,
    friendship: v.friendship as number | undefined,
  };
}

function parseGhostMember(v: unknown): GhostMember | null {
  if (!isObj(v)) return null;
  const c = parseCommon(v);
  if (!c || !c.moveset?.length) return null;
  return { ...c, moveset: c.moveset };
}

function parseTrainer(v: unknown): LinkTrainer | null {
  if (!isObj(v) || !isStr(v.name, 12) || !isStr(v.id, 16)) return null;
  const avatar = PLAYER_AVATARS.includes(v.avatar as PlayerAvatar) ? (v.avatar as PlayerAvatar) : 'red';
  return { name: v.name, avatar, outfit: cleanOutfit(avatar, v.outfit), id: v.id };
}

export function parsePacket(v: unknown): LinkPacket | null {
  if (!isObj(v) || v.v !== 1 || !isStr(v.id, 16) || typeof v.at !== 'number') return null;
  const from = parseTrainer(v.from);
  if (!from) return null;
  const base = { v: 1 as const, id: v.id, from, at: v.at };
  if (v.kind === 'trade') {
    const pokemon = parseTraded(v.pokemon);
    return pokemon ? { ...base, kind: 'trade', pokemon } : null;
  }
  if (v.kind === 'ghost') {
    if (!Array.isArray(v.team) || !v.team.length || v.team.length > 6) return null;
    const team = v.team.map(parseGhostMember);
    if (team.some((m) => !m)) return null;
    return {
      ...base,
      kind: 'ghost',
      badges: isInt(v.badges, 0, 999) ? v.badges : 0,
      team: team as GhostMember[],
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Duelo fantasma

/** Guarda a equipe recebida. Um código novo do mesmo jogador atualiza a equipe (o placar fica). */
export function importGhost(
  state: GameState,
  packet: GhostPacket,
  now: number,
): { ok: true; id: string } | { ok: false; error: string } {
  const link = linkState(state);
  if (!linkUnlocked(state)) return { ok: false, error: 'O Cabo Link ainda não foi liberado.' };
  if (packet.from.id === link.trainerId) return { ok: false, error: 'Esta é a sua própria equipe.' };
  const old = link.ghosts.find((g) => g.trainerId === packet.from.id);
  if (old && old.at >= packet.at) return { ok: false, error: 'Você já tem esta equipe (ou uma mais nova).' };
  if (!old && link.ghosts.length >= BALANCE.link.maxGhosts) {
    return { ok: false, error: `Limite de ${BALANCE.link.maxGhosts} equipes: apague uma antes.` };
  }
  const record: GhostRecord = {
    id: packet.id,
    trainerId: packet.from.id,
    name: packet.from.name,
    avatar: packet.from.avatar,
    outfit: packet.from.outfit,
    badges: packet.badges,
    team: packet.team,
    at: packet.at,
    importedAt: now,
    wins: old?.wins ?? 0,
    losses: old?.losses ?? 0,
    rewarded: false,
  };
  link.ghosts = old ? link.ghosts.map((g) => (g === old ? record : g)) : [...link.ghosts, record];
  return { ok: true, id: record.id };
}

export function deleteGhost(state: GameState, id: string): void {
  const link = linkState(state);
  link.ghosts = link.ghosts.filter((g) => g.id !== id);
}

/** "1 insígnia", "3 insígnias". */
export const badgesText = (n: number) => `${n} ${n === 1 ? 'insígnia' : 'insígnias'}`;

const ghostById = (state: GameState, id: string | undefined) => state.link?.ghosts.find((g) => g.id === id);

export const ghostAverageLevel = (g: GhostRecord) =>
  Math.round(g.team.reduce((sum, m) => sum + m.level, 0) / Math.max(1, g.team.length));

/** Moedas da primeira vitória contra a equipe. */
export const ghostReward = (g: GhostRecord) =>
  g.rewarded ? 0 : ghostAverageLevel(g) * BALANCE.link.firstWinCoinsPerLevel;

function ghostTeam(g: GhostRecord): TeamMember[] {
  return g.team.map((m) => ({
    speciesId: m.speciesId,
    level: m.level,
    held: m.held,
    abilitySlot: m.abilitySlot,
    ivs: { ...m.ivs },
    evs: m.evs && { ...m.evs },
    nature: m.nature,
    moveset: [...m.moveset],
    shiny: m.shiny,
    form: m.form,
    gender: m.gender,
    nickname: m.nickname,
  }));
}

export function challengeGhost(state: GameState, id: string): boolean {
  const g = ghostById(state, id);
  if (!g || !linkUnlocked(state) || state.battle.kind !== 'wild') return false;
  applyChallengePreset(state, 'ghost');
  healTeam(state);
  state.battle = {
    ...freshBattle(state.currentRouteId),
    kind: 'ghost',
    team: ghostTeam(g),
    ghostId: g.id,
    trainer: {
      sprite: g.avatar,
      outfit: g.outfit,
      name: g.name,
      title: `Duelo fantasma · ${badgesText(g.badges)}`,
    },
  };
  return true;
}

/** Venceu a equipe inteira: placar, recompensa da primeira vitória e volta para a rota. */
export function ghostWon(state: GameState, events: GameEvent[]): void {
  const b = state.battle;
  const g = ghostById(state, b.ghostId);
  let coins = 0;
  if (g) {
    coins = ghostReward(g);
    g.wins++;
    g.rewarded = true;
  }
  state.coins += coins;
  state.stats.coinsEarned += coins;
  state.stats.ghostWins++;
  events.push({ type: 'ghostDuelEnded', name: g?.name ?? b.trainer?.name ?? '', won: true, coins });
  healTeam(state);
  state.battle = { ...freshBattle(b.routeId), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
}

/** Perdeu (ou desistiu): conta a derrota. Quem chama devolve a batalha para a rota. */
export function ghostLost(state: GameState, events: GameEvent[]): void {
  const b = state.battle;
  const g = ghostById(state, b.ghostId);
  if (g) g.losses++;
  events.push({ type: 'ghostDuelEnded', name: g?.name ?? b.trainer?.name ?? '', won: false, coins: 0 });
}
