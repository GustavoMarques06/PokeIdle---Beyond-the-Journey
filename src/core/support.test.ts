// Golpes de apoio: quem tem, quando o automático usa e o efeito de cada tipo.

import { describe, expect, it } from 'vitest';
import { BALANCE, SUPPORT_MOVES, describeSupport, supportMoveOf } from '../game-data';
import { moveName } from '../ui/i18n/pt-BR';
import type { GameEvent } from './game';
import { advance, newGame, selectMove } from './game';
import { randomIvs } from './pokemon';
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
