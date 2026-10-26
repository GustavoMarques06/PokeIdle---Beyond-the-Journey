// Conteúdo dos sistemas de longo prazo: bônus passivos, pesquisa, maestria,
// conquistas e prestígio. Só dados — as regras ficam em src/core.

import type { TypeName } from './types';

// --- Equipe passiva --------------------------------------------------------

export type BonusKind = 'damage' | 'defense' | 'speed' | 'exp' | 'coins' | 'capture' | 'heal';

/** Função de cada tipo quando o Pokémon está numa vaga passiva (usa o tipo primário). */
export const TYPE_ROLES: Record<TypeName, BonusKind> = {
  fire: 'damage',
  fighting: 'damage',
  dragon: 'damage',
  dark: 'damage',
  rock: 'defense',
  ground: 'defense',
  steel: 'defense',
  electric: 'speed',
  flying: 'speed',
  psychic: 'exp',
  ghost: 'exp',
  normal: 'coins',
  bug: 'capture',
  poison: 'capture',
  water: 'heal',
  grass: 'heal',
  ice: 'heal',
  fairy: 'heal',
};

export const PASSIVE = {
  /** Valor do bônus: base + porLevel × nível do Pokémon passivo. */
  base: { damage: 0.06, defense: 0.05, speed: 0.05, exp: 0.08, coins: 0.08, capture: 0.06, heal: 0.04 },
  perLevel: {
    damage: 0.004,
    defense: 0.003,
    speed: 0.003,
    exp: 0.005,
    coins: 0.005,
    capture: 0.004,
    heal: 0.002,
  },
  /** Teto de cada tipo de bônus somando todos os passivos. */
  caps: { damage: 0.6, defense: 0.45, speed: 0.4, exp: 0.75, coins: 0.75, capture: 0.6, heal: 0.4 },
  /** O 2º passivo com o mesmo bônus vale 50%, o 3º 25%… */
  stackFalloff: 0.5,
  /** Bônus de dano contra os tipos que o tipo do passivo vence. */
  typeAdvantage: { base: 0.08, perLevel: 0.002, cap: 0.4 },
} satisfies {
  base: Record<BonusKind, number>;
  perLevel: Record<BonusKind, number>;
  caps: Record<BonusKind, number>;
  stackFalloff: number;
  typeAdvantage: { base: number; perLevel: number; cap: number };
};

/** Vagas passivas e o que libera cada uma (rota concluída). */
export const PASSIVE_SLOTS: { requiresRoute: string }[] = [
  { requiresRoute: 'rota-1' },
  { requiresRoute: 'floresta-viridian' },
  { requiresRoute: 'mt-moon' },
  { requiresRoute: 'rota-4' },
];

// --- Laboratório / pesquisa ------------------------------------------------

export type ResearchEffect = 'exp' | 'coins' | 'capture' | 'heal' | 'offlineHours' | 'offlineEfficiency';

