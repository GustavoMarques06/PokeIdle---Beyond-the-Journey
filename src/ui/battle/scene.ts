// Cenários de batalha desenhados proceduralmente em pixel art, numa tela virtual
// de 256×144 (proporção de janela de PC, densidade de GBA) ampliada sem suavização.
// Tudo é determinístico pela semente: a mesma rota sempre gera o mesmo cenário.

import type { SceneKey } from '../../game-data';

export type SceneTheme = 'meadow' | 'field' | 'forest' | 'mountain' | 'cave' | 'river';

export const SCENE_W = 256;
export const SCENE_H = 144;
/** Centro das plataformas (pés dos Pokémon), em pixels virtuais. */
export const ENEMY_BASE = { x: 184, y: 78 };
export const PLAYER_BASE = { x: 66, y: 138 };

type Ctx = CanvasRenderingContext2D;

interface Palette {
  sky: string[];
  cloud: [string, string];
  far: [string, string];
  tree: [string, string, string];
  trunk: string;
  ground: [string, string, string];
  path: [string, string, string];
  tall: [string, string, string];
  platform: [string, string, string];
  flowers: string[];
}

const PALETTES: Record<SceneTheme, Palette> = {
  meadow: {
    sky: ['#68b8f8', '#80c8f8', '#a0d8f8', '#c8ecf8'],
    cloud: ['#ffffff', '#d0e8f8'],
    far: ['#88b8d8', '#a8cce0'],
    tree: ['#206830', '#389048', '#58b058'],
    trunk: '#704828',
    ground: ['#70c060', '#80d070', '#60b050'],
    path: ['#d8b878', '#c8a060', '#a88048'],
    tall: ['#2f7838', '#48a048', '#88d868'],
    platform: ['#489840', '#68c058', '#90d878'],
    flowers: ['#f8f8f8', '#f8d030'],
  },
  field: {
    sky: ['#5898e8', '#78b0f0', '#98c8f8', '#c0e0f8'],
    cloud: ['#ffffff', '#c8dcf0'],
    far: ['#7898b8', '#98b8d0'],
    tree: ['#285830', '#3c8040', '#60a850'],
    trunk: '#684020',
    ground: ['#88c858', '#98d868', '#78b848'],
    path: ['#e0c088', '#d0a868', '#b08850'],
    tall: ['#3a7030', '#589840', '#a0d868'],
    platform: ['#58a040', '#78c050', '#a0d870'],
    flowers: ['#f85858', '#f8f8f8', '#f8d030'],
  },
  forest: {
    sky: ['#285838', '#306840', '#407850', '#508858'],
    cloud: ['#78a878', '#608c68'],
    far: ['#1c4028', '#245030'],
    tree: ['#143820', '#205830', '#307840'],
    trunk: '#503018',
    ground: ['#4c8c40', '#5c9c48', '#3c7c38'],
    path: ['#a08858', '#887048', '#685838'],
    tall: ['#1c5028', '#2c7038', '#60a050'],
    platform: ['#386c30', '#4c8c40', '#70b058'],
    flowers: ['#f8f0a0', '#c8e078'],
  },
  mountain: {
    sky: ['#f0b078', '#f8c890', '#f8dca8', '#f8ecd0'],
    cloud: ['#fff8f0', '#f0d8c0'],
    far: ['#a87868', '#c09080'],
    tree: ['#506838', '#688048', '#88a058'],
    trunk: '#604030',
    ground: ['#d0b080', '#e0c090', '#c0a070'],
    path: ['#b89060', '#a07848', '#805c38'],
    tall: ['#687838', '#88a048', '#b8c870'],
    platform: ['#a88858', '#c8a870', '#e0c890'],
    flowers: ['#f8f0e0', '#e8a060'],
  },
  cave: {
    sky: ['#181020', '#201828', '#282030', '#302838'],
    cloud: ['#403850', '#383048'],
    far: ['#3c3048', '#484058'],
    tree: ['#302838', '#403850', '#585068'],
    trunk: '#201820',
    ground: ['#605870', '#706880', '#504860'],
    path: ['#787088', '#686078', '#585068'],
    tall: ['#403850', '#585068', '#8880a0'],
    platform: ['#686078', '#887ea0', '#a8a0c0'],
    flowers: ['#a8e8f8', '#f8f8ff'],
  },
  river: {
    sky: ['#4890f0', '#68a8f8', '#90c8f8', '#c0e4f8'],
    cloud: ['#ffffff', '#d0e4f8'],
    far: ['#6090c0', '#88b0d8'],
    tree: ['#205830', '#348048', '#58a858'],
    trunk: '#684020',
    ground: ['#78c860', '#88d870', '#68b850'],
    path: ['#d8c090', '#c8a870', '#a88850'],
    tall: ['#2c7038', '#469848', '#88d070'],
    platform: ['#d8c890', '#e8d8a8', '#f8ecc8'],
    flowers: ['#f8f8f8', '#f888b8'],
  },
};

