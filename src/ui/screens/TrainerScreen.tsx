// TREINADOR: cartão de treinador, conquistas, opções e salvamento.

import { useState } from 'react';
import { ACHIEVEMENTS, PLAYER_AVATARS, REGIONS, SPECIES } from '../../game-data';
import { setTrainerAvatar, setTrainerName, type GameState, type Settings } from '../../core/game';
import { achievementProgress, trainerLevel } from '../../core/meta';
import { exportSave, importSave } from '../../core/save';
import { Bar, ItemIcon, Money, PixelIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import { Badges } from '../components/Hud';
import { REGION_NAMES, T, formatDuration, formatNumber } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

type Toggle = Exclude<keyof Settings, 'volume'>;

const TOGGLES: { key: Toggle; label: string; requires?: string }[] = [
  { key: 'autoEvolve', label: T.settings.autoEvolve },
  { key: 'showDamageNumbers', label: T.settings.damageNumbers },
  { key: 'reducedMotion', label: T.settings.reducedMotion },
  { key: 'illustratedScenes', label: 'Cenários ilustrados' },
  { key: 'autoCapture', label: T.settings.autoCapture, requires: 'auto-capture' },
  { key: 'sfx', label: T.settings.sfx },
  { key: 'cries', label: T.settings.cries },
  { key: 'music', label: T.settings.music },
];

export function TrainerScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [name, setName] = useState(state.trainerName);
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const trainer = trainerLevel(state);
  const caught = SPECIES.filter((s) => state.pokedex[s.id]?.caught).length;
  const done = new Set(state.achievements);

  const onExport = async () => {
    const text = exportSave(state, Date.now());
    setExported(text);
    try {
      await navigator.clipboard.writeText(text);
      setMessage(T.settings.copied);
    } catch {
      setMessage(null);
    }
  };

  const onImport = () => {
    const result = importSave(importText);
    if (result.ok) {
      engine.replaceState(result.file.state);
      setImportText('');
      setMessage(T.settings.importOk);
    } else setMessage(`Erro: ${result.error}`);
  };

  return (
    <div className="trainer-screen">
      <div className="trainer-card frame frame-card">
        <div className="card-head">
          <span>CARTÃO DE TREINADOR</span>
          <span>ID Nº{String(state.createdAt % 65536).padStart(5, '0')}</span>
        </div>
        <div className="card-body">
          <dl className="card-grid">
            <dt>NOME</dt>
            <dd>
              <input
                className="name-input"
                value={name}
                maxLength={12}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => engine.dispatch((s) => setTrainerName(s, name))}
                aria-label="Nome do treinador"
              />
            </dd>
            <dt>DINHEIRO</dt>
            <dd>
              <Money value={state.coins} />
            </dd>
            <dt>POKéDEX</dt>
            <dd>{caught}</dd>
            <dt>TEMPO</dt>
            <dd>{formatDuration(state.stats.playTimeMs)}</dd>
            <dt>NÍVEL</dt>
            <dd>
              {trainer.level} <Bar value={trainer.progress} max={1} tone="exp" />
            </dd>
            <dt>VITÓRIAS</dt>
            <dd>{formatNumber(state.stats.totalKills)}</dd>
            <dt>CAPTURAS</dt>
            <dd>{formatNumber(state.stats.totalCaptures)}</dd>
            <dt>JORNADAS</dt>
            <dd>{state.prestige.count}</dd>
          </dl>
          <div className="card-portrait">
            <TrainerSprite id={state.trainerAvatar} size={128} />
            <div className="avatar-pick">
              {PLAYER_AVATARS.map((a) => (
                <button
                  key={a}
                  className={`avatar-btn ${state.trainerAvatar === a ? 'active' : ''}`}
                  onClick={() => engine.dispatch((s) => setTrainerAvatar(s, a))}
                  title={a === 'red' ? 'Red' : 'Leaf'}
                >
                  <TrainerSprite id={a} size={48} head />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="card-badges">
          <span>INSÍGNIAS</span>
          {REGIONS.filter((r) => r.routes.some((id) => state.routes[id]?.unlocked)).map((r) => (
            <span key={r.id} className="badge-row">
              <small>{r.name.toUpperCase()}</small>
              <Badges state={state} regionId={r.id} size={30} />
            </span>
          ))}
        </div>
      </div>

      <Window
        title={`HALL DA FAMA · ${state.hallOfFame.length}`}
        icon={<PixelIcon name="trophy" scale={2} />}
      >
        {state.hallOfFame.length === 0 && (
          <p className="hint">Vença o Campeão de uma região para registrar sua equipe aqui.</p>
        )}
        <ol className="hall-of-fame">
          {[...state.hallOfFame].reverse().map((h, i) => (
            <li key={`${h.at}-${i}`} className="hof-entry frame frame-slot">
              <div className="hof-head">
                <strong>CAMPEÃO DE {(REGION_NAMES[h.regionId] ?? h.regionId).toUpperCase()}</strong>
                <small>
                  {new Date(h.at).toLocaleDateString('pt-BR')} · jornada {h.prestige + 1}
                </small>
              </div>
              <div className="hof-team">
                {h.team.map((m, j) => (
                  <span key={j} className="hof-mon">
                    <PokemonSprite speciesId={m.speciesId} kind="front" shiny={m.shiny} pixelScale={1} />
                    <small>Nv{m.level}</small>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {state.tower.best > 0 && (
          <p className="hint">Torre de Batalha: recorde no andar {state.tower.best}.</p>
        )}
      </Window>

      <Window
        title={`CONQUISTAS · ${done.size}/${ACHIEVEMENTS.length}`}
        icon={<PixelIcon name="trophy" scale={2} />}
      >
        <ul className="achievement-list">
          {ACHIEVEMENTS.map((a) => {
            const { value, target } = achievementProgress(state, a);
            const complete = done.has(a.id);
            return (
              <li key={a.id} className={complete ? 'done' : ''}>
                <PixelIcon name={complete ? 'trophy' : 'trophyEmpty'} scale={2} />
                <div>
                  <strong>{a.name}</strong>
                  <small>{a.description}</small>
                  {!complete && target > 1 && (
                    <span className="ach-progress">
                      <Bar value={Math.min(value, target)} max={target} tone="gold" />
                      {formatNumber(Math.min(value, target))}/{formatNumber(target)}
                    </span>
                  )}
                </div>
                <span className="ach-reward">
                  {a.reward.coins ? <Money value={a.reward.coins} /> : null}
                  {a.reward.research ? (
                    <>
                      <ItemIcon id="up-grade" size={20} />
                      {a.reward.research}
                    </>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      </Window>

      <Window title="OPÇÕES" icon={<ItemIcon id="teachy-tv" size={24} />}>
        <div className="options">
          {TOGGLES.filter((t) => !t.requires || state.upgrades.includes(t.requires)).map((t) => (
            <label key={t.key} className="option-row">
              <span>{t.label}</span>
              <button
                className={`switch ${state.settings[t.key] ? 'on' : ''}`}
                role="switch"
                aria-checked={state.settings[t.key]}
                onClick={() =>
                  engine.dispatch((s) => {
                    s.settings[t.key] = !s.settings[t.key];
                  })
                }
              >
                {state.settings[t.key] ? 'SIM' : 'NÃO'}
              </button>
            </label>
          ))}
          <label className="option-row">
            <span>{T.settings.volume}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.settings.volume}
              onChange={(e) =>
                engine.dispatch((s) => {
                  s.settings.volume = Number(e.target.value);
                })
              }
            />
          </label>
        </div>
      </Window>

      <Window title="SALVAR" icon={<ItemIcon id="fame-checker" size={24} />}>
        <div className="save-tools">
          <p className="hint">O jogo salva sozinho a cada 15 s e após eventos importantes.</p>
          <button className="pbtn small" onClick={onExport}>
            {T.settings.export}
          </button>
          {exported && <textarea readOnly value={exported} rows={3} onFocus={(e) => e.target.select()} />}
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            placeholder={T.settings.importPlaceholder}
          />
          <button className="pbtn small" disabled={!importText.trim()} onClick={onImport}>
            {T.settings.import}
          </button>
          {message && <p className="hint">{message}</p>}
          <button
            className="pbtn small danger"
            onClick={() => {
              if (window.confirm(T.settings.resetConfirm)) engine.resetSave();
            }}
          >
            {T.settings.reset}
          </button>
        </div>
      </Window>
    </div>
  );
}
