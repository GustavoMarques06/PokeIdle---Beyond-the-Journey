import { describe, expect, it } from 'vitest';
import { BALANCE, BALL_RULES, getSpecies, speciesId } from '../game-data';
import { ballMultiplier, type BallContext } from './capture';
import { addToCollection } from './collection';
import { compatible, eggSpeciesOf, hatchReadyEggs, incompatibility, inheritedEggMoves } from './daycare';
import { advance, ballContext, currentEncounters, newGame } from './game';
import { genderOf, rollGender } from './gender';
import { activeLure, incenseType, repelActive, applyLure } from './lures';
import { learnableMoves, relearnMove, relearnableMoves, setMoveset } from './moveset';
import { itemEvolution, levelEvolution } from './progression';
import { rngFrom } from './rng';

const IVS = { hp: 10, atk: 10, def: 10, spAtk: 10, spDef: 10, spe: 10 };
const ctx = (over: Partial<BallContext> = {}): BallContext => ({
  types: ['normal'],
  level: 30,
  dark: false,
  caught: false,
  elapsedMs: 10_000,
  ...over,
});

describe('bolas especiais', () => {
  it('cada bola vale mais na sua situação e 1× fora dela', () => {
    expect(ballMultiplier('net-ball', ctx({ types: ['water'] }))).toBe(BALL_RULES.net);
    expect(ballMultiplier('net-ball', ctx())).toBe(1);
    expect(ballMultiplier('dusk-ball', ctx({ dark: true }))).toBe(BALL_RULES.dusk);
    expect(ballMultiplier('quick-ball', ctx({ elapsedMs: 1000 }))).toBe(BALL_RULES.quick);
    expect(ballMultiplier('quick-ball', ctx())).toBe(1);
    expect(ballMultiplier('timer-ball', ctx({ elapsedMs: 0 }))).toBe(1);
    expect(ballMultiplier('timer-ball', ctx({ elapsedMs: 600_000 }))).toBe(BALL_RULES.timerMax);
    expect(ballMultiplier('repeat-ball', ctx({ caught: true }))).toBe(BALL_RULES.repeat);
    expect(ballMultiplier('nest-ball', ctx({ level: 1 }))).toBe(BALL_RULES.nestMax);
    expect(ballMultiplier('nest-ball', ctx({ level: 50 }))).toBe(1);
    expect(ballMultiplier('great-ball', ctx())).toBe(BALANCE.capture.balls['great-ball']);
  });

  it('o contexto da batalha conta o tempo de luta', () => {
    const s = newGame(1, 0, 1);
    for (let t = 0; t < 4000 && !s.battle.enemy; t += 250) advance(s, 250, t);
    const first = ballContext(s)!.elapsedMs;
    advance(s, 500, 5000);
    if (s.battle.phase === 'fighting') expect(ballContext(s)!.elapsedMs).toBeGreaterThan(first);
  });
});

describe('repelente e incenso', () => {
  it('usar soma tempo, o efeito acaba e o incenso favorece o tipo', () => {
    const s = newGame(1, 0, 1);
    s.items.repel = 2;
    s.items['rose-incense'] = 1;
    expect(applyLure(s, 'repel')).toBe(true);
    expect(applyLure(s, 'repel')).toBe(true);
    expect(activeLure(s, 'repel')!.ms).toBe(20 * 60_000);
    expect(repelActive(s)).toBe(true);

    const before = currentEncounters(s, s.battle.routeId);
    expect(applyLure(s, 'rose-incense')).toBe(true);
    expect(incenseType(s)).toBe('grass');
    const after = currentEncounters(s, s.battle.routeId);
    after.forEach((e, i) => {
      const grass = getSpecies(e.speciesId).types.includes('grass');
      expect(e.weight).toBe(grass ? before[i].weight * 4 : before[i].weight);
    });

    advance(s, 21 * 60_000, 21 * 60_000);
    expect(repelActive(s)).toBe(false);
    expect(applyLure(s, 'repel')).toBe(false); // acabou o estoque
  });

  it('com repelente os selvagens aparecem no nível máximo da espécie', () => {
    const s = newGame(1, 0, 1);
    s.items['max-repel'] = 1;
    applyLure(s, 'max-repel');
    const table = currentEncounters(s, s.battle.routeId);
    for (let i = 0; i < 60; i++) {
      advance(s, 500, i * 500);
      const e = s.battle.enemy;
      if (s.battle.kind !== 'wild' || !e || e.roamer) continue;
      const enc = table.find((x) => x.speciesId === e.speciesId);
      if (enc) expect(e.level).toBe(enc.maxLevel);
    }
  });
});

