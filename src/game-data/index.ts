import speciesJson from './generated/species.json';
import movesJson from './generated/moves.json';
import typeChartJson from './generated/type-chart.json';
import itemsJson from './generated/items.json';
import type { ItemData, Move, Region, Route, Species, TypeName } from './types';
import { DEPT_STORE, EVOLUTION_ITEM_SHOP, SHOP, type ShopEntry } from './balance';
import { BERRIES } from './activities';
import { FOSSILS, REGIONS, ROUTES } from './routes';

export * from './types';
export {
  BADGES,
  EXPEDITIONS,
  FOSSILS,
  PLAYER_AVATARS,
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
export * from './activities';
export * from './natures';

export const SPECIES: Species[] = speciesJson as Species[];
const speciesById = new Map(SPECIES.map((s) => [s.id, s]));
const speciesBySlug = new Map(SPECIES.map((s) => [s.slug, s]));
const moves = movesJson as Record<string, Move>;
const typeChart = typeChartJson as Record<TypeName, Record<TypeName, number>>;
const items = itemsJson as Record<string, ItemData>;
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

const preEvolution = new Map<number, number>();
for (const s of SPECIES)
  for (const e of s.evolutions) if (!preEvolution.has(e.to)) preEvolution.set(e.to, s.id);

/** Primeira espécie da linha evolutiva (usada para maestria e ovos). */
export function lineRoot(speciesId: number): number {
  let id = speciesId;
  for (let guard = 0; preEvolution.has(id) && guard < 5; guard++) id = preEvolution.get(id)!;
  return id;
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

export type DeptSection = 'balls' | 'evolution' | 'berries' | 'fossils' | 'other';

export interface DeptEntry {
  id: string;
  price: number;
  section: DeptSection;
}

const BALL_IDS = ['poke-ball', 'great-ball', 'ultra-ball', 'master-ball'];
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
  ...['rare-candy', 'everstone', 'soothe-bell'].map((id): DeptEntry => ({
    id,
    price: DEPT_STORE.prices[id],
    section: 'other',
  })),
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

export const trainerSprite = (id: string) => `sprites/trainers/${id}.png`;
export const badgeSprite = (id: string) => `sprites/badges/${id}.png`;

/** Caminho público de um asset (respeita o `base` do Vite). */
export function assetUrl(path: string | undefined): string | undefined {
  return path ? `${import.meta.env.BASE_URL}${path}` : undefined;
}
