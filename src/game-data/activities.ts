// Conteúdo das atividades: berries, missões, recompensas da Pokédex, Torre de Batalha e
// Game Corner. Só dados — as regras ficam em src/core.

import type { TypeName } from './types';

// --- Jardim de berries ---------------------------------------------------------------

export type BuffKind = 'damage' | 'exp' | 'coins' | 'capture' | 'heal' | 'speed' | 'shiny';

export interface BerryDef {
  id: string;
  /** Tempo real até a colheita. */
  growMinutes: number;
  /** Quantas berries a planta rende. */
  yield: [number, number];
  /** Efeito ao comer: um bônus temporário (em tempo de jogo). */
  buff: { kind: BuffKind; value: number; minutes: number };
  /** Preço no Poké Mart (0 = não vende). */
  price: number;
}

export const BERRIES: BerryDef[] = [
  {
    id: 'oran-berry',
    growMinutes: 30,
    yield: [2, 4],
    buff: { kind: 'heal', value: 0.15, minutes: 20 },
    price: 150,
  },
  {
    id: 'pecha-berry',
    growMinutes: 60,
    yield: [2, 4],
    buff: { kind: 'coins', value: 0.25, minutes: 30 },
    price: 600,
  },
  {
    id: 'cheri-berry',
    growMinutes: 120,
    yield: [2, 4],
    buff: { kind: 'damage', value: 0.15, minutes: 30 },
    price: 400,
  },
  {
    id: 'leppa-berry',
    growMinutes: 180,
    yield: [2, 3],
    buff: { kind: 'exp', value: 0.25, minutes: 30 },
    price: 700,
  },
  {
    id: 'razz-berry',
    growMinutes: 240,
    yield: [2, 3],
    buff: { kind: 'capture', value: 0.3, minutes: 30 },
    price: 500,
  },
  {
    id: 'persim-berry',
    growMinutes: 360,
    yield: [2, 3],
    buff: { kind: 'speed', value: 0.15, minutes: 45 },
    price: 0,
  },
  {
    id: 'sitrus-berry',
    growMinutes: 480,
    yield: [1, 3],
    buff: { kind: 'heal', value: 0.3, minutes: 60 },
    price: 0,
  },
  {
    id: 'lum-berry',
    growMinutes: 720,
    yield: [1, 2],
    buff: { kind: 'shiny', value: 1, minutes: 30 },
    price: 0,
  },
];

// --- Missões -------------------------------------------------------------------------

export type MissionKind =
  | 'kills'
  | 'captures'
  | 'capture-type'
  | 'evolutions'
  | 'bosses'
  | 'hatch'
  | 'hatch-type'
  | 'harvest'
  | 'expeditions'
  | 'tower-floors'
  | 'slots';

export interface MissionTemplate {
  kind: MissionKind;
  /** Alvos possíveis (o sorteio escolhe um). */
  targets: number[];
  /** Recompensa por unidade de alvo (multiplicada pelo alvo). */
  reward: { coins?: number; research?: number; items?: Record<string, number>; tokens?: number };
  /** Atividade que precisa estar liberada para a missão ser sorteada. */
  requires?: 'daycare' | 'expeditions' | 'garden' | 'tower' | 'gamecorner';
}

export const DAILY_MISSIONS: MissionTemplate[] = [
  { kind: 'kills', targets: [80, 120, 200], reward: { coins: 4 } },
  { kind: 'captures', targets: [3, 5, 8], reward: { items: { 'great-ball': 1 } } },
  { kind: 'capture-type', targets: [2, 3, 4], reward: { items: { 'ultra-ball': 1 } } },
  { kind: 'evolutions', targets: [1, 2], reward: { research: 3 } },
  { kind: 'bosses', targets: [1, 2], reward: { coins: 400 } },
  { kind: 'hatch', targets: [1, 2], reward: { research: 3 }, requires: 'daycare' },
  { kind: 'hatch-type', targets: [1], reward: { coins: 600 }, requires: 'daycare' },
  { kind: 'harvest', targets: [4, 8], reward: { coins: 60 }, requires: 'garden' },
  { kind: 'expeditions', targets: [1, 2], reward: { research: 2 }, requires: 'expeditions' },
  { kind: 'tower-floors', targets: [5, 10], reward: { tokens: 20 }, requires: 'tower' },
  { kind: 'slots', targets: [10, 20], reward: { tokens: 6 }, requires: 'gamecorner' },
];

