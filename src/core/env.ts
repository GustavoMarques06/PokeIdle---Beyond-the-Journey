// Dia/noite e clima. Calculados a partir do relógio real, mas guardados no estado
// (`state.env`) para a simulação continuar determinística e testável.

import { BALANCE, type Route, type TimeOfDay, type TypeName } from '../game-data';

export type Weather = 'clear' | 'sun' | 'rain' | 'sand' | 'fog' | 'hail';

export interface Environment {
  period: TimeOfDay;
  weather: Weather;
}

/** Cenas cobertas: sem clima. */
const INDOOR = new Set(['cave', 'icecave', 'volcano', 'dampcave', 'city', 'sea']);

/** Rota ao ar livre (tem clima e árvores de berry). */
export function isOutdoor(route: Route): boolean {
  return !INDOOR.has(route.scene);
}

export function periodAt(now: number): TimeOfDay {
  const hour = new Date(now).getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function hash(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** O clima muda em blocos de horas; o mesmo bloco sempre dá o mesmo clima. */
export function weatherAt(now: number): Weather {
  const slot = Math.floor(now / (BALANCE.weather.slotHours * 3_600_000));
  const weights = BALANCE.weather.weights;
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = hash(slot) * total;
  for (const [w, weight] of Object.entries(weights) as [Weather, number][]) {
    roll -= weight;
    if (roll < 0) return w;
  }
  return 'clear';
}

export function environmentAt(now: number): Environment {
  return { period: periodAt(now), weather: weatherAt(now) };
}

/** Clima efetivo numa rota: cavernas e salas não têm clima; o deserto vive em tempestade de areia. */
export function routeWeather(route: Route, env: Environment): Weather {
  if (INDOOR.has(route.scene)) return 'clear';
  if (route.scene === 'desert') return env.weather === 'rain' ? 'clear' : 'sand';
  // Granizo só onde faz frio ou em áreas abertas altas; na praia e no deserto vira chuva/areia.
  if (env.weather === 'hail' && route.scene === 'beach') return 'rain';
  return env.weather;
}

/** Multiplicadores de dano por tipo de golpe causados pelo ambiente. */
export function environmentMoveBoost(weather: Weather, period: TimeOfDay): Record<TypeName, number> {
  const w = BALANCE.weather;
  const boost: Record<TypeName, number> = {};
  if (weather === 'sun') {
    boost.fire = w.boost;
    boost.water = w.penalty;
  } else if (weather === 'rain') {
    boost.water = w.boost;
    boost.fire = w.penalty;
  } else if (weather === 'sand') {
    boost.rock = w.sandBoost;
    boost.ground = w.sandBoost;
    boost.steel = w.sandBoost;
  } else if (weather === 'hail') {
    boost.ice = w.hailBoost;
  } else if (weather === 'fog') {
    boost.ghost = w.fogBoost;
  }
  if (period === 'night') {
    boost.ghost = (boost.ghost ?? 1) * w.nightBoost;
    boost.dark = (boost.dark ?? 1) * w.nightBoost;
  }
  return boost;
}

export function mergeBoosts(...maps: Record<TypeName, number>[]): Record<TypeName, number> {
  const out: Record<TypeName, number> = {};
  for (const m of maps) for (const [t, v] of Object.entries(m)) out[t] = (out[t] ?? 1) * v;
  return out;
}
