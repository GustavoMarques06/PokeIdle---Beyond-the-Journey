// Torre de Batalha: andares infinitos de treinadores cada vez mais fortes. O Pokémon
// ativo luta sozinho; perder encerra a subida e o melhor andar entra no ranking.

import {
  BALANCE,
  SPECIES,
  TM_POOL,
  TOWER_SHOP,
  WEEKLY_TOWER_MILESTONES,
  WEEKLY_TOWER_MODS,
  WEEKLY_TOWER_TYPES,
  getSpecies,
  type TypeName,
  type WeeklyTowerMod,
} from '../game-data';
import { activityUnlocked, giveItems, unlockTm } from './collection';
import { eliteItemOf } from './loadout';
import type { GameState, TeamMember } from './game';
import { weekOf } from './records';
import { randInt, rngFrom, seededRng, type Rng } from './rng';

export interface TowerRun {
  floor: number;
  at: number;
  speciesId: number;
}

/** Melhor andar de uma semana da Torre semanal. */
export interface WeeklyRecord {
  week: number;
  floor: number;
  speciesId: number;
  at: number;
}

export interface TowerState {
  best: number;
  points: number;
  /** Andar atual da subida em andamento (0 = nenhuma). */
  floor: number;
  /** Melhores subidas (ranking local). */
  runs: TowerRun[];
  /** Torre semanal: semana atual, melhor andar nela e marcos já pagos. */
  weekly: { week: number; best: number; claimed: number[] };
  /** Melhor andar de cada semana jogada (as mais recentes primeiro). */
  weeklyHistory: WeeklyRecord[];
}

export const emptyTower = (): TowerState => ({
  best: 0,
  points: 0,
  floor: 0,
  runs: [],
  weekly: { week: 0, best: 0, claimed: [] },
  weeklyHistory: [],
});

const FINAL_STAGES = SPECIES.filter((s) => !s.legendary && !s.baby && s.evolutions.length === 0).map(
  (s) => s.id,
);
const LEGENDARIES = SPECIES.filter((s) => s.legendary).map((s) => s.id);

export function towerUnlocked(state: GameState): boolean {
  return activityUnlocked(state, 'tower');
}

export const isBossFloor = (floor: number) => floor % BALANCE.tower.bossEvery === 0;

export function floorLevel(floor: number): { level: number; boost: number } {
  const t = BALANCE.tower;
  const raw = t.baseLevel + floor * t.levelsPerFloor;
  const over = Math.max(0, floor - (100 - t.baseLevel) / t.levelsPerFloor);
  return { level: Math.min(100, Math.round(raw)), boost: 1 + t.boostPerFloor * over };
}

export function floorTeam(floor: number, rng: Rng, extraBoost = 1): TeamMember[] {
  const floorStats = floorLevel(floor);
  const level = floorStats.level;
  const boost = floorStats.boost * extraBoost;
  const pick = (pool: number[]) => pool[Math.floor(rng.next() * pool.length)];
  // O último (o ás) sempre segura um item de elite; os outros, do andar 10 em diante.
  const member = (speciesId: number, ace: boolean): TeamMember => ({
    speciesId,
    level,
    boost,
    held: ace || floor >= BALANCE.tower.bossEvery ? eliteItemOf(speciesId) : undefined,
    abilitySlot: rng.next() < 0.5 ? 1 : 0,
  });
  const team = [0, 1].map(() => member(pick(FINAL_STAGES), false));
  team.push(member(pick(isBossFloor(floor) && LEGENDARIES.length ? LEGENDARIES : FINAL_STAGES), true));
  return team;
}

/** Andar vencido: BP e recorde (a Torre semanal tem o recorde dela, ver weeklyFloorCleared). */
export function towerFloorCleared(state: GameState, floor: number, countsForBest = true): number {
  const points = BALANCE.tower.pointsPerFloor * (isBossFloor(floor) ? 5 : 1);
  state.tower.points += points;
  if (countsForBest) state.tower.best = Math.max(state.tower.best, floor);
  state.tower.floor = floor + 1;
  return points;
}

