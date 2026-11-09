// Creche: dois Pokémon compatíveis produzem ovos com as vitórias do jogador. Os ovos andam nas chocadeiras (ou
// levados na equipe) com vitórias e com o tempo real, e chocam quando o jogador toca neles (ou sozinhos, nas Opções).
// Itens dos pais mudam a herança (Destiny Knot, Power Items, Everstone), e o Diário libera mais chocadeiras.

import { BALANCE, abilitiesOf, getSpecies, hasMove, lineRoot, speciesId } from '../game-data';
import { computeModifiers } from './bonuses';
import { activityUnlocked, addToCollection, busyUids, findPokemon } from './collection';
import type { GameEvent, GameState } from './game';
import { giveForm } from './forms';
import { genderOf } from './gender';
import { progressMission } from './missions';
import {
  abilityOf,
  abilitySlotOf,
  heldOf,
  isPerfect,
  movesOf,
  natureFor,
  randomIvs,
  rollShiny,
  type EggParent,
  type PokemonInstance,
} from './pokemon';
import { setLevel } from './progression';
import { pickWeighted, rngFrom, type Rng } from './rng';
import type { Ivs } from './stats';
import { reservePokemon, reserveSlotsUnlocked, teamPokemon } from './team';

export interface Egg {
  id: number;
  speciesId: number;
  ivs: Ivs;
  shiny: boolean;
  /** Ciclos necessários para chocar e ciclos já cumpridos. */
  cycles: number;
  progress: number;
  /** Golpes de ovo que algum dos pais conhecia. */
  eggMoves?: string[];
  /** Natureza passada por um pai com Everstone. */
  nature?: string;
  /** Nasce com a habilidade oculta. */
  hidden?: boolean;
  /** Pais (e avós) do filhote, para a árvore de criação. */
  parents?: EggParent[];
  /** De onde veio, se não foi da Creche (ovo de presente). */
  gift?: string;
  /** Já avisou que está pronto. */
  notified?: boolean;
  /** De qual pai (0 ou 1, na ordem de `parents`) veio cada IV herdado. */
  from?: Partial<Record<keyof Ivs, 0 | 1>>;
}

export interface DaycareState {
  uids: number[];
  /** Vitórias acumuladas para o próximo ovo e para o próximo nível dos hóspedes. */
  eggProgress: number;
  levelProgress: number;
}

export const emptyDaycare = (): DaycareState => ({ uids: [], eggProgress: 0, levelProgress: 0 });

const DITTO = speciesId('ditto');
const NO_EGGS = new Set(['no-eggs', 'undiscovered']);

function canBreed(id: number): boolean {
  const s = getSpecies(id);
  return !s.legendary && !s.eggGroups.some((g) => NO_EGGS.has(g)) && s.eggGroups.length > 0;
}

/** Dois Pokémon podem ter ovos se compartilham um grupo de ovos (ou um deles é Ditto). */
type Parent = Pick<PokemonInstance, 'speciesId'> & Partial<Pick<PokemonInstance, 'uid' | 'gender'>>;

/** Por que o par não gera ovos (null = gera). */
export function incompatibility(a: Parent, b: Parent): 'species' | 'groups' | 'gender' | null {
  if (!canBreed(a.speciesId) || !canBreed(b.speciesId)) return 'species';
  if (a.speciesId === DITTO || b.speciesId === DITTO) return a.speciesId !== b.speciesId ? null : 'species';
  const groups = getSpecies(b.speciesId).eggGroups;
  if (!getSpecies(a.speciesId).eggGroups.some((g) => groups.includes(g))) return 'groups';
  // Fora o Ditto, é preciso um macho e uma fêmea (sem gênero só cruza com Ditto).
  const ga = genderOf(a);
  const gb = genderOf(b);
  return ga && gb && ga !== gb ? null : 'gender';
}

export function compatible(a: Parent, b: Parent): boolean {
  return incompatibility(a, b) === null;
}

export function daycarePokemon(state: GameState): PokemonInstance[] {
  return state.daycare.uids.map((uid) => findPokemon(state, uid)).filter((p): p is PokemonInstance => !!p);
}

