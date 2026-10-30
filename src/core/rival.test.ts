// Rival de Hoenn: o outro protagonista, conforme o avatar do jogador.

import { describe, expect, it } from 'vitest';
import { getRoute } from '../game-data';
import { challengeBoss, newGame } from './game';
import { bossLook } from './rival';

const RIVAL = getRoute('hoenn-estrada-vitoria').boss!;

describe('rival de Hoenn', () => {
  it('quem joga de May enfrenta o Brendan, na mesma roupa', () => {
    expect(bossLook({ trainerAvatar: 'may' }, RIVAL)).toEqual({
      name: 'Brendan',
      title: 'Seu rival',
      trainer: 'brendan',
    });
    expect(bossLook({ trainerAvatar: 'may_rs' }, RIVAL).trainer).toBe('brendan_rs');
  });

  it('os demais enfrentam a May; outros chefes não mudam', () => {
    for (const avatar of ['red', 'leaf', 'brendan', 'brendan_rs'] as const) {
      expect(bossLook({ trainerAvatar: avatar }, RIVAL)).toEqual({
        name: RIVAL.name,
        title: RIVAL.title,
        trainer: RIVAL.trainer,
      });
    }
    const brock = getRoute('mt-moon').boss!;
    expect(bossLook({ trainerAvatar: 'may' }, brock).name).toBe(brock.name);
  });

  it('a batalha usa o rival certo', () => {
    const s = newGame(1, 0, 1, 'Ana', 'may');
    const id = 'hoenn-estrada-vitoria';
    s.routes[id].unlocked = true;
    s.routes[id].kills = getRoute(id).killsRequired;
    expect(challengeBoss(s, id)).toBe(true);
    expect(s.battle.trainer).toMatchObject({ name: 'Brendan', sprite: 'brendan', title: 'Seu rival' });
  });
});
