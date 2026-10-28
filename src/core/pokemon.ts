import {
  BALANCE,
  NATURES,
  abilitiesOf,
  getAbility,
  getHeldItem,
  getSpecies,
  type AbilityDef,
  type HeldItemDef,
  type Species,
  type StatKey,
} from '../game-data';
import { randInt, type Rng } from './rng';
import { calcStats, expForLevel, type Evs, type Ivs, type Stats } from './stats';

/** Dados individuais de um Pokémon capturado (os dados-base ficam em `Species`). */
export interface PokemonInstance {
  uid: number;
  speciesId: number;
  level: number;
  exp: number;
  ivs: Ivs;
  shiny: boolean;
  currentHp: number;
  caughtAt: number;
  caughtOn: string;
  /** Evolução aguardando confirmação (quando a evolução automática está desligada). */
  pendingEvolution?: number;
  /** Golpes escolhidos pelo jogador (até 4). Vazio/ausente = automático pelo nível. */
  moveset?: string[];
  /** Pedra Eterna: não evolui por nível. */
  evolutionLocked?: boolean;
  /** Natureza (id). Ausente = neutra. */
  nature?: string;
  /** Item segurado (id). */
  held?: string;
  /** Amizade (0–255). Ausente = valor inicial. */
  friendship?: number;
  /** EVs por atributo (máx. 252 cada e 510 no total). */
  evs?: Evs;
  /** EVs que vieram de vitaminas (têm teto menor por atributo). */
  vitaminEvs?: Evs;
  /** Habilidade escolhida pelo jogador: 0 e 1 = comuns, 2 = oculta. Ausente = pelo sorteio do uid. */
  abilitySlot?: 0 | 1 | 2;
  /** Forma alternativa (letra do Unown, estação do Deerling, padrão do Spinda). */
  form?: string;
  /** Histórico de batalha deste Pokémon (ver records.ts). */
  record?: BattleRecord;
  /** Favorito: não pode ser transferido (nem pela limpeza de duplicatas). */
  favorite?: boolean;
  /** Apelido dado pelo jogador. Ausente = nome da espécie. */
  nickname?: string;
  /** Etiqueta da Caixa (ver boxes.ts). */
  tag?: 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'gray';
}

/** Feitos de um Pokémon como ativo. */
export interface BattleRecord {
  wins: number;
  crits: number;
  damage: number;
  /** Capturas feitas com ele em campo. */
  captures: number;
  faints: number;
}

export const PERFECT_IVS: Ivs = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

export function isPerfect(ivs: Ivs): boolean {
  return Object.values(ivs).every((v) => v === 31);
}

/** IVs de lendário: alguns atributos já saem em 31 e os demais variam de 0 a 31. */
export function legendaryIvs(rng: Rng, guaranteed: number = BALANCE.legendary.guaranteedPerfectIvs): Ivs {
  const ivs = randomIvs(rng);
  const keys = Object.keys(ivs) as (keyof Ivs)[];
  for (let i = 0; i < guaranteed; i++) {
    ivs[keys.splice(Math.floor(rng.next() * keys.length), 1)[0]] = 31;
  }
  return ivs;
}

/** IVs sorteados de 0 a 31, com uma chance rara de sair perfeito (todos 31). */
export function randomIvs(rng: Rng): Ivs {
  if (rng.next() < BALANCE.capture.perfectChance) return { ...PERFECT_IVS };
  return {
    hp: randInt(rng, 0, 31),
    atk: randInt(rng, 0, 31),
    def: randInt(rng, 0, 31),
    spAtk: randInt(rng, 0, 31),
    spDef: randInt(rng, 0, 31),
    spe: randInt(rng, 0, 31),
  };
}

export function rollShiny(rng: Rng, multiplier = 1): boolean {
  return rng.next() < BALANCE.capture.shinyChance * multiplier;
}

/**
 * Natureza sorteada de forma determinística a partir do uid e dos IVs: não consome o
 * gerador do jogo e permite atribuir naturezas a saves antigos.
 */
export function natureFor(uid: number, ivs: Ivs): string {
  return NATURES[personality(uid, ivs) % NATURES.length].id;
}

function personality(uid: number, ivs: Ivs): number {
  let h = Math.imul(uid | 0, 0x9e3779b1);
  for (const v of [ivs.hp, ivs.atk, ivs.def, ivs.spAtk, ivs.spDef, ivs.spe]) {
    h = Math.imul(h ^ v, 0x85ebca6b);
    h ^= h >>> 13;
  }
  return h >>> 0;
}

/** Habilidade sorteada pelo uid: ~4% de chance da oculta (se a espécie tiver) e 50/50 entre as comuns. */
export function defaultAbilitySlot(uid: number, ivs: Ivs, speciesId: number): 0 | 1 | 2 {
  const [, second, hidden] = abilitiesOf(speciesId);
  const h = personality(uid, ivs);
  if (hidden && (h >>> 7) % 24 === 0) return 2;
  return second && (h >>> 3) % 2 === 1 ? 1 : 0;
}

