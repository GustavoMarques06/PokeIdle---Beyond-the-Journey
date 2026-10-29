// Roupa do treinador: o sprite do avatar é repintado num canvas, peça por peça (ver
// game-data/outfits.ts). Cada tom da peça vira o mesmo tom na cor nova, então sombra e brilho
// continuam no lugar. O resultado fica em cache por avatar e roupa.

import { useEffect, useState } from 'react';
import {
  AVATAR_OUTFITS,
  OUTFIT_COLORS,
  PLAYER_AVATARS,
  assetUrl,
  trainerSprite,
  type OutfitPiece,
  type PlayerAvatar,
  type TrainerOutfit,
} from '../game-data';

type Hsl = [number, number, number];

function hexToHsl(hex: string): Hsl {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: Hsl): [number, number, number] {
  if (!s) return [l, l, l].map((v) => Math.round(v * 255)) as [number, number, number];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const ch = (t: number) => {
    t = (t + 1) % 1;
    const v = t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p;
    return Math.round(v * 255);
  };
  return [ch(h + 1 / 3), ch(h), ch(h - 1 / 3)];
}

const hexOf = (d: Uint8ClampedArray, i: number) =>
  ((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]).toString(16).padStart(6, '0');

/**
 * Repinta as peças do avatar. O tom mais comum da peça vira a cor escolhida e os outros
 * mantêm a distância de claridade até ele (comprimida se passaria do branco ou do preto).
 */
export function recolorOutfit(
  d: Uint8ClampedArray,
  width: number,
  pieces: OutfitPiece[],
  outfit: TrainerOutfit,
) {
  // As peças são lidas antes de pintar: duas peças com a mesma cor não se misturam.
  const jobs: { pixels: number[]; target: Hsl; outline: Set<string> }[] = [];
  for (const piece of pieces) {
    const choice = outfit[piece.part];
    if (choice === undefined || !OUTFIT_COLORS[choice]) continue;
    const colors = new Set(piece.colors);
    const seen = new Set<number>();
    for (const [x0, y0, x1, y1] of piece.rects) {
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const i = (y * width + x) * 4;
          if (d[i + 3] && colors.has(hexOf(d, i))) seen.add(i);
        }
      }
    }
    const pixels = [...seen];
    if (pixels.length)
      jobs.push({ pixels, target: hexToHsl(OUTFIT_COLORS[choice].hex), outline: new Set(piece.outline) });
  }
  const originals = jobs.map((j) => j.pixels.map((i) => hexOf(d, i)));
  jobs.forEach(({ pixels, target, outline }, k) => {
    const counts = new Map<string, number>();
    for (const h of originals[k]) counts.set(h, (counts.get(h) ?? 0) + 1);
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const base = hexToHsl((ranked.find(([h]) => !outline.has(h)) ?? ranked[0])[0]);
    const shades = new Map([...counts.keys()].map((h) => [h, hexToHsl(h)[2] - base[2]]));
    const up = Math.max(0, ...shades.values());
    const down = Math.min(0, ...shades.values());
    const kUp = up > 0 ? Math.min(1, (0.97 - target[2]) / up) : 1;
    const kDown = down < 0 ? Math.min(1, (target[2] - 0.06) / -down) : 1;
    const paint = new Map(
      [...shades.entries()].map(([h, delta]) => {
        const l = target[2] + delta * (delta > 0 ? kUp : kDown);
        // O contorno continua escuro (só ganha o tom da cor), senão o desenho perde a borda.
        return [h, hslToRgb([target[0], target[1], outline.has(h) ? Math.min(l, hexToHsl(h)[2] + 0.12) : l])];
      }),
    );
    pixels.forEach((i, n) => d.set(paint.get(originals[k][n])!, i));
  });
}

const cache = new Map<string, string>();

const outfitKey = (avatar: string, outfit: TrainerOutfit | undefined) =>
  outfit && Object.keys(outfit).length
    ? `${avatar}|${Object.entries(outfit)
        .sort()
        .map(([p, c]) => `${p}${c}`)
        .join(',')}`
    : '';

/** URL do sprite do treinador com a roupa; enquanto prepara (ou sem roupa), o sprite original. */
export function useTrainerSprite(id: string, outfit?: TrainerOutfit): string | undefined {
  const src = assetUrl(trainerSprite(id));
  const pieces = PLAYER_AVATARS.includes(id as PlayerAvatar) ? AVATAR_OUTFITS[id as PlayerAvatar] : undefined;
  const key = pieces ? outfitKey(id, outfit) : '';
  const [, setReady] = useState(0);
  useEffect(() => {
    if (!key || !src || cache.has(key) || !pieces || !outfit) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        recolorOutfit(image.data, canvas.width, pieces, outfit);
        ctx.putImageData(image, 0, 0);
        cache.set(key, canvas.toDataURL());
      } catch {
        cache.set(key, src);
      }
      if (alive) setReady((n) => n + 1);
    };
    img.src = src;
    return () => {
      alive = false;
    };
    // `outfit` entra pela chave (um objeto novo com as mesmas cores não refaz o desenho).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, src]);
  return (key && cache.get(key)) || src;
}
