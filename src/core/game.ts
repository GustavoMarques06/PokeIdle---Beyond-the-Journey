// Estado do jogo e regras de alto nível. Tudo aqui é independente da interface:
// as funções mutam o `GameState` recebido e devolvem eventos para a UI animar.

import {
  BALANCE,
  ROUTES,
  SHOP_CATALOG,
  STARTER_GENERATIONS,
  getRoute,
  getSpecies,
  lineRoot,
  routeIndex,
  type BossData,
  type BuffKind,
  type PlayerAvatar,
  type Route,
  type ShopEntry,
  type TypeName,
} from '../game-data';
import { combatScales, computeModifiers, masteryLevel, type Modifiers } from './bonuses';
import { captureChance, rollCapture } from './capture';
import { addToCollection, dexEntry, giveItems, markCaught, unlockTm } from './collection';
import { attackInterval, calcDamage, chooseMove, combatantOf, type DamageResult } from './combat';
import { daycareKills, emptyDaycare, type DaycareState, type Egg } from './daycare';
import { environmentAt, routeWeather, type Environment } from './env';
import { relocateRoamer, roamerCaught, rocketTeam, type RoamerState, type RocketState } from './events';
import type { ExpeditionRun } from './expeditions';
import type { FossilRun } from './fossils';
import type { GardenPlot } from './garden';
import {
  breakChain,
  emptyHunt,
  huntShinyMultiplier,
  huntWeight,
  recordEncounter,
  type HuntState,
} from './hunt';
import {
  emptyLegends,
  endLegendary,
  legendaryDef,
  legendaryRules,
  legendaryStatus,
  type LegendState,
} from './legendary';
import { emptyMissions, progressMission, type MissionsState } from './missions';
import { isPerfect, legendaryIvs, randomIvs, rollShiny, statsOf, type PokemonInstance } from './pokemon';
import {
  coinYield,
  evolve,
  expYield,
  grantExp,
  itemEvolution,
  setLevel,
  type ExpResult,
} from './progression';
import { pickWeighted, randInt, rngFrom, type Rng } from './rng';
import type { Ivs } from './stats';
import {
  emptyTower,
  endTowerRun,
  floorTeam,
  isBossFloor,
  towerFloorCleared,
  towerUnlocked,
  type TowerState,
} from './tower';

export { dexEntry, markCaught } from './collection';

export interface RouteProgress {
  unlocked: boolean;
  kills: number;
  bossDefeated: boolean;
}

export interface DexEntry {
  seen: boolean;
  caught: boolean;
  shinyCaught: boolean;
}

export interface Settings {
  autoEvolve: boolean;
  showDamageNumbers: boolean;
  autoCapture: boolean;
  reducedMotion: boolean;
  /** Volume geral (0 a 1). */
  volume: number;
  sfx: boolean;
  cries: boolean;
  music: boolean;
  /** Fundos de batalha ilustrados (Showdown) em vez dos gerados. */
  illustratedScenes: boolean;
}

export interface EnemyState {
  speciesId: number;
  level: number;
  ivs: Ivs;
  shiny: boolean;
  hp: number;
  maxHp: number;
  captureAttempted: boolean;
  /** Bolas já lançadas contra um lendário. */
  throws?: number;
  /** Multiplicador de atributos (chefes nível 100, Torre). */
  boost?: number;
  /** Pokémon errante: foge depois de `fleeMs`. */
  roamer?: boolean;
  fleeMs?: number;
}

export type BattlePhase = 'spawning' | 'fighting' | 'victory' | 'defeat';
export type BattleKind = 'wild' | 'boss' | 'rocket' | 'tower' | 'legendary';

export interface TeamMember {
  speciesId: number;
  level: number;
  boost?: number;
}

export interface TrainerInfo {
  sprite: string;
  name: string;
  title: string;
}

export interface BattleState {
  kind: BattleKind;
  routeId: string;
  enemy: EnemyState | null;
  /** Time do treinador adversário (chefe, Rocket, Torre) e o índice do Pokémon atual. */
  team: TeamMember[];
  bossIndex: number;
  trainer?: TrainerInfo;
  /** Andar da Torre de Batalha. */
  floor?: number;
  phase: BattlePhase;
  phaseMs: number;
  playerTimerMs: number;
  enemyTimerMs: number;
}

export interface HallOfFameEntry {
  regionId: string;
  at: number;
  prestige: number;
  team: { speciesId: number; level: number; shiny: boolean }[];
}

export interface Buff {
  ms: number;
  value: number;
}

