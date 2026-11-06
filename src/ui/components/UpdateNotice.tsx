// Aviso de versão nova. Cada build grava um número em version.json e leva o mesmo número dentro do código: se o do
// site for outro, há versão nova. A página vem da rede quando há internet, então recarregar já traz a versão nova.
// Confere ao abrir, a cada poucos minutos e sempre que o jogador volta ao jogo (no celular, ao reabrir o app).

import { useEffect, useState } from 'react';
import { isTauri } from '../../engine/storage';
import { useEngine } from '../useGame';

const CHECK_MS = 10 * 60_000;
const FIRST_CHECK_MS = 5_000;

/** O número do site é uma versão diferente da que está rodando? (Resposta sem número não conta.) */
export function isNewVersion(running: string, published: unknown): boolean {
  return typeof published === 'string' && published !== '' && published !== running;
}

function useNewVersion(): string | null {
  const [found, setFound] = useState<string | null>(null);
  useEffect(() => {
    if (!import.meta.env.PROD || isTauri()) return;
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState === 'hidden' || !navigator.onLine) return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}version.json`, { cache: 'no-cache' });
        if (!res.ok) return;
        const { id } = (await res.json()) as { id?: unknown };
        if (!cancelled && isNewVersion(__BUILD_ID__, id)) setFound(id as string);
      } catch {
        // Sem internet ou resposta estranha: confere de novo mais tarde.
      }
    };
    const first = setTimeout(() => void check(), FIRST_CHECK_MS);
    const timer = setInterval(() => void check(), CHECK_MS);
    const onShow = () => void check();
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('online', onShow);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('online', onShow);
    };
  }, []);
  return found;
}

export function UpdateNotice() {
  const engine = useEngine();
  const version = useNewVersion();
  // "Depois" vale para esta versão; se sair outra, o aviso volta.
  const [dismissed, setDismissed] = useState<string | null>(null);
  if (!version || version === dismissed) return null;

  const update = () => {
    // O progresso é gravado antes de recarregar: atualizar não perde nada.
    if (engine.state) engine.save();
    window.location.reload();
  };

  return (
    <div className="update-notice frame frame-dialog" role="alert">
      <p>
        <strong>Nova versão do jogo!</strong> Seu progresso fica salvo.
      </p>
      <span className="update-notice-actions">
        <button className="pbtn small primary" onClick={update}>
          Atualizar
        </button>
        <button className="pbtn small" onClick={() => setDismissed(version)}>
          Depois
        </button>
      </span>
    </div>
  );
}
