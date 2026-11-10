// Ferramentas do treinador: TMs, equipes salvas, automação, Cabo Link e próximos passos.

import { describe, expect, it } from 'vitest';
import { BALANCE, DEPT_STORE, ROUTES, getSpecies, speciesId } from '../game-data';
import { nextSteps, teamOdds } from './agenda';
import { automationTick, captureReason, previewCapture, setAutomation } from './automation';
import { addToCollection } from './collection';
import {
  advance,
  challengeRaid,
  freshBattle,
  newGame,
  resolveBossTeam,
  runAway,
  type GameEvent,
  type GameState,
} from './game';
import {
  cancelSend,
  challengeGhost,
  commitSend,
  decodeLinkCode,
  encodeLinkCode,
  ghostPacket,
  importGhost,
  parsePacket,
  receiveTrade,
  SURPRISE_PER_DAY,
  sendBlocker,
  surpriseLeft,
  surpriseTrade,
  tradePacket,
  type TradePacket,
} from './link';
import { applyChallengePreset, applyPreset, presetFor, savePreset, setPresetUse } from './presets';
import { PERFECT_IVS, movesOf, randomIvs } from './pokemon';
import { rngFrom } from './rng';
import { parseSave, serialize } from './save';
import { reservePokemon } from './team';
import { updateTimers } from './timers';
import { TM_CATALOG, buyTm, teachTm, tmLabel, tmShelf, tmSources } from './tms';

function beatBosses(s: GameState, upTo: string): void {
  for (const r of ROUTES) {
    s.routes[r.id].unlocked = true;
    s.routes[r.id].bossDefeated = !!r.boss;
    s.routes[r.id].kills = r.killsRequired;
    if (r.id === upTo) break;
  }
}

const IVS = { hp: 10, atk: 10, def: 10, spAtk: 10, spDef: 10, spe: 10 };

function give(s: GameState, slug: string, level = 20) {
  return addToCollection(s, speciesId(slug), level, { ...IVS }, false, 0, 'Teste');
}

/** Roda a batalha até voltar para a rota (ou estourar o tempo). */
function fightOut(s: GameState, now = 1000): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < 400 && s.battle.kind !== 'wild'; i++) events.push(...advance(s, 5000, now));
  return events;
}

