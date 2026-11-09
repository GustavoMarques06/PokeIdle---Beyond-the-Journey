// Salvamento local versionado, com backup e migrações explícitas.

import {
  NO_SUPPORT,
  PLAYER_AVATARS,
  ROUTES,
  SUPPORT_MOVES,
  TEAM_SIZE,
  cleanOutfit,
  getLure,
  hasMove,
  hasSpecies,
  isHeldItem,
  lineRoot,
} from '../game-data';
import { isTagId } from './boxes';
import { emptyDaycare } from './daycare';
import { emptyNuzlocke } from './nuzlocke';
import { environmentAt } from './env';
import { DEFAULT_SETTINGS, EMPTY_STATS, freshBattle, type GameState } from './game';
import { emptyHunt } from './hunt';
import { emptyLegends } from './legendary';
import { emptyMissions } from './missions';
import { isWallpaper } from './pc';
import { natureFor } from './pokemon';
import type { Ivs } from './stats';
import { emptyTower } from './tower';
import { addResearch } from './dexresearch';
import { giveForm, recordForm } from './forms';
import { seededRng } from './rng';
import { emptyTournament } from './tournament';
import { setAutomation } from './automation';
import { PRESET_USES, type TeamSnapshot } from './presets';
import { emptyTraining } from './training';

export const SAVE_FORMAT_VERSION = 6;
export const GAME_VERSION = '0.9.0';
export const SAVE_KEY = 'pokeidle.save';
export const BACKUP_KEY = 'pokeidle.save.backup';

export interface SaveMetadata {
  formatVersion: number;
  gameVersion: string;
  savedAt: number;
}

export interface SaveFile {
  meta: SaveMetadata;
  state: GameState;
}

/** Interface mínima de armazenamento (localStorage no navegador, mapa em memória nos testes). */
export interface SaveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type Migration = (file: { meta: SaveMetadata; state: Record<string, unknown> }) => void;

/** `MIGRATIONS[n]` converte um save da versão n para n + 1. */
const MIGRATIONS: Record<number, Migration> = {
  // 0.1 → 0.2: equipe passiva, pesquisa, maestria, conquistas, prestígio e áudio.
  1: ({ state }) => {
    const routes = (state.routes ?? {}) as Record<string, { bossDefeated?: boolean }>;
    const stats = (state.stats ?? {}) as Record<string, number>;
    state.passives = [];
    state.research = { points: 0, levels: {} };
    state.mastery = {};
    state.achievements = [];
    state.prestige = { points: 0, totalEarned: 0, count: 0, levels: {} };
    state.stats = {
      ...stats,
      evolutions: 0,
      bossWins: Object.values(routes).filter((r) => r.bossDefeated).length,
    };
    state.settings = { ...DEFAULT_SETTINGS, ...(state.settings as object) };
  },
  // 0.2 → 0.3: iniciais das Gerações VI–IX saíram do jogo; viram o inicial de Kanto do
  // mesmo tipo e estágio, mantendo nível, IVs e shiny.
  2: ({ state }) => {
    const collection = (state.collection ?? []) as { speciesId: number; pendingEvolution?: number }[];
    for (const p of collection) {
      p.speciesId = REMOVED_STARTERS[p.speciesId] ?? p.speciesId;
      if (p.pendingEvolution) p.pendingEvolution = REMOVED_STARTERS[p.pendingEvolution] ?? p.pendingEvolution;
    }
    const dex = (state.pokedex ?? {}) as Record<
      number,
      { seen: boolean; caught: boolean; shinyCaught: boolean }
    >;
    for (const [id, entry] of Object.entries(dex)) {
      const to = REMOVED_STARTERS[Number(id)];
      if (to === undefined) continue;
      const target = (dex[to] ??= { seen: false, caught: false, shinyCaught: false });
      target.seen ||= entry.seen;
      target.caught ||= entry.caught;
      target.shinyCaught ||= entry.shinyCaught;
      delete dex[Number(id)];
    }
    const mastery = (state.mastery ?? {}) as Record<number, number>;
    for (const [id, wins] of Object.entries(mastery)) {
      const to = REMOVED_STARTERS[Number(id)];
      if (to === undefined) continue;
      mastery[to] = (mastery[to] ?? 0) + wins;
      delete mastery[Number(id)];
    }
  },
  // 0.3 → 0.4: atividades (creche, expedições, jardim, fósseis, Torre, Game Corner),
  // missões, TMs, rival e cinco regiões. Rotas antigas de Kanto mantêm o mesmo id.
  3: ({ state, meta }) => {
    const collection = (state.collection ?? []) as { uid: number; speciesId: number }[];
    const first = collection.find((p) => p.uid === 1) ?? collection[0];
    state.starterId = first ? lineRoot(first.speciesId) : 1;
    state.lastTimerAt = meta.savedAt;
    const battle = state.battle as Record<string, unknown> | undefined;
    if (battle) battle.team = [];
  },
  // Formato 4 → 5 (jogo 0.4): naturezas, reservas da equipe de batalha, desafios e histórico.
  4: ({ state }) => {
    const collection = (state.collection ?? []) as { uid: number; ivs: Ivs; nature?: string }[];
    for (const p of collection) p.nature ??= natureFor(p.uid, p.ivs);
    state.battleTeam = [];
    state.challenge = null;
    state.challengesWon = [];
    state.history = [];
  },
  // Formato 5 → 6 (jogo 0.5): treino, raides, revanches, itens seguráveis e amizade.
  // Os campos novos dos Pokémon são opcionais e os do estado são criados em `normalize`.
  5: () => {},
};

