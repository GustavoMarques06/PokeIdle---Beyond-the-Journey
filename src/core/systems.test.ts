// Sistemas da 0.6: torneio, acompanhante, Safari, árvores de berry, diário de pesquisa, formas,
// histórico por Pokémon/MVP e os climas novos.

import { describe, expect, it } from 'vitest';
import {
  BALANCE,
  FORM_SETS,
  ROUTES,
  SAFARI_ENCOUNTERS,
  SAFARI_GUIDE,
  SAFARI_PATHS,
  SAFARI_ZONES,
  formSprite,
  getRoute,
  speciesId,
} from '../game-data';
import { addToCollection } from './collection';
import { companionTick, setCompanion } from './companion';
import { addResearch, researchBonus, researchComplete, tasksDone } from './dexresearch';
import { environmentMoveBoost, routeWeather, weatherAt, type Weather } from './env';
import { castformForm, rollForm, seasonAt } from './forms';
import { activePokemon, freshBattle, newGame, step, throwBall, type GameEvent, type GameState } from './game';
import { checkAchievements } from './meta';
import { recordOf, weekOf, weeklyMvp } from './records';
import { rngFrom, type Rng } from './rng';
import {
  buySafari,
  claimSafariGuide,
  guardTip,
  knowsFavorite,
  leaveSafari,
  missingMegaStones,
  outbreakOf,
  safariAct,
  safariCatchChance,
  safariFleeChance,
  safariProgress,
  safariRequests,
  safariShopBlocked,
  safariWalk,
  sizeMultiplier,
  startSafari,
  startSafariGuide,
  zoneSpecies,
} from './safari';
import { updateTimers } from './timers';
import { parseSave, serialize } from './save';
import { harvestTree, treeBerry, treeReady } from './berrytrees';
import { canPlayTournament, playTournament, tournamentLost, tournamentWon } from './tournament';

const always = (v: number): Rng => ({ next: () => v });
const DAY = 24 * 3_600_000;

function clearAll(s: GameState, upTo?: string): void {
  for (const r of ROUTES) {
    s.routes[r.id].unlocked = true;
    s.routes[r.id].bossDefeated = !!r.boss;
    s.routes[r.id].kills = r.killsRequired;
    if (r.id === upTo) break;
  }
}

describe('climas novos', () => {
  it('neblina e granizo aparecem e mudam o dano dos tipos', () => {
    const seen = new Set<string>();
    for (let slot = 0; slot < 2000; slot++) seen.add(weatherAt(slot * BALANCE.weather.slotHours * 3_600_000));
    expect(seen).toEqual(new Set(['clear', 'sun', 'rain', 'sand', 'fog', 'hail']));
    expect(environmentMoveBoost('hail', 'day').ice).toBe(BALANCE.weather.hailBoost);
    expect(environmentMoveBoost('fog', 'day').ghost).toBe(BALANCE.weather.fogBoost);
  });

  it('nos campos de neve neva, salvo com sol, névoa ou noite limpa', () => {
    const snow = ROUTES.find((r) => r.scene === 'snowfield')!;
    const meadow = ROUTES.find((r) => r.scene === 'meadow')!;
    const at = (weather: Weather) => routeWeather(snow, { period: 'day', weather });
    expect([at('clear'), at('rain'), at('sand'), at('hail')]).toEqual(['hail', 'hail', 'hail', 'hail']);
    expect([at('sun'), at('fog')]).toEqual(['sun', 'fog']);
    expect(routeWeather(snow, { period: 'night', weather: 'clear' })).toBe('clear'); // a aurora aparece
    expect(routeWeather(snow, { period: 'night', weather: 'rain' })).toBe('hail');
    expect(routeWeather(meadow, { period: 'day', weather: 'clear' })).toBe('clear');
  });
});

