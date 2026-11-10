import { describe, expect, it } from 'vitest';
import { BALANCE, PRIZES, ROUTES, STARTER_GENERATIONS, getRoute, getSpecies, speciesId } from '../game-data';
import { computeModifiers } from './bonuses';
import { addToCollection } from './collection';
import { compatible, daycareKills, hatchReadyEggs, putInDaycare } from './daycare';
import { claimMilestone, dexBonuses } from './dex';
import { environmentAt, weatherAt } from './env';
import { updateRoamer, updateRocket } from './events';
import { claimExpedition, expeditionSlots, startExpedition } from './expeditions';
import { DIG_COST, DIG_H, DIG_W, FREE_DIGS, digHit, digState, finishDig, freeDigsLeft, startDig, treasureUncovered } from './dig';
import { claimFossil, startRevive } from './fossils';
import { buyPrize, buyTokens, prizePrice, slotReturnRate, spinSlots } from './gamecorner';
import { VF_ENTRY, cashOutVoltorb, cornerState, flipCard, floorAvailable, searchFloor, startVoltorb, voltorbHints, weeklyPrize } from './voltorb';
import { canWater, eatBerry, harvest, mutationFlag, mutationOf, pestActive, plantBerry, shooPest, waterPlot } from './garden';
import {
  advance,
  challengeBoss,
  challengeRocket,
  challengeTower,
  currentEncounters,
  newGame,
  resolveBossTeam,
  rivalSpecies,
  type GameState,
} from './game';
import { RADAR_CHAIN, RADAR_CHARGE, huntShinyMultiplier, pickRadarBush, radarReady, recordEncounter, setHuntTarget } from './hunt';
import { claimMission, progressMission, refreshMissions } from './missions';
import { learnableMoves, setMoveset } from './moveset';
import { movesOf } from './pokemon';
import { rngFrom } from './rng';
import { parseSave, serialize } from './save';
import { updateTimers } from './timers';

const HOUR = 3_600_000;
const IVS = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

/** Marca como concluídas todas as rotas até `routeId` (inclusive). */
function clearUpTo(s: GameState, routeId: string): void {
  const last = ROUTES.findIndex((r) => r.id === routeId);
  ROUTES.forEach((r, i) => {
    if (i > last + 1) return;
    s.routes[r.id] = {
      unlocked: true,
      kills: i <= last ? r.killsRequired : 0,
      bossDefeated: i <= last && !!r.boss,
    };
  });
}

function give(s: GameState, slug: string, level = 20) {
  return addToCollection(s, speciesId(slug), level, IVS, false, 0, 'Teste');
}

describe('creche', () => {
  it('só cruza Pokémon compatíveis e choca ovos com vitórias', () => {
    const s = newGame(1, 0, 1);
    s.settings.autoHatch = true;
    clearUpTo(s, BALANCE.daycare.unlock);
    const a = give(s, 'rattata');
    const b = give(s, 'ekans');
    const ditto = give(s, 'ditto');
    a.gender = 'm';
    b.gender = 'f';
    expect(compatible(a, b)).toBe(true); // grupo Campo, macho e fêmea
    expect(compatible(a, give(s, 'pidgey'))).toBe(false);
    expect(compatible(a, ditto)).toBe(true);
    expect(compatible(ditto, ditto)).toBe(false);
    expect(compatible(a, { speciesId: speciesId('mewtwo') })).toBe(false);

    expect(putInDaycare(s, a.uid)).toBe(true);
    expect(putInDaycare(s, ditto.uid)).toBe(true);
    expect(putInDaycare(s, b.uid)).toBe(false); // só 2 vagas
    daycareKills(s, BALANCE.daycare.killsPerEgg);
    expect(s.eggs).toHaveLength(1);
    expect(s.eggs[0].speciesId).toBe(speciesId('rattata'));
    expect(a.level).toBeGreaterThan(20);

    daycareKills(s, s.eggs[0].cycles * BALANCE.daycare.killsPerCycle);
    const events: never[] = [];
    const before = s.collection.length;
    hatchReadyEggs(s, 0, events);
    expect(s.collection.length).toBe(before + 1);
    expect(s.collection.at(-1)!.level).toBe(BALANCE.daycare.hatchLevel);
    expect(s.stats.hatched).toBe(1);
  });

  it('ovos também chocam com o tempo real', () => {
    const s = newGame(1, 0, 2);
    s.settings.autoHatch = true;
    clearUpTo(s, BALANCE.daycare.unlock);
    putInDaycare(s, give(s, 'rattata').uid);
    putInDaycare(s, give(s, 'ditto').uid);
    daycareKills(s, BALANCE.daycare.killsPerEgg);
    const cycles = s.eggs[0].cycles;
    const events = updateTimers(s, cycles * BALANCE.daycare.minutesPerCycle * 60_000 + 1);
    expect(events.some((e) => e.type === 'hatched')).toBe(true);
    expect(s.eggs).toHaveLength(0);
  });
});

