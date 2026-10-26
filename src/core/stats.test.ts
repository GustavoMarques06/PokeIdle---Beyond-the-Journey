import { describe, expect, it } from 'vitest';
import { getSpecies } from '../game-data';
import { calcStats, expForLevel, levelFromExp } from './stats';

const ZERO = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 };
const MAX = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

describe('calcStats', () => {
  it('segue a fórmula da 3ª geração', () => {
    // Pikachu: base HP 35, Atk 55, Spe 90.
    const s = calcStats(getSpecies(25), 50, MAX);
    expect(s.hp).toBe(Math.floor(((70 + 31) * 50) / 100) + 50 + 10);
    expect(s.atk).toBe(Math.floor(((110 + 31) * 50) / 100) + 5);
    expect(s.spe).toBe(Math.floor(((180 + 31) * 50) / 100) + 5);
  });

  it('IVs maiores nunca reduzem atributos', () => {
    const low = calcStats(getSpecies(4), 30, ZERO);
    const high = calcStats(getSpecies(4), 30, MAX);
    for (const k of Object.keys(low) as (keyof typeof low)[]) expect(high[k]).toBeGreaterThanOrEqual(low[k]);
  });
});

describe('curvas de EXP', () => {
  it('valores conhecidos', () => {
    expect(expForLevel('medium', 10)).toBe(1000);
    expect(expForLevel('fast', 10)).toBe(800);
    expect(expForLevel('slow', 10)).toBe(1250);
    expect(expForLevel('medium-slow', 5)).toBe(135);
    expect(expForLevel('medium-slow', 100)).toBe(1_059_860);
    expect(expForLevel('slow-then-very-fast', 100)).toBe(600_000);
    expect(expForLevel('fast-then-very-slow', 100)).toBe(1_640_000);
  });

  it('são crescentes e levelFromExp é a inversa', () => {
    for (const rate of [
      'medium',
      'fast',
      'slow',
      'medium-slow',
      'slow-then-very-fast',
      'fast-then-very-slow',
    ] as const) {
      for (let n = 2; n <= 100; n++) {
        expect(expForLevel(rate, n)).toBeGreaterThan(expForLevel(rate, n - 1));
        expect(levelFromExp(rate, expForLevel(rate, n))).toBe(n);
        expect(levelFromExp(rate, expForLevel(rate, n) - 1)).toBe(n - 1);
      }
    }
  });
});