describe('formas', () => {
  it('Unown sorteia letras, Deerling segue a estação e Castform o clima', () => {
    expect(rollForm(201, always(0), 0)).toBe('a');
    expect(rollForm(201, always(0.999), 0)).toBe('question');
    const july = new Date(2026, 6, 10).getTime();
    expect(seasonAt(july)).toBe('autumn'); // julho = 6 → 6 % 4 = 2
    expect(rollForm(585, always(0.5), july)).toBe('autumn');
    expect(castformForm('hail')).toBe('snowy');
    expect(rollForm(25, always(0.5), 0)).toBeUndefined();
  });

  it('as formas com sprite próprio apontam para arquivos baixados', () => {
    for (const set of FORM_SETS) {
      for (const f of set.forms.slice(1)) {
        const path = formSprite(set.speciesId, f, 'front');
        if (set.rule === 'pattern') expect(path).toBeUndefined();
        else expect(path).toBe(`sprites/pokemon/forms/front/${set.speciesId}-${f}.gif`);
      }
    }
  });

  it('capturar um Unown guarda a letra e registra a forma', () => {
    const s = newGame(1, 0, 3);
    clearAll(s, 'rota-1');
    s.battle.enemy = {
      speciesId: 201,
      level: 5,
      ivs: { hp: 1, atk: 1, def: 1, spAtk: 1, spDef: 1, spe: 1 },
      shiny: false,
      hp: 1,
      maxHp: 20,
      captureAttempted: false,
      form: 'k',
    };
    s.battle.phase = 'fighting';
    s.items['master-ball'] = 1;
    const events = throwBall(s, 'master-ball', 0);
    const caught = s.collection.find((p) => p.speciesId === 201)!;
    expect(caught.form).toBe('k');
    expect(s.forms[201]).toEqual(['k']);
    expect(events.some((e) => e.type === 'captured')).toBe(true);
  });
});

