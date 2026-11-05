// Levar um Pokémon do PC para a equipe (arrastar ou "Mover") e o tipo real dos golpes convertidos.

import { describe, expect, it } from 'vitest';
import { speciesId } from '../game-data';
import { addToCollection } from './collection';
import { combatantOf, moveMatchup } from './combat';
import { newGame } from './game';
import { teamPokemon, teamSlotsUnlocked, placeInTeam } from './team';

const ivs = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

function setup() {
  const s = newGame(1, 0, 1);
  const a = addToCollection(s, speciesId('pidgey'), 5, ivs, false, 0, 'Teste');
  const b = addToCollection(s, speciesId('rattata'), 5, ivs, false, 0, 'Teste');
  return { s, a, b, lead: s.activeUid };
}

describe('placeInTeam', () => {
  it('sem vaga livre não entra; em cima de alguém, troca de lugar', () => {
    const { s, a, lead } = setup();
    expect(teamSlotsUnlocked(s)).toBe(1);
    expect(placeInTeam(s, a.uid)).toBe(false);
    expect(placeInTeam(s, a.uid, lead)).toBe(true);
    expect(s.activeUid).toBe(a.uid);
    expect(teamPokemon(s).map((p) => p.uid)).toEqual([a.uid]);
  });

  it('quem já está na equipe não é duplicado', () => {
    const { s, lead, b } = setup();
    expect(placeInTeam(s, lead, b.uid)).toBe(false);
    expect(s.activeUid).toBe(lead);
  });
});

describe('moveMatchup', () => {
  it('Pixilar: golpe Normal acerta Fantasma como Fada, sem o "sem efeito" do tipo original', () => {
    const mega = combatantOf({ speciesId: 282, level: 50, ivs, megaForm: 'mega' });
    const base = combatantOf({ speciesId: 282, level: 50, ivs });
    const ghost = combatantOf({ speciesId: speciesId('gengar'), level: 50, ivs });
    expect(moveMatchup(base, ghost, 'body-slam')).toMatchObject({ type: 'normal', effectiveness: 0 });
    expect(moveMatchup(mega, ghost, 'body-slam').type).toBe('fairy');
    expect(moveMatchup(mega, ghost, 'body-slam').effectiveness).toBeGreaterThan(0);
  });
});
