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

/** Registra as molduras como variáveis CSS (`--frame-<nome>`). Chamar uma vez na inicialização. */
export function installFrames(root: HTMLElement = document.documentElement): void {
  for (const [name, palette] of Object.entries(FRAMES)) {
    root.style.setProperty(`--frame-${name}`, svgUrl(frameSvg(palette)));
  }
  root.style.setProperty('--tile-grass', svgUrl(grassTile()));
  root.style.setProperty('--icon-cursor', svgUrl(iconSvg(ICONS.cursor)));
}