function rngFor(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** Elipse preenchida linha a linha (bordas em degraus, sem antisserrilhado). */
function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (half > 0) px(ctx, cx - half, cy + dy, half * 2, 1, color);
  }
}

/** Faixas horizontais com transição em xadrez (dithering), como nos céus de GBA. */
function bands(ctx: Ctx, y0: number, y1: number, colors: string[]) {
  const n = colors.length;
  const step = (y1 - y0) / n;
  for (let i = 0; i < n; i++) {
    const top = Math.round(y0 + i * step);
    px(ctx, 0, top, SCENE_W, Math.ceil(step) + 1, colors[i]);
    if (i > 0) {
      for (let y = top - 2; y < top; y++)
        for (let x = (y & 1) as number; x < SCENE_W; x += 2) px(ctx, x, y, 1, 1, colors[i]);
    }
  }
}

function cloud(ctx: Ctx, x: number, y: number, s: number, [light, shade]: [string, string]) {
  ellipse(ctx, x, y + 1, 9 * s, 3 * s, shade);
  ellipse(ctx, x - 6 * s, y, 6 * s, 3 * s, light);
  ellipse(ctx, x + 1 * s, y - 2 * s, 7 * s, 4 * s, light);
  ellipse(ctx, x + 8 * s, y, 5 * s, 3 * s, light);
}

function ridge(ctx: Ctx, rnd: () => number, base: number, amp: number, color: string, rough = 1) {
  let h = rnd() * amp;
  for (let x = 0; x < SCENE_W; x++) {
    h += (rnd() - 0.5) * 2 * rough;
    h = Math.max(0, Math.min(amp, h));
    px(ctx, x, base - h, 1, h + 40, color);
  }
}

function tree(ctx: Ctx, x: number, y: number, r: number, p: Palette) {
  px(ctx, x - 1, y, 3, 4, p.trunk);
  ellipse(ctx, x, y - r + 2, r, r, p.tree[0]);
  ellipse(ctx, x - 1, y - r + 1, r - 2, r - 2, p.tree[1]);
  ellipse(
    ctx,
    x - Math.ceil(r / 3),
    y - r - Math.floor(r / 3),
    Math.max(1, Math.floor(r / 3)),
    Math.max(1, Math.floor(r / 4)),
    p.tree[2],
  );
}

function treeLine(ctx: Ctx, rnd: () => number, baseY: number, p: Palette, density = 1) {
  for (let x = -6; x < SCENE_W + 8; x += Math.round(11 / density + rnd() * 6)) {
    tree(ctx, x, baseY + Math.round(rnd() * 3), 7 + Math.round(rnd() * 4), p);
  }
}

