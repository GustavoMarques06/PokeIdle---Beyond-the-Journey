// No toque não existe "passar o mouse": segurar um elemento mostra a dica dele (o atributo title). Assim, o efeito do
// clima, o motivo de um botão bloqueado e as outras explicações também chegam a quem joga no celular.

import { useEffect, useState } from 'react';

/** Acima do tempo de um toque lento: quem só demora um pouco para soltar não perde o clique. */
const HOLD_MS = 600;
const SHOW_MS = 3500;
const MOVE_TOLERANCE = 10;

interface Tip {
  text: string;
  y: number;
}

export function TouchTips() {
  const [tip, setTip] = useState<Tip | null>(null);

  useEffect(() => {
    if (!window.matchMedia?.('(pointer: coarse)').matches) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let hide: ReturnType<typeof setTimeout> | undefined;
    let startX = 0;
    let startY = 0;
    // O toque longo que abriu a dica não pode virar um clique ao soltar.
    let swallowClick = false;

    const onStart = (e: TouchEvent) => {
      clearTimeout(timer);
      swallowClick = false;
      const touch = e.touches[0];
      // A dica é a do botão tocado, não a de quem está em volta dele.
      const el = (e.target as Element | null)?.closest?.('button, a, [title]');
      const text = el?.getAttribute('title');
      if (!touch || !text) return;
      startX = touch.clientX;
      startY = touch.clientY;
      timer = setTimeout(() => {
        swallowClick = true;
        setTip({ text, y: startY });
        clearTimeout(hide);
        hide = setTimeout(() => setTip(null), SHOW_MS);
      }, HOLD_MS);
    };
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && Math.hypot(touch.clientX - startX, touch.clientY - startY) > MOVE_TOLERANCE) {
        clearTimeout(timer);
      }
    };
    const onEnd = () => clearTimeout(timer);
    const onClick = (e: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      e.preventDefault();
      e.stopPropagation();
    };

    // No Android, segurar uma imagem abriria o menu do sistema por cima da dica.
    const onContextMenu = (e: Event) => {
      if ((e.target as Element | null)?.closest?.('[title]')) e.preventDefault();
    };

    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
    document.addEventListener('touchcancel', onEnd);
    document.addEventListener('click', onClick, true);
    return () => {
      clearTimeout(timer);
      clearTimeout(hide);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      document.removeEventListener('touchcancel', onEnd);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  if (!tip) return null;
  // Acima do dedo, sem sair da tela.
  const above = tip.y > 120;
  return (
    <div
      className="touch-tip frame frame-dialog"
      role="tooltip"
      style={
        above
          ? { bottom: window.innerHeight - tip.y + 24, left: 8, right: 8 }
          : { top: tip.y + 32, left: 8, right: 8 }
      }
    >
      {tip.text}
    </div>
  );
}
