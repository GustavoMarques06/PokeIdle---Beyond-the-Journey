// Missões diárias e semanais. O sorteio usa o dia/semana local + a semente do save,
// então o mesmo jogador vê sempre as mesmas missões naquele dia.

import {
  BALANCE,
  DAILY_MISSIONS,
  ROUTES,
  WEEKLY_MISSIONS,
  getSpecies,
  type MissionKind,
  type MissionTemplate,
  type TypeName,
} from '../game-data';
import { activityUnlocked, giveItems } from './collection';
import type { GameEvent, GameState } from './game';
import { pickWeighted, seededRng, type Rng } from './rng';

export type MissionScope = 'daily' | 'weekly';

export interface MissionReward {
  coins?: number;
  research?: number;
  tokens?: number;
  items?: Record<string, number>;
}

export interface Mission {
  id: string;
  kind: MissionKind;
  target: number;
  progress: number;
  claimed: boolean;
  reward: MissionReward;
  /** Tipo exigido nas missões de captura por tipo. */
  type?: TypeName;
}

export interface MissionsState {
  day: number;
  week: number;
  daily: Mission[];
  weekly: Mission[];
}

/** Dia/semana impossíveis: força o primeiro sorteio. */
export const emptyMissions = (): MissionsState => ({ day: -1e9, week: -1e9, daily: [], weekly: [] });

/** Dia local (contado desde 1970), respeitando o fuso do computador. */
export function localDay(now: number): number {
  return Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / 86_400_000);
}

/** Semanas começam na segunda-feira (o dia 0 de 1970 foi uma quinta). */
export const weekOf = (day: number) => Math.floor((day + 3) / 7);

/** Próxima virada de dia/semana, para o contador da tela. */
export function nextReset(now: number, scope: MissionScope): number {
  const offset = new Date(now).getTimezoneOffset() * 60_000;
  const day = localDay(now);
  const nextDay = scope === 'daily' ? day + 1 : (weekOf(day) + 1) * 7 - 3;
  return nextDay * 86_400_000 + offset;
}

/** Tipos que o jogador consegue encontrar nas rotas liberadas. */
function availableTypes(state: GameState): TypeName[] {
  const types = new Set<TypeName>();
  for (const r of ROUTES) {
    if (!state.routes[r.id]?.unlocked) continue;
    for (const e of r.encounters) for (const t of getSpecies(e.speciesId).types) types.add(t);
  }
  return [...types];
}

/** Tipos que a Creche consegue chocar agora: os da coleção que podem ter ovos (sem lendários). */
function breedableTypes(state: GameState): TypeName[] {
  const types = new Set<TypeName>();
  for (const p of state.collection) {
    const s = getSpecies(p.speciesId);
    if (!s.legendary && s.eggGroups.length && !s.eggGroups.includes('undiscovered')) for (const t of s.types) types.add(t);
  }
  return types.size ? [...types] : availableTypes(state);
}

/** Recompensas crescem com as regiões liberadas, para continuarem valendo a pena. */
function rewardScale(state: GameState): number {
  const regions = new Set(ROUTES.filter((r) => state.routes[r.id]?.unlocked).map((r) => r.regionId));
  return Math.max(1, regions.size);
}

function buildMission(state: GameState, t: MissionTemplate, rng: Rng, id: string): Mission {
  const target = t.targets[Math.floor(rng.next() * t.targets.length)];
  const scale = rewardScale(state);
  const reward: MissionReward = {};
  if (t.reward.coins) reward.coins = Math.round(t.reward.coins * target * scale);
  if (t.reward.research) reward.research = t.reward.research * (t.kind === 'kills' ? 1 : target);
  if (t.reward.tokens) reward.tokens = t.reward.tokens;
  if (t.reward.items) {
    reward.items = Object.fromEntries(Object.entries(t.reward.items).map(([k, v]) => [k, v * target]));
  }
  const mission: Mission = { id, kind: t.kind, target, progress: 0, claimed: false, reward };
  if (t.kind === 'capture-type' || t.kind === 'hatch-type') {
    const types = t.kind === 'hatch-type' ? breedableTypes(state) : availableTypes(state);
    mission.type = types[Math.floor(rng.next() * types.length)] ?? 'normal';
  }
  return mission;
}

function draw(
  state: GameState,
  pool: MissionTemplate[],
  count: number,
  seed: number,
  prefix: string,
): Mission[] {
  const rng = seededRng(seed);
  const open = pool
    .filter((t) => !t.requires || activityUnlocked(state, t.requires))
    .map((t) => ({ t, weight: 1 }));
  const out: Mission[] = [];
  while (out.length < count && open.length) {
    const pick = pickWeighted(rng, open);
    open.splice(open.indexOf(pick), 1);
    out.push(buildMission(state, pick.t, rng, `${prefix}-${out.length}`));
  }
  return out;
}

/** Sorteia novas missões quando o dia ou a semana mudam. */
export function refreshMissions(state: GameState, now: number, events: GameEvent[]): void {
  const m = state.missions;
  const day = localDay(now);
  const week = weekOf(day);
  if (day !== m.day) {
    m.day = day;
    m.daily = draw(
      state,
      DAILY_MISSIONS,
      BALANCE.missions.daily,
      (state.createdAt ^ (day * 2654435761)) | 0,
      `d${day}`,
    );
    events.push({ type: 'missionsRefreshed', scope: 'daily' });
  }
  if (week !== m.week) {
    m.week = week;
    m.weekly = draw(
      state,
      WEEKLY_MISSIONS,
      BALANCE.missions.weekly,
      (state.createdAt ^ (week * 40503)) | 0,
      `w${week}`,
    );
    events.push({ type: 'missionsRefreshed', scope: 'weekly' });
  }
}

/** Avança as missões de um tipo. `type` filtra missões de captura por tipo. */
export function progressMission(
  state: GameState,
  kind: MissionKind,
  amount: number,
  events?: GameEvent[],
  types?: TypeName[],
): void {
  for (const m of [...state.missions.daily, ...state.missions.weekly]) {
    if (m.kind !== kind || m.claimed || m.progress >= m.target) continue;
    if (m.type && !types?.includes(m.type)) continue;
    m.progress = Math.min(m.target, m.progress + amount);
    if (m.progress >= m.target) events?.push({ type: 'missionDone', id: m.id });
  }
}

export function claimMission(state: GameState, scope: MissionScope, id: string): MissionReward | null {
  const m = state.missions[scope].find((x) => x.id === id);
  if (!m || m.claimed || m.progress < m.target) return null;
  m.claimed = true;
  state.coins += m.reward.coins ?? 0;
  state.research.points += m.reward.research ?? 0;
  state.tokens += m.reward.tokens ?? 0;
  giveItems(state, m.reward.items);
  return m.reward;
}

export function claimableMissions(state: GameState): number {
  return [...state.missions.daily, ...state.missions.weekly].filter(
    (m) => !m.claimed && m.progress >= m.target,
  ).length;
}
