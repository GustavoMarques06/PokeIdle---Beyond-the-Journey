// Mecânicas de 10/11: nível e escudo das raides, golpe gigante, regra da semana; camadas e rastros do Safari; tabuletas
// e palavra da semana do Unown; frentes e eventos do céu; boato fixo e janelas dos lendários.

import { describe, expect, it } from 'vitest';
import { BALANCE, LEGENDARIES, REGIONS, ROUTES, getRoute, getSpecies, typeEffectiveness } from '../game-data';
import { addToCollection } from './collection';
import { DIG_W, digState, finishDig, startDig } from './dig';
import { frontOn, frontsAt, routeWeather, skyAt, skyEvent, weatherAt } from './env';
import { formsCaught } from './forms';
import { activePokemon, challengeRaid, newGame, step, type GameEvent, type GameState } from './game';
import {
  legendaryNextWindow,
  legendaryWindowOpen,
  rumorOf,
  updateLegends,
} from './legendary';
import { RAID_MODS, raidBreakers, raidHpMultiplier, raidLevel, raidModifier, raidTimeLimit } from './raids';
import { rngFrom } from './rng';
import {
  SAFARI_DEPTHS,
  TRACK_STEPS,
  getZone,
  safariDeeper,
  safariFollow,
  safariRetreat,
  safariWalk,
  startSafari,
  walkCost,
} from './safari';
import { UNOWN_ID, UNOWN_TABLET, UNOWN_WORD_COINS, claimUnownWord, giveUnown, missingUnownForms, unownWordStatus } from './unown';

const IVS = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

function clearAll(s: GameState, upTo?: string): void {
  for (const r of ROUTES) {
    s.routes[r.id] = { unlocked: true, kills: r.killsRequired, bossDefeated: !!r.boss };
    if (r.id === upTo) break;
  }
}

function run(s: GameState, steps: number, until?: (e: GameEvent) => boolean): GameEvent[] {
  const events: GameEvent[] = [];
  const rng = rngFrom(s);
  for (let i = 0; i < steps; i++) {
    step(s, BALANCE.tickMs, rng, 0, events);
    if (until && events.some(until)) break;
  }
  return events;
}

/** Entra numa raide contra `speciesId` e espera o chefe aparecer em campo. */
function raidAgainst(s: GameState, speciesId: number, mod?: keyof typeof RAID_MODS) {
  s.raid = { speciesId, routeId: 'rota-1', level: 50, until: 1e13, mod };
  expect(challengeRaid(s)).toBe(true);
  run(s, 60, () => !!s.battle.enemy);
  return s.battle.enemy!;
}

describe('raides: nível, escudo, golpe gigante e regra da semana', () => {
  it('o chefe vem no nível da rota mais avançada, mesmo numa rota do começo', () => {
    const s = newGame(1, 0, 1);
    clearAll(s, 'rota-7-8-celadon');
    const early = raidLevel(s, getRoute('rota-1'));
    clearAll(s); // o jogo todo
    const late = raidLevel(s, getRoute('rota-1'));
    expect(late).toBeGreaterThan(early);
    expect(late).toBeGreaterThanOrEqual(90);
  });

  it('os tipos que quebram o escudo são os super efetivos (4× primeiro)', () => {
    const tyranitar = 248;
    const breakers = raidBreakers(tyranitar);
    expect(breakers[0]).toBe('fighting'); // 4× contra Pedra/Sombrio
    for (const t of breakers) expect(typeEffectiveness(t, getSpecies(tyranitar).types)).toBeGreaterThan(1);
    expect(breakers.length).toBeLessThanOrEqual(3);
  });

  it('o chefe entra com escudo; golpe que não quebra bate fraco e tira 1 ponto', () => {
    const s = newGame(1, 0, 2);
    clearAll(s, 'rota-7-8-celadon');
    activePokemon(s).level = 100;
    const enemy = raidAgainst(s, 248);
    expect(enemy.shield).toBe(BALANCE.raid.shield);
    // O primeiro acerto: tipo que quebra tira 3 pontos; os outros tiram 1.
    s.battle.enemyTimerMs = 1e9;
    const isHit = (e: GameEvent) => e.type === 'attack' && e.side === 'player' && e.result.damage > 0;
    const hit = run(s, 400, isHit).find(isHit);
    expect(hit?.type).toBe('attack');
    if (hit?.type !== 'attack') return;
    const breaker = raidBreakers(248).includes(hit.result.moveType);
    expect(enemy.shield).toBe(BALANCE.raid.shield - (breaker ? BALANCE.raid.shieldBreak : 1));
    // Até cair o escudo: o chefe fica atordoado.
    run(s, 2000, () => !enemy.shield);
    expect(enemy.shield).toBe(0);
    expect(enemy.stunMs).toBeGreaterThan(0);
  });

  it('a fúria ergue o escudo de novo e começa a carregar o golpe gigante', () => {
    const s = newGame(1, 0, 3);
    clearAll(s, 'rota-7-8-celadon');
    activePokemon(s).level = 100;
    const enemy = raidAgainst(s, 130);
    enemy.shield = 0;
    enemy.hp = Math.floor(enemy.maxHp * 0.67);
    s.battle.enemyTimerMs = 1e9;
    s.battle.playerTimerMs = 0;
    const events = run(s, 200, (e) => e.type === 'raidRage');
    expect(events.some((e) => e.type === 'raidRage')).toBe(true);
    expect(enemy.shield).toBe(BALANCE.raid.shield);
    expect(enemy.charging).toBe(true);
    expect(s.battle.enemyTimerMs).toBeLessThanOrEqual(BALANCE.raid.chargeMs);
    // Sem quebrar o escudo a tempo, o golpe gigante sai.
    s.battle.playerTimerMs = 1e9;
    const blast = run(s, 400, (e) => e.type === 'raidBlast');
    expect(blast.some((e) => e.type === 'raidBlast')).toBe(true);
    expect(enemy.charging).toBe(false);
  });

  it('a regra da semana muda o HP e o tempo, e fica guardada na raide', () => {
    expect(raidHpMultiplier(248, 'treasure')).toBeCloseTo(raidHpMultiplier(248) * 1.25);
    expect(raidTimeLimit(248, 'blitz')).toBe(Math.round(raidTimeLimit(248) * 0.75));
    const week = 7 * 86_400_000;
    const mods = new Set([0, 1, 2, 3].map((i) => raidModifier(i * week + week * 10)));
    expect(mods.size).toBe(4);
  });
});

