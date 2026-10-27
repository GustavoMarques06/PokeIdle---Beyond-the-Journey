// Diário de pesquisa da Pokédex (no estilo de Legends: Arceus): cada espécie tem tarefas —
// capturar, derrotar, encontrar à noite, ver evoluir. Completar a pesquisa dá pontos de
// laboratório e, para sempre, mais chance de captura e EXP contra aquela espécie.

import { BALANCE, SPECIES, getSpecies } from '../game-data';
import type { GameEvent, GameState } from './state';

export interface DexResearchEntry {
  caught: number;
  defeated: number;
  /** Encontros vencidos ou capturados à noite. */
  night: number;
  /** Vezes que um Pokémon evoluiu para esta espécie ou a partir dela. */
  evolved: number;
  /** Pesquisa completa (o bônus fica ativo). */
  complete?: boolean;
}

export interface ResearchTask {
  id: string;
  label: string;
  value: (e: DexResearchEntry) => number;
  target: number;
}

const BASE_TASKS: ResearchTask[] = [
  { id: 'caught-1', label: 'Capturar 1', value: (e) => e.caught, target: 1 },
  { id: 'caught-5', label: 'Capturar 5', value: (e) => e.caught, target: 5 },
  { id: 'defeated-10', label: 'Derrotar 10', value: (e) => e.defeated, target: 10 },
  { id: 'defeated-50', label: 'Derrotar 50', value: (e) => e.defeated, target: 50 },
  { id: 'night-1', label: 'Encontrar à noite', value: (e) => e.night, target: 1 },
];

const EVOLVE_TASK: ResearchTask = {
  id: 'evolve-1',
  label: 'Ver evoluir',
  value: (e) => e.evolved,
  target: 1,
};
const CAUGHT_10: ResearchTask = { id: 'caught-10', label: 'Capturar 10', value: (e) => e.caught, target: 10 };

/** Espécies que são o resultado de alguma evolução. */
const evolvedForms = new Set(SPECIES.flatMap((s) => s.evolutions.map((e) => e.to)));

/** Tarefas da espécie: quem evolui (ou veio de evolução) tem "ver evoluir"; os outros, "capturar 10". */
export function researchTasks(speciesId: number): ResearchTask[] {
  const evolves = getSpecies(speciesId).evolutions.length > 0 || evolvedForms.has(speciesId);
  return [...BASE_TASKS, evolves ? EVOLVE_TASK : CAUGHT_10];
}

export function researchEntry(state: GameState, speciesId: number): DexResearchEntry {
  return (state.dexResearch[speciesId] ??= { caught: 0, defeated: 0, night: 0, evolved: 0 });
}

export function tasksDone(state: GameState, speciesId: number): number {
  const e = state.dexResearch[speciesId];
  if (!e) return 0;
  return researchTasks(speciesId).filter((t) => t.value(e) >= t.target).length;
}

export function researchComplete(state: GameState, speciesId: number): boolean {
  return !!state.dexResearch[speciesId]?.complete;
}

export function completeResearchCount(state: GameState): number {
  return Object.values(state.dexResearch).filter((e) => e.complete).length;
}

type Progress = Partial<Pick<DexResearchEntry, 'caught' | 'defeated' | 'night' | 'evolved'>>;

/** Soma progresso de pesquisa e conclui a espécie quando bater a meta. */
export function addResearch(state: GameState, speciesId: number, add: Progress, events?: GameEvent[]): void {
  const e = researchEntry(state, speciesId);
  e.caught += add.caught ?? 0;
  e.defeated += add.defeated ?? 0;
  e.night += add.night ?? 0;
  e.evolved += add.evolved ?? 0;
  if (e.complete || tasksDone(state, speciesId) < BALANCE.dexResearch.tasksToComplete) return;
  e.complete = true;
  state.research.points += BALANCE.dexResearch.labPoints;
  events?.push({ type: 'researchComplete', speciesId });
}

/** Multiplicadores contra uma espécie com pesquisa completa. */
export function researchBonus(state: GameState, speciesId: number): { capture: number; exp: number } {
  if (!researchComplete(state, speciesId)) return { capture: 1, exp: 1 };
  const r = BALANCE.dexResearch;
  return { capture: 1 + r.captureBonus, exp: 1 + r.expBonus };
}
