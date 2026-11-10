// Raides: de tempos em tempos um chefe gigante aparece numa rota. Ele tem muito mais HP,
// segura um item, fica furioso em 2/3 e 1/3 da vida e foge se o tempo acabar. Vencê-lo rende
// moedas, itens raros e uma chance de capturar o Pokémon.

import { BALANCE, ROUTES, getSpecies, typeEffectiveness, type Route, type TypeName } from '../game-data';
import { routeDone } from './collection';
import { weekOf } from './records';
import type { GameEvent, GameState, TeamMember } from './state';
import { pickWeighted, randInt, type Rng } from './rng';

export interface RaidState {
  speciesId: number;
  routeId: string;
  level: number;
  until: number;
  /** Modificador da semana em que a raide surgiu (fica com ela até o fim). */
  mod?: RaidModId;
}

const HOUR_MIN = 60;

/** Itens que o chefe da raide pode segurar. */
const RAID_HELD = [
  'leftovers',
  'life-orb',
  'focus-sash',
  'expert-belt',
  'choice-band',
  'choice-specs',
  'shell-bell',
];

/** Estrelas da raide (1 a 5), pela força da espécie (soma dos atributos base). */
export function raidStars(speciesId: number): number {
  const s = getSpecies(speciesId).baseStats;
  const total = s.hp + s.atk + s.def + s.spAtk + s.spDef + s.spe;
  return total < 400 ? 1 : total < 470 ? 2 : total < 530 ? 3 : total < 600 ? 4 : 5;
}

const byStars = <T,>(list: T[], stars: number): T => list[Math.max(0, Math.min(list.length - 1, stars - 1))];

// --- Modificador da semana -----------------------------------------------------------------------

export type RaidModId = 'storm' | 'frenzy' | 'treasure' | 'blitz';

/** Cada semana as raides vêm com uma regra a mais, que muda como vale a pena lutar. */
export const RAID_MODS: Record<
  RaidModId,
  {
    /** Golpes destes tipos batem mais forte (dos dois lados). */
    boostTypes?: TypeName[];
    typeBoost?: number;
    /** Intervalo entre os golpes do chefe (< 1 = mais rápido). */
    bossInterval?: number;
    coins?: number;
    hp?: number;
    extraLoot?: number;
    time?: number;
    /** Captura garantida ao vencer. */
    sureCatch?: boolean;
  }
> = {
  storm: { boostTypes: ['electric', 'water'], typeBoost: 1.5 },
  frenzy: { bossInterval: 0.8, coins: 1.5 },
  treasure: { hp: 1.25, extraLoot: 2 },
  blitz: { time: 0.75, sureCatch: true },
};

const RAID_MOD_ORDER: RaidModId[] = ['storm', 'frenzy', 'treasure', 'blitz'];

/** O modificador das raides que surgem nesta semana. */
export const raidModifier = (now: number): RaidModId => RAID_MOD_ORDER[weekOf(now) % RAID_MOD_ORDER.length];

const modOf = (mod?: RaidModId) => (mod ? RAID_MODS[mod] : undefined);

/** Multiplicador de HP do chefe pelas estrelas (e pelo modificador da semana). */
export const raidHpMultiplier = (speciesId: number, mod?: RaidModId) =>
  byStars(BALANCE.raid.hpByStars, raidStars(speciesId)) * (modOf(mod)?.hp ?? 1);

/** Tempo limite (ms) da luta pelas estrelas (e pelo modificador da semana). */
export const raidTimeLimit = (speciesId: number, mod?: RaidModId) =>
  Math.round(byStars(BALANCE.raid.timeByStars, raidStars(speciesId)) * (modOf(mod)?.time ?? 1));

/** Sorteios de item na vitória pelas estrelas (e pelo modificador da semana). */
export const raidLootRolls = (speciesId: number, mod?: RaidModId) =>
  byStars(BALANCE.raid.lootRollsByStars, raidStars(speciesId)) + (modOf(mod)?.extraLoot ?? 0);

// --- Escudo -------------------------------------------------------------------------------------

const ALL_TYPES: TypeName[] = [
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
  'fairy',
];

/**
 * Tipos que quebram o escudo do chefe: os super efetivos contra ele (os de 4× primeiro, no máximo três). Golpes
 * desses tipos atravessam o escudo e o derrubam rápido; os outros batem fraco e quase não o arranham.
 */