export interface GameState {
  trainerName: string;
  trainerAvatar: PlayerAvatar;
  /** Inicial escolhido (define o inicial do rival). */
  starterId: number;
  rngSeed: number;
  nextUid: number;
  createdAt: number;
  coins: number;
  /** Fichas do Game Corner. */
  tokens: number;
  items: Record<string, number>;
  /** TMs liberados (ids de golpes). */
  tms: string[];
  collection: PokemonInstance[];
  activeUid: number;
  currentRouteId: string;
  routes: Record<string, RouteProgress>;
  pokedex: Record<number, DexEntry>;
  upgrades: string[];
  settings: Settings;
  battle: BattleState;
  /** Pokémon nas vagas passivas (uids), na ordem das vagas. */
  passives: number[];
  research: { points: number; levels: Record<string, number> };
  /** Vitórias por linha evolutiva (chave: primeira espécie da linha). */
  mastery: Record<number, number>;
  achievements: string[];
  prestige: { points: number; totalEarned: number; count: number; levels: Record<string, number> };
  stats: GameStats;
  /** Dia/noite e clima atuais (atualizados pelo relógio real). */
  env: Environment;
  /** Último instante em que os cronômetros de tempo real foram processados. */
  lastTimerAt: number;
  /** Marcadores de eventos únicos (presentes, tutoriais). */
  flags: string[];
  buffs: Partial<Record<BuffKind, Buff>>;
  daycare: DaycareState;
  eggs: Egg[];
  expeditions: ExpeditionRun[];
  garden: (GardenPlot | null)[];
  fossils: FossilRun[];
  hunt: HuntState;
  missions: MissionsState;
  /** Marcos da Pokédex já resgatados. */
  dexClaimed: string[];
  roamer: RoamerState | null;
  nextRoamerAt: number;
  roamersCaught: number[];
  legends: LegendState;
  rocket: RocketState | null;
  nextRocketAt: number;
  tower: TowerState;
  hallOfFame: HallOfFameEntry[];
}

export interface GameStats {
  totalKills: number;
  totalCaptures: number;
  playTimeMs: number;
  evolutions: number;
  bossWins: number;
  hatched: number;
  rocketWins: number;
  slotsSpun: number;
  expeditionsDone: number;
  harvests: number;
}

export const DEFAULT_SETTINGS: Settings = {
  autoEvolve: true,
  showDamageNumbers: true,
  autoCapture: true,
  reducedMotion: false,
  volume: 0.6,
  sfx: true,
  cries: true,
  music: false,
  illustratedScenes: true,
};

export const EMPTY_STATS: GameStats = {
  totalKills: 0,
  totalCaptures: 0,
  playTimeMs: 0,
  evolutions: 0,
  bossWins: 0,
  hatched: 0,
  rocketWins: 0,
  slotsSpun: 0,
  expeditionsDone: 0,
  harvests: 0,
};

export type GameEvent =
  | {
      type: 'spawn';
      speciesId: number;
      level: number;
      shiny: boolean;
      boss: boolean;
      roamer?: boolean;
      perfect?: boolean;
      legendary?: boolean;
    }
  | { type: 'attack'; side: 'player' | 'enemy'; attacker: number; target: number; result: DamageResult }
  | { type: 'enemyFainted'; speciesId: number; exp: number; coins: number }
  | { type: 'playerFainted'; speciesId: number }
  | { type: 'levelUp'; uid: number; speciesId: number; level: number }
  | { type: 'learnedMove'; uid: number; speciesId: number; move: string }
  | { type: 'evolved'; uid: number; from: number; to: number }
  | { type: 'evolutionReady'; uid: number; speciesId: number; to: number }
  | { type: 'captureAttempt'; ball: string; success: boolean; speciesId: number; chance: number }
  | { type: 'captured'; uid: number; speciesId: number; shiny: boolean; isNew: boolean; perfect?: boolean }
  | { type: 'bossAvailable'; routeId: string }
  | {
      type: 'bossDefeated';
      routeId: string;
      coins: number;
      items: Record<string, number>;
      tm?: string;
      badge?: string;
      champion?: boolean;
    }
  | { type: 'routeUnlocked'; routeId: string }
  | { type: 'masteryUp'; speciesId: number; level: number }
  | { type: 'achievement'; id: string }
  | { type: 'hallOfFame'; regionId: string }
  | { type: 'hatched'; uid: number; speciesId: number; shiny: boolean; isNew: boolean }
  | { type: 'berryReady'; berry: string }
  | { type: 'fossilReady'; speciesId: number }
  | { type: 'expeditionDone'; id: string }
  | { type: 'roamerAppeared'; speciesId: number; routeId: string }
  | { type: 'roamerFled'; speciesId: number }
  | { type: 'roamerLeft'; speciesId: number }
  | { type: 'rocketAppeared'; routeId: string }
  | { type: 'rocketLeft' }
  | { type: 'legendaryEnded'; speciesId: number; reason: 'fled' | 'defeat' | 'retreat' | 'caught' }
  | { type: 'rocketDefeated'; coins: number; items: Record<string, number> }
  | { type: 'towerFloor'; floor: number; points: number }
  | { type: 'towerEnded'; floor: number }
  | { type: 'missionDone'; id: string }
  | { type: 'missionsRefreshed'; scope: 'daily' | 'weekly' }
  | { type: 'weatherChanged'; weather: string };

// ---------------------------------------------------------------------------
// Criação e consultas

