// Pesca e Surf: o jogador escolhe onde procura Pokémon (grama, vara ou Surf). A escolha vale
// para todas as rotas; onde não há aquele tipo de água, os encontros voltam a ser os da grama.

import { RODS, SURF_UPGRADE, WATER_SPOTS, waterEncounters, type Encounter, type Rod } from '../game-data';
import { freshBattle, type EncounterMode, type GameState } from './state';

/** Melhor vara comprada (null = nenhuma). */
export function bestRod(state: GameState): Rod | null {
  return [...RODS].reverse().find((r) => state.upgrades.includes(r)) ?? null;
}

export function canSurf(state: GameState): boolean {
  return state.upgrades.includes(SURF_UPGRADE);
}

/** Encontros de água da rota no modo pedido, ou null se não dá para pescar/surfar ali. */
export function modeEncounters(state: GameState, routeId: string, mode: EncounterMode): Encounter[] | null {
  if (mode === 'land') return null;
  if (mode === 'surf' && !canSurf(state)) return null;
  return waterEncounters(routeId, mode, bestRod(state));
}

/** Modos disponíveis numa rota (a grama sempre está). */
export function modesAt(state: GameState, routeId: string): EncounterMode[] {
  const out: EncounterMode[] = ['land'];
  if (modeEncounters(state, routeId, 'fish')) out.push('fish');
  if (modeEncounters(state, routeId, 'surf')) out.push('surf');
  return out;
}

/** O modo que vale agora na rota (cai para a grama se a escolha não existir ali). */
export function activeMode(state: GameState, routeId: string): EncounterMode {
  return modesAt(state, routeId).includes(state.encounterMode) ? state.encounterMode : 'land';
}

/** Rota tem algum tipo de água, mesmo que o jogador ainda não tenha o equipamento. */
export function hasWater(routeId: string): boolean {
  return !!WATER_SPOTS[routeId];
}

/** Troca o modo; numa luta selvagem, o próximo encontro já vem do novo lugar. */
export function setEncounterMode(state: GameState, mode: EncounterMode): void {
  if (state.encounterMode === mode) return;
  state.encounterMode = mode;
  if (state.battle.kind === 'wild') state.battle = freshBattle(state.battle.routeId);
}
