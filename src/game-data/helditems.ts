// Itens seguráveis (um por Pokémon) e itens de treino, com o sprite oficial da PokéAPI. O `icon`
// (forma + cor em pixel art) só aparece se o sprite faltar.

import { MEGAS, megaStonePrice } from './megas';
import type { Ailment, ItemData, StatKey, TypeName } from './types';

export interface HeldItemDef {
  id: string;
  name: string;
  description: string;
  /** Sprite existente em public/sprites/items (senão usa `icon`). */
  sprite?: string;
  icon?: { glyph: string; color: string };
  /** Preço na Loja de Departamentos (0 = só aparece como recompensa). */
  price: number;
  stat?: Partial<Record<StatKey, number>>;
  /** Dano de todos os golpes. */
  damage?: number;
  /** Fração do HP máximo perdida a cada golpe que causa dano. */
  recoil?: number;
  physical?: number;
  special?: number;
  type?: { type: TypeName; mult: number };
  superEffective?: number;
  crit?: number;
  accuracy?: number;
  /** Fração do HP máximo recuperada a cada ação própria. */
  leftovers?: number;
  /** Fração do dano causado que volta como HP. */
  shellBell?: number;
  /** Sobrevive com 1 HP a um golpe fatal com HP cheio (consome o item na luta). */
  sash?: boolean;
  /** Fração do HP máximo que o atacante físico perde. */
  rocky?: number;
  /** Chance de agir antes (corta o intervalo pela metade). */
  quickClaw?: number;
  /** Berry: usada sozinha com HP ≤ 50% (cura) ou ao receber um status (cura). */
  berry?: { heal?: number; cures?: Ailment[] | 'all' };
  exp?: number;
  coins?: number;
  shiny?: number;
  /** Multiplica os ganhos de amizade. */
  friendship?: number;
  /** Multiplica as EVs ganhas no Campo de Treino. */
  training?: number;
  /** Impede a evolução. */
  everstone?: boolean;
  /** Mega Stone: libera a Mega Evolução da espécie em batalha (ver megas.ts). */
  megaStone?: boolean;
}

const TYPE_BOOSTERS: { id: string; name: string; type: TypeName; color: string }[] = [
  { id: 'charcoal', name: 'Charcoal', type: 'fire', color: '#e86830' },
  { id: 'mystic-water', name: 'Mystic Water', type: 'water', color: '#4890f0' },
  { id: 'miracle-seed', name: 'Miracle Seed', type: 'grass', color: '#58b848' },
  { id: 'magnet', name: 'Magnet', type: 'electric', color: '#f0d030' },
  { id: 'never-melt-ice', name: 'Never-Melt Ice', type: 'ice', color: '#90e0f0' },
  { id: 'black-belt', name: 'Black Belt', type: 'fighting', color: '#c04838' },
  { id: 'poison-barb', name: 'Poison Barb', type: 'poison', color: '#a050c8' },
  { id: 'soft-sand', name: 'Soft Sand', type: 'ground', color: '#d8b060' },
  { id: 'sharp-beak', name: 'Sharp Beak', type: 'flying', color: '#98a8f0' },
  { id: 'twisted-spoon', name: 'Twisted Spoon', type: 'psychic', color: '#f06898' },
  { id: 'silver-powder', name: 'Silver Powder', type: 'bug', color: '#a8c028' },
  { id: 'hard-stone', name: 'Hard Stone', type: 'rock', color: '#b8a048' },
  { id: 'spell-tag', name: 'Spell Tag', type: 'ghost', color: '#7060a8' },
  { id: 'dragon-fang', name: 'Dragon Fang', type: 'dragon', color: '#7038f8' },
  { id: 'black-glasses', name: 'Black Glasses', type: 'dark', color: '#705848' },
  { id: 'silk-scarf', name: 'Silk Scarf', type: 'normal', color: '#a8a878' },
];