export function newGame(
  starterId: number,
  now: number,
  seed: number,
  trainerName = 'Treinador',
  trainerAvatar: PlayerAvatar = 'red',
): GameState {
  const state: GameState = {
    trainerName: trainerName.trim().slice(0, 12) || 'Treinador',
    trainerAvatar,
    starterId,
    rngSeed: seed | 0,
    nextUid: 1,
    createdAt: now,
    coins: 0,
    tokens: 0,
    items: { ...BALANCE.startingItems },
    tms: [],
    collection: [],
    activeUid: 0,
    currentRouteId: ROUTES[0].id,
    routes: Object.fromEntries(
      ROUTES.map((r, i) => [r.id, { unlocked: i === 0, kills: 0, bossDefeated: false }]),
    ),
    pokedex: {},
    upgrades: [],
    settings: { ...DEFAULT_SETTINGS },
    battle: freshBattle(ROUTES[0].id),
    passives: [],
    research: { points: 0, levels: {} },
    mastery: {},
    achievements: [],
    prestige: { points: 0, totalEarned: 0, count: 0, levels: {} },
    stats: { ...EMPTY_STATS },
    env: environmentAt(now),
    lastTimerAt: now,
    flags: [],
    buffs: {},
    daycare: emptyDaycare(),
    eggs: [],
    expeditions: [],
    garden: [],
    fossils: [],
    hunt: emptyHunt(),
    missions: emptyMissions(),
    dexClaimed: [],
    roamer: null,
    nextRoamerAt: 0,
    roamersCaught: [],
    legends: emptyLegends(),
    rocket: null,
    nextRocketAt: 0,
    tower: emptyTower(),
    hallOfFame: [],
  };
  const rng = rngFrom(state);
  const starter = addToCollection(
    state,
    starterId,
    BALANCE.starterLevel,
    randomIvs(rng),
    rollShiny(rng),
    now,
    'Inicial',
  );
  state.activeUid = starter.uid;
  return state;
}

export function freshBattle(routeId: string): BattleState {
  return {
    kind: 'wild',
    routeId,
    enemy: null,
    team: [],
    bossIndex: 0,
    phase: 'spawning',
    phaseMs: BALANCE.combat.spawnDelayMs,
    playerTimerMs: 0,
    enemyTimerMs: 0,
  };
}

export function activePokemon(state: GameState): PokemonInstance {
  return state.collection.find((p) => p.uid === state.activeUid) ?? state.collection[0];
}

/** Rota cujos encontros selvagens valem para `route` (salas da Liga treinam na rota anterior). */
export function encounterRoute(route: Route): Route {
  return route.kind === 'trial' && route.farm ? getRoute(route.farm) : route;
}

export function canChallengeBoss(state: GameState, routeId: string): boolean {
  const route = getRoute(routeId);
  const prog = state.routes[routeId];
  return !!route.boss && prog.unlocked && !prog.bossDefeated && prog.kills >= route.killsRequired;
}

export function routeCleared(state: GameState, routeId: string): boolean {
  const route = getRoute(routeId);
  const prog = state.routes[routeId];
  return route.boss ? prog.bossDefeated : prog.kills >= route.killsRequired;
}

export function shopEntries(state: GameState): ShopEntry[] {
  return SHOP_CATALOG.filter((e) => !e.requiresBoss || state.routes[e.requiresBoss]?.bossDefeated);
}

/** Inicial do rival: o que tem vantagem sobre o do jogador, no estágio pedido. */
export function rivalSpecies(state: GameState, stage: number): number {
  const root = lineRoot(state.starterId);
  const gen = STARTER_GENERATIONS.find((g) => g.ids.includes(root)) ?? STARTER_GENERATIONS[0];
  const i = Math.max(0, gen.ids.indexOf(root));
  let id = gen.ids[(i + 1) % gen.ids.length];
  for (let s = 1; s < stage; s++) {
    const evo = getSpecies(id).evolutions[0];
    if (!evo) break;
    id = evo.to;
  }
  return id;
}

/** Time real de um chefe: resolve o inicial do rival e o reforço por prestígio. */
export function resolveBossTeam(state: GameState, boss: BossData): TeamMember[] {
  const extra = boss.rival ? BALANCE.rival.levelsPerPrestige * state.prestige.count : 0;
  return boss.team.map((m) => ({
    speciesId: 'speciesId' in m ? m.speciesId : rivalSpecies(state, m.rivalStage),
    level: Math.min(BALANCE.maxLevel, m.level + extra),
    boost: boss.boost,
  }));
}

// ---------------------------------------------------------------------------
// Simulação

/** Avança o jogo `ms` milissegundos em passos fixos. */
export function advance(state: GameState, ms: number, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  const rng = rngFrom(state);
  const steps = Math.floor(ms / BALANCE.tickMs);
  // Os modificadores quase só mudam por ações do jogador; recalcula a cada 10 s simulados.
  let mods = computeModifiers(state);
  for (let i = 0; i < steps; i++) {
    if (i > 0 && i % 100 === 0) mods = computeModifiers(state);
    step(state, BALANCE.tickMs, rng, now, events, mods);
  }
  state.stats.playTimeMs += steps * BALANCE.tickMs;
  for (const [kind, b] of Object.entries(state.buffs)) {
    if (!b) continue;
    b.ms -= steps * BALANCE.tickMs;
    if (b.ms <= 0) delete state.buffs[kind as BuffKind];
  }
  return events;
}

