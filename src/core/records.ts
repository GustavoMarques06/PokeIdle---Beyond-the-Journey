// Histórico de batalha de cada Pokémon (vitórias, críticos, dano, capturas, desmaios) e o
// MVP da semana: quem mais venceu como ativo desde a segunda-feira.

import type { BattleRecord, PokemonInstance } from './pokemon';
import type { GameState } from './state';

export interface MvpState {
  /** Semana (ver weekOf) a que as vitórias se referem. */
  week: number;
  wins: Record<number, number>;
}

const WEEK_MS = 7 * 24 * 3_600_000;
/** 1/1/1970 foi quinta; +3 dias faz a semana virar na segunda-feira (UTC). */
const MONDAY_OFFSET = 3 * 24 * 3_600_000;

/** Número da semana (troca toda segunda-feira). Também é a temporada do torneio. */
export function weekOf(now: number): number {
  return Math.floor((now + MONDAY_OFFSET) / WEEK_MS);
}

export function recordOf(p: PokemonInstance): BattleRecord {
  return (p.record ??= { wins: 0, crits: 0, damage: 0, captures: 0, faints: 0 });
}

export function addRecord(p: PokemonInstance, add: Partial<BattleRecord>): void {
  const r = recordOf(p);
  r.wins += add.wins ?? 0;
  r.crits += add.crits ?? 0;
  r.damage += add.damage ?? 0;
  r.captures += add.captures ?? 0;
  r.faints += add.faints ?? 0;
}

/** Uma vitória do ativo conta para o MVP da semana. */
export function addMvpWin(state: GameState, uid: number, now: number): void {
  const week = weekOf(now);
  if (state.mvp.week !== week) state.mvp = { week, wins: {} };
  state.mvp.wins[uid] = (state.mvp.wins[uid] ?? 0) + 1;
}

/** MVP da semana atual: uid e vitórias (null se ninguém venceu ainda). */
export function weeklyMvp(state: GameState, now: number): { uid: number; wins: number } | null {
  if (state.mvp.week !== weekOf(now)) return null;
  let best: { uid: number; wins: number } | null = null;
  for (const [uid, wins] of Object.entries(state.mvp.wins)) {
    if (!state.collection.some((p) => p.uid === Number(uid))) continue;
    if (!best || wins > best.wins) best = { uid: Number(uid), wins };
  }
  return best;
}
