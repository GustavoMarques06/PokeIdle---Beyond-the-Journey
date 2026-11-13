// TREINADOR: cartão de treinador (com moldura e vitrine de medalhas), medalhas, automação,
// opções e salvamento.

import { useEffect, useRef, useState } from 'react';
import {
  LEGENDARIES,
  ACHIEVEMENTS,
  CARD_FRAMES,
  MEDAL_TIERS,
  AVATAR_NAMES,
  AVATAR_OUTFITS,
  OUTFIT_COLORS,
  OUTFIT_PART_ORDER,
  PLAYER_AVATARS,
  cleanOutfit,
  REGIONS,
  SHOWCASE_SLOTS,
  SPECIES,
  assetUrl,
  type AchievementDef,
  type MedalTier,
} from '../../game-data';
import {
  setOutfitColor,
  setTrainerAvatar,
  setTrainerName,
  weeklyMvp,
  type GameState,
  type Settings,
} from '../../core/game';
import {
  achievementProgress,
  frameUnlocked,
  medalPoints,
  setCardFrame,
  toggleShowcase,
  trainerLevel,
} from '../../core/meta';
import { decodeTransferCode, encodeTransferCode, TRANSFER_EXTENSION } from '../../core/transfer';
import { Bar, ItemIcon, Money, PixelIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import { Badges } from '../components/Hud';
import { teamPokemon } from '../../core/team';
import { StatsPanel } from '../components/StatsPanel';
import { Automation } from './trainer/Automation';
import { HOTKEY_HELP } from '../hotkeys';
import { NOTIFY_CATEGORIES, requestNotificationPermission } from '../notify';
import { REGION_NAMES, T, formatDuration, formatNumber, speciesName } from '../i18n/pt-BR';
import { downloadBackup } from '../backup';
import {
  autoBackupStatus,
  autoBackupSupported,
  resumeAutoBackup,
  startAutoBackup,
  stopAutoBackup,
  type AutoBackupStatus,
} from '../autoBackup';
import { openHelp } from '../help/open';
import { preloadEverything, usePreloadStatus } from '../preload';
import { useEngine } from '../useGame';
import { legendTitle } from '../i18n/legends';
import { ChangelogList } from '../components/Changelog';
import { Journey } from './trainer/Journey';
import { finaleTitle } from '../components/StoryScene';
import { askConfirm } from '../components/GameConfirm';
import { MODIFIED_FLAG } from '../../core/save';

type Toggle = Exclude<keyof Settings, 'volume' | 'animSpeed' | 'notifyOff' | 'battleMode' | 'graphics'>;

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
  { key: 'autoSwitch', label: 'Trocar para quem tem vantagem de tipo' },
  { key: 'nextSteps', label: 'Mostrar o painel de próximos passos' },
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

/** A tela é longa demais para uma rolagem só: cada assunto na sua aba. */
const TRAINER_TABS = [
  { id: 'card', label: 'CARTÃO' },
  { id: 'story', label: 'JORNADA' },
  { id: 'records', label: 'CONQUISTAS' },
  { id: 'automation', label: 'AUTOMAÇÃO' },
  { id: 'options', label: 'OPÇÕES' },
  { id: 'data', label: 'DADOS' },
  { id: 'news', label: 'NOVIDADES' },
] as const;

/** Título pela coleção de lendários (ver i18n/legends.ts). */
function legendCardTitle(state: GameState): string | undefined {
  const all = LEGENDARIES.filter((l) => l.tier !== 'pseudo');
  const legend = legendTitle(all.filter((l) => state.legends.caught.includes(l.speciesId)).length, all.length);
  const story = finaleTitle(state);
  return [story, legend].filter(Boolean).join(' · ') || undefined;
}

/** As 5 estrelas do cartão, como nos jogos: cada uma por um grande feito. */
function cardStars(state: GameState, caught: number, medals: number) {
  const champions = new Set(state.hallOfFame.map((h) => h.regionId));
  return [
    { label: 'Campeão de uma região', on: champions.size > 0 },
    { label: 'Metade da Pokédex', on: caught >= SPECIES.length / 2 },
    { label: 'Andar 50 da Torre de Batalha', on: state.tower.best >= 50 },
    { label: 'Metade das medalhas', on: medals >= ACHIEVEMENTS.length / 2 },
    { label: 'Campeão de todas as regiões', on: champions.size >= REGIONS.length },
  ];
}

/** O cartão inclina um pouco seguindo o mouse (só com mouse e sem movimento reduzido). */
function useCardTilt() {
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse' || document.documentElement.classList.contains('reduced-motion')) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
    e.currentTarget.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
    e.currentTarget.style.setProperty('--hx', `${Math.round((x + 0.5) * 100)}%`);
  };
  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.removeProperty('--rx');
    e.currentTarget.style.removeProperty('--ry');
    e.currentTarget.style.removeProperty('--hx');
  };
  return { onPointerMove, onPointerLeave };
}

