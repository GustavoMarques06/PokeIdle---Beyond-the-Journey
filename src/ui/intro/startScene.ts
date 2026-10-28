// Fundo da tela de "Pressione Start", pintado pixel a pixel numa tela de 240×160 (GBA).
//
// Composição em faixas horizontais, como as telas de título de portátil:
//   barra colorida · faixa preta · céu claro (logo e lendário) · nuvens e grama com a
//   fileira de Pokémon · faixa preta ("Pressione Start") · barra de rodapé (copyright).
// Acabamento: frisos de 1 px nas bordas das faixas, listras horizontais de luz no céu,
// degradês só em faixas com dithering ordenado. Cores derivadas do lendário em destaque.

export const GBA_W = 240;
export const GBA_H = 160;

/**
 * Área pintada: a tela se estica para ocupar a janela inteira. `w`×`h` em pixels virtuais
 * (no mínimo 240×160). Quando sobra altura (celular em pé), o céu cresce para baixo: `oy`
 * empurra a grama e tudo abaixo dela; o logo continua no alto e o rodapé, embaixo.
 */
export interface StartLayout {
  w: number;
  h: number;
  oy: number;
}

/** Altura do rodapé, contada a partir da borda de baixo. */
export const FOOTER_H = 11;

/** Limites das faixas, em pixels virtuais. */
export const BANDS = {
  topBar: 6,
  skyTop: 16,
  grassTop: 104,
  skyBottom: 116,
  footer: 149,
} as const;

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const css = (c: RGB) => `rgb(${c[0]},${c[1]},${c[2]})`;
const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
/** Verde de grama de GBA; só um toque da cor do lendário, para não virar lama. */
const GRASS: RGB = [80, 184, 72];

/** Paleta da tela a partir da cor do lendário. */
function palette(glowHex: string) {
  const glow = hexToRgb(glowHex);
  const grass = mix(GRASS, glow, 0.12);
  return {
    bar: mix(glow, WHITE, 0.1),
    barLight: mix(glow, WHITE, 0.5),
    footer: mix(glow, BLACK, 0.4),
    footerLight: mix(glow, BLACK, 0.1),
    skyHigh: mix(glow, WHITE, 0.4),
    skyLow: mix(glow, WHITE, 0.82),
    cloud: mix(glow, WHITE, 0.94),
    cloudShade: mix(glow, WHITE, 0.7),
    grass,
    grassDark: mix(grass, BLACK, 0.38),
    grassDeep: mix(grass, BLACK, 0.6),
    grassLight: mix(grass, WHITE, 0.4),
  };
}

