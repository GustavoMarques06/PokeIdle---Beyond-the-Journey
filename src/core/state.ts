// Formato do estado do jogo, eventos e consultas. Sem regras de simulação:
// ver battle.ts (combate, recompensas, captura) e actions.ts (ações do jogador).

import {
  BALANCE,
  ROUTES,
  SHOP_CATALOG,
  SPECIAL_BALLS,
  STARTER_GENERATIONS,
  getRoute,
  getSpecies,
  lineRoot,
  type Ailment,
  type BossData,
  type BuffKind,
  type ChallengeId,
  type PlayerAvatar,
  type TrainerOutfit,
  type Route,
  type ShopEntry,
  type WaterMode,
  type StatKey,
} from '../game-data';
import { addToCollection } from './collection';
import { eliteItemOf, typeItemOf } from './loadout';
import { type DamageResult } from './combat';
import { emptyDaycare, type DaycareState, type Egg } from './daycare';
import { environmentAt, type Environment } from './env';
import { type RoamerState, type RocketState } from './events';
import type { ExpeditionRun } from './expeditions';
import type { FossilRun } from './fossils';
import type { MerchantState } from './market';
import type { CompanionState } from './companion';
import type { DexResearchEntry } from './dexresearch';
import type { MvpState } from './records';
import type { NuzlockeState } from './nuzlocke';
import type { PcState } from './pc';
import type { LuresState } from './lures';
import type { Gender } from './gender';
import type { SafariState } from './safari';
import type { TournamentState } from './tournament';
import type { GardenPlot } from './garden';
import { emptyHunt, type HuntState } from './hunt';
import { emptyLegends, type LegendState } from './legendary';
import { emptyMissions, type MissionsState } from './missions';
import { randomIvs, rollShiny, type PokemonInstance } from './pokemon';
import type { RaidState } from './raids';
import { rngFrom } from './rng';
import type { Evs, Ivs } from './stats';
import type { AutomationRules } from './automation';
import type { LinkState } from './link';
import type { TeamPreset, TeamSnapshot } from './presets';
import { emptyTower, type TowerState } from './tower';
import { emptyTournament } from './tournament';
import { emptyTraining, type TrainingState } from './training';

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
  /** Categorias de aviso desligadas (ver NOTIFY_CATEGORIES em ui/notify.ts). */
  notifyOff: string[];
  /** Troca automática para a reserva com vantagem contra cada inimigo. */
  autoSwitch: boolean;
  /** Velocidade das animações e do texto da batalha (1 = normal). */
  animSpeed: number;
  /** Contraste alto e texto maior. */
  highContrast: boolean;
  largeText: boolean;
  /** Automático: o ativo escolhe os golpes sozinho. Manual: a batalha espera o comando a cada vez. */
  battleMode: 'auto' | 'manual';
  /** Painel de próximos passos na coluna do menu. */
  nextSteps: boolean;
  /** Gráficos: desempenho (mais leve: sem clima, tons de dia/noite e efeitos pesados) ou normal. */
  graphics: 'performance' | 'normal';
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
  /** Item segurado (cai ao ser derrotado). */
  held?: string;
  abilitySlot?: 0 | 1 | 2;
  /** Efeitos de uma só vez por luta já gastos ('sturdy', 'sash', 'berry'). */
  used?: string[];
  /** Golpe de apoio: já usado por este inimigo, e os atributos que ele aumentou. */
  supportUsed?: boolean;
  supportBoost?: Partial<Record<StatKey, number>>;
  /** Raide: etapa de fúria (0 a 2). */
  rage?: number;
  /** Encontrado pescando ou surfando. */
  water?: WaterMode;
  /** Forma alternativa (Unown, Deerling, Spinda). */
  form?: string;
  /** Gênero sorteado ao aparecer (passa para o Pokémon capturado). */
  gender?: Gender;
  /** Tempo de luta contra este Pokémon (Quick Ball e Timer Ball). */
  elapsedMs?: number;
  /** Treinadores com Pokémon de verdade (duelo fantasma): natureza, EVs, golpes e apelido. */
  nature?: string;
  evs?: Evs;
  moveset?: string[];
  nickname?: string;
}

export type BattlePhase = 'spawning' | 'fighting' | 'victory' | 'defeat';
export type BattleKind = 'wild' | 'boss' | 'rocket' | 'tower' | 'legendary' | 'raid' | 'tournament' | 'ghost';

