// Mecânicas da 0.5: habilidades, itens seguráveis, amizade, EVs e treino, raides e revanches.

import { describe, expect, it } from 'vitest';
import {
  ABILITIES,
  BALANCE,
  DEPT_STORE_CATALOG,
  HELD_ITEMS,
  LEGENDARIES,
  LEGENDARY_REGION_UNLOCK,
  ROUTES,
  SPECIES,
  abilitiesOf,
  getAbility,
  getHeldItem,
  getSpecies,
} from '../game-data';
import { addToCollection } from './collection';
import { calcDamage, combatantOf, estimateDuel } from './combat';
import {
  activePokemon,
  canChallengeRaid,
  challengeLegendary,
  challengeRaid,
  challengeRematch,
  equipItem,
  freshBattle,
  giveAbilityCapsule,
  giveAbilityPatch,
  giveBottleCap,
  giveVitamin,
  newGame,
  step,
  unequipItem,
  type EnemyState,
  type GameEvent,
  type GameState,
} from './game';
import { addFriendship } from './friendship';
import { abilityOf, abilitySlotOf, addEvs, evTotal, evsOf, statsOf, type PokemonInstance } from './pokemon';
import { checkEvolution, levelEvolution } from './progression';
import { floorTeam } from './tower';
import { updateRaid } from './raids';
import { canRematch } from './rematch';
import { rngFrom, type Rng } from './rng';
import { parseSave, serialize } from './save';
import { startTraining, trainingTick, trainingRate } from './training';
import { calcStats } from './stats';

const IVS = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
const always = (v: number): Rng => ({ next: () => v });

function addMon(s: GameState, speciesId: number, level: number): PokemonInstance {
  return addToCollection(s, speciesId, level, { ...IVS }, false, 0, 'teste');
}

