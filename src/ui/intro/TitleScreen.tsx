// Menu inicial (depois do "Pressione Start"): janelas empilhadas, como nos portáteis. Com
// save no aparelho, CONTINUAR vem primeiro, com um resumo da jornada. Carregar aceita o
// código de transferência ou o arquivo .pkidle, para quem chega num aparelho novo não
// precisar começar uma jornada só para importar.

import { useEffect, useRef, useState } from 'react';
import { BADGES, getRoute } from '../../game-data';
import type { GameState } from '../../core/game';
import { caughtCount } from '../../core/dex';
import { decodeTransferCode, TRANSFER_EXTENSION } from '../../core/transfer';
import { TrainerSprite } from '../components/common';
import { REGION_NAMES, T, formatDuration } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { MusicToggle } from './MusicToggle';

export function TitleScreen({
  save,
  onContinue,
  onNewGame,
  onBack,
}: {
  save: GameState | null;
  onContinue: () => void;
  onNewGame: () => void;
  onBack: () => void;
}) {
  const engine = useEngine();
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const newGame = () => {
    if (save && !window.confirm(T.intro.newGameConfirm(save.trainerName))) return;
    onNewGame();
  };
  const primary = save ? onContinue : newGame;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (loading) setLoading(false);
        else onBack();
        return;
      }
      if (loading) return;
      if (e.key === 'Enter' && !e.repeat && (e.target as HTMLElement).tagName !== 'BUTTON') {
        e.preventDefault();
        primary();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const load = async (code: string) => {
    const result = await decodeTransferCode(code);
    if (!result.ok) return setMessage(`Erro: ${result.error}`);
    const incoming = result.file.state;
    if (save && !window.confirm(T.intro.loadConfirm(incoming.trainerName, save.trainerName))) return;
    engine.replaceState(incoming);
    onContinue();
  };

  return (
    <div className="title-screen">
      <MusicToggle />
      {!loading ? (
        <nav className="title-menu" aria-label="Menu inicial">
          {save && (
            <button className="title-option continue frame frame-menu" onClick={onContinue} autoFocus>
              CONTINUAR
              <SaveSummary state={save} />
            </button>
          )}
          <button className="title-option frame frame-menu" onClick={newGame} autoFocus={!save}>
            NOVO JOGO
          </button>
          <button className="title-option frame frame-menu" onClick={() => setLoading(true)}>
            CARREGAR JOGO
          </button>
          <p className="title-hint">ENTER: CONFIRMAR · ESC: VOLTAR</p>
        </nav>
      ) : (
        <div className="title-load frame frame-menu">
          <p className="hint">
            Trouxe o jogo de outro aparelho? Cole o código de transferência ou abra o arquivo{' '}
            {TRANSFER_EXTENSION}.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            aria-label="Código para carregar"
            placeholder={T.settings.importPlaceholder}
            autoFocus
          />
          <div className="save-row">
            <button className="pbtn small primary" disabled={!text.trim()} onClick={() => void load(text)}>
              {T.settings.import}
            </button>
            <button className="pbtn small" onClick={() => fileInput.current?.click()}>
              Abrir arquivo…
            </button>
            <button
              className="pbtn small"
              onClick={() => {
                setLoading(false);
                setMessage(null);
              }}
            >
              Voltar
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={`${TRANSFER_EXTENSION},.txt,.json`}
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) await load(await file.text());
              }}
            />
          </div>
          {message && (
            <p className="hint" role="status">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Ficha do save, como a tela de CONTINUAR dos portáteis. */
function SaveSummary({ state }: { state: GameState }) {
  const badges = BADGES.filter((b) => state.routes[b.routeId]?.bossDefeated).length;
  const regionId = getRoute(state.currentRouteId).regionId;
  return (
    <span className="save-summary">
      <TrainerSprite id={state.trainerAvatar} size={80} />
      <dl>
        <dt>TREINADOR</dt>
        <dd>{state.trainerName.toUpperCase()}</dd>
        <dt>REGIÃO</dt>
        <dd>{REGION_NAMES[regionId] ?? regionId}</dd>
        <dt>POKéDEX</dt>
        <dd>{caughtCount(state)}</dd>
        <dt>INSÍGNIAS</dt>
        <dd>{badges}</dd>
        <dt>TEMPO</dt>
        <dd>{formatDuration(state.stats.playTimeMs)}</dd>
      </dl>
    </span>
  );
}
