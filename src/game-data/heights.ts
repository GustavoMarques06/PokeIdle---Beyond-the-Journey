// Altura real de cada espécie (PokéAPI, em decímetros; scripts/fetch-heights.mjs). A batalha voltou a mostrar os sprites
// no tamanho normal (os pequenos ficavam pequenos demais); o dado continua aqui para a Pokédex e usos futuros.

import heightsJson from './generated/heights.json';

const HEIGHTS = heightsJson as Record<string, number>;

/** Altura em metros (Megas e Primais têm a sua; sem dado, 1 m). */
export function heightMeters(speciesId: number, form?: string): number {
  const dm = (form ? HEIGHTS[`${speciesId}-${form}`] : undefined) ?? HEIGHTS[String(speciesId)];
  return dm ? dm / 10 : 1;
}
