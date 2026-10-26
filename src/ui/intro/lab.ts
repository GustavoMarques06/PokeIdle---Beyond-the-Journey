// Laboratório do Professor, pintado em pixel art numa tela virtual de 256×160 (16:10).
//
// Regras do desenho, para o cenário parecer uma peça só:
//  - Câmera frontal, com o piso em perspectiva (ponto de fuga atrás da parede).
//  - Luz única, vinda das duas janelas: realces nos topos dos móveis, sombras para
//    baixo e para a esquerda, e manchas de luz projetadas no piso.
//  - Paleta curta e quente (madeira, creme, azul-acinzentado), sem contornos pretos.
// Tudo é determinístico (mesma semente → mesma imagem).

export const LAB_W = 256;
export const LAB_H = 160;
export const HORIZON = 62;

/** Onde cada coisa fica (pés dos personagens / base dos objetos), em pixels virtuais. */
export const LAB = {
  balls: [
    { x: 106, y: 75 },
    { x: 128, y: 75 },
    { x: 150, y: 75 },
  ],
  starter: { x: 128, y: 144 },
  oak: { x: 66, y: 120 },
  /** Placa com o logo, na parede. */
  sign: { x: 52, y: 12, w: 62, h: 22 },
} as const;

type Ctx = CanvasRenderingContext2D;

const C = {
  wall: '#efe3c4',
  wallStripe: '#e6d7b3',
  wallLight: '#f8f0da',
  wallShade: '#d4c196',
  crown: '#b99a68',
  crownLight: '#d3b88a',
  wainscot: '#9a7048',
  wainscotLight: '#b58a58',
  wainscotDark: '#74512f',
  baseboard: '#5b3d22',
  woodDark: '#5b3d22',
  wood: '#8a5a30',
  woodMid: '#a8743f',
  woodLight: '#c99a62',
  woodHi: '#e2bf8a',
  floorA: '#d8c8a0',
  floorB: '#cdbb92',
  floorGrout: '#b3a077',
  floorHi: '#e6dab6',
  floorLo: '#bfae85',
  shadow: '#000000',
  glass: ['#8fcaf2', '#a9dbf8', '#c9ebfb'],
  cloud: '#ffffff',
  books: ['#c8453a', '#3d6cb8', '#4fa050', '#d9a73a', '#8a5cb5', '#e07f45', '#2f8f8f', '#efe5cf'],
};

function rngFor(seed: number) {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function px(c: Ctx, x: number, y: number, w: number, h: number, color: string, alpha = 1) {
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  c.globalAlpha = 1;
}

/** Elipse preenchida linha a linha: bordas em degraus, sem antisserrilhado. */
function ellipse(c: Ctx, cx: number, cy: number, rx: number, ry: number, color: string, alpha = 1) {
  for (let dy = -ry; dy <= ry; dy++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2)));
    if (half > 0) px(c, cx - half, cy + dy, half * 2, 1, color, alpha);
  }
}

/** Sombra no chão: elipse escura com a metade de baixo mais clara (dá volume). */
function floorShadow(c: Ctx, cx: number, cy: number, rx: number, ry: number, alpha = 0.22) {
  ellipse(c, cx, cy, rx, ry, C.shadow, alpha);
  ellipse(c, cx, cy - 1, Math.round(rx * 0.7), Math.max(1, Math.round(ry * 0.6)), C.shadow, alpha * 0.6);
}

// --- parede ---------------------------------------------------------------------