describe('TMs', () => {
  it('numera primeiro os TMs dos líderes, na ordem dos ginásios', () => {
    expect(TM_CATALOG[0]).toEqual({ no: 1, move: 'rock-tomb' });
    expect(tmLabel('rock-tomb')).toBe('TM01');
    expect(new Set(TM_CATALOG.map((t) => t.move)).size).toBe(TM_CATALOG.length);
    expect(TM_CATALOG.length).toBeGreaterThan(40);
    expect(tmSources('rock-tomb')[0]).toEqual({ kind: 'boss', routeId: 'floresta-viridian' });
  });

  it('todo TM tem como ser conseguido', () => {
    for (const { move } of TM_CATALOG) expect(tmSources(move).length).toBeGreaterThan(0);
  });

  it('a prateleira só vende estando na loja, com dinheiro, e libera os fortes depois', () => {
    const s = newGame(1, 0, 1);
    beatBosses(s, DEPT_STORE.routeId);
    const shelf = tmShelf(s);
    const cheap = shelf.find((e) => !e.requiresBoss)!;
    expect(shelf.some((e) => e.requiresBoss === DEPT_STORE.tmStrongUnlock)).toBe(false);
    s.coins = cheap.price;
    expect(buyTm(s, cheap.move)).toBe(false); // não está na loja
    s.currentRouteId = DEPT_STORE.routeId;
    expect(buyTm(s, cheap.move)).toBe(true);
    expect(s.tms).toContain(cheap.move);
    expect(s.coins).toBe(0);
    expect(buyTm(s, cheap.move)).toBe(false); // já tem
  });

  it('ensina o TM na vaga livre ou no lugar de um golpe', () => {
    const s = newGame(1, 0, 1);
    const p = s.collection[0];
    // O inicial já nasce com 4 golpes: deixa só 2 (escolhidos à mão) para haver vaga livre.
    p.moveset = movesOf(p).slice(0, 2);
    const tm = TM_CATALOG.find(
      (t) => getSpecies(p.speciesId).tmMoves.includes(t.move) && !movesOf(p).includes(t.move),
    )!.move;
    expect(teachTm(s, p.uid, tm)).toBe(false); // TM não liberado
    s.tms.push(tm);
    const before = movesOf(p);
    expect(before.length).toBeLessThan(BALANCE.maxMoves);
    expect(teachTm(s, p.uid, tm)).toBe(true);
    expect(movesOf(p)).toEqual([...before, tm]);
    expect(teachTm(s, p.uid, tm)).toBe(false); // já usa
    // Com 4 golpes, só entra no lugar de um deles.
    const others = TM_CATALOG.map((t) => t.move).filter(
      (m) => m !== tm && getSpecies(p.speciesId).tmMoves.includes(m) && !movesOf(p).includes(m),
    );
    s.tms.push(...others);
    while (movesOf(p).length < BALANCE.maxMoves) teachTm(s, p.uid, others.shift()!);
    const next = others.shift()!;
    expect(teachTm(s, p.uid, next)).toBe(false);
    expect(teachTm(s, p.uid, next, tm)).toBe(true);
    expect(movesOf(p)).toContain(next);
    expect(movesOf(p)).not.toContain(tm);
    expect(movesOf(p)).toHaveLength(BALANCE.maxMoves);
  });

  it('recusa golpe que a espécie não aprende', () => {
    const s = newGame(1, 0, 1);
    const p = s.collection[0];
    const foreign = TM_CATALOG.find((t) => !getSpecies(p.speciesId).tmMoves.includes(t.move))!.move;
    s.tms.push(foreign);
    expect(teachTm(s, p.uid, foreign)).toBe(false);
  });
});

describe('equipes salvas', () => {
  it('troca ativo, reservas e itens de uma vez', () => {
    const s = newGame(1, 0, 1);
    beatBosses(s, 'rota-5-6');
    const starter = s.collection[0];
    const a = give(s, 'pikachu');
    const b = give(s, 'geodude');
    s.items.leftovers = 1;
    s.activeUid = a.uid;
    s.battleTeam = [b.uid];
    a.held = 'leftovers';
    s.items.leftovers = 0;
    const preset = savePreset(s, 'Elétrica')!;
    a.held = undefined;
    s.items.leftovers = 1;
    s.activeUid = starter.uid;
    s.battleTeam = [];
    expect(applyPreset(s, preset.id)).toBe(true);
    expect(s.activeUid).toBe(a.uid);
    expect(reservePokemon(s).map((p) => p.uid)).toEqual([b.uid]);
    expect(a.held).toBe('leftovers');
    expect(s.items.leftovers).toBe(0);
  });

  it('deixa de fora quem está em outra atividade', () => {
    const s = newGame(1, 0, 1);
    beatBosses(s, 'rota-5-6');
    const a = give(s, 'pikachu');
    const b = give(s, 'geodude');
    s.battleTeam = [a.uid, b.uid];
    const preset = savePreset(s, '')!;
    expect(preset.name).toBe('Equipe 1');
    s.battleTeam = [];
    s.daycare.uids = [b.uid];
    applyPreset(s, preset.id);
    expect(s.battleTeam).toEqual([a.uid]);
    expect(s.daycare.uids).toEqual([b.uid]);
  });

  it('a equipe ligada a um desafio entra sozinha e a de antes volta no fim', () => {
    const s = newGame(1, 0, 1);
    beatBosses(s, 'rota-5-6');
    const starter = s.collection[0];
    const a = give(s, 'pikachu', 60);
    s.activeUid = a.uid;
    const preset = savePreset(s, 'Raide')!;
    s.activeUid = starter.uid;
    setPresetUse(s, preset.id, 'raid');
    expect(presetFor(s, 'raid')?.id).toBe(preset.id);
    s.raid = { speciesId: speciesId('snorlax'), routeId: s.currentRouteId, level: 5, until: 1e12 };
    expect(challengeRaid(s)).toBe(true);
    expect(s.activeUid).toBe(a.uid);
    expect(s.presetReturn?.active).toBe(starter.uid);
    updateTimers(s, 10); // ainda na raide: nada muda
    expect(s.activeUid).toBe(a.uid);
    runAway(s, 20);
    updateTimers(s, 30);
    expect(s.activeUid).toBe(starter.uid);
    expect(s.presetReturn).toBeNull();
  });

  it('só uma equipe por desafio', () => {
    const s = newGame(1, 0, 1);
    const one = savePreset(s, 'A')!;
    const two = savePreset(s, 'B')!;
    setPresetUse(s, one.id, 'tower');
    setPresetUse(s, two.id, 'tower');
    expect(s.presets!.find((p) => p.id === one.id)!.use).toBeUndefined();
    expect(presetFor(s, 'tower')?.id).toBe(two.id);
    applyChallengePreset(s, 'raid'); // nenhuma ligada: nada muda
    expect(s.presetReturn).toBeUndefined();
  });
});

