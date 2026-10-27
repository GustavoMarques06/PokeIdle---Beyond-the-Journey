// Amizade (0–255): cresce com vitórias e níveis, cai um pouco quando o Pokémon desmaia e
// libera as evoluções por afeto. O Sino Calmante dobra os ganhos.

import { BALANCE } from '../game-data';
import { friendshipOf, heldOf, type PokemonInstance } from './pokemon';

/** Soma (ou tira) amizade; devolve quanto mudou de fato. */
export function addFriendship(p: PokemonInstance, amount: number): number {
  const before = friendshipOf(p);
  const multiplier = amount > 0 ? (heldOf(p)?.friendship ?? 1) : 1;
  p.friendship = Math.max(0, Math.min(BALANCE.friendship.max, before + Math.round(amount * multiplier)));
  return p.friendship - before;
}

/** Degraus de `per` vitórias cruzados ao ir de `total - kills` para `total`. */
export function friendshipSteps(total: number, kills: number, per: number): number {
  return Math.floor(total / per) - Math.floor((total - kills) / per);
}
