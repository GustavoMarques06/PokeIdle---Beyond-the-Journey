// Desafio Nuzlocke, adaptado ao idle: só a primeira captura de cada área vale na jornada, e
// quem desmaia contra um treinador da campanha (líderes, rivais, Liga, Equipe Rocket) fica
// fora até a jornada acabar. Sem ninguém para lutar, o desafio falha.

import { getRoute } from '../game-data';
import { busyUids } from './collection';
import type { GameEvent, GameState } from './state';
import { encounterRoute } from './state';

export interface NuzlockeState {
  /** Áreas (rotas de encontro) onde a captura da jornada já foi feita. */
  routes: string[];
  /** Pokémon que caíram contra treinadores e não lutam mais nesta jornada. */
  fallen: number[];
}

export const emptyNuzlocke = (): NuzlockeState => ({ routes: [], fallen: [] });

export const nuzlockeOn = (state: GameState) => state.challenge === 'nuzlocke';

/** Área que conta para a regra da primeira captura (salas da Liga contam como a rota de treino). */
const areaOf = (routeId: string) => encounterRoute(getRoute(routeId)).id;

/** Ainda dá para capturar nesta área? (Fora do Nuzlocke, sempre.) Lendários não contam. */
export function canCaptureHere(state: GameState): boolean {
  if (!nuzlockeOn(state) || state.battle.kind !== 'wild') return true;
  return !(state.nuzlocke?.routes ?? []).includes(areaOf(state.battle.routeId));
}

export function recordNuzlockeCapture(state: GameState, routeId: string): void {
  if (!nuzlockeOn(state)) return;
  const n = (state.nuzlocke ??= emptyNuzlocke());
  const area = areaOf(routeId);
  if (!n.routes.includes(area)) n.routes.push(area);
}

export function isFallen(state: GameState, uid: number): boolean {
  return nuzlockeOn(state) && !!state.nuzlocke?.fallen.includes(uid);
}

/** Batalhas em que desmaiar tira o Pokémon da jornada. */
const DEADLY = new Set(['boss', 'rocket']);

/** O Pokémon `uid` desmaiou. Devolve true se ele caiu (sai da equipe). */
export function onNuzlockeFaint(state: GameState, uid: number): boolean {
  if (!nuzlockeOn(state) || !DEADLY.has(state.battle.kind)) return false;
  const n = (state.nuzlocke ??= emptyNuzlocke());
  if (!n.fallen.includes(uid)) n.fallen.push(uid);
  state.battleTeam = state.battleTeam.filter((x) => x !== uid);
  return true;
}

/**
 * Depois de uma derrota: se o ativo caiu, o mais forte que sobrou assume. Sem ninguém, o
 * desafio falha (as regras normais voltam).
 */
export function replaceFallenActive(state: GameState, events: GameEvent[]): void {
  if (!isFallen(state, state.activeUid)) return;
  state.battleTeam = state.battleTeam.filter((uid) => !isFallen(state, uid));
  const busy = busyUids(state);
  const next = [...state.collection]
    .filter((p) => !isFallen(state, p.uid) && (!busy.has(p.uid) || state.battleTeam.includes(p.uid)))
    .sort((a, b) => b.level - a.level)[0];
  if (next) {
    state.battleTeam = state.battleTeam.filter((uid) => uid !== next.uid);
    state.activeUid = next.uid;
    return;
  }
  state.challenge = null;
  state.nuzlocke = emptyNuzlocke();
  events.push({ type: 'challengeFailed', challenge: 'nuzlocke' });
}
