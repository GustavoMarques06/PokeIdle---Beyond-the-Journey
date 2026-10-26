import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, BALANCE, PASSIVE, ROUTES } from '../game-data';
import { computeModifiers, masteryOf, passiveContributions, passiveSlotsUnlocked } from './bonuses';
import { activePokemon, advance, newGame, registerKills, setActive, type GameState } from './game';
import {
  addPassive,
  buyPrestige,
  buyResearch,
  canPrestige,
  canTransfer,
  checkAchievements,
  prestigePreview,
  prestigeReset,
  removePassive,
  surplusDuplicates,
  transferDuplicates,
  transferPokemon,
  trainerLevel,
} from './meta';
import { createPokemon } from './pokemon';
import { parseSave, serialize } from './save';

const IVS = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };

function give(state: GameState, speciesId: number, level: number) {
  const p = createPokemon(state.nextUid++, speciesId, level, IVS, false, 0, 'teste');
  state.collection.push(p);
  return p;
}

function clearAll(state: GameState) {
  for (const r of ROUTES) {
    state.routes[r.id].unlocked = true;
    state.routes[r.id].kills = r.killsRequired;
    state.routes[r.id].bossDefeated = !!r.boss;
  }
}

describe('equipe passiva', () => {
  it('vagas são liberadas pela progressão', () => {
    const s = newGame(4, 0, 1);
    expect(passiveSlotsUnlocked(s)).toBe(0);
    registerKills(s, 'rota-1', 1000, []);
    expect(passiveSlotsUnlocked(s)).toBe(1);
    clearAll(s);
    expect(passiveSlotsUnlocked(s)).toBe(4);
  });

  it('passivo de fogo aumenta o dano; água aumenta a cura', () => {
    const s = newGame(7, 0, 1);
    clearAll(s);
    const base = computeModifiers(s);
    const fire = give(s, 4, 20);
    const water = give(s, 120, 20);
    expect(addPassive(s, fire.uid)).toBe(true);
    expect(addPassive(s, water.uid)).toBe(true);
    const mods = computeModifiers(s);
    expect(mods.damage).toBeGreaterThan(base.damage);
    expect(mods.heal).toBeGreaterThan(base.heal);
    // Fogo vence planta: bônus de dano contra planta.
    expect(mods.typeDamage.grass).toBeGreaterThan(0);
  });

  it('empilhamento decrescente e espécie repetida não conta', () => {
    const s = newGame(7, 0, 1);
    clearAll(s);
    const a = give(s, 4, 20);
    const b = give(s, 4, 20);
    const c = give(s, 5, 20);
    for (const p of [a, b, c]) addPassive(s, p.uid);
    const list = passiveContributions(s);
    expect(list.filter((x) => x.duplicate)).toHaveLength(1);
    const [first, second] = list.filter((x) => !x.duplicate).sort((x, y) => y.effective - x.effective);
    expect(second.effective).toBeCloseTo(second.value * PASSIVE.stackFalloff);
    expect(first.effective).toBe(first.value);
  });

  it('respeita o teto por tipo de bônus', () => {
    const s = newGame(7, 0, 1);
    clearAll(s);
    for (const id of [4, 5, 6, 56]) addPassive(s, give(s, id, 100).uid);
    expect(computeModifiers(s).passive.damage).toBeLessThanOrEqual(PASSIVE.caps.damage);
  });

  it('não aceita o ativo como passivo, e promover um passivo troca de lugar', () => {
    const s = newGame(7, 0, 1);
    clearAll(s);
    expect(addPassive(s, s.activeUid)).toBe(false);
    const p = give(s, 4, 10);
    addPassive(s, p.uid);
    const oldActive = s.activeUid;
    setActive(s, p.uid);
    expect(s.passives).toEqual([oldActive]);
    removePassive(s, oldActive);
    expect(s.passives).toEqual([]);
  });

  it('passivos tornam o combate mensuravelmente melhor', () => {
    const run = (withPassives: boolean) => {
      const s = newGame(7, 0, 9);
      clearAll(s);
      s.currentRouteId = 'rota-3';
      s.battle.routeId = 'rota-3';
      activePokemon(s).level = 15;
      if (withPassives) for (const id of [4, 25, 74, 16]) addPassive(s, give(s, id, 30).uid);
      advance(s, 10 * 60_000, 0);
      return s.stats.totalKills;
    };
    expect(run(true)).toBeGreaterThan(run(false));
  });
});

describe('laboratório', () => {
  it('só transfere duplicatas fora da equipe', () => {
    const s = newGame(1, 0, 1);
    const dup = give(s, 1, 12);
    expect(canTransfer(s, s.activeUid)).toBe(false);
    expect(canTransfer(s, dup.uid)).toBe(true);
    const unique = give(s, 16, 5);
    expect(canTransfer(s, unique.uid)).toBe(false);
    const before = s.research.points;
    expect(transferPokemon(s, dup.uid)).toBe(2);
    expect(s.research.points).toBe(before + 2);
    expect(s.collection.some((p) => p.uid === dup.uid)).toBe(false);
  });

  it('transferir duplicatas mantém o melhor de cada espécie', () => {
    const s = newGame(1, 0, 1);
    give(s, 16, 3);
    const best = give(s, 16, 9);
    give(s, 16, 5);
    expect(surplusDuplicates(s)).toHaveLength(2);
    transferDuplicates(s);
    expect(s.collection.filter((p) => p.speciesId === 16).map((p) => p.uid)).toEqual([best.uid]);
  });

  it('pesquisa custa pontos e aumenta os bônus', () => {
    const s = newGame(1, 0, 1);
    s.research.points = 0;
    expect(buyResearch(s, 'exp')).toBe(false);
    s.research.points = 100;
    const before = computeModifiers(s).exp;
    expect(buyResearch(s, 'exp')).toBe(true);
    expect(computeModifiers(s).exp).toBeCloseTo(before * 1.05);
    expect(buyResearch(s, 'offline-hours')).toBe(true);
    expect(computeModifiers(s).offlineMaxHours).toBe(BALANCE.offline.maxHours + 1);
  });

  it('registrar espécie nova concede pontos de pesquisa', () => {
    const s = newGame(1, 0, 1);
    expect(s.research.points).toBe(3); // o inicial conta como registro
  });
});