/** Espécie que sai do ovo: a primeira da linha do pai que não é Ditto. */
/** O ovo é da linha da mãe (ou do pai que não é Ditto). */
export function eggSpeciesOf(a: Parent, b: Parent): number {
  const parent = a.speciesId === DITTO ? b : b.speciesId === DITTO ? a : genderOf(b) === 'f' ? b : a;
  return lineRoot(parent.speciesId);
}

/** Golpes de ovo da espécie que algum dos pais conhece. */
export function inheritedEggMoves(speciesId: number, a: PokemonInstance, b: PokemonInstance): string[] {
  const known = new Set([...movesOf(a), ...movesOf(b)]);
  return getSpecies(speciesId).eggMoves.filter((m) => known.has(m) && hasMove(m));
}

export function daycareCompatible(state: GameState): boolean {
  const [a, b] = daycarePokemon(state);
  return !!a && !!b && compatible(a, b);
}

export function putInDaycare(state: GameState, uid: number): boolean {
  if (!activityUnlocked(state, 'daycare') || state.daycare.uids.length >= BALANCE.daycare.slots) return false;
  if (!findPokemon(state, uid) || busyUids(state).has(uid)) return false;
  state.daycare.uids.push(uid);
  state.daycare.eggProgress = 0;
  return true;
}

export function takeFromDaycare(state: GameState, uid: number): void {
  state.daycare.uids = state.daycare.uids.filter((x) => x !== uid);
  state.daycare.eggProgress = 0;
}

// --- Herança ----------------------------------------------------------------------------------

const lineage = (p: PokemonInstance): EggParent => ({
  s: p.speciesId,
  ...(p.shiny ? { shiny: true } : {}),
  ...(p.parents?.length ? { p: p.parents.map((g) => ({ s: g.s, ...(g.shiny ? { shiny: true } : {}) })) } : {}),
});

/** Método Masuda: pais de treinadores diferentes (um veio pelo Cabo Link e o outro não, ou de dois treinadores). */
export function masudaPair(a: PokemonInstance, b: PokemonInstance): boolean {
  return (a.ot ?? '') !== (b.ot ?? '');
}

/** Quem passa a espécie (e a habilidade oculta): a mãe, ou o pai que não é Ditto. */
function motherOf(a: PokemonInstance, b: PokemonInstance): PokemonInstance {
  return a.speciesId === DITTO ? b : b.speciesId === DITTO ? a : genderOf(b) === 'f' ? b : a;
}

/** O que os itens e a origem dos pais mudam no ovo (para a tela explicar antes de o ovo vir). */
export function breedingEffects(a: PokemonInstance, b: PokemonInstance) {
  return {
    knot: [a, b].some((p) => heldOf(p)?.breeding?.knot),
    powers: [a, b].flatMap((p) => {
      const stat = heldOf(p)?.breeding?.power;
      return stat ? [{ uid: p.uid, stat }] : [];
    }),
    everstone: [a, b].find((p) => heldOf(p)?.everstone),
    masuda: masudaPair(a, b),
    hidden: abilitySlotOf(motherOf(a, b)) === 2,
  };
}

function makeEgg(state: GameState): Egg {
  const d = BALANCE.daycare;
  const [a, b] = daycarePokemon(state);
  const rng = rngFrom(state);
  const fx = breedingEffects(a, b);
  const ivs = randomIvs(rng);
  // Herda alguns IVs dos pais, sem repetir o atributo: primeiro os garantidos pelos Power Items.
  const keys = Object.keys(ivs) as (keyof Ivs)[];
  const from: Partial<Record<keyof Ivs, 0 | 1>> = {};
  const take = (key: keyof Ivs, parent: PokemonInstance) => {
    keys.splice(keys.indexOf(key), 1);
    ivs[key] = parent.ivs[key];
    from[key] = parent === a ? 0 : 1;
  };
  let count = isPerfect(ivs) ? 0 : fx.knot ? d.knotIvs : d.inheritedIvs;
  for (const { uid, stat } of fx.powers) {
    if (count <= 0 || !keys.includes(stat)) continue;
    take(stat, uid === a.uid ? a : b);
    count--;
  }
  for (; count > 0 && keys.length; count--)
    take(keys[Math.floor(rng.next() * keys.length)], rng.next() < 0.5 ? a : b);
  const species = eggSpeciesOf(a, b);
  const shinyMult =
    d.shinyMultiplier *
    computeModifiers(state).shiny *
    (fx.masuda ? d.masudaMultiplier : 1) *
    (hatchMilestone(state, 'shiny') ? 2 : 1);
  const shiny = rollShiny(rng, shinyMult);
  const eggMoves = inheritedEggMoves(species, a, b);
  const stone = fx.everstone;
  const nature = stone ? (stone.nature ?? natureFor(stone.uid, stone.ivs)) : undefined;
  const hidden = fx.hidden && !!abilitiesOf(species)[2] && rng.next() < d.hiddenInherit;
  return {
    id: state.nextUid++,
    speciesId: species,
    ivs,
    shiny,
    cycles: getSpecies(species).hatchCounter,
    progress: 0,
    parents: [lineage(a), lineage(b)],
    from,
    ...(eggMoves.length ? { eggMoves } : {}),
    ...(nature ? { nature } : {}),
    ...(hidden ? { hidden: true } : {}),
  };
}