export interface ResearchDef {
  id: string;
  name: string;
  description: string;
  effect: ResearchEffect;
  perLevel: number;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const RESEARCH: ResearchDef[] = [
  {
    id: 'exp',
    name: 'Estudo de treino',
    description: '+5% EXP por nível.',
    effect: 'exp',
    perLevel: 0.05,
    maxLevel: 20,
    baseCost: 4,
    costGrowth: 1.3,
  },
  {
    id: 'coins',
    name: 'Economia',
    description: '+5% moedas por nível.',
    effect: 'coins',
    perLevel: 0.05,
    maxLevel: 20,
    baseCost: 4,
    costGrowth: 1.3,
  },
  {
    id: 'capture',
    name: 'Bolas aprimoradas',
    description: '+4% chance de captura por nível.',
    effect: 'capture',
    perLevel: 0.04,
    maxLevel: 10,
    baseCost: 6,
    costGrowth: 1.4,
  },
  {
    id: 'heal',
    name: 'Primeiros socorros',
    description: '+3% de cura após cada vitória por nível.',
    effect: 'heal',
    perLevel: 0.03,
    maxLevel: 10,
    baseCost: 5,
    costGrowth: 1.35,
  },
  {
    id: 'offline-hours',
    name: 'Diário de viagem',
    description: '+1 h de limite de progresso offline por nível.',
    effect: 'offlineHours',
    perLevel: 1,
    maxLevel: 16,
    baseCost: 8,
    costGrowth: 1.25,
  },
  {
    id: 'offline-eff',
    name: 'Treino autônomo',
    description: '+2% de eficiência offline por nível.',
    effect: 'offlineEfficiency',
    perLevel: 0.02,
    maxLevel: 10,
    baseCost: 10,
    costGrowth: 1.4,
  },
];

export const RESEARCH_POINTS = {
  /** Por transferir um Pokémon: base + nível ÷ 10 (+ bônus por shiny e potencial alto). */
  transferBase: 1,
  transferPerTenLevels: 1,
  transferShiny: 25,
  transferHighPotential: 2,
  highPotentialThreshold: 80,
  /** Por registrar uma espécie nova como capturada. */
  newSpecies: 3,
};

// --- Maestria ---------------------------------------------------------------

/** Vitórias acumuladas (por linha evolutiva) para cada nível de maestria. */
export const MASTERY_THRESHOLDS = [25, 100, 250, 500, 900, 1500, 2400, 3600, 5200, 7500];
/** Bônus de dano e redução de dano recebido por nível de maestria do Pokémon ativo. */
export const MASTERY_BONUS_PER_LEVEL = 0.02;

// --- Prestígio ---------------------------------------------------------------

export interface PrestigeDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
}

export const PRESTIGE_UPGRADES: PrestigeDef[] = [
  {
    id: 'power',
    name: 'Treinamento intenso',
    description: '+10% de dano por nível.',
    maxLevel: 10,
    baseCost: 2,
    costGrowth: 1.5,
  },
  {
    id: 'fortune',
    name: 'Fortuna',
    description: '+15% de EXP e moedas por nível.',
    maxLevel: 10,
    baseCost: 2,
    costGrowth: 1.5,
  },
  {
    id: 'veteran',
    name: 'Veterano',
    description: 'Pokémon recomeçam a jornada 5 níveis acima por nível.',
    maxLevel: 5,
    baseCost: 4,
    costGrowth: 1.8,
  },
  {
    id: 'supplies',
    name: 'Mochila cheia',
    description: 'Comece cada jornada com +10 Poké Balls e +150 moedas por nível.',
    maxLevel: 5,
    baseCost: 2,
    costGrowth: 1.6,
  },
  {
    id: 'shiny',
    name: 'Amuleto brilhante',
    description: '+50% de chance de shiny por nível.',
    maxLevel: 6,
    baseCost: 5,
    costGrowth: 1.7,
  },
];

export const PRESTIGE = {
  /** Chefe que precisa ter sido vencido para iniciar uma nova jornada. */
  requiresBoss: 'rota-4',
  pointsPerBoss: 2,
  pointsPerFiveSpecies: 1,
  pointsPerTenLevels: 1,
  baseResetLevel: 5,
};

// --- Conquistas ----------------------------------------------------------------

