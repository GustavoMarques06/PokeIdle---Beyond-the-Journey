// Telemetria local de balanceamento (só desenvolvimento): simula um jogador que fica em cada
// rota até liberar o chefe e mede o ritmo da campanha e a dificuldade das raides.
// Uso: `npm run balance` (ver scripts/balance-report.ts).

import { BALANCE, ROUTES, getRoute } from '../game-data';
import { addToCollection } from './collection';
import {
  advance,
  canChallengeBoss,
  challengeBoss,
  challengeRaid,
  newGame,
  routeCleared,
  selectRoute,
  step,
  type GameEvent,
} from './game';
import { statsOf } from './pokemon';
import { rngFrom } from './rng';

const MINUTE = 60_000;

export interface RoutePace {
  routeId: string;
  /** Minutos de jogo ativo para concluir a rota (null = não concluiu no limite). */
  minutes: number | null;
  level: number;
}

/** Ritmo da campanha: minutos para concluir cada rota seguindo sempre em frente. */
export function campaignPace(starter: number, lastRouteId: string, maxMinutes = 900, seed = 42): RoutePace[] {
  const s = newGame(starter, 0, seed);
  const out: RoutePace[] = [];
  const last = ROUTES.findIndex((r) => r.id === lastRouteId);
  let minutes = 0;
  let routeStart = 0;
  while (minutes < maxMinutes) {
    advance(s, MINUTE, 0);
    minutes++;
    const id = s.currentRouteId;
    if (canChallengeBoss(s, id) && s.battle.kind === 'wild') challengeBoss(s, id);
    if (!routeCleared(s, id)) continue;
    out.push({ routeId: id, minutes: minutes - routeStart, level: s.collection[0].level });
    const index = ROUTES.findIndex((r) => r.id === id);
    if (index >= last) break;
    routeStart = minutes;
    selectRoute(s, ROUTES[index + 1].id);
  }
  return out;
}

export interface RaidOutcome {
  wins: number;
  timeouts: number;
  faints: number;
  avgSeconds: number;
  runs: number;
}

type RaidEnd = 'win' | 'timeout' | 'faint';

/** Uma raide contra um jogador (ativo + 2 reservas) `offset` níveis acima do máximo da rota. */
function fightRaid(routeId: string, species: number, offset: number, seed: number, allies = 0) {
  const route = getRoute(routeId);
  const maxLevel = Math.max(...route.encounters.map((e) => e.maxLevel));
  const ivs = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
  const s = newGame(1, 0, seed);
  for (const id of ['mt-moon', 'rota-4']) s.routes[id].bossDefeated = true;
  const lead = addToCollection(s, species, maxLevel + offset, { ...ivs }, false, 0, 'sim');
  s.activeUid = lead.uid;
  lead.currentHp = statsOf(lead).hp;
  for (const sp of [9, 59]) {
    s.battleTeam.push(addToCollection(s, sp, maxLevel + offset, { ...ivs }, false, 0, 'sim').uid);
  }
  s.routes[routeId].unlocked = true;
  // Amigos do Cabo Link (times recebidos): até dois ajudam na raide.
  if (allies > 0)
    (s as unknown as { link: { ghosts: unknown[] } }).link = {
      ...s.link,
      ghosts: Array.from({ length: allies }, (_, i) => ({
        name: `AMIGO ${i + 1}`,
        team: [{ speciesId: 25 }],
      })),
    };
  s.raid = { speciesId: 6, routeId, level: maxLevel + BALANCE.raid.levelBonus, until: 1e12 };
  challengeRaid(s);
  const rng = rngFrom(s);
  let t = 0;
  for (; t < 400_000; t += BALANCE.tickMs) {
    const events: GameEvent[] = [];
    step(s, BALANCE.tickMs, rng, 0, events);
    if (events.some((e) => e.type === 'raidDefeated')) return { end: 'win' as RaidEnd, ms: t };
    if (events.some((e) => e.type === 'raidFailed')) return { end: 'timeout' as RaidEnd, ms: t };
    if (events.some((e) => e.type === 'playerFainted')) return { end: 'faint' as RaidEnd, ms: t };
  }
  return { end: 'timeout' as RaidEnd, ms: t };
}

export function raidOutcome(
  routeId: string,
  species: number,
  offset = 0,
  runs = 10,
  allies = 0,
): RaidOutcome {
  const out: RaidOutcome = { wins: 0, timeouts: 0, faints: 0, avgSeconds: 0, runs };
  let total = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const r = fightRaid(routeId, species, offset, seed, allies);
    if (r.end === 'win') out.wins++;
    else if (r.end === 'timeout') out.timeouts++;
    else out.faints++;
    total += r.ms;
  }
  out.avgSeconds = Math.round(total / runs / 1000);
  return out;
}
