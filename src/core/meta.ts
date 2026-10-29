// Sistemas de longo prazo: laboratório, prestígio, conquistas
// e nível de treinador. Como em game.ts, as funções mutam o estado recebido.

import {
  ACHIEVEMENTS,
  BALANCE,
  CARD_FRAMES,
  CHALLENGES,
  MEDAL_TIERS,
  PRESTIGE,
  PRESTIGE_UPGRADES,
  RESEARCH,
  RESEARCH_POINTS,
  ROUTES,
  SHOWCASE_SLOTS,
  getSpecies,
  type AchievementDef,
  type ChallengeId,
} from '../game-data';
import { masteryLevel, passivePokemon, prestigeLevel, researchLevel } from './bonuses';
import { emptyNuzlocke } from './nuzlocke';
import { freshBattle, type GameEvent, type GameState } from './game';
import { potential, statsOf, type PokemonInstance } from './pokemon';
import { expForLevel } from './stats';

// --- Laboratório -----------------------------------------------------------------

export function transferValue(p: PokemonInstance): number {
  const r = RESEARCH_POINTS;
  return (
    r.transferBase +
    r.transferPerTenLevels * Math.floor(p.level / 10) +
    (p.shiny ? r.transferShiny : 0) +
    (potential(p.ivs) >= r.highPotentialThreshold ? r.transferHighPotential : 0)
  );
}

/** Só duplicatas podem ser transferidas, e nunca quem está na equipe. */
export function canTransfer(state: GameState, uid: number): boolean {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || p.favorite || uid === state.activeUid) return false;
  if (state.battleTeam.includes(uid)) return false;
  if (state.daycare.uids.includes(uid) || state.expeditions.some((e) => e.uids.includes(uid))) return false;
  if (state.training.slots.some((s) => s.uid === uid)) return false;
  return state.collection.some((x) => x.uid !== uid && x.speciesId === p.speciesId);
}

export function transferPokemon(state: GameState, uid: number): number {
  if (!canTransfer(state, uid)) return 0;
  const p = state.collection.find((x) => x.uid === uid)!;
  const points = transferValue(p);
  if (p.held) state.items[p.held] = (state.items[p.held] ?? 0) + 1;
  state.collection = state.collection.filter((x) => x.uid !== uid);
  state.research.points += points;
  return points;
}

/**
 * Duplicatas "sobrando": de cada espécie mantém o melhor exemplar (a equipe
 * conta como mantida; depois maior nível, depois shiny, depois potencial).
 */
export function surplusDuplicates(state: GameState): PokemonInstance[] {
  const bySpecies = new Map<number, PokemonInstance[]>();
  for (const p of state.collection) bySpecies.set(p.speciesId, [...(bySpecies.get(p.speciesId) ?? []), p]);
  const protectedUids = new Set([
    state.activeUid,
    ...state.battleTeam,
    ...state.daycare.uids,
    ...state.expeditions.flatMap((e) => e.uids),
  ]);
  const out: PokemonInstance[] = [];
  for (const group of bySpecies.values()) {
    if (group.length < 2) continue;
    const ranked = [...group].sort(
      (a, b) =>
        Number(protectedUids.has(b.uid)) - Number(protectedUids.has(a.uid)) ||
        Number(b.shiny) - Number(a.shiny) ||
        b.level - a.level ||
        potential(b.ivs) - potential(a.ivs),
    );
    out.push(...ranked.slice(1).filter((p) => !protectedUids.has(p.uid) && !p.shiny && !p.favorite));
  }
  return out;
}

export function transferDuplicates(state: GameState): number {
  return surplusDuplicates(state).reduce((sum, p) => sum + transferPokemon(state, p.uid), 0);
}

export function upgradeCost(def: { baseCost: number; costGrowth: number }, level: number): number {
  return Math.ceil(def.baseCost * def.costGrowth ** level);
}

export function buyResearch(state: GameState, id: string): boolean {
  const def = RESEARCH.find((r) => r.id === id);
  if (!def) return false;
  const level = researchLevel(state, id);
  const cost = upgradeCost(def, level);
  if (level >= def.maxLevel || state.research.points < cost) return false;
  state.research.points -= cost;
  state.research.levels[id] = level + 1;
  return true;
}

// --- Prestígio -------------------------------------------------------------------

