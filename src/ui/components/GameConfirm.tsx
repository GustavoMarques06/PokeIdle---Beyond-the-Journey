// Pergunta de SIM / NÃO no visual do jogo, no lugar da caixa "confirmar" do navegador.
// Uso: `if (!(await askConfirm('Vender tudo?'))) return;`. Enter confirma, Esc cancela.

import { useEffect, useRef, useState } from 'react';
import { audio } from '../audio';

interface Ask {
  id: number;
  text: string;
  yes: string;
  no: string;
  resolve: (ok: boolean) => void;
}

let push: ((a: Ask) => void) | null = null;
let n = 0;

export function askConfirm(text: string, opts: { yes?: string; no?: string } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    const ask = { id: ++n, text, yes: opts.yes ?? 'SIM', no: opts.no ?? 'NÃO', resolve };
    // Sem a janela montada (testes, tela de erro), cai no do sistema para não travar a ação.
    if (push) push(ask);
    else resolve(window.confirm(text));
  });
}

export function GameConfirmHost() {
  const [queue, setQueue] = useState<Ask[]>([]);
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    push = (a) => setQueue((q) => [...q, a]);
    return () => {
      push = null;
    };
  }, []);
  const ask = queue[0];
  useEffect(() => {
    if (!ask) return;
    audio.sfx('cursor');
    yesRef.current?.focus();
  }, [ask]);
  if (!ask) return null;
  const answer = (ok: boolean) => {
    audio.sfx(ok ? 'click' : 'cursor');
    ask.resolve(ok);
    setQueue((q) => q.slice(1));
  };
  return (
    <div
      className="modal-backdrop game-confirm-backdrop"
      role="alertdialog"
      aria-modal="true"
      aria-label={ask.text}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          answer(false);
        }
      }}
    >
      <div className="game-confirm frame frame-dialog" key={ask.id}>
        <p>{ask.text}</p>
        <div className="game-confirm-actions frame frame-menu">
          <button ref={yesRef} className="game-confirm-yes" onClick={() => answer(true)}>
            {ask.yes}
          </button>
          <button onClick={() => answer(false)}>{ask.no}</button>
        </div>
      </div>
    </div>
  );
}
