// Mecânicas da 0.4: naturezas, status, equipe de batalha, desafios e histórico.

import { describe, expect, it } from 'vitest';
import { BALANCE, NATURES, PRESTIGE, getSpecies } from '../game-data';
import { combatScales, computeModifiers, passivePokemon } from './bonuses';
import { addToCollection } from './collection';
import { calcDamage, combatantOf } from './combat';
import { activePokemon, advance, newGame, shopEntries, type GameEvent, type GameState } from './game';
import { currentSample, historyIntervals, ratePerHour, sampleHistory } from './history';
import { addPassive, canPrestige, prestigePreview, prestigeReset } from './meta';
import { natureFor, randomIvs, statsOf } from './pokemon';
import type { Rng } from './rng';
import { SAVE_KEY, memoryStorage, parseSave, saveGame } from './save';
import { calcStats } from './stats';
import { beforeAction, canInflict, rollAilment, statusDamage } from './status';
import { addReserve, bestMatchup, removeReserve, reservePokemon, reserveSlotsUnlocked } from './team';

const IVS = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
const always = (v: number): Rng => ({ next: () => v });

function withReserveSlots(s: GameState): void {
  s.routes['mt-moon'].bossDefeated = true;
  s.routes['rota-4'].bossDefeated = true;
}

function addMon(s: GameState, speciesId: number, level: number) {
  return addToCollection(s, speciesId, level, { ...IVS }, false, 0, 'teste');
}

describe('naturezas', () => {
  it('são as 25 clássicas, 5 delas neutras', () => {
    expect(NATURES).toHaveLength(25);
    expect(NATURES.filter((n) => !n.up)).toHaveLength(5);
    expect(NATURES.find((n) => n.id === 'adamant')).toMatchObject({ up: 'atk', down: 'spAtk' });
  });

  it('ajustam ±10% os atributos, nunca o HP', () => {
    const species = getSpecies(25);
    const neutral = calcStats(species, 50, IVS);
    const adamant = calcStats(species, 50, IVS, 'adamant');
    expect(adamant.atk).toBe(Math.floor(neutral.atk * 1.1));
    expect(adamant.spAtk).toBe(Math.floor(neutral.spAtk * 0.9));
    expect(adamant.hp).toBe(neutral.hp);
    expect(calcStats(species, 50, IVS, 'hardy')).toEqual(neutral);
  });

  it('são atribuídas de forma determinística e variada', () => {
    expect(natureFor(7, IVS)).toBe(natureFor(7, IVS));
    const seen = new Set(Array.from({ length: 200 }, (_, uid) => natureFor(uid, IVS)));
    expect(seen.size).toBeGreaterThan(15);
    const s = newGame(4, 0, 1);
    expect(activePokemon(s).nature).toBeDefined();
  });
});

describe('status', () => {
  it('golpes com efeito causam o status, respeitando imunidades de tipo', () => {
    expect(rollAilment('ember', ['grass'], null, always(0))).toEqual({ kind: 'burn' });
    expect(rollAilment('ember', ['fire'], null, always(0))).toBeNull();
    expect(rollAilment('ember', ['grass'], { kind: 'poison' }, always(0))).toBeNull();
    expect(rollAilment('ember', ['grass'], null, always(0.99))).toBeNull();
    expect(rollAilment('tackle', ['grass'], null, always(0))).toBeNull();
    expect(canInflict('poison', ['steel'])).toBe(false);
  });

  it('sono faz perder as vezes sorteadas e depois acorda', () => {
    const st = { kind: 'sleep' as const, turns: 2 };
    expect(beforeAction(st, always(0.5))).toBe('skip');
    expect(beforeAction(st, always(0.5))).toBe('skip');
    expect(beforeAction(st, always(0.5))).toBe('cured');
  });

  it('queimadura e veneno ferem; queimadura enfraquece golpes físicos', () => {
    expect(statusDamage({ kind: 'burn' }, 160)).toBe(10);
    expect(statusDamage({ kind: 'poison' }, 160)).toBe(20);
    expect(statusDamage({ kind: 'paralysis' }, 160)).toBe(0);
    const atk = combatantOf({ speciesId: 4, level: 30, ivs: IVS });
    const def = combatantOf({ speciesId: 7, level: 30, ivs: IVS });
    const normal = calcDamage(atk, def, 'scratch', always(0.5)).damage;
    const burned = calcDamage({ ...atk, burned: true }, def, 'scratch', always(0.5)).damage;
    expect(burned).toBeLessThan(normal * 0.6);
  });

  it('aparecem durante o combate e somem a cada nova batalha', () => {
    const s = newGame(4, 0, 11);
    activePokemon(s).level = 40; // Ember/Flamethrower queimam com frequência.
    const events = advance(s, 20 * 60_000, 0);
    expect(events.some((e) => e.type === 'attack' && e.result.status)).toBe(true);
    const spawns = events.filter((e) => e.type === 'spawn').length;
    expect(spawns).toBeGreaterThan(1);
  });
});

