// Golpes por nível: até quatro, completando com as formas anteriores e com máquinas/tutores.

import { describe, expect, it } from 'vitest';
import { BALANCE, SPECIES, getMove, getSpecies, hasMove, speciesId } from '../game-data';
import { knownMoves } from './pokemon';

/** Todos os golpes de dano que a espécie poderia ter (nível, formas anteriores, máquinas). */
function possible(id: number): Set<string> {
  const all = new Set<string>(getSpecies(id).tmMoves.filter(hasMove));
  for (let s = getSpecies(id); ;) {
    for (const e of s.learnset) all.add(e.move);
    const pre = SPECIES.find((x) => x.evolutions.some((e) => e.to === s.id));
    if (!pre) break;
    s = pre;
  }
  return all;
}

describe('golpes', () => {
  it('no nível 100, toda espécie tem 4 golpes (ou todos os que existem para ela)', () => {
    for (const s of SPECIES) {
      const moves = knownMoves(s, 100);
      expect(moves.length).toBe(Math.min(BALANCE.maxMoves, possible(s.id).size));
      expect(new Set(moves).size).toBe(moves.length);
    }
  });

  it('evoluir por pedra não apaga os golpes da forma anterior', () => {
    const clefable = knownMoves(getSpecies(speciesId('clefable')), 100);
    expect(clefable).toHaveLength(4);
    expect(clefable).toContain('double-slap');
  });

  it('máquinas fortes não entram cedo demais e os golpes por nível continuam', () => {
    const early = knownMoves(getSpecies(speciesId('bulbasaur')), 5);
    expect(early).toContain('tackle');
    for (const m of early) expect(getMove(m).power).toBeLessThanOrEqual(60);
    // Quem já tem quatro golpes por nível não muda.
    const pikachu = getSpecies(speciesId('pikachu'));
    const byLevel = [...new Set(pikachu.learnset.filter((e) => e.level <= 100).map((e) => e.move))];
    if (byLevel.length >= 4) expect(knownMoves(pikachu, 100).every((m) => byLevel.includes(m))).toBe(true);
  });

  it('a lista devolvida é uma cópia (mexer nela não estraga as próximas)', () => {
    const s = getSpecies(speciesId('gengar'));
    knownMoves(s, 100).pop();
    expect(knownMoves(s, 100)).toHaveLength(4);
  });
});
