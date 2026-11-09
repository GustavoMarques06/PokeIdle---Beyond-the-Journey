import speciesJson from './generated/species.json';
import movesJson from './generated/moves.json';
import typeChartJson from './generated/type-chart.json';
import itemsJson from './generated/items.json';
import spriteFeetJson from './generated/sprite-feet.json';
import type { Encounter, Evolution, Gender, ItemData, Move, Region, Route, Species, TypeName } from './types';
import { BALANCE, DEPT_STORE, EVOLUTION_ITEM_SHOP, SHOP, type ShopEntry } from './balance';
import { BERRIES } from './activities';
import { SPECIES_ABILITIES, TYPE_ABILITIES, type AbilityTriple } from './abilities';
import { HELD_ITEMS, TRAINING_ITEMS, extraItemData } from './helditems';
import { FOSSILS, REGIONS, ROUTES } from './routes';
import { RODS, WATER_ITEMS, WATER_SPOTS, type Rod, type WaterMode } from './water';
import { SAFARI_ITEMS } from './safari';
import { LURES, THROWABLE_BALLS } from './captureitems';

export * from './types';
export {
  AVATAR_NAMES,
  BADGES,
  EXPEDITIONS,
  FOSSILS,
  PLAYER_AVATARS,
  PLAYER_CHARACTERS,
  PRIZES,
  REGIONS,
  ROAMERS,
  ROUTES,
  STARTERS,
  STARTER_GENERATIONS,
  TM_POOL,
  type PlayerAvatar,
} from './routes';
export { BALANCE, DEPT_STORE, SHOP, type ShopEntry } from './balance';
export * from './meta';
export * from './megas';
export * from './supportMoves';
export * from './heights';
export * from './activities';
export * from './natures';
export * from './abilities';
export * from './helditems';
export * from './water';
export * from './forms';
export * from './safari';
export * from './outfits';
export * from './captureitems';

/**
 * Amizade, Hitmon* e Wurmple: a PokéAPI traz essas evoluções como "item" (Sino Calmante,
 * pedras); aqui viram evoluções por amizade e por condição.
 */
function withNaturalEvolutions(s: Species): Species {
  const level = (
    to: number,
    minLevel: number,
    cond: Extract<Evolution, { trigger: 'level' }>['cond'],
  ): Evolution => ({
    to,
    trigger: 'level',
    minLevel,
    cond,
  });
  if (s.slug === 'tyrogue') {
    return {
      ...s,
      evolutions: [level(106, 20, 'atk>def'), level(107, 20, 'def>atk'), level(237, 20, 'atk=def')],
    };
  }
  if (s.slug === 'wurmple') {
    return { ...s, evolutions: [level(266, 7, 'uid-even'), level(268, 7, 'uid-odd')] };
  }
  // Evoluções de um gênero só (a PokéAPI traz o gênero à parte).
  const onlyGender: Record<string, [number, Gender]> = {
    kirlia: [475, 'm'],
    snorunt: [478, 'f'],
    combee: [416, 'f'],
  };
  const gendered = onlyGender[s.slug];
  const evolutions = s.evolutions
    .map((e): Evolution =>
      e.trigger === 'item' && e.item === 'soothe-bell'
        ? { to: e.to, trigger: 'friendship', minFriendship: BALANCE.friendship.evolve, time: e.time }
        : e,
    )
    .map((e): Evolution => (gendered && e.to === gendered[0] ? { ...e, gender: gendered[1] } : e));
  return { ...s, evolutions };
}

export const SPECIES: Species[] = (speciesJson as Species[]).map(withNaturalEvolutions);
const speciesById = new Map(SPECIES.map((s) => [s.id, s]));
const speciesBySlug = new Map(SPECIES.map((s) => [s.slug, s]));
const moves = movesJson as unknown as Record<string, Move>;
const typeChart = typeChartJson as Record<TypeName, Record<TypeName, number>>;
const items: Record<string, ItemData> = {
  ...extraItemData(),
  ...WATER_ITEMS,
  ...SAFARI_ITEMS,
  ...(itemsJson as Record<string, ItemData>),
};
const routesById = new Map(ROUTES.map((r) => [r.id, r]));
const regionsById = new Map(REGIONS.map((r) => [r.id, r]));

export function getSpecies(id: number): Species {
  const s = speciesById.get(id);
  if (!s) throw new Error(`Espécie desconhecida: ${id}`);
  return s;
}

export function hasSpecies(id: number): boolean {
  return speciesById.has(id);
}

/**
 * Centro x e largura dos pés, linha mais baixa e mais alta desenhadas, em pixels do sprite, e o
 * quanto ele flutua na animação (fração da altura; Pokémon voadores ficam acima de 0,1).
 */
export type SpriteFeet = [
  cx: number,
  width: number,
  bottom: number,
  top: number,
  hover: number,
  imageWidth: number,
  imageHeight: number,
];

