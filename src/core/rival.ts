// Rival de Hoenn: como em Ruby/Sapphire/Emerald, é o outro protagonista. Quem joga de May
// enfrenta o Brendan (na mesma roupa: Emerald ou Ruby/Sapphire); os demais enfrentam a May.

import type { BossData } from '../game-data';
import type { GameState } from './state';

const HOENN_RIVAL = 'hoenn-may';

/** Nome, título e sprite do chefe como o jogador o vê (só o rival de Hoenn muda). */
export function bossLook(
  state: Pick<GameState, 'trainerAvatar'>,
  boss: Pick<BossData, 'name' | 'title' | 'trainer'>,
): { name: string; title: string; trainer: string } {
  if (boss.trainer === HOENN_RIVAL && (state.trainerAvatar === 'may' || state.trainerAvatar === 'may_rs')) {
    return {
      name: 'Brendan',
      title: boss.title.replace(/^Sua rival$/, 'Seu rival'),
      trainer: state.trainerAvatar === 'may_rs' ? 'brendan_rs' : 'brendan',
    };
  }
  return { name: boss.name, title: boss.title, trainer: boss.trainer };
}