// --- Chocadeiras e Diário ---------------------------------------------------------------------

/** Marcos do Diário da Chocadeira: liberados pelo total de ovos chocados. */
export const HATCH_MILESTONES = [
  { at: 5, id: 'incubator1', text: '+1 chocadeira' },
  { at: 15, id: 'oval', text: 'Amuleto Oval: a Creche faz ovos 2× mais rápido' },
  { at: 30, id: 'incubator2', text: '+1 chocadeira' },
  { at: 60, id: 'shiny', text: 'Ovos com chance de shiny 2× maior' },
  { at: 100, id: 'nest', text: '+2 vagas no ninho e 1 IV perfeito garantido em todo ovo' },
] as const;

export type HatchMilestoneId = (typeof HATCH_MILESTONES)[number]['id'];

export function hatchMilestone(state: GameState, id: HatchMilestoneId): boolean {
  const m = HATCH_MILESTONES.find((x) => x.id === id)!;
  return state.stats.hatched >= m.at;
}

export function incubatorSlots(state: GameState): number {
  return (
    BALANCE.daycare.incubators +
    (hatchMilestone(state, 'incubator1') ? 1 : 0) +
    (hatchMilestone(state, 'incubator2') ? 1 : 0) +
    Math.min(2, state.items['egg-incubator'] ?? 0)
  );
}

/** Ovos que cabem no ninho (chocando ou esperando a vez). */
export function nestSize(state: GameState): number {
  return BALANCE.daycare.maxEggs + (hatchMilestone(state, 'nest') ? 2 : 0);
}

export const eggReady = (egg: Egg) => egg.progress >= egg.cycles;

export function carriedEgg(state: GameState): Egg | undefined {
  return state.carriedEgg === undefined ? undefined : state.eggs.find((e) => e.id === state.carriedEgg);
}

/** Onde está cada ovo: na equipe, numa chocadeira (pela ordem da fila) ou esperando vaga. */
export function eggPlace(state: GameState, egg: Egg): 'carried' | 'incubator' | 'waiting' {
  if (egg.id === state.carriedEgg) return 'carried';
  const inNest = state.eggs.filter((e) => e.id !== state.carriedEgg);
  return inNest.indexOf(egg) < incubatorSlots(state) ? 'incubator' : 'waiting';
}

/** Chama Corporal ou Armadura de Magma na equipe aquecem os ovos (como nos jogos). */
export function eggWarmth(state: GameState): number {
  const warm = teamPokemon(state).some((p) => ['flame-body', 'magma-armor'].includes(abilityOf(p).id));
  return warm ? BALANCE.daycare.flameBodyMult : 1;
}

function advanceEggs(state: GameState, cycles: number, carriedExtra: number): void {
  const mult = eggWarmth(state);
  for (const egg of state.eggs) {
    const place = eggPlace(state, egg);
    if (place === 'waiting') continue;
    const gain = cycles * mult * (place === 'carried' ? carriedExtra : 1);
    egg.progress = Math.min(egg.cycles, egg.progress + gain);
  }
}

