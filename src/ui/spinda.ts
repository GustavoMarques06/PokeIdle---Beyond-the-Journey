// Manchas do Spinda: como nos jogos, cada padrão (p0…p15) pinta as manchas em outro lugar.
// Não há sprite pronto de cada padrão: o desenho base é recolorido num canvas — as manchas
// originais viram pelo e quatro manchas novas são pintadas só sobre o pelo claro da cabeça.
// O resultado (um quadro parado) fica em cache por sprite e padrão.

import { useEffect, useState } from 'react';

export const SPINDA = 327;

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;

// Cores do sprite (normal e shiny): pelo claro, pelo sombreado, mancha e sombra da mancha.
const NORMAL = { fur: hex('e7d6a5'), furShade: hex('cea573'), spot: hex('ef524a'), spotShade: hex('bd4a31') };
const SHINY = { fur: hex('e6d5a4'), furShade: hex('cda473'), spot: hex('a4cd10'), spotShade: hex('7b9c00') };

const near = (d: Uint8ClampedArray, i: number, c: Rgb) =>
  Math.abs(d[i] - c[0]) + Math.abs(d[i + 1] - c[1]) + Math.abs(d[i + 2] - c[2]) < 24;
const paint = (d: Uint8ClampedArray, i: number, c: Rgb) => {
  d[i] = c[0];
  d[i + 1] = c[1];
  d[i + 2] = c[2];
};

/** Gerador determinístico por padrão (mulberry32). */
function seeded(seed: number) {
  let a = seed + 0x6d2b79f5;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function recolor(img: HTMLImageElement, pattern: number, shiny: boolean): string {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = image.data;
  const c = shiny ? SHINY : NORMAL;
  const w = canvas.width;

  // 1) As manchas originais viram pelo; 2) acha a área da cabeça (metade de cima do desenho).
  let top = Infinity;
  let bottom = -1;
  let left = Infinity;
  let right = -1;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    if (near(d, i, c.spot)) paint(d, i, c.fur);
    else if (near(d, i, c.spotShade)) paint(d, i, c.furShade);
    const x = (i / 4) % w;
    const y = Math.floor(i / 4 / w);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
    left = Math.min(left, x);
    right = Math.max(right, x);
  }
  if (bottom < 0) return canvas.toDataURL();
  const headBottom = top + (bottom - top) * 0.55;

  // 3) Quatro manchas: duas mais altas (orelhas/testa) e duas no rosto, posição pelo padrão.
  const rng = seeded(pattern * 7919 + 17);
  const spanX = right - left;
  const spots = [0, 1, 2, 3].map((k) => ({
    x: left + spanX * ((k % 2 === 0 ? 0.15 : 0.55) + rng() * 0.3),
    y: top + (headBottom - top) * ((k < 2 ? 0.1 : 0.5) + rng() * 0.4),
    r: 2.6 + rng() * 2.2,
  }));
  for (let y = top; y <= headBottom; y++) {
    for (let x = left; x <= right; x++) {
      const i = (y * w + x) * 4;
      if (!d[i + 3]) continue;
      const inside = spots.some((s) => (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r);
      if (!inside) continue;
      if (near(d, i, c.fur)) paint(d, i, c.spot);
      else if (near(d, i, c.furShade)) paint(d, i, c.spotShade);
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

const cache = new Map<string, string>();

/** Número do padrão (`p7` → 7), ou null se não for um padrão de Spinda. */
export const spindaPattern = (speciesId: number, form?: string): number | null =>
  speciesId === SPINDA && form && /^p\d+$/.test(form) ? Number(form.slice(1)) : null;

/** Sprite do Spinda com as manchas do padrão; enquanto prepara, devolve o sprite base. */
export function useSpindaSprite(src: string | undefined, pattern: number | null, shiny: boolean) {
  const key = src && pattern !== null ? `${src}|${pattern}|${shiny}` : '';
  const [, setReady] = useState(0);
  useEffect(() => {
    if (!key || cache.has(key) || !src) return;
    let alive = true;
    const img = new Image();
    img.onload = () => {
      try {
        cache.set(key, recolor(img, pattern!, shiny));
      } catch {
        cache.set(key, src);
      }
      if (alive) setReady((n) => n + 1);
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [key, src, pattern, shiny]);
  return (key && cache.get(key)) || src;
}
