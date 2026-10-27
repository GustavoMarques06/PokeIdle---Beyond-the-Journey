import type { BaseStats, GrowthRate, Species } from '../game-data';
import { BALANCE, NATURE_MULTIPLIER, getNature } from '../game-data';

export type Stats = BaseStats;
export type Ivs = BaseStats;

/** Fórmula de atributos da 3ª geração, sem EVs; a natureza (se houver) ajusta ±10%. */
export function calcStats(species: Species, level: number, ivs: Ivs, nature?: string): Stats {
  const b = species.baseStats;
  const n = getNature(nature);
  const mult = (key: keyof Stats) =>
    key === n?.up ? NATURE_MULTIPLIER.up : key === n?.down ? NATURE_MULTIPLIER.down : 1;
  const other = (key: Exclude<keyof Stats, 'hp'>) =>
    Math.floor((Math.floor(((2 * b[key] + ivs[key]) * level) / 100) + 5) * mult(key));
  return {
    hp: Math.floor(((2 * b.hp + ivs.hp) * level) / 100) + level + 10,
    atk: other('atk'),
    def: other('def'),
    spAtk: other('spAtk'),
    spDef: other('spDef'),
    spe: other('spe'),
  };
}

/** EXP total necessária para estar no nível `n`. */
export function expForLevel(rate: GrowthRate, n: number): number {
  if (n <= 1) return 0;
  const n3 = n ** 3;
  switch (rate) {
    case 'fast':
      return Math.floor((4 * n3) / 5);
    case 'medium':
      return n3;
    case 'slow':
      return Math.floor((5 * n3) / 4);
    case 'medium-slow':
      return Math.max(0, Math.floor((6 / 5) * n3 - 15 * n * n + 100 * n - 140));
    case 'slow-then-very-fast':
      if (n < 50) return Math.floor((n3 * (100 - n)) / 50);
      if (n < 68) return Math.floor((n3 * (150 - n)) / 100);
      if (n < 98) return Math.floor((n3 * Math.floor((1911 - 10 * n) / 3)) / 500);
      return Math.floor((n3 * (160 - n)) / 100);
    case 'fast-then-very-slow':
      if (n < 15) return Math.floor((n3 * (Math.floor((n + 1) / 3) + 24)) / 50);
      if (n < 36) return Math.floor((n3 * (n + 14)) / 50);
      return Math.floor((n3 * (Math.floor(n / 2) + 32)) / 50);
  }
}

export function levelFromExp(rate: GrowthRate, exp: number): number {
  let level = 1;
  while (level < BALANCE.maxLevel && expForLevel(rate, level + 1) <= exp) level++;
  return level;
}
