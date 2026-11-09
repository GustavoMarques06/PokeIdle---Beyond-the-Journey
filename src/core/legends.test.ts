// Lendários: quando aparecem, o que pedem, boato do dia, caça ao shiny, bônus de captura e avisos.

import { describe, expect, it } from 'vitest';
import { LEGENDARIES, ROUTES } from '../game-data';
import { challengeLegendary } from './actions';
import { addToCollection } from './collection';
import type { GameEvent, GameState } from './game';
import {
  legendaryCaptureBonus,
  legendaryInSeason,
  legendaryMissing,
  legendaryShinyBoost,
  legendaryStatus,
  rumorOf,
  updateLegends,
} from './legendary';
import { newGame } from './state';

const def = (id: number) => LEGENDARIES.find((l) => l.speciesId === id)!;

function clearTo(s: GameState, id: string): void {
  for (const r of ROUTES) {
    s.routes[r.id].unlocked = true;
    s.routes[r.id].bossDefeated = !!r.boss;
    s.routes[r.id].kills = r.killsRequired;
    if (r.id === id) break;
  }
}

describe('lendários', () => {
  it('Articuno só aparece com granizo, névoa ou à noite (ou no dia do boato)', () => {
    const s = newGame(1, 0, 1);
    clearTo(s, 'liga-campeao');
    s.env = { period: 'day', weather: 'sun' };
    expect(legendaryInSeason(s, 144)).toBe(false);
    s.env = { period: 'night', weather: 'sun' };
    expect(legendaryInSeason(s, 144)).toBe(true);
    s.env = { period: 'day', weather: 'hail' };
    expect(legendaryInSeason(s, 144)).toBe(true);
    expect(legendaryInSeason(s, 150)).toBe(true); // Mewtwo: a qualquer hora
  });

  it('chaves: Mew depois do Mewtwo, Regis com Relicanth e Wailord na equipe, Lugia com a Silver Wing', () => {
    const s = newGame(1, 0, 1);
    clearTo(s, 'hoenn-liga-campeao');
    s.env = { period: 'day', weather: 'fog' };
    expect(legendaryStatus(s, def(151), 0)).toBe('needs');
    s.legends.caught.push(150);
    expect(legendaryStatus(s, def(151), 0)).toBe('ready');

    expect(legendaryMissing(s, 377).team).toEqual([369, 321]);
    const r = addToCollection(s, 369, 50, { hp: 1, atk: 1, def: 1, spAtk: 1, spDef: 1, spe: 1 }, false, 0, 'x');
    const w = addToCollection(s, 321, 50, { hp: 1, atk: 1, def: 1, spAtk: 1, spDef: 1, spe: 1 }, false, 0, 'x');
    s.battleTeam = [r.uid, w.uid];
    expect(legendaryMissing(s, 377).team).toEqual([]);

    expect(legendaryMissing(s, 249).items).toEqual(['silver-wing']);
    s.items['silver-wing'] = 1;
    expect(legendaryMissing(s, 249).items).toEqual([]);
  });

  it('o boato é um só por dia e libera o lendário a qualquer hora', () => {
    const s = newGame(1, 0, 1);
    clearTo(s, 'liga-campeao');
    const day = 86_400_000 * 20_000;
    const rumor = rumorOf(s, day)!;
    expect(rumor).toBeDefined();
    expect(rumorOf(s, day + 3_600_000)).toBe(rumor);
    expect(legendaryCaptureBonus(s, rumor, 'ultra-ball', undefined, day)).toBeCloseTo(1.5);
  });

  it('status, bola com afinidade e caça ao shiny aumentam as chances', () => {
    const s = newGame(1, 0, 1);
    expect(legendaryCaptureBonus(s, 491, 'dusk-ball', 'sleep', 0) / legendaryCaptureBonus(s, 491, 'poke-ball', undefined, 0)).toBeCloseTo(
      rumorOf(s, 0) === 491 ? 3.75 : 3.75,
    );
    expect(legendaryShinyBoost(s, 150)).toBe(1);
    s.legends.encounters = { 150: 100 };
    expect(legendaryShinyBoost(s, 150)).toBe(5);
  });

  it('enfrentar conta um encontro; a volta de um lendário avisa (só se recente)', () => {
    const s = newGame(1, 0, 1);
    clearTo(s, 'liga-campeao');
    s.env = { period: 'day', weather: 'clear' };
    expect(challengeLegendary(s, 150, 0)).toBe(true);
    expect(s.legends.encounters?.[150]).toBe(1);
    s.legends.cooldowns[146] = 1000;
    s.legends.cooldowns[145] = 1000;
    const events: GameEvent[] = [];
    updateLegends(s, 2000, events);
    expect(events.filter((e) => e.type === 'legendaryReturned')).toHaveLength(2);
    s.legends.cooldowns[144] = 1000;
    const late: GameEvent[] = [];
    updateLegends(s, 1000 + 3_600_000, late);
    expect(late.some((e) => e.type === 'legendaryReturned')).toBe(false);
    expect(s.legends.cooldowns[144]).toBeUndefined();
  });
});
