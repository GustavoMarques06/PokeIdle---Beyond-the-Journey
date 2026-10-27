// Naturezas: +10% num atributo e −10% em outro (as cinco "neutras" não mudam nada).

import type { StatKey } from './types';

export interface NatureDef {
  id: string;
  name: string;
  up?: Exclude<StatKey, 'hp'>;
  down?: Exclude<StatKey, 'hp'>;
}

export const NATURE_MULTIPLIER = { up: 1.1, down: 0.9 };

const ORDER = ['atk', 'def', 'spe', 'spAtk', 'spDef'] as const;

/** Tabela clássica: linha = atributo que sobe, coluna = atributo que desce. */
const TABLE = [
  ['Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty'],
  ['Bold', 'Docile', 'Relaxed', 'Impish', 'Lax'],
  ['Timid', 'Hasty', 'Serious', 'Jolly', 'Naive'],
  ['Modest', 'Mild', 'Quiet', 'Bashful', 'Rash'],
  ['Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky'],
];

export const NATURES: NatureDef[] = TABLE.flatMap((row, i) =>
  row.map((name, j): NatureDef => {
    const def: NatureDef = { id: name.toLowerCase(), name };
    if (i !== j) {
      def.up = ORDER[i];
      def.down = ORDER[j];
    }
    return def;
  }),
);

const byId = new Map(NATURES.map((n) => [n.id, n]));

export function getNature(id: string | undefined): NatureDef | undefined {
  return id ? byId.get(id) : undefined;
}
