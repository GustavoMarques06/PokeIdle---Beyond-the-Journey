// Jogo, não site: tira do caminho os comportamentos de página da web.
// - Arrastar: imagens e textos não saem como "foto" do navegador. Só arrasta o que o jogo marca (draggable="true"),
//   e mesmo esse sem a imagem translúcida do navegador: quem tem `data-drag-sprite` vira um sprite que acompanha o
//   mouse (DragGhost.tsx), o resto não mostra nada.
// - Clique direito, Ctrl+A, Ctrl+P, Ctrl+S (salva o jogo) e zoom com Ctrl+roda ficam com o jogo.
// - Dicas: o `title` vira um balão em pixel art (no lugar do amarelo do sistema).
// - Teclas e botões do navegador: F5/Ctrl+R (recarregar), buscar, favoritos, histórico, ver código, voltar/avançar
//   (teclado, botões laterais do mouse e o voltar do sistema), clique do meio e, no jogo publicado, as ferramentas
//   do desenvolvedor. O que o navegador não deixa bloquear (Ctrl+W, Ctrl+T, Ctrl+N, Alt+F4) fica de fora.
// - Tela cheia: ao apertar START o jogo ocupa a tela toda (dá para desligar nas Opções); F11 alterna.
// Os campos de texto continuam funcionando como sempre (selecionar, copiar, menu do botão direito).

import { isTauri } from '../engine/storage';

const FULLSCREEN_KEY = 'pokeidle.fullscreen';

/** Preferência de tela cheia (fica no aparelho; ligada por padrão). */
export function fullscreenWanted(): boolean {
  try {
    return localStorage.getItem(FULLSCREEN_KEY) !== '0';
  } catch {
    return true;
  }
}

export function setFullscreenWanted(on: boolean): void {
  try {
    localStorage.setItem(FULLSCREEN_KEY, on ? '1' : '0');
  } catch {
    /* sem armazenamento: só não lembra */
  }
  if (on) void enterFullscreen();
  else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}

/** Entra em tela cheia (precisa vir de um clique ou tecla). Prende o Esc para ele fechar as janelas do jogo. */
export async function enterFullscreen(): Promise<void> {
  if (isTauri() || document.fullscreenElement || !document.documentElement.requestFullscreen) return;
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    const kb = (navigator as unknown as { keyboard?: { lock?: (keys: string[]) => Promise<void> } }).keyboard;
    await kb?.lock?.(['Escape', 'F5', 'F11']).catch(() => {});
  } catch {
    /* o navegador recusou (iPhone, por exemplo): segue em janela */
  }
}

/** Teclas do navegador que o jogo segura (com Ctrl/Cmd). */
const CTRL_BLOCK = new Set(['r', 'f', 'g', 'h', 'j', 'd', 'o', 'u', 'l', 'e', 'k', 'p', 'b', 'y', 'm']);
const PLAIN_BLOCK = new Set([
  'F1',
  'F3',
  'F5',
  'F6',
  'F7',
  'BrowserBack',
  'BrowserForward',
  'BrowserRefresh',
  'BrowserHome',
  'BrowserSearch',
  'BrowserFavorites',
]);

const editable = (el: EventTarget | null) =>
  el instanceof HTMLElement && !!el.closest('input, textarea, select, [contenteditable="true"]');

/** Imagem vazia para o arrastar do navegador (o jogo desenha o seu). */
const BLANK = (() => {
  const img = new Image();
  img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  return img;
})();

export function installAppFeel(onSave?: () => void): void {
  document.addEventListener('dragstart', (e) => {
    const t = e.target as HTMLElement | null;
    const source = t?.closest?.('[draggable="true"]');
    // Arrastar de verdade só o que o jogo marcou; imagens, ícones e textos ficam no lugar.
    if (!source || editable(t)) {
      if (!editable(t)) e.preventDefault();
      return;
    }
    e.dataTransfer?.setDragImage(BLANK, 0, 0);
  });

  document.addEventListener('contextmenu', (e) => {
    if (!editable(e.target)) e.preventDefault();
  });

  // Zoom do navegador (Ctrl+roda e o pinça do trackpad) desarruma a interface: o jogo tem a própria escala.
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) e.preventDefault();
    },
    { passive: false },
  );
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  document.addEventListener(
    'keydown',
    (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      // Ferramentas do desenvolvedor: só no jogo publicado (no `npm run dev` continuam abertas).
      const devtools =
        e.key === 'F12' ||
        (ctrl && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
        (ctrl && e.altKey && ['i', 'j', 'u'].includes(k));
      if (devtools) {
        if (import.meta.env.PROD) e.preventDefault();
        return;
      }
      if (e.key === 'F11') {
        e.preventDefault();
        if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
        else void enterFullscreen();
        return;
      }
      if (PLAIN_BLOCK.has(e.key) || (e.altKey && ['ArrowLeft', 'ArrowRight', 'Home'].includes(e.key))) {
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace' && !editable(e.target)) {
        e.preventDefault();
        return;
      }
      if (!ctrl || e.altKey) return;
      if (k === 's') {
        e.preventDefault();
        onSave?.();
      } else if (k === 'a') {
        if (!editable(e.target)) e.preventDefault();
      } else if (CTRL_BLOCK.has(k) || ['+', '-', '=', '0'].includes(e.key)) e.preventDefault();
    },
    { capture: true },
  );

  // Clique do meio (rolagem automática, abrir em nova aba) e os botões voltar/avançar do mouse.
  document.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
  document.addEventListener('auxclick', (e) => e.preventDefault());
  document.addEventListener('mouseup', (e) => {
    if (e.button === 3 || e.button === 4) e.preventDefault();
  });

  // Voltar do navegador (e o gesto de voltar do celular): o jogo segura uma página extra no histórico.
  history.pushState({ game: true }, '');
  window.addEventListener('popstate', () => history.pushState({ game: true }, ''));

  installTooltips();
}

/** Balão de dica em pixel art no lugar do `title` do sistema (só com mouse; no toque o sistema não mostra). */
function installTooltips(): void {
  if (!window.matchMedia?.('(hover: hover)').matches) return;
  const tip = document.createElement('div');
  tip.className = 'game-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
  let current: HTMLElement | null = null;
  let timer = 0;

  const place = (x: number, y: number) => {
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.min(window.innerWidth - w - 6, Math.max(6, x + 14));
    const top = y + h + 26 > window.innerHeight ? y - h - 10 : y + 20;
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  const hide = () => {
    clearTimeout(timer);
    tip.hidden = true;
    current = null;
  };

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('[title], [data-tip]') ?? null;
    if (el === current) return;
    hide();
    if (!el) return;
    // O texto sai do `title` (senão o sistema mostra o dele também) e fica guardado no elemento.
    const title = el.getAttribute('title');
    if (title) {
      el.dataset.tip = title;
      el.removeAttribute('title');
      if (!el.getAttribute('aria-label') && !el.textContent?.trim()) el.setAttribute('aria-label', title);
    }
    const text = el.dataset.tip;
    if (!text) return;
    current = el;
    const x = e.clientX;
    const y = e.clientY;
    timer = window.setTimeout(() => {
      if (current !== el) return;
      tip.textContent = text;
      tip.hidden = false;
      place(x, y);
    }, 350);
  });
  document.addEventListener('pointermove', (e) => {
    if (!tip.hidden && e.pointerType === 'mouse') place(e.clientX, e.clientY);
  });
  document.addEventListener('pointerdown', hide, true);
  document.addEventListener('scroll', hide, true);
  window.addEventListener('blur', hide);
}
