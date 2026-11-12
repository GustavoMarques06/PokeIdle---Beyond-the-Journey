// Navegar como nos portáteis, pelo teclado e pelo controle:
// - Setas (e o D-pad ou o analógico): uma setinha ▶ anda pelos botões da tela aberta, para o lado apertado.
//   Enter/Espaço (ou A) confirma; Esc (ou B) volta. Telas que já usam as setas (Pokédex, menu) continuam com elas.
// - Controle (Gamepad API): Start leva ao menu, LB/RB trocam de aba, X lança Poké Ball e Y a melhor bola.
// - Som: cursor ao andar e ao passar o mouse nos botões de menu; confirmação em todo clique que não tocou o próprio.
// A setinha só aparece navegando por teclado ou controle; o mouse e o toque escondem.

import { audio } from './audio';

const FOCUSABLE =
  'button:not([disabled]), a[href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"]), summary';

/** Onde a setinha anda: a janela de cima (pergunta, aviso, ajuda) ou o jogo inteiro. */
function scope(): HTMLElement {
  const layers = document.querySelectorAll<HTMLElement>(
    '.game-confirm-backdrop, .cer-backdrop, .help-overlay, .modal-backdrop',
  );
  return layers[layers.length - 1] ?? document.body;
}

function visible(el: HTMLElement): boolean {
  if (!el.getClientRects().length) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight * 3;
}

const typing = (el: Element | null) =>
  !!el &&
  (el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLInputElement && !['button', 'checkbox', 'radio', 'submit'].includes(el.type)) ||
    (el as HTMLElement).isContentEditable);

type Dir = 'up' | 'down' | 'left' | 'right';

/** O botão mais perto na direção apertada (distância no eixo + o dobro do desvio para o lado). */
function nearest(from: DOMRect, dir: Dir, list: HTMLElement[]): HTMLElement | null {
  const cx = from.left + from.width / 2;
  const cy = from.top + from.height / 2;
  let best: HTMLElement | null = null;
  let bestScore = Infinity;
  for (const el of list) {
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const main = dir === 'right' ? x - cx : dir === 'left' ? cx - x : dir === 'down' ? y - cy : cy - y;
    const side = dir === 'left' || dir === 'right' ? Math.abs(y - cy) : Math.abs(x - cx);
    if (main <= 4) continue;
    const score = main + side * 2;
    if (score < bestScore) {
      bestScore = score;
      best = el;
    }
  }
  return best;
}

let navMode = false;
const cursor = document.createElement('span');

function placeCursor(): void {
  const el = document.activeElement as HTMLElement | null;
  if (!navMode || !el || el === document.body || !visible(el) || typing(el)) {
    cursor.hidden = true;
    return;
  }
  const r = el.getBoundingClientRect();
  cursor.hidden = false;
  cursor.style.transform = `translate(${Math.round(Math.max(2, r.left - 14))}px, ${Math.round(r.top + r.height / 2 - 6)}px)`;
}

export function move(dir: Dir): boolean {
  const root = scope();
  const list = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
  if (!list.length) return false;
  const current = document.activeElement as HTMLElement | null;
  const inside = current && current !== document.body && root.contains(current);
  // Sem nada em foco: começa pela janela aberta, senão pelo menu, senão pelo primeiro.
  const target = inside
    ? nearest(current.getBoundingClientRect(), dir, list.filter((el) => el !== current))
    : (list.find((el) => el.closest('.screen-window-body')) ??
      list.find((el) => el.closest('.game-menu')) ??
      list[0]);
  if (!target) return false;
  navMode = true;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  audio.sfx('cursor');
  placeCursor();
  return true;
}