export const WEEKLY_MISSIONS: MissionTemplate[] = [
  { kind: 'kills', targets: [1500, 2500], reward: { coins: 6, research: 0 } },
  { kind: 'captures', targets: [25, 40], reward: { items: { 'ultra-ball': 1 }, research: 1 } },
  { kind: 'evolutions', targets: [5, 8], reward: { research: 4, items: { 'rare-candy': 1 } } },
  { kind: 'bosses', targets: [5, 8], reward: { coins: 1500 } },
  { kind: 'hatch', targets: [5, 10], reward: { research: 4 }, requires: 'daycare' },
  { kind: 'hatch-type', targets: [3, 4], reward: { coins: 900 }, requires: 'daycare' },
  {
    kind: 'expeditions',
    targets: [6, 10],
    reward: { research: 3, items: { 'rare-candy': 1 } },
    requires: 'expeditions',
  },
  { kind: 'tower-floors', targets: [40, 60], reward: { tokens: 30 }, requires: 'tower' },
];

// --- Recompensas da Pokédex --------------------------------------------------------------

export interface DexMilestone {
  id: string;
  /** Espécies capturadas necessárias. */
  caught: number;
  reward: { coins?: number; research?: number; items?: Record<string, number> };
  /** Bônus permanentes. */
  bonus?: { exp?: number; coins?: number; capture?: number; shiny?: number };
}

export const DEX_MILESTONES: DexMilestone[] = [
  { id: 'dex-10', caught: 10, reward: { items: { 'great-ball': 10 } }, bonus: { capture: 0.05 } },
  { id: 'dex-25', caught: 25, reward: { research: 10 }, bonus: { exp: 0.05 } },
  { id: 'dex-50', caught: 50, reward: { items: { 'ultra-ball': 10 } }, bonus: { coins: 0.1 } },
  { id: 'dex-75', caught: 75, reward: { items: { 'rare-candy': 3 } }, bonus: { exp: 0.1 } },
  { id: 'dex-100', caught: 100, reward: { research: 25 }, bonus: { capture: 0.1, shiny: 0.25 } },
  { id: 'dex-150', caught: 150, reward: { items: { 'master-ball': 1 } }, bonus: { coins: 0.15 } },
  { id: 'dex-200', caught: 200, reward: { research: 40 }, bonus: { exp: 0.15 } },
  {
    id: 'dex-300',
    caught: 300,
    reward: { items: { 'master-ball': 1, 'rare-candy': 10 } },
    bonus: { shiny: 0.5 },
  },
  { id: 'dex-400', caught: 400, reward: { research: 80 }, bonus: { exp: 0.2, coins: 0.2 } },
];

/** Completar todas as espécies de um tipo dá dano extra com golpes desse tipo. */
export const TYPE_MEDAL_BONUS = 0.1;
export const TYPE_MEDAL_TYPES: TypeName[] = [
  'normal',
  'fire',
  'water',
  'grass',
  'electric',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
];

// --- Torre de Batalha -----------------------------------------------------------------------

export interface TowerShopEntry {
  id: string;
  name: string;
  price: number;
  give: { items?: Record<string, number>; research?: number; tm?: true };
}

export const TOWER_SHOP: TowerShopEntry[] = [
  { id: 'tm', name: 'TM aleatória', price: 25, give: { tm: true } },
  { id: 'ultra', name: '10 Ultra Balls', price: 15, give: { items: { 'ultra-ball': 10 } } },
  { id: 'candy', name: '3 Rare Candies', price: 20, give: { items: { 'rare-candy': 3 } } },
  { id: 'research', name: '10 pontos de pesquisa', price: 30, give: { research: 10 } },
  { id: 'master', name: 'Master Ball', price: 300, give: { items: { 'master-ball': 1 } } },
];