export function step(
  state: GameState,
  dt: number,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers = computeModifiers(state),
): void {
  const b = state.battle;
  const c = BALANCE.combat;

  if (b.phase !== 'fighting') {
    b.phaseMs -= dt;
    if (b.phaseMs > 0) return;
    if (b.phase === 'defeat') {
      const p = activePokemon(state);
      p.currentHp = statsOf(p).hp;
      if (b.kind === 'tower') {
        events.push({ type: 'towerEnded', floor: endTowerRun(state, now, p.speciesId) });
      }
      if (b.kind !== 'wild') state.battle = freshBattle(b.routeId);
    }
    spawnEnemy(state, rng, now, events, mods);
    return;
  }

  const enemy = b.enemy!;
  const player = activePokemon(state);
  const pc = combatantOf(player, mods.playerMoveBoost);
  const ec = combatantOf(enemy, mods.enemyMoveBoost);
  const scales = combatScales(mods, ec.types);

  if (enemy.roamer && enemy.fleeMs !== undefined) {
    enemy.fleeMs -= dt;
    if (enemy.fleeMs <= 0) {
      events.push({ type: 'roamerFled', speciesId: enemy.speciesId });
      relocateRoamer(state, rng);
      b.enemy = null;
      b.phase = 'victory';
      b.phaseMs = c.victoryDelayMs;
      return;
    }
  }

  b.playerTimerMs -= dt;
  b.enemyTimerMs -= dt;

  // Quem tiver o cronômetro mais adiantado age primeiro.
  const order: ('player' | 'enemy')[] =
    b.playerTimerMs <= b.enemyTimerMs ? ['player', 'enemy'] : ['enemy', 'player'];
  for (const side of order) {
    if (side === 'player' && b.playerTimerMs <= 0) {
      const result = calcDamage(pc, ec, chooseMove(pc, ec), rng, scales.playerDamage);
      enemy.hp = Math.max(0, enemy.hp - result.damage);
      b.playerTimerMs += attackInterval(pc.stats.spe, ec.stats.spe) * scales.playerInterval;
      events.push({ type: 'attack', side, attacker: pc.speciesId, target: ec.speciesId, result });
      if (enemy.hp <= 0) {
        // O lendário não é derrotado: fica com 1 de HP, esperando a bola.
        if (b.kind === 'legendary') enemy.hp = 1;
        else return onEnemyFainted(state, events, mods, now);
      }
    }
    if (side === 'enemy' && b.enemyTimerMs <= 0) {
      const result = calcDamage(ec, pc, chooseMove(ec, pc, rng, 0.3), rng, scales.enemyDamage);
      player.currentHp = Math.max(0, player.currentHp - result.damage);
      b.enemyTimerMs += attackInterval(ec.stats.spe, pc.stats.spe);
      events.push({ type: 'attack', side, attacker: ec.speciesId, target: pc.speciesId, result });
      if (player.currentHp <= 0) {
        b.phase = 'defeat';
        b.phaseMs = c.defeatRecoveryMs;
        breakChain(state);
        if (b.kind === 'legendary') endLegendary(state, enemy.speciesId, now, 'defeat', events);
        events.push({ type: 'playerFainted', speciesId: player.speciesId });
        return;
      }
    }
  }

  maybeAutoCapture(state, rng, now, events, mods);
}

/** Tipos favorecidos pelo clima e pelo período nos encontros selvagens. */
function encounterTypes(state: GameState, route: Route): TypeName[] {
  const out: TypeName[] = [];
  const weather = routeWeather(route, state.env);
  if (weather === 'rain') out.push('water');
  if (weather === 'sun') out.push('fire', 'grass');
  if (weather === 'sand') out.push('rock', 'ground');
  if (state.env.period === 'night') out.push('ghost', 'dark');
  return out;
}

/** Encontros possíveis agora, com pesos ajustados por período, clima e caça shiny. */
export function currentEncounters(state: GameState, routeId: string) {
  const route = encounterRoute(getRoute(routeId));
  const timed = route.encounters.filter((e) => !e.time || e.time === state.env.period);
  const list = timed.length ? timed : route.encounters;
  const favored = encounterTypes(state, route);
  return list.map((e) => {
    const types = getSpecies(e.speciesId).types;
    const boost = types.some((t) => favored.includes(t)) ? BALANCE.weather.encounterBoost : 1;
    return { ...e, weight: e.weight * boost * huntWeight(state, e.speciesId) };
  });
}

