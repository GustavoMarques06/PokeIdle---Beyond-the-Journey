// Falas da caixa de batalha: concordância de número e apelidos da equipe do jogador.

import { describe, expect, it } from 'vitest';
import { battleText, type BattleTextContext } from './battleText';

const ctx: BattleTextContext = { routeId: 'rota-1', bossBattle: false, playerName: 'CROCO' };
const nick: BattleTextContext = { ...ctx, nicknames: new Map([[158, 'Croco']]) };

describe('falas da batalha', () => {
  it('usam singular com 1 ponto de EXP e 1 moeda', () => {
    const one = battleText({ type: 'enemyFainted', speciesId: 19, exp: 1, coins: 1 } as never, ctx)!;
    expect(one.text).toContain('ganhou 1 ponto de EXP e 1 moeda.');
    const many = battleText({ type: 'enemyFainted', speciesId: 19, exp: 12, coins: 3 } as never, ctx)!;
    expect(many.text).toContain('ganhou 12 pontos de EXP e 3 moedas.');
  });

  it('chamam o Pokémon do jogador pelo apelido, e o selvagem pela espécie', () => {
    const attack = battleText(
      {
        type: 'attack',
        side: 'player',
        attacker: 158,
        target: 19,
        result: { moveId: 'tackle', damage: 5, missed: false, crit: false, effectiveness: 1 },
      } as never,
      nick,
    )!;
    expect(attack.text).toBe('Croco usou Tackle!');
    expect(battleText({ type: 'levelUp', speciesId: 158, level: 6 } as never, nick)!.text).toBe(
      'Croco subiu para o Nv. 6!',
    );
    expect(
      battleText({ type: 'evolved', from: 158, to: 159 } as never, {
        ...ctx,
        nicknames: new Map([[159, 'Croco']]),
      })!.text,
    ).toBe('Parabéns! Croco evoluiu para Croconaw!');
    // Sem apelido, continua o nome da espécie.
    expect(battleText({ type: 'levelUp', speciesId: 158, level: 6 } as never, ctx)!.text).toBe(
      'Totodile subiu para o Nv. 6!',
    );
  });
});