export function canPrestige(state: GameState): boolean {
  return !!state.routes[PRESTIGE.requiresBoss]?.bossDefeated;
}

/** Bônus do desafio da jornada atual (0 sem desafio). */
export function challengeBonus(state: GameState): number {
  return CHALLENGES.find((c) => c.id === state.challenge)?.bonus ?? 0;
}

/** Pontos que uma nova jornada daria agora (já com o bônus do desafio). */
export function prestigePreview(state: GameState): number {
  const bosses = ROUTES.filter((r) => r.boss && state.routes[r.id]?.bossDefeated).length;
  const species = Object.values(state.pokedex).filter((d) => d.caught).length;
  const best = Math.max(...state.collection.map((p) => p.level));
  const base =
    bosses * PRESTIGE.pointsPerBoss +
    Math.floor(species / 5) * PRESTIGE.pointsPerFiveSpecies +
    Math.floor(best / 10) * PRESTIGE.pointsPerTenLevels;
  return Math.floor(base * (1 + challengeBonus(state)));
}

export function resetLevel(state: GameState): number {
  return PRESTIGE.baseResetLevel + 5 * prestigeLevel(state, 'veteran');
}

/**
 * Nova jornada: volta à Rota 1 com moedas, itens e níveis zerados. Mantém coleção
 * (espécies e evoluções), Pokédex, pesquisa, maestria, conquistas e melhorias da loja.
 * `challenge` define as regras extras da próxima jornada (null = sem desafio).
 */
export function prestigeReset(state: GameState, challenge: ChallengeId | null = null): number {
  if (!canPrestige(state)) return 0;
  const gained = prestigePreview(state);
  state.prestige.points += gained;
  state.prestige.totalEarned += gained;
  state.prestige.count++;
  if (state.challenge && !state.challengesWon.includes(state.challenge)) {
    state.challengesWon.push(state.challenge);
  }
  state.challenge = challenge;
  state.nuzlocke = emptyNuzlocke();

  state.routes = Object.fromEntries(
    ROUTES.map((r, i) => [r.id, { unlocked: i === 0, kills: 0, bossDefeated: false }]),
  );
  state.currentRouteId = ROUTES[0].id;
  state.battle = freshBattle(ROUTES[0].id);
  state.tower.floor = 0;
  state.rocket = null;
  state.roamer = null;
  state.raid = null;
  state.rematchAt = {};
  applyJourneyStart(state);
  state.battleTeam = [];
  const level = resetLevel(state);
  for (const p of state.collection) {
    p.level = level;
    p.exp = expForLevel(getSpecies(p.speciesId).growthRate, p.level);
    p.pendingEvolution = undefined;
    p.currentHp = statsOf(p).hp;
  }
  return gained;
}

function applyJourneyStart(state: GameState): void {
  const supplies = prestigeLevel(state, 'supplies');
  state.coins = 150 * supplies;
  state.items = { ...BALANCE.startingItems };
  state.items['poke-ball'] = (state.items['poke-ball'] ?? 0) + 10 * supplies;
}

export function buyPrestige(state: GameState, id: string): boolean {
  const def = PRESTIGE_UPGRADES.find((u) => u.id === id);
  if (!def) return false;
  const level = prestigeLevel(state, id);
  const cost = upgradeCost(def, level);
  if (level >= def.maxLevel || state.prestige.points < cost) return false;
  state.prestige.points -= cost;
  state.prestige.levels[id] = level + 1;
  return true;
}

/** Desiste do desafio da jornada atual (as regras normais voltam; o bônus se perde). */
export function abandonChallenge(state: GameState): void {
  state.challenge = null;
  state.nuzlocke = emptyNuzlocke();
}

// --- Conquistas --------------------------------------------------------------------

