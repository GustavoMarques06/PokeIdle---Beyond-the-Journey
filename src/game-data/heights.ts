// Altura real de cada espécie (PokéAPI, em decímetros; scripts/fetch-heights.mjs). A cena de batalha usa para o
// tamanho relativo: um Rattata (0,3 m) aparece bem menor que um Charizard (1,7 m) e um Onix (8,8 m).

import heightsJson from './generated/heights.json';

const HEIGHTS = heightsJson as Record<string, number>;

/** Altura em metros (Megas e Primais têm a sua; sem dado, 1 m). */
export function heightMeters(speciesId: number, form?: string): number {
  const dm = (form ? HEIGHTS[`${speciesId}-${form}`] : undefined) ?? HEIGHTS[String(speciesId)];
  return dm ? dm / 10 : 1;
}
