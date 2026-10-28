// Gênero (♂/♀). Vem da proporção da espécie (genderRate: −1 sem gênero, 0 a 8 oitavos de
// fêmea). Selvagens sorteiam ao aparecer e passam o gênero adiante na captura; quem não tem o
// campo (saves antigos, ovos, prêmios) usa um valor fixo derivado do uid, que não muda depois.

import { getSpecies, type Gender } from '../game-data';
import type { Rng } from './rng';

export type { Gender };

/** Sorteia o gênero de um Pokémon novo (undefined = espécie sem gênero). */
export function rollGender(speciesId: number, rng: Rng): Gender | undefined {
  const rate = getSpecies(speciesId).genderRate;
  if (rate < 0) return undefined;
  if (rate === 0) return 'm';
  if (rate >= 8) return 'f';
  return rng.next() * 8 < rate ? 'f' : 'm';
}

/** Mistura o uid para um número de 0 a 7 (espalha uids seguidos). */
const uidEighth = (uid: number) => (Math.imul(uid, 2654435761) >>> 0) % 8;

/** Gênero de um Pokémon (null = sem gênero). A espécie manda: sem gênero ou de um gênero só. */
export function genderOf(p: { speciesId: number; uid?: number; gender?: Gender }): Gender | null {
  const rate = getSpecies(p.speciesId).genderRate;
  if (rate < 0) return null;
  if (rate === 0) return 'm';
  if (rate >= 8) return 'f';
  if (p.gender) return p.gender;
  return uidEighth(p.uid ?? 0) < rate ? 'f' : 'm';
}

export const GENDER_SYMBOL: Record<Gender, string> = { m: '♂', f: '♀' };
