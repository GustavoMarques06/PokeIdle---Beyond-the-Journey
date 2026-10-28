// Pesca e Surf: encontros de água por rota. Cada vara pesca o que está na própria linha e
// nas das varas anteriores; o Surf tem a lista dele. Os níveis seguem os da grama da rota,
// com o ajuste de BALANCE.water. Espécies por nome (slug), validadas nos testes.

import type { ItemData } from './types';

export type Rod = 'old-rod' | 'good-rod' | 'super-rod';
export type WaterMode = 'fish' | 'surf';

/** Da mais fraca para a mais forte. */
export const RODS: Rod[] = ['old-rod', 'good-rod', 'super-rod'];
/** Melhoria do Poké Mart que libera o Surf (a HM). */
export const SURF_UPGRADE = 'surf';

export interface WaterSpot {
  /** [espécie, peso, vara mínima] */
  fish?: [string, number, Rod][];
  /** [espécie, peso] */
  surf?: [string, number][];
}

export const WATER_SPOTS: Record<string, WaterSpot> = {
  // --- Kanto ---
  'rota-24-25': {
    fish: [
      ['magikarp', 60, 'old-rod'],
      ['goldeen', 40, 'old-rod'],
      ['poliwag', 35, 'good-rod'],
      ['horsea', 25, 'good-rod'],
      ['krabby', 25, 'good-rod'],
      ['psyduck', 20, 'super-rod'],
      ['seaking', 10, 'super-rod'],
    ],
    surf: [
      ['psyduck', 40],
      ['slowpoke', 35],
      ['marill', 25],
    ],
  },
  'rota-12-15': {
    fish: [
      ['magikarp', 60, 'old-rod'],
      ['tentacool', 30, 'old-rod'],
      ['poliwag', 30, 'good-rod'],
      ['horsea', 30, 'good-rod'],
      ['barboach', 25, 'super-rod'],
      ['corphish', 25, 'super-rod'],
      ['seadra', 8, 'super-rod'],
    ],
    surf: [
      ['tentacool', 45],
      ['slowpoke', 30],
      ['wooper', 25],
    ],
  },
  'zona-safari': {
    fish: [
      ['magikarp', 60, 'old-rod'],
      ['goldeen', 30, 'good-rod'],
      ['poliwag', 30, 'good-rod'],
      ['seaking', 15, 'super-rod'],
      ['dratini', 12, 'super-rod'],
      ['dragonair', 3, 'super-rod'],
    ],
    surf: [
      ['psyduck', 40],
      ['slowpoke', 40],
      ['marill', 20],
    ],
  },
  'ilhas-seafoam': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['shellder', 30, 'good-rod'],
      ['staryu', 30, 'good-rod'],
      ['horsea', 25, 'good-rod'],
      ['kingler', 15, 'super-rod'],
      ['seadra', 10, 'super-rod'],
      ['starmie', 8, 'super-rod'],
    ],
    surf: [
      ['seel', 40],
      ['spheal', 35],
      ['tentacool', 30],
      ['dewgong', 10],
      ['lapras', 4],
    ],
  },
  'rota-22-23': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['poliwag', 30, 'good-rod'],
      ['goldeen', 30, 'good-rod'],
      ['poliwhirl', 15, 'super-rod'],
      ['seaking', 15, 'super-rod'],
    ],
    surf: [
      ['psyduck', 40],
      ['slowpoke', 30],
      ['golduck', 15],
    ],
  },
  // --- Johto ---
  'poco-slowpoke-ilex': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['poliwag', 30, 'good-rod'],
      ['slowpoke', 30, 'good-rod'],
      ['slowbro', 8, 'super-rod'],
      ['slowking', 3, 'super-rod'],
    ],
    surf: [
      ['slowpoke', 50],
      ['wooper', 30],
      ['slowbro', 10],
    ],
  },
  'rotas-38-42-cianwood': {
    fish: [
      ['magikarp', 40, 'old-rod'],
      ['tentacool', 40, 'old-rod'],
      ['krabby', 30, 'good-rod'],
      ['chinchou', 30, 'good-rod'],
      ['kingler', 12, 'super-rod'],
      ['lanturn', 8, 'super-rod'],
    ],
    surf: [
      ['tentacool', 40],
      ['wingull', 30],
      ['pelipper', 10],
    ],
  },
  'farol-olivine': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['krabby', 30, 'good-rod'],
      ['corphish', 30, 'good-rod'],
      ['staryu', 15, 'super-rod'],
      ['kingler', 10, 'super-rod'],
    ],
    surf: [
      ['tentacool', 40],
      ['wingull', 35],
      ['tentacruel', 10],
    ],
  },
  'lago-da-furia': {
    fish: [
      ['magikarp', 70, 'old-rod'],
      ['goldeen', 30, 'good-rod'],
      ['poliwag', 25, 'good-rod'],
      ['gyarados', 10, 'super-rod'],
    ],
    surf: [
      ['marill', 40],
      ['wooper', 30],
      ['azumarill', 10],
      ['quagsire', 10],
    ],
  },
  'caverna-gelada': {
    fish: [
      ['magikarp', 40, 'old-rod'],
      ['shellder', 35, 'good-rod'],
      ['cloyster', 5, 'super-rod'],
    ],
    surf: [
      ['seel', 40],
      ['spheal', 40],
      ['dewgong', 10],
      ['sealeo', 10],
      ['lapras', 3],
    ],
  },
  // --- Hoenn ---
  'hoenn-rotas-101-104': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['tentacool', 30, 'old-rod'],
      ['barboach', 30, 'good-rod'],
      ['carvanha', 15, 'super-rod'],
    ],
    surf: [
      ['lotad', 40],
      ['wingull', 40],
      ['marill', 20],
    ],
  },
  'rota-119-fortree': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['goldeen', 30, 'old-rod'],
      ['carvanha', 30, 'good-rod'],
      ['barboach', 30, 'good-rod'],
      ['whiscash', 10, 'super-rod'],
      ['feebas', 4, 'super-rod'],
    ],
    surf: [
      ['tentacool', 40],
      ['lombre', 25],
      ['marill', 25],
    ],
  },
  'rotas-123-124-mossdeep': {
    fish: [
      ['tentacool', 50, 'old-rod'],
      ['wailmer', 30, 'good-rod'],
      ['carvanha', 30, 'good-rod'],
      ['horsea', 20, 'super-rod'],
      ['sharpedo', 10, 'super-rod'],
    ],
    surf: [
      ['wailmer', 40],
      ['tentacool', 30],
      ['pelipper', 20],
      ['wailord', 3],
    ],
  },
  'caverna-seafloor': {
    fish: [
      ['tentacool', 40, 'old-rod'],
      ['chinchou', 30, 'good-rod'],
      ['lanturn', 15, 'super-rod'],
      ['relicanth', 5, 'super-rod'],
    ],
    surf: [
      ['tentacruel', 40],
      ['wailmer', 35],
      ['sharpedo', 15],
      ['wailord', 4],
    ],
  },
  // --- Sinnoh ---
  'rota-209-hearthome': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['goldeen', 30, 'good-rod'],
      ['seaking', 15, 'super-rod'],
      ['gyarados', 5, 'super-rod'],
    ],
    surf: [
      ['psyduck', 40],
      ['bibarel', 30],
      ['golduck', 15],
    ],
  },
  'grande-pantano': {
    fish: [
      ['magikarp', 40, 'old-rod'],
      ['barboach', 40, 'old-rod'],
      ['quagsire', 25, 'good-rod'],
      ['whiscash', 15, 'super-rod'],
    ],
    surf: [
      ['wooper', 40],
      ['marill', 30],
      ['quagsire', 15],
    ],
  },
  'rota-222-sunyshore': {
    fish: [
      ['magikarp', 40, 'old-rod'],
      ['tentacool', 40, 'old-rod'],
      ['horsea', 30, 'good-rod'],
      ['corphish', 30, 'good-rod'],
      ['seadra', 12, 'super-rod'],
      ['sharpedo', 10, 'super-rod'],
    ],
    surf: [
      ['buizel', 40],
      ['pelipper', 30],
      ['tentacruel', 30],
    ],
  },
  // --- Unova ---
  'unova-rotas-1-3': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['goldeen', 30, 'good-rod'],
      ['tympole', 30, 'good-rod'],
      ['seaking', 10, 'super-rod'],
    ],
    surf: [
      ['ducklett', 40],
      ['psyduck', 40],
    ],
  },
  'pinwheel-castelia': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['tympole', 30, 'good-rod'],
      ['frillish', 20, 'super-rod'],
    ],
    surf: [
      ['frillish', 40],
      ['ducklett', 30],
      ['jellicent', 8],
    ],
  },
  'rota-6-driftveil': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['tynamo', 30, 'good-rod'],
      ['tympole', 30, 'good-rod'],
      ['eelektrik', 10, 'super-rod'],
    ],
    surf: [
      ['ducklett', 40],
      ['frillish', 30],
      ['swanna', 15],
    ],
  },
  dragonspiral: {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['gyarados', 10, 'super-rod'],
      ['dratini', 10, 'super-rod'],
      ['dragonair', 3, 'super-rod'],
    ],
    surf: [
      ['ducklett', 40],
      ['swanna', 20],
    ],
  },
  // --- Kalos ---
  'kalos-coumarine': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['clauncher', 30, 'good-rod'],
      ['skrelp', 30, 'good-rod'],
      ['gyarados', 10, 'super-rod'],
      ['clawitzer', 5, 'super-rod'],
    ],
    surf: [
      ['tentacool', 40],
      ['wingull', 30],
      ['pelipper', 15],
      ['lapras', 3],
    ],
  },
  'kalos-laverre': {
    fish: [
      ['magikarp', 50, 'old-rod'],
      ['poliwag', 30, 'good-rod'],
      ['quagsire', 20, 'super-rod'],
    ],
    surf: [
      ['quagsire', 40],
      ['goomy', 10],
    ],
  },
};

/** Nome e imagem das varas e da HM (as varas e o Surf são melhorias do Poké Mart). */
export const WATER_ITEMS: Record<string, ItemData> = {
  'old-rod': { id: 'old-rod', name: 'Old Rod', sprite: 'sprites/items/old-rod.png' },
  'good-rod': { id: 'good-rod', name: 'Good Rod', sprite: 'sprites/items/good-rod.png' },
  'super-rod': { id: 'super-rod', name: 'Super Rod', sprite: 'sprites/items/super-rod.png' },
  surf: { id: 'surf', name: 'HM Surf', sprite: 'sprites/items/hm-water.png' },
};
