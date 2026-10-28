// Bolas especiais, repelentes e incensos. As regras das bolas ficam em core/capture.ts; o uso
// de repelentes e incensos, em core/lures.ts.

import type { TypeName } from './types';

/** Bolas com efeito por situação (o multiplicador é calculado na hora do lançamento). */
export const SPECIAL_BALLS = [
  'net-ball',
  'dusk-ball',
  'quick-ball',
  'timer-ball',
  'repeat-ball',
  'nest-ball',
  'luxury-ball',
  'heal-ball',
] as const;

export type SpecialBall = (typeof SPECIAL_BALLS)[number];

export const isSpecialBall = (id: string): id is SpecialBall => SPECIAL_BALLS.includes(id as SpecialBall);

/** Todas as bolas que o jogador pode lançar em batalha. */
export const THROWABLE_BALLS = ['poke-ball', 'great-ball', 'ultra-ball', ...SPECIAL_BALLS, 'master-ball'];

export const BALL_RULES = {
  /** Net Ball contra Água ou Inseto. */
  net: 3.5,
  /** Dusk Ball à noite ou em cavernas. */
  dusk: 3,
  /** Quick Ball nos primeiros segundos do encontro. */
  quick: 5,
  quickMs: 5000,
  /** Timer Ball: +1× a cada 10 s de luta, até 4×. */
  timerPerMs: 1 / 10_000,
  timerMax: 4,
  /** Repeat Ball contra espécies já capturadas. */
  repeat: 3.5,
  /** Nest Ball: (41 − nível) / 10, entre 1× e 4×. */
  nestMax: 4,
  /** Luxury Ball: amizade inicial do capturado. */
  luxuryFriendship: 150,
};

export type LureKind = 'repel' | 'incense';

export interface LureDef {
  kind: LureKind;
  minutes: number;
  /** Incenso: tipo que aparece mais. */
  type?: TypeName;
}

/** Repelentes (só aparecem Pokémon no nível máximo da rota) e incensos (um tipo aparece mais). */
export const LURES: Record<string, LureDef> = {
  repel: { kind: 'repel', minutes: 10 },
  'super-repel': { kind: 'repel', minutes: 20 },
  'max-repel': { kind: 'repel', minutes: 30 },
  'sea-incense': { kind: 'incense', minutes: 20, type: 'water' },
  'rose-incense': { kind: 'incense', minutes: 20, type: 'grass' },
  'rock-incense': { kind: 'incense', minutes: 20, type: 'rock' },
  'odd-incense': { kind: 'incense', minutes: 20, type: 'psychic' },
};

export const LURE_RULES = {
  /** Tempo máximo acumulado de um mesmo efeito. */
  maxMinutes: 60,
  /** Peso extra das espécies do tipo do incenso. */
  incenseWeight: 4,
};

export const getLure = (id: string): LureDef | undefined => LURES[id];