// --- Torre semanal -------------------------------------------------------------------------------
// Toda segunda-feira a Torre ganha uma regra nova: um tipo obrigatório para a equipe e um
// modificador. Os andares saem de uma semente da semana, então são os mesmos para todos.

/** Tipos na ordem da rotação (um por semana). */
export const WEEKLY_TOWER_TYPES = [
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'fighting',
  'dragon',
  'ghost',
  'steel',
  'ice',
  'dark',
  'fairy',
  'ground',
  'rock',
  'flying',
  'bug',
  'poison',
  'normal',
] as const;

export interface WeeklyTowerMod {
  id: string;
  name: string;
  description: string;
  /** Multiplicador extra nos atributos dos inimigos. */
  boost?: number;
  /** Fração do HP recuperada entre andares (padrão: a da Torre normal). */
  heal?: number;
  /** Andar em que a subida começa. */
  startFloor?: number;
}

export const WEEKLY_TOWER_MODS: WeeklyTowerMod[] = [
  { id: 'classic', name: 'Clássica', description: 'Sem regra extra.' },
  { id: 'fierce', name: 'Feroz', description: 'Os inimigos têm +15% em todos os atributos.', boost: 1.15 },
  { id: 'no-rest', name: 'Sem descanso', description: 'Ninguém se cura entre os andares.', heal: 0 },
  { id: 'summit', name: 'Direto ao topo', description: 'A subida começa no andar 21.', startFloor: 21 },
];

/** Marcos da semana: o andar e os BP extras (uma vez por semana cada). */
export const WEEKLY_TOWER_MILESTONES: { floor: number; bp: number }[] = [
  { floor: 10, bp: 20 },
  { floor: 25, bp: 40 },
  { floor: 40, bp: 80 },
  { floor: 60, bp: 120 },
  { floor: 100, bp: 250 },
];

// --- Game Corner ---------------------------------------------------------------------------------

export interface SlotSymbol {
  id: string;
  /** Ícone: item da PokéAPI ou espécie. */
  icon: { item?: string; speciesId?: number };
  weight: number;
  /** Prêmio (em fichas) para três iguais. */
  three: number;
  /** Prêmio para os dois primeiros iguais (o terceiro diferente). */
  two: number;
}

/** Aposta por giro e prêmio para uma cereja só no primeiro rolo. */
export const SLOT_BET = 3;
export const SLOT_SINGLE_CHERRY = 2;

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'seven', icon: { item: 'star-piece' }, weight: 2, three: 600, two: 40 },
  { id: 'bar', icon: { item: 'nugget' }, weight: 4, three: 250, two: 20 },
  { id: 'pikachu', icon: { speciesId: 25 }, weight: 7, three: 80, two: 12 },
  { id: 'marill', icon: { speciesId: 183 }, weight: 9, three: 40, two: 8 },
  { id: 'cherry', icon: { item: 'cheri-berry' }, weight: 14, three: 20, two: 6 },
  { id: 'replay', icon: { item: 'poke-ball' }, weight: 18, three: 9, two: 3 },
];

// --- Lendários ------------------------------------------------------------------------------------

export interface LegendaryDef {
  /** 'pseudo' = quase lendário (mais fácil de capturar). */
  tier?: 'legendary' | 'pseudo';
  /** Número na Pokédex nacional. */
  speciesId: number;
  regionId: string;
  level: number;
  /** Multiplicador de atributos. */
  boost: number;
}

/** Rota cujo chefe (o Campeão) precisa ter sido vencido para liberar os lendários da região. */
export const LEGENDARY_REGION_UNLOCK: Record<string, string> = {
  kanto: 'liga-campeao',
  johto: 'johto-liga-campeao',
  hoenn: 'hoenn-liga-campeao',
  sinnoh: 'sinnoh-liga-campeao',
  unova: 'unova-liga-campeao',
  kalos: 'kalos-liga-campeao',
  alola: 'alola-liga-campeao',
};