/** Progresso atual e meta de uma conquista. */
export function achievementProgress(
  state: GameState,
  def: AchievementDef,
): { value: number; target: number } {
  const g = def.goal;
  switch (g.kind) {
    case 'kills':
      return { value: state.stats.totalKills, target: g.n };
    case 'captures':
      return { value: state.stats.totalCaptures, target: g.n };
    case 'species':
      return { value: Object.values(state.pokedex).filter((d) => d.caught).length, target: g.n };
    case 'evolutions':
      return { value: state.stats.evolutions, target: g.n };
    case 'boss':
      return { value: state.routes[g.routeId]?.bossDefeated || state.prestige.count > 0 ? 1 : 0, target: 1 };
    case 'shiny':
      return { value: Object.values(state.pokedex).some((d) => d.shinyCaught) ? 1 : 0, target: 1 };
    case 'level':
      return { value: Math.max(...state.collection.map((p) => p.level)), target: g.n };
    case 'mastery':
      return { value: Math.max(0, ...Object.values(state.mastery).map(masteryLevel)), target: g.n };
    case 'prestige':
      return { value: state.prestige.count, target: g.n };
    case 'passives':
      return { value: passivePokemon(state).length, target: g.n };
    case 'shinies':
      return { value: Object.values(state.pokedex).filter((d) => d.shinyCaught).length, target: g.n };
    case 'badges':
      return {
        value: ROUTES.filter((r) => r.boss?.badge && state.routes[r.id]?.bossDefeated).length,
        target: g.n,
      };
    case 'champions':
      return { value: new Set(state.hallOfFame.map((h) => h.regionId)).size, target: g.n };
    case 'raids':
      return { value: state.stats.raidWins, target: g.n };
    case 'rematches':
      return { value: state.stats.rematchWins, target: g.n };
    case 'tower':
      return { value: state.tower.best, target: g.n };
    case 'water':
      return { value: state.stats.waterKills, target: g.n };
    case 'sold':
      return { value: state.stats.itemsSold, target: g.n };
    case 'merchant':
      return { value: state.stats.merchantBuys, target: g.n };
    case 'tournaments':
      return { value: state.stats.tournamentTitles, target: g.n };
    case 'safari':
      return { value: state.stats.safariCaptures, target: g.n };
    case 'research':
      return { value: Object.values(state.dexResearch).filter((e) => e.complete).length, target: g.n };
    case 'forms':
      return { value: (state.forms[g.speciesId] ?? []).length, target: g.n };
    case 'wildBerries':
      return { value: state.stats.wildHarvests, target: g.n };
  }
}

// --- Medalhas: vitrine e moldura do cartão ---------------------------------------------

/** Pontos de medalha: cada conquista vale conforme o metal (bronze 1 … platina 8). */
export function medalPoints(state: GameState): number {
  const points = new Map(MEDAL_TIERS.map((t) => [t.id, t.points]));
  return ACHIEVEMENTS.filter((a) => state.achievements.includes(a.id)).reduce(
    (sum, a) => sum + (points.get(a.tier) ?? 0),
    0,
  );
}

export function frameUnlocked(state: GameState, id: string): boolean {
  const frame = CARD_FRAMES.find((f) => f.id === id);
  return !!frame && medalPoints(state) >= frame.points;
}

export function setCardFrame(state: GameState, id: string): boolean {
  if (!frameUnlocked(state, id)) return false;
  state.cardFrame = id;
  return true;
}

/** Põe ou tira uma medalha da vitrine do cartão (até SHOWCASE_SLOTS). */
export function toggleShowcase(state: GameState, id: string): boolean {
  if (state.showcase.includes(id)) {
    state.showcase = state.showcase.filter((x) => x !== id);
    return true;
  }
  if (!state.achievements.includes(id) || state.showcase.length >= SHOWCASE_SLOTS) return false;
  state.showcase.push(id);
  return true;
}

/** Concede as conquistas recém-cumpridas e devolve os eventos. */
export function checkAchievements(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  for (const def of ACHIEVEMENTS) {
    if (state.achievements.includes(def.id)) continue;
    const { value, target } = achievementProgress(state, def);
    if (value < target) continue;
    state.achievements.push(def.id);
    state.coins += def.reward.coins ?? 0;
    state.research.points += def.reward.research ?? 0;
    events.push({ type: 'achievement', id: def.id });
  }
  return events;
}

// --- Treinador ---------------------------------------------------------------------

export function trainerExp(state: GameState): number {
  const s = state.stats;
  return (
    s.totalKills + 25 * s.totalCaptures + 100 * s.bossWins + 50 * s.evolutions + 500 * state.prestige.count
  );
}

export function trainerLevel(state: GameState): { level: number; progress: number } {
  const xp = trainerExp(state);
  const level = Math.floor(Math.sqrt(xp / 20)) + 1;
  const cur = 20 * (level - 1) ** 2;
  const next = 20 * level ** 2;
  return { level, progress: (xp - cur) / (next - cur) };
}