/** Linhas iniciais removidas (Gen VI–IX) → espécie de Kanto equivalente (planta 1, fogo 4, água 7). */
const REMOVED_STARTERS: Record<number, number> = Object.fromEntries(
  (
    [
      [650, 1],
      [653, 4],
      [656, 7],
      [722, 1],
      [725, 4],
      [728, 7],
      [810, 1],
      [813, 4],
      [816, 7],
      [906, 1],
      [909, 4],
      [912, 7],
    ] as const
  ).flatMap(([from, to]) => [0, 1, 2].map((stage) => [from + stage, to + stage])),
);

export function serialize(state: GameState, now: number): string {
  const file: SaveFile = {
    meta: { formatVersion: SAVE_FORMAT_VERSION, gameVersion: GAME_VERSION, savedAt: now },
    state,
  };
  return JSON.stringify(file);
}

export type ParseResult = { ok: true; file: SaveFile } | { ok: false; error: string };

export function parseSave(raw: string | null): ParseResult {
  if (!raw) return { ok: false, error: 'vazio' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON inválido' };
  }
  if (!isObject(data) || !isObject(data.meta) || !isObject(data.state)) {
    return { ok: false, error: 'estrutura inválida' };
  }
  const file = data as unknown as { meta: SaveMetadata; state: Record<string, unknown> };
  if (typeof file.meta.formatVersion !== 'number' || file.meta.formatVersion > SAVE_FORMAT_VERSION) {
    return { ok: false, error: `versão de save não suportada (${String(file.meta.formatVersion)})` };
  }
  for (let v = file.meta.formatVersion; v < SAVE_FORMAT_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, error: `sem migração da versão ${v}` };
    migrate(file);
    file.meta.formatVersion = v + 1;
  }
  repairCoins(file.state);
  const error = validateState(file.state);
  if (error) return { ok: false, error };
  const state = file.state as unknown as GameState;
  normalize(state);
  return { ok: true, file: { meta: file.meta, state } };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Até a 0.5.0, chefes com itens ou MT na recompensa davam `undefined` moedas e o dinheiro virava
 * NaN (gravado como null). O valor real se perdeu: devolve as moedas dos chefes já vencidos.
 */
function repairCoins(s: Record<string, unknown>): void {
  if (s.coins !== null) return;
  const routes = isObject(s.routes) ? s.routes : {};
  const beaten = (id: string) => isObject(routes[id]) && routes[id].bossDefeated === true;
  const coins = ROUTES.filter((r) => r.boss && beaten(r.id)).reduce(
    (sum, r) => sum + r.boss!.reward.coins,
    0,
  );
  s.coins = coins;
  if (isObject(s.stats) && !isNum(s.stats.coinsEarned)) s.stats.coinsEarned = coins;
}