describe('automação', () => {
  function wildEnemy(s: GameState, slug: string) {
    const rng = rngFrom(s);
    s.battle = freshBattle(s.currentRouteId);
    s.battle.enemy = {
      speciesId: speciesId(slug),
      level: 5,
      ivs: randomIvs(rng),
      shiny: false,
      hp: 1,
      maxHp: 20,
      captureAttempted: false,
    };
    return s.battle.enemy;
  }

  it('espécies novas sempre; repetidos só pelas regras', () => {
    const s = newGame(1, 0, 1);
    const enemy = wildEnemy(s, 'pidgey');
    expect(captureReason(s, enemy)).toBe('new');
    give(s, 'pidgey');
    expect(captureReason(s, enemy)).toBeNull();
    setAutomation(s, { catchAll: true });
    expect(captureReason(s, enemy)).toBe('all');
  });

  it('a natureza prevista é a que o Pokémon recebe ao ser capturado', () => {
    const s = newGame(1, 0, 1);
    give(s, 'pidgey');
    const enemy = wildEnemy(s, 'pidgey');
    const preview = previewCapture(s, enemy);
    setAutomation(s, { catchKeepers: true, natures: [preview.nature!] });
    expect(captureReason(s, enemy)).toBe('keeper');
    const caught = addToCollection(s, enemy.speciesId, enemy.level, enemy.ivs, false, 0, 'Teste');
    expect(caught.nature).toBe(preview.nature);
  });

  it('sem critério ligado, ninguém é bom exemplar', () => {
    const s = newGame(1, 0, 1);
    give(s, 'pidgey');
    const enemy = wildEnemy(s, 'pidgey');
    enemy.ivs = { ...PERFECT_IVS };
    setAutomation(s, { catchKeepers: true });
    expect(captureReason(s, enemy)).toBeNull();
    setAutomation(s, { minPotential: 90 });
    expect(captureReason(s, enemy)).toBe('keeper');
  });

  it('transfere só os repetidos sem proteção', () => {
    const s = newGame(1, 0, 1);
    const keep = give(s, 'rattata', 30);
    const plain = give(s, 'rattata', 5);
    const tagged = give(s, 'rattata', 5);
    tagged.tag = 'blue';
    const fav = give(s, 'rattata', 5);
    fav.favorite = true;
    const named = give(s, 'rattata', 5);
    named.nickname = 'Rato';
    setAutomation(s, { autoTransfer: true });
    const events: GameEvent[] = [];
    automationTick(s, 0, events);
    const left = s.collection.map((p) => p.uid);
    expect(left).toContain(keep.uid);
    expect(left).not.toContain(plain.uid);
    expect(left).toEqual(expect.arrayContaining([tagged.uid, fav.uid, named.uid]));
    expect(events.find((e) => e.type === 'autoTransferred')).toMatchObject({ count: 1 });
    expect(s.stats.autoTransferred).toBe(1);
  });

  it('colhe e replanta o jardim, e resgata missões', () => {
    const s = newGame(1, 0, 1);
    s.garden = [{ berry: 'oran-berry', plantedAt: 0, readyAt: 10 }];
    s.missions.daily = [
      { id: 'm1', kind: 'kills', target: 1, progress: 1, claimed: false, reward: { coins: 77 } },
    ];
    setAutomation(s, { autoGarden: true, autoClaim: true });
    // O jardim precisa ter o canteiro liberado para replantar.
    beatBosses(s, BALANCE.garden.plots[0]);
    automationTick(s, 20, []);
    expect(s.stats.harvests).toBeGreaterThan(0);
    expect(s.garden[0]?.berry).toBe('oran-berry');
    expect(s.garden[0]!.plantedAt).toBe(20);
    expect(s.missions.daily[0].claimed).toBe(true);
    expect(s.coins).toBe(77);
  });

  it('as regras sobrevivem ao save e valores inválidos são corrigidos', () => {
    const s = newGame(1, 0, 1);
    setAutomation(s, { catchForms: true, natures: ['adamant', 'nada'], minPotential: 85 });
    const back = parseSave(serialize(s, 0));
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.file.state.automation).toMatchObject({
        catchForms: true,
        natures: ['adamant'],
        minPotential: 0,
      });
    }
  });
});

