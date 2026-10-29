import { describe, expect, it } from 'vitest';
import { LEGENDARIES, ROUTES, getRoute, getSpecies, speciesId } from '../game-data';
import { addToCollection } from './collection';
import {
  activePokemon,
  advance,
  challengeBoss,
  challengeWeeklyTower,
  newGame,
  selectRoute,
  setActive,
  throwBall,
  weekOf,
  type GameEvent,
} from './game';
import { abandonChallenge, prestigeReset } from './meta';
import {
  canCaptureHere,
  isFallen,
  onNuzlockeFaint,
  recordNuzlockeCapture,
  replaceFallenActive,
} from './nuzlocke';
import { statsOf } from './pokemon';
import { addToTeam } from './team';
import { memoryStorage, loadGame, saveGame } from './save';
import { endTowerRun, floorTeam, weeklyBlocker, weeklyRng, weeklyRule } from './tower';

const IVS = { hp: 20, atk: 20, def: 20, spAtk: 20, spDef: 20, spe: 20 };
const DAY = 24 * 3_600_000;

function beatAllBefore(s: ReturnType<typeof newGame>, routeId: string) {
  const index = ROUTES.findIndex((r) => r.id === routeId);
  for (const r of ROUTES.slice(0, index))
    Object.assign(s.routes[r.id], { unlocked: true, bossDefeated: true, kills: 999 });
  s.routes[routeId].unlocked = true;
}

describe('Kalos', () => {
  it('vem depois do Campeão de Unova, com iniciais e lendários da Geração VI', () => {
    const unovaChampion = ROUTES.findIndex((r) => r.id === 'unova-liga-campeao');
    expect(ROUTES[unovaChampion + 1].id).toBe('kalos-rotas-1-4');
    expect(getRoute('kalos-liga-campeao').boss?.champion).toBe(true);
    expect(getSpecies(speciesId('froakie')).generation).toBe(6);
    expect(LEGENDARIES.filter((l) => l.regionId === 'kalos').length).toBeGreaterThanOrEqual(6);
    // Eevee agora também evolui em Sylveon (Shiny Stone), sem tomar o lugar das outras.
    const eevee = getSpecies(133).evolutions;
    expect(eevee.find((e) => e.to === 700)).toMatchObject({ trigger: 'item', item: 'shiny-stone' });
    expect(eevee.filter((e) => e.trigger === 'level')).toHaveLength(0);
  });

  it('save antigo que já venceu Unova libera Kalos ao carregar', () => {
    const s = newGame(1, 0, 1);
    beatAllBefore(s, 'unova-liga-campeao');
    s.routes['unova-liga-campeao'].bossDefeated = true;
    s.routes['kalos-rotas-1-4'].unlocked = false;
    const storage = memoryStorage();
    saveGame(storage, s, 1);
    expect(loadGame(storage).file!.state.routes['kalos-rotas-1-4'].unlocked).toBe(true);
  });

  it('selvagens de Kalos ganham o reforço da rota', () => {
    const s = newGame(1, 0, 3);
    beatAllBefore(s, 'kalos-rotas-1-4');
    const lead = addToCollection(s, 445, 100, { ...IVS }, false, 0, 'teste');
    lead.currentHp = statsOf(lead).hp;
    setActive(s, lead.uid);
    selectRoute(s, 'kalos-rotas-1-4');
    advance(s, 3000, 0);
    expect(s.battle.enemy?.level).toBe(100);
    expect(s.battle.enemy?.boost).toBe(getRoute('kalos-rotas-1-4').boost);
  });
});