export function abilitySlotOf(p: { uid: number; ivs: Ivs; speciesId: number; abilitySlot?: 0 | 1 | 2 }) {
  return p.abilitySlot ?? defaultAbilitySlot(p.uid, p.ivs, p.speciesId);
}

/** Habilidade de uma espécie num slot (cai para a primeira se o slot não existe). */
export function abilityInSlot(speciesId: number, slot: number): AbilityDef {
  const list = abilitiesOf(speciesId);
  return getAbility(list[slot] ?? list[0]!);
}

export function abilityOf(p: {
  uid: number;
  ivs: Ivs;
  speciesId: number;
  abilitySlot?: 0 | 1 | 2;
}): AbilityDef {
  return abilityInSlot(p.speciesId, abilitySlotOf(p));
}

export function heldOf(p: { held?: string }): HeldItemDef | undefined {
  return getHeldItem(p.held);
}

export function friendshipOf(p: { friendship?: number }): number {
  return p.friendship ?? BALANCE.friendship.start;
}

export function evsOf(p: { evs?: Evs }): Stats {
  return {
    hp: p.evs?.hp ?? 0,
    atk: p.evs?.atk ?? 0,
    def: p.evs?.def ?? 0,
    spAtk: p.evs?.spAtk ?? 0,
    spDef: p.evs?.spDef ?? 0,
    spe: p.evs?.spe ?? 0,
  };
}

export function evTotal(p: { evs?: Evs }): number {
  return Object.values(evsOf(p)).reduce((a, b) => a + b, 0);
}

/** Quantos EVs ainda cabem no atributo (limite por atributo e total de 510). */
export function evRoom(p: { evs?: Evs }, stat: StatKey): number {
  const t = BALANCE.training;
  return Math.max(0, Math.min(t.maxPerStat - evsOf(p)[stat], t.maxTotal - evTotal(p)));
}

/** Soma EVs a um atributo respeitando os limites. Devolve quantos entraram. */
export function addEvs(p: { evs?: Evs }, stat: StatKey, amount: number): number {
  const gained = Math.min(Math.floor(amount), evRoom(p, stat));
  if (gained <= 0) return 0;
  p.evs = { ...p.evs, [stat]: evsOf(p)[stat] + gained };
  return gained;
}

export function createPokemon(
  uid: number,
  speciesId: number,
  level: number,
  ivs: Ivs,
  shiny: boolean,
  caughtAt: number,
  caughtOn: string,
): PokemonInstance {
  const species = getSpecies(speciesId);
  const p: PokemonInstance = {
    uid,
    speciesId,
    level,
    exp: expForLevel(species.growthRate, level),
    ivs,
    shiny,
    currentHp: 0,
    caughtAt,
    caughtOn,
    nature: natureFor(uid, ivs),
  };
  p.currentHp = statsOf(p).hp;
  return p;
}

export function statsOf(p: {
  speciesId: number;
  level: number;
  ivs: Ivs;
  nature?: string;
  evs?: Evs;
}): Stats {
  return calcStats(getSpecies(p.speciesId), p.level, p.ivs, p.nature, p.evs);
}

/** Até quatro golpes de dano mais recentes que a espécie aprende até `level`. */
export function knownMoves(species: Species, level: number): string[] {
  const learned: string[] = [];
  for (const entry of species.learnset) {
    if (entry.level > level) break;
    const i = learned.indexOf(entry.move);
    if (i >= 0) learned.splice(i, 1);
    learned.push(entry.move);
  }
  return learned.slice(-BALANCE.maxMoves);
}

/** Golpes usados em batalha: os escolhidos pelo jogador ou os aprendidos por nível. */
export function movesOf(p: { speciesId: number; level: number; moveset?: string[] }): string[] {
  return p.moveset?.length ? p.moveset : knownMoves(getSpecies(p.speciesId), p.level);
}

/** Todos os golpes de dano que a espécie aprendeu por nível até `level` (sem limite de 4). */
export function levelUpMoves(species: Species, level: number): string[] {
  return [...new Set(species.learnset.filter((e) => e.level <= level).map((e) => e.move))];
}

/** Soma dos IVs em porcentagem — usado para exibir o "potencial". */
export function potential(ivs: Ivs): number {
  const total = ivs.hp + ivs.atk + ivs.def + ivs.spAtk + ivs.spDef + ivs.spe;
  return Math.round((total / (31 * 6)) * 100);
}

export const NICKNAME_MAX = 12;

/** Nome exibido: o apelido, se houver, ou o nome da espécie. */
export function pokemonName(p: Pick<PokemonInstance, 'speciesId' | 'nickname'>): string {
  return p.nickname || getSpecies(p.speciesId).name;
}

/** Dá (ou tira, com texto vazio ou igual ao nome da espécie) o apelido de um Pokémon. */
export function setNickname(p: PokemonInstance, name: string): void {
  const clean = name.trim().replace(/\s+/g, ' ').slice(0, NICKNAME_MAX);
  if (clean && clean.toLowerCase() !== getSpecies(p.speciesId).name.toLowerCase()) p.nickname = clean;
  else delete p.nickname;
}
