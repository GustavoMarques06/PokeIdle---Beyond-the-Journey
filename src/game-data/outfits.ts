// Roupas do treinador: cada avatar tem peças (boné, camisa, jaqueta, calça…) que podem ser
// repintadas. Os sprites têm poucas cores e a mesma cor aparece em peças diferentes (o vermelho
// do boné do Red é o da camiseta), então cada peça é "estas cores dentro destes retângulos".

import type { PlayerAvatar } from './routes';

export type OutfitPart = 'hat' | 'top' | 'jacket' | 'bottom';

/** Cor escolhida para cada peça (índice em OUTFIT_COLORS); peça ausente = cor original. */
export type TrainerOutfit = Partial<Record<OutfitPart, number>>;

export const OUTFIT_PART_ORDER: OutfitPart[] = ['hat', 'jacket', 'top', 'bottom'];

export interface OutfitPiece {
  part: OutfitPart;
  /** Nome da peça neste avatar ("Boné", "Saia"…). */
  label: string;
  /** Cores do sprite (hex sem #) que pertencem à peça. */
  colors: string[];
  /** Retângulos [x0, y0, x1, y1] (inclusivos, no quadro de 80×80) onde a peça fica. */
  rects: [number, number, number, number][];
  /** Cores da peça que também são o contorno do desenho: ganham o tom novo, mas continuam escuras. */
  outline?: string[];
}

export const OUTFIT_COLORS: { name: string; hex: string }[] = [
  { name: 'Vermelho', hex: 'd03838' },
  { name: 'Laranja', hex: 'e87830' },
  { name: 'Amarelo', hex: 'e8c030' },
  { name: 'Verde', hex: '48a048' },
  { name: 'Verde-água', hex: '30a8a0' },
  { name: 'Azul', hex: '3868c8' },
  { name: 'Celeste', hex: '60b0e8' },
  { name: 'Roxo', hex: '8050c0' },
  { name: 'Rosa', hex: 'e868a8' },
  { name: 'Marrom', hex: '8a5a3a' },
  { name: 'Preto', hex: '383840' },
  { name: 'Cinza', hex: '9898a8' },
  { name: 'Branco', hex: 'f0f0f0' },
];

const NAVY_FRLG = ['182850', '306888', '5088b0', '78b8d8'];
const RED_FRLG = ['c04040', 'f86058'];
const NAVY_RSE = ['182952', '4a5a83', '627b9c'];
const RED_RSE = ['c54141', 'ff625a'];
const GREEN_RSE = ['629c5a', '8bde73'];

export const AVATAR_OUTFITS: Record<PlayerAvatar, OutfitPiece[]> = {
  red: [
    { part: 'hat', label: 'Boné', colors: RED_FRLG, rects: [[33, 13, 50, 22]] },
    { part: 'jacket', label: 'Jaqueta', colors: ['182850', '306888'], rects: [[24, 27, 53, 46]] },
    { part: 'top', label: 'Camiseta', colors: RED_FRLG, rects: [[34, 31, 49, 47]] },
    { part: 'bottom', label: 'Calça', colors: NAVY_FRLG, rects: [[27, 47, 57, 65]] },
  ],
  leaf: [
    { part: 'hat', label: 'Chapéu', colors: ['d0d0d8', 'f8f8f8'], rects: [[31, 13, 50, 22]] },
    { part: 'top', label: 'Blusa', colors: ['306888', '5088b0', '78b8d8'], rects: [[34, 31, 47, 41]] },
    { part: 'bottom', label: 'Saia', colors: RED_FRLG, rects: [[32, 41, 50, 50]] },
  ],
  brendan: [
    { part: 'hat', label: 'Gorro', colors: GREEN_RSE, rects: [[31, 16, 47, 23]] },
    { part: 'jacket', label: 'Jaqueta', colors: NAVY_RSE, rects: [[27, 31, 55, 44]], outline: ['182952'] },
    { part: 'top', label: 'Camisa', colors: RED_RSE, rects: [[34, 32, 46, 46]] },
    { part: 'bottom', label: 'Calça', colors: NAVY_RSE, rects: [[31, 45, 50, 60]], outline: ['182952'] },
  ],
  may: [
    { part: 'hat', label: 'Bandana', colors: GREEN_RSE, rects: [[25, 15, 44, 22]] },
    { part: 'top', label: 'Blusa', colors: RED_RSE, rects: [[33, 31, 46, 47]] },
    {
      part: 'bottom',
      label: 'Bermuda',
      colors: ['293941', '626273', 'cdcdde'],
      rects: [[32, 45, 47, 51]],
      outline: ['293941'],
    },
  ],
  brendan_rs: [
    { part: 'hat', label: 'Gorro', colors: RED_RSE, rects: [[33, 17, 47, 22]] },
    { part: 'jacket', label: 'Jaqueta', colors: NAVY_RSE, rects: [[27, 31, 55, 44]], outline: ['182952'] },
    { part: 'top', label: 'Detalhes', colors: RED_RSE, rects: [[27, 31, 55, 46]] },
    { part: 'bottom', label: 'Calça', colors: NAVY_RSE, rects: [[30, 45, 50, 59]], outline: ['182952'] },
  ],
  may_rs: [
    { part: 'hat', label: 'Bandana', colors: RED_RSE, rects: [[25, 15, 44, 22]] },
    { part: 'top', label: 'Blusa', colors: RED_RSE, rects: [[30, 31, 46, 40]] },
    {
      part: 'bottom',
      label: 'Saia',
      colors: ['ffffff', 'cdcdde', '626273', '293941'],
      rects: [[31, 42, 48, 51]],
      outline: ['293941'],
    },
  ],
};

/** Só as peças que o avatar tem, com cores válidas. */
export function cleanOutfit(avatar: PlayerAvatar, outfit: unknown): TrainerOutfit {
  const out: TrainerOutfit = {};
  if (!outfit || typeof outfit !== 'object') return out;
  for (const piece of AVATAR_OUTFITS[avatar] ?? []) {
    const c = (outfit as Record<string, unknown>)[piece.part];
    if (Number.isInteger(c) && (c as number) >= 0 && (c as number) < OUTFIT_COLORS.length)
      out[piece.part] = c as number;
  }
  return out;
}