/** Fim da subida (derrota ou desistência): registra no ranking (normal ou da semana). */
export function endTowerRun(state: GameState, now: number, speciesId: number): number {
  const reached = Math.max(0, state.tower.floor - 1);
  state.tower.floor = 0;
  if (state.battle.kind === 'tower' && state.battle.weekly) {
    recordWeekly(state, reached, speciesId, now);
    return reached;
  }
  if (reached > 0) {
    state.tower.runs.push({ floor: reached, at: now, speciesId });
    state.tower.runs.sort((a, b) => b.floor - a.floor || a.at - b.at);
    state.tower.runs = state.tower.runs.slice(0, 10);
  }
  return reached;
}

export function buyTowerReward(state: GameState, id: string): string | null {
  const entry = TOWER_SHOP.find((e) => e.id === id);
  if (!entry || state.tower.points < entry.price) return null;
  if (entry.give.tm) {
    const options = TM_POOL.filter((m) => !state.tms.includes(m));
    if (!options.length) return null;
    const tm = options[randInt(rngFrom(state), 0, options.length - 1)];
    state.tower.points -= entry.price;
    unlockTm(state, tm);
    return tm;
  }
  state.tower.points -= entry.price;
  giveItems(state, entry.give.items);
  state.research.points += entry.give.research ?? 0;
  return entry.id;
}

// --- Torre semanal -------------------------------------------------------------------------

export interface WeeklyRule {
  week: number;
  type: TypeName;
  mod: WeeklyTowerMod;
}

/** Regra da semana: o tipo gira toda semana e o modificador muda num ciclo próprio. */
export function weeklyRule(now: number): WeeklyRule {
  const week = weekOf(now);
  return {
    week,
    type: WEEKLY_TOWER_TYPES[week % WEEKLY_TOWER_TYPES.length],
    mod: WEEKLY_TOWER_MODS[Math.floor(week / 2) % WEEKLY_TOWER_MODS.length],
  };
}

/** Andares da semana: a mesma semente para todos, então dá para comparar resultados. */
export function weeklyRng(week: number, floor: number): Rng {
  return seededRng(Math.imul(week, 7919) ^ Math.imul(floor, 104729));
}

/** Zera o placar da semana quando ela vira. */
export function syncWeekly(state: GameState, now: number): void {
  const week = weekOf(now);
  if (state.tower.weekly.week !== week) state.tower.weekly = { week, best: 0, claimed: [] };
}

/** Motivo para não poder subir na Torre semanal, ou null se pode. */
export function weeklyBlocker(state: GameState, now: number): string | null {
  if (!towerUnlocked(state)) return 'A Torre ainda não foi liberada.';
  if (state.battle.kind !== 'wild') return 'Termine a batalha atual primeiro.';
  const { type } = weeklyRule(now);
  const team = [state.activeUid, ...state.battleTeam];
  const wrong = team.some((uid) => {
    const p = state.collection.find((x) => x.uid === uid);
    return !p || !getSpecies(p.speciesId).types.includes(type);
  });
  return wrong ? 'type' : null;
}

/** Andar vencido na Torre semanal: atualiza o recorde da semana e paga os marcos. */
export function weeklyFloorCleared(state: GameState, floor: number, now: number): number {
  syncWeekly(state, now);
  const w = state.tower.weekly;
  w.best = Math.max(w.best, floor);
  let bonus = 0;
  for (const m of WEEKLY_TOWER_MILESTONES) {
    if (floor >= m.floor && !w.claimed.includes(m.floor)) {
      w.claimed.push(m.floor);
      bonus += m.bp;
    }
  }
  state.tower.points += bonus;
  return bonus;
}

function recordWeekly(state: GameState, floor: number, speciesId: number, now: number): void {
  if (floor <= 0) return;
  const week = weekOf(now);
  const list = state.tower.weeklyHistory;
  const current = list.find((r) => r.week === week);
  if (current && current.floor >= floor) return;
  const entry = { week, floor, speciesId, at: now };
  state.tower.weeklyHistory = [entry, ...list.filter((r) => r.week !== week)]
    .sort((a, b) => b.week - a.week)
    .slice(0, 12);
}