const TYPE_TEXT: Record<TypeName, string> = {
  fire: 'Fogo',
  water: 'Água',
  grass: 'Planta',
  electric: 'Elétrico',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Venenoso',
  ground: 'Terra',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  normal: 'Normal',
};

const H = (def: HeldItemDef): HeldItemDef => def;

export const HELD_ITEMS: HeldItemDef[] = [
  H({
    id: 'leftovers',
    name: 'Leftovers',
    description: 'Recupera 1/16 do HP a cada ação.',
    icon: { glyph: 'bag', color: '#58b878' },
    price: 30000,
    leftovers: 0.0625,
  }),
  H({
    id: 'choice-band',
    name: 'Choice Band',
    description: 'Ataque ×1,3.',
    icon: { glyph: 'band', color: '#e05040' },
    price: 45000,
    stat: { atk: 1.3 },
  }),
  H({
    id: 'choice-specs',
    name: 'Choice Specs',
    description: 'Ataque Esp. ×1,3.',
    icon: { glyph: 'band', color: '#4880e0' },
    price: 45000,
    stat: { spAtk: 1.3 },
  }),
  H({
    id: 'choice-scarf',
    name: 'Choice Scarf',
    description: 'Velocidade ×1,3: ataca mais rápido.',
    icon: { glyph: 'band', color: '#e0b030' },
    price: 45000,
    stat: { spe: 1.3 },
  }),
  H({
    id: 'assault-vest',
    name: 'Assault Vest',
    description: 'Defesa Esp. ×1,4.',
    icon: { glyph: 'bag', color: '#6878a0' },
    price: 25000,
    stat: { spDef: 1.4 },
  }),
  H({
    id: 'life-orb',
    name: 'Life Orb',
    description: 'Dano ×1,25, mas perde 1/10 do HP a cada golpe.',
    icon: { glyph: 'orb', color: '#d86090' },
    price: 35000,
    damage: 1.25,
    recoil: 0.1,
  }),
  H({
    id: 'focus-sash',
    name: 'Focus Sash',
    description: 'Sobrevive uma vez por luta a um golpe fatal com HP cheio.',
    icon: { glyph: 'band', color: '#f0f0f0' },
    price: 15000,
    sash: true,
  }),
  H({
    id: 'expert-belt',
    name: 'Expert Belt',
    description: 'Golpes super efetivos causam 20% a mais.',
    icon: { glyph: 'band', color: '#4a5878' },
    price: 25000,
    superEffective: 1.2,
  }),
  H({
    id: 'shell-bell',
    name: 'Shell Bell',
    description: 'Recupera 1/8 do dano que causa.',
    icon: { glyph: 'bell', color: '#f0a8c8' },
    price: 20000,
    shellBell: 0.125,
  }),
  H({
    id: 'rocky-helmet',
    name: 'Rocky Helmet',
    description: 'Quem acerta um golpe físico perde 1/8 do HP.',
    icon: { glyph: 'gem', color: '#b09060' },
    price: 20000,
    rocky: 0.125,
  }),
  H({
    id: 'scope-lens',
    name: 'Scope Lens',
    description: '+8% de chance de golpe crítico.',
    icon: { glyph: 'gem', color: '#e08080' },
    price: 12000,
    crit: 0.08,
  }),
  H({
    id: 'wide-lens',
    name: 'Wide Lens',
    description: 'Precisão ×1,1.',
    icon: { glyph: 'gem', color: '#80c0e0' },
    price: 10000,
    accuracy: 1.1,
  }),
  H({
    id: 'quick-claw',
    name: 'Quick Claw',
    description: '20% de chance de agir antes a cada ação.',
    icon: { glyph: 'gem', color: '#d0a0f0' },
    price: 12000,
    quickClaw: 0.2,
  }),
  H({
    id: 'muscle-band',
    name: 'Muscle Band',
    description: 'Golpes físicos causam 10% a mais.',
    sprite: 'sprites/items/muscle-band.png',
    price: 10000,
    physical: 1.1,
  }),
  H({
    id: 'wise-glasses',
    name: 'Wise Glasses',
    description: 'Golpes especiais causam 10% a mais.',
    icon: { glyph: 'gem', color: '#f0d868' },
    price: 10000,
    special: 1.1,
  }),
  H({
    id: 'lucky-egg',
    name: 'Lucky Egg',
    description: 'O portador ativo ganha 25% a mais de EXP.',
    sprite: 'sprites/items/lucky-egg.png',
    price: 80000,
    exp: 0.25,
  }),
  H({
    id: 'amulet-coin',
    name: 'Amulet Coin',
    description: 'O portador ativo rende 25% a mais de moedas.',
    sprite: 'sprites/items/amulet-coin.png',
    price: 80000,
    coins: 0.25,
  }),
  H({
    id: 'shiny-charm',
    name: 'Shiny Charm',
    description: 'O portador ativo aumenta em 50% a chance de shiny.',
    sprite: 'sprites/items/shiny-charm.png',
    price: 200000,
    shiny: 0.5,
  }),
  H({
    id: 'macho-brace',
    name: 'Macho Brace',
    description: 'No Campo de Treino, rende o dobro de EVs.',
    sprite: 'sprites/items/macho-brace.png',
    price: 15000,
    training: 2,
  }),
  H({
    id: 'soothe-bell',
    name: 'Soothe Bell',
    description: 'Dobra a amizade ganha.',
    sprite: 'sprites/items/soothe-bell.png',
    price: 6000,
    friendship: 2,
  }),
  H({
    id: 'everstone',
    name: 'Everstone',
    description: 'O portador não evolui.',
    sprite: 'sprites/items/everstone.png',
    price: 2000,
    everstone: true,
  }),
  H({
    id: 'oran-berry',
    name: 'Oran Berry',
    description: 'Cura 25% do HP quando ele cai a 50% ou menos.',
    sprite: 'sprites/items/oran-berry.png',
    price: 0,
    berry: { heal: 0.25 },
  }),
  H({
    id: 'sitrus-berry',
    name: 'Sitrus Berry',
    description: 'Cura 40% do HP quando ele cai a 50% ou menos.',
    sprite: 'sprites/items/sitrus-berry.png',
    price: 0,
    berry: { heal: 0.4 },
  }),
  H({
    id: 'lum-berry',
    name: 'Lum Berry',
    description: 'Cura qualquer status ao recebê-lo.',
    sprite: 'sprites/items/lum-berry.png',
    price: 0,
    berry: { cures: 'all' },
  }),
  H({
    id: 'cheri-berry',
    name: 'Cheri Berry',
    description: 'Cura a paralisia ao recebê-la.',
    sprite: 'sprites/items/cheri-berry.png',
    price: 0,
    berry: { cures: ['paralysis'] },
  }),
  H({
    id: 'pecha-berry',
    name: 'Pecha Berry',
    description: 'Cura o veneno ao recebê-la.',
    sprite: 'sprites/items/pecha-berry.png',
    price: 0,
    berry: { cures: ['poison'] },
  }),
  ...TYPE_BOOSTERS.map((t) =>
    H({
      id: t.id,
      name: t.name,
      description: `Golpes de ${TYPE_TEXT[t.type]} causam 20% a mais.`,
      icon: { glyph: 'gem', color: t.color },
      price: 12000,
      type: { type: t.type, mult: 1.2 },
    }),
  ),
];