/** Coloca `enemy` em campo, pronto para lutar. */
function fight(s: GameState, enemy: Pick<EnemyState, 'speciesId' | 'level'> & Partial<EnemyState>): void {
  const maxHp = statsOf({ speciesId: enemy.speciesId, level: enemy.level, ivs: IVS }).hp;
  s.battle.enemy = {
    ivs: { ...IVS },
    shiny: false,
    hp: maxHp,
    maxHp,
    captureAttempted: false,
    ...enemy,
  };
  s.battle.phase = 'fighting';
  s.battle.playerTimerMs = 1e9;
  s.battle.enemyTimerMs = 0;
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

describe('habilidades', () => {
  it('toda espécie tem habilidades que existem', () => {
    const known = new Set(ABILITIES.map((a) => a.id));
    for (const sp of SPECIES) {
      const list = abilitiesOf(sp.id);
      expect(list[0], sp.slug).toBeTruthy();
      for (const id of list) if (id) expect(known.has(id), `${sp.slug}: ${id}`).toBe(true);
    }
  });

  it('as evoluções herdam as habilidades da linha', () => {
    expect(abilitiesOf(6)).toEqual(abilitiesOf(4));
    expect(getAbility(abilitiesOf(4)[0]!).id).toBe('blaze');
  });

  it('o sorteio é estável e a Cápsula/Patch trocam de habilidade', () => {
    const s = newGame(1, 0, 1);
    const p = addMon(s, 183, 20); // Marill: thick-fat / huge-power / sap-sipper
    const first = abilitySlotOf(p);
    expect(abilitySlotOf(p)).toBe(first);
    s.items['ability-capsule'] = 2;
    s.items['ability-patch'] = 1;
    p.abilitySlot = 0;
    expect(giveAbilityCapsule(s, p.uid)).toBe(true);
    expect(abilityOf(p).id).toBe('huge-power');
    expect(giveAbilityPatch(s, p.uid)).toBe(true);
    expect(abilityOf(p).id).toBe('sap-sipper');
    // A oculta não aceita outro Patch; a Cápsula a leva de volta à primeira.
    expect(giveAbilityPatch(s, p.uid)).toBe(false);
    expect(giveAbilityCapsule(s, p.uid)).toBe(true);
    expect(abilityOf(p).id).toBe('thick-fat');
  });

  it('Levitação anula golpes de Terra e Força Descomunal aumenta o Ataque', () => {
    const attacker = combatantOf({ speciesId: 74, level: 30, ivs: IVS, moveset: ['earthquake'] });
    const gastly = combatantOf({ speciesId: 92, level: 30, ivs: IVS });
    expect(gastly.ability?.id).toBe('levitate');
    expect(calcDamage(attacker, gastly, 'earthquake', always(0), 1).damage).toBe(0);

    const base = calcStats(getSpecies(183), 30, IVS);
    const marill = combatantOf({ speciesId: 183, level: 30, ivs: IVS, abilitySlot: 1 });
    expect(marill.ability?.id).toBe('huge-power');
    expect(marill.stats.atk).toBe(Math.round(base.atk * 1.6));
  });

  it('Absorção de Água cura em vez de causar dano', () => {
    const s = newGame(1, 0, 3);
    const mon = activePokemon(s);
    mon.level = 40;
    mon.moveset = ['water-gun'];
    // Lapras (131): water-absorb no 1º slot.
    fight(s, { speciesId: 131, level: 40, hp: 10, abilitySlot: 0 });
    const enemy = s.battle.enemy!;
    enemy.playerSupportUsed = [mon.uid]; // o golpe de apoio já foi: aqui interessa o ataque
    s.battle.playerTimerMs = 0;
    s.battle.enemyTimerMs = 1e9;
    const events = run(s, 3);
    expect(events.some((e) => e.type === 'effect' && e.kind === 'absorb')).toBe(true);
    expect(enemy.hp).toBeGreaterThan(10);
  });

  it('Robustez e a Faixa Foco seguram um golpe fatal uma vez por luta', () => {
    const s = newGame(1, 0, 4);
    const mon = activePokemon(s);
    mon.level = 5;
    mon.currentHp = statsOf(mon).hp;
    mon.held = 'focus-sash';
    fight(s, { speciesId: 150, level: 100, boost: 1.5 });
    const events = run(s, 2);
    expect(events.some((e) => e.type === 'effect' && e.kind === 'sash')).toBe(true);
    expect(mon.currentHp).toBe(1);
    expect(mon.held).toBeUndefined();
  });
});

describe('itens seguráveis', () => {
  it('equipar tira da Mochila e remover devolve', () => {
    const s = newGame(1, 0, 1);
    const mon = activePokemon(s);
    s.items.leftovers = 1;
    s.items['life-orb'] = 1;
    expect(equipItem(s, mon.uid, 'leftovers')).toBe(true);
    expect(s.items.leftovers).toBe(0);
    expect(equipItem(s, mon.uid, 'life-orb')).toBe(true);
    expect(s.items.leftovers).toBe(1);
    expect(unequipItem(s, mon.uid)).toBe(true);
    expect(s.items['life-orb']).toBe(1);
    expect(equipItem(s, mon.uid, 'poke-ball')).toBe(false);
  });

  it('Faixa Escolha, Orbe da Vida e itens de tipo aumentam o dano', () => {
    const attacker = { speciesId: 4, level: 30, ivs: IVS, moveset: ['ember'] };
    const target = combatantOf({ speciesId: 1, level: 30, ivs: IVS });
    const dmg = (held?: string) =>
      calcDamage(combatantOf({ ...attacker, held }), target, 'ember', always(0.5), 1).damage;
    expect(dmg('charcoal')).toBeGreaterThan(dmg());
    expect(dmg('life-orb')).toBeGreaterThan(dmg('charcoal'));
    const band = combatantOf({ ...attacker, held: 'choice-band' });
    expect(band.stats.atk).toBeGreaterThan(combatantOf(attacker).stats.atk);
  });

  it('Sobras recuperam HP a cada ação e a berry cura com HP baixo', () => {
    const s = newGame(1, 0, 6);
    const mon = activePokemon(s);
    mon.level = 50;
    mon.held = 'leftovers';
    const max = statsOf(mon).hp;
    mon.currentHp = Math.floor(max / 2);
    fight(s, { speciesId: 16, level: 3, hp: 9999, maxHp: 9999 });
    s.battle.playerTimerMs = 0;
    s.battle.enemyTimerMs = 1e9;
    run(s, 1);
    expect(mon.currentHp).toBeGreaterThan(Math.floor(max / 2));

    mon.held = 'oran-berry';
    s.items['oran-berry'] = 0;
    mon.currentHp = Math.floor(max * 0.4);
    s.battle.playerUsed = [];
    s.battle.enemyTimerMs = 0;
    s.battle.playerTimerMs = 1e9;
    fight(s, { speciesId: 16, level: 3, hp: 9999, maxHp: 9999 });
    const before = mon.currentHp;
    const events = run(s, 2);
    // O golpe fraco de um Pidgey Nv3 tira pouco; a berry recupera 25% do HP e some.
    expect(events.some((e) => e.type === 'effect' && e.kind === 'berry')).toBe(true);
    expect(mon.currentHp).toBeGreaterThan(before);
    expect(mon.held).toBeUndefined();
  });

  it('o catálogo de itens seguráveis é coerente', () => {
    for (const h of HELD_ITEMS) {
      expect(getHeldItem(h.id)).toBe(h);
      expect(h.sprite || h.icon, h.id).toBeTruthy();
    }
    const ids = DEPT_STORE_CATALOG.map((e) => e.id);
    expect(ids).toContain('life-orb');
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('amizade e evoluções por condição', () => {
  const evolveAt = (speciesId: number, friendship: number, period: 'day' | 'night' = 'day') => {
    const s = newGame(1, 0, 1);
    const p = addMon(s, speciesId, 10);
    p.friendship = friendship;
    return checkEvolution(p, true, period).evolvedTo;
  };

  it('só evolui por amizade ao chegar no valor exigido', () => {
    expect(evolveAt(172, 219)).toBeUndefined(); // Pichu
    expect(evolveAt(172, BALANCE.friendship.evolve)).toBe(25);
    expect(evolveAt(42, 255)).toBe(169); // Golbat → Crobat
  });

  it('Eevee escolhe Espeon de dia e Umbreon à noite', () => {
    expect(evolveAt(133, 255, 'day')).toBe(196);
    expect(evolveAt(133, 255, 'night')).toBe(197);
  });

  it('o Sino Calmante dobra a amizade e a Pedra Eterna segurada impede evoluir', () => {
    const s = newGame(1, 0, 1);
    const p = addMon(s, 172, 10);
    p.friendship = 100;
    addFriendship(p, 10);
    expect(p.friendship).toBe(110);
    p.held = 'soothe-bell';
    addFriendship(p, 10);
    expect(p.friendship).toBe(130);
    p.friendship = 255;
    p.held = 'everstone';
    expect(checkEvolution(p, true, 'day')).toEqual({});
    expect(p.speciesId).toBe(172);
  });

  it('Tyrogue evolui conforme Ataque e Defesa; Wurmple, pelo indivíduo', () => {
    const s = newGame(1, 0, 1);
    const t = addMon(s, 236, 20);
    t.nature = undefined;
    t.ivs = { ...IVS, atk: 31, def: 0 };
    expect(levelEvolution(t)?.to).toBe(106);
    t.ivs = { ...IVS, atk: 0, def: 31 };
    expect(levelEvolution(t)?.to).toBe(107);
    t.ivs = { ...IVS };
    expect(levelEvolution(t)?.to).toBe(237);
    const w = addMon(s, 265, 10);
    expect(levelEvolution(w)?.to).toBe(w.uid % 2 === 0 ? 266 : 268);
  });

  it('vitórias aumentam a amizade do ativo', () => {
    const s = newGame(1, 0, 8);
    const mon = activePokemon(s);
    mon.friendship = 70;
    mon.level = 100;
    for (let i = 0; i < 40; i++) {
      fight(s, { speciesId: 16, level: 2, hp: 1, maxHp: 1 });
      s.battle.playerTimerMs = 0;
      s.battle.enemyTimerMs = 1e9;
      run(s, 3, (e) => e.type === 'enemyFainted');
    }
    expect(mon.friendship).toBeGreaterThan(70);
  });
});

describe('EVs, vitaminas e treino', () => {
  it('EVs respeitam 252 por atributo e 510 no total e aumentam o atributo', () => {
    const s = newGame(1, 0, 1);
    const p = addMon(s, 25, 50);
    const before = statsOf(p).atk;
    expect(addEvs(p, 'atk', 300)).toBe(252);
    expect(statsOf(p).atk).toBe(calcStats(getSpecies(25), 50, IVS, p.nature, { atk: 252 }).atk);
    expect(statsOf(p).atk).toBeGreaterThan(before + 20);
    expect(addEvs(p, 'spe', 300)).toBe(252);
    expect(addEvs(p, 'hp', 300)).toBe(6);
    expect(evTotal(p)).toBe(510);
    expect(evsOf(p).hp).toBe(6);
  });

  it('vitaminas rendem +10 EVs até o teto de 100 e a Tampa de Garrafa pede Nv. 50', () => {
    const s = newGame(1, 0, 1);
    const p = addMon(s, 25, 30);
    s.items.protein = 20;
    for (let i = 0; i < 10; i++) expect(giveVitamin(s, p.uid, 'protein')).toBe(true);
    expect(evsOf(p).atk).toBe(100);
    expect(giveVitamin(s, p.uid, 'protein')).toBe(false);
    expect(s.items.protein).toBe(10);

    s.items['bottle-cap'] = 2;
    expect(giveBottleCap(s, p.uid, 'spe')).toBe(false);
    p.level = 60;
    expect(giveBottleCap(s, p.uid, 'spe')).toBe(true);
    expect(p.ivs.spe).toBe(31);
    expect(giveBottleCap(s, p.uid, 'spe')).toBe(false);
  });

  it('o Campo de Treino acumula EVs com o tempo (e a Braçadeira Macho dobra)', () => {
    const s = newGame(1, 0, 1);
    s.routes['floresta-viridian'].bossDefeated = true;
    const p = addMon(s, 25, 20);
    expect(startTraining(s, p.uid, 'atk', 0)).toBe(true);
    expect(startTraining(s, p.uid, 'atk', 0)).toBe(false);
    const events: GameEvent[] = [];
    trainingTick(s, 2 * 3_600_000, events);
    expect(evsOf(p).atk).toBe(2 * BALANCE.training.evsPerHour);

    p.held = 'macho-brace';
    expect(trainingRate(p)).toBe(2 * BALANCE.training.evsPerHour);
    trainingTick(s, 3 * 3_600_000, events);
    expect(evsOf(p).atk).toBe(4 * BALANCE.training.evsPerHour);
  });
});

describe('raides e revanches', () => {
  function unlockRaids(s: GameState): void {
    s.routes['rota-7-8-celadon'].unlocked = true;
    s.routes['rota-7-8-celadon'].bossDefeated = true;
  }

  it('a raide aparece, é enfrentada com HP gigante e pode ser vencida', () => {
    const s = newGame(1, 0, 11);
    expect(canChallengeRaid(s)).toBe(false);
    unlockRaids(s);
    const rng = rngFrom(s);
    const events: GameEvent[] = [];
    updateRaid(s, 1000, rng, events);
    s.nextRaidAt = 1;
    updateRaid(s, 5000, rng, events);
    expect(s.raid).not.toBeNull();
    expect(events.some((e) => e.type === 'raidAppeared')).toBe(true);

    const coins = s.coins;
    expect(challengeRaid(s)).toBe(true);
    expect(s.battle.kind).toBe('raid');
    run(s, 40);
    const enemy = s.battle.enemy!;
    expect(enemy).toBeTruthy();
    expect(enemy.maxHp).toBeGreaterThan(
      statsOf({ speciesId: enemy.speciesId, level: enemy.level, ivs: enemy.ivs }).hp * 3,
    );
    expect(enemy.held).toBeTruthy();

    activePokemon(s).level = 100;
    enemy.hp = 1;
    s.battle.playerTimerMs = 0;
    const done = run(s, 200, (e) => e.type === 'raidDefeated');
    expect(done.some((e) => e.type === 'raidDefeated')).toBe(true);
    expect(s.raid).toBeNull();
    expect(s.coins).toBeGreaterThan(coins);
  });

  it('acabar o tempo faz a raide escapar', () => {
    const s = newGame(1, 0, 12);
    unlockRaids(s);
    s.raid = { speciesId: 6, routeId: 'rota-1', level: 20, until: 1e12 };
    activePokemon(s).level = 100;
    expect(challengeRaid(s)).toBe(true);
    run(s, 30);
    s.battle.playerTimerMs = 1e9;
    s.battle.enemyTimerMs = 1e9;
    s.battle.raidMs = 50;
    const events = run(s, 3);
    expect(events.some((e) => e.type === 'raidFailed')).toBe(true);
    expect(s.battle.kind).toBe('wild');
    expect(s.raid).not.toBeNull();
  });

  it('revanche: só contra chefes vencidos, mais forte e com itens', () => {
    const s = newGame(1, 0, 13);
    const route = ROUTES.find((r) => r.boss)!;
    expect(canRematch(s, route.id, 0)).toBe(false);
    expect(challengeRematch(s, route.id, 0)).toBe(false);
    s.routes[route.id].unlocked = true;
    s.routes[route.id].bossDefeated = true;
    expect(canRematch(s, route.id, 0)).toBe(true);
    expect(challengeRematch(s, route.id, 0)).toBe(true);
    expect(s.battle.rematch).toBe(true);
    const team = s.battle.team;
    const first = route.boss!.team[0];
    expect(team[0].level).toBe(Math.min(BALANCE.maxLevel, first.level + BALANCE.rematch.levelBonus));
    expect(team.some((m) => m.held)).toBe(true);
  });
});

describe('save 0.5', () => {
  it('um save do formato 5 é migrado com os campos novos', () => {
    const s = newGame(1, 0, 1);
    const file = JSON.parse(serialize(s, 1000));
    file.meta.formatVersion = 5;
    for (const k of ['training', 'raid', 'nextRaidAt', 'rematchAt']) delete file.state[k];
    file.state.collection[0].held = 'item-que-nao-existe';
    const parsed = parseSave(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const st = parsed.file.state;
    expect(st.training.slots).toEqual([]);
    expect(st.raid).toBeNull();
    expect(st.rematchAt).toEqual({});
    expect(st.collection[0].held).toBeUndefined();
    expect(freshBattle('rota-1').kind).toBe('wild');
  });

  it('todo chefe dá moedas (mesmo os que também dão itens ou MT)', () => {
    for (const r of ROUTES) if (r.boss) expect(r.boss.reward.coins, r.id).toBeGreaterThan(0);
  });

  it('um save com o dinheiro corrompido (NaN gravado como null) é recuperado', () => {
    const s = newGame(1, 0, 1);
    s.routes['floresta-viridian'].bossDefeated = true;
    s.coins = NaN;
    s.stats.coinsEarned = NaN;
    const parsed = parseSave(serialize(s, 1000));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.file.state.coins).toBe(
      ROUTES.find((r) => r.id === 'floresta-viridian')!.boss!.reward.coins,
    );
    expect(parsed.file.state.stats.coinsEarned).toBe(parsed.file.state.coins);
  });
});

describe('itens na Torre e em lendários', () => {
  it('a Torre dá item de elite ao ás e a todos a partir do andar 10', () => {
    const early = floorTeam(3, always(0.3));
    expect(early.map((m) => !!m.held)).toEqual([false, false, true]);
    const late = floorTeam(12, always(0.3));
    expect(late.every((m) => !!getHeldItem(m.held))).toBe(true);
  });

  it('o lendário entra em campo com item e habilidade', () => {
    const s = newGame(1, 0, 3);
    const def = LEGENDARIES[0];
    s.legends.cooldowns = {};
    s.routes[ROUTES[0].id].unlocked = true;
    Object.values(LEGENDARY_REGION_UNLOCK).forEach((r) => {
      s.routes[r].bossDefeated = true;
      s.routes[r].unlocked = true;
    });
    expect(challengeLegendary(s, def.speciesId, 0)).toBe(true);
    expect(getHeldItem(s.battle.team[0].held)).toBeTruthy();
    run(s, 30);
    expect(s.battle.enemy?.held).toBe(s.battle.team[0].held);
  });
});

describe('progresso offline com habilidades e itens', () => {
  const duel = (held?: string, abilitySlot?: 0 | 1 | 2) => {
    const player = combatantOf({ speciesId: 143, level: 40, ivs: IVS, held, abilitySlot });
    const foe = combatantOf({ speciesId: 6, level: 45, ivs: IVS });
    return estimateDuel(player, player.stats.hp, foe);
  };

  it('Sobras e berries melhoram o duelo estimado; sem itens, nada muda', () => {
    const base = duel();
    expect(duel('leftovers').hpLostFraction).toBeLessThanOrEqual(base.hpLostFraction);
    const weak = combatantOf({ speciesId: 16, level: 20, ivs: IVS });
    const strong = combatantOf({ speciesId: 6, level: 30, ivs: IVS });
    const hp = weak.stats.hp;
    const without = estimateDuel(weak, hp, strong);
    const withBerry = estimateDuel({ ...weak, held: getHeldItem('sitrus-berry') }, hp, strong);
    expect(withBerry.durationMs).toBeGreaterThanOrEqual(without.durationMs);
    expect(without.win).toBe(false);
  });

  it('Pele Áspera e Capacete Pedregoso ferem quem ataca de perto', () => {
    const player = combatantOf({ speciesId: 74, level: 30, ivs: IVS });
    const foe = combatantOf({ speciesId: 112, level: 34, ivs: IVS, moveset: ['tackle'] });
    const plain = estimateDuel({ ...player, ability: undefined }, player.stats.hp, foe);
    const spiky = estimateDuel(
      { ...player, ability: getAbility('rough-skin'), held: getHeldItem('rocky-helmet') },
      player.stats.hp,
      foe,
    );
    expect(spiky.durationMs).toBeLessThan(plain.durationMs);
  });
});