describe('expedições', () => {
  it('parte, volta e entrega recompensas determinísticas', () => {
    const run = () => {
      const s = newGame(1, 0, 3);
      clearUpTo(s, 'floresta-viridian');
      expect(expeditionSlots(s)).toBe(1);
      const p = give(s, 'pidgey', 10);
      expect(startExpedition(s, 'patrulha', [s.activeUid], 1, 0)).toBe(false); // ativo está ocupado
      expect(startExpedition(s, 'patrulha', [p.uid], 1, 0)).toBe(true);
      expect(claimExpedition(s, 'patrulha', HOUR - 1)).toBeNull();
      const loot = claimExpedition(s, 'patrulha', HOUR)!;
      expect(loot).not.toBeNull();
      expect(s.expeditions).toHaveLength(0);
      return { loot, level: p.level };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    expect(a.level).toBeGreaterThan(10);
  });
});

describe('formas fora de batalha', () => {
  it('o Unown das ruínas chega com letra, e as 28 aparecem com o tempo', () => {
    const s = newGame(1, 0, 3);
    clearUpTo(s, 'torre-queimada');
    const party = [give(s, 'abra', 50), give(s, 'gastly', 50), give(s, 'murkrow', 50)].map((p) => p.uid);
    let t = 0;
    for (let i = 0; i < 400 && (s.forms[201]?.length ?? 0) < 28; i++) {
      expect(startExpedition(s, 'ruinas', party, 8, t)).toBe(true);
      t += 8 * HOUR;
      claimExpedition(s, 'ruinas', t);
    }
    const unowns = s.collection.filter((p) => p.speciesId === 201);
    expect(unowns.length).toBeGreaterThan(0);
    expect(unowns.every((p) => !!p.form)).toBe(true);
    expect(s.forms[201]).toHaveLength(28);
  });
});

describe('jardim e berries', () => {
  it('planta, colhe e come para ganhar bônus temporário', () => {
    const s = newGame(1, 0, 4);
    clearUpTo(s, 'floresta-viridian');
    updateTimers(s, 0); // presente de berries
    expect(s.items['oran-berry']).toBe(3);
    expect(plantBerry(s, 0, 'oran-berry', 0)).toBe(true);
    expect(harvest(s, 0, 26 * 60_000)).toBe(0); // Bulbasaur na equipe: cresce 10% mais rápido (27 min)
    expect(harvest(s, 0, 30 * 60_000)).toBeGreaterThanOrEqual(1); // um inseto pode ter beliscado 1
    const damage = computeModifiers(s).damage;
    expect(eatBerry(s, 'pecha-berry')).toBe(true);
    expect(computeModifiers(s).coins).toBeGreaterThan(1);
    expect(computeModifiers(s).damage).toBe(damage);
    advance(s, 31 * 60_000, 0);
    expect(s.buffs.coins).toBeUndefined();
  });
});

describe('jardim vivo', () => {
  it('regar adianta e 3 regas rendem +1; o inseto sai ao espantar', () => {
    const s = newGame(1, 0, 4);
    clearUpTo(s, 'floresta-viridian');
    s.items['sitrus-berry'] = 2;
    expect(plantBerry(s, 0, 'sitrus-berry', 0)).toBe(true);
    const plot = s.garden[0]!;
    const ready = plot.readyAt;
    expect(waterPlot(s, 0, 0)).toBe(true);
    expect(waterPlot(s, 0, 1000)).toBe(false); // espera entre regas
    expect(plot.readyAt).toBeLessThan(ready);
    waterPlot(s, 0, 20 * 60_000);
    waterPlot(s, 0, 40 * 60_000);
    expect(plot.waters).toBe(3);
    expect(canWater(plot, 60 * 60_000)).toBe(false);
    plot.pest = speciesId('caterpie');
    plot.pestAt = 0;
    expect(pestActive(plot, 1)).toBe(true);
    const research = s.research.points;
    expect(shooPest(s, 0, 1)).toBe(true);
    expect(s.research.points).toBe(research + 1);
    expect(pestActive(plot, 2)).toBe(false);
    expect(harvest(s, 0, plot.readyAt)).toBeGreaterThanOrEqual(2); // 1–3 + 1 da rega
  });

  it('mutação: berries vizinhas diferentes podem gerar uma mais rara', () => {
    expect(mutationOf('oran-berry', 'oran-berry')).toBeUndefined();
    expect(mutationOf('oran-berry', 'pecha-berry')).toBe('cheri-berry');
    expect(mutationOf('sitrus-berry', 'lum-berry')).toBe('lum-berry');
    let found = false;
    for (let seed = 1; seed < 60 && !found; seed++) {
      const s = newGame(1, 0, seed);
      clearUpTo(s, 'floresta-viridian');
      s.items['oran-berry'] = 5;
      s.items['pecha-berry'] = 5;
      plantBerry(s, 0, 'oran-berry', 0);
      plantBerry(s, 1, 'pecha-berry', 0);
      const events: import('./game').GameEvent[] = [];
      harvest(s, 0, 10 * 3_600_000, events);
      if (events.some((e) => e.type === 'gardenMutation')) {
        found = true;
        expect(s.flags).toContain(mutationFlag('cheri-berry'));
      }
    }
    expect(found).toBe(true);
  });
});

describe('Poké Radar', () => {
  it('carrega com os encontros do alvo; moita forte sobe a sequência, a brilhante garante o shiny', () => {
    const s = newGame(1, 0, 5);
    const target = 16;
    s.pokedex[target] = { ...(s.pokedex[target] ?? {}), seen: true } as (typeof s.pokedex)[number];
    setHuntTarget(s, target);
    for (let i = 0; i < RADAR_CHARGE - 1; i++) recordEncounter(s, target, false, i);
    expect(radarReady(s)).toBe(false);
    recordEncounter(s, target, false, 99);
    expect(radarReady(s)).toBe(true);
    const bushes = s.hunt.radarBushes!;
    expect(bushes).toHaveLength(4);
    const chain = s.hunt.chain;
    s.hunt.radarBushes = ['strong', 'weak', 'weak', 'weak'];
    expect(pickRadarBush(s, 0)).toBe('strong');
    expect(s.hunt.chain).toBe(chain + RADAR_CHAIN);
    expect(radarReady(s)).toBe(false);
    s.hunt.radarBushes = ['sparkle', 'weak', 'weak', 'weak'];
    pickRadarBush(s, 0);
    expect(huntShinyMultiplier(s, target)).toBeGreaterThan(1e6);
    recordEncounter(s, target, true, 200); // o shiny veio: a garantia acaba
    expect(huntShinyMultiplier(s, target)).toBeLessThan(10);
    setHuntTarget(s, null);
    expect(s.hunt.radar).toBe(0);
  });
});

describe('escavação', () => {
  it('3 grátis por dia, depois paga; golpes cavam e a parede desaba com os tesouros descobertos', () => {
    const s = newGame(1, 0, 9);
    clearUpTo(s, 'mt-moon');
    s.coins = DIG_COST;
    expect(freeDigsLeft(s, 0)).toBe(FREE_DIGS);
    expect(startDig(s, 0)).toBe(true);
    expect(startDig(s, 0)).toBe(false); // uma parede por vez
    const run = digState(s).run!;
    expect(run.depth).toHaveLength(DIG_W * DIG_H);
    expect(run.treasures.length).toBeGreaterThanOrEqual(2);
    const before = run.depth.reduce((a, b) => a + b, 0);
    digHit(s, 5, 4, 'hammer');
    expect(run.depth.reduce((a, b) => a + b, 0)).toBeLessThan(before);
    expect(run.stability).toBeLessThan(100);
    // Descobre o primeiro tesouro inteiro e termina: ele vem para a mochila.
    const t = run.treasures[0];
    for (let y = t.y; y < t.y + t.h; y++) for (let x = t.x; x < t.x + t.w; x++) run.depth[y * DIG_W + x] = 0;
    expect(treasureUncovered(run, t)).toBe(true);
    const had = s.items[t.item] ?? 0;
    const done = finishDig(s).find((e) => e.type === 'digDone');
    expect(done && 'items' in done && done.items).toContain(t.item);
    expect(s.items[t.item]).toBe(had + 1);
    // Gasta as grátis do dia; a próxima custa moedas.
    finishDig(s);
    for (let i = 1; i < FREE_DIGS; i++) {
      startDig(s, 0);
      finishDig(s);
    }
    expect(freeDigsLeft(s, 0)).toBe(0);
    expect(startDig(s, 0)).toBe(true);
    expect(s.coins).toBe(0);
    // Martelando sem parar, a parede desaba sozinha.
    let ended = false;
    for (let i = 0; i < 40 && !ended; i++) ended = digHit(s, i % DIG_W, i % DIG_H, 'hammer').some((e) => e.type === 'digDone');
    expect(ended).toBe(true);
    expect(digState(s).run).toBeNull();
    expect(freeDigsLeft(s, 86_400_000 * 2)).toBe(FREE_DIGS); // outro dia
  });
});

describe('fósseis', () => {
  it('revive depois das horas indicadas', () => {
    const s = newGame(1, 0, 5);
    clearUpTo(s, 'mt-moon');
    s.items['helix-fossil'] = 1;
    expect(startRevive(s, 'helix-fossil', 0)).toBe(true);
    expect(claimFossil(s, 0, HOUR)).toBeNull();
    const p = claimFossil(s, 0, 3 * HOUR)!;
    expect(s.fossilsRevived?.[p.speciesId]).toBe(1); // Museu
    expect(p.speciesId).toBe(speciesId('omanyte'));
  });
});

describe('caça ao shiny', () => {
  it('aumenta o peso do alvo e conta a sequência', () => {
    const s = newGame(1, 0, 6);
    const target = currentEncounters(s, 'rota-1')[0].speciesId;
    const base = currentEncounters(s, 'rota-1').find((e) => e.speciesId === target)!.weight;
    s.pokedex[target] = { seen: true, caught: false, shinyCaught: false };
    setHuntTarget(s, target);
    expect(currentEncounters(s, 'rota-1').find((e) => e.speciesId === target)!.weight).toBe(
      base * BALANCE.hunt.targetWeight,
    );
    advance(s, 5 * 60_000, 0);
    expect(s.hunt.encounters).toBeGreaterThan(0);
    expect(s.hunt.counts[target]).toBeGreaterThanOrEqual(s.hunt.encounters);
  });
});

describe('missões', () => {
  it('sorteia, progride e paga recompensas', () => {
    const s = newGame(1, 0, 7);
    refreshMissions(s, 0, []);
    expect(s.missions.daily).toHaveLength(BALANCE.missions.daily);
    expect(s.missions.weekly).toHaveLength(BALANCE.missions.weekly);
    const m = s.missions.daily[0];
    progressMission(s, m.kind, m.target, undefined, m.type ? [m.type] : undefined);
    expect(claimMission(s, 'daily', m.id)).not.toBeNull();
    expect(claimMission(s, 'daily', m.id)).toBeNull();
    // Mesmo dia, mesmas missões.
    const again = newGame(1, 0, 7);
    refreshMissions(again, 0, []);
    expect(again.missions.daily.map((x) => x.kind)).toEqual(s.missions.daily.map((x) => x.kind));
  });
});

describe('Pokédex', () => {
  it('marcos dão recompensa e bônus permanente', () => {
    const s = newGame(1, 0, 8);
    expect(claimMilestone(s, 'dex-10')).toBe(false);
    for (let id = 1; id <= 10; id++) s.pokedex[id] = { seen: true, caught: true, shinyCaught: false };
    expect(claimMilestone(s, 'dex-10')).toBe(true);
    expect(dexBonuses(s).capture).toBeGreaterThan(0);
    expect(claimMilestone(s, 'dex-10')).toBe(false);
  });
});

describe('golpes e TMs', () => {
  it('só aceita golpes aprendidos ou TMs liberados', () => {
    const s = newGame(4, 0, 9);
    const p = s.collection[0];
    const tm = getSpecies(p.speciesId).tmMoves[0];
    expect(setMoveset(s, p.uid, [tm])).toBe(false);
    s.tms.push(tm);
    expect(learnableMoves(s, p).some((m) => m.move === tm && m.source === 'tm')).toBe(true);
    expect(setMoveset(s, p.uid, [tm])).toBe(true);
    expect(movesOf(p)).toEqual([tm]);
    expect(setMoveset(s, p.uid, [])).toBe(true);
    expect(p.moveset).toBeUndefined();
  });
});

describe('rival e chefes', () => {
  it('o rival escolhe o inicial com vantagem e fica mais forte a cada jornada', () => {
    for (const gen of STARTER_GENERATIONS) {
      const s = newGame(gen.ids[0], 0, 10);
      expect(rivalSpecies(s, 1)).toBe(gen.ids[1]);
    }
    const s = newGame(1, 0, 10);
    const boss = getRoute('rota-24-25').boss!;
    const base = resolveBossTeam(s, boss);
    s.prestige.count = 2;
    const stronger = resolveBossTeam(s, boss);
    expect(stronger.at(-1)!.level).toBe(base.at(-1)!.level + 2 * BALANCE.rival.levelsPerPrestige);
    expect(base.at(-1)!.speciesId).toBe(rivalSpecies(s, 2));
  });

  it('vencer um líder entrega o TM', () => {
    const s = newGame(7, 0, 11);
    clearUpTo(s, 'rota-3');
    s.routes['floresta-viridian'] = { unlocked: true, kills: 999, bossDefeated: false };
    s.collection[0].level = 60;
    expect(challengeBoss(s, 'floresta-viridian')).toBe(true);
    for (let i = 0; i < 60 && !s.routes['floresta-viridian'].bossDefeated; i++) advance(s, 5000, 0);
    expect(s.routes['floresta-viridian'].bossDefeated).toBe(true);
    expect(s.tms).toContain('rock-tomb');
  });
});

describe('eventos', () => {
  it('errantes aparecem, e a Equipe Rocket pode ser enfrentada', () => {
    const s = newGame(1, 0, 12);
    clearUpTo(s, 'rota-12-15');
    const rng = rngFrom(s);
    updateRoamer(s, 0, rng, []);
    updateRoamer(s, s.nextRoamerAt, rng, []);
    expect(s.roamer).not.toBeNull();
    expect(s.routes[s.roamer!.routeId].unlocked).toBe(true);

    updateRocket(s, 0, rng, []);
    const events: { type: string }[] = [];
    updateRocket(s, s.nextRocketAt, rng, events as never);
    expect(s.rocket).not.toBeNull();
    expect(challengeRocket(s)).toBe(true);
    expect(s.battle.kind).toBe('rocket');
    expect(s.battle.team.length).toBeGreaterThanOrEqual(2);
  });
});

describe('Torre de Batalha', () => {
  it('sobe andares e registra o ranking ao perder', () => {
    const s = newGame(4, 0, 13);
    clearUpTo(s, BALANCE.tower.unlock);
    s.collection[0].level = 100;
    expect(challengeTower(s)).toBe(true);
    for (let i = 0; i < 400 && s.battle.kind === 'tower'; i++) advance(s, 10_000, 0);
    expect(s.battle.kind).toBe('wild');
    expect(s.tower.best).toBeGreaterThan(0);
    expect(s.tower.runs[0].floor).toBe(s.tower.best);
    expect(s.tower.points).toBeGreaterThan(0);
  });
});

describe('Game Corner', () => {
  it('caça-níqueis devolve menos do que recebe', () => {
    const rtp = slotReturnRate();
    expect(rtp).toBeGreaterThan(0.7);
    expect(rtp).toBeLessThan(1);
  });

  it('compra fichas, gira e troca prêmios', () => {
    const s = newGame(1, 0, 14);
    clearUpTo(s, BALANCE.gameCorner.unlock);
    s.coins = 4 * BALANCE.gameCorner.packPrice;
    expect(buyTokens(s, 4)).toBe(true);
    expect(s.coins).toBe(0);
    expect(s.tokens).toBe(200);
    expect(spinSlots(s)).not.toBeNull();
    s.tokens = 10_000;
    const before = s.collection.length;
    expect(buyPrize(s, 0, 0)).toBe(true);
    expect(s.collection.length).toBe(before + 1);
  });

  it('aposta ×5 custa e paga 5 vezes; o prêmio da semana sai 30% mais barato', () => {
    const s = newGame(1, 0, 14);
    clearUpTo(s, BALANCE.gameCorner.unlock);
    s.tokens = 100;
    const r = spinSlots(s, [], 5)!;
    expect(s.tokens).toBe(100 - 15 + r.payout);
    expect(r.payout % 5).toBe(0);
    expect(spinSlots(s, [], 3)).toBeNull(); // aposta que não existe
    const w = weeklyPrize(0);
    expect(prizePrice(w.index, 0)).toBe(w.tokens);
    expect(w.tokens).toBeLessThan(PRIZES[w.index].tokens);
  });

  it('Voltorb Flip: tabuleiro com pistas certas, ganhar sobe de nível e o Voltorb faz perder', () => {
    const s = newGame(1, 0, 21);
    clearUpTo(s, BALANCE.gameCorner.unlock);
    s.tokens = 100;
    expect(startVoltorb(s)).toBe(true);
    expect(s.tokens).toBe(100 - VF_ENTRY);
    const r = cornerState(s).round!;
    expect(r.board).toHaveLength(25);
    expect(r.board.filter((v) => v === 0)).toHaveLength(6); // nível 1: 6 Voltorbs
    const h = voltorbHints(r.board);
    expect(h.rows.reduce((a, [sum]) => a + sum, 0)).toBe(r.board.reduce((a, b) => a + b, 0));
    expect(h.cols.reduce((a, [, b]) => a + b, 0)).toBe(6);
    // Vira só as cartas boas: ganha a rodada.
    const tokens = s.tokens;
    r.board.forEach((v, i) => v > 1 && flipCard(s, i));
    expect(r.over).toBe('won');
    expect(s.tokens).toBeGreaterThan(tokens);
    expect(cornerState(s).level).toBe(2);
    // Nova rodada: o Voltorb na primeira carta derruba para o nível 1.
    cornerState(s).round = null;
    startVoltorb(s);
    const r2 = cornerState(s).round!;
    expect(flipCard(s, r2.board.indexOf(0))).toBe(0);
    expect(r2.over).toBe('lost');
    expect(cornerState(s).level).toBe(1);
    // Parar leva o que acumulou.
    cornerState(s).round = null;
    startVoltorb(s);
    const r3 = cornerState(s).round!;
    const safe = r3.board.findIndex((v) => v >= 1);
    flipCard(s, safe);
    const before = s.tokens;
    expect(cashOutVoltorb(s)).toBe(r3.board[safe]);
    expect(s.tokens).toBe(before + r3.board[safe]);
  });

  it('fichas no chão uma vez por dia', () => {
    const s = newGame(1, 0, 14);
    clearUpTo(s, BALANCE.gameCorner.unlock);
    expect(floorAvailable(s, 0)).toBe(true);
    expect(searchFloor(s, 0)).toBeGreaterThanOrEqual(10);
    expect(searchFloor(s, 1000)).toBe(0);
    expect(floorAvailable(s, 86_400_000 * 2)).toBe(true);
  });
});

describe('ambiente', () => {
  it('clima é determinístico por bloco de horas', () => {
    const t = 1_700_000_000_000;
    expect(weatherAt(t)).toBe(weatherAt(t + 60_000));
    expect(environmentAt(t).weather).toBe(weatherAt(t));
  });
});

describe('save', () => {
  it('migra saves v3 com os campos novos', () => {
    const s = newGame(4, 0, 15);
    const raw = JSON.parse(serialize(s, 1000));
    raw.meta.formatVersion = 3;
    for (const key of [
      'starterId',
      'tms',
      'daycare',
      'eggs',
      'hunt',
      'missions',
      'tower',
      'env',
      'lastTimerAt',
    ])
      delete raw.state[key];
    const parsed = parseSave(JSON.stringify(raw));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.state.starterId).toBe(4);
    expect(parsed.file.state.daycare.uids).toEqual([]);
    expect(parsed.file.state.tower.best).toBe(0);
    expect(parsed.file.state.lastTimerAt).toBe(1000);
  });
});

