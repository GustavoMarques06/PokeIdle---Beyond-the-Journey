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
  'safari-mud': { id: 'safari-mud', name: 'Lama', icon: { glyph: 'sand', color: '#8a6030' } },
  pokeblock: { id: 'pokeblock', name: 'Pokébloco', icon: { glyph: 'gem', color: '#e85890' } },
};

// --- Zonas do Safari -----------------------------------------------------------------------------

export type SafariZoneId = 'plains' | 'forest' | 'mountain' | 'marsh' | 'lake' | 'pinwheel' | 'flowers';
export type SafariPath = 'grass' | 'tall' | 'water';

export interface SafariZone {
  id: SafariZoneId;
  name: string;
  /** Área que precisa estar liberada para entrar. */
  unlock: string;
  /** Cenário de batalha usado de fundo (public/sprites/backgrounds). */
  scene: string;
  levels: [number, number];
  /** [espécie, peso] em cada caminho: grama baixa, grama alta (os raros) e água (pesca). */
  grass: [string, number][];
  tall: [string, number][];
  water: [string, number][];
}

export const SAFARI_ZONES: SafariZone[] = [
  {
    id: 'plains',
    name: 'Planície (Kanto)',
    unlock: 'zona-safari',
    scene: 'meadow',
    levels: [28, 40],
    grass: SAFARI_ENCOUNTERS.filter(([, w]) => w >= 6),
    tall: [
      ['tauros', 6],
      ['kangaskhan', 5],
      ['scyther', 4],
      ['pinsir', 4],
      ['heracross', 3],
      ['chansey', 3],
      ['gligar', 4],
      ['yanma', 4],
    ],
    water: [
      ['magikarp', 20],
      ['goldeen', 14],
      ['krabby', 10],
      ['psyduck', 8],
      ['seaking', 4],
      ['dratini', 3],
    ],
  },
  {
    id: 'forest',
    name: 'Floresta (Johto)',
    unlock: 'johto-rotas-29-31',
    scene: 'forest',
    levels: [32, 44],
    grass: [
      ['hoothoot', 14],
      ['ledyba', 12],
      ['spinarak', 12],
      ['sunkern', 12],
      ['aipom', 10],
      ['pineco', 10],
      ['skiploom', 8],
      ['snubbull', 8],
    ],
    tall: [
      ['stantler', 6],
      ['heracross', 4],
      ['shuckle', 4],
      ['yanma', 5],
      ['murkrow', 5],
      ['misdreavus', 4],
      ['sneasel', 3],
      ['smeargle', 2],
    ],
    water: [
      ['poliwag', 16],
      ['magikarp', 16],
      ['remoraid', 10],
      ['qwilfish', 8],
      ['chinchou', 6],
      ['lanturn', 3],
    ],
  },
  {
    id: 'mountain',
    name: 'Montanha (Hoenn)',
    unlock: 'hoenn-rotas-101-104',
    scene: 'mountain',
    levels: [36, 48],
    grass: [
      ['geodude', 14],
      ['numel', 12],
      ['spoink', 12],
      ['aron', 10],
      ['natu', 10],
      ['girafarig', 8],
      ['phanpy', 8],
      ['skitty', 8],
    ],
    tall: [
      ['zangoose', 5],
      ['seviper', 5],
      ['absol', 4],
      ['lunatone', 4],
      ['solrock', 4],
      ['kecleon', 4],
      ['bagon', 2],
      ['larvitar', 2],
    ],
    water: [
      ['magikarp', 16],
      ['carvanha', 12],
      ['wailmer', 10],
      ['corsola', 8],
      ['feebas', 2],
      ['relicanth', 2],
    ],
  },
  {
    id: 'marsh',
    name: 'Grande Pântano (Sinnoh)',
    unlock: 'grande-pantano',
    scene: 'swamp',
    levels: [40, 52],
    grass: [
      ['wooper', 14],
      ['bibarel', 12],
      ['skorupi', 12],
      ['croagunk', 12],
      ['tangela', 10],
      ['gulpin', 10],
      ['hippopotas', 8],
    ],
    tall: [
      ['carnivine', 6],
      ['quagsire', 6],
      ['tropius', 5],
      ['kangaskhan', 4],
      ['yanma', 5],
      ['gible', 2],
    ],
    water: [
      ['barboach', 16],
      ['magikarp', 14],
      ['finneon', 12],
      ['whiscash', 6],
      ['lumineon', 5],
      ['gyarados', 2],
    ],
  },
  {
    id: 'lake',
    name: 'Lago dos Bebês',
    unlock: 'sinnoh-rotas-201-203',
    scene: 'river',
    levels: [20, 30],
    grass: [
      ['togepi', 8],
      ['happiny', 8],
      ['munchlax', 8],
      ['tyrogue', 8],
      ['pikachu', 10],
      ['oddish', 12],
      ['wobbuffet', 8],
    ],
    tall: [
      ['riolu', 4],
      ['chimecho', 5],
      ['chansey', 4],
      ['teddiursa', 6],
    ],
    water: [
      ['horsea', 12],
      ['staryu', 12],
      ['shellder', 12],
      ['magikarp', 10],
      ['dratini', 4],
      ['feebas', 2],
    ],
  },
  {
    id: 'pinwheel',
    name: 'Bosque Pinwheel (Unova)',
    unlock: 'unova-rotas-1-3',
    scene: 'jungle',
    levels: [44, 56],
    grass: [
      ['sewaddle', 12],
      ['venipede', 12],
      ['cottonee', 12],
      ['petilil', 12],
      ['deerling', 10],
      ['karrablast', 10],
      ['shelmet', 10],
      ['minccino', 8],
    ],
    tall: [
      ['sawsbuck', 6],
      ['throh', 5],
      ['sawk', 5],
      ['leavanny', 4],
      ['emolga', 7],
      ['audino', 7],
      ['axew', 2],
      ['larvesta', 2],
    ],
    water: [
      ['basculin', 16],
      ['tympole', 14],
      ['ducklett', 10],
      ['frillish', 8],
      ['alomomola', 4],
      ['stunfisk', 3],
    ],
  },
  {
    id: 'flowers',
    name: 'Colinas de Flores (Kalos)',
    unlock: 'kalos-rotas-1-4',
    scene: 'plains',
    levels: [48, 60],
    grass: [
      ['fletchling', 12],
      ['scatterbug', 12],
      ['flabebe', 12],
      ['bunnelby', 12],
      ['skiddo', 10],
      ['pancham', 10],
      ['espurr', 10],
      ['litleo', 10],
    ],
    tall: [
      ['helioptile', 10],
      ['spritzee', 10],
      ['swirlix', 10],
      ['hawlucha', 4],
      ['honedge', 6],
      ['dedenne', 8],
      ['noibat', 3],
      ['goomy', 2],
    ],
    water: [
      ['skrelp', 12],
      ['clauncher', 12],
      ['binacle', 12],
      ['magikarp', 12],
      ['clawitzer', 3],
      ['dragalge', 2],
    ],
  },
];

