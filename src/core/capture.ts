import { BALANCE, BALL_RULES, isSpecialBall, type TypeName } from '../game-data';
import type { Rng } from './rng';

/** O que as bolas especiais olham no momento do lançamento. */
export interface BallContext {
  types: TypeName[];
  level: number;
  /** Noite ou caverna (Dusk Ball). */
  dark: boolean;
  /** Espécie já capturada (Repeat Ball). */
  caught: boolean;
  /** Tempo de luta contra este Pokémon (Quick e Timer Ball). */
  elapsedMs: number;
}

/** Multiplicador da bola na situação dada (sem contexto, as especiais valem 1×). */
export function ballMultiplier(ball: string, ctx?: BallContext): number {
  if (!isSpecialBall(ball)) return BALANCE.capture.balls[ball] ?? 1;
  if (!ctx) return 1;
  const r = BALL_RULES;
  switch (ball) {
    case 'net-ball':
      return ctx.types.some((t) => t === 'water' || t === 'bug') ? r.net : 1;
    case 'dusk-ball':
      return ctx.dark ? r.dusk : 1;
    case 'quick-ball':
      return ctx.elapsedMs < r.quickMs ? r.quick : 1;
    case 'timer-ball':
      return Math.min(r.timerMax, 1 + ctx.elapsedMs * r.timerPerMs);
    case 'repeat-ball':
      return ctx.caught ? r.repeat : 1;
    case 'nest-ball':
      return Math.min(r.nestMax, Math.max(1, (41 - ctx.level) / 10));
    case 'luxury-ball':
    case 'heal-ball':
      return 1;
  }
}

/**
 * Chance de captura inspirada na fórmula da 3ª geração:
 * a = (3·HPmax − 2·HPatual) · taxa · bola / (3·HPmax), chance ≈ a / 255.
 */
export function captureChance(
  captureRate: number,
  hp: number,
  maxHp: number,
  ball: string,
  ctx?: BallContext,
): number {
  const bonus = ballMultiplier(ball, ctx);
  const a = ((3 * maxHp - 2 * Math.max(0, hp)) * captureRate * bonus) / (3 * Math.max(1, maxHp));
  return Math.min(1, Math.max(0, a / 255));
}

export function rollCapture(rng: Rng, chance: number): boolean {
  return rng.next() < chance;
}