function spawnEnemy(state: GameState, rng: Rng, now: number, events: GameEvent[], mods: Modifiers): void {
  const b = state.battle;
  const route = getRoute(b.routeId);
  let speciesId: number;
  let level: number;
  let ivs: Ivs;
  let shiny = false;
  let boost: number | undefined;
  let roamer = false;
  if (b.kind === 'legendary') {
    const member = b.team[0];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    ivs = legendaryIvs(rng, legendaryRules(speciesId).guaranteedPerfectIvs);
    shiny = rollShiny(rng, mods.shiny);
  } else if (b.kind !== 'wild') {
    const member = b.team[b.bossIndex];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    ivs = { hp: 20, atk: 20, def: 20, spAtk: 20, spDef: 20, spe: 20 };
  } else if (
    state.roamer &&
    state.roamer.routeId === encounterRoute(route).id &&
    rng.next() < BALANCE.roamers.encounterChance
  ) {
    speciesId = state.roamer.speciesId;
    level = state.roamer.level;
    ivs = randomIvs(rng);
    shiny = rollShiny(rng, mods.shiny);
    roamer = true;
  } else {
    const enc = pickWeighted(rng, currentEncounters(state, b.routeId));
    speciesId = enc.speciesId;
    level = randInt(rng, enc.minLevel, enc.maxLevel);
    ivs = randomIvs(rng);
    shiny = rollShiny(rng, mods.shiny * huntShinyMultiplier(state, speciesId));
    recordEncounter(state, speciesId, shiny, now);
  }
  const base = statsOf({ speciesId, level, ivs }).hp;
  const hpScale = roamer
    ? BALANCE.roamers.hpMultiplier
    : b.kind === 'legendary'
      ? legendaryRules(speciesId).hpMultiplier
      : 1;
  const maxHp = Math.round(base * (boost ?? 1) * hpScale);
  b.enemy = { speciesId, level, ivs, shiny, hp: maxHp, maxHp, captureAttempted: false, boost };
  if (roamer) Object.assign(b.enemy, { roamer: true, fleeMs: BALANCE.roamers.fleeMs });
  b.phase = 'fighting';
  const pc = combatantOf(activePokemon(state));
  const ec = combatantOf(b.enemy);
  b.playerTimerMs = attackInterval(pc.stats.spe, ec.stats.spe) * mods.attackInterval * 0.5;
  b.enemyTimerMs = attackInterval(ec.stats.spe, pc.stats.spe) * 0.5;
  dexEntry(state, speciesId).seen = true;
  events.push({
    type: 'spawn',
    speciesId,
    level,
    shiny,
    boss: b.kind !== 'wild' && b.kind !== 'legendary',
    legendary: b.kind === 'legendary',
    roamer,
    perfect: !roamer && b.kind === 'wild' && isPerfect(ivs),
  });
}

/** Evolução concluída: Pokédex, estatísticas e missões. */
function recordEvolution(state: GameState, to: number, shiny: boolean, events?: GameEvent[]): void {
  markCaught(state, to, shiny);
  state.stats.evolutions++;
  progressMission(state, 'evolutions', 1, events);
}

function pushExpEvents(
  state: GameState,
  p: PokemonInstance,
  before: number,
  res: ExpResult,
  events: GameEvent[],
): void {
  if (res.levelsGained > 0) events.push({ type: 'levelUp', uid: p.uid, speciesId: before, level: p.level });
  for (const move of res.learnedMoves)
    events.push({ type: 'learnedMove', uid: p.uid, speciesId: before, move });
  if (res.evolvedTo) {
    recordEvolution(state, res.evolvedTo, p.shiny, events);
    events.push({ type: 'evolved', uid: p.uid, from: before, to: res.evolvedTo });
  }
  if (p.pendingEvolution && !res.evolvedTo) {
    events.push({ type: 'evolutionReady', uid: p.uid, speciesId: p.speciesId, to: p.pendingEvolution });
  }
}

/** Recompensas por derrotar (ou capturar) o inimigo atual. */
function onEnemyFainted(state: GameState, events: GameEvent[], mods: Modifiers, now: number): void {
  const b = state.battle;
  const enemy = b.enemy!;
  const isTrainer = b.kind !== 'wild';
  const route = getRoute(b.routeId);
  const player = activePokemon(state);

  const exp = Math.floor(expYield(enemy.speciesId, enemy.level, isTrainer, player.level) * mods.exp);
  const coins = Math.floor(coinYield(enemy.level, isTrainer, player.level) * mods.coins);
  state.coins += coins;
  state.stats.totalKills++;
  events.push({ type: 'enemyFainted', speciesId: enemy.speciesId, exp, coins });
  addMastery(state, player.speciesId, 1, events);
  const before = player.speciesId;
  pushExpEvents(
    state,
    player,
    before,
    grantExp(player, exp, state.settings.autoEvolve, state.env.period),
    events,
  );

  b.phase = 'victory';
  b.phaseMs = BALANCE.combat.victoryDelayMs;
  b.enemy = null;

  if (enemy.roamer) {
    // Derrotado, o errante foge para outra rota; só capturado ele sai de vez.
    if (state.roamer?.speciesId === enemy.speciesId) relocateRoamer(state, rngFrom(state));
  }

  if (isTrainer) {
    if (b.bossIndex + 1 < b.team.length) {
      b.bossIndex++;
      return;
    }
    if (b.kind === 'boss' && route.boss) return onBossDefeated(state, route, events, now);
    if (b.kind === 'rocket') return onRocketDefeated(state, events);
    if (b.kind === 'tower') return onTowerFloor(state, events);
  }

  const max = statsOf(player).hp;
  player.currentHp = Math.min(max, player.currentHp + Math.ceil(max * mods.heal));
  registerKills(state, route.id, 1, events);
}

