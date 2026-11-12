// A AJUDA como uma tela do jogo: abre por cima (tecla H, menu, título) e fecha com Esc ou "Voltar ao jogo".

import { Suspense, lazy, useEffect, useState } from 'react';
import { HELP_EVENT } from './open';
import { Loading } from '../components/Dynamic';

const HelpPage = lazy(() => import('./HelpPage').then((m) => ({ default: m.HelpPage })));

export function HelpOverlay() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(HELP_EVENT, show);
    return () => window.removeEventListener(HELP_EVENT, show);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  if (!open) return null;
  return (
    <div className="help-overlay" role="dialog" aria-modal="true" aria-label="Como jogar">
      <Suspense fallback={<Loading />}>
        <HelpPage onClose={() => setOpen(false)} />
      </Suspense>
    </div>
  );
}