function wall(c: Ctx) {
  px(c, 0, 0, LAB_W, HORIZON, C.wall);
  for (let x = 0; x < LAB_W; x += 8) px(c, x, 6, 1, 42, C.wallStripe);
  // Luz mais forte no meio, onde ficam as janelas.
  for (let y = 6; y < 48; y += 2) {
    for (let x = 100; x < 210; x += 2) if (((x + y) >> 1) % 2 === 0) px(c, x, y, 1, 1, C.wallLight);
  }
  // Moldura do teto (sanca).
  px(c, 0, 0, LAB_W, 5, C.crown);
  px(c, 0, 5, LAB_W, 1, C.crownLight);
  px(c, 0, 6, LAB_W, 2, C.wallShade);
  // Lambri: friso, painéis e rodapé.
  px(c, 0, 48, LAB_W, 2, C.wainscotLight);
  px(c, 0, 50, LAB_W, 10, C.wainscot);
  for (let x = 6; x < LAB_W; x += 16) {
    px(c, x, 52, 1, 6, C.wainscotDark);
    px(c, x + 1, 52, 1, 6, C.wainscotLight);
  }
  px(c, 0, 60, LAB_W, 2, C.baseboard);
  px(c, 0, 59, LAB_W, 1, C.wainscotDark);
}

function windowAt(c: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  const rnd = rngFor(seed);
  // Moldura externa e peitoril.
  px(c, x - 2, y - 2, w + 4, h + 4, C.woodDark);
  px(c, x - 1, y - 1, w + 2, h + 2, C.wood);
  px(c, x - 3, y + h + 1, w + 6, 2, C.woodLight);
  px(c, x - 3, y + h + 3, w + 6, 1, C.woodDark);
  // Vidro: faixas de céu.
  const band = Math.ceil(h / C.glass.length);
  C.glass.forEach((col, i) => px(c, x, y + i * band, w, band + 1, col));
  // Nuvem.
  const cx = x + 6 + Math.floor(rnd() * (w - 16));
  ellipse(c, cx + 4, y + 9, 5, 2, C.cloud);
  ellipse(c, cx + 8, y + 8, 4, 2, C.cloud);
  ellipse(c, cx, y + 10, 3, 1, '#dff1fc');
  // Copa de árvore ao longe.
  for (let i = 0; i < w; i += 3) px(c, x + i, y + h - 5 - (rnd() > 0.5 ? 1 : 0), 3, 6, '#5fa86a');
  px(c, x, y + h - 2, w, 2, '#4a8f58');
  // Travessas.
  px(c, x + Math.floor(w / 2) - 1, y, 2, h, C.wood);
  px(c, x, y + Math.floor(h / 2) - 1, w, 2, C.wood);
  px(c, x, y, w, 1, C.woodLight);
  // Reflexo no vidro.
  px(c, x + 3, y + 3, 1, 6, '#ffffff', 0.7);
  px(c, x + 5, y + 3, 1, 3, '#ffffff', 0.5);
}