function onBossDefeated(state: GameState, route: Route, events: GameEvent[], now: number): void {
  const boss = route.boss!;
  const player = activePokemon(state);
  state.routes[route.id].bossDefeated = true;
  state.stats.bossWins++;
  state.coins += boss.reward.coins;
  giveItems(state, boss.reward.items);
  const tm = boss.reward.tm && unlockTm(state, boss.reward.tm) ? boss.reward.tm : undefined;
  progressMission(state, 'bosses', 1, events);
  events.push({
    type: 'bossDefeated',
    routeId: route.id,
    coins: boss.reward.coins,
    items: boss.reward.items ?? {},
    tm,
    badge: boss.badge?.id,
    champion: boss.champion,
  });
  if (boss.champion) {
    const team = [player, ...state.passives.map((uid) => state.collection.find((p) => p.uid === uid))]
      .filter((p): p is PokemonInstance => !!p)
      .map((p) => ({ speciesId: p.speciesId, level: p.level, shiny: p.shiny }));
    state.hallOfFame.push({ regionId: route.regionId, at: now, prestige: state.prestige.count, team });
    events.push({ type: 'hallOfFame', regionId: route.regionId });
  }
  unlockNext(state, route.id, events);
  player.currentHp = statsOf(player).hp;
  state.battle = { ...freshBattle(route.id), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
}

const ROCKET_LOOT: { weight: number; items: Record<string, number> }[] = [
  { weight: 4, items: { 'ultra-ball': 2 } },
  { weight: 3, items: { 'great-ball': 5 } },
  { weight: 2, items: { 'rare-candy': 1 } },
  { weight: 1, items: { nugget: 1 } },
];

function onRocketDefeated(state: GameState, events: GameEvent[]): void {
  const b = state.battle;
  const player = activePokemon(state);
  const avg = b.team.reduce((s, m) => s + m.level, 0) / Math.max(1, b.team.length);
  const coins = Math.round(BALANCE.rocket.coins * avg);
  const loot = pickWeighted(rngFrom(state), ROCKET_LOOT).items;
  state.coins += coins;
  giveItems(state, loot);
  state.rocket = null;
  state.stats.rocketWins++;
  progressMission(state, 'bosses', 1, events);
  events.push({ type: 'rocketDefeated', coins, items: loot });
  player.currentHp = statsOf(player).hp;
  state.battle = { ...freshBattle(b.routeId), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
}

function onTowerFloor(state: GameState, events: GameEvent[]): void {
  const b = state.battle;
  const floor = b.floor ?? 1;
  const points = towerFloorCleared(state, floor);
  progressMission(state, 'tower-floors', 1, events);
  events.push({ type: 'towerFloor', floor, points });
  const player = activePokemon(state);
  const max = statsOf(player).hp;
  player.currentHp = Math.min(max, player.currentHp + Math.ceil(max * BALANCE.tower.healPerFloor));
  state.battle = {
    ...towerBattle(state, b.routeId, floor + 1),
    phase: 'victory',
    phaseMs: BALANCE.combat.victoryDelayMs * 2,
  };
}

/** Soma vitórias à maestria da linha evolutiva. Também usado pelo progresso offline. */
export function addMastery(state: GameState, speciesId: number, wins: number, events: GameEvent[]): void {
  const root = lineRoot(speciesId);
  const before = state.mastery[root] ?? 0;
  state.mastery[root] = before + wins;
  const level = masteryLevel(before + wins);
  if (level > masteryLevel(before)) events.push({ type: 'masteryUp', speciesId, level });
}

/** Soma vitórias numa rota e trata desbloqueios. Também usado pelo progresso offline. */
export function registerKills(state: GameState, routeId: string, kills: number, events: GameEvent[]): void {
  const route = getRoute(routeId);
  const prog = state.routes[routeId];
  const before = prog.kills;
  prog.kills += kills;
  if (before < route.killsRequired && prog.kills >= route.killsRequired) {
    if (route.boss) events.push({ type: 'bossAvailable', routeId });
    else unlockNext(state, routeId, events);
  }
  daycareKills(state, kills);
  progressMission(state, 'kills', kills, events);
}

function unlockNext(state: GameState, routeId: string, events: GameEvent[]): void {
  const next = ROUTES[routeIndex(routeId) + 1];
  if (next && !state.routes[next.id].unlocked) {
    state.routes[next.id].unlocked = true;
    events.push({ type: 'routeUnlocked', routeId: next.id });
  }
}

// ---------------------------------------------------------------------------
// Captura

/** Bola usada pela captura automática: Ultra Ball só para shinies e errantes. */
function bestBall(state: GameState, enemy: EnemyState): string | undefined {
  const order =
    enemy.shiny || enemy.roamer ? ['ultra-ball', 'great-ball', 'poke-ball'] : ['great-ball', 'poke-ball'];
  return order.find((ball) => (state.items[ball] ?? 0) > 0);
}

export function canThrowBall(state: GameState): boolean {
  const b = state.battle;
  return (b.kind === 'wild' || b.kind === 'legendary') && b.phase === 'fighting' && !!b.enemy;
}

/** Chance de captura do inimigo atual, já com bônus. */
export function currentCaptureChance(state: GameState, ball: string, mods = computeModifiers(state)): number {
  const enemy = state.battle.enemy;
  if (!enemy) return 0;
  const rate =
    state.battle.kind === 'legendary' && legendaryDef(enemy.speciesId)?.tier === 'pseudo'
      ? BALANCE.pseudo.captureRate
      : getSpecies(enemy.speciesId).captureRate;
  const base = captureChance(rate, enemy.hp, enemy.maxHp, ball);
  return Math.min(1, base * mods.capture);
}

export function throwBall(state: GameState, ball: string, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (!canThrowBall(state) || (state.items[ball] ?? 0) <= 0) return events;
  attemptCapture(state, ball, rngFrom(state), now, events, computeModifiers(state));
  return events;
}

function attemptCapture(
  state: GameState,
  ball: string,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers,
): void {
  const enemy = state.battle.enemy!;
  const chance = currentCaptureChance(state, ball, mods);
  state.items[ball]--;
  enemy.captureAttempted = true;
  const success = rollCapture(rng, chance);
  events.push({ type: 'captureAttempt', ball, success, speciesId: enemy.speciesId, chance });
  if (!success) {
    if (state.battle.kind === 'legendary') {
      enemy.throws = (enemy.throws ?? 0) + 1;
      if (enemy.throws >= legendaryRules(enemy.speciesId).throwLimit) {
        endLegendary(state, enemy.speciesId, now, 'fled', events);
        state.battle = freshBattle(state.battle.routeId);
      }
    }
    return;
  }

  const isNew = !dexEntry(state, enemy.speciesId).caught;
  const routeName = getRoute(state.battle.routeId).name;
  const p = addToCollection(state, enemy.speciesId, enemy.level, enemy.ivs, enemy.shiny, now, routeName);
  p.currentHp = enemy.hp > 0 ? Math.min(statsOf(p).hp, enemy.hp) : 1;
  state.stats.totalCaptures++;
  progressMission(state, 'captures', 1, events);
  progressMission(state, 'capture-type', 1, events, getSpecies(p.speciesId).types);
  if (enemy.roamer) {
    roamerCaught(state, now, rng);
    enemy.roamer = false;
  }
  events.push({
    type: 'captured',
    uid: p.uid,
    speciesId: p.speciesId,
    shiny: p.shiny,
    isNew,
    perfect: isPerfect(p.ivs),
  });
  if (state.battle.kind === 'legendary') {
    state.legends.caught.push(p.speciesId);
    events.push({ type: 'legendaryEnded', speciesId: p.speciesId, reason: 'caught' });
    const player = activePokemon(state);
    player.currentHp = statsOf(player).hp;
    state.battle = freshBattle(state.battle.routeId);
    return;
  }
  onEnemyFainted(state, events, mods, now);
}

function maybeAutoCapture(
  state: GameState,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers,
): void {
  const enemy = state.battle.enemy;
  if (!enemy || !state.upgrades.includes('auto-capture') || !state.settings.autoCapture) return;
  if (!canThrowBall(state) || enemy.captureAttempted || state.battle.kind === 'legendary') return;
  const dex = dexEntry(state, enemy.speciesId);
  if (dex.caught && !enemy.shiny && !enemy.roamer) return;
  if (enemy.hp / enemy.maxHp > BALANCE.capture.autoCaptureHpThreshold) return;
  const ball = bestBall(state, enemy);
  if (ball) attemptCapture(state, ball, rng, now, events, mods);
}

// ---------------------------------------------------------------------------
// Ações do jogador

export function selectRoute(state: GameState, routeId: string, now = Date.now()): void {
  if (!state.routes[routeId]?.unlocked) return;
  if (state.battle.kind === 'tower') endTowerRun(state, now, activePokemon(state).speciesId);
  if (state.battle.kind === 'legendary' && state.battle.enemy) {
    endLegendary(state, state.battle.enemy.speciesId, now, 'retreat', []);
  }
  if (routeId !== state.currentRouteId) breakChain(state);
  state.currentRouteId = routeId;
  state.battle = freshBattle(routeId);
}

function startTrainerBattle(
  state: GameState,
  routeId: string,
  kind: BattleKind,
  team: TeamMember[],
  trainer: TrainerInfo,
): void {
  state.currentRouteId = routeId;
  const p = activePokemon(state);
  p.currentHp = statsOf(p).hp;
  state.battle = { ...freshBattle(routeId), kind, team, trainer };
}

export function challengeBoss(state: GameState, routeId: string): boolean {
  if (!canChallengeBoss(state, routeId)) return false;
  const boss = getRoute(routeId).boss!;
  startTrainerBattle(state, routeId, 'boss', resolveBossTeam(state, boss), {
    sprite: boss.trainer,
    name: boss.name,
    title: boss.title,
  });
  return true;
}

export function canChallengeRocket(state: GameState): boolean {
  return !!state.rocket && state.battle.kind === 'wild';
}

export function challengeRocket(state: GameState): boolean {
  if (!canChallengeRocket(state)) return false;
  const routeId = state.rocket!.routeId;
  const rng = rngFrom(state);
  const sprite = rng.next() < 0.5 ? 'rocket' : 'rocketf';
  startTrainerBattle(state, routeId, 'rocket', rocketTeam(routeId, rng), {
    sprite,
    name: 'Recruta',
    title: 'Equipe Rocket',
  });
  return true;
}

const TOWER_TRAINERS = ROUTES.flatMap((r) => (r.boss ? [{ sprite: r.boss.trainer, name: r.boss.name }] : []));

function towerBattle(state: GameState, routeId: string, floor: number): BattleState {
  const rng = rngFrom(state);
  const t = TOWER_TRAINERS[Math.floor(rng.next() * TOWER_TRAINERS.length)];
  return {
    ...freshBattle(routeId),
    kind: 'tower',
    floor,
    team: floorTeam(floor, rng),
    trainer: { ...t, title: isBossFloor(floor) ? 'Cérebro da Torre' : `Andar ${floor}` },
  };
}

export function challengeTower(state: GameState): boolean {
  if (!towerUnlocked(state) || state.battle.kind !== 'wild') return false;
  const p = activePokemon(state);
  p.currentHp = statsOf(p).hp;
  state.tower.floor = 1;
  state.battle = towerBattle(state, state.currentRouteId, 1);
  return true;
}

export function setTrainerName(state: GameState, name: string): void {
  const clean = name.trim().slice(0, 12);
  if (clean) state.trainerName = clean;
}

export function setTrainerAvatar(state: GameState, avatar: PlayerAvatar): void {
  state.trainerAvatar = avatar;
}

/** Desiste do desafio atual (chefe, Rocket ou Torre) e volta para a rota. */
export function retreatFromBoss(state: GameState, now = Date.now()): GameEvent[] {
  const b = state.battle;
  if (b.kind === 'wild') return [];
  const events: GameEvent[] = [];
  if (b.kind === 'tower') {
    events.push({ type: 'towerEnded', floor: endTowerRun(state, now, activePokemon(state).speciesId) });
  }
  if (b.kind === 'legendary' && b.enemy) endLegendary(state, b.enemy.speciesId, now, 'retreat', events);
  state.battle = freshBattle(b.routeId);
  return events;
}

/** Enfrenta um lendário liberado: batalha manual, sem captura automática. */
export function challengeLegendary(state: GameState, speciesId: number, now: number): boolean {
  const def = legendaryDef(speciesId);
  if (!def || legendaryStatus(state, def, now) !== 'ready' || state.battle.kind !== 'wild') return false;
  const p = activePokemon(state);
  p.currentHp = statsOf(p).hp;
  state.battle = {
    ...freshBattle(state.currentRouteId),
    kind: 'legendary',
    team: [{ speciesId, level: def.level, boost: def.boost }],
  };
  return true;
}

export function setActive(state: GameState, uid: number): void {
  if (!state.collection.some((p) => p.uid === uid) || uid === state.activeUid) return;
  if (state.daycare.uids.includes(uid) || state.expeditions.some((e) => e.uids.includes(uid))) return;
  // Se o novo ativo estava numa vaga passiva, o antigo ativo assume a vaga.
  const slot = state.passives.indexOf(uid);
  if (slot >= 0) state.passives[slot] = state.activeUid;
  state.activeUid = uid;
  const b = state.battle;
  if (b.phase === 'fighting' && b.enemy) {
    const pc = combatantOf(activePokemon(state));
    b.playerTimerMs =
      attackInterval(pc.stats.spe, combatantOf(b.enemy).stats.spe) * computeModifiers(state).attackInterval;
  }
}

export function buy(state: GameState, entryId: string, qty = 1): boolean {
  const entry = shopEntries(state).find((e) => e.id === entryId);
  if (!entry) return false;
  if (entry.kind === 'upgrade') {
    if (state.upgrades.includes(entry.id) || state.coins < entry.price) return false;
    state.coins -= entry.price;
    state.upgrades.push(entry.id);
    return true;
  }
  const cost = entry.price * qty;
  if (qty <= 0 || state.coins < cost) return false;
  state.coins -= cost;
  state.items[entry.id] = (state.items[entry.id] ?? 0) + qty;
  return true;
}

export function applyEvolutionItem(state: GameState, uid: number, item: string): GameEvent[] {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || (state.items[item] ?? 0) <= 0) return [];
  const to = itemEvolution(p, item, state.env.period);
  if (!to) return [];
  state.items[item]--;
  const from = p.speciesId;
  evolve(p, to);
  const events: GameEvent[] = [];
  recordEvolution(state, to, p.shiny, events);
  events.push({ type: 'evolved', uid, from, to });
  return events;
}

export function confirmEvolution(state: GameState, uid: number): GameEvent[] {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p?.pendingEvolution) return [];
  const from = p.speciesId;
  const to = p.pendingEvolution;
  evolve(p, to);
  const events: GameEvent[] = [];
  recordEvolution(state, to, p.shiny, events);
  events.push({ type: 'evolved', uid, from, to });
  return events;
}

/** Rare Candy: +1 nível na hora. */
export function giveRareCandy(state: GameState, uid: number): GameEvent[] {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || p.level >= BALANCE.maxLevel || (state.items['rare-candy'] ?? 0) <= 0) return [];
  state.items['rare-candy']--;
  const events: GameEvent[] = [];
  const before = p.speciesId;
  pushExpEvents(
    state,
    p,
    before,
    setLevel(p, p.level + 1, state.settings.autoEvolve, state.env.period),
    events,
  );
  return events;
}

/** Pedra Eterna: trava/destrava a evolução por nível (precisa ter uma na Mochila). */
export function toggleEvolutionLock(state: GameState, uid: number): boolean {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || (!p.evolutionLocked && (state.items.everstone ?? 0) <= 0)) return false;
  p.evolutionLocked = !p.evolutionLocked;
  if (p.evolutionLocked) p.pendingEvolution = undefined;
  return true;
}
