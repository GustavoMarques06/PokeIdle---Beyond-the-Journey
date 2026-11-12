// Mais vida nas atividades (11/11): as regras novas de cada aba. O visual fica para as prints; aqui só o que muda o
// jogo (bifurcação das expedições, estação e guardião do jardim, lanterna e pedido do cientista, desafio do treino,
// aliados da raide, Amuleto Brilhante, galeria dos lendários, Cérebro da Torre, rivais do torneio, álbum e clima do
// Safari, Maior ou Menor e mural, temporada do Duelo).

import { describe, expect, it } from 'vitest';
import { BALANCE, BERRIES, EXPEDITIONS, ROUTES, SEASONS } from '../game-data';
import { addToCollection } from './collection';
import { DIG_LANTERNS, digState, startDig, lightLantern } from './dig';
import { EXPEDITION_FRIENDSHIP, chooseFork, claimExpedition, forkOpen, riskyLucky, startExpedition } from './expeditions';
import { berryInSeason, beesNext, beesVisiting, gardenGuardian, gardenSeason, gardenTimers, plantBerry } from './garden';
import { HILO_ENTRY, cashHiLo, guessHiLo, spinSlots, startHiLo } from './gamecorner';
import { activePokemon, newGame, type GameState } from './game';
import { SHINY_CHARM_AT, hasShinyCharm } from './hunt';
import { claimLabRequest, labRequest, labRequestDone } from './lab';
import { legendaryCaught } from './legendary';
import { duelRanking, duelSeason, monthOf } from './link';
import { raidAllies, raidAllyDamage } from './raids';
import { photoScore, safariAct, safariWalk, safariWeather, startSafari } from './safari';
import { DAILY_GOAL, claimDaily, dailyChallenge, dailyProgress, trainingMedals, trainingTick } from './training';
import { TOWER_BRAINS, towerBattle } from './battle';
import { cornerState } from './voltorb';

const IVS = { hp: 20, atk: 20, def: 20, spAtk: 20, spDef: 20, spe: 20 };

function unlocked(seed: number): GameState {
  const s = newGame(1, 0, seed);
  for (const r of ROUTES) s.routes[r.id] = { unlocked: true, kills: r.killsRequired, bossDefeated: !!r.boss };
  return s;
}

describe('Expedições: bifurcação, histórias e álbum', () => {
  it('a bifurcação abre na metade, a escolha muda a volta e o grupo ganha amizade e um cartão-postal', () => {
    const s = unlocked(1);
    const def = EXPEDITIONS[0];
    const mon = addToCollection(s, 19, 30, IVS, false, 0, 't');
    expect(startExpedition(s, def.id, [mon.uid], 1, 0)).toBe(true);
    const run = s.expeditions[0];
    expect(forkOpen(run, 1000)).toBe(false); // ainda no começo
    const half = (run.startedAt + run.endsAt) / 2;
    expect(forkOpen(run, half)).toBe(true);
    expect(chooseFork(s, def.id, 'safe', half)).toBe(true);
    expect(forkOpen(run, half + 1)).toBe(false); // já escolhida
    const before = mon.friendship ?? 0;
    const loot = claimExpedition(s, def.id, run.endsAt)!;
    expect(loot.fork).toBe('safe');
    expect(loot.stories?.length).toBe(1);
    expect(loot.newPostcard).toBe(true);
    expect(s.postcards?.[def.id]).toBe(1);
    expect((mon.friendship ?? 0) - before).toBeGreaterThanOrEqual(EXPEDITION_FRIENDSHIP);
  });

  it('o atalho arriscado dá certo ou errado pela semente (o mesmo ao recarregar)', () => {
    const run = { id: 'x', uids: [], hours: 1, startedAt: 0, endsAt: 1, seed: 123 };
    expect(riskyLucky(run)).toBe(riskyLucky({ ...run }));
  });
});

