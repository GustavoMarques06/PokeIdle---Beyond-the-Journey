import {
  BALANCE,
  NATURES,
  abilitiesOf,
  getAbility,
  getHeldItem,
  getMove,
  getSpecies,
  hasMove,
  isSupportMove,
  preEvolutionOf,
  speciesOf,
  supportMoveFor,
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
  /** Golpes escolhidos pelo jogador (até 4, no máximo um de apoio). Vazio/ausente = automático pelo nível. */
  moveset?: string[];
  /** Saves antigos: apoio fixado no automático (id), ou 'none'. Hoje o apoio vai entre os 4 golpes do `moveset`. */
  support?: string;
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
  /** Gênero. Ausente = derivado do uid (ver gender.ts). */
  gender?: 'm' | 'f';
  /** Bola em que foi capturado. */
  ball?: string;
  /** Golpes de ovo herdados na Creche. */
  eggMoves?: string[];
  /** Golpes da pré-evolução lembrados no Relembrador. */
  relearned?: string[];
  /** Treinador original, quando veio de uma troca pelo Cabo Link. */
  ot?: string;
  /** Veio de uma troca com um save editado fora do jogo. */
  fromModified?: boolean;
  /** Pais (e avós), quando nasceu de um ovo da Creche. */
  parents?: EggParent[];
}

/** Um ancestral na árvore de criação: espécie, se era shiny e os pais dele (um nível só). */
export interface EggParent {
  s: number;
  shiny?: boolean;
  p?: EggParent[];
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
export function defaultAbilitySlot(uid: number, ivs: Ivs, speciesId: number, form?: string): 0 | 1 | 2 {
  const [, second, hidden] = abilitiesOf(speciesId, form);
  const h = personality(uid, ivs);
  if (hidden && (h >>> 7) % 24 === 0) return 2;
  return second && (h >>> 3) % 2 === 1 ? 1 : 0;
}

export function abilitySlotOf(p: {
  uid: number;
  ivs: Ivs;
  speciesId: number;
  form?: string;
  abilitySlot?: 0 | 1 | 2;
}) {
  return p.abilitySlot ?? defaultAbilitySlot(p.uid, p.ivs, p.speciesId, p.form);
}

/** Habilidade de uma espécie num slot (cai para a primeira se o slot não existe). */
export function abilityInSlot(speciesId: number, slot: number, form?: string): AbilityDef {
  const list = abilitiesOf(speciesId, form);
  return getAbility(list[slot] ?? list[0]!);
}

export function abilityOf(p: {
  uid: number;
  ivs: Ivs;
  speciesId: number;
  form?: string;
  abilitySlot?: 0 | 1 | 2;
}): AbilityDef {
  return abilityInSlot(p.speciesId, abilitySlotOf(p), p.form);
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
  form?: string;
  level: number;
  ivs: Ivs;
  nature?: string;
  evs?: Evs;
}): Stats {
  return calcStats(speciesOf(p.speciesId, p.form), p.level, p.ivs, p.nature, p.evs);
}

/** Golpes de dano aprendidos por nível até `level`, do mais antigo ao mais recente. */
function learnedByLevel(species: Species, level: number): string[] {
  const learned: string[] = [];
  for (const entry of species.learnset) {
    if (entry.level > level) break;
    const i = learned.indexOf(entry.move);
    if (i >= 0) learned.splice(i, 1);
    learned.push(entry.move);
  }
  return learned;
}

/**
 * Golpe de máquina/tutor mais forte que um Pokémon deste nível já usa. Em faixas largas, para
 * a escolha não mudar a cada nível (cada troca vira um aviso de golpe novo).
 */
const tmPowerCap = (level: number) => (level < 20 ? 60 : level < 40 ? 80 : level < 60 ? 100 : Infinity);

const knownCache = new Map<string, string[]>();

/**
 * Até quatro golpes de dano: os mais recentes que a espécie aprende até `level`. Se não chega a
 * quatro, completa com os que as formas anteriores aprendiam até esse nível (evoluir por pedra
 * não apaga os golpes do Clefairy) e depois com golpes de máquina/tutor da espécie: primeiro os
 * do próprio tipo, depois de tipos novos (cobertura), sempre os mais fortes que cabem no nível.
 * Espécies que não têm quatro golpes de dano possíveis (Magikarp, Ditto…) ficam com os que há.
 */
export function knownMoves(species: Species, level: number): string[] {
  const key = `${species.id}${species.regionalForm ?? ''}:${level}`;
  const hit = knownCache.get(key);
  if (hit) return [...hit];
  const max = BALANCE.maxMoves;
  const moves = learnedByLevel(species, level).slice(-max);
  for (
    let pre = preEvolutionOf(species.id);
    pre !== undefined && moves.length < max;
    pre = preEvolutionOf(pre)
  ) {
    const older = learnedByLevel(getSpecies(pre), level).filter((m) => !moves.includes(m));
    moves.unshift(...older.slice(-(max - moves.length)));
  }
  if (moves.length < max) {
    const options = species.tmMoves
      .filter((m) => hasMove(m) && !moves.includes(m) && getMove(m).power <= tmPowerCap(level))
      .map((m) => getMove(m))
      .sort((a, b) => b.power - a.power || a.id.localeCompare(b.id));
    const types = new Set(moves.map((m) => getMove(m).type));
    const pick = (ok: (m: (typeof options)[number]) => boolean) => {
      for (const m of options) {
        if (moves.length >= max) return;
        if (moves.includes(m.id) || !ok(m)) continue;
        moves.push(m.id);
        types.add(m.type);
      }
    };
    pick((m) => species.types.includes(m.type) && !types.has(m.type));
    pick((m) => !types.has(m.type));
    pick(() => true);
  }
  knownCache.set(key, moves);
  return [...moves];
}

/** Golpes usados em batalha: os escolhidos pelo jogador ou os aprendidos por nível. */
/**
 * Golpes de ataque do Pokémon. O apoio ocupa uma das 4 vagas: com ele, o automático leva só os 3 ataques mais
 * recentes. Os escolhidos à mão já trazem o apoio entre os 4 (fica fora daqui, ver `supportMoveFor`).
 */
export function movesOf(p: {
  speciesId: number;
  form?: string;
  level: number;
  moveset?: string[];
  support?: string;
}): string[] {
  if (p.moveset?.length) {
    const attacks = p.moveset.filter((m) => !isSupportMove(m));
    if (attacks.length) return attacks;
  }
  const known = knownMoves(speciesOf(p.speciesId, p.form), p.level);
  return supportMoveFor(p) ? known.slice(-(BALANCE.maxMoves - 1)) : known;
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