export interface TeamMember {
  speciesId: number;
  level: number;
  boost?: number;
  held?: string;
  abilitySlot?: 0 | 1 | 2;
  /** Pokémon de outro jogador (duelo fantasma): os dados dele em vez dos genéricos de treinador. */
  ivs?: Ivs;
  evs?: Evs;
  nature?: string;
  moveset?: string[];
  shiny?: boolean;
  form?: string;
  gender?: Gender;
  nickname?: string;
}

export interface TrainerInfo {
  sprite: string;
  /** Roupa (só nos avatares de jogador: o próprio, fantasmas e torneio). */
  outfit?: TrainerOutfit;
  name: string;
  title: string;
}

export interface BattleState {
  kind: BattleKind;
  /** Golpes de apoio do jogador nesta luta (contra um treinador, vale para o time inteiro dele): quem já usou e os aumentos. */
  supportUsed?: number[];
  supportBoosts?: Record<number, Partial<Record<StatKey, number>>>;
  /** Pausa da luta enquanto a bola balança depois de uma captura que falhou (ms). */
  holdMs?: number;
  /** Pausa quando aparece um shiny: dá tempo de ver e de lançar uma bola, que continua liberada (ms). */
  shinyPauseMs?: number;
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
  /** Duração do último intervalo do ativo (a barra de espera do modo manual). */
  playerIntervalMs?: number;
  enemyTimerMs: number;
  /** Status do Pokémon ativo; some ao fim de cada batalha ou na troca. */
  playerStatus?: StatusState | null;
  /** Efeitos de uma só vez por luta já gastos pelo ativo. */
  playerUsed?: string[];
  /** Raide: tempo restante (ms). */
  raidMs?: number;
  /** Revanche contra um chefe já vencido (sem insígnia, TM nem desbloqueios). */
  rematch?: boolean;
  /** Subida da Torre semanal (regra e andares da semana). */
  weekly?: boolean;
  /** Golpe escolhido pelo jogador para a próxima vez do ativo (LUTAR). */
  pendingMove?: string;
  /** Pokémon que Mega Evoluiu neste encontro (a forma some no próximo encontro ou na troca). */
  megaUid?: number;
  /** Duelo fantasma: a equipe enfrentada (id em `link.ghosts`). */
  ghostId?: string;
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
  /** Cores escolhidas para as peças de roupa do avatar. */
  trainerOutfit: TrainerOutfit;
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
  /** O resto da equipe (uids), na ordem de entrada; quem luta é `activeUid`. */
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
  training: TrainingState;
  raid: RaidState | null;
  nextRaidAt: number;
  /** Quando cada chefe aceita uma revanche (por rota). */
  rematchAt: Record<string, number>;
  /** Desafio da jornada atual (escolhido ao iniciar uma nova jornada). */
  challenge: ChallengeId | null;
  /** Desafios já concluídos ao menos uma vez. */
  challengesWon: ChallengeId[];
  history: HistorySample[];
  /** Onde o jogador procura Pokémon: na grama, pescando ou surfando (se a rota tiver água). */
  encounterMode: EncounterMode;
  merchant: MerchantState | null;
  nextMerchantAt: number;
  /** Medalhas (ids de conquistas) expostas no cartão de treinador. */
  showcase: string[];
  /** Moldura escolhida para o cartão de treinador. */
  cardFrame: string;
  /** Jogo do Safari em andamento. */
  safari: SafariState | null;
  /** Quando cada árvore de berry selvagem dá frutos de novo (por rota; ausente = pronta). */
  berryTrees: Record<string, number>;
  tournament: TournamentState;
  companion: CompanionState | null;
  /** Diário de pesquisa por espécie. */
  dexResearch: Record<number, DexResearchEntry>;
  /** Formas já capturadas por espécie. */
  forms: Record<number, string[]>;
  /** Vitórias da semana por Pokémon (MVP da semana). */
  mvp: MvpState;
  /** Regras do desafio Nuzlocke na jornada atual (áreas já usadas e quem caiu). */
  nuzlocke?: NuzlockeState;
  /** Nomes das etiquetas da Caixa que o jogador mudou (ver boxes.ts). */
  tagNames?: Partial<Record<NonNullable<PokemonInstance['tag']>, string>>;
  /** Onde cada Pokémon está no PC (caixas, nomes e papéis de parede; ver pc.ts). */
  pc?: PcState;
  /** Repelente e incenso ativos (ver lures.ts). */
  lures?: LuresState;
  /** Regras de automação (ver automation.ts). */
  automation?: Partial<AutomationRules>;
  /** Equipes salvas (ver presets.ts). */
  presets?: TeamPreset[];
  /** Equipe que volta a campo quando o desafio atual acabar (null = nenhuma). */
  presetReturn?: TeamSnapshot | null;
  /** Cabo Link: trocas enviadas, códigos recebidos e equipes fantasma (ver link.ts). */
  link?: LinkState;
}