describe('jogo do Safari', () => {
  it('cobra a entrada, isca e pedra mudam as chances e a visita acaba sem bolas', () => {
    const s = newGame(1, 0, 5);
    expect(startSafari(s, 0)).toBe(false); // não liberado
    clearAll(s, 'zona-safari');
    s.coins = BALANCE.safari.fee;
    expect(startSafari(s, 0)).toBe(true);
    expect(s.coins).toBe(0);
    // Começa escolhendo o caminho: andar gasta passos e traz um encontro.
    expect(s.safari!.enemy).toBeNull();
    const steps = s.safari!.steps!;
    safariWalk(s, 'grass', 0);
    expect(s.safari!.steps).toBe(steps - SAFARI_PATHS.grass.steps);
    const e = s.safari!.enemy!;
    const catchBase = safariCatchChance(s, e);
    const fleeBase = safariFleeChance(e);
    e.mood = 'angry';
    expect(safariCatchChance(s, e)).toBeGreaterThan(catchBase);
    expect(safariFleeChance(e)).toBeGreaterThan(fleeBase);
    e.mood = 'eating';
    expect(safariCatchChance(s, e)).toBeLessThan(catchBase);
    expect(safariFleeChance(e)).toBeLessThan(fleeBase);
    e.happy = true; // Pokébloco ou berry favorita: comer não atrapalha
    expect(safariCatchChance(s, e)).toBeGreaterThan(catchBase);
    e.mood = 'watching';
    e.happy = false;
    const events: GameEvent[] = [];
    for (let i = 0; i < 400 && s.safari; i++) {
      if (!s.safari.enemy) events.push(...safariWalk(s, 'grass', 0));
      else events.push(...safariAct(s, 'ball', 0));
    }
    expect(s.safari).toBeNull();
    expect(events.some((ev) => ev.type === 'safariEnded')).toBe(true);
    const caught = events.filter((ev) => ev.type === 'captured').length;
    expect(s.stats.safariCaptures).toBe(caught);
    const ids = new Set(SAFARI_ENCOUNTERS.map(([slug]) => speciesId(slug)));
    for (const p of s.collection.slice(1)) expect(ids.has(p.speciesId)).toBe(true);
    // Pontos de Safari e Pokédex da zona.
    expect(safariProgress(s).points).toBeGreaterThan(0);
    expect((safariProgress(s).zoneCaught.plains ?? []).length).toBeGreaterThan(0);
  });

  it('foto vale pontos uma vez, a loja usa os pontos e as zonas abrem com o progresso', () => {
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    s.coins = BALANCE.safari.fee * 2;
    expect(startSafari(s, 0, 'marsh')).toBe(false); // Grande Pântano ainda fechado
    expect(startSafari(s, 0, 'plains')).toBe(true);
    safariWalk(s, 'tall', 0);
    const before = safariProgress(s).points;
    safariAct(s, 'photo', 0);
    const after = safariProgress(s).points;
    expect(after).toBeGreaterThan(before);
    safariAct(s, 'photo', 0);
    expect(safariProgress(s).points).toBe(after);
    safariProgress(s).points = 1000;
    expect(buySafari(s, 'good-rod')).toBe(true);
    expect(buySafari(s, 'good-rod')).toBe(false); // só uma
    expect(buySafari(s, 'mud')).toBe(true);
    expect(s.items['safari-mud']).toBe(5);
    expect(outbreakOf(s, 0)).toBeDefined();
    expect(safariRequests(s, 0)).toHaveLength(3);
  });

  it('as zonas de Unova e Kalos existem, com espécies e áreas de verdade', () => {
    for (const z of SAFARI_ZONES) {
      expect(getRoute(z.unlock)).toBeDefined();
      expect(zoneSpecies(z).every((id) => id > 0)).toBe(true);
    }
    expect(SAFARI_ZONES.map((z) => z.id)).toEqual(expect.arrayContaining(['pinwheel', 'flowers']));
  });

  it('o Guia do Safari volta com 1 a 3 capturas, mesmo com o jogo fechado', () => {
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    s.coins = SAFARI_GUIDE.fee;
    expect(startSafariGuide(s, 'marsh', 0)).toBe(false); // zona fechada
    expect(startSafariGuide(s, 'plains', 0)).toBe(true);
    expect(s.coins).toBe(0);
    expect(startSafariGuide(s, 'plains', 0)).toBe(false); // um por vez
    const done = SAFARI_GUIDE.hours * 3_600_000;
    expect(claimSafariGuide(s, done - 1)).toEqual([]);
    // O aviso sai uma vez só, pelos cronômetros.
    expect(updateTimers(s, done).some((e) => e.type === 'safariGuideReady')).toBe(true);
    expect(updateTimers(s, done + 1000).some((e) => e.type === 'safariGuideReady')).toBe(false);
    const before = s.collection.length;
    const caught = claimSafariGuide(s, done);
    expect(caught.length).toBeGreaterThanOrEqual(1);
    expect(caught.length).toBeLessThanOrEqual(3);
    expect(s.collection.length).toBe(before + caught.length);
    expect(safariProgress(s).guide).toBeUndefined();
    expect(safariProgress(s).points).toBeGreaterThan(0);
    expect(safariProgress(s).biggest).toBeDefined();
  });

  it('loja rara: Mega Stone que falta e ovo só com ninho livre', () => {
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    safariProgress(s).points = 10_000;
    const missing = missingMegaStones(s).length;
    expect(buySafari(s, 'mega')).toBe(true);
    expect(missingMegaStones(s).length).toBe(missing - 1);
    // Sem a Creche liberada, o ovo não sai (e os pontos ficam).
    if (safariShopBlocked(s, 'egg')) {
      const pts = safariProgress(s).points;
      expect(buySafari(s, 'egg')).toBe(false);
      expect(safariProgress(s).points).toBe(pts);
    }
    clearAll(s);
    const eggs = s.eggs.length;
    expect(buySafari(s, 'egg')).toBe(true);
    expect(s.eggs.length).toBe(eggs + 1);
  });

  it('tamanho vem dos IVs (0,8× a 1,2×) e a dica do Guarda revela a berry favorita', () => {
    const ivs = { hp: 0, atk: 0, def: 0, spAtk: 0, spDef: 0, spe: 0 };
    expect(sizeMultiplier(ivs)).toBeCloseTo(0.8);
    expect(sizeMultiplier({ ...ivs, hp: 31, atk: 31 })).toBeCloseTo(1.2);
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    const tip = guardTip(s, 0)!;
    expect(tip).toBeDefined();
    expect(knowsFavorite(s, tip.speciesId, 0)).toBe(true);
  });

  it('a fuga e a berry jogada vêm no evento (shiny, forma e qual berry)', () => {
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    s.coins = BALANCE.safari.fee;
    startSafari(s, 0);
    safariWalk(s, 'grass', 0);
    s.safari!.enemy!.shiny = true;
    s.items['pecha-berry'] = 1;
    const ev = safariAct(s, 'berry', 0, 'pecha-berry').find((e) => e.type === 'safariResult');
    expect(ev).toMatchObject({ shiny: true, item: 'pecha-berry' });
  });

  it('ação que não acontece (foto repetida, item que acabou) não gasta o humor', () => {
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    s.coins = BALANCE.safari.fee;
    startSafari(s, 0);
    safariWalk(s, 'grass', 0);
    const e = s.safari!.enemy!;
    e.photographed = true;
    e.mood = 'eating';
    e.moodTurns = 3;
    s.items.pokeblock = 0;
    expect(safariAct(s, 'photo', 0)).toEqual([]);
    expect(safariAct(s, 'block', 0)).toEqual([]);
    expect(safariAct(s, 'berry', 0, 'pecha-berry')).toEqual([]);
    expect(e.moodTurns).toBe(3);
  });

  it('sair da visita encerra na hora', () => {
    const s = newGame(1, 0, 5);
    clearAll(s, 'zona-safari');
    s.coins = BALANCE.safari.fee;
    startSafari(s, 0);
    expect(leaveSafari(s).some((e) => e.type === 'safariEnded')).toBe(true);
    expect(s.safari).toBeNull();
  });
});