/** Põe o ovo na frente da fila: entra numa chocadeira (o último dela sai para esperar). */
export function prioritizeEgg(state: GameState, id: number): boolean {
  const egg = state.eggs.find((e) => e.id === id);
  if (!egg) return false;
  state.eggs = [egg, ...state.eggs.filter((e) => e !== egg)];
  return true;
}

/** Leva o ovo na equipe (precisa de uma vaga livre nela) ou, com `undefined`, devolve ao ninho. */
export function carryEgg(state: GameState, id: number | undefined): boolean {
  if (id === undefined) {
    delete state.carriedEgg;
    return true;
  }
  const egg = state.eggs.find((e) => e.id === id);
  if (!egg || eggReady(egg)) return false;
  if (state.carriedEgg === undefined && reservePokemon(state).length >= reserveSlotsUnlocked(state)) return false;
  state.carriedEgg = id;
  return true;
}

/** Vitórias em batalha: geram ovos, fazem os ovos andarem e treinam os hóspedes. */
export function daycareKills(state: GameState, kills: number): void {
  const d = BALANCE.daycare;
  advanceEggs(state, kills / d.killsPerCycle, d.carriedMult);
  const guests = daycarePokemon(state);
  if (!guests.length) return;

  state.daycare.levelProgress += kills;
  const levels = Math.floor(state.daycare.levelProgress / d.killsPerLevel);
  state.daycare.levelProgress -= levels * d.killsPerLevel;
  if (levels > 0) for (const p of guests) setLevel(p, p.level + levels);

  if (!daycareCompatible(state)) return;
  const perEgg = d.killsPerEgg / (hatchMilestone(state, 'oval') ? 2 : 1);
  state.daycare.eggProgress += kills;
  while (state.daycare.eggProgress >= perEgg && state.eggs.length < nestSize(state)) {
    state.daycare.eggProgress -= perEgg;
    state.eggs.push(makeEgg(state));
  }
  if (state.eggs.length >= nestSize(state))
    state.daycare.eggProgress = Math.min(state.daycare.eggProgress, perEgg);
}

/** Tempo real: cada ciclo também passa sozinho a cada N minutos (nas chocadeiras e na equipe). */
export function daycareTime(state: GameState, ms: number): void {
  advanceEggs(state, ms / (BALANCE.daycare.minutesPerCycle * 60_000), 1);
}

// --- Chocar ------------------------------------------------------------------------------------

export type HatchBonus =
  | { kind: 'iv'; stat: keyof Ivs }
  | { kind: 'eggMove'; move: string }
  | { kind: 'hidden' }
  | { kind: 'friendship' }
  | { kind: 'coins'; amount: number };

export interface HatchResult {
  uid: number;
  speciesId: number;
  shiny: boolean;
  bonus: HatchBonus;
  ivs: Ivs;
  from: Partial<Record<keyof Ivs, 0 | 1>>;
  parents: EggParent[];
}

/** Sorteio na hora de chocar: um presente a mais para o filhote (o que não serviria fica fora do sorteio). */
function rollBonus(rng: Rng, p: PokemonInstance): HatchBonus {
  const species = getSpecies(p.speciesId);
  const notMax = (Object.keys(p.ivs) as (keyof Ivs)[]).filter((k) => p.ivs[k] < 31);
  const known = new Set([...(p.eggMoves ?? []), ...movesOf(p)]);
  const newEggMoves = species.eggMoves.filter((m) => hasMove(m) && !known.has(m));
  const options: { weight: number; make: () => HatchBonus }[] = [
    { weight: 20, make: () => ({ kind: 'coins', amount: 500 + Math.floor(rng.next() * 10) * 250 }) },
    { weight: 20, make: () => ({ kind: 'friendship' }) },
  ];
  if (notMax.length)
    options.push({ weight: 30, make: () => ({ kind: 'iv', stat: notMax[Math.floor(rng.next() * notMax.length)] }) });
  if (newEggMoves.length)
    options.push({
      weight: 18,
      make: () => ({ kind: 'eggMove', move: newEggMoves[Math.floor(rng.next() * newEggMoves.length)] }),
    });
  if (abilitiesOf(p.speciesId)[2] && abilitySlotOf(p) !== 2)
    options.push({ weight: 12, make: () => ({ kind: 'hidden' }) });
  return pickWeighted(rng, options).make();
}

