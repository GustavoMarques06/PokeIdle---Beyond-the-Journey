// PC: o sistema de armazenamento. A coleção fica em caixas de 30 espaços (6×5), com nome e papel
// de parede; a equipe (ativo, reservas e apoio) fica fora delas, como nos portáteis.
//
// O save guarda só onde cada Pokémon está (`state.pc`, opcional). A disposição é reconciliada
// com a coleção a cada leitura: quem saiu da coleção (transferido) libera o espaço, quem entrou
// (captura, ovo, saiu da equipe) vai para o primeiro espaço livre. Assim nenhum outro sistema
// precisa saber do PC.

import { getSpecies } from '../game-data';
import type { GameState } from './game';
import { potential } from './pokemon';

export const BOX_COLS = 6;
export const BOX_SIZE = 30;
/** Caixas que existem desde o começo; mais aparecem quando as anteriores enchem. */
export const MIN_BOXES = 8;
export const BOX_NAME_MAX = 14;

export const WALLPAPERS = [
  'campo',
  'floresta',
  'mar',
  'caverna',
  'deserto',
  'neve',
  'vulcao',
  'noite',
] as const;
export type Wallpaper = (typeof WALLPAPERS)[number];

export const isWallpaper = (v: unknown): v is Wallpaper => WALLPAPERS.includes(v as Wallpaper);

export const WALLPAPER_NAMES: Record<Wallpaper, string> = {
  campo: 'Campo',
  floresta: 'Floresta',
  mar: 'Mar',
  caverna: 'Caverna',
  deserto: 'Deserto',
  neve: 'Neve',
  vulcao: 'Vulcão',
  noite: 'Noite',
};

export interface PcBox {
  /** Vazio = nome padrão ("CAIXA 1"…). */
  name?: string;
  wallpaper?: Wallpaper;
  /** uid de cada espaço; 0 = vazio. Sempre BOX_SIZE posições depois de reconciliado. */
  slots: number[];
}

export interface PcState {
  boxes: PcBox[];
}

export interface PcSpot {
  box: number;
  slot: number;
}

export const boxName = (box: PcBox, i: number) => box.name || `CAIXA ${i + 1}`;
export const boxWallpaper = (box: PcBox, i: number): Wallpaper =>
  box.wallpaper ?? WALLPAPERS[i % WALLPAPERS.length];

/** Quem está na equipe (fica fora das caixas). */
export function teamUids(state: GameState): Set<number> {
  return new Set([state.activeUid, ...state.battleTeam, ...state.passives]);
}

/**
 * Disposição atual das caixas, sem alterar o estado: mantém quem já tinha lugar, tira quem
 * saiu da coleção ou está na equipe e põe os demais no primeiro espaço livre.
 */
export function pcLayout(state: GameState): PcBox[] {
  const team = teamUids(state);
  const stored = new Set(state.collection.filter((p) => !team.has(p.uid)).map((p) => p.uid));
  const placed = new Set<number>();
  const boxes: PcBox[] = (state.pc?.boxes ?? []).map((b) => ({
    ...(b.name ? { name: b.name } : {}),
    ...(b.wallpaper ? { wallpaper: b.wallpaper } : {}),
    slots: Array.from({ length: BOX_SIZE }, (_, i) => {
      const uid = b.slots[i] ?? 0;
      if (!uid || !stored.has(uid) || placed.has(uid)) return 0;
      placed.add(uid);
      return uid;
    }),
  }));
  const waiting = state.collection.filter((p) => stored.has(p.uid) && !placed.has(p.uid));
  let box = 0;
  let slot = 0;
  for (const p of waiting) {
    for (;;) {
      if (box >= boxes.length) boxes.push({ slots: Array(BOX_SIZE).fill(0) });
      if (!boxes[box].slots[slot]) break;
      if (++slot >= BOX_SIZE) {
        slot = 0;
        box++;
      }
    }
    boxes[box].slots[slot] = p.uid;
  }
  // Sempre ao menos MIN_BOXES e uma caixa com espaço sobrando no fim.
  while (boxes.length < MIN_BOXES || boxes[boxes.length - 1].slots.every((u) => u)) {
    boxes.push({ slots: Array(BOX_SIZE).fill(0) });
  }
  return boxes;
}

/** Grava a disposição reconciliada no estado (antes de qualquer mudança feita pelo jogador). */
export function syncPc(state: GameState): PcBox[] {
  const boxes = pcLayout(state);
  state.pc = { boxes };
  return boxes;
}

export function findInPc(boxes: PcBox[], uid: number): PcSpot | null {
  for (let box = 0; box < boxes.length; box++) {
    const slot = boxes[box].slots.indexOf(uid);
    if (slot >= 0) return { box, slot };
  }
  return null;
}

/** Move o que está em `from` para `to`; se `to` estiver ocupado, os dois trocam de lugar. */
export function movePc(state: GameState, from: PcSpot, to: PcSpot): boolean {
  const boxes = syncPc(state);
  const a = boxes[from.box]?.slots;
  const b = boxes[to.box]?.slots;
  if (!a || !b || from.slot >= BOX_SIZE || to.slot >= BOX_SIZE || !a[from.slot]) return false;
  [a[from.slot], b[to.slot]] = [b[to.slot], a[from.slot]];
  return true;
}

export function renameBox(state: GameState, index: number, name: string): void {
  const box = syncPc(state)[index];
  if (!box) return;
  const clean = name.trim().slice(0, BOX_NAME_MAX).toUpperCase();
  if (!clean || clean === `CAIXA ${index + 1}`) delete box.name;
  else box.name = clean;
}

export function setWallpaper(state: GameState, index: number, wallpaper: Wallpaper): void {
  const box = syncPc(state)[index];
  if (box && isWallpaper(wallpaper)) box.wallpaper = wallpaper;
}

export type PcSort = 'dex' | 'level' | 'potential' | 'type' | 'recent';

/** Organiza todas as caixas por um critério, enchendo da primeira em diante (nomes e papéis ficam). */
export function sortPc(state: GameState, by: PcSort): void {
  const boxes = syncPc(state);
  const byUid = new Map(state.collection.map((p) => [p.uid, p]));
  const all = boxes.flatMap((b) => b.slots.filter((u) => u)).map((u) => byUid.get(u)!);
  all.sort((a, b) => {
    switch (by) {
      case 'dex':
        return a.speciesId - b.speciesId || b.level - a.level;
      case 'level':
        return b.level - a.level || a.speciesId - b.speciesId;
      case 'potential':
        return potential(b.ivs) - potential(a.ivs) || b.level - a.level;
      case 'type':
        return (
          getSpecies(a.speciesId).types[0].localeCompare(getSpecies(b.speciesId).types[0]) ||
          a.speciesId - b.speciesId
        );
      case 'recent':
        return b.uid - a.uid;
    }
  });
  for (const b of boxes) b.slots.fill(0);
  all.forEach((p, i) => {
    const box = Math.floor(i / BOX_SIZE);
    while (boxes.length <= box) boxes.push({ slots: Array(BOX_SIZE).fill(0) });
    boxes[box].slots[i % BOX_SIZE] = p.uid;
  });
}
