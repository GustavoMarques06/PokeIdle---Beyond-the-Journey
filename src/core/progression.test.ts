import { describe, expect, it } from 'vitest';
import { createPokemon, knownMoves, statsOf } from './pokemon';
import { coinYield, expYield, grantExp, levelProgress } from './progression';
import { expForLevel } from './stats';
import { getSpecies } from '../game-data';

const IVS = { hp: 10, atk: 10, def: 10, spAtk: 10, spDef: 10, spe: 10 };

describe('grantExp', () => {
  it('sobe de nível, aumenta atributos e aprende golpes', () => {
    const p = createPokemon(1, 4, 5, IVS, false, 0, 'teste');
    const before = statsOf(p);
    const res = grantExp(p, expForLevel('medium-slow', 7) - p.exp, true);
    expect(p.level).toBe(7);
    expect(res.levelsGained).toBe(2);
    expect(res.learnedMoves).toContain('ember');
    expect(statsOf(p).atk).toBeGreaterThan(before.atk);
  });

  it('evolui automaticamente ao atingir o nível', () => {
    const p = createPokemon(1, 4, 15, IVS, false, 0, 'teste');
    const res = grantExp(p, expForLevel('medium-slow', 16) - p.exp, true);
    expect(p.speciesId).toBe(5);
    expect(res.evolvedFrom).toBe(4);
    expect(res.evolvedTo).toBe(5);
  });

  it('com evolução manual, marca como pendente', () => {
    const p = createPokemon(1, 4, 15, IVS, false, 0, 'teste');
    grantExp(p, expForLevel('medium-slow', 16) - p.exp, false);
    expect(p.speciesId).toBe(4);
    expect(p.pendingEvolution).toBe(5);
  });

  it('progresso do nível fica entre 0 e 1', () => {
    const p = createPokemon(1, 1, 10, IVS, false, 0, 'teste');
    expect(levelProgress(p)).toBe(0);
    grantExp(p, 50, true);
    expect(levelProgress(p)).toBeGreaterThan(0);
    expect(levelProgress(p)).toBeLessThan(1);
  });
});

describe('recompensas', () => {
  it('EXP diminui contra inimigos de nível bem menor e aumenta contra mais fortes', () => {
    const even = expYield(16, 10, false, 10);
    expect(expYield(16, 10, false, 30)).toBeLessThan(even / 3);
    expect(expYield(16, 10, false, 5)).toBeGreaterThan(even);
  });

  it('chefes rendem mais', () => {
    expect(expYield(74, 10, true, 10)).toBeGreaterThan(expYield(74, 10, false, 10));
    expect(coinYield(10, true, 10)).toBeGreaterThan(coinYield(10, false, 10));
  });
});

describe('knownMoves', () => {
  it('mantém no máximo quatro golpes, os mais recentes', () => {
    const moves = knownMoves(getSpecies(95), 100);
    expect(moves.length).toBe(4);
    expect(moves.at(-1)).toBe('double-edge');
  });
});