describe('Cabo Link: troca', () => {
  function friends() {
    const a = newGame(1, 1000, 11, 'Ana');
    const b = newGame(4, 2000, 22, 'Bia');
    for (const s of [a, b]) beatBosses(s, BALANCE.link.unlock);
    return { a, b };
  }

  it('o Pokémon sai de um jogo e chega no outro com IVs, natureza e golpes', async () => {
    const { a, b } = friends();
    const p = give(a, 'pikachu', 25);
    p.ivs = { ...PERFECT_IVS };
    p.nickname = 'Faísca';
    const packet = tradePacket(a, p.uid, 5000)!;
    const code = await encodeLinkCode(packet);
    expect(commitSend(a, p.uid, packet, code)).toBe(true);
    expect(a.collection.some((x) => x.uid === p.uid)).toBe(false);
    expect(a.link!.sent).toHaveLength(1);

    const read = await decodeLinkCode(code);
    expect(read.ok).toBe(true);
    if (!read.ok || read.packet.kind !== 'trade') return;
    const out = receiveTrade(b, read.packet, 6000);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const got = b.collection.find((x) => x.uid === out.uid)!;
    expect(got.speciesId).toBe(speciesId('pikachu'));
    expect(got.ivs).toEqual(PERFECT_IVS);
    expect(got.nature).toBe(p.nature);
    expect(got.nickname).toBe('Faísca');
    expect(got.ot).toBe('Ana');
    expect(got.caughtOn).toBe('Troca com Ana');
    expect(b.pokedex[got.speciesId]?.caught).toBe(true);
    // O mesmo código não entra duas vezes, e quem enviou não recebe de volta.
    expect(receiveTrade(b, read.packet, 7000).ok).toBe(false);
    expect(receiveTrade(a, read.packet, 7000).ok).toBe(false);
  });

  it('Kadabra evolui ao chegar por troca', () => {
    const { a, b } = friends();
    const p = give(a, 'kadabra', 20);
    const packet = tradePacket(a, p.uid, 1)!;
    const events: GameEvent[] = [];
    const out = receiveTrade(b, packet, 2, events);
    expect(out.ok && out.evolvedTo).toBe(speciesId('alakazam'));
    expect(events.some((e) => e.type === 'tradeReceived' && e.speciesId === speciesId('kadabra'))).toBe(true);
  });

  it('não envia o ativo, favoritos nem antes do Cabo Link', () => {
    const { a } = friends();
    expect(sendBlocker(a, a.activeUid)).not.toBeNull();
    const fav = give(a, 'pidgey');
    fav.favorite = true;
    expect(sendBlocker(a, fav.uid)).not.toBeNull();
    const fresh = newGame(1, 0, 1);
    const p = give(fresh, 'pidgey');
    expect(sendBlocker(fresh, p.uid)).not.toBeNull();
  });

  it('cancelar o envio traz o Pokémon de volta', async () => {
    const { a } = friends();
    const p = give(a, 'eevee', 12);
    const packet = tradePacket(a, p.uid, 1)!;
    commitSend(a, p.uid, packet, await encodeLinkCode(packet));
    const back = cancelSend(a, packet.id, 2)!;
    expect(back.speciesId).toBe(speciesId('eevee'));
    expect(back.level).toBe(12);
    expect(a.link!.sent).toHaveLength(0);
  });

  it('recusa pacotes com dados fora do lugar', () => {
    const { a } = friends();
    const p = give(a, 'pidgey');
    const packet = JSON.parse(JSON.stringify(tradePacket(a, p.uid, 1))) as TradePacket;
    expect(parsePacket(packet)).not.toBeNull();
    expect(parsePacket({ ...packet, pokemon: { ...packet.pokemon, level: 300 } })).toBeNull();
    expect(parsePacket({ ...packet, pokemon: { ...packet.pokemon, moveset: ['hydro-pump'] } })).toBeNull();
    expect(parsePacket({ ...packet, pokemon: { ...packet.pokemon, ivs: { ...IVS, atk: 40 } } })).toBeNull();
    expect(parsePacket({ ...packet, pokemon: { ...packet.pokemon, speciesId: 99999 } })).toBeNull();
  });
});