export const LEGENDARIES: LegendaryDef[] = [
  { speciesId: 149, regionId: 'kanto', level: 60, boost: 1.05, tier: 'pseudo' }, // Dragonite
  { speciesId: 248, regionId: 'johto', level: 78, boost: 1.05, tier: 'pseudo' }, // Tyranitar
  { speciesId: 373, regionId: 'hoenn', level: 86, boost: 1.05, tier: 'pseudo' }, // Salamence
  { speciesId: 376, regionId: 'hoenn', level: 86, boost: 1.05, tier: 'pseudo' }, // Metagross
  { speciesId: 445, regionId: 'sinnoh', level: 90, boost: 1.05, tier: 'pseudo' }, // Garchomp
  { speciesId: 635, regionId: 'unova', level: 96, boost: 1.05, tier: 'pseudo' }, // Hydreigon
  { speciesId: 144, regionId: 'kanto', level: 62, boost: 1.1 }, // Articuno
  { speciesId: 145, regionId: 'kanto', level: 62, boost: 1.1 }, // Zapdos
  { speciesId: 146, regionId: 'kanto', level: 62, boost: 1.1 }, // Moltres
  { speciesId: 150, regionId: 'kanto', level: 70, boost: 1.25 }, // Mewtwo
  { speciesId: 151, regionId: 'kanto', level: 65, boost: 1.15 }, // Mew
  { speciesId: 243, regionId: 'johto', level: 80, boost: 1.1 }, // Raikou
  { speciesId: 244, regionId: 'johto', level: 80, boost: 1.1 }, // Entei
  { speciesId: 245, regionId: 'johto', level: 80, boost: 1.1 }, // Suicune
  { speciesId: 249, regionId: 'johto', level: 85, boost: 1.2 }, // Lugia
  { speciesId: 250, regionId: 'johto', level: 85, boost: 1.2 }, // Ho-Oh
  { speciesId: 251, regionId: 'johto', level: 80, boost: 1.1 }, // Celebi
  { speciesId: 377, regionId: 'hoenn', level: 88, boost: 1.1 }, // Regirock
  { speciesId: 378, regionId: 'hoenn', level: 88, boost: 1.1 }, // Regice
  { speciesId: 379, regionId: 'hoenn', level: 88, boost: 1.1 }, // Registeel
  { speciesId: 380, regionId: 'hoenn', level: 90, boost: 1.15 }, // Latias
  { speciesId: 381, regionId: 'hoenn', level: 90, boost: 1.15 }, // Latios
  { speciesId: 382, regionId: 'hoenn', level: 92, boost: 1.2 }, // Kyogre
  { speciesId: 383, regionId: 'hoenn', level: 92, boost: 1.2 }, // Groudon
  { speciesId: 384, regionId: 'hoenn', level: 95, boost: 1.25 }, // Rayquaza
  { speciesId: 385, regionId: 'hoenn', level: 88, boost: 1.1 }, // Jirachi
  { speciesId: 386, regionId: 'hoenn', level: 90, boost: 1.15 }, // Deoxys
  { speciesId: 480, regionId: 'sinnoh', level: 92, boost: 1.1 }, // Uxie
  { speciesId: 481, regionId: 'sinnoh', level: 92, boost: 1.1 }, // Mesprit
  { speciesId: 482, regionId: 'sinnoh', level: 92, boost: 1.1 }, // Azelf
  { speciesId: 485, regionId: 'sinnoh', level: 95, boost: 1.2 }, // Heatran
  { speciesId: 483, regionId: 'sinnoh', level: 96, boost: 1.2 }, // Dialga
  { speciesId: 484, regionId: 'sinnoh', level: 96, boost: 1.2 }, // Palkia
  { speciesId: 487, regionId: 'sinnoh', level: 97, boost: 1.2 }, // Giratina
  { speciesId: 486, regionId: 'sinnoh', level: 95, boost: 1.15 }, // Regigigas
  { speciesId: 488, regionId: 'sinnoh', level: 92, boost: 1.1 }, // Cresselia
  { speciesId: 489, regionId: 'sinnoh', level: 90, boost: 1.05 }, // Phione
  { speciesId: 490, regionId: 'sinnoh', level: 92, boost: 1.1 }, // Manaphy
  { speciesId: 491, regionId: 'sinnoh', level: 94, boost: 1.15 }, // Darkrai
  { speciesId: 492, regionId: 'sinnoh', level: 94, boost: 1.1 }, // Shaymin
  { speciesId: 493, regionId: 'sinnoh', level: 100, boost: 1.3 }, // Arceus
  { speciesId: 638, regionId: 'unova', level: 98, boost: 1.1 }, // Cobalion
  { speciesId: 639, regionId: 'unova', level: 98, boost: 1.1 }, // Terrakion
  { speciesId: 640, regionId: 'unova', level: 98, boost: 1.1 }, // Virizion
  { speciesId: 641, regionId: 'unova', level: 100, boost: 1.2 }, // Tornadus
  { speciesId: 642, regionId: 'unova', level: 100, boost: 1.2 }, // Thundurus
  { speciesId: 645, regionId: 'unova', level: 100, boost: 1.2 }, // Landorus
  { speciesId: 494, regionId: 'unova', level: 98, boost: 1.1 }, // Victini
  { speciesId: 643, regionId: 'unova', level: 100, boost: 1.25 }, // Reshiram
  { speciesId: 644, regionId: 'unova', level: 100, boost: 1.25 }, // Zekrom
  { speciesId: 646, regionId: 'unova', level: 100, boost: 1.2 }, // Kyurem
  { speciesId: 647, regionId: 'unova', level: 98, boost: 1.1 }, // Keldeo
  { speciesId: 648, regionId: 'unova', level: 99, boost: 1.1 }, // Meloetta
  { speciesId: 649, regionId: 'unova', level: 100, boost: 1.15 }, // Genesect
  { speciesId: 706, regionId: 'kalos', level: 100, boost: 1.3, tier: 'pseudo' }, // Goodra
  { speciesId: 716, regionId: 'kalos', level: 100, boost: 1.45 }, // Xerneas
  { speciesId: 717, regionId: 'kalos', level: 100, boost: 1.45 }, // Yveltal
  { speciesId: 718, regionId: 'kalos', level: 100, boost: 1.5 }, // Zygarde
  { speciesId: 719, regionId: 'kalos', level: 100, boost: 1.35 }, // Diancie
  { speciesId: 720, regionId: 'kalos', level: 100, boost: 1.4 }, // Hoopa
  { speciesId: 721, regionId: 'kalos', level: 100, boost: 1.4 }, // Volcanion
  // Alola: os guardiões das ilhas, a dupla do sol e da lua, as Ultra Bestas e os míticos. Cosmog, Poipole e Meltan
  // vêm em nível baixo para evoluírem treinando, como nos jogos.
  { speciesId: 784, regionId: 'alola', level: 100, boost: 1.5, tier: 'pseudo' }, // Kommo-o
  { speciesId: 772, regionId: 'alola', level: 60, boost: 1.2 }, // Type: Null
  { speciesId: 785, regionId: 'alola', level: 100, boost: 1.55 }, // Tapu Koko
  { speciesId: 786, regionId: 'alola', level: 100, boost: 1.55 }, // Tapu Lele
  { speciesId: 787, regionId: 'alola', level: 100, boost: 1.55 }, // Tapu Bulu
  { speciesId: 788, regionId: 'alola', level: 100, boost: 1.55 }, // Tapu Fini
  { speciesId: 789, regionId: 'alola', level: 30, boost: 1 }, // Cosmog
  { speciesId: 791, regionId: 'alola', level: 100, boost: 1.65 }, // Solgaleo
  { speciesId: 792, regionId: 'alola', level: 100, boost: 1.65 }, // Lunala
  { speciesId: 793, regionId: 'alola', level: 100, boost: 1.5 }, // Nihilego
  { speciesId: 794, regionId: 'alola', level: 100, boost: 1.5 }, // Buzzwole
  { speciesId: 795, regionId: 'alola', level: 100, boost: 1.5 }, // Pheromosa
  { speciesId: 796, regionId: 'alola', level: 100, boost: 1.5 }, // Xurkitree
  { speciesId: 797, regionId: 'alola', level: 100, boost: 1.5 }, // Celesteela
  { speciesId: 798, regionId: 'alola', level: 100, boost: 1.5 }, // Kartana
  { speciesId: 799, regionId: 'alola', level: 100, boost: 1.5 }, // Guzzlord
  { speciesId: 803, regionId: 'alola', level: 30, boost: 1 }, // Poipole
  { speciesId: 805, regionId: 'alola', level: 100, boost: 1.5 }, // Stakataka
  { speciesId: 806, regionId: 'alola', level: 100, boost: 1.5 }, // Blacephalon
  { speciesId: 800, regionId: 'alola', level: 100, boost: 1.7 }, // Necrozma
  { speciesId: 801, regionId: 'alola', level: 100, boost: 1.5 }, // Magearna
  { speciesId: 802, regionId: 'alola', level: 100, boost: 1.55 }, // Marshadow
  { speciesId: 807, regionId: 'alola', level: 100, boost: 1.55 }, // Zeraora
  { speciesId: 808, regionId: 'alola', level: 25, boost: 1 }, // Meltan
];

