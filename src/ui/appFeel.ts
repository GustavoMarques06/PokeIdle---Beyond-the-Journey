// Jogo, não site: tira do caminho os comportamentos de página da web.
// - Arrastar: imagens e textos não saem como "foto" do navegador. Só arrasta o que o jogo marca (draggable="true"),
//   e mesmo esse sem a imagem translúcida do navegador: quem tem `data-drag-sprite` vira um sprite que acompanha o
//   mouse (DragGhost.tsx), o resto não mostra nada.
// - Clique direito, Ctrl+A, Ctrl+P, Ctrl+S (salva o jogo) e zoom com Ctrl+roda ficam com o jogo.
// - Dicas: o `title` vira um balão em pixel art (no lugar do amarelo do sistema).
// Os campos de texto continuam funcionando como sempre (selecionar, copiar, menu do botão direito).

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

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 's') {
      e.preventDefault();
      onSave?.();
    } else if (k === 'p') e.preventDefault();
    else if (k === 'a' && !editable(e.target)) e.preventDefault();
  });

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