describe('Cabo Link: duelo fantasma', () => {
  function duel(myLevel: number, theirLevel: number) {
    const me = newGame(1, 1000, 11, 'Ana');
    const friend = newGame(4, 2000, 22, 'Bia');
    for (const s of [me, friend]) beatBosses(s, BALANCE.link.unlock);
    me.collection[0].level = myLevel;
    me.collection[0].currentHp = 9999;
    friend.collection[0].level = theirLevel;
    const out = importGhost(me, ghostPacket(friend, 3000), 4000);
    expect(out.ok).toBe(true);
    return { me, friend, id: out.ok ? out.id : '' };
  }

  it('vencer paga o prêmio só na primeira vez e não dá EXP', () => {
    const { me, id } = duel(100, 5);
    const exp = me.collection[0].exp;
    expect(challengeGhost(me, id)).toBe(true);
    expect(me.battle.kind).toBe('ghost');
    const events = fightOut(me);
    expect(me.battle.kind).toBe('wild');
    const end = events.find((e) => e.type === 'ghostDuelEnded');
    expect(end).toMatchObject({ won: true });
    expect(end && end.type === 'ghostDuelEnded' && end.coins).toBeGreaterThan(0);
    expect(me.collection[0].exp).toBe(exp);
    expect(me.link!.ghosts[0]).toMatchObject({ wins: 1, rewarded: true });
    challengeGhost(me, id);
    const again = fightOut(me).find((e) => e.type === 'ghostDuelEnded');
    expect(again).toMatchObject({ won: true, coins: 0 });
  });

  it('perder conta a derrota', () => {
    const { me, id } = duel(3, 100);
    challengeGhost(me, id);
    const end = fightOut(me).find((e) => e.type === 'ghostDuelEnded');
    expect(end).toMatchObject({ won: false });
    expect(me.link!.ghosts[0].losses).toBe(1);
  });

  it('a equipe do amigo luta com os golpes e IVs dela', () => {
    const { me, friend, id } = duel(50, 50);
    challengeGhost(me, id);
    advance(me, 2000, 1000);
    const enemy = me.battle.enemy!;
    expect(enemy.speciesId).toBe(friend.collection[0].speciesId);
    expect(enemy.ivs).toEqual(friend.collection[0].ivs);
    expect(enemy.moveset).toEqual(movesOf(friend.collection[0]));
  });

  it('não guarda a própria equipe e atualiza a do mesmo amigo', () => {
    const { me, friend } = duel(10, 10);
    expect(importGhost(me, ghostPacket(me, 5000), 6000).ok).toBe(false);
    friend.collection[0].level = 77;
    expect(importGhost(me, ghostPacket(friend, 9000), 9500).ok).toBe(true);
    expect(me.link!.ghosts).toHaveLength(1);
    expect(me.link!.ghosts[0].team[0].level).toBe(77);
  });
});

