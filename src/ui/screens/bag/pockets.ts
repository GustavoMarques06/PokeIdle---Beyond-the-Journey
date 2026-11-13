// Bolsos da MOCHILA, como nos portáteis: cada item vai para um bolso pelo que ele é (bola, berry, pedra de
// evolução, item de segurar…). Também guarda, só neste aparelho, quais itens já foram vistos (a etiqueta NOVO) e a
// ordem escolhida em ORGANIZAR.

import {
  BERRIES,
  MEGAS,
  REGIONAL_EVOLUTIONS,
  SHOP,
  SPECIES,
  THROWABLE_BALLS,
  getItem,
  isHeldItem,
  vitaminStat,
} from '../../../game-data';

export type PocketId = 'items' | 'balls' | 'medicine' | 'stones' | 'held' | 'tms' | 'key';

export interface PocketDef {
  id: PocketId;
  label: string;
  /** Ícone da aba (um item do jogo). */
  icon: string;
  /** Quadro da mochila em public/sprites/ui/bag.png (scripts/build-bag.py). */
  frame: number;
}

export const POCKETS: PocketDef[] = [
  { id: 'items', label: 'ITENS', icon: 'nugget', frame: 0 },
  { id: 'balls', label: 'POKé BALLS', icon: 'poke-ball', frame: 1 },
  { id: 'medicine', label: 'BERRIES E REMÉDIOS', icon: 'oran-berry', frame: 2 },
  { id: 'stones', label: 'PEDRAS E MEGAS', icon: 'fire-stone', frame: 3 },
  { id: 'held', label: 'ITENS DE SEGURAR', icon: 'leftovers', frame: 4 },
  { id: 'tms', label: 'ESTOJO DE TMs', icon: 'tm-case', frame: 5 },
  { id: 'key', label: 'ITENS-CHAVE', icon: 'old-rod', frame: 6 },
];

const BALLS = new Set(THROWABLE_BALLS);
const BERRY_IDS = new Set(BERRIES.map((b) => b.id));
const EVOLUTION_ITEMS = new Set([
  ...SPECIES.flatMap((s) => s.evolutions.flatMap((e) => (e.trigger === 'item' ? [e.item] : []))),
  ...Object.values(REGIONAL_EVOLUTIONS).flatMap((list) =>
    list.flatMap((e) => (e.trigger === 'item' ? [e.item] : [])),
  ),
]);
const MEGA_STONES = new Set(MEGAS.map((m) => m.stone));

/** Bolso de um item da mochila (os TMs e os itens-chave têm bolsos próprios). */
export function itemPocket(id: string): PocketId {
  if (BALLS.has(id) || id.endsWith('-ball')) return 'balls';
  if (BERRY_IDS.has(id) || id === 'rare-candy' || vitaminStat(id)) return 'medicine';
  if (MEGA_STONES.has(id) || EVOLUTION_ITEMS.has(id)) return 'stones';
  if (isHeldItem(id)) return 'held';
  return 'items';
}

/** Itens-chave: as melhorias permanentes que são objetos (varas, Surf) e o estojo de TMs. */
export function keyItems(upgrades: string[]): string[] {
  const owned = SHOP.filter((e) => e.kind === 'upgrade' && upgrades.includes(e.id) && getItem(e.id)).map(
    (e) => e.id,
  );
  return ['tm-case', ...owned];
}

export type SortMode = 'type' | 'name' | 'count';
export const SORT_LABEL: Record<SortMode, string> = { type: 'TIPO', name: 'NOME', count: 'QUANTIDADE' };
export const nextSort = (m: SortMode): SortMode => (m === 'type' ? 'name' : m === 'name' ? 'count' : 'type');

// --- Só neste aparelho: itens já vistos e a ordem escolhida ---------------------------------------
const SEEN_KEY = 'pokeidle.bagSeen';
const SORT_KEY = 'pokeidle.bagSort';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento (aba anônima): a etiqueta NOVO e a ordem só valem até fechar.
  }
}

/**
 * Itens já vistos. Na primeira vez (sem registro), tudo o que já está na mochila conta como visto: a etiqueta NOVO é
 * para o que chega depois.
 */
export function loadSeen(current: string[]): Set<string> {
  const saved = read<string[] | null>(SEEN_KEY, null);
  if (saved) return new Set(saved);
  write(SEEN_KEY, current);
  return new Set(current);
}

export function saveSeen(seen: Set<string>): void {
  write(SEEN_KEY, [...seen]);
}

export const loadSort = (): SortMode => {
  const m = read<string>(SORT_KEY, 'type');
  return m === 'name' || m === 'count' ? m : 'type';
};
export const saveSort = (m: SortMode) => write(SORT_KEY, m);