/** Choca um ovo pronto: o filhote entra na coleção com o que herdou e ganha o prêmio do sorteio. */
export function hatchEgg(state: GameState, id: number, now: number, events: GameEvent[]): HatchResult | null {
  const egg = state.eggs.find((e) => e.id === id);
  if (!egg || !eggReady(egg)) return null;
  state.eggs = state.eggs.filter((e) => e !== egg);
  if (state.carriedEgg === egg.id) delete state.carriedEgg;
  const isNew = !state.pokedex[egg.speciesId]?.caught;
  const rng = rngFrom(state);
  const ivs = { ...egg.ivs };
  // Marco do Diário: um IV perfeito garantido.
  if (hatchMilestone(state, 'nest') && !Object.values(ivs).includes(31)) {
    const keys = Object.keys(ivs) as (keyof Ivs)[];
    ivs[keys[Math.floor(rng.next() * keys.length)]] = 31;
  }
  const p = addToCollection(
    state,
    egg.speciesId,
    BALANCE.daycare.hatchLevel,
    ivs,
    egg.shiny,
    now,
    egg.gift ?? 'Creche',
  );
  p.friendship = BALANCE.friendship.hatch;
  if (egg.nature) p.nature = egg.nature;
  if (egg.hidden) p.abilitySlot = 2;
  if (egg.parents?.length) p.parents = egg.parents;
  giveForm(state, p, rng, now);
  // Nasce sabendo os golpes de ovo (o resto da lista vem dos golpes de nível).
  const teach = (moves: string[]) => {
    p.eggMoves = [...new Set([...(p.eggMoves ?? []), ...moves])];
    p.moveset = [...new Set([...p.eggMoves, ...movesOf(p)])].slice(0, BALANCE.maxMoves);
  };
  if (egg.eggMoves?.length) teach(egg.eggMoves);

  const bonus = rollBonus(rng, p);
  if (bonus.kind === 'iv') p.ivs[bonus.stat] = 31;
  else if (bonus.kind === 'eggMove') teach([bonus.move]);
  else if (bonus.kind === 'hidden') p.abilitySlot = 2;
  else if (bonus.kind === 'friendship') p.friendship = Math.min(255, (p.friendship ?? 0) + 70);
  else state.coins += bonus.amount;

  state.stats.hatched++;
  progressMission(state, 'hatch', 1, events);
  progressMission(state, 'hatch-type', 1, events, getSpecies(p.speciesId).types);
  events.push({ type: 'hatched', uid: p.uid, speciesId: p.speciesId, shiny: p.shiny, isNew });
  return {
    uid: p.uid,
    speciesId: p.speciesId,
    shiny: p.shiny,
    bonus,
    ivs: { ...p.ivs },
    from: egg.from ?? {},
    parents: egg.parents ?? [],
  };
}

/** Ovos prontos: com "chocar sozinho" ligado, chocam; senão esperam o jogador e avisam uma vez. */
export function hatchReadyEggs(state: GameState, now: number, events: GameEvent[]): void {
  claimRareEggs(state);
  const ready = state.eggs.filter(eggReady);
  if (!ready.length) return;
  if (state.settings.autoHatch) {
    for (const egg of ready) hatchEgg(state, egg.id, now, events);
    return;
  }
  const fresh = ready.filter((e) => !e.notified);
  if (!fresh.length) return;
  for (const egg of fresh) egg.notified = true;
  events.push({ type: 'eggReady', count: ready.length });
}

// --- Ovos de presente e pistas -----------------------------------------------------------------

/** Ovos raros: bebês e espécies difíceis de achar. */
const GIFT_SLUGS = [
  'pichu', 'cleffa', 'igglybuff', 'togepi', 'tyrogue', 'smoochum', 'elekid', 'magby', 'azurill', 'wynaut',
  'budew', 'chingling', 'bonsly', 'mime-jr', 'happiny', 'munchlax', 'riolu', 'mantyke', 'eevee', 'dratini',
  'larvitar', 'bagon', 'beldum', 'gible', 'deino', 'axew', 'larvesta', 'goomy',
];
let giftPool: number[] | null = null;
function giftSpecies(): number[] {
  return (giftPool ??= GIFT_SLUGS.flatMap((slug) => {
    try {
      return [speciesId(slug)];
    } catch {
      return [];
    }
  }));
}