describe('Cabo Link: Troca Surpresa', () => {
  it('troca por um Pokémon de um personagem, até 5 por dia, e guarda o histórico', () => {
    const s = newGame(1, 0, 33);
    beatBosses(s, BALANCE.link.unlock);
    const mons = Array.from({ length: SURPRISE_PER_DAY + 1 }, () => give(s, 'rattata', 30));
    const total = s.collection.length;
    const r = surpriseTrade(s, mons[0].uid, 0)!;
    expect(r).not.toBeNull();
    expect(s.collection.length).toBe(total); // saiu um, chegou um
    expect(s.collection.some((p) => p.uid === mons[0].uid)).toBe(false);
    const got = s.collection.at(-1)!;
    expect(got.ot).toBe(r.from);
    expect(Math.abs(got.level - 30)).toBeLessThanOrEqual(5);
    expect(getSpecies(r.got).legendary).toBeFalsy();
    for (let i = 1; i < SURPRISE_PER_DAY; i++) surpriseTrade(s, mons[i].uid, 0);
    expect(surpriseLeft(s, 0)).toBe(0);
    expect(surpriseTrade(s, mons[SURPRISE_PER_DAY].uid, 0)).toBeNull();
    expect(s.link!.surprise!.log).toHaveLength(SURPRISE_PER_DAY);
    expect(surpriseLeft(s, 86_400_000 * 2)).toBe(SURPRISE_PER_DAY);
    // Favorito não vai.
    mons[SURPRISE_PER_DAY].favorite = true;
    expect(surpriseTrade(s, mons[SURPRISE_PER_DAY].uid, 86_400_000 * 2)).toBeNull();
  });
});

describe('próximos passos', () => {
  it('sugere o chefe com a chance estimada e uma ação direta', () => {
    const s = newGame(1, 0, 1);
    const route = 'floresta-viridian';
    beatBosses(s, 'rota-1');
    s.routes[route].unlocked = true;
    s.routes[route].kills = 9999;
    s.currentRouteId = route;
    s.battle = freshBattle(route);
    const boss = ROUTES.find((r) => r.id === route)!.boss!;
    const steps = nextSteps(s, 0);
    const step = steps.find((x) => x.id === 'boss')!;
    expect(step.action).toEqual({ kind: 'boss', routeId: route });
    expect(teamOdds(s, resolveBossTeam(s, boss)).odds).toBeDefined();
  });

  it('chefe forte demais tem chance baixa; o fraco, alta', () => {
    const s = newGame(1, 0, 1);
    s.collection[0].level = 100;
    expect(teamOdds(s, [{ speciesId: speciesId('magikarp'), level: 2 }]).odds).toBe('alta');
    s.collection[0].level = 2;
    expect(teamOdds(s, [{ speciesId: speciesId('mewtwo'), level: 100 }]).win).toBe(false);
  });

  it('lista missões prontas e vem ordenada por urgência', () => {
    const s = newGame(1, 0, 1);
    s.missions.daily = [{ id: 'm', kind: 'kills', target: 1, progress: 1, claimed: false, reward: {} }];
    const steps = nextSteps(s, 0);
    expect(steps.some((x) => x.id === 'missions')).toBe(true);
    for (let i = 1; i < steps.length; i++)
      expect(steps[i - 1].priority).toBeGreaterThanOrEqual(steps[i].priority);
  });
});

describe('save das ferramentas', () => {
  it('equipes, Cabo Link e TMs voltam do save; uids que sumiram saem das equipes', () => {
    const s = newGame(1, 0, 1);
    beatBosses(s, BALANCE.link.unlock);
    const a = give(s, 'pidgey');
    s.battleTeam = [a.uid];
    savePreset(s, 'X');
    s.collection = s.collection.filter((p) => p.uid !== a.uid);
    s.battleTeam = [];
    const back = parseSave(serialize(s, 0));
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.file.state.presets![0].reserves).toEqual([]);
      expect(back.file.state.presets![0].name).toBe('X');
    }
  });
});