export type EncounterMode = 'land' | WaterMode;

/** Colocação no torneio da semana. */
export type TournamentPlace = 'champion' | 'final' | 'semi' | 'quarter';

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
  waterKills: number;
  raidWins: number;
  rematchWins: number;
  itemsSold: number;
  merchantBuys: number;
  safariCaptures: number;
  wildHarvests: number;
  tournamentTitles: number;
  autoTransferred: number;
  tradesSent: number;
  tradesReceived: number;
  ghostWins: number;
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
  notifyOff: [],
  autoSwitch: true,
  animSpeed: 1,
  highContrast: false,
  largeText: false,
  battleMode: 'auto',
  nextSteps: true,
  graphics: 'normal',
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
  waterKills: 0,
  raidWins: 0,
  rematchWins: 0,
  itemsSold: 0,
  merchantBuys: 0,
  safariCaptures: 0,
  wildHarvests: 0,
  tournamentTitles: 0,
  autoTransferred: 0,
  tradesSent: 0,
  tradesReceived: 0,
  ghostWins: 0,
};

export type EffectKind = 'sturdy' | 'sash' | 'berry' | 'cure' | 'absorb' | 'synchronize' | 'drain' | 'recoil';

export type GameEvent =
  | {
      type: 'spawn';
      speciesId: number;
      level: number;
      shiny: boolean;
      boss: boolean;
      raid?: boolean;
      roamer?: boolean;
      perfect?: boolean;
      legendary?: boolean;
      water?: WaterMode;
    }
  | { type: 'attack'; side: 'player' | 'enemy'; attacker: number; target: number; result: DamageResult }
  | { type: 'enemyFainted'; speciesId: number; exp: number; coins: number }
  | { type: 'playerFainted'; speciesId: number }
  /** A reserva entrou no lugar do ativo (desmaio ou vantagem de tipo). */
  | { type: 'megaEvolved'; uid: number; speciesId: number; form: string }
  | { type: 'switched'; uid: number; from: number; to: number; reason: 'fainted' | 'matchup' | 'manual' }
  | { type: 'ranAway'; speciesId: number }
  | { type: 'statusDamage'; side: 'player' | 'enemy'; speciesId: number; status: Ailment; damage: number }
  | { type: 'statusSkip'; side: 'player' | 'enemy'; speciesId: number; status: Ailment }
  | { type: 'statusCured'; side: 'player' | 'enemy'; speciesId: number; status: Ailment }
  | { type: 'levelUp'; uid: number; speciesId: number; level: number }
  | { type: 'learnedMove'; uid: number; speciesId: number; move: string }
  | { type: 'evolved'; uid: number; from: number; to: number }
  | { type: 'evolutionReady'; uid: number; speciesId: number; to: number }
  | {
      type: 'supportMove';
      side: 'player' | 'enemy';
      speciesId: number;
      target: number;
      move: string;
      outcome: 'ailment' | 'boost' | 'heal' | 'miss' | 'immune';
      ailment?: Ailment;
      amount?: number;
    }
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
  /** Habilidade ou item entrou em ação (Robustez, Faixa Foco, berries, absorções…). */
  | {
      type: 'effect';
      side: 'player' | 'enemy';
      speciesId: number;
      kind: EffectKind;
      item?: string;
      /** HP recuperado (berry, absorção). */
      amount?: number;
    }
  | { type: 'itemFound'; item: string; qty: number }
  | { type: 'raidAppeared'; speciesId: number }
  | { type: 'raidLeft'; speciesId: number }
  | { type: 'raidRage'; speciesId: number; stage: number }
  | { type: 'raidFailed'; speciesId: number }
  | {
      type: 'raidDefeated';
      speciesId: number;
      coins: number;
      items: Record<string, number>;
      caught?: { uid: number; shiny: boolean; isNew: boolean };
    }
  | { type: 'rematchDefeated'; routeId: string; coins: number; items: Record<string, number> }
  | { type: 'trainingFull'; uid: number; stat: string }
  | { type: 'merchantAppeared' }
  | { type: 'merchantLeft' }
  | { type: 'companionFound'; uid: number; speciesId: number; item: string }
  | { type: 'researchComplete'; speciesId: number }
  | {
      type: 'safariResult';
      speciesId: number;
      action: 'ball' | 'bait' | 'rock' | 'run';
      outcome: 'caught' | 'missed' | 'fled' | 'stayed' | 'left';
    }
  | { type: 'safariEnded'; caught: number }
  | {
      type: 'tournamentMatch';
      round: number;
      opponent: string;
      won: boolean;
      score: [number, number];
      coins: number;
    }
  | { type: 'tournamentEnded'; place: TournamentPlace }
  | { type: 'missionDone'; id: string }
  | { type: 'missionsRefreshed'; scope: 'daily' | 'weekly' }
  | { type: 'weatherChanged'; weather: string }
  /** O desafio da jornada falhou (Nuzlocke sem ninguém para lutar). */
  | { type: 'challengeFailed'; challenge: ChallengeId }
  /** Regras de automação em ação. */
  | { type: 'autoTransferred'; count: number; points: number }
  | { type: 'autoHarvested'; berry: string; qty: number; replanted: boolean }
  | { type: 'autoClaimed'; id: string }
  /** Cabo Link. */
  | { type: 'tradeReceived'; uid: number; speciesId: number; from: string; evolvedTo?: number }
  | { type: 'ghostDuelEnded'; name: string; won: boolean; coins: number };