// Mega Stones: sprite oficial e preço alto (a Mega vale por um encontro inteiro).
HELD_ITEMS.push(
  ...MEGAS.map((m) =>
    H({
      id: m.stone,
      name: m.stoneName,
      description: `${m.name}: em batalha, ${m.name.replace(/^Mega /, '').replace(/ [XY]$/, '')} muda de forma até o fim do encontro (tipos e atributos da Mega). No manual, aperte MEGA; no automático, ocorre sozinho.`,
      sprite: `sprites/items/${m.stone}.png`,
      price: megaStonePrice(m),
      megaStone: true,
    }),
  ),
);

const heldById = new Map(HELD_ITEMS.map((h) => [h.id, h]));

export function getHeldItem(id: string | undefined): HeldItemDef | undefined {
  return id ? heldById.get(id) : undefined;
}

export function isHeldItem(id: string): boolean {
  return heldById.has(id);
}

/** Berries seguráveis: continuam sendo consumidas do estoque da Mochila quando usadas. */
export const isHeldBerry = (id: string) => !!heldById.get(id)?.berry;

// --- Itens de treino ------------------------------------------------------------------

export interface TrainingItemDef {
  id: string;
  name: string;
  description: string;
  icon: { glyph: string; color: string };
  price: number;
}

/** Vitaminas: +10 EVs no atributo (até 100 por vitamina) e +amizade. */
export const VITAMINS: (TrainingItemDef & { stat: StatKey })[] = [
  {
    id: 'hp-up',
    name: 'HP Up',
    stat: 'hp',
    description: '+10 EVs de HP (até 100 pelas vitaminas).',
    icon: { glyph: 'vial', color: '#e85858' },
    price: 9800,
  },
  {
    id: 'protein',
    name: 'Protein',
    stat: 'atk',
    description: '+10 EVs de Ataque (até 100 pelas vitaminas).',
    icon: { glyph: 'vial', color: '#e89030' },
    price: 9800,
  },
  {
    id: 'iron',
    name: 'Iron',
    stat: 'def',
    description: '+10 EVs de Defesa (até 100 pelas vitaminas).',
    icon: { glyph: 'vial', color: '#e8d038' },
    price: 9800,
  },
  {
    id: 'calcium',
    name: 'Calcium',
    stat: 'spAtk',
    description: '+10 EVs de Ataque Esp. (até 100 pelas vitaminas).',
    icon: { glyph: 'vial', color: '#6890f0' },
    price: 9800,
  },
  {
    id: 'zinc',
    name: 'Zinc',
    stat: 'spDef',
    description: '+10 EVs de Defesa Esp. (até 100 pelas vitaminas).',
    icon: { glyph: 'vial', color: '#78c850' },
    price: 9800,
  },
  {
    id: 'carbos',
    name: 'Carbos',
    stat: 'spe',
    description: '+10 EVs de Velocidade (até 100 pelas vitaminas).',
    icon: { glyph: 'vial', color: '#f870b0' },
    price: 9800,
  },
];