/** Verso do cartão: a equipe, as estrelas explicadas e os números da jornada. */
function CardBack({ state, stars }: { state: GameState; stars: { label: string; on: boolean }[] }) {
  const team = teamPokemon(state);
  const shinies = state.collection.filter((p) => p.shiny).length;
  return (
    <div className="card-back-body">
      <div className="card-team">
        {team.map((p) => (
          <span key={p.uid} className="card-team-mon">
            <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} form={p.form} />
            <small>Nv{p.level}</small>
          </span>
        ))}
      </div>
      <ul className="card-star-list">
        {stars.map((st) => (
          <li key={st.label} className={st.on ? 'on' : ''}>
            <PixelIcon name="star" scale={2} /> {st.label}
          </li>
        ))}
      </ul>
      <dl className="card-grid card-back-grid">
        <dt>SHINIES</dt>
        <dd>{shinies}</dd>
        <dt>HALL DA FAMA</dt>
        <dd>{state.hallOfFame.length}</dd>
        <dt>TORRE</dt>
        <dd>andar {state.tower.best}</dd>
        <dt>DESDE</dt>
        <dd>{new Date(state.createdAt).toLocaleDateString('pt-BR')}</dd>
      </dl>
    </div>
  );
}

export function TrainerScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [tab, setTab] = useState<(typeof TRAINER_TABS)[number]['id']>('card');
  const [name, setName] = useState(state.trainerName);
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
  const [back, setBack] = useState(false);
  const stars = cardStars(state, caught, done.size);
  const tilt = useCardTilt();

  return (
    <div className="trainer-screen">
      <div className="activity-tabs trainer-tabs frame frame-menu" role="tablist">
        {TRAINER_TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`activity-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <button className="pbtn small trainer-help" onClick={openHelp}>
        <PixelIcon name="help" scale={2} /> Como jogar
      </button>

      {tab === 'card' && (
        <>
          <div
            key={back ? 'back' : 'front'}
            className={`trainer-card frame frame-card card-frame-${state.cardFrame} stars-${stars.filter((x) => x.on).length} ${back ? 'card-back' : ''}`}
            {...tilt}
          >
            <span className="card-holo" aria-hidden />
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
              <span className="card-stars">
                {stars.map((st) => (
                  <span key={st.label} className={st.on ? 'on' : ''} title={`${st.label}${st.on ? ' ✓' : ''}`}>
                    <PixelIcon name="star" scale={2} />
                  </span>
                ))}
              </span>
              <span>ID Nº{String(state.createdAt % 65536).padStart(5, '0')}</span>
              <button className="pbtn small card-flip" onClick={() => setBack((v) => !v)}>
                {back ? 'Frente' : 'Virar'}
              </button>
            </div>
            {back ? (
              <CardBack state={state} stars={stars} />
            ) : (
            <>
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
                {state.flags.includes(MODIFIED_FLAG) && (
                  <>
                    <dt>SAVE</dt>
                    <dd>
                      <span
                        className="tag tag-modified"
                        title="Este save foi editado fora do jogo. Trocas e equipes de duelo levam o aviso."
                      >
                        MODIFICADO
                      </span>
                    </dd>
                  </>
                )}
                {legendCardTitle(state) && (
                  <>
                    <dt>TÍTULO</dt>
                    <dd className="card-title-legend">{legendCardTitle(state)!.toUpperCase()}</dd>
                  </>
                )}
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
                      <PokemonSprite speciesId={mvpMon.speciesId} kind="icon" />{' '}
                      {speciesName(mvpMon.speciesId)} · {mvp!.wins} vitórias na semana
                    </>
                  ) : (
                    '—'
                  )}
                </dd>
              </dl>
              <div className="card-portrait">
                <div className="card-trainer">
                  <TrainerSprite id={state.trainerAvatar} outfit={state.trainerOutfit} size={128} />
                  {companion && (
                    <span
                      className="card-companion"
                      title={`${speciesName(companion.speciesId)} acompanha você`}
                    >
                      <PokemonSprite
                        speciesId={companion.speciesId}
                        kind="front"
                        shiny={companion.shiny}
                        form={companion.form}
                      />
                    </span>
                  )}
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
                    <PixelIcon name="trophyEmpty" scale={3} />
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
            </>
            )}
          </div>

          {/* O visual muda pouco: fica recolhido, e o cartão aparece inteiro de cara. */}
          <details className="fold">
            <summary>Mudar o visual do treinador</summary>
            <LookEditor state={state} />
          </details>
        </>
      )}

      {tab === 'records' && (
        <>
          <StatsPanel state={state} />

          <Window
            title={`HALL DA FAMA · ${state.hallOfFame.length}`}
            icon={<ItemIcon id="relic-crown" size={24} />}
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
        </>
      )}

      {tab === 'automation' && <Automation state={state} />}

      {tab === 'story' && <Journey state={state} />}

      {tab === 'news' && (
        <Window title="NOVIDADES · LOG DE ATUALIZAÇÕES">
          <ChangelogList />
        </Window>
      )}

      {tab === 'options' && (
        <>
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
                      if (
                        t.key === 'notifications' &&
                        turningOn &&
                        !(await requestNotificationPermission())
                      ) {
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
              {state.settings.notifications && (
                <fieldset className="notify-categories">
                  <legend>Avisar sobre</legend>
                  {NOTIFY_CATEGORIES.map((c) => (
                    <label key={c.id} className="box-check">
                      <input
                        type="checkbox"
                        checked={!state.settings.notifyOff.includes(c.id)}
                        onChange={(e) =>
                          engine.dispatch((s) => {
                            const off = s.settings.notifyOff.filter((id) => id !== c.id);
                            s.settings.notifyOff = e.target.checked ? off : [...off, c.id];
                          })
                        }
                      />
                      {c.label}
                    </label>
                  ))}
                </fieldset>
              )}
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
                <span>Gráficos</span>
                <select
                  value={state.settings.graphics}
                  onChange={(e) =>
                    engine.dispatch((s) => {
                      s.settings.graphics = e.target.value as typeof s.settings.graphics;
                    })
                  }
                >
                  <option value="performance">Desempenho (mais leve)</option>
                  <option value="normal">Normal (pixel art)</option>
                </select>
              </label>
              <p className="hint">
                {state.settings.graphics === 'performance'
                  ? 'Desempenho: Pokémon parados, sem clima, efeitos, números de dano nem animações. O progresso é o mesmo. Para aparelhos mais fracos.'
                  : 'Normal: pixel art, como o jogo foi desenhado.'}
              </p>
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
            {message && (
              <p className="hint alert" role="status">
                {message}
              </p>
            )}
          </Window>

          <Window title="ATALHOS DE TECLADO" icon={<ItemIcon id="teachy-tv" size={24} />}>
            <dl className="hotkey-list">
              {HOTKEY_HELP.map(([key, what]) => (
                <div key={`${key}:${what}`}>
                  <dt>
                    <kbd>{key}</kbd>
                  </dt>
                  <dd>{what}</dd>
                </div>
              ))}
            </dl>
          </Window>
        </>
      )}

      {tab === 'data' && (
        <>
          <SaveTools state={state} />

          <GameFiles />
        </>
      )}
    </div>
  );
}

/** Salvar: código de transferência (copiar/colar), arquivo .pkidle e recomeçar. */
function SaveTools({ state }: { state: GameState }) {
  const engine = useEngine();
  const [code, setCode] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const generate = async () => {
    const { code, rawBytes } = await encodeTransferCode(state, Date.now());
    setCode(code);
    const size = `${formatBytes(code.length)} (o save tem ${formatBytes(rawBytes)})`;
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`${T.settings.copied} ${size}`);
    } catch {
      setMessage(`Código gerado: ${size}. Copie o texto abaixo.`);
    }
    return code;
  };

  const download = async () => {
    // Sempre um código novo: o que está na tela pode ser de antes de continuar jogando.
    await downloadBackup(state, Date.now(), await generate());
  };

  const load = async (text: string) => {
    const result = await decodeTransferCode(text);
    if (!result.ok) return setMessage(`Erro: ${result.error}`);
    const incoming = result.file.state;
    const summary = `${incoming.trainerName}: ${incoming.collection.length} Pokémon, salvo em ${new Date(result.file.meta.savedAt).toLocaleString('pt-BR')}`;
    if (
      !(await askConfirm(`Carregar o jogo de ${summary}?

O jogo atual neste aparelho será substituído.`))
    )
      return;
    engine.replaceState(incoming);
    setImportText('');
    setMessage(T.settings.importOk);
  };

  return (
    <>
      <AutoBackup state={state} />
      <Window title="SALVAR E TRANSFERIR" icon={<ItemIcon id="fame-checker" size={24} />}>
        <div className="save-tools">
          <p className="hint">
            O jogo salva sozinho a cada 15 s e após eventos importantes
            {engine.saveBytes > 0 && ` · tamanho do save: ${formatBytes(engine.saveBytes)}`}. Para jogar em
            outro navegador ou computador, gere o código de transferência (ou baixe o arquivo) e carregue-o
            lá.
          </p>
          <div className="save-row">
            <button className="pbtn small" onClick={() => void generate()}>
              {T.settings.export}
            </button>
            <button className="pbtn small" onClick={() => void download()}>
              Baixar arquivo {TRANSFER_EXTENSION}
            </button>
          </div>
          {code && (
            <textarea
              readOnly
              value={code}
              rows={3}
              aria-label="Código de transferência"
              onFocus={(e) => e.target.select()}
            />
          )}
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={3}
            aria-label="Código para carregar"
            placeholder={T.settings.importPlaceholder}
          />
          <div className="save-row">
            <button
              className="pbtn small"
              disabled={!importText.trim()}
              onClick={() => void load(importText)}
            >
              {T.settings.import}
            </button>
            <button className="pbtn small" onClick={() => fileInput.current?.click()}>
              Abrir arquivo…
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
            <p className="hint alert" role="status">
              {message}
            </p>
          )}
          <button
            className="pbtn small danger"
            onClick={async () => {
              if (await askConfirm(T.settings.resetConfirm)) engine.resetSave();
            }}
          >
            {T.settings.reset}
          </button>
        </div>
      </Window>
    </>
  );
}

/** VISUAL: o personagem (6 roupas base) e a cor de cada peça de roupa. */
function LookEditor({ state }: { state: GameState }) {
  const engine = useEngine();
  const pieces = [...AVATAR_OUTFITS[state.trainerAvatar]].sort(
    (a, b) => OUTFIT_PART_ORDER.indexOf(a.part) - OUTFIT_PART_ORDER.indexOf(b.part),
  );
  const custom = Object.keys(state.trainerOutfit).length > 0;
  return (
    <Window
      title="VISUAL"
      icon={<ItemIcon id="silk-scarf" size={24} />}
      actions={
        custom && (
          <button
            className="pbtn small"
            onClick={() => engine.dispatch((s) => pieces.forEach((p) => setOutfitColor(s, p.part, null)))}
          >
            Cores originais
          </button>
        )
      }
    >
      <div className="look-editor">
        <div className="look-top">
          <TrainerSprite
            id={state.trainerAvatar}
            outfit={state.trainerOutfit}
            size={96}
            className="look-preview"
          />
          <div className="look-avatars" role="radiogroup" aria-label="Personagem">
            {PLAYER_AVATARS.map((a) => (
              <button
                key={a}
                role="radio"
                aria-checked={state.trainerAvatar === a}
                className={`avatar-btn ${state.trainerAvatar === a ? 'active' : ''}`}
                onClick={() => engine.dispatch((s) => setTrainerAvatar(s, a))}
                title={`${AVATAR_NAMES[a]} · roupa de ${a.endsWith('_rs') ? 'Ruby/Sapphire' : a === 'red' || a === 'leaf' ? 'FireRed/LeafGreen' : 'Emerald'}`}
              >
                <TrainerSprite id={a} outfit={cleanOutfit(a, state.trainerOutfit)} size={52} head />
              </button>
            ))}
          </div>
        </div>
        <div className="look-pieces">
          {pieces.map((piece) => {
            const current = state.trainerOutfit[piece.part];
            return (
              <div key={piece.part} className="look-row">
                <span className="look-label">{piece.label.toUpperCase()}</span>
                <div className="look-swatches" role="radiogroup" aria-label={piece.label}>
                  <button
                    role="radio"
                    aria-checked={current === undefined}
                    className={`swatch swatch-original ${current === undefined ? 'active' : ''}`}
                    title="Cor original"
                    onClick={() => engine.dispatch((s) => setOutfitColor(s, piece.part, null))}
                  />
                  {OUTFIT_COLORS.map((c, i) => (
                    <button
                      key={c.name}
                      role="radio"
                      aria-checked={current === i}
                      className={`swatch ${current === i ? 'active' : ''}`}
                      style={{ background: `#${c.hex}` }}
                      title={c.name}
                      onClick={() => engine.dispatch((s) => setOutfitColor(s, piece.part, i))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Window>
  );
}

/** ARQUIVOS DO JOGO: quanto já está no aparelho (ver preload.ts); só no navegador. */
function GameFiles() {
  const s = usePreloadStatus();
  if (!s.supported) return null;
  const done = s.filesDone >= s.files;
  return (
    <Window title="ARQUIVOS DO JOGO" icon={<ItemIcon id="up-grade" size={24} />}>
      <div className="game-files">
        <Bar value={s.bytesDone} max={s.bytes} tone={done ? 'grass' : 'exp'} />
        <p className="hint">
          {done
            ? `Tudo pronto: ${formatNumber(s.files)} arquivos (${formatBytes(s.bytes)}) guardados neste aparelho. O jogo abre na hora, também sem internet.`
            : `${formatNumber(s.filesDone)} de ${formatNumber(s.files)} arquivos (${formatBytes(s.bytesDone)} de ${formatBytes(s.bytes)}).`}
          {!done && s.running && ' Baixando em segundo plano: pode jogar normalmente.'}
          {!done && s.offline && ' Sem internet: continua quando a conexão voltar.'}
          {!done &&
            s.waitingForData &&
            ' O essencial já está pronto. Os sprites baixam quando aparecem, para poupar seus dados. Para jogar sem internet com todos eles, baixe tudo (de preferência no Wi-Fi).'}
        </p>
        {!done && !s.running && (
          <button className="pbtn small" onClick={preloadEverything}>
            Baixar tudo ({formatBytes(Math.max(0, s.bytes - s.bytesDone))})
          </button>
        )}
      </div>
    </Window>
  );
}

/** Cópia automática num arquivo do computador (Chrome e Edge). */
function AutoBackup({ state }: { state: GameState }) {
  const [status, setStatus] = useState<{ status: AutoBackupStatus; file?: string }>({ status: 'off' });
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    void autoBackupStatus().then(setStatus);
  }, []);
  if (!autoBackupSupported()) return null;
  const refresh = () => void autoBackupStatus().then(setStatus);
  return (
    <Window title="CÓPIA AUTOMÁTICA" icon={<ItemIcon id="fame-checker" size={24} />}>
      <p className="hint">
        {status.status === 'on'
          ? `Ligada: o jogo grava uma cópia em “${status.file}” a cada 10 minutos e ao sair. Se o navegador apagar os dados, é só carregar esse arquivo.`
          : status.status === 'paused'
            ? `Pausada: depois de reabrir o navegador, ele pede um clique para voltar a gravar em “${status.file}”.`
            : 'Guarde seu save num arquivo do computador, atualizado sozinho. Se o navegador apagar os dados do site, o arquivo continua lá.'}
      </p>
      <div className="save-actions">
        {status.status === 'off' && (
          <button
            className="pbtn small primary"
            onClick={() =>
              void startAutoBackup(state)
                .then(() => setMessage('Pronto: a primeira cópia já foi gravada.'))
                .catch(
                  (e: Error) => e.name !== 'AbortError' && setMessage('Não foi possível usar este arquivo.'),
                )
                .finally(refresh)
            }
          >
            Escolher arquivo
          </button>
        )}
        {status.status === 'paused' && (
          <button
            className="pbtn small primary"
            onClick={() =>
              void resumeAutoBackup(state)
                .then((ok) => setMessage(ok ? 'Retomada.' : 'O navegador não liberou o arquivo.'))
                .finally(refresh)
            }
          >
            Retomar
          </button>
        )}
        {status.status !== 'off' && (
          <button className="pbtn small" onClick={() => void stopAutoBackup().then(refresh)}>
            Parar
          </button>
        )}
      </div>
      {message && (
        <p className="hint alert" role="status">
          {message}
        </p>
      )}
    </Window>
  );
}
