// Jogo do Safari: espécies que só aparecem aí (nas batalhas da Zona Safari não surgem) e a
// árvore de berry de cada rota ao ar livre.

import type { ItemData } from './types';

/** [espécie, peso]. Raras de propósito: Chansey, Scyther, Pinsir, Dratini, Heracross… */
export const SAFARI_ENCOUNTERS: [string, number][] = [
  ['nidoran-f', 14],
  ['nidoran-m', 14],
  ['doduo', 12],
  ['venonat', 12],
  ['paras', 12],
  ['exeggcute', 10],
  ['rhyhorn', 10],
  ['girafarig', 8],
  ['phanpy', 8],
  ['teddiursa', 8],
  ['natu', 8],
  ['yanma', 6],
  ['gligar', 6],
  ['tauros', 5],
  ['kangaskhan', 4],
  ['scyther', 3],
  ['pinsir', 3],
  ['heracross', 3],
  ['chansey', 2],
  ['dratini', 2],
];

/** Berries que as árvores selvagens dão (a de cada rota é sorteada pelo id dela, sempre a mesma). */
export const WILD_TREE_BERRIES: [string, number][] = [
  ['oran-berry', 30],
  ['pecha-berry', 20],
  ['cheri-berry', 20],
  ['leppa-berry', 12],
  ['razz-berry', 10],
  ['persim-berry', 8],
  ['sitrus-berry', 6],
  ['lum-berry', 2],
];

export const SAFARI_ITEMS: Record<string, ItemData> = {
  'safari-ball': { id: 'safari-ball', name: 'Safari Ball', sprite: 'sprites/items/safari-ball.png' },
};