export function raidBreakers(speciesId: number): TypeName[] {
  const types = getSpecies(speciesId).types;
  return ALL_TYPES.map((t) => ({ t, mult: typeEffectiveness(t, types) }))
    .filter((x) => x.mult > 1)
    .sort((a, b) => b.mult - a.mult)
    .slice(0, 3)
    .map((x) => x.t);
}

/** IVs perfeitos do chefe (e do Pokémon capturado): 3 em 1★ até 6 em 4★ ou mais. */
export const raidPerfectIvs = (speciesId: number) => Math.min(6, BALANCE.raid.perfectIvs + Math.max(0, raidStars(speciesId) - 2));

/** Bônus de moedas pelas estrelas: +25% por estrela acima da primeira. */
export const raidStarBonus = (stars: number) => 1 + 0.25 * (stars - 1);

export function raidUnlocked(state: GameState): boolean {
  return routeDone(state, BALANCE.raid.unlock);
}

const maxLevel = (r: Route) => Math.max(...r.encounters.map((e) => e.maxLevel));

/** Última forma de uma linha evolutiva (escolhe um ramo ao acaso). */
function finalForm(speciesId: number, rng: Rng): number {
  let id = speciesId;
  for (let guard = 0; guard < 4; guard++) {
    const evos = getSpecies(id).evolutions;
    if (!evos.length) break;
    id = evos[Math.floor(rng.next() * evos.length)].to;
  }
  return id;
}

/** Rotas onde uma raide pode surgir: as de captura já liberadas. */
const raidGrounds = (state: GameState) =>
  ROUTES.filter((r) => r.kind === 'wild' && r.encounters.length && state.routes[r.id]?.unlocked);

/**
 * Nível do chefe: o da rota mais avançada que você já liberou (mais o bônus da raide), mesmo que ela surja numa rota
 * do começo. Antes valia o nível da própria rota, e no fim do jogo uma raide na Rota 1 vinha no nível 10 e caía em
 * segundos.
 */
export function raidLevel(state: GameState, route: Route): number {
  const frontier = Math.max(maxLevel(route), ...raidGrounds(state).map(maxLevel));
  return Math.min(BALANCE.maxLevel, frontier + BALANCE.raid.levelBonus);
}

/** Sorteia a raide da vez nas rotas já liberadas (a espécie é a forma final de um encontro local). */
function pickRaid(state: GameState, now: number, rng: Rng): RaidState | null {
  const grounds = raidGrounds(state);
  if (!grounds.length) return null;
  const route = grounds[Math.floor(rng.next() * grounds.length)];
  const encounter = pickWeighted(rng, route.encounters);
  const speciesId = finalForm(encounter.speciesId, rng);
  const level = raidLevel(state, route);
  return {
    speciesId,
    routeId: route.id,
    level,
    until: now + BALANCE.raid.activeMinutes * 60_000,
    mod: raidModifier(now),
  };
}

export function updateRaid(state: GameState, now: number, rng: Rng, events: GameEvent[]): void {
  const cfg = BALANCE.raid;
  if (state.raid && now >= state.raid.until && state.battle.kind !== 'raid') {
    events.push({ type: 'raidLeft', speciesId: state.raid.speciesId });
    state.raid = null;
  }
  if (state.raid || !raidUnlocked(state)) return;
  if (!state.nextRaidAt) {
    state.nextRaidAt = now + randInt(rng, 20, 60) * 60_000;
    return;
  }
  if (now < state.nextRaidAt) return;
  const raid = pickRaid(state, now, rng);
  state.nextRaidAt = now + randInt(rng, cfg.minHours * HOUR_MIN, cfg.maxHours * HOUR_MIN) * 60_000;
  if (!raid) return;
  state.raid = raid;
  events.push({ type: 'raidAppeared', speciesId: raid.speciesId });
}

/** O time (um só) que a raide leva a campo. */
export function raidTeam(raid: RaidState, rng: Rng): TeamMember[] {
  return [
    {
      speciesId: raid.speciesId,
      level: raid.level,
      boost: BALANCE.raid.boost,
      held: RAID_HELD[Math.floor(rng.next() * RAID_HELD.length)],
      abilitySlot: rng.next() < 0.5 ? 1 : 0,
    },
  ];
}
