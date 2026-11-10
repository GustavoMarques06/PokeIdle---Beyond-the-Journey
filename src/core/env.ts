// Dia/noite e clima. Calculados a partir do relógio real, mas guardados no estado
// (`state.env`) para a simulação continuar determinística e testável.

import { BALANCE, REGIONS, getRoute, type Route, type TimeOfDay, type TypeName } from '../game-data';

export type Weather = 'clear' | 'sun' | 'rain' | 'sand' | 'fog' | 'hail';

/** Uma frente: um clima que cruza a região rota a rota (o mapa mostra onde ela está e para onde vai). */
export interface WeatherFront {
  routeId: string;
  weather: Weather;
  /** Quando ela sai desta rota. */
  until: number;
  /** A próxima rota (vazio quando a frente se desfaz ao sair). */
  next?: string;
}

/** Eventos raros do céu: aurora nos campos de neve, arco-íris depois da chuva, chuva de meteoros à noite. */
export type SkyEvent = 'aurora' | 'rainbow' | 'meteors';

export interface Environment {
  period: TimeOfDay;
  weather: Weather;
  /** Frentes em movimento (no máximo uma por região). */
  fronts?: WeatherFront[];
  /** Evento do céu de agora (a aurora depende da rota: ver skyEvent). */
  sky?: 'rainbow' | 'meteors';
}

/** Cenários novos que são fechados (salas da Liga, esconderijos, torres). */
export const INDOOR_NEW = [
  'league-hall',
  'league-ice',
  'league-fight',
  'league-ghost',
  'league-dragon',
  'league-psychic',
  'league-dark',
  'league-poison',
  'league-fire',
  'league-steel',
  'league-water',
  'league-ground',
  'rocket-base',
  'lab',
  'seafloor',
  'tower',
  'powerplant',
];

/** Cenas cobertas: sem clima. */
const INDOOR = new Set(['cave', 'icecave', 'volcano', 'dampcave', 'city', 'sea', ...INDOOR_NEW]);

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
  return { period: periodAt(now), weather: weatherAt(now), fronts: frontsAt(now), sky: skyAt(now) };
}

// --- Frentes: um clima que cruza a região, rota a rota --------------------------------------------

/** Cada frente dura um bloco de 3 h e anda uma rota a cada 20 min. */
const FRONT_BLOCK_MS = 3 * 3_600_000;
const FRONT_STEP_MS = 20 * 60_000;
/** Uma em cada quatro vezes a região passa o bloco sem frente. */
const FRONT_QUIET = 0.25;
const FRONT_WEATHERS: Weather[] = ['rain', 'rain', 'fog', 'hail', 'sun', 'sand'];
/** Caçar na rota onde a frente está vale a viagem: o shiny fica mais provável. */
export const FRONT_SHINY = 1.5;

let frontPaths: string[][] | undefined;

/** O caminho que as frentes fazem em cada região: as rotas ao ar livre, na ordem da jornada. */
function regionFrontPaths(): string[][] {
  return (frontPaths ??= REGIONS.map((region) =>
    region.routes
      .map(getRoute)
      // Deserto e campo de neve já têm o clima deles.
      .filter((r) => r.kind === 'wild' && isOutdoor(r) && r.scene !== 'desert' && r.scene !== 'snowfield')
      .map((r) => r.id),
  ));
}

/** As frentes de agora: no máximo uma por região, cada uma parada numa rota até `until`. */
export function frontsAt(now: number): WeatherFront[] {
  const block = Math.floor(now / FRONT_BLOCK_MS);
  const step = Math.floor((now - block * FRONT_BLOCK_MS) / FRONT_STEP_MS);
  const fronts: WeatherFront[] = [];
  regionFrontPaths().forEach((path, i) => {
    if (!path.length || hash(block * 31 + i * 977 + 5) < FRONT_QUIET) return;
    const weather = FRONT_WEATHERS[Math.floor(hash(block * 17 + i * 131 + 9) * FRONT_WEATHERS.length)];
    const index = (Math.floor(hash(block * 13 + i * 71 + 3) * path.length) + step) % path.length;
    const until = block * FRONT_BLOCK_MS + (step + 1) * FRONT_STEP_MS;
    const last = until >= (block + 1) * FRONT_BLOCK_MS;
    fronts.push({
      routeId: path[index],
      weather,
      until,
      ...(last ? {} : { next: path[(index + 1) % path.length] }),
    });
  });
  return fronts;
}

/** A frente que está sobre a rota, se houver. */
export function frontOn(env: Environment, routeId: string): WeatherFront | undefined {
  return env.fronts?.find((f) => f.routeId === routeId);
}

// --- Eventos raros do céu -------------------------------------------------------------------------

const SLOT_MS = BALANCE.weather.slotHours * 3_600_000;
/** O arco-íris dura a primeira meia hora de céu aberto depois de uma chuva. */
const RAINBOW_MS = 30 * 60_000;
/** Chance de a hora ter chuva de meteoros (nas noites de céu limpo). */
const METEOR_CHANCE = 0.2;
/** Aurora e arco-íris dobram a chance de shiny; na chuva de meteoros os selvagens podem trazer um Star Piece. */
export const SKY_SHINY = 2;
export const METEOR_ITEM_CHANCE = 0.1;

/** O evento do céu de agora (vale para todas as rotas ao ar livre com céu aberto). */
export function skyAt(now: number): 'rainbow' | 'meteors' | undefined {
  const weather = weatherAt(now);
  if (weather !== 'clear' && weather !== 'sun') return undefined;
  if (periodAt(now) === 'day') {
    const slotStart = Math.floor(now / SLOT_MS) * SLOT_MS;
    return now - slotStart < RAINBOW_MS && weatherAt(slotStart - 1) === 'rain' ? 'rainbow' : undefined;
  }
  return weather === 'clear' && hash(Math.floor(now / 3_600_000) * 7 + 3) < METEOR_CHANCE ? 'meteors' : undefined;
}

/** O evento do céu que se vê desta rota: a aurora (noite limpa nos campos de neve), o arco-íris ou os meteoros. */
export function skyEvent(route: Route, env: Environment): SkyEvent | undefined {
  if (!isOutdoor(route)) return undefined;
  const weather = routeWeather(route, env);
  if (route.scene === 'snowfield') return weather === 'clear' && env.period === 'night' ? 'aurora' : undefined;
  return weather === 'clear' || weather === 'sun' ? env.sky : undefined;
}

/** Clima efetivo numa rota: cavernas e salas não têm clima; o deserto vive em tempestade de areia. */
export function routeWeather(route: Route, env: Environment): Weather {
  if (INDOOR.has(route.scene)) return 'clear';
  // Uma frente sobre a rota troca o clima dela (e segue as mesmas regras de praia e afins).
  const here = frontOn(env, route.id)?.weather ?? env.weather;
  if (route.scene === 'desert') return here === 'rain' ? 'clear' : 'sand';
  // Granizo só onde faz frio ou em áreas abertas altas; na praia e no deserto vira chuva/areia.
  if (here === 'hail' && route.scene === 'beach') return 'rain';
  // Nos campos de neve neva quase sempre (como na Rota 217): só o sol, a névoa e a noite limpa (com a aurora)
  // abrem uma brecha.
  if (route.scene === 'snowfield') {
    const opening = here === 'sun' || here === 'fog' || (here === 'clear' && env.period === 'night');
    if (!opening) return 'hail';
  }
  return here;
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