function validateState(s: Record<string, unknown>): string | null {
  if (!isNum(s.coins) || s.coins < 0) return 'moedas inválidas';
  if (!isNum(s.rngSeed) || !isNum(s.nextUid) || !isNum(s.activeUid)) return 'campos numéricos ausentes';
  if (!Array.isArray(s.collection) || s.collection.length === 0) return 'coleção vazia';
  for (const p of s.collection) {
    if (!isObject(p) || !isNum(p.uid) || !isNum(p.speciesId) || !isNum(p.level) || !isNum(p.exp)) {
      return 'Pokémon inválido na coleção';
    }
    if (!hasSpecies(p.speciesId)) return `espécie desconhecida no save: ${p.speciesId}`;
  }
  if (!isObject(s.routes) || !isObject(s.items) || !isObject(s.settings)) return 'progresso inválido';
  if (typeof s.currentRouteId !== 'string') return 'rota atual inválida';
  return null;
}

/** Corrige referências que podem ficar inconsistentes entre versões do conteúdo. */
function normalize(state: GameState): void {
  for (const [i, r] of ROUTES.entries()) {
    state.routes[r.id] ??= { unlocked: i === 0, kills: 0, bossDefeated: false };
  }
  // Região nova no fim do mundo (Kalos): quem já venceu o último Campeão segue em frente.
  for (let i = 1; i < ROUTES.length; i++) {
    const prev = ROUTES[i - 1];
    const prevProg = state.routes[prev.id];
    const done = prev.boss
      ? prevProg.bossDefeated
      : prevProg.unlocked && prevProg.kills >= prev.killsRequired;
    if (done && prev.boss?.champion) state.routes[ROUTES[i].id].unlocked = true;
  }
  if (!state.routes[state.currentRouteId]?.unlocked) state.currentRouteId = ROUTES[0].id;
  if (!state.collection.some((p) => p.uid === state.activeUid)) state.activeUid = state.collection[0].uid;
  state.trainerName ??= 'Treinador';
  if (!PLAYER_AVATARS.includes(state.trainerAvatar)) state.trainerAvatar = 'red';
  state.trainerOutfit = cleanOutfit(state.trainerAvatar, state.trainerOutfit);
  state.pokedex ??= {};
  state.upgrades ??= [];
  state.settings = { ...DEFAULT_SETTINGS, ...state.settings };
  // O modo Qualidade (3D) saiu do jogo: quem o tinha escolhido volta para Normal.
  if (state.settings.graphics !== 'performance') state.settings.graphics = 'normal';
  state.research ??= { points: 0, levels: {} };
  state.mastery ??= {};
  state.achievements ??= [];
  state.prestige ??= { points: 0, totalEarned: 0, count: 0, levels: {} };
  state.stats = { ...EMPTY_STATS, ...state.stats };
  state.starterId ??= lineRoot(state.collection[0].speciesId);
  state.tokens ??= 0;
  state.tms ??= [];
  state.env ??= environmentAt(Date.now());
  state.lastTimerAt ??= Date.now();
  state.flags ??= [];
  state.buffs ??= {};
  state.daycare ??= emptyDaycare();
  state.eggs ??= [];
  state.expeditions ??= [];
  state.garden ??= [];
  state.fossils ??= [];
  state.hunt = { ...emptyHunt(), ...state.hunt };
  state.missions ??= emptyMissions();
  state.dexClaimed ??= [];
  state.roamer ??= null;
  state.nextRoamerAt ??= 0;
  state.roamersCaught ??= [];
  state.legends = { ...emptyLegends(), ...state.legends };
  state.rocket ??= null;
  state.nextRocketAt ??= 0;
  state.tower = { ...emptyTower(), ...state.tower };
  state.hallOfFame ??= [];
  state.challenge ??= null;
  state.challengesWon ??= [];
  state.history ??= [];
  state.training = { ...emptyTraining(), ...state.training };
  // O Mega Bracelet saiu do jogo: devolve o preço.
  if (state.upgrades.includes('mega-bracelet')) {
    state.upgrades = state.upgrades.filter((id) => id !== 'mega-bracelet');
    state.coins += 25_000;
  }
  state.raid ??= null;
  state.nextRaidAt ??= 0;
  state.rematchAt ??= {};
  const uidsNow = new Set(state.collection.map((p) => p.uid));
  state.encounterMode ??= 'land';
  state.merchant ??= null;
  state.nextMerchantAt ??= 0;
  state.showcase = (state.showcase ?? []).filter((id) => state.achievements.includes(id));
  state.cardFrame ??= 'basic';
  state.safari ??= null;
  state.berryTrees ??= {};
  state.tournament = { ...emptyTournament(), ...state.tournament };
  state.companion ??= null;
  if (state.companion && !uidsNow.has(state.companion.uid)) state.companion = null;
  if (!state.dexResearch) {
    state.dexResearch = {};
    for (const p of state.collection) addResearch(state, p.speciesId, { caught: 1 });
  }
  state.forms ??= {};
  // Unown, Deerling e Spinda que chegaram por expedição, ovo ou prêmio antes da correção vieram sem forma: ganham uma
  // (a estação de quando chegaram, no caso do Deerling).
  const formRng = seededRng(state.rngSeed ^ 0x5f0f);
  for (const p of state.collection) giveForm(state, p, formRng, p.caughtAt || Date.now());
  for (const p of state.collection) if (p.form) recordForm(state, p.speciesId, p.form);
  state.mvp ??= { week: 0, wins: {} };
  state.tagNames ??= {};
  // Repelente e incenso: só efeitos conhecidos e com tempo válido.
  if (state.lures) {
    for (const kind of Object.keys(state.lures) as (keyof typeof state.lures)[]) {
      const t = state.lures[kind];
      if (!t || getLure(t.item)?.kind !== kind || !(t.ms > 0)) delete state.lures[kind];
    }
  }
  for (const p of state.collection) {
    if (p.gender !== undefined && p.gender !== 'm' && p.gender !== 'f') delete p.gender;
    if (p.ball !== undefined && typeof p.ball !== 'string') delete p.ball;
    if (p.support !== undefined && p.support !== NO_SUPPORT && !SUPPORT_MOVES[p.support]) delete p.support;
    for (const key of ['eggMoves', 'relearned'] as const) {
      const list = p[key];
      if (list === undefined) continue;
      const ok = Array.isArray(list) ? list.filter((m) => typeof m === 'string' && hasMove(m)) : [];
      if (ok.length) p[key] = ok;
      else delete p[key];
    }
  }
  // PC: só mantém caixas bem formadas (a disposição em si é reconciliada em pc.ts).
  if (state.pc) {
    const boxes = Array.isArray(state.pc.boxes) ? state.pc.boxes : [];
    state.pc.boxes = boxes
      .filter((b) => b && Array.isArray(b.slots))
      .map((b) => ({
        ...(typeof b.name === 'string' && b.name ? { name: b.name } : {}),
        ...(isWallpaper(b.wallpaper) ? { wallpaper: b.wallpaper } : {}),
        slots: b.slots.map((u) => (Number.isInteger(u) && u > 0 ? u : 0)),
      }));
  }
  if (state.challenge === 'nuzlocke') state.nuzlocke ??= emptyNuzlocke();
  for (const p of state.collection) if (p.tag && !isTagId(p.tag)) delete p.tag;
  for (const p of state.collection) {
    if (p.held && !isHeldItem(p.held)) delete p.held;
  }
  if (state.raid && !state.routes[state.raid.routeId]) state.raid = null;
  if (state.roamer && !state.routes[state.roamer.routeId]) state.roamer = null;
  if (state.rocket && !state.routes[state.rocket.routeId]) state.rocket = null;
  const uids = new Set(state.collection.map((p) => p.uid));
  // Antes da equipe de 6 havia reservas e apoio separados: o apoio entra na equipe depois delas.
  const legacy = state as GameState & { passives?: number[] };
  const team = [...(state.battleTeam ?? []), ...(legacy.passives ?? [])];
  delete legacy.passives;
  state.battleTeam = [...new Set(team)]
    .filter((uid) => uids.has(uid) && uid !== state.activeUid)
    .slice(0, TEAM_SIZE - 1);
  state.daycare.uids = state.daycare.uids.filter(
    (uid) => uids.has(uid) && uid !== state.activeUid && !state.battleTeam.includes(uid),
  );
  state.training.slots = state.training.slots.filter(
    (slot) => uids.has(slot.uid) && slot.uid !== state.activeUid && !state.battleTeam.includes(slot.uid),
  );
  for (const run of state.expeditions) run.uids = run.uids.filter((uid) => uids.has(uid));
  normalizeTools(state, uids);
  // Batalhas contra treinadores não são retomadas ao carregar: volta para a rota.
  if (!state.battle || state.battle.routeId !== state.currentRouteId || state.battle.kind !== 'wild') {
    if (state.battle?.kind === 'tower') state.tower.floor = 0;
    state.battle = freshBattle(state.currentRouteId);
  }
  state.battle.team ??= [];
}

