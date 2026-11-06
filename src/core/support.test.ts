// Golpes de apoio: quem tem, quando o automático usa e o efeito de cada tipo.

import { describe, expect, it } from 'vitest';
import {
  BALANCE,
  SUPPORT_MOVES,
  blockedBy,
  describeSupport,
  supportMoveOf,
  type TypeName,
} from '../game-data';
import { moveName } from '../ui/i18n/pt-BR';
import type { GameEvent } from './game';
import { advance, newGame, selectMove, supportOf, supportReady } from './game';
import { randomIvs, statsOf } from './pokemon';
import { seededRng } from './rng';
import type { GameState } from './state';

function fight(boostFoe: number, speciesId: number, level: number): GameState {
  const s = newGame(1, 0, 1);
  advance(s, BALANCE.combat.spawnDelayMs + 100, 0);
  const p = s.collection[0];
  p.speciesId = speciesId;
  p.level = level;
  p.currentHp = 500;
  s.battle.kind = 'wild';
  s.battle.enemy = {
    speciesId: 19,
    level: 5,
    ivs: randomIvs(seededRng(1)),
    shiny: false,
    hp: 99999,
    maxHp: 99999,
    captureAttempted: false,
    boost: boostFoe,
  };
  return s;
}

const collect = (s: GameState, ms: number) => {
  const events: GameEvent[] = [];
  for (let t = 0; t < ms; t += 200) events.push(...advance(s, 200, t));
  return events;
};

describe('modo manual', () => {
  it('o golpe de apoio escolhido é usado uma vez e o nome dele aparece na tela', () => {
    const s = fight(1, 123, 100);
    s.settings.battleMode = 'manual';
    s.battle.playerTimerMs = 0;
    const support = supportMoveOf(123, 100)!;
    expect(selectMove(s, support.id)).toBe(true);
    expect(moveName(support.id)).toBe(support.name);
    const used = collect(s, 1_000).filter((e) => e.type === 'supportMove' && e.side === 'player');
    expect(used.length).toBe(1);
    s.battle.playerTimerMs = 0;
    s.battle.pendingMove = undefined;
    expect(selectMove(s, support.id)).toBe(false);
  });
});

describe('golpes de apoio', () => {
  it('a espécie só tem o golpe a partir do nível em que aprende', () => {
    // Scyther (123) aprende Swords Dance por nível; no nível 1, ainda não.
    expect(supportMoveOf(123, 100)).toBeDefined();
    expect(supportMoveOf(123, 1)).toBeUndefined();
  });

  it('todo golpe tem uma descrição', () => {
    for (const m of Object.values(SUPPORT_MOVES)) expect(describeSupport(m).length).toBeGreaterThan(3);
  });

  it('numa luta longa, o automático usa o golpe de apoio no máximo uma vez', () => {
    const id = 123;
    const s = fight(1, id, 100);
    const used = collect(s, 40_000).filter((e) => e.type === 'supportMove' && e.side === 'player');
    expect(used.length).toBe(1);
  });

  it('contra quem cai em poucos golpes, o automático só ataca', () => {
    const s = fight(1, 123, 100);
    s.battle.enemy!.hp = 1;
    s.battle.enemy!.maxHp = 1;
    const used = collect(s, 3_000).filter((e) => e.type === 'supportMove' && e.side === 'player');
    expect(used.length).toBe(0);
  });
});

describe('regras dos golpes de apoio', () => {
  it('nas raides e no duelo não existe, e nem dá para escolher', () => {
    const s = fight(1, 123, 100);
    s.settings.battleMode = 'manual';
    s.battle.playerTimerMs = 0;
    s.battle.kind = 'raid';
    expect(supportOf(s, s.collection[0])).toBeUndefined();
    expect(selectMove(s, supportMoveOf(123, 100)!.id)).toBe(false);
  });

  it('curar com o HP cheio não gasta a vez', () => {
    const s = fight(1, 123, 100);
    const p = s.collection[0];
    // Chansey aprende Soft-Boiled ou outra cura; aqui basta um Pokémon que tenha cura.
    const healer = [113, 35, 36, 39, 40].find((id) => supportMoveOf(id, 100)?.effect.kind === 'heal');
    expect(healer).toBeDefined();
    p.speciesId = healer!;
    p.currentHp = statsOf(p).hp;
    expect(supportReady(s, p)).toBeUndefined();
    p.currentHp = 1;
    expect(supportReady(s, p)).toBeDefined();
  });

  it('Thunder Wave não afeta Terra, e pós não afetam Planta', () => {
    expect(blockedBy(SUPPORT_MOVES['thunder-wave'].effect as { immune?: TypeName[] }, ['ground'])).toBe(true);
    expect(blockedBy(SUPPORT_MOVES['thunder-wave'].effect as { immune?: TypeName[] }, ['water'])).toBe(false);
    expect(blockedBy(SUPPORT_MOVES['spore'].effect as { immune?: TypeName[] }, ['grass', 'poison'])).toBe(
      true,
    );
  });
});

describe('luta contra treinador', () => {
  it('o apoio é um só contra o time inteiro, e o aumento continua', () => {
    const s = fight(1, 123, 100);
    const uid = s.collection[0].uid;
    s.battle.supportUsed = [uid];
    s.battle.supportBoosts = { [uid]: { atk: 1.6 } };
    s.battle.team = [
      { speciesId: 19, level: 5 },
      { speciesId: 19, level: 5 },
    ] as never;
    s.battle.bossIndex = 1;
    s.battle.kind = 'trainer' as never;
    s.battle.enemy = null;
    s.battle.phase = 'victory';
    s.battle.phaseMs = 1;
    advance(s, 100, 0);
    expect(s.battle.enemy).not.toBeNull();
    expect(s.battle.supportUsed).toEqual([uid]);
    expect(s.battle.supportBoosts?.[uid]).toEqual({ atk: 1.6 });
  });

  it('num encontro selvagem novo, tudo recomeça', () => {
    const s = fight(1, 123, 100);
    s.battle.supportUsed = [s.collection[0].uid];
    s.battle.enemy = null;
    s.battle.phase = 'victory';
    s.battle.phaseMs = 1;
    advance(s, 100, 0);
    expect(s.battle.supportUsed).toBeUndefined();
  });
});

describe('pausa do shiny', () => {
  it('uma bola que falha durante a pausa não prolonga a espera', () => {
    const s = fight(1, 123, 100);
    s.battle.enemy!.shiny = true;
    s.battle.shinyPauseMs = 5000;
    s.battle.holdMs = 2000;
    advance(s, 2100, 0);
    expect(s.battle.holdMs).toBeUndefined();
    expect(s.battle.shinyPauseMs).toBeGreaterThan(0);
    advance(s, 3000, 2100);
    expect(s.battle.shinyPauseMs).toBeUndefined();
  });
});