function bookcase(c: Ctx, x: number, y: number, w: number, h: number, seed: number) {
  const rnd = rngFor(seed);
  // Corpo, com a luz vinda da direita/cima.
  px(c, x, y, w, h, C.woodDark);
  px(c, x + 1, y + 1, w - 2, h - 2, C.wood);
  px(c, x + 1, y + 1, w - 2, 1, C.woodLight);
  px(c, x + 1, y + 1, 1, h - 2, C.woodMid);
  px(c, x + 3, y + 4, w - 6, h - 6, '#3f2814');
  // Cornija.
  px(c, x - 1, y - 2, w + 2, 3, C.woodMid);
  px(c, x - 1, y - 2, w + 2, 1, C.woodHi);
  px(c, x - 1, y + 1, w + 2, 1, C.woodDark);

  const shelves = 4;
  const inner = h - 8;
  const slot = Math.floor(inner / shelves);
  for (let s = 0; s < shelves; s++) {
    const top = y + 4 + s * slot;
    const floorY = top + slot - 2;
    // Livros: alturas e larguras variadas, com realce no topo e sombra à esquerda.
    let bx = x + 4;
    const end = x + w - 4;
    const maxH = slot - 5;
    // Algumas prateleiras têm um objeto no lugar de livros.
    const prop = rnd() < 0.22 ? Math.floor(rnd() * 3) : -1;
    const propAt = x + 5 + Math.floor(rnd() * (w - 20));
    while (bx < end - 1) {
      if (prop >= 0 && bx >= propAt && bx < propAt + 8) {
        drawProp(c, bx, floorY, prop);
        bx += 9;
        continue;
      }
      const bw = 2 + Math.floor(rnd() * 3);
      const bh = Math.max(5, maxH - Math.floor(rnd() * 4));
      const col = C.books[Math.floor(rnd() * C.books.length)];
      if (bx + bw > end) break;
      px(c, bx, floorY - bh, bw, bh, col);
      px(c, bx, floorY - bh, bw, 1, '#ffffff', 0.35);
      px(c, bx, floorY - bh, 1, bh, '#000000', 0.18);
      if (rnd() < 0.5) px(c, bx, floorY - Math.floor(bh / 2), bw, 1, '#f8e8b0', 0.8);
      // Livros inclinados de vez em quando.
      if (rnd() < 0.08 && bx + bw + 2 < end) {
        px(c, bx + bw, floorY - bh + 1, 1, bh - 1, col);
        bx += 1;
      }
      bx += bw;
    }
    // Tábua da prateleira.
    px(c, x + 3, floorY, w - 6, 2, C.woodMid);
    px(c, x + 3, floorY, w - 6, 1, C.woodHi);
    px(c, x + 3, floorY + 2, w - 6, 1, '#000000', 0.35);
  }
}

function drawProp(c: Ctx, x: number, floorY: number, kind: number) {
  if (kind === 0) {
    // Globo terrestre.
    ellipse(c, x + 4, floorY - 6, 4, 4, '#4a86c8');
    px(c, x + 2, floorY - 8, 3, 2, '#6cb45c');
    px(c, x + 4, floorY - 5, 2, 2, '#6cb45c');
    px(c, x + 3, floorY - 3, 2, 3, C.woodDark);
    px(c, x + 1, floorY - 1, 6, 1, C.woodDark);
  } else if (kind === 1) {
    // Frasco com líquido verde.
    px(c, x + 2, floorY - 8, 4, 8, '#dff1fc');
    px(c, x + 2, floorY - 5, 4, 5, '#6cc96c');
    px(c, x + 3, floorY - 9, 2, 1, C.woodMid);
  } else {
    // Planta pequena em vaso.
    px(c, x + 2, floorY - 4, 5, 4, '#c8683c');
    px(c, x + 1, floorY - 8, 3, 4, '#4f9f55');
    px(c, x + 4, floorY - 9, 3, 5, '#6cbb68');
  }
}

function wallChart(c: Ctx, x: number, y: number) {
  px(c, x, y, 30, 18, C.woodDark);
  px(c, x + 1, y + 1, 28, 16, '#f6f0dc');
  px(c, x + 3, y + 3, 10, 2, '#3d6cb8');
  for (let i = 0; i < 4; i++) px(c, x + 3, y + 7 + i * 3, 20 - i * 3, 1, '#9a8f78');
  ellipse(c, x + 22, y + 6, 3, 3, '#c8453a');
  px(c, x + 19, y + 6, 7, 1, '#f6f0dc');
  px(c, x + 1, y + 17, 28, 1, '#000000', 0.18);
}

// --- piso -------------------------------------------------------------------------