/** Equipes salvas, regras de automação e Cabo Link: só o que é bem formado e ainda existe. */
function normalizeTools(state: GameState, uids: Set<number>): void {
  const cleanSnap = (snap: TeamSnapshot | null | undefined): TeamSnapshot | null => {
    if (!snap || !Number.isInteger(snap.active)) return null;
    const reserves = Array.isArray(snap.reserves) ? snap.reserves.filter((u) => uids.has(u)) : [];
    const held: Record<number, string> = {};
    for (const [uid, item] of Object.entries(isObject(snap.held) ? snap.held : {})) {
      if (uids.has(Number(uid)) && typeof item === 'string' && isHeldItem(item)) held[Number(uid)] = item;
    }
    return { active: snap.active, reserves, held };
  };
  if (state.presets !== undefined) {
    const list = Array.isArray(state.presets) ? state.presets : [];
    state.presets = list.flatMap((p) => {
      const snap = isObject(p) && isNum(p.id) && typeof p.name === 'string' ? cleanSnap(p) : null;
      if (!snap) return [];
      return [{ id: p.id, name: p.name, ...snap, ...(PRESET_USES.includes(p.use!) ? { use: p.use } : {}) }];
    });
  }
  if (state.presetReturn !== undefined) state.presetReturn = cleanSnap(state.presetReturn);
  if (state.automation !== undefined) {
    const auto = isObject(state.automation) ? state.automation : {};
    state.automation = {};
    setAutomation(state, auto);
  }
  if (state.link !== undefined) {
    const link = state.link;
    if (!isObject(link) || typeof link.trainerId !== 'string') delete state.link;
    else {
      link.received = Array.isArray(link.received)
        ? link.received.filter((id) => typeof id === 'string')
        : [];
      link.sent = Array.isArray(link.sent)
        ? link.sent.filter((t) => isObject(t) && typeof t.code === 'string')
        : [];
      link.ghosts = Array.isArray(link.ghosts)
        ? link.ghosts.filter(
            (g) => isObject(g) && Array.isArray(g.team) && g.team.every((m) => hasSpecies(m.speciesId)),
          )
        : [];
    }
  }
}

