// Molduras em pixel art geradas como SVG 12×12 e usadas como `border-image` (9-slice).
// Cada pixel do SVG vira 2–3 px de tela, então qualquer painel ganha cantos pixelados
// sem imagens externas. As cores seguem os tokens de src/ui/styles/base.css.

import { ICONS, iconSvg } from './icons';

interface FramePalette {
  outline: string;
  /** Borda interna clara (topo/esquerda) e escura (base/direita). Iguais = sem relevo. */
  rimLight: string;
  rimDark: string;
  /** Segunda faixa de borda (opcional). */
  rim2?: string;
  fill: string;
}

const SIZE = 12;

function frameSvg(p: FramePalette): string {
  let rects = '';
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cx = Math.min(x, SIZE - 1 - x);
      const cy = Math.min(y, SIZE - 1 - y);
      if (cx + cy < 2) continue; // canto arredondado em degraus
      const level = Math.min(cx, cy, cx + cy - 2);
      let color: string;
      if (level === 0) color = p.outline;
      else if (level === 1) {
        // Lado mais próximo decide se é a borda clara ou escura.
        const lightSide = cy <= cx ? y < SIZE / 2 : x < SIZE / 2;
        color = lightSide ? p.rimLight : p.rimDark;
      } else if (level === 2 && p.rim2) color = p.rim2;
      else color = p.fill;
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${color}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" shape-rendering="crispEdges">${rects}</svg>`;
}

const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

export const FRAMES: Record<string, FramePalette> = {
  // Caixa de diálogo (FRLG/Emerald): contorno marinho, borda azul dupla, fundo creme.
  dialog: { outline: '#283050', rimLight: '#6890d0', rimDark: '#4868a8', rim2: '#c8d8f0', fill: '#f8f8f0' },
  // Menus e janelas: contorno marinho, borda azul-clara, fundo branco.
  menu: { outline: '#283050', rimLight: '#a8c8f0', rimDark: '#7898c8', fill: '#ffffff' },
  // Caixas de status da batalha: contorno escuro, fundo bege.
  status: { outline: '#404850', rimLight: '#f8f8e0', rimDark: '#b8b098', fill: '#f0f0d0' },
  // Botões com relevo.
  button: { outline: '#283050', rimLight: '#ffffff', rimDark: '#9098b8', fill: '#e8ecf8' },
  buttonHover: { outline: '#283050', rimLight: '#ffffff', rimDark: '#a8b0d0', fill: '#fff8d8' },
  buttonPressed: { outline: '#283050', rimLight: '#9098b8', rimDark: '#ffffff', fill: '#d0d8f0' },
  buttonPrimary: { outline: '#283050', rimLight: '#f8e070', rimDark: '#c08818', fill: '#f8c838' },
  buttonDanger: { outline: '#401818', rimLight: '#f89080', rimDark: '#a02818', fill: '#e05038' },
  // Slots da equipe (tela de Pokémon do FRLG).
  slot: { outline: '#203860', rimLight: '#a8d0f8', rimDark: '#3868a8', fill: '#5888c8' },
  slotActive: {
    outline: '#203860',
    rimLight: '#f8e8a0',
    rimDark: '#d07818',
    rim2: '#f8a838',
    fill: '#78b8f0',
  },
  slotEmpty: { outline: '#506078', rimLight: '#8098b8', rimDark: '#506888', fill: '#6880a8' },
  // Pokédex: carcaça vermelha e tela.
  dex: { outline: '#401010', rimLight: '#f86858', rimDark: '#a01818', rim2: '#d83028', fill: '#d83028' },
  screen: { outline: '#182028', rimLight: '#506070', rimDark: '#102028', fill: '#f0f8e8' },
  // Cartão de treinador.
  card: { outline: '#283050', rimLight: '#f8f8ff', rimDark: '#5878b8', rim2: '#88b0e8', fill: '#d8e8f8' },
  // Papel do mapa.
  paper: { outline: '#584020', rimLight: '#f8e8c0', rimDark: '#b89058', fill: '#f0dcb0' },
  // Placa de madeira (logo na parede do laboratório).
  sign: { outline: '#3a2210', rimLight: '#c99a62', rimDark: '#6e4e30', rim2: '#a8743f', fill: '#8a5a30' },
  // Tooltip / toast.
  toast: { outline: '#283050', rimLight: '#f8f8f0', rimDark: '#c8c0a0', fill: '#f8f0d8' },
};