describe('árvores de berry', () => {
  it('só rotas ao ar livre têm árvore; colhe-se estando lá e ela demora a voltar', () => {
    expect(treeBerry('mt-moon')).toBeNull();
    expect(treeBerry('liga-lorelei')).toBeNull();
    const berry = treeBerry('rota-1')!;
    expect(berry).toBeTruthy();
    expect(treeBerry('rota-1')).toBe(berry); // sempre a mesma
    const s = newGame(1, 0, 2);
    const rng = rngFrom(s);
    const got = harvestTree(s, 1000, rng)!;
    expect(got.berry).toBe(berry);
    expect(s.items[berry]).toBe(got.qty);
    expect(treeReady(s, 'rota-1', 1000)).toBe(false);
    expect(harvestTree(s, 2000, rng)).toBeNull();
    expect(treeReady(s, 'rota-1', 1000 + BALANCE.wildBerries.regrowHours * 3_600_000)).toBe(true);
    expect(s.stats.wildHarvests).toBe(1);
  });
});

describe('acompanhante', () => {
  it('ganha amizade com o tempo e traz itens, com limite por vez', () => {
    const s = newGame(1, 0, 4);
    const p = s.collection[0];
    const before = p.friendship ?? BALANCE.friendship.start;
    const rng = rngFrom(s);
    setCompanion(s, p.uid, 0, rng);
    const events: GameEvent[] = [];
    companionTick(s, 60 * 60_000, rng, events);
    expect(p.friendship).toBe(before + 6);
    companionTick(s, 30 * DAY, rng, events);
    const finds = events.filter((e) => e.type === 'companionFound').length;
    expect(finds).toBeGreaterThan(0);
    expect(finds).toBeLessThanOrEqual(BALANCE.companion.maxFindsAtOnce + 1);
    setCompanion(s, null, 0, rng);
    expect(s.companion).toBeNull();
  });
});

describe('diário de pesquisa', () => {
  it('completa com 5 tarefas, dá pontos e bônus de captura', () => {
    const s = newGame(1, 0, 1);
    const id = 16; // Pidgey evolui: tem a tarefa "ver evoluir"
    const lab = s.research.points;
    addResearch(s, id, { caught: 5, defeated: 50 });
    expect(tasksDone(s, id)).toBe(4);
    expect(researchComplete(s, id)).toBe(false);
    const events: GameEvent[] = [];
    addResearch(s, id, { night: 1 }, events);
    expect(researchComplete(s, id)).toBe(true);
    expect(events).toEqual([{ type: 'researchComplete', speciesId: id }]);
    expect(s.research.points).toBe(lab + BALANCE.dexResearch.labPoints);
    expect(researchBonus(s, id).capture).toBeGreaterThan(1);
  });

  it('vencer na rota soma pesquisa, histórico e MVP', () => {
    const s = newGame(4, 0, 9);
    activePokemon(s).level = 50;
    const rng = rngFrom(s);
    const events: GameEvent[] = [];
    for (let i = 0; i < 2000 && s.stats.totalKills < 5; i++) step(s, BALANCE.tickMs, rng, 5 * DAY, events);
    const r = recordOf(activePokemon(s));
    expect(r.wins).toBe(s.stats.totalKills);
    expect(r.damage).toBeGreaterThan(0);
    const defeated = Object.values(s.dexResearch).reduce((sum, e) => sum + e.defeated, 0);
    expect(defeated).toBe(s.stats.totalKills);
    expect(weeklyMvp(s, 5 * DAY)).toEqual({ uid: activePokemon(s).uid, wins: s.stats.totalKills });
    expect(weeklyMvp(s, 5 * DAY + 7 * DAY)).toBeNull(); // outra semana
  });
});

