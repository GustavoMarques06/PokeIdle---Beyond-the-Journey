// Árvores de berry selvagens: cada rota ao ar livre (com encontros) tem uma árvore com uma berry
// fixa. Colhe-se estando na rota; ela volta a dar frutos depois de algumas horas.

import { BALANCE, WILD_TREE_BERRIES, getRoute, hasRoute } from '../game-data';
import { giveItems } from './collection';
import { isOutdoor } from './env';
import { randInt, type Rng } from './rng';
import type { GameState } from './state';

/** Hash estável do id da rota (a berry de cada árvore nunca muda). */
function hashId(id: string): number {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Berry da árvore da rota (null = a rota não tem árvore). */
export function treeBerry(routeId: string): string | null {
  if (!hasRoute(routeId)) return null;
  const route = getRoute(routeId);
  if (route.kind === 'trial' || !route.encounters.length || !isOutdoor(route)) return null;
  const total = WILD_TREE_BERRIES.reduce((sum, [, w]) => sum + w, 0);
  let roll = hashId(routeId) * total;
  for (const [id, w] of WILD_TREE_BERRIES) {
    roll -= w;
    if (roll < 0) return id;
  }
  return WILD_TREE_BERRIES[0][0];
}

export function treeReady(state: GameState, routeId: string, now: number): boolean {
  return !!treeBerry(routeId) && now >= (state.berryTrees[routeId] ?? 0);
}

/** Colhe a árvore da rota atual. Devolve o que veio (null se não deu). */
export function harvestTree(state: GameState, now: number, rng: Rng): { berry: string; qty: number } | null {
  const routeId = state.currentRouteId;
  const berry = treeBerry(routeId);
  if (!berry || !state.routes[routeId]?.unlocked || !treeReady(state, routeId, now)) return null;
  const [min, max] = BALANCE.wildBerries.yield;
  const qty = randInt(rng, min, max);
  giveItems(state, { [berry]: qty });
  state.berryTrees[routeId] = now + BALANCE.wildBerries.regrowHours * 3_600_000;
  state.stats.wildHarvests++;
  return { berry, qty };
}