export const TRAINING_ITEMS: TrainingItemDef[] = [
  ...VITAMINS,
  {
    id: 'bottle-cap',
    name: 'Bottle Cap',
    description: 'Treino Supremo: leva um IV à escolha para 31 (Pokémon Nv. 50+).',
    icon: { glyph: 'cap', color: '#f0c830' },
    price: 80000,
  },
  {
    id: 'ability-capsule',
    name: 'Ability Capsule',
    description: 'Troca entre as duas habilidades comuns do Pokémon.',
    icon: { glyph: 'capsule', color: '#e85858' },
    price: 40000,
  },
  {
    id: 'ability-patch',
    name: 'Ability Patch',
    description: 'Libera a habilidade oculta do Pokémon (se a espécie tiver uma).',
    icon: { glyph: 'capsule', color: '#8858e8' },
    price: 150000,
  },
];

const trainingById = new Map(TRAINING_ITEMS.map((t) => [t.id, t]));

export function getTrainingItem(id: string): TrainingItemDef | undefined {
  return trainingById.get(id);
}

export function vitaminStat(id: string): StatKey | undefined {
  return VITAMINS.find((v) => v.id === id)?.stat;
}

/** Itens com o sprite oficial baixado da PokéAPI (public/sprites/items/<id>.png). */
const OFFICIAL_SPRITES = new Set([
  ...TYPE_BOOSTERS.map((t) => t.id),
  'leftovers',
  'choice-band',
  'choice-specs',
  'choice-scarf',
  'assault-vest',
  'life-orb',
  'focus-sash',
  'expert-belt',
  'shell-bell',
  'rocky-helmet',
  'scope-lens',
  'wide-lens',
  'quick-claw',
  'wise-glasses',
  ...VITAMINS.map((v) => v.id),
  'bottle-cap',
  'ability-capsule',
  'ability-patch',
]);