function tallGrass(ctx: Ctx, x0: number, y0: number, w: number, rows: number, p: Palette) {
  for (let r = 0; r < rows; r++) {
    const y = y0 + r * 5;
    for (let x = x0 + (r % 2) * 3; x < x0 + w; x += 6) {
      // Folha em "V" de 5 px de altura, contorno escuro e ponta clara.
      px(ctx, x, y + 1, 1, 5, p.tall[0]);
      px(ctx, x + 1, y + 2, 1, 4, p.tall[1]);
      px(ctx, x + 2, y, 1, 6, p.tall[1]);
      px(ctx, x + 3, y + 2, 1, 4, p.tall[1]);
      px(ctx, x + 4, y + 1, 1, 5, p.tall[0]);
      px(ctx, x + 2, y, 1, 1, p.tall[2]);
    }
  }
}

function platform(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, p: Palette) {
  ellipse(ctx, cx, cy + 2, rx + 2, ry + 1, p.platform[0]);
  ellipse(ctx, cx, cy, rx, ry, p.platform[1]);
  ellipse(ctx, cx, cy - 1, rx - 6, ry - 3, p.platform[2]);
  ellipse(ctx, cx, cy - 1, rx - 10, ry - 5, p.platform[1]);
}

function ground(ctx: Ctx, rnd: () => number, horizon: number, p: Palette) {
  px(ctx, 0, horizon, SCENE_W, SCENE_H - horizon, p.ground[0]);
  // Faixas de perspectiva: mais espaçadas perto da câmera.
  for (let i = 1, y = horizon + 2; y < SCENE_H; i++, y += 1 + i)
    px(ctx, 0, y, SCENE_W, 1, p.ground[i % 2 ? 1 : 2]);
  for (let i = 0; i < 70; i++) {
    const x = Math.floor(rnd() * SCENE_W);
    const y = horizon + 4 + Math.floor(rnd() * (SCENE_H - horizon - 4));
    px(ctx, x, y, 1, 2, p.tall[0]);
    px(ctx, x + 2, y - 1, 1, 3, p.tall[0]);
  }
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(rnd() * SCENE_W);
    const y = horizon + 6 + Math.floor(rnd() * (SCENE_H - horizon - 8));
    px(ctx, x, y, 2, 2, p.flowers[i % p.flowers.length]);
  }
}

function dirtPath(ctx: Ctx, horizon: number, p: Palette) {
  for (let y = horizon; y < SCENE_H; y++) {
    const t = (y - horizon) / (SCENE_H - horizon);
    const center = 128 - 20 * t + 6 * Math.sin(t * 5);
    const half = 6 + t * 30;
    px(ctx, center - half - 1, y, 1, 1, p.path[2]);
    px(ctx, center - half, y, half * 2, 1, p.path[0]);
    px(ctx, center + half, y, 1, 1, p.path[2]);
    if (y % 3 === 0) px(ctx, center - half / 2 + ((y * 7) % half), y, 2, 1, p.path[1]);
  }
}

function rocks(ctx: Ctx, rnd: () => number, horizon: number, p: Palette, n: number) {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(rnd() * SCENE_W);
    const y = horizon + 6 + Math.floor(rnd() * (SCENE_H - horizon - 10));
    const r = 2 + Math.floor(rnd() * 4);
    ellipse(ctx, x, y, r + 1, Math.max(1, r - 1), p.path[2]);
    ellipse(ctx, x - 1, y - 1, r, Math.max(1, r - 2), p.path[1]);
    px(ctx, x - r + 1, y - 2, 2, 1, p.path[0]);
  }
}

function water(ctx: Ctx, y0: number, y1: number) {
  bands(ctx, y0, y1, ['#a8d8f8', '#78b8f0', '#5898e0', '#4880d0']);
  for (let y = y0 + 3; y < y1; y += 4) {
    for (let x = (y * 13) % 23; x < SCENE_W; x += 23) px(ctx, x, y, 6, 1, '#e8f8ff');
  }
}