describe('maestria', () => {
  it('vitórias somam para a linha evolutiva inteira', () => {
    const s = newGame(4, 0, 1);
    advance(s, 5 * 60_000, 0);
    const m = masteryOf(s, 4);
    expect(m.points).toBe(s.stats.totalKills);
    expect(masteryOf(s, 6).points).toBe(m.points);
  });
});

describe('prestígio', () => {
  it('exige vencer Misty e reinicia mantendo coleção e Pokédex', () => {
    const s = newGame(4, 0, 1);
    expect(canPrestige(s)).toBe(false);
    clearAll(s);
    activePokemon(s).level = 35;
    give(s, 25, 20);
    s.coins = 5000;
    const preview = prestigePreview(s);
    expect(preview).toBeGreaterThan(0);
    const size = s.collection.length;
    expect(prestigeReset(s)).toBe(preview);
    expect(s.prestige.points).toBe(preview);
    expect(s.collection).toHaveLength(size);
    expect(s.collection.every((p) => p.level === 5)).toBe(true);
    expect(s.coins).toBe(0);
    expect(s.routes['rota-2'].unlocked).toBe(false);
    expect(s.pokedex[4].caught).toBe(true);
  });

  it('melhorias de prestígio afetam a próxima jornada', () => {
    const s = newGame(4, 0, 1);
    clearAll(s);
    s.prestige.points = 100;
    expect(buyPrestige(s, 'veteran')).toBe(true);
    expect(buyPrestige(s, 'supplies')).toBe(true);
    const dmg = computeModifiers(s).damage;
    expect(buyPrestige(s, 'power')).toBe(true);
    expect(computeModifiers(s).damage).toBeCloseTo(dmg * 1.1);
    prestigeReset(s);
    expect(activePokemon(s).level).toBe(10);
    expect(s.coins).toBe(150);
    expect(s.items['poke-ball']).toBe(BALANCE.startingItems['poke-ball'] + 10);
  });
});

describe('conquistas e treinador', () => {
  it('concede recompensas uma única vez', () => {
    const s = newGame(4, 0, 1);
    s.stats.totalKills = 60;
    const events = checkAchievements(s);
    expect(events).toContainEqual({ type: 'achievement', id: 'kills-50' });
    expect(s.coins).toBe(100);
    expect(checkAchievements(s)).toEqual([]);
  });

  it('todas as conquistas têm metas válidas', () => {
    const s = newGame(4, 0, 1);
    expect(() => ACHIEVEMENTS.forEach(() => checkAchievements(s))).not.toThrow();
  });

  it('nível de treinador cresce com o progresso', () => {
    const s = newGame(4, 0, 1);
    expect(trainerLevel(s).level).toBe(1);
    s.stats.totalKills = 2000;
    expect(trainerLevel(s).level).toBeGreaterThan(5);
  });
});

describe('migração de save', () => {
  it('iniciais das Gerações VI–IX viram o equivalente de Kanto', () => {
    const s = newGame(1, 0, 1);
    const v2 = JSON.parse(serialize(s, 1));
    v2.meta.formatVersion = 2;
    v2.state.collection[0].speciesId = 907; // Floragato
    v2.state.collection[0].level = 20;
    v2.state.pokedex = {
      906: { seen: true, caught: true, shinyCaught: false },
      907: { seen: true, caught: true, shinyCaught: false },
    };
    v2.state.mastery = { 906: 40 };
    const result = parseSave(JSON.stringify(v2));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const st = result.file.state;
    expect(st.collection[0]).toMatchObject({ speciesId: 2, level: 20 });
    expect(st.pokedex[2]?.caught).toBe(true);
    expect(st.pokedex[907]).toBeUndefined();
    expect(st.mastery[1]).toBe(40);
  });

  it('save da versão 1 é convertido para a atual', () => {
    const s = newGame(4, 0, 1);
    const v1 = JSON.parse(serialize(s, 1));
    v1.meta.formatVersion = 1;
    for (const k of ['passives', 'research', 'mastery', 'achievements', 'prestige']) delete v1.state[k];
    v1.state.stats = { totalKills: 10, totalCaptures: 0, playTimeMs: 0 };
    v1.state.settings = {
      autoEvolve: false,
      showDamageNumbers: true,
      autoCapture: true,
      reducedMotion: false,
    };
    v1.state.routes['floresta-viridian'].bossDefeated = true;
    const result = parseSave(JSON.stringify(v1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const st = result.file.state;
    expect(st.passives).toEqual([]);
    expect(st.prestige.count).toBe(0);
    expect(st.stats.bossWins).toBe(1);
    expect(st.stats.totalKills).toBe(10);
    expect(st.settings.autoEvolve).toBe(false);
    expect(st.settings.volume).toBeGreaterThan(0);
  });
});