const spriteOf = (id: string, own?: string) =>
  own ?? (OFFICIAL_SPRITES.has(id) ? `sprites/items/${id}.png` : undefined);

/** Itens oficiais usados só como ícone da interface (Cabo Link, Automação, atividades…). */
const UI_ITEMS: Record<string, string> = {
  'linking-cord': 'Linking Cord',
  'vs-recorder': 'Vs. Recorder',
  'machine-part': 'Machine Part',
  'mystery-egg': 'Mystery Egg',
  'poke-radar': 'Poké Radar',
  'dynamax-band': 'Dynamax Band',
  'relic-crown': 'Relic Crown',
  'rainbow-pass': 'Rainbow Pass',
  'catching-charm': 'Catching Charm',
};

/** Entradas extras do catálogo de itens (nome e imagem), mescladas em index.ts. */
export function extraItemData(): Record<string, ItemData> {
  const out: Record<string, ItemData> = {};
  for (const [id, name] of Object.entries(UI_ITEMS))
    out[id] = { id, name, sprite: `sprites/items/${id}.png` };
  // Melhoria da loja sem item próprio: usa o Catching Charm (o amuleto de captura dos jogos).
  out['auto-capture'] = {
    id: 'auto-capture',
    name: 'Captura automática',
    sprite: 'sprites/items/catching-charm.png',
  };
  for (const h of HELD_ITEMS)
    out[h.id] = { id: h.id, name: h.name, sprite: spriteOf(h.id, h.sprite), icon: h.icon };
  for (const t of TRAINING_ITEMS)
    out[t.id] = { id: t.id, name: t.name, sprite: spriteOf(t.id), icon: t.icon };
  return out;
}

/** Sorteio de itens soltos por Pokémon selvagens e recompensas de raides. */
export const FOUND_ITEMS: { id: string; weight: number }[] = [
  ...['oran-berry', 'sitrus-berry', 'cheri-berry', 'pecha-berry'].map((id) => ({ id, weight: 10 })),
  { id: 'lum-berry', weight: 3 },
  ...TYPE_BOOSTERS.map((t) => ({ id: t.id, weight: 2 })),
  { id: 'muscle-band', weight: 2 },
  { id: 'wise-glasses', weight: 2 },
  { id: 'scope-lens', weight: 1 },
  { id: 'wide-lens', weight: 1 },
  { id: 'quick-claw', weight: 1 },
  { id: 'leftovers', weight: 1 },
  { id: 'shell-bell', weight: 1 },
];

/** Prêmios extras das raides e revanches. */
export const RAID_LOOT: { weight: number; items: Record<string, number> }[] = [
  { weight: 6, items: { 'rare-candy': 2 } },
  { weight: 5, items: { 'hp-up': 1, protein: 1 } },
  { weight: 5, items: { iron: 1, calcium: 1 } },
  { weight: 5, items: { zinc: 1, carbos: 1 } },
  { weight: 3, items: { 'bottle-cap': 1 } },
  { weight: 2, items: { 'ability-capsule': 1 } },
  { weight: 1, items: { 'ability-patch': 1 } },
  { weight: 4, items: { leftovers: 1 } },
  { weight: 3, items: { 'choice-band': 1 } },
  { weight: 3, items: { 'choice-specs': 1 } },
  { weight: 3, items: { 'life-orb': 1 } },
  { weight: 3, items: { 'focus-sash': 1 } },
  { weight: 2, items: { 'choice-scarf': 1 } },
];