/** Um ovo raro de presente (expedições): 3 IVs perfeitos e chance de habilidade oculta. */
export function giveGiftEgg(state: GameState, rng: Rng, origin: string): Egg | null {
  if (!activityUnlocked(state, 'daycare') || state.eggs.length >= nestSize(state)) return null;
  const pool = giftSpecies();
  const species = pool[Math.floor(rng.next() * pool.length)];
  const ivs = randomIvs(rng);
  const keys = Object.keys(ivs) as (keyof Ivs)[];
  for (let i = 0; i < 3; i++) ivs[keys.splice(Math.floor(rng.next() * keys.length), 1)[0]] = 31;
  const egg: Egg = {
    id: state.nextUid++,
    speciesId: species,
    ivs,
    shiny: rollShiny(rng, BALANCE.daycare.shinyMultiplier * computeModifiers(state).shiny),
    cycles: getSpecies(species).hatchCounter,
    progress: 0,
    gift: origin,
    ...(abilitiesOf(species)[2] && rng.next() < 0.3 ? { hidden: true } : {}),
  };
  state.eggs.push(egg);
  return egg;
}

const TYPE_HINTS: Partial<Record<string, string>> = {
  fire: 'Está quentinho…',
  water: 'Parece úmido por fora…',
  grass: 'Tem um cheirinho de planta…',
  electric: 'Dá uns choquinhos de leve!',
  ice: 'Está gelado ao toque!',
  ghost: 'Às vezes parece sumir de vista…',
  psychic: 'Parece saber o que você pensa…',
  dragon: 'É pesado e tem algo de escamoso…',
  fighting: 'Às vezes dá uns chutes!',
  poison: 'Tem umas manchas roxas…',
  ground: 'Está sujo de terra…',
  rock: 'É duro como pedra!',
  flying: 'Parece leve como uma pena…',
  bug: 'Ouve-se um zumbido lá dentro…',
  dark: 'Gosta de ficar na sombra…',
  steel: 'Tem um brilho metálico…',
  fairy: 'Brilha um pouquinho no escuro…',
  normal: 'Parece um ovo comum.',
};

/** O ovo não diz a espécie: só uma pista pelo tipo, e quanto falta pelo barulho. */
export function eggHint(egg: Egg): { title: string; hint: string } {
  const f = egg.progress / egg.cycles;
  const title = eggReady(egg)
    ? 'Ele está se mexendo! Vai chocar!'
    : f > 0.85
      ? 'Está quase chocando!'
      : f > 0.5
        ? 'Dá para ouvir algo lá dentro!'
        : egg.cycles >= 30
          ? 'Vai demorar bastante para chocar.'
          : 'Um ovo misterioso.';
  return { title, hint: TYPE_HINTS[getSpecies(egg.speciesId).types[0]] ?? 'Um ovo misterioso.' };
}

/** Estágio da casca para o desenho: 0 inteiro, 1–3 rachaduras. */
export function eggCrack(egg: Egg): 0 | 1 | 2 | 3 {
  const f = egg.progress / egg.cycles;
  return f >= 1 ? 3 : f > 0.85 ? 2 : f > 0.6 ? 1 : 0;
}



/** Ovos Raros da Mochila (mercador, raides, Game Corner) vão para o ninho assim que houver vaga. */
export function claimRareEggs(state: GameState): void {
  while ((state.items['rare-egg'] ?? 0) > 0) {
    if (!giveGiftEgg(state, rngFrom(state), 'Ovo Raro')) return;
    state.items['rare-egg']--;
    if (!state.items['rare-egg']) delete state.items['rare-egg'];
  }
}

/** Aquecedor: gasta um da Mochila e adianta metade do caminho do ovo. */
export function warmEgg(state: GameState, id: number): boolean {
  const egg = state.eggs.find((e) => e.id === id);
  if (!egg || eggReady(egg) || !(state.items['egg-warmer'] > 0)) return false;
  state.items['egg-warmer']--;
  if (!state.items['egg-warmer']) delete state.items['egg-warmer'];
  egg.progress = Math.min(egg.cycles, egg.progress + egg.cycles * 0.5);
  return true;
}