describe('Torre semanal', () => {
  const MONDAY = Date.UTC(2026, 9, 26, 12); // segunda-feira

  function towerReady(typeOk: boolean) {
    const s = newGame(1, 0, 5);
    beatAllBefore(s, 'johto-rotas-29-31');
    const type = weeklyRule(MONDAY).type;
    const species = typeOk
      ? [...Array(721).keys()].find((id) => id > 0 && getSpecies(id)?.types[0] === type)!
      : 129;
    const p = addToCollection(s, species, 100, { ...IVS }, false, 0, 'teste');
    setActive(s, p.uid);
    // O inicial (de outro tipo) fica na equipe ao lado: tira para testar só o tipo do ativo.
    s.battleTeam = [];
    return s;
  }

  it('a regra gira toda semana e os andares são iguais para todos', () => {
    const a = weeklyRule(MONDAY);
    const b = weeklyRule(MONDAY + 7 * DAY);
    expect(a.week + 1).toBe(b.week);
    expect(a.type).not.toBe(b.type);
    expect(weeklyRule(MONDAY + 6 * DAY).week).toBe(a.week);
    expect(floorTeam(5, weeklyRng(a.week, 5))).toEqual(floorTeam(5, weeklyRng(a.week, 5)));
    expect(floorTeam(5, weeklyRng(a.week, 5))).not.toEqual(floorTeam(5, weeklyRng(b.week, 5)));
  });

  it('exige ativo e reservas do tipo da semana', () => {
    expect(weeklyBlocker(towerReady(false), MONDAY)).toBe('type');
    const s = towerReady(true);
    expect(weeklyBlocker(s, MONDAY)).toBeNull();
    const other = addToCollection(s, 129, 50, { ...IVS }, false, 0, 'teste');
    if (addToTeam(s, other.uid) && getSpecies(129).types[0] !== weeklyRule(MONDAY).type) {
      expect(weeklyBlocker(s, MONDAY)).toBe('type');
    }
  });

  it('a subida conta no placar da semana e não no ranking normal', () => {
    const s = towerReady(true);
    expect(challengeWeeklyTower(s, MONDAY)).toBe(true);
    expect(s.battle.weekly).toBe(true);
    const start = s.tower.floor;
    s.tower.floor = start + 12;
    const reached = endTowerRun(s, MONDAY + 1000, activePokemon(s).speciesId);
    expect(reached).toBe(start + 11);
    expect(s.tower.runs).toHaveLength(0);
    expect(s.tower.weeklyHistory[0]).toMatchObject({ week: weekOf(MONDAY), floor: start + 11 });
  });

  it('vencer andares paga os marcos da semana uma vez', () => {
    const s = towerReady(true);
    s.collection.forEach((p) => {
      p.level = 100;
      p.ivs = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };
      p.currentHp = statsOf(p).hp;
    });
    challengeWeeklyTower(s, MONDAY);
    const events: GameEvent[] = advance(s, 20 * 60_000, MONDAY);
    const floors = events.filter((e) => e.type === 'towerFloor');
    if (s.tower.weekly.best >= 10) expect(s.tower.weekly.claimed).toContain(10);
    expect(floors.length).toBeGreaterThan(0);
  });
});

describe('Nuzlocke', () => {
  function nuzlockeGame() {
    const s = newGame(4, 0, 9);
    s.routes['rota-4'].bossDefeated = true;
    prestigeReset(s, 'nuzlocke');
    expect(s.challenge).toBe('nuzlocke');
    return s;
  }

  it('só a primeira captura de cada área vale', () => {
    const s = nuzlockeGame();
    s.items['poke-ball'] = 50;
    expect(canCaptureHere(s)).toBe(true);
    recordNuzlockeCapture(s, s.currentRouteId);
    expect(canCaptureHere(s)).toBe(false);
    advance(s, 3000, 0);
    expect(throwBall(s, 'poke-ball', 0)).toHaveLength(0);
    abandonChallenge(s);
    expect(canCaptureHere(s)).toBe(true);
  });

  it('quem desmaia contra um líder sai da jornada; sem ninguém, o desafio falha', () => {
    const s = nuzlockeGame();
    const first = activePokemon(s);
    const second = addToCollection(s, 1, 10, { ...IVS }, false, 0, 'teste');
    s.routes['floresta-viridian'].unlocked = true;
    s.routes['floresta-viridian'].kills = 999;
    challengeBoss(s, 'floresta-viridian');
    expect(s.battle.kind).toBe('boss');
    expect(onNuzlockeFaint(s, first.uid)).toBe(true);
    const events: GameEvent[] = [];
    replaceFallenActive(s, events);
    expect(s.activeUid).toBe(second.uid);
    setActive(s, first.uid);
    expect(s.activeUid).toBe(second.uid);
    expect(isFallen(s, first.uid)).toBe(true);

    onNuzlockeFaint(s, second.uid);
    replaceFallenActive(s, events);
    expect(events).toContainEqual({ type: 'challengeFailed', challenge: 'nuzlocke' });
    expect(s.challenge).toBeNull();
    expect(isFallen(s, first.uid)).toBe(false);
  });

  it('desmaiar na grama não tira ninguém da jornada', () => {
    const s = nuzlockeGame();
    expect(s.battle.kind).toBe('wild');
    expect(onNuzlockeFaint(s, s.activeUid)).toBe(false);
  });
});
