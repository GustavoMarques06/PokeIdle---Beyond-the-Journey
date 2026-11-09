import { describe, expect, it } from 'vitest';
import { newGame } from '../../core/state';
import { ROUTES, getSpecies } from '../../game-data';
import { battleWarmList } from './warmSprites';

describe('sprites baixados antes de aparecer', () => {
  it('a equipe (de costas) vem primeiro, depois quem aparece na rota (de frente)', () => {
    const s = newGame(1, 0, 1);
    const list = battleWarmList(s);
    expect(list[0]).toBe(getSpecies(1).sprites.back);
    const route = ROUTES.find((r) => r.id === s.battle.routeId)!;
    for (const e of route.encounters) expect(list).toContain(getSpecies(e.speciesId).sprites.front);
    expect(new Set(list).size).toBe(list.length);
  });

  it('em toda rota a lista é pequena (não baixa a Pokédex inteira)', () => {
    const s = newGame(1, 0, 1);
    for (const r of ROUTES) {
      s.battle.routeId = r.id;
      const list = battleWarmList(s);
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThan(45);
    }
  });
});
