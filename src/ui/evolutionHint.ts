// Requisitos de evolução em texto (ficha da equipe).

import { getItem, getSpecies, type Evolution } from '../game-data';
import type { GameState } from '../core/game';
import { friendshipOf } from '../core/pokemon';
import { speciesName } from './i18n/pt-BR';

const COND_TEXT = {
  'atk>def': 'com Ataque maior que a Defesa',
  'def>atk': 'com Defesa maior que o Ataque',
  'atk=def': 'com Ataque igual à Defesa',
  'uid-even': 'em um dos dois caminhos (sorteio do indivíduo)',
  'uid-odd': 'em um dos dois caminhos (sorteio do indivíduo)',
} as const;

const TIME_TEXT = { day: ' de dia', night: ' à noite' } as const;

/** Requisito de uma evolução, em texto. */
export function evolutionRequirement(e: Evolution, state: GameState, friendship: number): string {
  const when = e.time ? TIME_TEXT[e.time] : '';
  switch (e.trigger) {
    case 'level':
      return `Nv. ${e.minLevel}${e.cond ? ` ${COND_TEXT[e.cond]}` : ''}${when}`;
    case 'item': {
      const has = (state.items[e.item] ?? 0) > 0;
      return `${has ? 'usar' : 'precisa de'} ${getItem(e.item)?.name ?? e.item}${when}`;
    }
    case 'friendship':
      return `amizade ${Math.min(friendship, e.minFriendship)}/${e.minFriendship}${when}`;
  }
}

export function evolutionHint(state: GameState, uid: number): string | null {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p) return null;
  if (p.pendingEvolution) return `Pronto para evoluir em ${speciesName(p.pendingEvolution)}!`;
  const evo = getSpecies(p.speciesId).evolutions[0];
  if (!evo) return null;
  const others = getSpecies(p.speciesId).evolutions.length - 1;
  return `Evolui → ${speciesName(evo.to)}: ${evolutionRequirement(evo, state, friendshipOf(p))}${others > 0 ? ` (+${others} caminho${others > 1 ? 's' : ''})` : ''}`;
}
