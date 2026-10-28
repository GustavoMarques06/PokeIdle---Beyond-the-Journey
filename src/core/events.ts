// Eventos do mundo com hora marcada: Pokémon errantes (lendários e raros que aparecem
// por tempo limitado numa rota aleatória) e invasões da Equipe Rocket.

import {
  BALANCE,
  ROAMERS,
  ROUTES,
  getRoute,
  getSpecies,
  hasSpecies,
  speciesId,
  type Route,
} from '../game-data';
import { routeDone } from './collection';
import type { GameEvent, GameState, TeamMember } from './game';
import { randInt, type Rng } from './rng';

export interface RoamerState {
  speciesId: number;
  routeId: string;
  level: number;
  until: number;
}

export interface RocketState {
  routeId: string;
  until: number;
}

const HOUR = 3_600_000;

function huntingGrounds(state: GameState, regionId?: string): Route[] {
  const open = ROUTES.filter((r) => r.kind === 'wild' && r.encounters.length && state.routes[r.id]?.unlocked);
  const local = regionId ? open.filter((r) => r.regionId === regionId) : [];
  return local.length ? local : open;
}

const maxLevel = (r: Route) => Math.max(...r.encounters.map((e) => e.maxLevel));

/** Errantes que já podem aparecer e ainda não foram capturados. */
export function eligibleRoamers(state: GameState) {
  // Lendários têm a própria aba (batalha manual); aqui ficam só os Pokémon raros.
  return ROAMERS.filter(
    (r) =>
      !getSpecies(r.speciesId).legendary &&
      routeDone(state, r.requires) &&
      !state.roamersCaught.includes(r.speciesId),
  );
}

function placeRoamer(
  state: GameState,
  rng: Rng,
  roamer: { speciesId: number; requires: string; bonusLevel: number },
  until: number,
) {
  const region = getRoute(roamer.requires).regionId;
  const grounds = huntingGrounds(state, region).filter((r) => r.id !== state.roamer?.routeId);
  const pool = grounds.length ? grounds : huntingGrounds(state, region);
  const route = pool[Math.floor(rng.next() * pool.length)];
  state.roamer = {
    speciesId: roamer.speciesId,
    routeId: route.id,
    level: maxLevel(route) + roamer.bonusLevel,
    until,
  };
}

export function updateRoamer(state: GameState, now: number, rng: Rng, events: GameEvent[]): void {
  const cfg = BALANCE.roamers;
  if (state.roamer && now >= state.roamer.until) {
    events.push({ type: 'roamerLeft', speciesId: state.roamer.speciesId });
    state.roamer = null;
    state.nextRoamerAt = now + randInt(rng, cfg.minHours * 60, cfg.maxHours * 60) * 60_000;
  }
  if (state.roamer) return;
  if (!state.nextRoamerAt) {
    state.nextRoamerAt = now + randInt(rng, 20, 60) * 60_000;
    return;
  }
  if (now < state.nextRoamerAt) return;
  const options = eligibleRoamers(state);
  if (!options.length) {
    state.nextRoamerAt = now + HOUR;
    return;
  }
  placeRoamer(state, rng, options[Math.floor(rng.next() * options.length)], now + cfg.activeMinutes * 60_000);
  events.push({ type: 'roamerAppeared', speciesId: state.roamer!.speciesId, routeId: state.roamer!.routeId });
}

/** O errante fugiu da batalha: vai para outra rota, mantendo o prazo. */
export function relocateRoamer(state: GameState, rng: Rng): void {
  const r = state.roamer;
  const def = r && ROAMERS.find((x) => x.speciesId === r.speciesId);
  if (r && def) placeRoamer(state, rng, def, r.until);
}

export function roamerCaught(state: GameState, now: number, rng: Rng): void {
  if (!state.roamer) return;
  state.roamersCaught.push(state.roamer.speciesId);
  state.roamer = null;
  const cfg = BALANCE.roamers;
  state.nextRoamerAt = now + randInt(rng, cfg.minHours * 60, cfg.maxHours * 60) * 60_000;
}

// --- Equipe Rocket -------------------------------------------------------------------

/** Pokémon usados pelos recrutas, por região. */
const ROCKET_POOLS: Record<string, string[]> = {
  kanto: [
    'rattata',
    'zubat',
    'ekans',
    'koffing',
    'grimer',
    'drowzee',
    'raticate',
    'golbat',
    'arbok',
    'weezing',
    'muk',
  ],
  johto: ['zubat', 'koffing', 'murkrow', 'houndour', 'golbat', 'weezing', 'houndoom', 'arbok'],
  hoenn: ['poochyena', 'carvanha', 'numel', 'mightyena', 'sharpedo', 'camerupt', 'golbat', 'crobat'],
  sinnoh: ['stunky', 'glameow', 'zubat', 'croagunk', 'skuntank', 'purugly', 'toxicroak', 'golbat'],
  unova: ['patrat', 'purrloin', 'trubbish', 'sandile', 'watchog', 'liepard', 'garbodor', 'krookodile'],
  kalos: ['houndour', 'croagunk', 'liepard', 'mightyena', 'golbat', 'houndoom', 'toxicroak', 'pyroar'],
};

const rocketPool = (regionId: string): number[] =>
  (ROCKET_POOLS[regionId] ?? ROCKET_POOLS.kanto)
    .filter((slug) => {
      try {
        return hasSpecies(speciesId(slug));
      } catch {
        return false;
      }
    })
    .map(speciesId);

export function rocketUnlocked(state: GameState): boolean {
  return routeDone(state, BALANCE.rocket.unlock);
}

export function updateRocket(state: GameState, now: number, rng: Rng, events: GameEvent[]): void {
  const cfg = BALANCE.rocket;
  if (state.rocket && now >= state.rocket.until) {
    state.rocket = null;
    events.push({ type: 'rocketLeft' });
  }
  if (state.rocket || !rocketUnlocked(state)) return;
  if (!state.nextRocketAt) {
    state.nextRocketAt = now + randInt(rng, 30, 90) * 60_000;
    return;
  }
  if (now < state.nextRocketAt) return;
  const grounds = huntingGrounds(state);
  const route = grounds[Math.floor(rng.next() * grounds.length)];
  state.rocket = { routeId: route.id, until: now + cfg.activeMinutes * 60_000 };
  state.nextRocketAt = now + randInt(rng, cfg.minHours * 60, cfg.maxHours * 60) * 60_000;
  events.push({ type: 'rocketAppeared', routeId: route.id });
}

export function rocketTeam(routeId: string, rng: Rng): TeamMember[] {
  const route = getRoute(routeId);
  const pool = rocketPool(route.regionId);
  const level = Math.min(100, maxLevel(route) + BALANCE.rocket.levelBonus);
  const size = randInt(rng, 2, 3);
  return Array.from({ length: size }, (_, i) => ({
    speciesId: pool[Math.floor(rng.next() * pool.length)],
    level: Math.min(100, level + i),
  }));
}