/** Grava o save; o save anterior válido vira backup. Devolve o tamanho gravado (bytes). */
export function saveGame(storage: SaveStorage, state: GameState, now: number): number {
  const raw = serialize(state, now);
  const previous = storage.getItem(SAVE_KEY);
  if (previous && parseSave(previous).ok) storage.setItem(BACKUP_KEY, previous);
  storage.setItem(SAVE_KEY, raw);
  return new TextEncoder().encode(raw).length;
}

export interface LoadResult {
  file: SaveFile | null;
  /** Indica que o save principal estava corrompido e o backup foi usado. */
  restoredFromBackup: boolean;
  error?: string;
}

export function loadGame(storage: SaveStorage): LoadResult {
  const main = parseSave(storage.getItem(SAVE_KEY));
  if (main.ok) return { file: main.file, restoredFromBackup: false };
  const backup = parseSave(storage.getItem(BACKUP_KEY));
  if (backup.ok) return { file: backup.file, restoredFromBackup: true, error: main.error };
  return { file: null, restoredFromBackup: false, error: main.error === 'vazio' ? undefined : main.error };
}

export function clearSave(storage: SaveStorage): void {
  storage.removeItem(SAVE_KEY);
  storage.removeItem(BACKUP_KEY);
}

/** Exportação manual: texto base64 que pode ser colado de volta. */
export function exportSave(state: GameState, now: number): string {
  const bytes = new TextEncoder().encode(serialize(state, now));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(text: string): ParseResult {
  try {
    const bin = atob(text.trim());
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return parseSave(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, error: 'texto de save inválido' };
  }
}

export function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
