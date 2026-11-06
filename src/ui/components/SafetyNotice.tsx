// Avisos para o save não se perder: no iPhone, instalar o jogo na Tela de Início; em qualquer aparelho, baixar uma
// cópia de tempos em tempos. Um de cada vez, sem bloquear o jogo.

import { useEffect, useState } from 'react';
import type { GameState } from '../../core/game';
import { isTauri } from '../../engine/storage';
import {
  downloadBackup,
  shouldRemindBackup,
  shouldSuggestInstall,
  snoozeBackup,
  snoozeInstall,
} from '../backup';

const SHOW_AFTER_MS = 20_000;

export function SafetyNotice({ state }: { state: GameState }) {
  const [notice, setNotice] = useState<'install' | 'backup' | null>(null);
  useEffect(() => {
    if (isTauri()) return;
    const t = setTimeout(() => {
      const now = Date.now();
      setNotice(shouldSuggestInstall(now) ? 'install' : shouldRemindBackup(state, now) ? 'backup' : null);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
    // Só ao entrar no jogo: o estado muda o tempo todo e não deve reabrir o aviso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
              void downloadBackup(state, Date.now());
              setNotice(null);
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