function rngFor(seed: number) {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function fill(c: CanvasRenderingContext2D, color: RGB, x: number, y: number, w: number, h: number) {
  c.fillStyle = css(color);
  c.fillRect(x, y, w, h);
}

/** Nuvem fofa: bolotas de alturas diferentes sobre uma base reta, com sombra embaixo. */
function cloud(c: CanvasRenderingContext2D, x: number, base: number, w: number, top: RGB, shade: RGB) {
  const bumps = Math.max(3, Math.round(w / 9));
  for (let i = 0; i < bumps; i++) {
    const cx = x + ((i + 0.5) * w) / bumps;
    const r = Math.round((w / bumps) * (i % 2 ? 0.75 : 1.05));
    for (let dy = -r; dy <= 0; dy++) {
      const half = Math.round(r * Math.sqrt(1 - (dy / r) ** 2));
      fill(c, dy > -2 ? shade : top, Math.round(cx - half), base + dy, half * 2, 1);
    }
  }
}

export function paintStartBackground(glowHex: string, { w: W, h: H, oy }: StartLayout): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const B = {
    topBar: BANDS.topBar,
    skyTop: BANDS.skyTop,
    grassTop: BANDS.grassTop + oy,
    skyBottom: BANDS.skyBottom + oy,
    footer: H - FOOTER_H,
  };
  const c = canvas.getContext('2d')!;
  const p = palette(glowHex);

  fill(c, BLACK, 0, 0, W, H);
  // Barra do topo, com friso claro embaixo.
  fill(c, p.bar, 0, 0, W, B.topBar);
  fill(c, p.barLight, 0, B.topBar - 1, W, 1);

  // Céu: mais forte no alto, clareando para baixo, em faixas com dithering, e listras
  // horizontais de luz (2 px a cada 6) como nos fundos de GBA.
  const skyH = B.grassTop - B.skyTop;
  const img = c.createImageData(W, skyH);
  const steps = 7;
  for (let y = 0; y < skyH; y++) {
    const level = (y / (skyH - 1)) * (steps - 1);
    const stripe = y % 6 < 2 ? 0.06 : 0;
    for (let x = 0; x < W; x++) {
      const base = Math.floor(level);
      const step = Math.min(steps - 1, base + (level - base > BAYER[y & 3][x & 3] / 16 ? 1 : 0));
      const [r, g, b] = mix(mix(p.skyHigh, p.skyLow, step / (steps - 1)), WHITE, stripe);
      const o = (y * W + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  c.putImageData(img, 0, B.skyTop);
  fill(c, p.barLight, 0, B.skyTop, W, 1);

  // Duas fileiras de nuvens atrás da grama: a de trás mais alta e apagada.
  const rnd = rngFor(parseInt(glowHex.slice(1), 16));
  for (let x = -20; x < W; x += 30 + Math.floor(rnd() * 16)) {
    cloud(
      c,
      x,
      B.grassTop - 4,
      26 + Math.floor(rnd() * 14),
      mix(p.cloud, p.skyLow, 0.5),
      mix(p.cloudShade, p.skyLow, 0.6),
    );
  }
  for (let x = -12; x < W; x += 26 + Math.floor(rnd() * 14)) {
    cloud(c, x, B.grassTop + 2, 22 + Math.floor(rnd() * 12), p.cloud, p.cloudShade);
  }

  // Grama: topo em tufos pontudos, faixas mais escuras embaixo e borda funda.
  const groundTop = B.grassTop + 3;
  fill(c, p.grass, 0, groundTop, W, B.skyBottom - groundTop);
  for (let x = 0; x < W; x += 4) {
    // Tufo em "V" invertido: 4 px de largura, 3 de altura.
    fill(c, p.grass, x, groundTop - 1, 4, 1);
    fill(c, p.grass, x + 1, groundTop - 2, 2, 1);
    fill(c, p.grassLight, x + 1, groundTop - 3, 1, 1);
    fill(c, p.grassLight, x + 1, groundTop - 2, 1, 1);
  }
  for (let x = 0; x < W; x += 8) {
    fill(c, p.grassDark, x + 2, groundTop + 3, 3, 1);
    fill(c, p.grassDark, x + 6, groundTop + 6, 2, 1);
  }
  fill(c, p.grassDark, 0, B.skyBottom - 3, W, 1);
  fill(c, p.grassDeep, 0, B.skyBottom - 2, W, 2);

  // Rodapé com friso claro em cima.
  fill(c, p.footer, 0, B.footer, W, H - B.footer);
  fill(c, p.footerLight, 0, B.footer, W, 1);
  return canvas;
}

/** Tufos de grama na frente dos Pokémon que marcham (canvas próprio, por cima deles). */
export function paintGrassFront(glowHex: string, W: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = 8;
  const c = canvas.getContext('2d')!;
  const p = palette(glowHex);
  for (let x = 0; x < W; x += 6) {
    const h = 4 + ((x * 7) % 3);
    // Folhas em leque: centro alto, laterais mais baixas, ponta clara.
    fill(c, p.grassDark, x, 8 - h + 2, 1, h - 2);
    fill(c, p.grass, x + 1, 8 - h, 2, h);
    fill(c, p.grassDark, x + 3, 8 - h + 1, 1, h - 1);
    fill(c, p.grass, x + 4, 8 - h + 3, 1, h - 3);
    fill(c, p.grassLight, x + 1, 8 - h, 1, 1);
  }
  return canvas;
}

// --- brilhos -----------------------------------------------------------------------

export interface Particle {
  step(c: CanvasRenderingContext2D, dt: number, t: number): void;
}

/** Estrelas de quatro pontas piscando em volta do logo, crescendo e sumindo em degraus. */
export function startSparkles(): Particle[] {
  const spots: [number, number, number][] = [
    [10, 20, 0],
    [150, 22, 700],
    [118, 64, 1300],
  ];
  return spots.map(([sx, sy, offset]) => ({
    step(c, _dt, t) {
      const phase = Math.floor(((t + offset) % 2000) / 140);
      const size = [0, 1, 2, 3, 2, 1][phase] ?? 0;
      if (!size) return;
      c.fillStyle = '#ffffff';
      c.fillRect(sx - size, sy, size * 2 + 1, 1);
      c.fillRect(sx, sy - size, 1, size * 2 + 1);
    },
  }));
}