type LegendWeather = 'clear' | 'sun' | 'rain' | 'sand' | 'fog' | 'hail';

/**
 * Quando cada lendário é avistado: com um destes climas OU num destes períodos do dia (o que vier). Quem não está aqui
 * aparece a qualquer hora. Os climas mudam a cada 2 h, então cada um tem as suas janelas, como nos jogos.
 */
export const LEGEND_WHEN: Record<number, { weather?: LegendWeather[]; period?: ('day' | 'night')[] }> = {
  144: { weather: ['hail', 'fog'], period: ['night'] }, // Articuno
  145: { weather: ['rain'], period: ['day'] }, // Zapdos
  146: { weather: ['sun', 'clear'] }, // Moltres
  151: { weather: ['fog', 'clear'] }, // Mew
  243: { weather: ['rain'], period: ['night'] }, // Raikou
  244: { weather: ['sun'], period: ['day'] }, // Entei
  245: { weather: ['rain', 'fog'] }, // Suicune
  249: { weather: ['rain'], period: ['night'] }, // Lugia
  250: { weather: ['sun', 'clear'], period: ['day'] }, // Ho-Oh
  251: { period: ['day'] }, // Celebi
  377: { weather: ['sand'], period: ['day'] }, // Regirock
  378: { weather: ['hail'], period: ['night'] }, // Regice
  379: { weather: ['clear', 'fog'] }, // Registeel
  382: { weather: ['rain'] }, // Kyogre
  383: { weather: ['sun'] }, // Groudon
  385: { period: ['night'] }, // Jirachi
  480: { period: ['day'] }, // Uxie
  481: { weather: ['clear', 'sun'] }, // Mesprit
  482: { period: ['night'] }, // Azelf
  485: { weather: ['sun', 'sand'] }, // Heatran
  487: { weather: ['fog'], period: ['night'] }, // Giratina
  488: { period: ['day'] }, // Cresselia
  491: { period: ['night'] }, // Darkrai
  492: { weather: ['sun', 'clear'], period: ['day'] }, // Shaymin
  641: { weather: ['clear', 'fog'] }, // Tornadus
  642: { weather: ['rain'] }, // Thundurus
  645: { weather: ['sand', 'sun'] }, // Landorus
  717: { period: ['night'] }, // Yveltal
  716: { period: ['day'] }, // Xerneas
  785: { weather: ['rain', 'clear'] }, // Tapu Koko (campo elétrico)
  786: { weather: ['fog', 'clear'] }, // Tapu Lele (campo psíquico)
  787: { weather: ['sun', 'clear'] }, // Tapu Bulu (campo de grama)
  788: { weather: ['rain', 'fog'] }, // Tapu Fini (campo de névoa)
  791: { weather: ['sun', 'clear'], period: ['day'] }, // Solgaleo
  792: { period: ['night'] }, // Lunala
  800: { weather: ['clear'], period: ['night'] }, // Necrozma: só no céu limpo, quando a luz some
  802: { period: ['night'] }, // Marshadow, nas sombras
  807: { weather: ['rain'] }, // Zeraora, nas tempestades
};

