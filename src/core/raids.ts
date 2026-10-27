// Raides: de tempos em tempos um chefe gigante aparece numa rota. Ele tem muito mais HP,
// segura um item, fica furioso em 2/3 e 1/3 da vida e foge se o tempo acabar. Vencê-lo rende
// moedas, itens raros e uma chance de capturar o Pokémon.

import { BALANCE, ROUTES, getSpecies, type Route } from '../game-data';
import { routeDone } from './collection';
import type { GameEvent, GameState, TeamMember } from './state';
import { pickWeighted, randInt, type Rng } from './rng';

export interface RaidState {
  speciesId: number;
  routeId: string;
  level: number;
  until: number;
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

/** Sorteia a raide da vez nas rotas já liberadas (a espécie é a forma final de um encontro local). */
function pickRaid(state: GameState, now: number, rng: Rng): RaidState | null {
  const grounds = ROUTES.filter(
    (r) => r.kind === 'wild' && r.encounters.length && state.routes[r.id]?.unlocked,
  );
  if (!grounds.length) return null;
  const route = grounds[Math.floor(rng.next() * grounds.length)];
  const encounter = pickWeighted(rng, route.encounters);
  const speciesId = finalForm(encounter.speciesId, rng);
  const level = Math.min(BALANCE.maxLevel, maxLevel(route) + BALANCE.raid.levelBonus);
  return { speciesId, routeId: route.id, level, until: now + BALANCE.raid.activeMinutes * 60_000 };
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
