// Contratos dos dados de conteúdo. Os arquivos em `generated/` são produzidos por
// `npm run data:fetch` a partir de scripts/world.mjs e da PokéAPI.

export type TypeName = string;

export interface BaseStats {
  hp: number;
  atk: number;
  def: number;
  spAtk: number;
  spDef: number;
  spe: number;
}

export type StatKey = keyof BaseStats;

export type GrowthRate =
  'slow' | 'medium' | 'fast' | 'medium-slow' | 'slow-then-very-fast' | 'fast-then-very-slow';

export type TimeOfDay = 'day' | 'night';

/** Condição extra de uma evolução por nível (Hitmon*, Wurmple). */
export type EvoCondition = 'atk>def' | 'def>atk' | 'atk=def' | 'uid-even' | 'uid-odd';

/**
 * Evolução por nível, por item ou por amizade (com período do dia opcional, como
 * Espeon/Umbreon).
 */
export type Evolution = (
  | { to: number; trigger: 'level'; minLevel: number; time?: TimeOfDay; cond?: EvoCondition }
  | { to: number; trigger: 'item'; item: string; time?: TimeOfDay }
  | { to: number; trigger: 'friendship'; minFriendship: number; time?: TimeOfDay }
) & {
  /** Só machos ('m') ou só fêmeas ('f') evoluem assim (Gallade, Froslass, Vespiquen). */
  gender?: Gender;
};

export type Gender = 'm' | 'f';

export interface LearnsetEntry {
  level: number;
  move: string;
}

export interface SpeciesSprites {
  front?: string;
  back?: string;
  frontShiny?: string;
  backShiny?: string;
  icon?: string;
}

export interface Species {
  id: number;
  slug: string;
  name: string;
  genus: string;
  types: TypeName[];
  baseStats: BaseStats;
  baseExp: number;
  captureRate: number;
  growthRate: GrowthRate;
  /** Lendário ou mítico (não se reproduz na creche). */
  legendary: boolean;
  baby: boolean;
  /** Ciclos de ovo da PokéAPI (define o tempo de chocar). */
  hatchCounter: number;
  eggGroups: string[];
  evolutions: Evolution[];
  learnset: LearnsetEntry[];
  /** Golpes de dano que a espécie aprende por máquina/tutor (Black 2/White 2). */
  tmMoves: string[];
  /** Golpes de ovo: herdados na Creche quando um dos pais conhece o golpe. */
  eggMoves: string[];
  /** −1 = sem gênero; 0 a 8 = oitavos de chance de ser fêmea. */
  genderRate: number;
  /** Geração de origem (1 a 5). */
  generation: number;
  sprites: SpeciesSprites;
  /** Tamanho natural (largura, altura) dos sprites de batalha, para manter a escala. */
  spriteSize?: { front?: [number, number]; back?: [number, number] };
  /** Grito da espécie (arquivo .ogg da PokéAPI). */
  cry?: string;
}

export type Ailment = 'burn' | 'poison' | 'paralysis' | 'sleep' | 'freeze';

export interface Move {
  id: string;
  name: string;
  type: TypeName;
  power: number;
  accuracy: number;
  category: 'physical' | 'special';
  priority: number;
  /** Efeito de status secundário e sua chance (%). */
  ailment?: Ailment;
  ailmentChance?: number;
}

export interface ItemData {
  id: string;
  name: string;
  sprite?: string;
  /** Itens sem sprite da PokéAPI são desenhados pelo jogo: forma (ver theme/icons.ts) e cor. */
  icon?: { glyph: string; color: string };
}

export interface Encounter {
  speciesId: number;
  weight: number;
  minLevel: number;
  maxLevel: number;
  /** Só aparece de dia ou só à noite. */
  time?: TimeOfDay;
}

