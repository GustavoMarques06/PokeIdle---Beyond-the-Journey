// Dreno, recuo, golpes de vários acertos e crítico fácil.

import { describe, expect, it } from 'vitest';
import { getAbility, getMove } from '../game-data';
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

describe('habilidades das Megas fiéis aos jogos', () => {
  const withAbility = (speciesId: number, id: string) => ({
    ...combatantOf({ speciesId, level: 50, ivs }),
    ability: getAbility(id),
  });
  const gengar = combatantOf({ speciesId: 94, level: 50, ivs });

  it('Destemido: golpe Normal acerta Fantasma', () => {
    const plain = combatantOf({ speciesId: 428, level: 50, ivs });
    expect(expectedDamage(plain, gengar, 'tackle')).toBe(0);
    expect(expectedDamage(withAbility(428, 'scrappy'), gengar, 'tackle')).toBeGreaterThan(0);
  });

  it('Mandíbula Forte: Crunch +50%, golpe sem mordida igual', () => {
    const base = combatantOf({ speciesId: 319, level: 50, ivs });
    const jaw = { ...base, ability: getAbility('strong-jaw') };
    const none = { ...base, ability: undefined };
    expect(expectedDamage(jaw, def, 'crunch') / expectedDamage(none, def, 'crunch')).toBeCloseTo(1.5, 1);
    expect(expectedDamage(jaw, def, 'surf')).toBeCloseTo(expectedDamage(none, def, 'surf'), 3);
  });

  it('Força Bruta: Flamethrower +30% e nunca queima', () => {
    const base = combatantOf({ speciesId: 323, level: 50, ivs });
    const sheer = { ...base, ability: getAbility('sheer-force') };
    const none = { ...base, ability: undefined };
    expect(
      expectedDamage(sheer, def, 'flamethrower') / expectedDamage(none, def, 'flamethrower'),
    ).toBeCloseTo(1.3, 1);
    expect(expectedDamage(sheer, def, 'earthquake')).toBeCloseTo(expectedDamage(none, def, 'earthquake'), 3);
  });

  it('Sem Guarda: ninguém erra, dos dois lados', () => {
    const rng = seededRng(9);
    const pidgeot = withAbility(18, 'no-guard');
    const plain = combatantOf({ speciesId: 18, level: 50, ivs });
    const miss = (a: typeof def, d: typeof def) =>
      Array.from({ length: 400 }, () => calcDamage(a, d, 'hurricane', rng)).filter((r) => r.missed).length;
    expect(miss(pidgeot, def)).toBe(0);
    expect(miss({ ...plain, ability: undefined }, pidgeot)).toBe(0);
    expect(miss({ ...plain, ability: undefined }, def)).toBeGreaterThan(0);
  });
});