describe('torneio semanal', () => {
  const NOW = 100 * 7 * DAY;

  function entered(): GameState {
    const s = newGame(1, NOW, 11);
    clearAll(s, 'rota-12-15');
    expect(canPlayTournament(s, NOW)).toBe(true);
    expect(playTournament(s, NOW)).toBe(true);
    return s;
  }

  it('monta a chave e luta contra chefes já vencidos', () => {
    const s = entered();
    expect(s.battle.kind).toBe('tournament');
    expect(s.tournament.bracket).toHaveLength(8);
    expect(s.tournament.season).toBe(weekOf(NOW));
    expect(s.battle.team.length).toBeGreaterThan(0);
  });

  it('melhor de três: duas vitórias passam de fase; três fases = campeão', () => {
    const s = entered();
    const events: GameEvent[] = [];
    let coins = s.coins;
    for (let round = 0; round < 3; round++) {
      tournamentWon(s, events);
      expect(s.tournament.round).toBe(round);
      tournamentWon(s, events);
      expect(s.coins - coins).toBe(BALANCE.tournament.coinsPerRound[round]);
      coins = s.coins;
    }
    expect(s.tournament.place).toBe('champion');
    expect(s.stats.tournamentTitles).toBe(1);
    expect(s.battle.kind).toBe('wild');
    expect(events.filter((e) => e.type === 'tournamentMatch')).toHaveLength(3);
    expect(canPlayTournament(s, NOW)).toBe(false); // um por semana
    expect(canPlayTournament(s, NOW + 7 * DAY)).toBe(true);
    expect(checkAchievements(s).some((e) => e.type === 'achievement' && e.id === 'tournament-1')).toBe(true);
  });

  it('duas derrotas eliminam; uma derrota só continua a partida', () => {
    const s = entered();
    const events: GameEvent[] = [];
    tournamentLost(s, events);
    expect(s.battle.kind).toBe('tournament');
    tournamentLost(s, events);
    expect(s.tournament.place).toBe('quarter');
    expect(s.battle.kind).toBe('wild');
    expect(s.tournament.history[0].place).toBe('quarter');
  });

  it('uma derrota em batalha de verdade conta para a partida', () => {
    const s = entered();
    activePokemon(s).level = 2;
    const rng = rngFrom(s);
    const events: GameEvent[] = [];
    for (let i = 0; i < 20000 && s.tournament.score[1] === 0; i++) step(s, BALANCE.tickMs, rng, NOW, events);
    expect(s.tournament.score[1]).toBe(1);
    expect(s.battle.kind).toBe('tournament');
  });
});

describe('save com os sistemas novos', () => {
  it('saves antigos ganham os campos e as formas da coleção entram no registro', () => {
    const s = newGame(1, 0, 1);
    const p = addToCollection(
      s,
      201,
      10,
      { hp: 1, atk: 1, def: 1, spAtk: 1, spDef: 1, spe: 1 },
      false,
      0,
      't',
    );
    p.form = 'z';
    const file = JSON.parse(serialize(s, 1000));
    for (const k of ['safari', 'berryTrees', 'tournament', 'companion', 'dexResearch', 'forms', 'mvp'])
      delete file.state[k];
    const parsed = parseSave(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const st = parsed.file.state;
    expect(st.forms[201]).toEqual(['z']);
    expect(st.tournament.history).toEqual([]);
    expect(st.safari).toBeNull();
    expect(st.mvp.wins).toEqual({});
    expect(freshBattle('rota-1').kind).toBe('wild');
  });
});
