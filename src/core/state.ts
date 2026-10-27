// Formato do estado do jogo, eventos e consultas. Sem regras de simulação:
// ver battle.ts (combate, recompensas, captura) e actions.ts (ações do jogador).

import {
  BALANCE,
  ROUTES,
  SHOP_CATALOG,
  STARTER_GENERATIONS,
  getRoute,
  getSpecies,
  lineRoot,
  type Ailment,
  type BossData,
  type BuffKind,
  type ChallengeId,
  type PlayerAvatar,
  type Route,
  type ShopEntry,
} from '../game-data';
import { addToCollection } from './collection';
import { type DamageResult } from './combat';
import { emptyDaycare, type DaycareState, type Egg } from './daycare';
import { environmentAt, type Environment } from './env';
import { type RoamerState, type RocketState } from './events';
import type { ExpeditionRun } from './expeditions';
import type { FossilRun } from './fossils';
import type { GardenPlot } from './garden';
import { emptyHunt, type HuntState } from './hunt';
import { emptyLegends, type LegendState } from './legendary';
import { emptyMissions, type MissionsState } from './missions';
import { randomIvs, rollShiny, type PokemonInstance } from './pokemon';
import { rngFrom } from './rng';
import type { Ivs } from './stats';
import { emptyTower, type TowerState } from './tower';

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
  /** Avisos do sistema operacional quando algo acontece com o jogo em segundo plano. */
  notifications: boolean;
  /** Troca automática para a reserva com vantagem contra cada inimigo. */
  autoSwitch: boolean;
}

/** Efeito de status em andamento. `turns` conta as ações restantes de sono. */
export interface StatusState {
  kind: Ailment;
  turns?: number;
}

/** Amostra periódica dos totais, para o painel de estatísticas. */
export interface HistorySample {
  at: number;
  kills: number;
  exp: number;
  coins: number;
  captures: number;
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
  status?: StatusState;
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
  /** Status do Pokémon ativo; some ao fim de cada batalha ou na troca. */
  playerStatus?: StatusState | null;
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
  /** Reservas da equipe de batalha (uids), na ordem de entrada. */
  battleTeam: number[];
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
  /** Desafio da jornada atual (escolhido ao iniciar uma nova jornada). */
  challenge: ChallengeId | null;
  /** Desafios já concluídos ao menos uma vez. */
  challengesWon: ChallengeId[];
  history: HistorySample[];
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
  expEarned: number;
  coinsEarned: number;
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
  notifications: false,
  autoSwitch: true,
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
  expEarned: 0,
  coinsEarned: 0,
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
  /** A reserva entrou no lugar do ativo (desmaio ou vantagem de tipo). */
  | { type: 'switched'; uid: number; from: number; to: number; reason: 'fainted' | 'matchup' }
  | { type: 'statusDamage'; side: 'player' | 'enemy'; speciesId: number; status: Ailment; damage: number }
  | { type: 'statusSkip'; side: 'player' | 'enemy'; speciesId: number; status: Ailment }
  | { type: 'statusCured'; side: 'player' | 'enemy'; speciesId: number; status: Ailment }
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
    battleTeam: [],
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
    challenge: null,
    challengesWon: [],
    history: [],
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

/** Bolas que o desafio "Mochila vazia" tira das lojas (a Master Ball continua à venda). */
export const BALLS = new Set(['poke-ball', 'great-ball', 'ultra-ball']);

export function shopEntries(state: GameState): ShopEntry[] {
  return SHOP_CATALOG.filter(
    (e) =>
      (!e.requiresBoss || state.routes[e.requiresBoss]?.bossDefeated) &&
      !(state.challenge === 'frugal' && BALLS.has(e.id)),
  );
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
