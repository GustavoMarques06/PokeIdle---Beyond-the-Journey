// Itens que os treinadores e os Pokémon de elite (chefes, Torre, lendários, raides) seguram.

import { getSpecies } from '../game-data';

/** Item de reforço de tipo, para o ás de cada treinador. */
export const TYPE_ITEMS: Record<string, string> = {
  fire: 'charcoal',
  water: 'mystic-water',
  grass: 'miracle-seed',
  electric: 'magnet',
  ice: 'never-melt-ice',
  fighting: 'black-belt',
  poison: 'poison-barb',
  ground: 'soft-sand',
  flying: 'sharp-beak',
  psychic: 'twisted-spoon',
  bug: 'silver-powder',
  rock: 'hard-stone',
  ghost: 'spell-tag',
  dragon: 'dragon-fang',
  dark: 'black-glasses',
  normal: 'silk-scarf',
};

const ELITE_ITEMS = ['leftovers', 'life-orb', 'focus-sash', 'expert-belt', 'shell-bell'];

export const typeItemOf = (speciesId: number): string | undefined =>
  TYPE_ITEMS[getSpecies(speciesId).types[0]];

/** Item de elite, estável por espécie: Faixa/Óculos Escolha conforme o lado forte do Pokémon. */
export function eliteItemOf(speciesId: number): string {
  const { baseStats } = getSpecies(speciesId);
  const pool = [...ELITE_ITEMS, baseStats.atk >= baseStats.spAtk ? 'choice-band' : 'choice-specs'];
  return pool[speciesId % pool.length];
}
