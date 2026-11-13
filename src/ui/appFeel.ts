// Jogo, não site: tira do caminho os comportamentos de página da web.
// - Arrastar: imagens e textos não saem como "foto" do navegador. Só arrasta o que o jogo marca (draggable="true"),
//   e mesmo esse sem a imagem translúcida do navegador: quem tem `data-drag-sprite` vira um sprite que acompanha o
//   mouse (DragGhost.tsx), o resto não mostra nada.
// - Clique direito, Ctrl+A, Ctrl+P, Ctrl+S (salva o jogo) e zoom com Ctrl+roda ficam com o jogo.
// - Dicas: o `title` vira um balão em pixel art (no lugar do amarelo do sistema).
// - Teclas e botões do navegador: F5/Ctrl+R (recarregar), buscar, favoritos, histórico, ver código, voltar/avançar
//   (teclado, botões laterais do mouse e o voltar do sistema), clique do meio e, no jogo publicado, as ferramentas
//   do desenvolvedor. O que o navegador não deixa bloquear (Ctrl+W, Ctrl+T, Ctrl+N, Alt+F4) fica de fora.
// Os campos de texto continuam funcionando como sempre (selecionar, copiar, menu do botão direito).

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
        (ctrl && e.shiftKey && ['i', 'j', 'c', 'k', 'e', 'm', 's', 'delete'].includes(k)) ||
        (ctrl && e.altKey && ['i', 'j', 'c', 'u'].includes(k)) ||
        (e.shiftKey && e.key === 'F7') ||
        (e.shiftKey && e.key === 'F5');
      if (devtools) {
        if (import.meta.env.PROD) e.preventDefault();
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

  // Soltar um arquivo ou texto na janela faz o navegador abrir o arquivo e sair do jogo: arquivos nunca entram, e
  // o resto só nas áreas do jogo que aceitam soltar (PC, equipe).
  for (const type of ['dragover', 'drop'] as const)
    window.addEventListener(type, (e) => {
      const files = !!e.dataTransfer?.types.includes('Files');
      const zone = (e.target as HTMLElement | null)?.closest?.('[data-drop], .pcs, .party-board, .pcs-boxes');
      if (files || !zone) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
      }
    });

  // Copiar, recortar e selecionar só nos campos de texto.
  for (const type of ['copy', 'cut', 'selectstart'] as const)
    document.addEventListener(type, (e) => {
      if (!editable(e.target)) e.preventDefault();
    });

  // Quem abrir as ferramentas pelo menu do navegador vê um aviso (no jogo publicado).
  if (import.meta.env.PROD) {
    console.log(
      '%cPARE!',
      'color:#e83838;font:bold 42px sans-serif;-webkit-text-stroke:1px #283050',
    );
    console.log(
      '%cEsta área é para desenvolvedores. Se alguém pediu para você colar algo aqui, é golpe: pode apagar o seu save ou roubar os seus Pokémon.',
      'font:16px sans-serif',
    );
  }

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
  let held = ''; // o `title` tirado do elemento enquanto o mouse está em cima (volta ao sair)
  let timer = 0;

  const place = (x: number, y: number) => {
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const left = Math.min(window.innerWidth - w - 6, Math.max(6, x + 14));
    const top = y + h + 26 > window.innerHeight ? y - h - 10 : y + 20;
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  // Se o jogo trocar o texto com o mouse em cima (React grava o `title` de novo), o balão acompanha.
  const watch = new MutationObserver(() => {
    const el = current;
    const title = el?.getAttribute('title');
    if (!el || title == null) return;
    held = title;
    el.removeAttribute('title');
    tip.textContent = title;
  });
  const hide = () => {
    clearTimeout(timer);
    watch.disconnect();
    tip.hidden = true;
    // O `title` volta ao elemento: o texto nunca fica guardado à parte, então nunca fica velho.
    if (current && held && !current.hasAttribute('title')) current.setAttribute('title', held);
    current = null;
    held = '';
  };

  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    // Andar para dentro do próprio elemento (o ícone do botão) não troca o balão: o `title` dele está guardado.
    if (current && current.contains(e.target as Node)) return;
    const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>('[title]') ?? null;
    hide();
    if (!el) return;
    // Tirado enquanto o mouse está em cima, senão o sistema mostra o balão dele também.
    const text = el.getAttribute('title');
    if (!text) return;
    held = text;
    el.removeAttribute('title');
    current = el;
    watch.observe(el, { attributes: true, attributeFilter: ['title'] });
    const x = e.clientX;
    const y = e.clientY;
    timer = window.setTimeout(() => {
      if (current !== el) return;
      tip.textContent = held;
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