/**
 * O que cada lendário pede para aparecer, como nos jogos: itens-chave na Mochila, Pokémon na equipe ou outros
 * lendários já capturados (as duplas e os trios que se chamam).
 */
export const LEGEND_NEEDS: Record<number, { items?: string[]; team?: number[]; caught?: number[] }> = {
  151: { caught: [150] }, // Mew depois do Mewtwo
  249: { items: ['silver-wing'] }, // Lugia: Silver Wing
  250: { items: ['rainbow-wing'], caught: [243, 244, 245] }, // Ho-Oh: Rainbow Wing e as três feras
  377: { team: [369, 321] }, // Regis: Relicanth e Wailord na equipe
  378: { team: [369, 321] },
  379: { team: [369, 321] },
  381: { caught: [380] }, // Latios vem atrás da Latias
  384: { caught: [382, 383] }, // Rayquaza só desce depois de Kyogre e Groudon
  486: { caught: [377, 378, 379] }, // Regigigas: os três Regis
  493: { caught: [483, 484, 487] }, // Arceus: Dialga, Palkia e Giratina
  490: { caught: [489] }, // Manaphy depois do Phione
  645: { caught: [641, 642] }, // Landorus: Tornadus e Thundurus
  646: { caught: [643] }, // Kyurem: depois do Reshiram (ou do Zekrom, ver legendary.ts)
  718: { caught: [716, 717] }, // Zygarde: Xerneas e Yveltal
  // Alola: o Cosmog chega por uma fenda; dele vêm Solgaleo e Lunala, e as fendas se abrem para as Ultra Bestas. O
  // Necrozma só aparece com o sol e a lua juntos, e as duas últimas Ultra Bestas vêm atrás dele (como em Ultra Sun/Moon).
  791: { caught: [789] }, // Solgaleo depois do Cosmog
  792: { caught: [789] }, // Lunala depois do Cosmog
  800: { caught: [791, 792] }, // Necrozma: Solgaleo e Lunala
  793: { caught: [789] }, // Nihilego
  794: { caught: [789] }, // Buzzwole
  795: { caught: [789] }, // Pheromosa
  796: { caught: [789] }, // Xurkitree
  797: { caught: [789] }, // Celesteela
  798: { caught: [789] }, // Kartana
  799: { caught: [789] }, // Guzzlord
  803: { caught: [789] }, // Poipole
  805: { caught: [800] }, // Stakataka depois do Necrozma
  806: { caught: [800] }, // Blacephalon depois do Necrozma
};

