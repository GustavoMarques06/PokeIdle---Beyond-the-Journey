// Log de atualizações: a lista de versões (aba NOVIDADES do Treinador) e a janela que abre sozinha, uma vez, depois
// de cada atualização. Quem acabou de começar não recebe a janela: o jogo inteiro já é novidade.

import { useEffect, useState } from 'react';
import { CHANGELOG, type ChangeTag } from '../../game-data';
import type { GameState } from '../../core/game';
import { useEngine } from '../useGame';

const newsFlag = (id: string) => `news:${id}`;
const TAG_TEXT: Record<ChangeTag, string> = { novo: 'NOVO', melhoria: 'MELHORIA', correção: 'CORREÇÃO' };

export function ChangelogList({ limit }: { limit?: number }) {
  return (
    <ol className="changelog">
      {CHANGELOG.slice(0, limit).map((entry, i) => (
        <li key={entry.id} className={`changelog-entry ${i === 0 ? 'latest' : ''}`}>
          <header>
            <strong>{entry.title}</strong>
            <small>{entry.date}</small>
          </header>
          <ul>
            {entry.items.map((item, k) => (
              <li key={k}>
                <span className={`change-tag tag-${item.tag === 'correção' ? 'fix' : item.tag}`}>{TAG_TEXT[item.tag]}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

/** Abre sozinha quando a versão mais nova ainda não foi vista neste save. */
export function NewsPopup({ state }: { state: GameState }) {
  const engine = useEngine();
  const latest = CHANGELOG[0];
  const seen = !latest || state.flags.includes(newsFlag(latest.id));
  const beginner = state.stats.totalKills < 20;
  const [ready, setReady] = useState(false);
  // Espera um pouco: o relatório offline e a ligação do Professor vêm primeiro.
  useEffect(() => {
    if (seen) return;
    if (beginner) {
      engine.dispatch((s) => void s.flags.push(...CHANGELOG.map((e) => newsFlag(e.id))));
      return;
    }
    const t = window.setTimeout(() => setReady(true), 4000);
    return () => window.clearTimeout(t);
  }, [engine, seen, beginner]);
  if (seen || beginner || !ready) return null;
  const close = () =>
    engine.dispatch((s) => {
      for (const e of CHANGELOG) if (!s.flags.includes(newsFlag(e.id))) s.flags.push(newsFlag(e.id));
    });
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Novidades">
      <div className="news-popup frame frame-dialog">
        <h2>NOVIDADES!</h2>
        <p className="hint">O jogo foi atualizado. Veja o que mudou:</p>
        <div className="news-scroll">
          <ChangelogList limit={1} />
        </div>
        <p className="hint">O histórico completo fica em TREINADOR › NOVIDADES.</p>
        <button className="pbtn primary" onClick={close} autoFocus>
          Legal!
        </button>
      </div>
    </div>
  );
}
