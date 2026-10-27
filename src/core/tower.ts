// Torre de Batalha: andares infinitos de treinadores cada vez mais fortes. O Pokémon
// ativo luta sozinho; perder encerra a subida e o melhor andar entra no ranking.

import { BALANCE, SPECIES, TM_POOL, TOWER_SHOP } from '../game-data';
import { activityUnlocked, giveItems, unlockTm } from './collection';
import { eliteItemOf } from './loadout';
import type { GameState, TeamMember } from './game';
import { randInt, rngFrom, type Rng } from './rng';

export interface TowerRun {
  floor: number;
  at: number;
  speciesId: number;
}

export interface TowerState {
  best: number;
  points: number;
  /** Andar atual da subida em andamento (0 = nenhuma). */
  floor: number;
  /** Melhores subidas (ranking local). */
  runs: TowerRun[];
}

export const emptyTower = (): TowerState => ({ best: 0, points: 0, floor: 0, runs: [] });

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

export function floorTeam(floor: number, rng: Rng): TeamMember[] {
  const { level, boost } = floorLevel(floor);
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

export function towerFloorCleared(state: GameState, floor: number): number {
  const points = BALANCE.tower.pointsPerFloor * (isBossFloor(floor) ? 5 : 1);
  state.tower.points += points;
  state.tower.best = Math.max(state.tower.best, floor);
  state.tower.floor = floor + 1;
  return points;
}

/** Fim da subida (derrota ou desistência): registra no ranking. */
export function endTowerRun(state: GameState, now: number, speciesId: number): number {
  const reached = Math.max(0, state.tower.floor - 1);
  state.tower.floor = 0;
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
