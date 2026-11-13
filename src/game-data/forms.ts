// Formas alternativas colecionáveis: Unown (letras), Deerling/Sawsbuck (estação do ano),
// Castform (clima da batalha) e Spinda (padrão de manchas, desenhado pelo jogo).
// Sprites em public/sprites/pokemon/forms/<pasta>/<id>-<forma>.gif (PokéAPI, Black/White).

import { isMegaForm } from './megas';
import { REGIONAL_FORMS, REGIONAL_FORM_NAMES, regionalOf } from './regional';

export type FormRule = 'random' | 'season' | 'weather' | 'pattern' | 'regional';

export interface FormSet {
  speciesId: number;
  rule: FormRule;
  /** Formas na ordem de exibição; a primeira usa o sprite normal da espécie. */
  forms: string[];
  names: Record<string, string>;
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');

export const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type Season = (typeof SEASONS)[number];

const SEASON_NAMES: Record<string, string> = {
  spring: 'Primavera',
  summer: 'Verão',
  autumn: 'Outono',
  winter: 'Inverno',
};

/** Quantos padrões de Spinda contam para a coleção (há milhões; aqui são sorteados entre estes). */
export const SPINDA_PATTERNS = 16;

export const FORM_SETS: FormSet[] = [
  {
    speciesId: 201,
    rule: 'random',
    forms: [...LETTERS, 'exclamation', 'question'],
    names: Object.fromEntries([
      ...LETTERS.map((l) => [l, l.toUpperCase()]),
      ['exclamation', '!'],
      ['question', '?'],
    ]),
  },
  { speciesId: 585, rule: 'season', forms: [...SEASONS], names: SEASON_NAMES },
  { speciesId: 586, rule: 'season', forms: [...SEASONS], names: SEASON_NAMES },
  {
    speciesId: 351,
    rule: 'weather',
    forms: ['normal', 'sunny', 'rainy', 'snowy'],
    names: { normal: 'Normal', sunny: 'Sol', rainy: 'Chuva', snowy: 'Neve' },
  },
  {
    speciesId: 327,
    rule: 'pattern',
    forms: Array.from({ length: SPINDA_PATTERNS }, (_, i) => `p${i}`),
    names: Object.fromEntries(
      Array.from({ length: SPINDA_PATTERNS }, (_, i) => [`p${i}`, `Padrão ${i + 1}`]),
    ),
  },
];

// Formas regionais: a normal e a de cada região (na coleção da Pokédex, como as letras do Unown).
for (const id of [...new Set(REGIONAL_FORMS.map((r) => r.speciesId))]) {
  const forms = REGIONAL_FORMS.filter((r) => r.speciesId === id).map((r) => r.form);
  FORM_SETS.push({
    speciesId: id,
    rule: 'regional',
    forms: ['normal', ...forms],
    names: { normal: 'Normal', ...Object.fromEntries(forms.map((f) => [f, REGIONAL_FORM_NAMES[f] ?? f])) },
  });
}

const bySpecies = new Map(FORM_SETS.map((f) => [f.speciesId, f]));

export function formSet(speciesId: number): FormSet | undefined {
  return bySpecies.get(speciesId);
}

/** Forma que tem sprite próprio (a primeira de cada lista e os padrões de Spinda usam o normal). */
export function hasFormSprite(speciesId: number, form: string | undefined): form is string {
  if (isMegaForm(speciesId, form)) return true;
  const set = bySpecies.get(speciesId);
  return !!form && !!set && set.rule !== 'pattern' && set.forms.indexOf(form) > 0;
}

export function formSprite(
  speciesId: number,
  form: string | undefined,
  kind: 'front' | 'back',
  shiny = false,
): string | undefined {
  if (!hasFormSprite(speciesId, form)) return undefined;
  const regional = regionalOf(speciesId, form);
  if (regional) {
    const key = kind === 'front' ? (shiny ? 'frontShiny' : 'front') : shiny ? 'backShiny' : 'back';
    return regional.sprites[key] ?? regional.sprites[kind];
  }
  return `sprites/pokemon/forms/${kind}${shiny ? '-shiny' : ''}/${speciesId}-${form}.gif`;
}

export function formName(speciesId: number, form: string | undefined): string | undefined {
  return form ? bySpecies.get(speciesId)?.names[form] : undefined;
}