describe('Jardim: estação, abelhas e guardião', () => {
  it('cada estação favorece uma parte das berries, e a da estação cresce mais rápido', () => {
    const season = gardenSeason(0);
    const inSeason = BERRIES.find((b) => berryInSeason(b.id, season))!;
    const out = BERRIES.find((b) => !berryInSeason(b.id, season))!;
    expect(SEASONS.length).toBe(4);
    const s = unlocked(2);
    s.items[inSeason.id] = 1;
    s.items[out.id] = 1;
    s.collection = [];
    s.battleTeam = [];
    expect(plantBerry(s, 0, inSeason.id, 0)).toBe(true);
    expect(plantBerry(s, 1, out.id, 0)).toBe(true);
    const ratio = (s.garden[0]!.growMs ?? 0) / (inSeason.growMinutes * 60_000);
    expect(ratio).toBeCloseTo(0.8);
    expect((s.garden[1]!.growMs ?? 0) / (out.growMinutes * 60_000)).toBeCloseTo(1);
  });

  it('os Combee vêm 10 minutos a cada meia hora', () => {
    expect(beesVisiting(0)).toBe(true);
    expect(beesVisiting(11 * 60_000)).toBe(false);
    expect(beesNext(11 * 60_000)).toBe(30 * 60_000);
  });

  it('com um Voador ou de Fogo na equipe, o inseto é espantado sozinho', () => {
    const s = unlocked(3);
    const bird = addToCollection(s, 18, 40, IVS, false, 0, 't'); // Pidgeot
    s.activeUid = bird.uid;
    expect(gardenGuardian(s)).toBeTruthy();
    s.garden[0] = { berry: BERRIES[0].id, plantedAt: 0, readyAt: 1e9, pest: 10, pestAt: 10 };
    gardenTimers(s, 100, []);
    expect(s.garden[0]?.shooed).toBe(true);
  });
});

describe('Fósseis: lanterna e pedido do cientista', () => {
  it('a lanterna mostra brilhos sem cavar, e acaba depois de 2 usos', () => {
    const s = unlocked(4);
    expect(startDig(s, 0)).toBe(true);
    const run = digState(s).run!;
    const t = run.treasures[0];
    const depth = [...run.depth];
    expect(lightLantern(s, t.x, t.y)).toBeGreaterThan(0);
    expect(run.depth).toEqual(depth);
    expect(run.glints!.length).toBeGreaterThan(0);
    for (let i = 1; i < DIG_LANTERNS; i++) lightLantern(s, 0, 0);
    expect(lightLantern(s, 0, 0)).toBe(-1);
  });

  it('o pedido do dia consome os itens e paga uma vez', () => {
    const s = unlocked(5);
    const req = labRequest(0);
    expect(claimLabRequest(s, 0)).toBeNull();
    for (const [id, n] of Object.entries(req.items)) s.items[id] = n;
    const coins = s.coins;
    expect(claimLabRequest(s, 0)).not.toBeNull();
    expect(s.coins).toBe(coins + req.coins);
    expect(s.items[req.reward]).toBeGreaterThan(0);
    expect(labRequestDone(s, 0)).toBe(true);
    expect(claimLabRequest(s, 0)).toBeNull();
  });
});

describe('Treino: desafio do dia e medalhas', () => {
  it('os EVs do atributo do dia contam para o desafio, que paga uma vez', () => {
    const s = unlocked(6);
    // Das 8h ao meio-dia do mesmo dia (o atributo do desafio muda com o dia).
    const start = new Date(2026, 0, 5, 8).getTime();
    const end = start + 4 * 3_600_000;
    const c = dailyChallenge(start);
    const p = activePokemon(s);
    s.training.slots = [{ uid: p.uid, stat: c.stat, at: start, carry: 0 }];
    s.activeUid = addToCollection(s, 19, 10, IVS, false, 0, 't').uid;
    trainingTick(s, end, []);
    expect(dailyProgress(s, end).done).toBeGreaterThanOrEqual(DAILY_GOAL);
    expect(claimDaily(s, end)).toBe(true);
    expect(claimDaily(s, end)).toBe(false);
    expect(s.items[c.reward]).toBeGreaterThan(0);
  });

  it('cada atributo em 252 vale uma medalha', () => {
    const s = unlocked(7);
    const p = activePokemon(s);
    p.evs = { hp: 252, atk: 252, def: 0, spAtk: 0, spDef: 0, spe: 6 };
    expect(trainingMedals(p)).toEqual(['hp', 'atk']);
  });
});