function floor(c: Ctx, rnd: () => number) {
  const rows = 7;
  const vpY = 14;
  const colW = 46;
  const ys = Array.from({ length: rows + 1 }, (_, i) =>
    Math.round(HORIZON + (LAB_H - HORIZON) * Math.pow(i / rows, 1.5)),
  );
  for (let r = 0; r < rows; r++) {
    for (let y = ys[r]; y < ys[r + 1]; y++) {
      const s = (y + 0.5 - vpY) / (LAB_H - vpY);
      for (let k = -9; k <= 8; k++) {
        const xl = Math.round(128 + (k - 0.5) * colW * s);
        const xr = Math.round(128 + (k + 0.5) * colW * s);
        let color = (r + k) & 1 ? C.floorA : C.floorB;
        if (y === ys[r]) color = C.floorHi;
        else if (y === ys[r + 1] - 1) color = C.floorLo;
        px(c, xl, y, xr - xl, 1, color);
        px(c, xl, y, 1, 1, C.floorGrout);
      }
    }
    px(c, 0, ys[r], LAB_W, 1, C.floorGrout);
  }
  // Riscos e desgaste do piso.
  for (let i = 0; i < 46; i++) {
    const y = HORIZON + 3 + Math.floor(rnd() * (LAB_H - HORIZON - 4));
    px(c, Math.floor(rnd() * LAB_W), y, 2 + Math.floor(rnd() * 3), 1, C.floorGrout, 0.5);
  }
}

/** Mancha de luz projetada por uma janela: trapézio inclinado para a esquerda. */
function lightPatch(
  c: Ctx,
  topX: number,
  topW: number,
  topY: number,
  botX: number,
  botW: number,
  botY: number,
) {
  for (let y = topY; y <= botY; y++) {
    const t = (y - topY) / (botY - topY);
    const x = topX + (botX - topX) * t;
    const w = topW + (botW - topW) * t;
    px(c, x, y, w, 1, '#fff6c8', 0.16 + 0.08 * (1 - t));
    // Borda serrilhada em xadrez, como nos jogos de GBA.
    if (y % 2 === 0) px(c, x - 1, y, 1, 1, '#fff6c8', 0.12);
  }
}

// --- tapete ----------------------------------------------------------------------

/** Tapete oval em perspectiva: onde o inicial escolhido fica em pé. */
function rug(c: Ctx, cx: number, cy: number, rx: number, ry: number) {
  // Franjas.
  for (let a = 0; a < 360; a += 6) {
    const x = cx + Math.cos((a * Math.PI) / 180) * (rx + 2);
    const y = cy + Math.sin((a * Math.PI) / 180) * (ry + 1);
    px(c, x, y, 1, 1, '#efe5cf');
  }
  ellipse(c, cx, cy + 1, rx + 1, ry + 1, '#1f3466'); // contorno + espessura
  ellipse(c, cx, cy, rx, ry, '#2f4f94');
  ellipse(c, cx, cy, rx - 3, ry - 2, '#efe5cf');
  ellipse(c, cx, cy, rx - 5, ry - 3, '#3f64b0');
  // Faixa com padrão de losangos.
  for (let a = 0; a < 360; a += 12) {
    const rr = 0.78;
    const x = cx + Math.cos((a * Math.PI) / 180) * (rx - 8) * rr * 1.1;
    const y = cy + Math.sin((a * Math.PI) / 180) * (ry - 4) * rr * 1.1;
    px(c, x, y, 2, 1, '#f2d878');
    px(c, x, y - 1, 1, 3, '#f2d878');
  }
  ellipse(c, cx, cy, rx - 14, ry - 7, '#6f94d6');
  ellipse(c, cx, cy, rx - 17, ry - 8, '#7da1de');
  // Emblema de Poké Bola ao centro (fica sob o Pokémon).
  ellipse(c, cx, cy, 9, 3, '#e8e0cc');
  ellipse(c, cx, cy - 1, 9, 2, '#d84a3c');
  px(c, cx - 9, cy, 18, 1, '#2a3050');
}

// --- móveis -----------------------------------------------------------------------