describe('equipe de batalha', () => {
  it('vagas de reserva dependem do progresso e recusam Pokémon ocupados', () => {
    const s = newGame(4, 0, 1);
    const sq = addMon(s, 7, 10);
    expect(reserveSlotsUnlocked(s)).toBe(0);
    expect(addReserve(s, sq.uid)).toBe(false);
    withReserveSlots(s);
    expect(addReserve(s, s.activeUid)).toBe(false);
    expect(addReserve(s, sq.uid)).toBe(true);
    expect(addReserve(s, sq.uid)).toBe(false);
    expect(addPassive(s, sq.uid)).toBe(false);
    removeReserve(s, sq.uid);
    expect(reservePokemon(s)).toHaveLength(0);
  });

  it('a reserva entra quando o ativo desmaia; sem reservas, derrota', () => {
    const s = newGame(4, 0, 3);
    withReserveSlots(s);
    s.settings.autoSwitch = false;
    const sq = addMon(s, 7, 5);
    addReserve(s, sq.uid);
    const first = s.activeUid;
    const events: GameEvent[] = [];
    // Espera o primeiro inimigo e o deixa fortíssimo.
    while (s.battle.phase !== 'fighting') events.push(...advance(s, 100, 0));
    s.battle.enemy!.level = 70;
    s.battle.enemy!.hp = s.battle.enemy!.maxHp = 9999;
    for (let i = 0; i < 600 && !events.some((e) => e.type === 'playerFainted'); i++) {
      events.push(...advance(s, 100, 0));
    }
    const switched = events.find((e) => e.type === 'switched');
    expect(switched).toMatchObject({ reason: 'fainted', uid: sq.uid });
    expect(events.some((e) => e.type === 'playerFainted')).toBe(true);
    expect(s.activeUid).toBe(sq.uid);
    expect(s.battleTeam).toContain(first);
  });

  it('reservas ganham parte da EXP das vitórias', () => {
    const s = newGame(7, 0, 5);
    withReserveSlots(s);
    s.settings.autoSwitch = false;
    const reserve = addMon(s, 1, 5);
    addReserve(s, reserve.uid);
    const before = reserve.exp;
    advance(s, 2 * 60_000, 0);
    expect(reserve.exp).toBeGreaterThan(before);
    expect(s.stats.expEarned).toBeGreaterThan(0);
  });

  it('a troca automática escolhe a reserva com vantagem de tipo', () => {
    const s = newGame(4, 0, 1);
    withReserveSlots(s);
    activePokemon(s).level = 20;
    const sq = addMon(s, 7, 20);
    addReserve(s, sq.uid);
    const geodude = {
      speciesId: 74,
      level: 20,
      ivs: IVS,
      shiny: false,
      hp: 60,
      maxHp: 60,
      captureAttempted: false,
    };
    expect(bestMatchup(s, geodude, computeModifiers(s))).toBe(sq.uid);
    const bulbasaur = { ...geodude, speciesId: 1 };
    expect(bestMatchup(s, bulbasaur, computeModifiers(s))).toBeNull();
  });
});

describe('desafios', () => {
  function readyToPrestige(): GameState {
    const s = newGame(4, 0, 1);
    s.routes[PRESTIGE.requiresBoss].bossDefeated = true;
    s.routes['rota-1'].kills = 999;
    s.routes['floresta-viridian'].bossDefeated = true;
    return s;
  }

  it('Lobo solitário tira apoio e reservas', () => {
    const s = readyToPrestige();
    withReserveSlots(s);
    const sq = addMon(s, 7, 10);
    addPassive(s, sq.uid);
    expect(passivePokemon(s)).toHaveLength(1);
    s.challenge = 'solo';
    expect(passivePokemon(s)).toHaveLength(0);
    expect(reserveSlotsUnlocked(s)).toBe(0);
  });

  it('Mochila vazia tira as bolas da loja; Natureza feroz aumenta o dano inimigo', () => {
    const s = readyToPrestige();
    expect(shopEntries(s).some((e) => e.id === 'poke-ball')).toBe(true);
    s.challenge = 'frugal';
    expect(shopEntries(s).some((e) => e.id === 'poke-ball')).toBe(false);
    const normal = combatScales(computeModifiers({ ...s, challenge: null }), ['normal']).enemyDamage;
    const fierce = combatScales(computeModifiers({ ...s, challenge: 'fierce' }), ['normal']).enemyDamage;
    expect(fierce).toBeCloseTo(normal * BALANCE.fierceEnemyDamage);
  });

  it('concluir a jornada com desafio dá pontos extras e registra o desafio', () => {
    const s = readyToPrestige();
    expect(canPrestige(s)).toBe(true);
    const base = prestigePreview(s);
    s.challenge = 'solo';
    expect(prestigePreview(s)).toBe(Math.floor(base * 1.5));
    const gained = prestigeReset(s, 'fierce');
    expect(gained).toBe(Math.floor(base * 1.5));
    expect(s.challengesWon).toEqual(['solo']);
    expect(s.challenge).toBe('fierce');
    expect(s.battleTeam).toEqual([]);
  });
});

