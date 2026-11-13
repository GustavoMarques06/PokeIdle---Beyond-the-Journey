// Formas regionais (Alola): aparecem na região, mudam tipos, golpes e habilidade, evoluem mantendo a forma e
// passam para o ovo.

import { describe, expect, it } from 'vitest';
import { abilitiesOf, getRoute, getSpecies, speciesId, speciesOf } from '../game-data';
import { applyEvolutionItem } from './actions';
import { addToCollection } from './collection';
import { combatantOf } from './combat';
import { eggFormOf, hatchEgg } from './daycare';
import { rollForm } from './forms';
import { newGame } from './game';
import { movesOf } from './pokemon';
import { seededRng } from './rng';

const IVS = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
const id = speciesId;

describe('formas de Alola', () => {
  it('em Alola o selvagem vem na forma de lá; fora, na normal', () => {
    const rng = seededRng(1);
    expect(rollForm(id('rattata'), rng, 0, 'alola')).toBe('alola');
    expect(rollForm(id('rattata'), rng, 0, 'kanto')).toBe('normal');
    expect(rollForm(id('pikachu'), rng, 0, 'alola')).toBeUndefined();
  });

  it('a forma troca tipos, atributos, golpes e habilidade', () => {
    const raichu = speciesOf(id('raichu'), 'alola');
    expect(raichu.types).toEqual(['electric', 'psychic']);
    expect(getSpecies(id('raichu')).types).toEqual(['electric']);
    const vulpix = { speciesId: id('vulpix'), form: 'alola', level: 30, ivs: IVS };
    expect(combatantOf(vulpix).types).toEqual(['ice']);
    expect(movesOf(vulpix).some((m) => ['ember', 'flamethrower', 'fire-spin'].includes(m))).toBe(false);
    // Galvanizar é a oculta do Golem de Alola; Surfista Elétrico vira a Estática.
    expect(abilitiesOf(id('golem'), 'alola')[2]).toBe('galvanize');
    expect(abilitiesOf(id('raichu'), 'alola')[0]).toBe('static');
  });

  it('Vulpix de Alola evolui com a Pedra do Gelo e continua de Alola', () => {
    const s = newGame(1, 0, 1);
    const v = addToCollection(s, id('vulpix'), 30, IVS, false, 0, 't');
    v.form = 'alola';
    s.items['fire-stone'] = 1;
    expect(applyEvolutionItem(s, v.uid, 'fire-stone')).toEqual([]);
    s.items['ice-stone'] = 1;
    applyEvolutionItem(s, v.uid, 'ice-stone');
    expect(v.speciesId).toBe(id('ninetales'));
    expect(v.form).toBe('alola');
  });

  it('Pikachu que evolui em Alola vira Raichu de Alola', () => {
    const s = newGame(1, 0, 1);
    s.currentRouteId = 'alola-rota-1';
    expect(getRoute(s.currentRouteId).regionId).toBe('alola');
    const p = addToCollection(s, id('pikachu'), 30, IVS, false, 0, 't');
    s.items['thunder-stone'] = 1;
    applyEvolutionItem(s, p.uid, 'thunder-stone');
    expect(p.speciesId).toBe(id('raichu'));
    expect(p.form).toBe('alola');
    expect(s.forms[id('raichu')]).toContain('alola');
  });

  it('o ovo sai na forma da mãe', () => {
    const s = newGame(1, 0, 1);
    const mom = addToCollection(s, id('vulpix'), 30, IVS, false, 0, 't');
    mom.form = 'alola';
    mom.gender = 'f';
    const dad = addToCollection(s, id('growlithe'), 30, IVS, false, 0, 't');
    dad.gender = 'm';
    expect(eggFormOf(mom, dad)).toBe('alola');
    s.eggs.push({
      id: 999,
      speciesId: id('vulpix'),
      ivs: IVS,
      shiny: false,
      cycles: 1,
      progress: 1,
      form: 'alola',
    });
    hatchEgg(s, 999, 0, []);
    expect(s.collection.at(-1)!.form).toBe('alola');
  });
});