function labTable(c: Ctx) {
  const backY = 66;
  const frontY = 79;
  // Sombra no chão (projetada para a esquerda, longe da luz).
  floorShadow(c, 124, 100, 52, 6, 0.26);
  // Pernas (as traseiras aparecem atrás do tampo).
  px(c, 94, 82, 3, 14, C.woodDark);
  px(c, 160, 82, 3, 14, C.woodDark);
  px(c, 86, 84, 4, 14, C.wood);
  px(c, 86, 84, 1, 14, C.woodDark);
  px(c, 167, 84, 4, 14, C.wood);
  px(c, 170, 84, 1, 14, C.woodDark);
  px(c, 86, 96, 4, 2, C.woodDark);
  px(c, 167, 96, 4, 2, C.woodDark);
  // Tampo em perspectiva: borda de trás mais estreita que a da frente.
  for (let y = backY; y <= frontY; y++) {
    const t = (y - backY) / (frontY - backY);
    const x0 = Math.round(92 - 6 * t);
    const x1 = Math.round(165 + 6 * t);
    px(c, x0, y, x1 - x0, 1, t < 0.5 ? C.woodHi : C.woodLight);
  }
  for (let y = backY + 2; y < frontY; y += 3) px(c, 90, y, 78, 1, C.woodMid, 0.55);
  px(c, 92, backY, 73, 1, C.woodHi);
  // Faixa da frente com a luz batendo na quina.
  px(c, 86, frontY, 85, 1, C.woodHi);
  px(c, 86, frontY + 1, 85, 7, C.woodMid);
  px(c, 86, frontY + 1, 85, 1, C.woodLight);
  px(c, 86, frontY + 7, 85, 2, C.woodDark);
  for (let x = 94; x < 166; x += 18) px(c, x, frontY + 3, 10, 3, C.wood);
  // Pedestais redondos de cada Poké Bola.
  for (const b of LAB.balls) {
    ellipse(c, b.x, b.y + 1, 10, 3, C.woodDark);
    ellipse(c, b.x, b.y, 10, 3, '#cfc6b0');
    ellipse(c, b.x, b.y - 1, 7, 2, '#e8e0cc');
  }
  // Prancheta e caneta no canto direito.
  px(c, 160, 68, 8, 6, '#f6f0dc');
  px(c, 160, 68, 8, 1, '#ffffff');
  px(c, 161, 70, 5, 1, '#9a8f78');
  px(c, 161, 72, 4, 1, '#9a8f78');
  px(c, 168, 71, 3, 1, '#3d6cb8');
}

function computerDesk(c: Ctx) {
  floorShadow(c, 24, 98, 22, 4);
  px(c, 8, 86, 34, 3, C.woodHi);
  px(c, 8, 89, 34, 7, C.woodMid);
  px(c, 8, 95, 34, 2, C.woodDark);
  px(c, 10, 96, 3, 10, C.woodDark);
  px(c, 37, 96, 3, 10, C.woodDark);
  // Monitor antigo, com a tela acesa.
  px(c, 14, 66, 22, 18, '#454d62');
  px(c, 14, 66, 22, 1, '#6a7490');
  px(c, 16, 68, 18, 13, '#25402f');
  px(c, 16, 68, 18, 13, '#5fd6a2', 0.9);
  for (let i = 0; i < 4; i++) px(c, 18, 70 + i * 3, 10 - i * 2, 1, '#1c3a2c');
  ellipse(c, 29, 76, 3, 3, '#e8f8f0');
  px(c, 22, 84, 6, 2, '#454d62');
}

function plant(c: Ctx) {
  floorShadow(c, 224, 112, 14, 3);
  px(c, 215, 100, 18, 3, '#e08a54');
  px(c, 216, 103, 16, 9, '#c8683c');
  px(c, 216, 103, 3, 9, '#e08a54');
  px(c, 216, 111, 16, 1, '#8a4524');
  // Folhas, com realce nas pontas voltadas para a luz.
  const leaves: [number, number, number, number][] = [
    [224, 88, 6, 12],
    [216, 92, 5, 8],
    [232, 92, 5, 8],
    [220, 80, 4, 10],
    [228, 82, 4, 10],
  ];
  for (const [x, y, rx, ry] of leaves) {
    ellipse(c, x, y, rx, ry, '#3f8f4c');
    ellipse(c, x + 1, y - 1, Math.max(1, rx - 2), Math.max(1, ry - 3), '#58b062');
    px(c, x + 1, y - ry + 2, 1, 2, '#8ad88a');
  }
}

