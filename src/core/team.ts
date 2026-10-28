// Equipe de batalha: até duas reservas além do ativo. A reserva entra quando o ativo
// desmaia ou, com a troca automática ligada, quando tem vantagem clara contra o inimigo.

import { BALANCE, RESERVE_SLOTS } from '../game-data';
import { combatScales, type Modifiers } from './bonuses';
import { busyUids, findPokemon, routeDone } from './collection';
import { isFallen } from './nuzlocke';
import { combatantOf, estimateDuel } from './combat';
import { statsOf, type PokemonInstance } from './pokemon';
import type { EnemyState, GameEvent, GameState } from './state';

export function reserveSlotsUnlocked(state: GameState): number {
  if (state.challenge === 'solo') return 0;
  return RESERVE_SLOTS.filter((slot) => routeDone(state, slot.requiresRoute)).length;
}

/** Reservas válidas, na ordem de entrada (sem o ativo e dentro das vagas liberadas). */
export function reservePokemon(state: GameState): PokemonInstance[] {
  return (state.battleTeam ?? [])
    .map((uid) => findPokemon(state, uid))
    .filter((p): p is PokemonInstance => !!p && p.uid !== state.activeUid)
    .slice(0, reserveSlotsUnlocked(state));
}

export function addReserve(state: GameState, uid: number): boolean {
  if (!findPokemon(state, uid) || busyUids(state).has(uid) || isFallen(state, uid)) return false;
  if (reservePokemon(state).length >= reserveSlotsUnlocked(state)) return false;
  state.battleTeam = [...reservePokemon(state).map((p) => p.uid), uid];
  return true;
}

export function removeReserve(state: GameState, uid: number): void {
  state.battleTeam = state.battleTeam.filter((x) => x !== uid);
}

/** Cura o ativo e as reservas (`fraction` do HP máximo; 1 = cura total). */
export function healTeam(state: GameState, fraction = 1): void {
  const active = findPokemon(state, state.activeUid);
  for (const p of [...(active ? [active] : []), ...reservePokemon(state)]) {
    const max = statsOf(p).hp;
    p.currentHp = fraction >= 1 ? max : Math.min(max, p.currentHp + Math.ceil(max * fraction));
  }
}

/** Coloca a reserva `uid` em campo; o ativo anterior assume a vaga dela. */
export function switchIn(
  state: GameState,
  uid: number,
  reason: 'fainted' | 'matchup',
  events: GameEvent[],
): void {
  const slot = state.battleTeam.indexOf(uid);
  const from = findPokemon(state, state.activeUid);
  const to = findPokemon(state, uid);
  if (slot < 0 || !from || !to) return;
  state.battleTeam[slot] = from.uid;
  state.activeUid = uid;
  state.battle.playerStatus = null;
  events.push({ type: 'switched', uid, from: from.speciesId, to: to.speciesId, reason });
}

/** Primeira reserva ainda de pé (para entrar quando o ativo desmaia). */
export function nextHealthyReserve(state: GameState): PokemonInstance | undefined {
  return reservePokemon(state).find((p) => p.currentHp > 0);
}

/** Custo estimado do duelo: tempo até vencer, pesado pelo HP perdido (Infinity se perde). */
function duelCost(p: PokemonInstance, enemy: EnemyState, mods: Modifiers): number {
  const ec = combatantOf(enemy, mods.enemyMoveBoost);
  const duel = estimateDuel(
    combatantOf(p, mods.playerMoveBoost),
    p.currentHp,
    ec,
    combatScales(mods, ec.types),
  );
  return duel.win ? duel.durationMs * (1 + duel.hpLostFraction) : Infinity;
}

/** Reserva com vantagem clara contra `enemy`, ou null se o ativo já é a melhor escolha. */
export function bestMatchup(state: GameState, enemy: EnemyState, mods: Modifiers): number | null {
  const active = findPokemon(state, state.activeUid);
  const reserves = reservePokemon(state).filter((p) => p.currentHp > 0);
  if (!active || !reserves.length) return null;
  const current = duelCost(active, enemy, mods);
  let best: { uid: number; cost: number } | null = null;
  for (const p of reserves) {
    const cost = duelCost(p, enemy, mods);
    if (cost < (best?.cost ?? Infinity)) best = { uid: p.uid, cost };
  }
  if (!best || !Number.isFinite(best.cost)) return null;
  return !Number.isFinite(current) || best.cost < current * BALANCE.team.switchMargin ? best.uid : null;
}
