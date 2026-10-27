// Uso de itens em Pokémon: itens seguráveis, vitaminas, Tampa de Garrafa, cápsulas de
// habilidade e berries de carinho.

import {
  BALANCE,
  BERRIES,
  abilitiesOf,
  getTrainingItem,
  isHeldItem,
  vitaminStat,
  type StatKey,
} from '../game-data';
import { findPokemon } from './collection';
import { addFriendship } from './friendship';
import { abilitySlotOf, evRoom, statsOf, type PokemonInstance } from './pokemon';
import type { GameState } from './state';
import { gainEvs } from './training';

/** Devolve o item segurado à Mochila. */
export function returnHeld(state: GameState, p: PokemonInstance): void {
  if (!p.held) return;
  state.items[p.held] = (state.items[p.held] ?? 0) + 1;
  p.held = undefined;
}

/** Equipa um item da Mochila (o item anterior volta para ela). */
export function equipItem(state: GameState, uid: number, itemId: string): boolean {
  const p = findPokemon(state, uid);
  if (!p || !isHeldItem(itemId) || (state.items[itemId] ?? 0) <= 0 || p.held === itemId) return false;
  returnHeld(state, p);
  state.items[itemId]--;
  p.held = itemId;
  if (itemId === 'everstone') p.pendingEvolution = undefined;
  return true;
}

export function unequipItem(state: GameState, uid: number): boolean {
  const p = findPokemon(state, uid);
  if (!p?.held) return false;
  returnHeld(state, p);
  return true;
}

function spendOne(state: GameState, itemId: string): boolean {
  if ((state.items[itemId] ?? 0) <= 0) return false;
  state.items[itemId]--;
  return true;
}

/** Vitamina: +10 EVs no atributo (até 100 por vitaminas) e um pouco de amizade. */
export function giveVitamin(state: GameState, uid: number, itemId: string): boolean {
  const p = findPokemon(state, uid);
  const stat = vitaminStat(itemId);
  if (!p || !stat || (state.items[itemId] ?? 0) <= 0) return false;
  const t = BALANCE.training;
  const used = p.vitaminEvs?.[stat] ?? 0;
  const amount = Math.min(t.vitaminEvs, t.vitaminCap - used, evRoom(p, stat));
  if (amount <= 0) return false;
  state.items[itemId]--;
  gainEvs(p, stat, amount);
  p.vitaminEvs = { ...p.vitaminEvs, [stat]: used + amount };
  addFriendship(p, BALANCE.friendship.vitamin);
  return true;
}

/** Tampa de Garrafa: leva um IV a 31 (Pokémon Nv. 50+). */
export function giveBottleCap(state: GameState, uid: number, stat: StatKey): boolean {
  const p = findPokemon(state, uid);
  if (!p || p.level < BALANCE.training.bottleCapMinLevel || p.ivs[stat] >= 31) return false;
  if (!spendOne(state, 'bottle-cap')) return false;
  const before = statsOf(p).hp;
  p.ivs = { ...p.ivs, [stat]: 31 };
  p.currentHp += Math.max(0, statsOf(p).hp - before);
  return true;
}

/** Cápsula de Habilidade: alterna entre as duas habilidades comuns (a oculta volta para a primeira). */
export function giveAbilityCapsule(state: GameState, uid: number): boolean {
  const p = findPokemon(state, uid);
  if (!p) return false;
  const [, second] = abilitiesOf(p.speciesId);
  const slot = abilitySlotOf(p);
  if (!second && slot !== 2) return false;
  if (!spendOne(state, 'ability-capsule')) return false;
  p.abilitySlot = slot === 0 && second ? 1 : 0;
  return true;
}

/** Patch de Habilidade: libera a habilidade oculta. */
export function giveAbilityPatch(state: GameState, uid: number): boolean {
  const p = findPokemon(state, uid);
  if (!p || !abilitiesOf(p.speciesId)[2] || abilitySlotOf(p) === 2) return false;
  if (!spendOne(state, 'ability-patch')) return false;
  p.abilitySlot = 2;
  return true;
}

/** Alimenta o Pokémon com uma berry do Jardim: +amizade. */
export function feedBerry(state: GameState, uid: number, berryId: string): boolean {
  const p = findPokemon(state, uid);
  if (!p || !BERRIES.some((b) => b.id === berryId) || !spendOne(state, berryId)) return false;
  addFriendship(p, BALANCE.friendship.berry);
  return true;
}

export const isTrainingItem = (id: string) => !!getTrainingItem(id);
