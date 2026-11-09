// Dreno, recuo, golpes de vários acertos e crítico fácil.

import { describe, expect, it } from 'vitest';
import { getMove } from '../game-data';
import { calcDamage, combatantOf, expectedDamage } from './combat';
import { seededRng } from './rng';

const ivs = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };
const att = combatantOf({ speciesId: 6, level: 50, ivs }); // Charizard
const def = combatantOf({ speciesId: 143, level: 50, ivs }); // Snorlax

describe('golpes com efeito extra', () => {
  it('os dados vêm da PokéAPI', () => {
    expect(getMove('giga-drain').drain).toBe(50);
    expect(getMove('brave-bird').drain).toBeLessThan(0);
    expect(getMove('double-kick').hits).toEqual([2, 2]);
    expect(getMove('slash').critStage).toBe(1);
  });

  it('Double Kick acerta 2 vezes, e Bullet Seed entre 2 e 5', () => {
    const rng = seededRng(3);
    const kicks = Array.from({ length: 30 }, () => calcDamage(att, def, 'double-kick', rng)).filter(
      (r) => !r.missed,
    );
    expect(kicks.every((r) => r.hits === 2)).toBe(true);
    const seeds = Array.from({ length: 300 }, () => calcDamage(att, def, 'bullet-seed', rng)).filter(
      (r) => !r.missed,
    );
    const counts = new Set(seeds.map((r) => r.hits));
    expect([...counts].every((n) => n! >= 2 && n! <= 5)).toBe(true);
    expect(counts.size).toBeGreaterThan(2);
  });

  it('Slash dá mais críticos que um golpe comum de mesmo poder', () => {
    const rng = seededRng(5);
    const crits = (move: string) =>
      Array.from({ length: 4000 }, () => calcDamage(att, def, move, rng)).filter((r) => r.crit).length;
    expect(crits('slash')).toBeGreaterThan(crits('tackle') * 1.5);
  });

  it('o automático conta os acertos e o recuo ao escolher', () => {
    expect(expectedDamage(att, def, 'double-kick')).toBeGreaterThan(expectedDamage(att, def, 'rock-smash'));
  });
});