describe('Safari: camadas da zona e rastros', () => {
  function inSafari(seed: number): GameState {
    const s = newGame(1, 0, seed);
    clearAll(s, 'zona-safari');
    s.coins = BALANCE.safari.fee;
    expect(startSafari(s, 0)).toBe(true);
    return s;
  }

  it('entrar mais fundo custa passos e deixa as caminhadas mais caras', () => {
    const s = inSafari(4);
    const steps = s.safari!.steps!;
    const base = walkCost(s.safari!, 'grass');
    expect(safariDeeper(s)).toBe(true);
    expect(s.safari!.steps).toBe(steps - SAFARI_DEPTHS[1].enter);
    expect(safariDeeper(s)).toBe(true);
    expect(s.safari!.depth).toBe(2);
    expect(safariDeeper(s)).toBe(false); // já no coração
    expect(walkCost(s.safari!, 'grass')).toBeGreaterThan(base);
    safariWalk(s, 'grass', 0);
    expect(s.safari!.enemy!.depth).toBe(2);
    expect(s.safari!.enemy!.level).toBeGreaterThanOrEqual(getZone(s.safari!.zone).levels[0] + SAFARI_DEPTHS[2].level);
    s.safari!.enemy = null;
    expect(safariRetreat(s)).toBe(true);
    expect(s.safari!.depth).toBe(0);
  });

  it('seguir um rastro gasta passos e traz a espécie dele', () => {
    const s = inSafari(5);
    s.safari!.track = { speciesId: 123, path: 'tall' };
    const steps = s.safari!.steps!;
    safariFollow(s, 0);
    expect(s.safari!.steps).toBe(steps - TRACK_STEPS);
    expect(s.safari!.enemy!.speciesId).toBe(123);
    expect(s.safari!.enemy!.tracked).toBe(true);
    expect(s.safari!.track).toBeUndefined();
  });
});

describe('Unown: tabuletas e palavra da semana', () => {
  it('a tabuleta descoberta vira um Unown de uma letra que falta', () => {
    const s = newGame(1, 0, 6);
    clearAll(s);
    const before = missingUnownForms(s).length;
    expect(startDig(s, 0)).toBe(true);
    const run = digState(s).run!;
    run.treasures = [{ item: UNOWN_TABLET, x: 0, y: 0, w: 2, h: 2 }];
    for (const i of [0, 1, DIG_W, DIG_W + 1]) run.depth[i] = 0;
    const done = finishDig(s).find((e) => e.type === 'digDone');
    expect(done && done.type === 'digDone' && done.unown?.length).toBe(1);
    expect(done && done.type === 'digDone' && done.items).toEqual([]);
    expect(missingUnownForms(s).length).toBe(before - 1);
    expect(s.items[UNOWN_TABLET]).toBeUndefined();
  });

  it('formar a palavra rende moedas e um Unown novo, uma vez por semana, sem gastar os Unown', () => {
    const s = newGame(1, 0, 7);
    const now = 86_400_000 * 300;
    const { word } = unownWordStatus(s, now);
    expect(claimUnownWord(s, now)).toEqual([]);
    for (const letter of word.toLowerCase()) {
      const p = addToCollection(s, UNOWN_ID, 20, IVS, false, now, 'teste');
      p.form = letter;
    }
    const unown = s.collection.filter((p) => p.speciesId === UNOWN_ID).length;
    expect(unownWordStatus(s, now).ready).toBe(true);
    const coins = s.coins;
    const events = claimUnownWord(s, now);
    expect(events[0]?.type).toBe('unownWord');
    expect(s.coins).toBe(coins + UNOWN_WORD_COINS);
    expect(s.collection.filter((p) => p.speciesId === UNOWN_ID).length).toBe(unown + 1);
    expect(claimUnownWord(s, now)).toEqual([]); // já resgatada
  });

  it('com a coleção completa, ainda entrega um Unown (de qualquer letra)', () => {
    const s = newGame(1, 0, 8);
    for (let i = 0; i < 40; i++) giveUnown(s, 0, 'teste');
    expect(formsCaught(s, UNOWN_ID).length).toBe(28);
    expect(missingUnownForms(s)).toEqual([]);
  });
});