/** Ladrilho de fundo: grama pixelada em tom suave, para o fundo da janela do jogo. */
function grassTile(): string {
  const base = ['#a8d880', '#a0d078'];
  const blade = '#88c060';
  const light = '#c0e898';
  let rects = '';
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${base[(Math.floor(x / 8) + Math.floor(y / 8)) % 2]}"/>`;
    }
  }
  for (const [x, y] of [
    [2, 3],
    [3, 2],
    [4, 3],
    [10, 11],
    [11, 10],
    [12, 11],
    [12, 4],
    [5, 12],
  ]) {
    rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${blade}"/>`;
  }
  for (const [x, y] of [
    [3, 1],
    [11, 9],
    [13, 3],
  ]) {
    rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${light}"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" shape-rendering="crispEdges">${rects}</svg>`;
}

/** Ladrilhos do fundo da página, um por tipo de lugar (32×32, salpicados de forma fixa). */
const BIOME_TILES: Record<string, { base: [string, string]; speck: string[]; dots: [string, number][] }> = {
  grass: { base: ['#78b858', '#72b054'], speck: ['#5c9a44', '#90c868'], dots: [['#f8f8f0', 3], ['#f8d848', 2], ['#e86858', 1]] },
  forest: { base: ['#4f8a3c', '#4a8238'], speck: ['#3c6e30', '#62a04a'], dots: [['#2c5a26', 4], ['#88c060', 2]] },
  sand: { base: ['#e8d098', '#e2c88e'], speck: ['#c8a868', '#f4e0b0'], dots: [['#a88850', 3], ['#fff0c8', 2]] },
  snow: { base: ['#e8f0f8', '#e0eaf4'], speck: ['#c0d0e8', '#ffffff'], dots: [['#a8c0e0', 3], ['#ffffff', 3]] },
  rock: { base: ['#8a7a68', '#827260'], speck: ['#6a5a4a', '#a09080'], dots: [['#584838', 4], ['#b8a890', 2]] },
  water: { base: ['#5898d8', '#5090d0'], speck: ['#78b8f0', '#4080c0'], dots: [['#c8ecff', 3], ['#3870b0', 2]] },
  city: { base: ['#c8c0b0', '#c0b8a8'], speck: ['#a8a090', '#d8d0c0'], dots: [['#988f80', 3]] },
  lava: { base: ['#6a4a40', '#62443a'], speck: ['#4a3028', '#845a4a'], dots: [['#e06030', 3], ['#f8b040', 1]] },
  league: { base: ['#8878b0', '#8070a8'], speck: ['#6a5a98', '#a898c8'], dots: [['#f8e078', 2], ['#584888', 3]] },
};

function biomeTile(kind: string): string {
  const t = BIOME_TILES[kind];
  // Hash fixo: o mesmo ladrilho sempre, sem padrão de xadrez aparente.
  const h = (x: number, y: number, k: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453;
    return v - Math.floor(v);
  };
  let rects = `<rect width="32" height="32" fill="${t.base[0]}"/>`;
  for (let y = 0; y < 32; y += 4)
    for (let x = 0; x < 32; x += 4)
      if (h(x, y, 1) < 0.5) rects += `<rect x="${x}" y="${y}" width="4" height="4" fill="${t.base[1]}"/>`;
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(h(i, 3, 2) * 32);
    const y = Math.floor(h(i, 7, 3) * 32);
    rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${t.speck[i % t.speck.length]}"/>`;
  }
  let n = 0;
  for (const [color, count] of t.dots)
    for (let i = 0; i < count; i++, n++) {
      const x = 2 + Math.floor(h(n, 11, 5) * 27);
      const y = 2 + Math.floor(h(n, 13, 6) * 27);
      // Florzinha, pedrinha ou brilho: uma cruz de 3 px.
      rects += `<rect x="${x}" y="${y - 1}" width="1" height="3" fill="${color}"/><rect x="${x - 1}" y="${y}" width="3" height="1" fill="${color}"/>`;
    }
  if (kind === 'city')
    rects += '<rect x="0" y="15" width="32" height="1" fill="#a8a090"/><rect x="15" y="0" width="1" height="15" fill="#a8a090"/><rect x="7" y="16" width="1" height="16" fill="#a8a090"/><rect x="23" y="16" width="1" height="16" fill="#a8a090"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" shape-rendering="crispEdges">${rects}</svg>`;
}

/** Registra as molduras como variáveis CSS (`--frame-<nome>`). Chamar uma vez na inicialização. */
export function installFrames(root: HTMLElement = document.documentElement): void {
  for (const [name, palette] of Object.entries(FRAMES)) {
    root.style.setProperty(`--frame-${name}`, svgUrl(frameSvg(palette)));
  }
  root.style.setProperty('--tile-grass', svgUrl(grassTile()));
  for (const kind of Object.keys(BIOME_TILES)) root.style.setProperty(`--tile-${kind}`, svgUrl(biomeTile(kind)));
  root.style.setProperty('--icon-cursor', svgUrl(iconSvg(ICONS.cursor)));
  // Cursores do mouse em pixel art, ampliados 2× (o ponto ativo fica na ponta: 0 0 na seta, 9 0 na mão).
  const big = (svg: string) => svg.replace(/width="(\d+)" height="(\d+)"/, (_m, w, h) => `width="${w * 2}" height="${h * 2}"`);
  root.style.setProperty('--cursor-arrow', `${svgUrl(big(iconSvg(ICONS.cursorArrow)))} 0 0`);
  root.style.setProperty('--cursor-hand', `${svgUrl(big(iconSvg(ICONS.cursorHand)))} 9 0`);
}