describe('gênero', () => {
  it('segue a proporção da espécie e é estável', () => {
    const s = newGame(1, 0, 1);
    const magnemite = addToCollection(s, speciesId('magnemite'), 5, IVS, false, 0, 't');
    const chansey = addToCollection(s, speciesId('chansey'), 5, IVS, false, 0, 't');
    const tauros = addToCollection(s, speciesId('tauros'), 5, IVS, false, 0, 't');
    expect(genderOf(magnemite)).toBeNull();
    expect(genderOf(chansey)).toBe('f');
    expect(genderOf(tauros)).toBe('m');
    const rng = rngFrom(s);
    const rolls = Array.from({ length: 400 }, () => rollGender(speciesId('rattata'), rng));
    expect(rolls.filter((g) => g === 'f').length).toBeGreaterThan(120);
    expect(rolls.filter((g) => g === 'm').length).toBeGreaterThan(120);
  });

  it('creche: precisa de macho e fêmea (ou Ditto) e o ovo é da mãe', () => {
    const s = newGame(1, 0, 1);
    const m = addToCollection(s, speciesId('rattata'), 20, IVS, false, 0, 't');
    const f = addToCollection(s, speciesId('raticate'), 20, IVS, false, 0, 't');
    const ekans = addToCollection(s, speciesId('ekans'), 20, IVS, false, 0, 't');
    m.gender = 'm';
    f.gender = 'f';
    ekans.gender = 'm';
    expect(compatible(m, f)).toBe(true);
    expect(incompatibility(m, ekans)).toBe('gender');
    ekans.gender = 'f';
    expect(eggSpeciesOf(m, ekans)).toBe(speciesId('ekans'));
    const magnemite = addToCollection(s, speciesId('magnemite'), 20, IVS, false, 0, 't');
    const ditto = addToCollection(s, speciesId('ditto'), 20, IVS, false, 0, 't');
    expect(compatible(magnemite, ditto)).toBe(true);
  });

  it('Gallade só para machos; Vespiquen só para fêmeas', () => {
    const s = newGame(1, 0, 1);
    const kirlia = addToCollection(s, speciesId('kirlia'), 30, IVS, false, 0, 't');
    kirlia.gender = 'f';
    expect(itemEvolution(kirlia, 'dawn-stone')).toBeUndefined();
    kirlia.gender = 'm';
    expect(itemEvolution(kirlia, 'dawn-stone')).toBe(speciesId('gallade'));
    const combee = addToCollection(s, speciesId('combee'), 30, IVS, false, 0, 't');
    combee.gender = 'm';
    expect(levelEvolution(combee)).toBeUndefined();
    combee.gender = 'f';
    expect(levelEvolution(combee)?.to).toBe(speciesId('vespiquen'));
  });
});

describe('golpes de ovo e Relembrador', () => {
  it('o filhote herda golpes de ovo que um dos pais conhece', () => {
    const s = newGame(1, 0, 1);
    expect(getSpecies(speciesId('charmander')).eggMoves).toContain('bite');
    const mom = addToCollection(s, speciesId('charmander'), 30, IVS, false, 0, 't');
    const dad = addToCollection(s, speciesId('ekans'), 30, IVS, false, 0, 't');
    dad.moveset = ['bite'];
    expect(inheritedEggMoves(speciesId('charmander'), mom, dad)).toEqual(['bite']);

    s.eggs.push({
      id: 999,
      speciesId: speciesId('charmander'),
      ivs: IVS,
      shiny: false,
      cycles: 1,
      progress: 1,
      eggMoves: ['bite'],
    });
    hatchReadyEggs(s, 0, []);
    const baby = s.collection.at(-1)!;
    expect(baby.eggMoves).toEqual(['bite']);
    expect(baby.moveset).toContain('bite');
    expect(learnableMoves(s, baby).find((m) => m.move === 'bite')?.source).toBe('egg');
  });

  it('lembra golpes da pré-evolução pagando', () => {
    const s = newGame(1, 0, 1);
    const p = addToCollection(s, speciesId('charizard'), 60, IVS, false, 0, 't');
    const options = relearnableMoves(p);
    expect(options.length).toBeGreaterThan(0);
    const move = options[0];
    s.coins = 0;
    expect(relearnMove(s, p.uid, move)).toBe(false);
    s.coins = BALANCE.relearnCost;
    expect(relearnMove(s, p.uid, move)).toBe(true);
    expect(s.coins).toBe(0);
    expect(relearnableMoves(p)).not.toContain(move);
    expect(setMoveset(s, p.uid, [move])).toBe(true);
  });
});
