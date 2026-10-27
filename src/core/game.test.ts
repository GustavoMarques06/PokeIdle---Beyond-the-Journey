import { describe, expect, it } from 'vitest';
import { ROUTES, SHOP, STARTERS, getRoute } from '../game-data';
import {
  activePokemon,
  advance,
  buy,
  canChallengeBoss,
  challengeBoss,
  newGame,
  registerKills,
  routeCleared,
  selectRoute,
  setActive,
  throwBall,
  type GameEvent,
} from './game';

const MINUTE = 60_000;

describe('novo jogo', () => {
  it('começa com o inicial escolhido na primeira rota', () => {
    const s = newGame(4, 1000, 1);
    expect(s.collection).toHaveLength(1);
    expect(activePokemon(s).speciesId).toBe(4);
    expect(activePokemon(s).level).toBe(5);
    expect(s.currentRouteId).toBe(ROUTES[0].id);
    expect(s.routes[ROUTES[0].id].unlocked).toBe(true);
    expect(s.routes[ROUTES[1].id].unlocked).toBe(false);
    expect(s.pokedex[4].caught).toBe(true);
  });
});

describe('combate automático', () => {
  it('derrotar inimigos concede EXP, moedas e progresso na rota', () => {
    const s = newGame(7, 0, 123);
    const startExp = activePokemon(s).exp;
    const events = advance(s, 2 * MINUTE, 0);
    expect(events.some((e) => e.type === 'enemyFainted')).toBe(true);
    expect(s.coins).toBeGreaterThan(0);
    expect(activePokemon(s).exp).toBeGreaterThan(startExp);
    expect(s.routes['rota-1'].kills).toBeGreaterThan(0);
    expect(s.pokedex[16]?.seen || s.pokedex[19]?.seen).toBe(true);
  });

  it('a simulação é determinística para a mesma semente', () => {
    const a = newGame(1, 0, 99);
    const b = newGame(1, 0, 99);
    advance(a, 5 * MINUTE, 0);
    advance(b, 5 * MINUTE, 0);
    expect(a).toEqual(b);
  });

  it('atingir o requisito libera a rota seguinte', () => {
    const s = newGame(1, 0, 5);
    const events: GameEvent[] = [];
    registerKills(s, 'rota-1', getRoute('rota-1').killsRequired, events);
    expect(s.routes['rota-2'].unlocked).toBe(true);
    expect(events).toContainEqual({ type: 'routeUnlocked', routeId: 'rota-2' });
  });

  it('não permite entrar em rota bloqueada', () => {
    const s = newGame(1, 0, 5);
    selectRoute(s, 'mt-moon');
    expect(s.currentRouteId).toBe('rota-1');
  });
});

describe('chefes', () => {
  it('chefe só aparece após o requisito e, vencido, libera a próxima rota', () => {
    const s = newGame(7, 0, 3);
    for (const id of ['rota-1', 'rota-2']) registerKills(s, id, 1000, []);
    selectRoute(s, 'floresta-viridian');
    expect(canChallengeBoss(s, 'floresta-viridian')).toBe(false);
    registerKills(s, 'floresta-viridian', 1000, []);
    expect(canChallengeBoss(s, 'floresta-viridian')).toBe(true);

    // Squirtle fortalecido para vencer Brock com folga.
    const p = activePokemon(s);
    p.level = 30;
    p.speciesId = 8;
    expect(challengeBoss(s, 'floresta-viridian')).toBe(true);
    const events = advance(s, 3 * MINUTE, 0);
    expect(events.some((e) => e.type === 'bossDefeated')).toBe(true);
    expect(routeCleared(s, 'floresta-viridian')).toBe(true);
    expect(s.routes['rota-3'].unlocked).toBe(true);
    expect(s.items['great-ball']).toBe(3);
  });

  it('derrota contra o chefe volta para a rota sem perder nada', () => {
    const s = newGame(4, 0, 3);
    for (const id of ['rota-1', 'rota-2', 'floresta-viridian']) registerKills(s, id, 1000, []);
    selectRoute(s, 'floresta-viridian');
    challengeBoss(s, 'floresta-viridian');
    const events = advance(s, 2 * MINUTE, 0);
    expect(events.some((e) => e.type === 'playerFainted')).toBe(true);
    expect(s.collection).toHaveLength(1);
    expect(s.routes['floresta-viridian'].bossDefeated).toBe(false);
  });
});

describe('captura e equipe', () => {
  it('capturar adiciona à coleção e à Pokédex', () => {
    const s = newGame(1, 0, 11);
    s.items['poke-ball'] = 500;
    let captured = false;
    for (let i = 0; i < 600 && !captured; i++) {
      advance(s, 500, 0);
      captured = throwBall(s, 'poke-ball', 0).some((e) => e.type === 'captured');
    }
    expect(captured).toBe(true);
    expect(s.collection.length).toBe(2);
    const caught = s.collection[1];
    expect(s.pokedex[caught.speciesId].caught).toBe(true);
    setActive(s, caught.uid);
    expect(activePokemon(s).uid).toBe(caught.uid);
  });

  it('não lança bola sem estoque', () => {
    const s = newGame(1, 0, 11);
    s.items['poke-ball'] = 0;
    advance(s, 5000, 0);
    expect(throwBall(s, 'poke-ball', 0)).toEqual([]);
  });

  it('loja respeita moedas e desbloqueios', () => {
    const s = newGame(1, 0, 11);
    expect(buy(s, 'poke-ball')).toBe(false);
    const price = SHOP.find((e) => e.id === 'poke-ball')!.price;
    s.coins = 2 * price + 10;
    expect(buy(s, 'poke-ball', 3)).toBe(false);
    expect(buy(s, 'poke-ball', 2)).toBe(true);
    expect(s.items['poke-ball']).toBe(7);
    expect(s.coins).toBe(10);
    expect(buy(s, 'great-ball')).toBe(false); // exige vencer Brock
  });
});

describe('ritmo da campanha', () => {
  // Bot simples: fica na rota até liberar o chefe, desafia e avança.
  // Serve de alarme de balanceamento: nem trivial, nem impossível.
  for (const starter of STARTERS) {
    // A progressão é lenta de propósito (BALANCE.progression / rewards).
    it(`inicial ${starter} vence o Lt. Surge entre 2 h e 15 h de jogo ativo`, () => {
      const s = newGame(starter, 0, 42);
      let minutes = 0;
      const last = 'rota-5-6';
      while (minutes < 900 && !routeCleared(s, last)) {
        advance(s, MINUTE, 0);
        minutes++;
        const r = s.currentRouteId;
        if (canChallengeBoss(s, r) && s.battle.kind === 'wild') challengeBoss(s, r);
        if (routeCleared(s, r) && r !== last)
          selectRoute(s, ROUTES[ROUTES.findIndex((x) => x.id === r) + 1].id);
      }
      expect(routeCleared(s, last)).toBe(true);
      expect(minutes).toBeGreaterThanOrEqual(120);
    }, 120_000);
  }
});