describe('Raides com amigos, Amuleto Brilhante e galeria dos lendários', () => {
  it('os times de amigos viram aliados (no máximo 2), e o escudo corta o dano deles', () => {
    const s = unlocked(8);
    expect(raidAllies(s)).toEqual([]);
    s.link = {
      trainerId: 'eu',
      received: [],
      sent: [],
      ghosts: ['Ana', 'Bia', 'Caio'].map((name, i) => ({
        id: `g${i}`,
        trainerId: `t${i}`,
        name,
        avatar: 'red',
        badges: 8,
        team: [{ speciesId: 6 + i * 3, level: 50 } as never],
        at: 0,
        importedAt: 0,
        wins: 0,
        losses: 0,
        rewarded: false,
      })),
    };
    expect(raidAllies(s).map((a) => a.name)).toEqual(['Ana', 'Bia']);
    expect(raidAllyDamage(1000, true)).toBeLessThan(raidAllyDamage(1000, false));
  });

  it('o Amuleto Brilhante chega com shinies de 10 espécies', () => {
    const s = unlocked(9);
    for (let i = 1; i < SHINY_CHARM_AT; i++) s.pokedex[i] = { seen: true, caught: true, shinyCaught: true };
    expect(hasShinyCharm(s)).toBe(false);
    s.pokedex[SHINY_CHARM_AT] = { seen: true, caught: true, shinyCaught: true };
    expect(hasShinyCharm(s)).toBe(true);
  });

  it('a primeira captura de um lendário fica guardada para a galeria', () => {
    const s = unlocked(10);
    legendaryCaught(s, 150, 500, { routeId: 'rota-1', ball: 'ultra-ball', shiny: false, throws: 3 });
    legendaryCaught(s, 150, 900, { routeId: 'rota-2', ball: 'master-ball', shiny: true, throws: 1 });
    expect(s.legends.captures?.[150]).toMatchObject({ at: 500, ball: 'ultra-ball', throws: 3 });
  });
});

describe('Torre, Torneio, Safari, Game Corner e Duelo', () => {
  it('o andar do Cérebro traz um campeão com fala', () => {
    const s = unlocked(11);
    const b = towerBattle(s, 'rota-1', BALANCE.tower.bossEvery);
    expect(b.trainer?.name).toBe(TOWER_BRAINS[0].name);
    expect(b.trainer?.line).toBeTruthy();
    expect(towerBattle(s, 'rota-1', 1).trainer?.line).toBeUndefined();
  });

  it('o Safari guarda a melhor foto de cada espécie e o clima muda a zona', () => {
    const s = unlocked(12);
    s.coins = BALANCE.safari.fee;
    expect(startSafari(s, 0)).toBe(true);
    safariWalk(s, 'grass', 0);
    const id = s.safari!.enemy!.speciesId;
    safariAct(s, 'photo', 0);
    const photo = s.safariProgress!.album![id];
    expect(photo).toBeTruthy();
    expect(photoScore({ ...photo, shiny: true })).toBeGreaterThan(photoScore(photo));
    s.env = { period: 'day', weather: 'fog' };
    expect(safariWeather(s)).toBe('fog');
  });

  it('Maior ou Menor: entrada, palpites e pote; o jackpot entra no mural', () => {
    const s = unlocked(13);
    s.tokens = 100;
    expect(startHiLo(s)).toBe(true);
    expect(s.tokens).toBe(100 - HILO_ENTRY);
    const r = cornerState(s).hilo!;
    // Palpite certo garantido: carta 1 só pode subir (ou empatar).
    r.card = 1;
    let out = guessHiLo(s, 'high');
    while (out?.last?.result === 'tie') out = guessHiLo(s, 'high');
    expect(out?.last?.result).toBe('right');
    expect(cashHiLo(s)).toBeGreaterThan(HILO_ENTRY);
    // Mural: só prêmios grandes, os 5 maiores.
    s.tokens = 1e6;
    for (let i = 0; i < 400; i++) spinSlots(s, [], 5);
    const wall = cornerState(s).jackpots ?? [];
    expect(wall.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < wall.length; i++) expect(wall[i - 1].payout).toBeGreaterThanOrEqual(wall[i].payout);
  });

  it('a temporada do Duelo vira no mês seguinte e dá troféu a quem fechou em 1º', () => {
    const s = unlocked(14);
    const jan = new Date(2026, 0, 10).getTime();
    const season = duelSeason(s, jan);
    season.vs = { amigo: { w: 4, l: 1 } };
    s.link = { trainerId: 'eu', received: [], sent: [], ghosts: [] };
    expect(duelRanking(s, jan)[0]).toMatchObject({ you: true, w: 4 });
    const feb = new Date(2026, 1, 2).getTime();
    expect(duelSeason(s, feb).trophies).toEqual([monthOf(jan)]);
    expect(duelSeason(s, feb).vs).toEqual({});
  });
});