describe('clima: frentes e eventos do céu', () => {
  it('cada frente fica numa rota ao ar livre da região e troca o clima dela', () => {
    for (let t = 0; t < 30; t++) {
      const now = t * 3 * 3_600_000 + 10 * 60_000;
      const fronts = frontsAt(now);
      expect(fronts.length).toBeLessThanOrEqual(REGIONS.length);
      for (const f of fronts) {
        const route = getRoute(f.routeId);
        expect(route.kind).toBe('wild');
        expect(f.until).toBeGreaterThan(now);
        const env = { period: 'day' as const, weather: weatherAt(now), fronts };
        expect(frontOn(env, f.routeId)).toBe(f);
        expect(routeWeather(route, env)).toBe(f.weather);
      }
    }
  });

  it('a frente anda uma rota a cada 20 minutos', () => {
    const now = 3 * 3_600_000 * 1000 + 60_000;
    const a = frontsAt(now);
    const b = frontsAt(now + 20 * 60_000);
    const moved = a.filter((f) => f.next && b.some((g) => g.routeId === f.next));
    expect(moved.length).toBe(a.filter((f) => f.next).length);
  });

  it('a aurora só aparece nos campos de neve, de noite e com céu limpo', () => {
    const snow = ROUTES.find((r) => r.scene === 'snowfield');
    const meadow = ROUTES.find((r) => r.scene === 'meadow' && r.kind === 'wild')!;
    if (snow) {
      expect(skyEvent(snow, { period: 'night', weather: 'clear' })).toBe('aurora');
      expect(skyEvent(snow, { period: 'day', weather: 'clear' })).toBeUndefined();
    }
    expect(skyEvent(meadow, { period: 'night', weather: 'clear', sky: 'meteors' })).toBe('meteors');
    expect(skyEvent(meadow, { period: 'night', weather: 'rain', sky: 'meteors' })).toBeUndefined();
  });

  it('chuva de meteoros só de noite e arco-íris só de dia', () => {
    for (let h = 0; h < 24 * 60; h++) {
      const t = h * 3_600_000 + 5 * 60_000;
      const sky = skyAt(t);
      const hour = new Date(t).getHours();
      const day = hour >= 6 && hour < 18;
      if (sky === 'meteors') expect(day).toBe(false);
      if (sky === 'rainbow') expect(day).toBe(true);
    }
  });
});

describe('lendários: boato fixo no dia e janelas da previsão', () => {
  it('o boato não troca no mesmo dia, mesmo que a equipe mude', () => {
    const s = newGame(1, 0, 9);
    clearAll(s);
    const day = 86_400_000 * 20_000 + 3_600_000 * 15;
    updateLegends(s, day, []);
    const rumor = rumorOf(s, day);
    expect(rumor).toBeDefined();
    s.legends.caught.push(...LEGENDARIES.map((l) => l.speciesId).slice(0, 10));
    expect(rumorOf(s, day + 3_600_000)).toBe(rumor);
  });

  it('o boato evita um lendário que só volta amanhã', () => {
    const s = newGame(1, 0, 10);
    clearAll(s);
    const day = 86_400_000 * 20_001 + 3_600_000 * 10;
    const first = rumorOf(s, day)!;
    s.legends.cooldowns[first] = day + 20 * 3_600_000;
    s.legends.rumorDay = undefined;
    s.legends.rumorId = undefined;
    updateLegends(s, day, []);
    expect(rumorOf(s, day)).not.toBe(first);
  });

  it('a próxima janela de um lendário escondido bate com legendaryWindowOpen', () => {
    const s = newGame(1, 0, 11);
    clearAll(s);
    const now = 86_400_000 * 20_002 + 3_600_000 * 20;
    for (const def of LEGENDARIES) {
      const next = legendaryNextWindow(def.speciesId, now);
      if (next === undefined) continue;
      expect(next).toBeGreaterThanOrEqual(now);
      expect(legendaryWindowOpen(def.speciesId, next, next + 60_000)).toBe(true);
    }
  });
});
