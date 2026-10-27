// TREINADOR: cartão de treinador (com moldura e vitrine de medalhas), medalhas, opções e salvamento.

import { useState } from 'react';
import {
  ACHIEVEMENTS,
  CARD_FRAMES,
  MEDAL_TIERS,
  PLAYER_AVATARS,
  REGIONS,
  SHOWCASE_SLOTS,
  SPECIES,
  assetUrl,
  type AchievementDef,
  type MedalTier,
} from '../../game-data';
import { setTrainerAvatar, setTrainerName, weeklyMvp, type GameState, type Settings } from '../../core/game';
import {
  achievementProgress,
  frameUnlocked,
  medalPoints,
  setCardFrame,
  toggleShowcase,
  trainerLevel,
} from '../../core/meta';
import { exportSave, importSave } from '../../core/save';
import { Bar, ItemIcon, Money, PixelIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import { Badges } from '../components/Hud';
import { StatsPanel } from '../components/StatsPanel';
import { HOTKEY_HELP } from '../hotkeys';
import { requestNotificationPermission } from '../notify';
import { REGION_NAMES, T, formatDuration, formatNumber, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

type Toggle = Exclude<keyof Settings, 'volume' | 'animSpeed'>;

const TOGGLES: { key: Toggle; label: string; requires?: string }[] = [
  { key: 'autoEvolve', label: T.settings.autoEvolve },
  { key: 'showDamageNumbers', label: T.settings.damageNumbers },
  { key: 'reducedMotion', label: T.settings.reducedMotion },
  { key: 'highContrast', label: 'Contraste alto' },
  { key: 'largeText', label: 'Texto maior' },
  { key: 'illustratedScenes', label: 'Cenários ilustrados' },
  { key: 'autoCapture', label: T.settings.autoCapture, requires: 'auto-capture' },
  { key: 'sfx', label: T.settings.sfx },
  { key: 'cries', label: T.settings.cries },
  { key: 'music', label: T.settings.music },
  { key: 'autoSwitch', label: 'Trocar para a reserva com vantagem de tipo' },
  { key: 'notifications', label: 'Avisos do sistema com o jogo em segundo plano' },
];

/** Cor de cada metal no ícone de medalha. */
const MEDAL_COLORS: Record<MedalTier, string> = {
  bronze: '#d08848',
  silver: '#c8d0e0',
  gold: '#f0c030',
  platinum: '#a8f0f0',
};

export function Medal({ def, earned, scale = 3 }: { def: AchievementDef; earned: boolean; scale?: number }) {
  return (
    <PixelIcon
      name="medal"
      scale={scale}
      palette={earned ? { c: MEDAL_COLORS[def.tier] } : { c: '#8890a0', r: '#9098a8', b: '#9098a8' }}
      className={`medal medal-${def.tier} ${earned ? '' : 'medal-locked'}`}
      title={def.name}
    />
  );
}

function formatBytes(n: number): string {
  return n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function TrainerScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [name, setName] = useState(state.trainerName);
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const trainer = trainerLevel(state);
  const caught = SPECIES.filter((s) => state.pokedex[s.id]?.caught).length;
  const done = new Set(state.achievements);
  const points = medalPoints(state);
  const showcase = state.showcase
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter((a): a is AchievementDef => !!a);
  const nextFrame = CARD_FRAMES.find((f) => f.points > points);
  const mvp = weeklyMvp(state, state.lastTimerAt);
  const mvpMon = mvp ? state.collection.find((p) => p.uid === mvp.uid) : undefined;
  const companion = state.companion
    ? state.collection.find((p) => p.uid === state.companion!.uid)
    : undefined;

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
      <div className={`trainer-card frame frame-card card-frame-${state.cardFrame}`}>
        {state.cardFrame !== 'basic' &&
          // Ornamento de canto desenhado (public/sprites/frames/<moldura>.png, o canto de cima à
          // esquerda), espelhado nos outros três. Sem o arquivo, ficam os cantos feitos em CSS.
          (['tl', 'tr', 'bl', 'br'] as const).map((corner) => (
            <img
              key={`${state.cardFrame}-${corner}`}
              className={`frame-corner frame-corner-${corner}`}
              src={assetUrl(`sprites/frames/${state.cardFrame}.png`)}
              alt=""
              draggable={false}
              onError={(e) => e.currentTarget.remove()}
            />
          ))}
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
            <dt>MVP</dt>
            <dd>
              {mvpMon ? (
                <>
                  <PokemonSprite speciesId={mvpMon.speciesId} kind="icon" /> {speciesName(mvpMon.speciesId)} ·{' '}
                  {mvp!.wins} vitórias na semana
                </>
              ) : (
                '—'
              )}
            </dd>
          </dl>
          <div className="card-portrait">
            <div className="card-trainer">
              <TrainerSprite id={state.trainerAvatar} size={128} />
              {companion && (
                <span className="card-companion" title={`${speciesName(companion.speciesId)} acompanha você`}>
                  <PokemonSprite
                    speciesId={companion.speciesId}
                    kind="front"
                    shiny={companion.shiny}
                    form={companion.form}
                  />
                </span>
              )}
            </div>
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
        <div className="card-showcase" aria-label="Vitrine de medalhas">
          <span>MEDALHAS · {points} pts</span>
          {Array.from({ length: SHOWCASE_SLOTS }, (_, i) => showcase[i]).map((a, i) =>
            a ? (
              <span key={a.id} className="showcase-slot filled" title={`${a.name}: ${a.description}`}>
                <Medal def={a} earned scale={3} />
                <small>{a.name}</small>
              </span>
            ) : (
              <span
                key={`empty-${i}`}
                className="showcase-slot"
                title="Escolha uma medalha abaixo para expor aqui"
              >
                <small>vazio</small>
              </span>
            ),
          )}
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

      <StatsPanel state={state} />

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
        title={`MEDALHAS · ${done.size}/${ACHIEVEMENTS.length}`}
        icon={<PixelIcon name="medal" scale={2} />}
      >
        <div className="medal-summary">
          {MEDAL_TIERS.map((t) => {
            const all = ACHIEVEMENTS.filter((a) => a.tier === t.id);
            const got = all.filter((a) => done.has(a.id)).length;
            return (
              <span key={t.id} className={`medal-count medal-${t.id}`}>
                {t.name}: {got}/{all.length} <small>({t.points} pt cada)</small>
              </span>
            );
          })}
        </div>
        <div className="frame-pick" role="radiogroup" aria-label="Moldura do cartão">
          <span>Moldura do cartão:</span>
          {CARD_FRAMES.map((f) => {
            const ok = frameUnlocked(state, f.id);
            return (
              <button
                key={f.id}
                role="radio"
                aria-checked={state.cardFrame === f.id}
                className={`pbtn small frame-swatch card-frame-${f.id} ${state.cardFrame === f.id ? 'primary' : ''}`}
                disabled={!ok}
                title={ok ? f.name : `${f.name}: libera com ${f.points} pontos de medalha`}
                onClick={() => engine.dispatch((s) => setCardFrame(s, f.id))}
              >
                {f.name}
                {!ok && ` · ${f.points}`}
              </button>
            );
          })}
        </div>
        <p className="hint">
          Clique numa medalha conquistada para expor no cartão (até {SHOWCASE_SLOTS}).
          {nextFrame && ` Próxima moldura (${nextFrame.name}) com ${nextFrame.points} pontos.`}
        </p>
        <ul className="achievement-list">
          {ACHIEVEMENTS.map((a) => {
            const { value, target } = achievementProgress(state, a);
            const complete = done.has(a.id);
            const shown = state.showcase.includes(a.id);
            return (
              <li key={a.id} className={`${complete ? 'done' : ''} ${shown ? 'shown' : ''}`}>
                <button
                  className="medal-btn"
                  disabled={!complete}
                  aria-pressed={shown}
                  title={
                    complete ? (shown ? 'Tirar da vitrine' : 'Expor no cartão') : 'Ainda não conquistada'
                  }
                  onClick={() => engine.dispatch((s) => toggleShowcase(s, a.id))}
                >
                  <Medal def={a} earned={complete} scale={3} />
                </button>
                <div>
                  <strong>
                    {a.name}{' '}
                    <small className={`tier-tag medal-${a.tier}`}>
                      {MEDAL_TIERS.find((t) => t.id === a.tier)?.name}
                    </small>
                  </strong>
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
                onClick={async () => {
                  const turningOn = !state.settings[t.key];
                  if (t.key === 'notifications' && turningOn && !(await requestNotificationPermission())) {
                    setMessage('O sistema não permitiu notificações.');
                    return;
                  }
                  engine.dispatch((s) => {
                    s.settings[t.key] = turningOn;
                  });
                }}
              >
                {state.settings[t.key] ? 'SIM' : 'NÃO'}
              </button>
            </label>
          ))}
          <label className="option-row">
            <span>Velocidade das animações</span>
            <select
              value={state.settings.animSpeed}
              onChange={(e) =>
                engine.dispatch((s) => {
                  s.settings.animSpeed = Number(e.target.value);
                })
              }
            >
              <option value={0.75}>Lenta (0,75×)</option>
              <option value={1}>Normal (1×)</option>
              <option value={1.5}>Rápida (1,5×)</option>
              <option value={2}>Muito rápida (2×)</option>
            </select>
          </label>
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

      <Window title="ATALHOS DE TECLADO" icon={<ItemIcon id="teachy-tv" size={24} />}>
        <dl className="hotkey-list">
          {HOTKEY_HELP.map(([key, what]) => (
            <div key={key}>
              <dt>
                <kbd>{key}</kbd>
              </dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </Window>

      <Window title="SALVAR" icon={<ItemIcon id="fame-checker" size={24} />}>
        <div className="save-tools">
          <p className="hint">
            O jogo salva sozinho a cada 15 s e após eventos importantes
            {engine.saveBytes > 0 && ` · tamanho do save: ${formatBytes(engine.saveBytes)}`}.
          </p>
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
