// Avisos para o save não se perder: no iPhone, instalar o jogo na Tela de Início; em qualquer aparelho, baixar uma
// cópia de tempos em tempos. Um de cada vez, sem bloquear o jogo.

import { useEffect, useState } from 'react';
import { isTauri } from '../../engine/storage';
import { useEngine } from '../useGame';
import {
  downloadBackup,
  shouldRemindBackup,
  shouldSuggestInstall,
  snoozeBackup,
  snoozeInstall,
} from '../backup';

const SHOW_AFTER_MS = 20_000;
const CHECK_EVERY_MS = 3_600_000;

export function SafetyNotice() {
  const engine = useEngine();
  const [notice, setNotice] = useState<'install' | 'backup' | 'failed' | null>(null);
  useEffect(() => {
    if (isTauri()) return;
    const check = () => {
      const now = Date.now();
      const state = engine.state;
      if (!state) return;
      setNotice(
        (cur) =>
          cur ?? (shouldSuggestInstall(now) ? 'install' : shouldRemindBackup(state, now) ? 'backup' : null),
      );
    };
    const first = setTimeout(check, SHOW_AFTER_MS);
    // Num jogo idle, a aba pode ficar aberta por dias: o lembrete não pode depender de reabrir.
    const again = setInterval(check, CHECK_EVERY_MS);
    return () => {
      clearTimeout(first);
      clearInterval(again);
    };
  }, [engine]);

  if (notice === 'failed') {
    return (
      <div className="update-notice safety-notice frame frame-dialog" role="alert">
        <p>
          <strong>Não deu para baixar a cópia.</strong> Tente em TREINADOR → DADOS, onde também dá para copiar
          o código.
        </p>
        <span className="update-notice-actions">
          <button className="pbtn small" onClick={() => setNotice(null)}>
            Entendi
          </button>
        </span>
      </div>
    );
  }
  if (notice === 'install') {
    return (
      <div className="update-notice safety-notice frame frame-dialog" role="status">
        <p>
          <strong>Instale o jogo para proteger seu save:</strong> toque em Compartilhar e depois em “Adicionar
          à Tela de Início”. No navegador, o iPhone pode apagar os dados depois de dias sem abrir o jogo.
        </p>
        <span className="update-notice-actions">
          <button
            className="pbtn small"
            onClick={() => {
              snoozeInstall(Date.now());
              setNotice(null);
            }}
          >
            Entendi
          </button>
        </span>
      </div>
    );
  }
  if (notice === 'backup') {
    return (
      <div className="update-notice safety-notice frame frame-dialog" role="status">
        <p>
          <strong>Faça uma cópia do seu save.</strong> Ele fica só neste aparelho: limpar os dados do
          navegador o apaga.
        </p>
        <span className="update-notice-actions">
          <button
            className="pbtn small primary"
            onClick={() => {
              setNotice(null);
              if (engine.state) downloadBackup(engine.state, Date.now()).catch(() => setNotice('failed'));
            }}
          >
            Baixar cópia
          </button>
          <button
            className="pbtn small"
            onClick={() => {
              snoozeBackup(Date.now());
              setNotice(null);
            }}
          >
            Depois
          </button>
        </span>
      </div>
    );
  }
  return null;
}