describe('histórico', () => {
  it('amostra a cada 15 minutos e calcula o ritmo por hora', () => {
    const s = newGame(4, 0, 1);
    const MIN = 60_000;
    sampleHistory(s, 0);
    s.stats.expEarned = 100;
    sampleHistory(s, 10 * MIN);
    expect(s.history).toHaveLength(1);
    sampleHistory(s, 15 * MIN);
    s.stats.expEarned = 300;
    sampleHistory(s, 30 * MIN);
    expect(s.history).toHaveLength(3);
    const intervals = historyIntervals(s.history, currentSample(s, 30 * MIN));
    expect(intervals.map((i) => i.delta.exp)).toEqual([100, 200]);
    expect(ratePerHour(intervals, 'exp', 30 * MIN, 1)).toBeCloseTo(600);
  });

  it('guarda no máximo 24 h e recomeça se o relógio voltar', () => {
    const s = newGame(4, 0, 1);
    for (let i = 0; i < 120; i++) sampleHistory(s, i * 15 * 60_000);
    expect(s.history).toHaveLength(BALANCE.history.maxSamples);
    sampleHistory(s, 1000);
    expect(s.history).toHaveLength(1);
  });
});

describe('save da 0.3', () => {
  it('migra adicionando naturezas, reservas, desafio e histórico', () => {
    const s = newGame(4, 0, 9);
    const storage = memoryStorage();
    saveGame(storage, s, 1000);
    const old = JSON.parse(storage.getItem(SAVE_KEY)!);
    old.meta.formatVersion = 4;
    for (const p of old.state.collection) delete p.nature;
    for (const k of ['battleTeam', 'challenge', 'challengesWon', 'history']) delete old.state[k];
    const result = parseSave(JSON.stringify(old));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const st = result.file.state;
    const p = st.collection[0];
    expect(p.nature).toBe(natureFor(p.uid, p.ivs));
    expect(st.battleTeam).toEqual([]);
    expect(st.challenge).toBeNull();
    expect(st.history).toEqual([]);
    expect(statsOf(p).hp).toBeGreaterThan(0);
  });
});

describe('IVs aleatórios continuam gerando naturezas válidas', () => {
  it('toda natureza sorteada existe', () => {
    const ids = new Set(NATURES.map((n) => n.id));
    for (let uid = 1; uid < 50; uid++)
      expect(ids.has(natureFor(uid, randomIvs(always(uid / 50))))).toBe(true);
  });
});

describe('Loja de Departamentos', () => {
  it('vende todos os itens usáveis, mas só para quem está na área dela', async () => {
    const { DEPT_STORE, DEPT_STORE_CATALOG } = await import('../game-data');
    const { atDeptStore, buyAtDeptStore, deptStoreUnlocked, selectRoute } = await import('./game');
    const ids = DEPT_STORE_CATALOG.map((e) => e.id);
    for (const id of ['master-ball', 'rare-candy', 'moon-stone', 'dusk-stone', 'helix-fossil', 'lum-berry']) {
      expect(ids).toContain(id);
    }
    // Itens seguráveis e de treino também estão à venda; o que não tem uso no jogo, não.
    for (const id of ['leftovers', 'choice-band', 'protein', 'bottle-cap']) expect(ids).toContain(id);
    expect(ids).not.toContain('exp-share');

    const s = newGame(4, 0, 1);
    const start = 2 * DEPT_STORE.prices['rare-candy'] + 1000;
    s.coins = start;
    expect(deptStoreUnlocked(s)).toBe(false);
    expect(buyAtDeptStore(s, 'rare-candy')).toBe(false);

    s.routes[DEPT_STORE.routeId].unlocked = true;
    expect(atDeptStore(s)).toBe(false);
    expect(buyAtDeptStore(s, 'rare-candy')).toBe(false);

    selectRoute(s, DEPT_STORE.routeId, 0);
    expect(atDeptStore(s)).toBe(true);
    expect(buyAtDeptStore(s, 'rare-candy', 2)).toBe(true);
    expect(s.items['rare-candy']).toBe(2);
    expect(s.coins).toBe(1000);
    expect(buyAtDeptStore(s, 'master-ball')).toBe(false); // caro demais
  });

  it('no desafio Mochila vazia, só a Master Ball fica entre as bolas', async () => {
    const { deptStoreEntries } = await import('./game');
    const s = newGame(4, 0, 1);
    s.challenge = 'frugal';
    const balls = deptStoreEntries(s)
      .filter((e) => e.section === 'balls')
      .map((e) => e.id);
    expect(balls).toEqual(['master-ball']);
  });
});