/** Membro do time de um chefe: espécie fixa ou o inicial do rival (estágio 1–3). */
/** `form`: forma do sprite (`mega`, `megax`, `megay` = Mega Evolução já ativa no chefe). */
export type BossMember =
  { speciesId: number; level: number; form?: string } | { rivalStage: number; level: number };

export interface BossData {
  name: string;
  title: string;
  /** Sprite do treinador (public/sprites/trainers/<id>.png). */
  trainer: string;
  /** Insígnia entregue pelo líder de ginásio (se houver). */
  badge?: { id: string; name: string };
  team: BossMember[];
  reward: { coins: number; items?: Record<string, number>; tm?: string };
  /** Rival: fica mais forte a cada ciclo de prestígio. */
  rival?: boolean;
  /** Campeão: a vitória registra o time no Hall da Fama e libera a próxima região. */
  champion?: boolean;
  /** Multiplicador de atributos (chefes de nível 100). */
  boost?: number;
}

export type SceneKey =
  | 'meadow'
  | 'route'
  | 'forest'
  | 'mountain'
  | 'cave'
  | 'river'
  | 'beach'
  | 'desert'
  | 'city'
  | 'icecave'
  | 'volcano'
  | 'plains'
  | 'dampcave'
  | 'sea'
  | 'league-hall'
  | 'league-ice'
  | 'league-fight'
  | 'league-ghost'
  | 'league-dragon'
  | 'league-psychic'
  | 'league-dark'
  | 'league-poison'
  | 'league-fire'
  | 'league-steel'
  | 'league-water'
  | 'league-ground'
  | 'street'
  | 'rocket-base'
  | 'lab'
  | 'seafloor'
  | 'swamp'
  | 'ruins'
  | 'snowfield'
  | 'tower'
  | 'powerplant'
  | 'summit'
  | 'jungle';

export interface Route {
  id: string;
  name: string;
  /** Nome da região, para exibição. */
  region: string;
  regionId: string;
  description: string;
  /** Vitórias necessárias para liberar o chefe (ou a próxima rota, se não houver chefe). */
  killsRequired: number;
  encounters: Encounter[];
  boss?: BossData;
  scene: SceneKey;
  /** Posição no mapa da região (0–100 em cada eixo). */
  map: [number, number];
  /** 'trial' = sala da Liga: sem encontros selvagens, só o desafio. */
  kind: 'wild' | 'trial';
  /** Rota onde o jogador treina enquanto está numa sala de desafio. */
  farm?: string;
  /** Zona Safari: captura facilitada. */
  safari?: boolean;
  /** Multiplicador de atributos dos selvagens (Kalos, onde tudo já está no Nv. 100). */
  boost?: number;
}

export interface Region {
  id: string;
  name: string;
  routes: string[];
}

export interface RoamerDef {
  speciesId: number;
  /** Rota que precisa estar concluída para o errante começar a aparecer. */
  requires: string;
  bonusLevel: number;
}

export interface FossilDef {
  item: string;
  speciesId: number;
  hours: number;
}

export type ExpeditionReward =
  | { w: number; coins: [number, number] }
  | { w: number; item: string; qty: [number, number] }
  | { w: number; speciesId: number; level: [number, number] }
  | { w: number; tm: true }
  | { w: number; research: [number, number] };

export interface ExpeditionDef {
  id: string;
  name: string;
  description: string;
  requires: string;
  types: TypeName[];
  rewards: ExpeditionReward[];
}

export type PrizeDef =
  | { kind: 'pokemon'; speciesId: number; level: number; tokens: number }
  | { kind: 'tm'; move: string; tokens: number }
  | { kind: 'item'; item: string; qty: number; tokens: number };

export interface WorldData {
  starters: { generation: number; region: string; ids: number[] }[];
  regions: Region[];
  routes: Route[];
  roamers: RoamerDef[];
  fossils: FossilDef[];
  tmPool: string[];
  expeditions: ExpeditionDef[];
  prizes: PrizeDef[];
}
