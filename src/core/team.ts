// Equipe: até 6 Pokémon. O primeiro (`activeUid`) luta; os outros (`battleTeam`, na ordem)
// entram quando ele desmaia ou, com a troca automática ligada, quando têm vantagem clara
// contra o inimigo. Todos dão o bônus do seu tipo (ver bonuses.ts).

import { BALANCE, TEAM_SLOTS } from '../game-data';
import { combatScales, type Modifiers } from './bonuses';
import { busyUids, findPokemon, routeDone } from './collection';
import { isFallen } from './nuzlocke';
import { combatantOf, estimateDuel } from './combat';
import { statsOf, type PokemonInstance } from './pokemon';
import type { EnemyState, GameEvent, GameState } from './state';

/** Vagas liberadas na equipe, contando a do Pokémon que luta (1 no desafio Lobo solitário). */
export function teamSlotsUnlocked(state: GameState): number {
  if (state.challenge === 'solo') return 1;
  return 1 + TEAM_SLOTS.filter((slot) => routeDone(state, slot.requiresRoute)).length;
}

/** Vagas além da do Pokémon que luta. */
export function reserveSlotsUnlocked(state: GameState): number {
  return teamSlotsUnlocked(state) - 1;
}

/** Os que esperam a vez, na ordem de entrada (sem o ativo e dentro das vagas liberadas). */
export function reservePokemon(state: GameState): PokemonInstance[] {
  return (state.battleTeam ?? [])
    .map((uid) => findPokemon(state, uid))
    .filter((p): p is PokemonInstance => !!p && p.uid !== state.activeUid)
    .slice(0, reserveSlotsUnlocked(state));
}

/** A equipe inteira, na ordem: quem luta e depois os outros. */
export function teamPokemon(state: GameState): PokemonInstance[] {
  const active = findPokemon(state, state.activeUid);
  return [...(active ? [active] : []), ...reservePokemon(state)];
}

/** Põe o Pokémon no fim da equipe, se houver vaga. */
export function addToTeam(state: GameState, uid: number): boolean {
  if (!findPokemon(state, uid) || busyUids(state).has(uid) || isFallen(state, uid)) return false;
  if (reservePokemon(state).length >= reserveSlotsUnlocked(state)) return false;
  state.battleTeam = [...reservePokemon(state).map((p) => p.uid), uid];
  return true;
}

/** Tira da equipe. Quem luta só sai se houver outro para assumir (o próximo da fila). */
export function removeFromTeam(state: GameState, uid: number): boolean {
  if (uid === state.activeUid) {
    const next = reservePokemon(state)[0];
    if (!next) return false;
    state.battleTeam = state.battleTeam.filter((x) => x !== next.uid);
    state.activeUid = next.uid;
    state.battle.playerStatus = null;
    return true;
  }
  if (!state.battleTeam.includes(uid)) return false;
  state.battleTeam = state.battleTeam.filter((x) => x !== uid);
  return true;
}

/**
 * Sobe (`-1`) ou desce (`+1`) uma posição na equipe. A posição 0 é a de quem luta: subir para
 * ela põe o Pokémon em campo, e o que lutava passa a ser o 2º.
 */
export function moveInTeam(state: GameState, uid: number, dir: -1 | 1): boolean {
  const order = teamPokemon(state).map((p) => p.uid);
  const i = order.indexOf(uid);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return false;
  [order[i], order[j]] = [order[j], order[i]];
  if (order[0] !== state.activeUid) state.battle.playerStatus = null;
  state.activeUid = order[0];
  state.battleTeam = order.slice(1);
  return true;
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
  reason: 'fainted' | 'matchup' | 'manual',
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