/** Custo em passos de cada caminho e o que ele muda. */
export const SAFARI_PATHS: Record<SafariPath, { steps: number; label: string; hint: string }> = {
  grass: { steps: 10, label: 'Grama baixa', hint: 'Encontros comuns, gasta poucos passos.' },
  tall: { steps: 25, label: 'Grama alta', hint: 'Os raros da zona. Gasta mais passos.' },
  water: { steps: 15, label: 'Lago (pescar)', hint: 'Pokémon de água. A vara da loja traz os raros.' },
};

/** Loja do Safari: comprada com Pontos de Safari. `max` = quantas vezes dá para comprar (melhorias). */
export const SAFARI_SHOP: {
  id: string;
  name: string;
  description: string;
  cost: number;
  max?: number;
  item?: string;
  qty?: number;
}[] = [
  { id: 'balls', name: '+10 Safari Balls', description: 'Valem na próxima visita.', cost: 60 },
  { id: 'steps', name: 'Botas de Caminhada', description: '+200 passos em toda visita.', cost: 250, max: 3 },
  { id: 'good-rod', name: 'Vara Boa', description: 'No lago, os raros aparecem 2× mais.', cost: 300, max: 1 },
  { id: 'super-rod', name: 'Super Vara', description: 'No lago, os raros aparecem 4× mais.', cost: 800, max: 1 },
  { id: 'mud', name: 'Lama ×5', description: 'Ele demora para se limpar: foge bem menos por 2 vezes.', cost: 40, item: 'safari-mud', qty: 5 },
  { id: 'block', name: 'Pokébloco ×3', description: 'Ele come feliz: fica calmo e mais fácil de pegar.', cost: 70, item: 'pokeblock', qty: 3 },
  { id: 'egg', name: 'Ovo raro', description: 'Vai para o ninho da Creche: espécie rara, 3 IVs perfeitos.', cost: 500 },
  { id: 'mega', name: 'Mega Stone surpresa', description: 'Uma Mega Stone que você ainda não tem.', cost: 2500 },
];

/** Guia do Safari: entra numa zona sozinho e volta com 1 a 3 capturas (funciona com o jogo fechado). */
export const SAFARI_GUIDE = { fee: 3000, hours: 4 };

/** Prêmio por completar a Pokédex de uma zona do Safari. */
export const SAFARI_ZONE_REWARD = { points: 800, coins: 50_000 };
