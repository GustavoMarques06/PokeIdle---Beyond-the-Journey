import { BALANCE, getSpecies, type Species } from '../game-data';
import { randInt, type Rng } from './rng';
import { calcStats, expForLevel, type Ivs, type Stats } from './stats';

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
  };
  p.currentHp = statsOf(p).hp;
  return p;
}

export function statsOf(p: { speciesId: number; level: number; ivs: Ivs }): Stats {
  return calcStats(getSpecies(p.speciesId), p.level, p.ivs);
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