/** Clima que o lendário traz quando se enfurece (abaixo de metade do HP). */
export const LEGEND_RAGE_WEATHER: Record<number, LegendWeather> = {
  144: 'hail',
  145: 'rain',
  146: 'sun',
  249: 'rain',
  250: 'sun',
  382: 'rain',
  383: 'sun',
  378: 'hail',
  377: 'sand',
  485: 'sun',
  487: 'fog',
  491: 'fog',
  641: 'rain',
  642: 'rain',
  645: 'sand',
};

/** Bolas com afinidade temática com um lendário (multiplicador extra só contra ele). */
export const LEGEND_BALLS: Record<number, Partial<Record<string, number>>> = {
  491: { 'dusk-ball': 1.5 }, // Darkrai
  487: { 'dusk-ball': 1.5 }, // Giratina
  717: { 'dusk-ball': 1.5 }, // Yveltal
  382: { 'dive-ball': 1.5, 'net-ball': 1.2 }, // Kyogre
  490: { 'dive-ball': 1.5 }, // Manaphy
  489: { 'dive-ball': 1.5 }, // Phione
  249: { 'dive-ball': 1.5 }, // Lugia
  251: { 'nest-ball': 1.5, 'quick-ball': 1.2 }, // Celebi
  492: { 'nest-ball': 1.5 }, // Shaymin
  385: { 'quick-ball': 1.5 }, // Jirachi
  151: { 'quick-ball': 1.5 }, // Mew
  493: { 'ultra-ball': 1.3 }, // Arceus
};
