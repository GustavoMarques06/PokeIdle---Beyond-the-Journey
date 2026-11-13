// Formas regionais (Alola): a mesma espécie, com outros tipos, atributos, habilidades e golpes. Ao contrário da
// Mega, a forma é do Pokémon para sempre (`form: 'alola'` no PokemonInstance). Aparecem nas rotas da região, nascem
// de pais da forma e evoluem mantendo-a. Dados e sprites vêm de scripts/fetch-pokeapi.mjs (REGIONAL_FORMS).

import regionalJson from './generated/regional.json';
import type { BaseStats, Evolution, LearnsetEntry, TypeName } from './types';

export interface RegionalForm {
  speciesId: number;
  form: string;
  types: TypeName[];
  baseStats: BaseStats;
  /** Slots 1, 2 e oculta, pelos ids da PokéAPI (abilities.ts traduz as que o combate não tem). */
  abilities: (string | null)[];
  learnset: LearnsetEntry[];
  tmMoves: string[];
  sprites: { front?: string; back?: string; frontShiny?: string; backShiny?: string };
  spriteSize?: { front?: [number, number]; back?: [number, number] };
}

export const REGIONAL_FORMS = regionalJson as RegionalForm[];

/** Evoluções que mudam na forma regional (Vulpix e Sandshrew de Alola evoluem com a Pedra do Gelo). */
export const REGIONAL_EVOLUTIONS: Record<string, Evolution[]> = {
  '37-alola': [{ to: 38, trigger: 'item', item: 'ice-stone' }],
  '27-alola': [{ to: 28, trigger: 'item', item: 'ice-stone' }],
};

/** Região de cada forma regional: lá, os selvagens dessas espécies aparecem nessa forma. */
export const FORM_REGION: Record<string, string> = { alola: 'alola' };

/** Nome da forma para a tela ("Raichu de Alola"). */
export const REGIONAL_FORM_NAMES: Record<string, string> = { alola: 'Alola' };

const byKey = new Map(REGIONAL_FORMS.map((r) => [`${r.speciesId}-${r.form}`, r]));
const speciesWithForms = new Set(REGIONAL_FORMS.map((r) => r.speciesId));

export function regionalOf(speciesId: number, form: string | undefined): RegionalForm | undefined {
  return form ? byKey.get(`${speciesId}-${form}`) : undefined;
}

export const hasRegionalForms = (speciesId: number) => speciesWithForms.has(speciesId);

/** A forma regional desta espécie na região (undefined se ela não tem forma de lá). */
export function regionalFormIn(speciesId: number, regionId: string | undefined): string | undefined {
  if (!regionId) return undefined;
  return REGIONAL_FORMS.find((r) => r.speciesId === speciesId && FORM_REGION[r.form] === regionId)?.form;
}