// ---------------------------------------------------------------------------
// Criação e consultas

export function newGame(
  starterId: number,
  now: number,
  seed: number,
  trainerName = 'Treinador',
  trainerAvatar: PlayerAvatar = 'red',
  trainerOutfit: TrainerOutfit = {},
): GameState {
  const state: GameState = {
    trainerName: trainerName.trim().slice(0, 12) || 'Treinador',
    trainerAvatar,
    trainerOutfit,
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
    training: emptyTraining(),
    raid: null,
    nextRaidAt: 0,
    rematchAt: {},
    challenge: null,
    challengesWon: [],
    history: [],
    encounterMode: 'land',
    merchant: null,
    nextMerchantAt: 0,
    showcase: [],
    cardFrame: 'basic',
    safari: null,
    berryTrees: {},
    tournament: emptyTournament(),
    companion: null,
    dexResearch: {},
    forms: {},
    mvp: { week: 0, wins: {} },
    tagNames: {},
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
export const BALLS = new Set(['poke-ball', 'great-ball', 'ultra-ball', ...SPECIAL_BALLS]);

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
export function resolveBossTeam(state: GameState, boss: BossData, rematch = false): TeamMember[] {
  const extra = boss.rival ? BALANCE.rival.levelsPerPrestige * state.prestige.count : 0;
  const re = rematch ? BALANCE.rematch.levelBonus : 0;
  const lastIndex = boss.team.length - 1;
  return boss.team.map((m, i) => {
    const speciesId = 'speciesId' in m ? m.speciesId : rivalSpecies(state, m.rivalStage);
    return {
      speciesId,
      level: Math.min(BALANCE.maxLevel, m.level + extra + re),
      ...('form' in m && m.form ? { form: m.form } : {}),
      boost:
        (1 + ((boss.boost ?? 1) - 1) * BALANCE.combat.bossBoostScale) * (rematch ? BALANCE.rematch.boost : 1),
      ...bossLoadout(boss, speciesId, i === lastIndex, rematch),
    };
  });
}

/** Itens que o treinador dá a cada Pokémon: o ás segura um item do tipo; campeões e revanches, todos. */
function bossLoadout(
  boss: BossData,
  speciesId: number,
  ace: boolean,
  rematch: boolean,
): { held?: string; abilitySlot?: 0 | 1 | 2 } {
  const typeItem = typeItemOf(speciesId);
  if (boss.champion || rematch) {
    return { held: ace ? (typeItem ?? eliteItemOf(speciesId)) : eliteItemOf(speciesId), abilitySlot: 0 };
  }
  return ace && typeItem ? { held: typeItem, abilitySlot: 0 } : {};
}