export type AchievementGoal =
  | { kind: 'kills'; n: number }
  | { kind: 'captures'; n: number }
  | { kind: 'species'; n: number }
  | { kind: 'evolutions'; n: number }
  | { kind: 'boss'; routeId: string }
  | { kind: 'shiny' }
  | { kind: 'level'; n: number }
  | { kind: 'mastery'; n: number }
  | { kind: 'prestige'; n: number }
  | { kind: 'passives'; n: number };

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  goal: AchievementGoal;
  reward: { research?: number; coins?: number };
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'kills-50',
    name: 'Primeiros passos',
    description: 'Vença 50 batalhas.',
    goal: { kind: 'kills', n: 50 },
    reward: { coins: 100 },
  },
  {
    id: 'kills-500',
    name: 'Treinador dedicado',
    description: 'Vença 500 batalhas.',
    goal: { kind: 'kills', n: 500 },
    reward: { research: 5 },
  },
  {
    id: 'kills-5000',
    name: 'Incansável',
    description: 'Vença 5.000 batalhas.',
    goal: { kind: 'kills', n: 5000 },
    reward: { research: 20 },
  },
  {
    id: 'capture-1',
    name: 'Pego!',
    description: 'Capture seu primeiro Pokémon.',
    goal: { kind: 'captures', n: 1 },
    reward: { coins: 50 },
  },
  {
    id: 'capture-50',
    name: 'Colecionador',
    description: 'Capture 50 Pokémon.',
    goal: { kind: 'captures', n: 50 },
    reward: { research: 8 },
  },
  {
    id: 'species-10',
    name: 'Pesquisador de campo',
    description: 'Registre 10 espécies capturadas.',
    goal: { kind: 'species', n: 10 },
    reward: { research: 5 },
  },
  {
    id: 'species-25',
    name: 'Enciclopédia ambulante',
    description: 'Registre 25 espécies capturadas.',
    goal: { kind: 'species', n: 25 },
    reward: { research: 12 },
  },
  {
    id: 'species-50',
    name: 'Mestre da Pokédex',
    description: 'Registre 50 espécies capturadas.',
    goal: { kind: 'species', n: 50 },
    reward: { research: 30 },
  },
  {
    id: 'evolve-1',
    name: 'Algo está acontecendo…',
    description: 'Evolua um Pokémon.',
    goal: { kind: 'evolutions', n: 1 },
    reward: { coins: 150 },
  },
  {
    id: 'evolve-10',
    name: 'Darwin ficaria orgulhoso',
    description: 'Evolua 10 Pokémon.',
    goal: { kind: 'evolutions', n: 10 },
    reward: { research: 8 },
  },
  {
    id: 'boss-brock',
    name: 'Insígnia da Rocha',
    description: 'Vença Brock.',
    goal: { kind: 'boss', routeId: 'floresta-viridian' },
    reward: { research: 3 },
  },
  {
    id: 'boss-rocket',
    name: 'Fora, Equipe Rocket!',
    description: 'Vença o Recruta Rocket no Mt. Moon.',
    goal: { kind: 'boss', routeId: 'mt-moon' },
    reward: { research: 5 },
  },
  {
    id: 'boss-misty',
    name: 'Insígnia da Cascata',
    description: 'Vença Misty.',
    goal: { kind: 'boss', routeId: 'rota-4' },
    reward: { research: 8 },
  },
  {
    id: 'shiny',
    name: 'Brilho raro',
    description: 'Capture um Pokémon shiny.',
    goal: { kind: 'shiny' },
    reward: { research: 15 },
  },
  {
    id: 'level-30',
    name: 'Parceiro forte',
    description: 'Tenha um Pokémon no nível 30.',
    goal: { kind: 'level', n: 30 },
    reward: { research: 5 },
  },
  {
    id: 'level-60',
    name: 'Lenda local',
    description: 'Tenha um Pokémon no nível 60.',
    goal: { kind: 'level', n: 60 },
    reward: { research: 15 },
  },
  {
    id: 'mastery-5',
    name: 'Sintonia',
    description: 'Atinja maestria 5 com uma linha evolutiva.',
    goal: { kind: 'mastery', n: 5 },
    reward: { research: 10 },
  },
  {
    id: 'passives-4',
    name: 'Time completo',
    description: 'Preencha 4 vagas passivas.',
    goal: { kind: 'passives', n: 4 },
    reward: { research: 6 },
  },
  {
    id: 'prestige-1',
    name: 'Além da jornada',
    description: 'Comece uma nova jornada (prestígio).',
    goal: { kind: 'prestige', n: 1 },
    reward: { research: 10 },
  },
];
