// TMs: o catálogo numerado (TM01, TM02…), de onde vem cada um, a prateleira de TMs da Loja de
// Departamentos e o ensino direto pela Mochila. Um TM liberado ensina quantas vezes quiser.
// A numeração segue a campanha: primeiro os TMs dos líderes, na ordem dos ginásios, depois os
// prêmios (Torre, Game Corner, expedições) e por fim os demais golpes que alguma espécie aprende.

import {
  BALANCE,
  DEPT_STORE,
  PRIZES,
  ROUTES,
  SPECIES,
  TM_POOL,
  getMove,
  getSpecies,
  hasMove,
  type Route,
} from '../game-data';
import { findPokemon } from './collection';
import type { GameState } from './game';
import { setMoveset } from './moveset';
import { movesOf } from './pokemon';
import { atDeptStore } from './actions';

export interface TmDef {
  no: number;
  move: string;
}

const learnable = new Set(SPECIES.flatMap((s) => s.tmMoves));
const isTmMove = (m: string) => hasMove(m) && learnable.has(m);

/** Golpes entregues pelos líderes, na ordem dos ginásios (cada golpe só uma vez). */
const BOSS_TMS: { move: string; route: Route }[] = [];
for (const route of ROUTES) {
  const tm = route.boss?.reward.tm;
  if (tm && isTmMove(tm) && !BOSS_TMS.some((b) => b.move === tm)) BOSS_TMS.push({ move: tm, route });
}

const PRIZE_TMS = new Set(PRIZES.flatMap((p) => (p.kind === 'tm' ? [p.move] : [])));

const ordered = [
  ...BOSS_TMS.map((b) => b.move),
  ...TM_POOL.filter(isTmMove),
  ...[...PRIZE_TMS].filter(isTmMove),
  ...[...learnable].filter(hasMove).sort(),
];

export const TM_CATALOG: TmDef[] = [...new Set(ordered)].map((move, i) => ({ no: i + 1, move }));

const byMove = new Map(TM_CATALOG.map((t) => [t.move, t]));

export const isTm = (move: string) => byMove.has(move);

/** "TM07" (ou "TM" para golpes fora do catálogo). */
export function tmLabel(move: string): string {
  const def = byMove.get(move);
  return def ? `TM${String(def.no).padStart(2, '0')}` : 'TM';
}

export type TmSource =
  | { kind: 'boss'; routeId: string }
  | { kind: 'shop'; price: number; requiresBoss?: string }
  | { kind: 'tower' }
  | { kind: 'gamecorner' }
  | { kind: 'expedition' };

/** Campeão de cada região: depois dele, os TMs dos líderes daquela região vão para a prateleira. */
const championOf = new Map(ROUTES.filter((r) => r.boss?.champion).map((r) => [r.regionId, r.id]));

/** Preço na Loja de Departamentos, pelo poder do golpe. */
export function tmPrice(move: string): number {
  const power = getMove(move).power;
  const tiers = DEPT_STORE.tmPrices;
  return power >= 100
    ? tiers.strongest
    : power >= 85
      ? tiers.strong
      : power >= 65
        ? tiers.medium
        : tiers.basic;
}

/** Golpes fortes só entram na prateleira depois de certos ginásios. */
function shelfRequirement(move: string): string | undefined {
  const power = getMove(move).power;
  if (power >= 85) return DEPT_STORE.tmStrongUnlock;
  if (power >= 65) return DEPT_STORE.tmMediumUnlock;
  return undefined;
}

export interface TmShelfEntry {
  move: string;
  price: number;
  /** Chefe que precisa estar vencido para o TM aparecer (ausente = desde o início). */
  requiresBoss?: string;
}

/** Todos os TMs da loja: os de prêmio desde já, os dos líderes depois do Campeão da região. */
export const TM_SHELF: TmShelfEntry[] = TM_CATALOG.map(({ move }) => {
  const boss = BOSS_TMS.find((b) => b.move === move);
  return {
    move,
    price: tmPrice(move),
    requiresBoss: boss ? championOf.get(boss.route.regionId) : shelfRequirement(move),
  };
});

export function tmSources(move: string): TmSource[] {
  const out: TmSource[] = [];
  const boss = BOSS_TMS.find((b) => b.move === move);
  if (boss) out.push({ kind: 'boss', routeId: boss.route.id });
  if (TM_POOL.includes(move)) out.push({ kind: 'tower' }, { kind: 'expedition' });
  if (PRIZE_TMS.has(move)) out.push({ kind: 'gamecorner' });
  const shelf = TM_SHELF.find((e) => e.move === move);
  if (shelf) out.push({ kind: 'shop', price: shelf.price, requiresBoss: shelf.requiresBoss });
  return out;
}

/** TMs que a prateleira mostra agora (os já liberados aparecem como "tem"). */
export function tmShelf(state: GameState): TmShelfEntry[] {
  return TM_SHELF.filter((e) => !e.requiresBoss || state.routes[e.requiresBoss]?.bossDefeated);
}

/** Compra um TM na Loja de Departamentos (só estando lá, como os outros itens da loja). */
export function buyTm(state: GameState, move: string): boolean {
  if (!atDeptStore(state) || state.tms.includes(move)) return false;
  const entry = tmShelf(state).find((e) => e.move === move);
  if (!entry || state.coins < entry.price) return false;
  state.coins -= entry.price;
  state.tms.push(move);
  return true;
}

/** Pode aprender o TM: a espécie aprende o golpe e o jogador já liberou o TM. */
export function canLearnTm(state: GameState, speciesId: number, move: string): boolean {
  return state.tms.includes(move) && getSpecies(speciesId).tmMoves.includes(move);
}

/**
 * Ensina o TM: entra no lugar de `replace` ou, com menos de 4 golpes, na próxima vaga.
 * O Pokémon passa a usar golpes escolhidos à mão (os atuais + o novo).
 */
export function teachTm(state: GameState, uid: number, move: string, replace?: string): boolean {
  const p = findPokemon(state, uid);
  if (!p || !canLearnTm(state, p.speciesId, move)) return false;
  const current = movesOf(p);
  if (current.includes(move)) return false;
  let next: string[];
  if (replace) {
    if (!current.includes(replace)) return false;
    next = current.map((m) => (m === replace ? move : m));
  } else {
    if (current.length >= BALANCE.maxMoves) return false;
    next = [...current, move];
  }
  return setMoveset(state, uid, next);
}
