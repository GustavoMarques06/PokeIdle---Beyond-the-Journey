import { describe, expect, it } from 'vitest';
import { BALANCE, getMove, typeEffectiveness } from '../game-data';
import { attackInterval, calcDamage, chooseMove, combatantOf, estimateDuel, expectedDamage } from './combat';
import { seededRng } from './rng';

const IVS = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
const mon = (speciesId: number, level: number) => combatantOf({ speciesId, level, ivs: IVS });

describe('tabela de tipos', () => {
  it('vantagens, resistências e imunidades', () => {
    expect(typeEffectiveness('water', ['fire'])).toBe(2);
    expect(typeEffectiveness('fire', ['water'])).toBe(0.5);
    expect(typeEffectiveness('electric', ['ground'])).toBe(0);
    expect(typeEffectiveness('grass', ['rock', 'ground'])).toBe(4);
    expect(typeEffectiveness('normal', ['normal'])).toBe(1);
  });
});

describe('dano', () => {
  it('é determinístico para a mesma semente', () => {
    const a = mon(4, 10);
    const b = mon(16, 10);
    const r1 = calcDamage(a, b, 'ember', seededRng(7));
    const r2 = calcDamage(a, b, 'ember', seededRng(7));
    expect(r1).toEqual(r2);
  });

  it('imunidade causa zero de dano', () => {
    const pikachu = mon(25, 20);
    const geodude = mon(74, 20);
    for (let seed = 0; seed < 20; seed++) {
      expect(calcDamage(pikachu, geodude, 'thunder-shock', seededRng(seed)).damage).toBe(0);
    }
  });

  it('vantagem de tipo aumenta o dano esperado', () => {
    const squirtle = mon(7, 15);
    const charmander = mon(4, 15);
    expect(expectedDamage(squirtle, charmander, 'water-gun')).toBeGreaterThan(
      expectedDamage(squirtle, charmander, 'tackle'),
    );
  });

  it('a IA escolhe o golpe de maior dano esperado', () => {
    const [a, b] = [mon(7, 15), mon(4, 15)];
    const chosen = expectedDamage(a, b, chooseMove(a, b));
    for (const m of a.moves) expect(chosen).toBeGreaterThanOrEqual(expectedDamage(a, b, m));
    expect(getMove(chooseMove(a, b)).type).toBe('water');
  });

  it('dano sempre fica dentro da faixa esperada', () => {
    const a = mon(1, 20);
    const b = mon(74, 20);
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) {
      const r = calcDamage(a, b, 'vine-whip', rng);
      if (!r.missed) expect(r.damage).toBeGreaterThan(0);
    }
  });
});

describe('velocidade', () => {
  it('velocidades iguais usam o intervalo base; mais rápido ataca antes', () => {
    expect(attackInterval(50, 50)).toBe(BALANCE.combat.baseAttackIntervalMs);
    expect(attackInterval(80, 40)).toBeLessThan(attackInterval(40, 80));
  });

  it('respeita os limites configurados', () => {
    expect(attackInterval(1, 1000)).toBe(BALANCE.combat.maxAttackIntervalMs);
    expect(attackInterval(1000, 1)).toBeGreaterThanOrEqual(BALANCE.combat.minAttackIntervalMs);
  });
});

describe('estimateDuel', () => {
  it('Pokémon muito mais forte vence', () => {
    const strong = mon(6, 40);
    expect(estimateDuel(strong, strong.stats.hp, mon(16, 3)).win).toBe(true);
    const weak = mon(10, 3);
    expect(estimateDuel(weak, weak.stats.hp, mon(95, 30)).win).toBe(false);
  });
});
