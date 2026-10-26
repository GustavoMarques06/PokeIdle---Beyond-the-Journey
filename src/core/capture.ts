import { BALANCE } from '../game-data';
import type { Rng } from './rng';

/**
 * Chance de captura inspirada na fórmula da 3ª geração:
 * a = (3·HPmax − 2·HPatual) · taxa · bola / (3·HPmax), chance ≈ a / 255.
 */
export function captureChance(captureRate: number, hp: number, maxHp: number, ball: string): number {
  const bonus = BALANCE.capture.balls[ball] ?? 1;
  const a = ((3 * maxHp - 2 * Math.max(0, hp)) * captureRate * bonus) / (3 * Math.max(1, maxHp));
  return Math.min(1, Math.max(0, a / 255));
}

export function rollCapture(rng: Rng, chance: number): boolean {
  return rng.next() < chance;
}