// --- cena completa ---------------------------------------------------------------

export function paintLab(ctx: Ctx): void {
  const rnd = rngFor(7);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, LAB_W, LAB_H);

  wall(ctx);
  windowAt(ctx, 124, 12, 28, 28, 11);
  windowAt(ctx, 160, 12, 28, 28, 23);
  bookcase(ctx, 4, 14, 46, 46, 5);
  bookcase(ctx, 204, 14, 48, 46, 9);
  wallChart(ctx, 64, 40);

  floor(ctx, rnd);
  // Sombras das estantes e do lambri no piso.
  px(ctx, 0, HORIZON, LAB_W, 3, C.shadow, 0.16);
  px(ctx, 3, HORIZON, 48, 5, C.shadow, 0.12);
  px(ctx, 203, HORIZON, 50, 5, C.shadow, 0.12);

  rug(ctx, 128, 138, 66, 15);
  // Luz das janelas sobre o piso e o tapete.
  lightPatch(ctx, 126, 26, 70, 90, 40, 150);
  lightPatch(ctx, 162, 26, 70, 126, 38, 150);

  computerDesk(ctx);
  plant(ctx);
  labTable(ctx);
}

// --- sombras de sprites (pixel art, sem desfoque) -----------------------------------

const shadowCache = new Map<string, string>();

/** Anel de 1 pixel em volta de uma elipse (destaque do pedestal selecionado). */
export function ringUri(cols: number, rows: number, color = '#f8d030'): string {
  const key = `ring:${cols}x${rows}:${color}`;
  let uri = shadowCache.get(key);
  if (uri) return uri;
  const half = (y: number, cy: number, rx: number, ry: number) => {
    const dy = (y + 0.5 - cy) / ry;
    return Math.abs(dy) > 1 ? 0 : Math.round(rx * Math.sqrt(1 - dy * dy));
  };
  let rects = '';
  for (let y = 0; y < rows; y++) {
    const outer = half(y, rows / 2, cols / 2, rows / 2);
    const inner = half(y, rows / 2, cols / 2 - 1, rows / 2 - 1);
    if (outer <= 0) continue;
    const c = cols / 2;
    if (inner <= 0) rects += `<rect x="${c - outer}" y="${y}" width="${outer * 2}" height="1"/>`;
    else {
      rects += `<rect x="${c - outer}" y="${y}" width="${outer - inner}" height="1"/>`;
      rects += `<rect x="${c + inner}" y="${y}" width="${outer - inner}" height="1"/>`;
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${cols}" height="${rows}" shape-rendering="crispEdges" fill="${color}">${rects}</svg>`;
  uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  shadowCache.set(key, uri);
  return uri;
}

/** Elipse de sombra como SVG de pixels nítidos, para usar como `background-image`. */
export function shadowUri(cols: number, rows: number): string {
  const key = `${cols}x${rows}`;
  let uri = shadowCache.get(key);
  if (uri) return uri;
  let rects = '';
  for (let y = 0; y < rows; y++) {
    const dy = (y + 0.5 - rows / 2) / (rows / 2);
    const half = Math.round((cols / 2) * Math.sqrt(Math.max(0, 1 - dy * dy)));
    if (half > 0) rects += `<rect x="${cols / 2 - half}" y="${y}" width="${half * 2}" height="1"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${rows}" width="${cols}" height="${rows}" shape-rendering="crispEdges" fill="#1a2040" fill-opacity="0.38">${rects}</svg>`;
  uri = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  shadowCache.set(key, uri);
  return uri;
}
