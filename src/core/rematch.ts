// Revanche: chefes já vencidos aceitam uma nova luta, mais forte, de tempos em tempos.

import { BALANCE, getRoute } from '../game-data';
import type { GameState } from './state';

export function canRematch(state: GameState, routeId: string, now = state.lastTimerAt): boolean {
  const route = getRoute(routeId);
  const prog = state.routes[routeId];
  return !!route.boss && !!prog?.bossDefeated && now >= (state.rematchAt[routeId] ?? 0);
}

export const rematchCooldownMs = () => BALANCE.rematch.cooldownHours * 3_600_000;
