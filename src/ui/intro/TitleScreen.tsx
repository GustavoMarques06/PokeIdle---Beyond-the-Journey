// Menu inicial (depois do "Pressione Start"): janelas empilhadas, como nos portáteis. Com
// save no aparelho, CONTINUAR vem primeiro, com um resumo da jornada. Carregar aceita o
// código de transferência ou o arquivo .pkidle, para quem chega num aparelho novo não
// precisar começar uma jornada só para importar.

import { useEffect, useRef, useState } from 'react';
import { BADGES, SPECIES, getRoute } from '../../game-data';
import type { GameState } from '../../core/game';
import { caughtCount } from '../../core/dex';
import { genderOf } from '../../core/gender';
import { pokemonName } from '../../core/pokemon';
import { reservePokemon } from '../../core/team';
import { decodeTransferCode, TRANSFER_EXTENSION } from '../../core/transfer';
import { Bar, GenderMark, PokemonSprite, TrainerSprite } from '../components/common';
import { Badges } from '../components/Hud';
import { REGION_NAMES, T, formatDuration, formatNumber } from '../i18n/pt-BR';
import { usePreloadStatus } from '../preload';
import { openHelp } from '../help/open';
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
  // O foco automático rola a página até o botão: a tela sempre começa do topo.
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, []);
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
              <span className="title-option-label">CONTINUAR</span>
              <SaveSummary state={save} />
            </button>
          )}
          <div className="title-row">
            <button className="title-option frame frame-menu" onClick={newGame} autoFocus={!save}>
              <span className="title-option-label">NOVO JOGO</span>
              <small>
                {save ? 'Começar outra jornada (substitui esta)' : 'Escolher seu primeiro parceiro'}
              </small>
            </button>
            <button className="title-option frame frame-menu" onClick={() => setLoading(true)}>
              <span className="title-option-label">CARREGAR JOGO</span>
              <small>Código de transferência ou arquivo {TRANSFER_EXTENSION}</small>
            </button>
          </div>
          <button className="title-option frame frame-menu" onClick={openHelp}>
            <span className="title-option-label">COMO JOGAR</span>
            <small>Guia explicado do zero (abre em outra aba)</small>
          </button>
          <p className="title-hint">ENTER: CONFIRMAR · ESC: VOLTAR</p>
          <FilesHint />
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

/** Há quanto tempo foi a última sessão, em texto curto. */
function playedAgo(ms: number): string {
  if (ms < 60_000) return 'agora há pouco';
  if (ms < 86_400_000) return `há ${formatDuration(ms).replace(/ \d+ s$/, '')}`;
  const days = Math.floor(ms / 86_400_000);
  return days === 1 ? 'ontem' : `há ${days} dias`;
}

/**
 * Ficha do save, como a tela de CONTINUAR dos portáteis: treinador, região, onde parou,
 * Pokédex, tempo, dinheiro, insígnias da região e a equipe atual.
 */
function SaveSummary({ state }: { state: GameState }) {
  // Hora em que a tela abriu (o "há quanto tempo" não precisa andar enquanto ela está aberta).
  const [openedAt] = useState(() => Date.now());
  const route = getRoute(state.currentRouteId);
  const badges = BADGES.filter((b) => state.routes[b.routeId]?.bossDefeated).length;
  const caught = caughtCount(state);
  // Equipe, na ordem: o 1º é quem luta.
  const team = [
    { uid: state.activeUid, role: 'LUTANDO' },
    ...reservePokemon(state).map((p, i) => ({ uid: p.uid, role: `${i + 2}º` })),
  ].flatMap(({ uid, role }) => {
    const p = state.collection.find((x) => x.uid === uid);
    return p ? [{ p, role }] : [];
  });
  return (
    <span className="save-card">
      <span className="save-head">
        <strong>{state.trainerName.toUpperCase()}</strong>
        <span className="save-region">{(REGION_NAMES[route.regionId] ?? route.region).toUpperCase()}</span>
        <small title="Última vez que você jogou">{playedAgo(openedAt - state.lastTimerAt)}</small>
      </span>
      <span className="save-body">
        <span className="save-stage">
          <TrainerSprite id={state.trainerAvatar} outfit={state.trainerOutfit} size={88} />
        </span>
        <span className="save-stats">
          <span className="save-stat wide">
            <small>POKéDEX</small>
            <b>
              {caught}
              <i>/{SPECIES.length}</i>
            </b>
            <Bar value={caught} max={SPECIES.length} tone="grass" />
          </span>
          <span className="save-stat">
            <small>TEMPO</small>
            <b>{formatDuration(state.stats.playTimeMs).replace(/ \d+ s$/, '')}</b>
          </span>
          <span className="save-stat">
            <small>DINHEIRO</small>
            <b>₽{formatNumber(state.coins)}</b>
          </span>
          <span className="save-stat wide">
            <small>PAROU EM</small>
            <b className="save-place">{route.name}</b>
          </span>
        </span>
      </span>
      <span className="save-team" aria-label="Equipe">
        <small className="save-label">EQUIPE</small>
        {team.map(({ p, role }) => (
          <span key={p.uid} className={`save-mon ${role === 'ATIVO' ? 'lead' : ''}`}>
            <PokemonSprite speciesId={p.speciesId} kind="icon" shiny={p.shiny} />
            <span className="save-mon-info">
              <b>
                <span>{pokemonName(p)}</span>
                <GenderMark gender={genderOf(p)} />
              </b>
              <small>
                Nv{p.level} · {role}
              </small>
            </span>
          </span>
        ))}
      </span>
      <span className="save-foot">
        <span className="save-badges">
          <Badges state={state} size={20} />
          <small>
            {badges} {badges === 1 ? 'insígnia' : 'insígnias'}
          </small>
        </span>
      </span>
    </span>
  );
}

/** Enquanto os arquivos do jogo vão para o cache (preload.ts), uma linha discreta com o progresso. */
function FilesHint() {
  const s = usePreloadStatus();
  if (!s.supported || !s.running || s.bytes === 0) return null;
  return (
    <p className="title-files" role="status">
      Preparando arquivos do jogo… {Math.floor((s.bytesDone / s.bytes) * 100)}%
    </p>
  );
}