const spriteFeetById = spriteFeetJson as unknown as Record<string, { front?: SpriteFeet; back?: SpriteFeet }>;

/**
 * Onde o desenho de um sprite de batalha toca o chão (scripts/sprite-feet.py). Formas com sprite
 * próprio ("201-b") têm medidas próprias; as demais usam as da espécie.
 */
export function spriteFeet(id: number, kind: 'front' | 'back', form?: string): SpriteFeet | undefined {
  return (form ? spriteFeetById[`${id}-${form}`]?.[kind] : undefined) ?? spriteFeetById[id]?.[kind];
}

export function speciesId(slug: string): number {
  const s = speciesBySlug.get(slug);
  if (!s) throw new Error(`Espécie desconhecida: ${slug}`);
  return s.id;
}

export function getMove(id: string): Move {
  const m = moves[id];
  if (!m) throw new Error(`Golpe desconhecido: ${id}`);
  return m;
}

export function hasMove(id: string): boolean {
  return id in moves;
}

export function getItem(id: string): ItemData | undefined {
  return items[id];
}

export function getRoute(id: string): Route {
  const r = routesById.get(id);
  if (!r) throw new Error(`Rota desconhecida: ${id}`);
  return r;
}

export function hasRoute(id: string): boolean {
  return routesById.has(id);
}

export function getRegion(id: string): Region {
  const r = regionsById.get(id);
  if (!r) throw new Error(`Região desconhecida: ${id}`);
  return r;
}

export function routeIndex(id: string): number {
  return ROUTES.findIndex((r) => r.id === id);
}

/** Multiplicador de dano de um ataque do tipo `attack` contra os tipos `defender`. */
export function typeEffectiveness(attack: TypeName, defender: TypeName[]): number {
  const row = typeChart[attack] ?? {};
  return defender.reduce((mult, t) => mult * (row[t] ?? 1), 1);
}

/** Tipos defensores contra os quais `attack` é super efetivo. */
export function superEffectiveAgainst(attack: TypeName): TypeName[] {
  return Object.entries(typeChart[attack] ?? {})
    .filter(([, mult]) => mult > 1)
    .map(([t]) => t);
}

/** Tipos de golpe que causam mais dano (×2 ou ×4) e menos dano (÷2, ÷4 ou nenhum) nesses tipos defensores. */
export function matchupOf(defender: TypeName[]): {
  weak: [TypeName, number][];
  resist: [TypeName, number][];
} {
  const weak: [TypeName, number][] = [];
  const resist: [TypeName, number][] = [];
  for (const attack of Object.keys(typeChart)) {
    const m = typeEffectiveness(attack, defender);
    if (m > 1) weak.push([attack, m]);
    else if (m < 1) resist.push([attack, m]);
  }
  weak.sort((a, b) => b[1] - a[1]);
  resist.sort((a, b) => a[1] - b[1]);
  return { weak, resist };
}

const preEvolution = new Map<number, number>();
for (const s of SPECIES)
  for (const e of s.evolutions) if (!preEvolution.has(e.to)) preEvolution.set(e.to, s.id);

/** Espécie de que esta evolui (undefined na primeira da linha). */
export const preEvolutionOf = (speciesId: number): number | undefined => preEvolution.get(speciesId);

/** Primeira espécie da linha evolutiva (usada para maestria e ovos). */
export function lineRoot(speciesId: number): number {
  let id = speciesId;
  for (let guard = 0; preEvolution.has(id) && guard < 5; guard++) id = preEvolution.get(id)!;
  return id;
}

/** Habilidades da espécie: a própria entrada, a da pré-evolução mais próxima ou o padrão do tipo. */
export function abilitiesOf(speciesId: number): AbilityTriple {
  for (let id = speciesId, guard = 0; guard < 4; guard++) {
    const entry = SPECIES_ABILITIES[getSpecies(id).slug];
    if (entry) return entry;
    const pre = preEvolution.get(id);
    if (pre === undefined) break;
    id = pre;
  }
  return TYPE_ABILITIES[getSpecies(speciesId).types[0]] ?? ['run-away'];
}

/** Itens de evolução usados pelas espécies e que não estão no Poké Mart fixo. */
const fixedShop = new Set(SHOP.map((e) => e.id));
const evolutionItems = [
  ...new Set(SPECIES.flatMap((s) => s.evolutions.flatMap((e) => (e.trigger === 'item' ? [e.item] : [])))),
].filter((id) => !fixedShop.has(id) && items[id]);

