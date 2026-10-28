// Repelentes e incensos: efeitos com duração, usados pela Mochila. O repelente faz os
// selvagens aparecerem sempre no nível máximo da rota (mais EXP e moedas por vitória); o
// incenso faz as espécies de um tipo aparecerem mais. O tempo só corre com o jogo aberto
// (como a batalha ativa), para não se gastar enquanto o jogador está fora.

import { LURE_RULES, getLure, type LureKind, type TypeName } from '../game-data';
import type { GameState } from './game';

export interface LureTimer {
  item: string;
  ms: number;
}

export type LuresState = Partial<Record<LureKind, LureTimer>>;

/** Usa um repelente ou incenso: soma tempo ao efeito do mesmo tipo (trocar de incenso recomeça). */
export function applyLure(state: GameState, item: string): boolean {
  const def = getLure(item);
  if (!def || (state.items[item] ?? 0) <= 0) return false;
  state.lures ??= {};
  const max = LURE_RULES.maxMinutes * 60_000;
  const current = state.lures[def.kind];
  const keep = current && (def.kind === 'repel' || current.item === item) ? current.ms : 0;
  if (keep >= max) return false;
  state.items[item]--;
  state.lures[def.kind] = { item, ms: Math.min(max, keep + def.minutes * 60_000) };
  return true;
}

export function activeLure(state: GameState, kind: LureKind): LureTimer | null {
  const t = state.lures?.[kind];
  return t && t.ms > 0 ? t : null;
}

export const repelActive = (state: GameState) => !!activeLure(state, 'repel');

/** Tipo favorecido pelo incenso ativo. */
export function incenseType(state: GameState): TypeName | undefined {
  const t = activeLure(state, 'incense');
  return t ? getLure(t.item)?.type : undefined;
}

export function tickLures(state: GameState, ms: number): void {
  if (!state.lures) return;
  for (const kind of Object.keys(state.lures) as LureKind[]) {
    const t = state.lures[kind];
    if (!t) continue;
    t.ms -= ms;
    if (t.ms <= 0) delete state.lures[kind];
  }
}