function caveBackdrop(ctx: Ctx, rnd: () => number, p: Palette) {
  bands(ctx, 0, 70, p.sky);
  ridge(ctx, rnd, 62, 26, p.far[0], 2);
  ridge(ctx, rnd, 70, 16, p.far[1], 2);
  // Estalactites.
  for (let x = 0; x < SCENE_W; x += 9 + Math.floor(rnd() * 10)) {
    const h = 6 + Math.floor(rnd() * 16);
    for (let i = 0; i < h; i++)
      px(ctx, x + Math.floor(i / 3), i, Math.max(1, 5 - Math.floor(i / 3)), 1, p.tree[1]);
  }
  // Pedras da Lua brilhando nas paredes.
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(rnd() * SCENE_W);
    const y = 10 + Math.floor(rnd() * 50);
    px(ctx, x, y, 1, 1, p.flowers[0]);
    px(ctx, x + 1, y + 1, 1, 1, p.flowers[1]);
  }
}

export function paintScene(ctx: Ctx, theme: SceneTheme, seed: string): void {
  const p = PALETTES[theme];
  const rnd = rngFor(seed);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, SCENE_W, SCENE_H);
  const horizon = 70;

  if (theme === 'cave') {
    caveBackdrop(ctx, rnd, p);
    ground(ctx, rnd, horizon, p);
    rocks(ctx, rnd, horizon, p, 14);
  } else {
    bands(ctx, 0, horizon, p.sky);
    if (theme !== 'forest') {
      for (let i = 0; i < 3; i++)
        cloud(ctx, 20 + i * 85 + rnd() * 30, 10 + rnd() * 22, 1 + Math.round(rnd()), p.cloud);
    }
    if (theme === 'mountain') {
      ridge(ctx, rnd, horizon - 4, 34, p.far[0], 2.2);
      ridge(ctx, rnd, horizon, 18, p.far[1], 1.6);
    } else {
      ridge(ctx, rnd, horizon - 8, 14, p.far[0], 0.8);
      ridge(ctx, rnd, horizon - 4, 8, p.far[1], 0.6);
    }
    if (theme === 'forest') {
      treeLine(ctx, rnd, horizon - 22, p, 1.6);
      treeLine(ctx, rnd, horizon - 10, p, 1.6);
      treeLine(ctx, rnd, horizon + 2, p, 1.4);
    } else if (theme !== 'mountain') {
      treeLine(ctx, rnd, horizon + 1, p);
    }

    if (theme === 'river') {
      ground(ctx, rnd, horizon, p);
      water(ctx, horizon + 6, horizon + 34);
    } else {
      ground(ctx, rnd, horizon, p);
    }
    if (theme === 'mountain') rocks(ctx, rnd, horizon, p, 12);
    if (theme !== 'river') dirtPath(ctx, horizon, p);
    if (theme === 'forest') {
      // Copas por cima, emoldurando o topo, e fachos de luz.
      for (let x = -10; x < SCENE_W + 10; x += 18) ellipse(ctx, x, -4, 16, 12, p.tree[0]);
      for (let x = 30; x < SCENE_W; x += 70) {
        for (let y = 8; y < horizon + 30; y++) {
          for (let w = 0; w < 6; w++) if ((y + w) % 2 === 0) px(ctx, x + y * 0.4 + w, y, 1, 1, '#a8d07850');
        }
      }
    }
  }

  platform(ctx, ENEMY_BASE.x, ENEMY_BASE.y, 50, 12, p);
  platform(ctx, PLAYER_BASE.x, PLAYER_BASE.y, 66, 14, p);
  if (theme !== 'cave') {
    tallGrass(ctx, 196, 116, 60, 6, p);
    tallGrass(ctx, -2, 92, 22, 3, p);
  }
}

/** Tema procedural usado para cada tipo de cenário (o fundo ilustrado usa a própria chave). */
export const SCENE_THEMES: Record<SceneKey, SceneTheme> = {
  meadow: 'meadow',
  route: 'field',
  forest: 'forest',
  mountain: 'mountain',
  cave: 'cave',
  river: 'river',
  beach: 'river',
  desert: 'mountain',
  city: 'field',
  icecave: 'cave',
  volcano: 'mountain',
  plains: 'field',
  dampcave: 'cave',
  sea: 'river',
};