/** Catálogo completo do Poké Mart: itens fixos, berries e itens de evolução. */
export const SHOP_CATALOG: ShopEntry[] = [
  ...SHOP,
  ...BERRIES.filter((b) => b.price > 0).map((b): ShopEntry => ({
    id: b.id,
    kind: 'item',
    price: b.price,
    requiresBoss: 'floresta-viridian',
  })),
  ...evolutionItems.map((id): ShopEntry => ({ id, kind: 'item', ...EVOLUTION_ITEM_SHOP })),
];

export type DeptSection = 'balls' | 'evolution' | 'held' | 'training' | 'berries' | 'fossils' | 'other';

export interface DeptEntry {
  id: string;
  price: number;
  section: DeptSection;
}

const BALL_IDS = THROWABLE_BALLS;
const LURE_IDS = Object.keys(LURES);
const allEvolutionItems = [
  ...new Set(SPECIES.flatMap((s) => s.evolutions.flatMap((e) => (e.trigger === 'item' ? [e.item] : [])))),
].filter((id) => items[id] && !(id in DEPT_STORE.prices));

/** Catálogo da Loja de Departamentos: todos os itens que têm uso no jogo. */
export const DEPT_STORE_CATALOG: DeptEntry[] = [
  ...BALL_IDS.map((id): DeptEntry => ({ id, price: DEPT_STORE.prices[id], section: 'balls' })),
  ...allEvolutionItems.sort().map((id): DeptEntry => ({
    id,
    price: DEPT_STORE.basicStones.includes(id) ? DEPT_STORE.basicStone : DEPT_STORE.evolutionItem,
    section: 'evolution',
  })),
  { id: 'rare-candy', price: DEPT_STORE.prices['rare-candy'], section: 'other' },
  ...LURE_IDS.map((id): DeptEntry => ({ id, price: DEPT_STORE.prices[id], section: 'other' })),
  ...HELD_ITEMS.filter((h) => h.price > 0).map((h): DeptEntry => ({
    id: h.id,
    price: h.price,
    section: 'held',
  })),
  ...TRAINING_ITEMS.map((t): DeptEntry => ({ id: t.id, price: t.price, section: 'training' })),
  ...BERRIES.map((b): DeptEntry => ({
    id: b.id,
    price: b.price > 0 ? b.price : DEPT_STORE.rareBerry,
    section: 'berries',
  })),
  ...FOSSILS.filter((f) => items[f.item]).map((f): DeptEntry => ({
    id: f.item,
    price: DEPT_STORE.fossil,
    section: 'fossils',
  })),
];

/** Preço de referência de cada item (Loja de Departamentos, depois Poké Mart); 0 = sem valor. */
const itemValues = new Map<string, number>();
for (const e of SHOP_CATALOG) if (e.kind === 'item') itemValues.set(e.id, e.price);
for (const e of DEPT_STORE_CATALOG) itemValues.set(e.id, e.price);

export function itemValue(id: string): number {
  return itemValues.get(id) ?? 0;
}

/** O que o mercador viajante pode trazer: itens caros de todas as seções, menos as bolas comuns. */
export const MERCHANT_POOL: DeptEntry[] = DEPT_STORE_CATALOG.filter(
  (e) => e.price >= 2000 && (e.section !== 'balls' || e.id === 'master-ball'),
);

// --- Pesca e Surf ------------------------------------------------------------------------

/** Encontros de água de uma rota (null se ela não tem esse tipo de água). */
export function waterEncounters(routeId: string, mode: WaterMode, rod: Rod | null): Encounter[] | null {
  const spot = WATER_SPOTS[routeId];
  const route = routesById.get(routeId);
  if (!spot || !route?.encounters.length) return null;
  const min = Math.min(...route.encounters.map((e) => e.minLevel));
  const max = Math.max(...route.encounters.map((e) => e.maxLevel));
  const offset = BALANCE.water.levelOffset;
  const levels = (shift: number) => ({
    minLevel: Math.max(2, Math.min(BALANCE.maxLevel, min + shift)),
    maxLevel: Math.max(2, Math.min(BALANCE.maxLevel, max + shift)),
  });
  if (mode === 'surf') {
    if (!spot.surf) return null;
    return spot.surf.map(([slug, weight]) => ({
      speciesId: speciesId(slug),
      weight,
      ...levels(offset.surf),
    }));
  }
  if (!spot.fish || !rod) return null;
  const tier = RODS.indexOf(rod);
  const list = spot.fish
    .filter(([, , need]) => RODS.indexOf(need) <= tier)
    .map(([slug, weight]) => ({ speciesId: speciesId(slug), weight, ...levels(offset[rod]) }));
  return list.length ? list : null;
}

export const trainerSprite = (id: string) => `sprites/trainers/${id}.png`;
export const badgeSprite = (id: string) => `sprites/badges/${id}.png`;

/** Caminho público de um asset (respeita o `base` do Vite). */
export function assetUrl(path: string | undefined): string | undefined {
  return path ? `${import.meta.env.BASE_URL}${path}` : undefined;
}