describe('Pokémon perfeito', () => {
  it('IVs variam de 0 a 31 e perfeitos aparecem raramente', async () => {
    const { randomIvs, isPerfect } = await import('./pokemon');
    const { seededRng } = await import('./rng');
    const rng = seededRng(7);
    const samples = Array.from({ length: 20000 }, () => randomIvs(rng));
    const perfect = samples.filter(isPerfect).length;
    expect(perfect).toBeGreaterThan(80);
    expect(perfect).toBeLessThan(250);
    const values = new Set(samples.flatMap((i) => Object.values(i)));
    expect(Math.min(...values)).toBe(0);
    expect(Math.max(...values)).toBe(31);
  });
});

describe('lendários', () => {
  const ARTICUNO = 144;
  const unlocked = () => {
    const s = newGame(4, 0, 21);
    clearUpTo(s, 'liga-campeao');
    s.collection[0].level = 100;
    return s;
  };

  it('só libera depois do Campeão e exige batalha manual', async () => {
    const { challengeLegendary, throwBall } = await import('./game');
    const { legendaryStatus, legendaryDef } = await import('./legendary');
    const locked = newGame(4, 0, 21);
    expect(legendaryStatus(locked, legendaryDef(ARTICUNO)!, 0)).toBe('locked');
    expect(challengeLegendary(locked, ARTICUNO, 0)).toBe(false);

    const s = unlocked();
    expect(legendaryStatus(s, legendaryDef(ARTICUNO)!, 0)).toBe('ready');
    expect(challengeLegendary(s, ARTICUNO, 0)).toBe(true);
    s.upgrades.push('auto-capture');
    s.items['ultra-ball'] = 100;
    advance(s, BALANCE.combat.spawnDelayMs + 100, 0);
    for (let i = 0; i < 400 && s.battle.kind === 'legendary' && s.battle.enemy!.hp > 1; i++)
      advance(s, BALANCE.combat.spawnDelayMs + 100, 0);
    // Foi enfraquecido até 1 de HP, mas não foi derrotado nem capturado sozinho.
    expect(s.battle.kind).toBe('legendary');
    expect(s.battle.enemy!.hp).toBe(1);
    advance(s, 3000, 0);
    expect(s.items['ultra-ball']).toBe(100);

    const before = s.collection.length;
    for (let i = 0; i < 200 && s.battle.kind === 'legendary'; i++) throwBall(s, 'ultra-ball', 0);
    expect(
      s.battle.kind === 'legendary' || s.collection.length > before || s.legends.cooldowns[ARTICUNO],
    ).toBeTruthy();
  });

  it('a Master Ball captura e o lendário volta depois da espera para outra captura', async () => {
    const { challengeLegendary, throwBall } = await import('./game');
    const s = unlocked();
    s.items['master-ball'] = 1;
    challengeLegendary(s, ARTICUNO, 0);
    advance(s, BALANCE.combat.spawnDelayMs + 100, 0);
    const events = throwBall(s, 'master-ball', 0);
    expect(events.some((e) => e.type === 'legendaryEnded' && e.reason === 'caught')).toBe(true);
    expect(s.legends.caught).toContain(ARTICUNO);
    expect(s.battle.kind).toBe('wild');
    expect(challengeLegendary(s, ARTICUNO, 0)).toBe(false);
    const p = s.collection.at(-1)!;
    expect(Object.values(p.ivs).filter((v) => v === 31).length).toBeGreaterThanOrEqual(3);

    const back = BALANCE.legendary.recaptureMinutes * 60_000;
    expect(challengeLegendary(s, ARTICUNO, back - 1000)).toBe(false);
    s.items['master-ball'] = 1;
    expect(challengeLegendary(s, ARTICUNO, back)).toBe(true);
    advance(s, BALANCE.combat.spawnDelayMs + 100, back);
    throwBall(s, 'master-ball', back);
    expect(s.collection.filter((x) => x.speciesId === ARTICUNO)).toHaveLength(2);
    expect(s.legends.caught.filter((id) => id === ARTICUNO)).toHaveLength(1);
  });

  it('foge depois de muitas bolas falhas e entra em espera', async () => {
    const { challengeLegendary, throwBall } = await import('./game');
    const s = unlocked();
    s.items['poke-ball'] = 500;
    challengeLegendary(s, ARTICUNO, 0);
    advance(s, BALANCE.combat.spawnDelayMs + 100, 0);
    for (let i = 0; i < BALANCE.legendary.throwLimit && s.battle.kind === 'legendary'; i++) {
      throwBall(s, 'poke-ball', 0);
      s.battle.holdMs = undefined; // sem esperar a bola parar de balançar
    }
    if (!s.legends.caught.includes(ARTICUNO)) {
      expect(s.battle.kind).toBe('wild');
      expect(s.legends.cooldowns[ARTICUNO]).toBeGreaterThan(0);
      expect(challengeLegendary(s, ARTICUNO, 1000)).toBe(false);
    }
  });
});

describe('quase lendários', () => {
  it('usam taxa de captura normal e regras próprias', async () => {
    const { challengeLegendary, currentCaptureChance } = await import('./game');
    const { legendaryRules } = await import('./legendary');
    const s = newGame(4, 0, 22);
    clearUpTo(s, 'liga-campeao');
    s.collection[0].level = 100;
    const DRAGONITE = 149;
    expect(legendaryRules(DRAGONITE)).toBe(BALANCE.pseudo);
    expect(challengeLegendary(s, DRAGONITE, 0)).toBe(true);
    advance(s, BALANCE.combat.spawnDelayMs + 100, 0);
    s.battle.enemy!.hp = 1;
    const pseudo = currentCaptureChance(s, 'ultra-ball');
    s.battle.team[0].speciesId = 144;
    s.battle.enemy!.speciesId = 144;
    expect(pseudo).toBeGreaterThan(currentCaptureChance(s, 'ultra-ball') * 5);
  });
});