const key = (k: string) =>
  (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

/** LB/RB: a aba anterior ou a próxima da janela aberta (ou da tela de cima). */
function switchTab(step: 1 | -1): void {
  const root = scope();
  const lists = [...root.querySelectorAll<HTMLElement>('[role="tablist"]')].filter(visible);
  const tabs = [...(lists[0]?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])].filter(visible);
  if (!tabs.length) return;
  const at = Math.max(0, tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true'));
  const next = tabs[(at + step + tabs.length) % tabs.length];
  next.click();
  navMode = true;
  next.focus({ preventScroll: true });
  placeCursor();
}

function installGamepad(): void {
  if (!('getGamepads' in navigator)) return;
  let raf = 0;
  const held = new Map<string, number>();
  const press = (name: string, down: boolean, now: number, fn: () => void, repeat = false) => {
    const since = held.get(name);
    if (!down) {
      held.delete(name);
      return;
    }
    if (since === undefined) {
      held.set(name, now);
      fn();
    } else if (repeat && now - since > 380) {
      held.set(name, now - 380 + 110);
      fn();
    }
  };
  const loop = (now: number) => {
    const pad = [...navigator.getGamepads()].find((p) => p?.connected);
    if (!pad) {
      raf = 0;
      return;
    }
    const b = (i: number) => !!pad.buttons[i]?.pressed;
    const ax = pad.axes[0] ?? 0;
    const ay = pad.axes[1] ?? 0;
    press('up', b(12) || ay < -0.6, now, () => move('up'), true);
    press('down', b(13) || ay > 0.6, now, () => move('down'), true);
    press('left', b(14) || ax < -0.6, now, () => move('left'), true);
    press('right', b(15) || ax > 0.6, now, () => move('right'), true);
    press('a', b(0), now, () => {
      const el = document.activeElement as HTMLElement | null;
      if (el && el !== document.body) el.click();
      else move('down');
    });
    press('b', b(1), now, () => key('Escape'));
    press('x', b(2), now, () => key('q'));
    press('y', b(3), now, () => key('w'));
    press('lb', b(4), now, () => switchTab(-1));
    press('rb', b(5), now, () => switchTab(1));
    press('start', b(9), now, () => {
      const first = document.querySelector<HTMLElement>('.game-menu .menu-item.active, .game-menu .menu-item');
      if (!first) return;
      navMode = true;
      first.focus();
      audio.sfx('cursor');
      placeCursor();
    });
    raf = requestAnimationFrame(loop);
  };
  window.addEventListener('gamepadconnected', () => {
    if (!raf) raf = requestAnimationFrame(loop);
  });
}

export function installGameNav(): void {
  cursor.className = 'focus-cursor';
  cursor.hidden = true;
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') navMode = true;
    const dir = ({ ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' } as const)[e.key];
    // Quem já usa as setas (Pokédex, menu, campos de texto, listas) cuida delas.
    if (!dir || e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || typing(e.target as Element)) return;
    if (move(dir)) e.preventDefault();
  });
  document.addEventListener('focusin', () => requestAnimationFrame(placeCursor));
  document.addEventListener('focusout', () => requestAnimationFrame(placeCursor));
  document.addEventListener('scroll', () => placeCursor(), true);
  window.addEventListener('resize', placeCursor);
  document.addEventListener(
    'pointerdown',
    () => {
      navMode = false;
      cursor.hidden = true;
    },
    true,
  );

  // Som de interface: confirmação em todo clique que ainda não tocou nada, e cursor nos botões de menu.
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement | null)?.closest?.('button, [role="tab"], [role="radio"], summary, select');
    if (el && !(el as HTMLButtonElement).disabled && performance.now() - audio.lastSfxAt > 90) audio.sfx('click');
  });
  let lastHover: Element | null = null;
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = (e.target as HTMLElement | null)?.closest?.(
      '.pbtn, [role="tab"], .pocket, .aisle-sign, .niche, .bc-big, .title-option, .game-confirm-actions button',
    );
    if (!el || el === lastHover) return;
    lastHover = el;
    if (performance.now() - audio.lastSfxAt > 120 && !(el as HTMLButtonElement).disabled) audio.sfx('cursor');
  });

  installGamepad();
}
