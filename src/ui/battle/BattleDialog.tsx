// Parte de baixo da batalha, como nos portáteis: caixa de mensagens (com o modo AUTO/MANUAL,
// o desafio da rota e o registro) e o menu LUTAR / MOCHILA / POKéMON / FUGIR com submenus.
// No manual, a batalha espera o comando na vez do ativo; no automático, LUTAR escolhe o
// golpe só da próxima vez.

import { useCallback, useEffect, useRef, useState } from 'react';
import { THROWABLE_BALLS, getMove, getRoute, getSpecies, typeEffectiveness } from '../../game-data';
import { legendaryRules } from '../../core/legendary';
import { bossLook } from '../../core/rival';
import { canCaptureHere } from '../../core/nuzlocke';
import {
  activeMode,
  activePokemon,
  awaitingCommand,
  megaAvailable,
  megaEvolve,
  ballMultiplierNow,
  canChallengeBoss,
  canChallengeRaid,
  canChallengeRocket,
  canRematch,
  canThrowBall,
  challengeBoss,
  challengeRaid,
  challengeRematch,
  challengeRocket,
  currentCaptureChance,
  hasWater,
  modesAt,
  runAway,
  selectMove,
  setEncounterMode,
  switchActive,
  throwBall,
  type EncounterMode,
  type GameEvent,
  type GameState,
} from '../../core/game';
import { movesOf, pokemonName, statsOf } from '../../core/pokemon';
import { reservePokemon } from '../../core/team';
import { HpBar, ItemIcon, PixelIcon, PokemonSprite, TypeBadge } from '../components/common';
import { Coach } from '../components/Coach';
import { useHotkeys } from '../hotkeys';
import { battleText } from '../i18n/battleText';
import { ENCOUNTER_MODE_NAMES, itemName, moveName } from '../i18n/pt-BR';
import { useEngine, useGameEvents } from '../useGame';

const MULTIPLIER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const formatMultiplier = (x: number) => `${MULTIPLIER.format(x)}×`;

const HOLD_MS = 2500;
const TYPE_MS = 14;

export type ScreenId =
  | 'party'
  | 'dex'
  | 'bag'
  | 'shop'
  | 'map'
  | 'activities'
  | 'missions'
  | 'trainer'
  | 'upgrades'
  | 'pc'
  | 'help';

/** Onde procurar Pokémon nesta rota: grama, pesca ou surf (tecla E alterna). */
function ModeSwitch({
  modes,
  mode,
  onPick,
}: {
  modes: EncounterMode[];
  mode: EncounterMode;
  onPick: (m: EncounterMode) => void;
}) {
  const all: EncounterMode[] = ['land', 'fish', 'surf'];
  const icon: Record<EncounterMode, string> = { land: 'poke-ball', fish: 'old-rod', surf: 'surf' };
  return (
    <div className="mode-switch" role="radiogroup" aria-label="Onde procurar Pokémon (tecla E)">
      {all.map((m) => {
        const ok = modes.includes(m);
        return (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            className={`mode-btn ${mode === m ? 'active' : ''}`}
            disabled={!ok}
            title={
              ok
                ? `${ENCOUNTER_MODE_NAMES[m]} (tecla E alterna)`
                : m === 'fish'
                  ? 'Compre uma vara no Poké Mart para pescar aqui'
                  : 'Compre a HM Surf no Poké Mart para surfar aqui'
            }
            onClick={() => onPick(m)}
          >
            <ItemIcon id={icon[m]} size={18} />
            <span>{ENCOUNTER_MODE_NAMES[m].toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Seletor grama/pesca/surf, mostrado no canto da cena nas rotas com água. */
export function EncounterModeSwitch({ state }: { state: GameState }) {
  const engine = useEngine();
  const b = state.battle;
  const route = getRoute(b.routeId);
  const encounterId = route.kind === 'trial' && route.farm ? route.farm : route.id;
  if (b.kind !== 'wild' || !hasWater(encounterId)) return null;
  return (
    <ModeSwitch
      modes={modesAt(state, encounterId)}
      mode={activeMode(state, encounterId)}
      onPick={(m) => engine.dispatch((s) => setEncounterMode(s, m))}
    />
  );
}

export function BattleDialog({ state, onOpen }: { state: GameState; onOpen: (s: ScreenId) => void }) {
  const engine = useEngine();
  const [message, setMessage] = useState('');
  const [typed, setTyped] = useState(0);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [view, setView] = useState<'main' | 'fight' | 'bag' | 'party'>('main');
  const holdUntil = useRef(0);
  const nextId = useRef(1);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      const st = engine.state;
      if (!st) return;
      const ctx = {
        routeId: st.battle.routeId,
        bossBattle: st.battle.kind !== 'wild' && st.battle.kind !== 'legendary',
        playerName: pokemonName(activePokemon(st)),
        trainerName: st.battle.trainer?.name,
        nicknames: new Map(
          [activePokemon(st), ...reservePokemon(st)]
            .filter((p) => p.nickname)
            .map((p) => [p.speciesId, p.nickname!] as const),
        ),
      };
      const lines = events.map((e) => battleText(e, ctx)).filter((l) => l !== null);
      if (!lines.length) return;
      setLog((l) =>
        [...lines.map((x) => ({ id: nextId.current++, text: x.text })).reverse(), ...l].slice(0, 30),
      );
      // A evolução tem cena própria (que termina com a mesma frase): vai só para o REGISTRO.
      const live = events
        .filter((e) => e.type !== 'evolved')
        .map((e) => battleText(e, ctx))
        .filter((l) => l !== null);
      if (!live.length) return;
      const now = performance.now();
      const important = [...live].reverse().find((l) => l.important);
      const pick = important ?? (now >= holdUntil.current ? live[live.length - 1] : null);
      if (!pick) return;
      if (pick.important) holdUntil.current = now + HOLD_MS;
      setMessage(pick.text);
      setTyped(st.settings.reducedMotion ? pick.text.length : 0);
    },
    [engine],
  );
  useGameEvents(onEvents);

  // Efeito de digitação.
  useEffect(() => {
    if (typed >= message.length) return;
    const speed = state.settings.animSpeed || 1;
    const t = setTimeout(() => setTyped((n) => Math.min(message.length, n + Math.round(2 * speed))), TYPE_MS);
    return () => clearTimeout(t);
  }, [typed, message, state.settings.animSpeed]);

  const b = state.battle;
  const route = getRoute(b.routeId);
  const encounterId = route.kind === 'trial' && route.farm ? route.farm : route.id;
  const modes = modesAt(state, encounterId);
  const mode = activeMode(state, encounterId);
  const idleText =
    b.phase === 'spawning'
      ? b.kind === 'wild'
        ? route.kind === 'trial'
          ? `Treinando antes do desafio contra ${route.boss?.name}…`
          : mode === 'fish'
            ? 'Vara na água… esperando fisgar…'
            : mode === 'surf'
              ? 'Surfando pelas águas…'
              : 'Andando pela grama alta…'
        : b.kind === 'raid'
          ? 'O chefe da raide se prepara…'
          : `${b.trainer?.name ?? 'O treinador'} está escolhendo o próximo Pokémon…`
      : b.phase === 'defeat'
        ? 'Seu Pokémon está se recuperando…'
        : `O que ${pokemonName(activePokemon(state))} vai fazer?`;
  const text = message ? message.slice(0, typed) : idleText;
  // As duas mensagens anteriores ficam acima da atual, mais apagadas (a mais antiga em cima).
  const history = log
    .filter((l) => l.text !== message)
    .slice(0, 2)
    .reverse();

  // --- Bolas -------------------------------------------------------------------------------
  const usable = canThrowBall(state);
  const owned = THROWABLE_BALLS.filter((ball) => (state.items[ball] ?? 0) > 0);
  // Atalho W: a bola de maior efeito agora (Great, Ultra ou uma especial na situação dela).
  // A Ultra só entra por padrão em shinies, errantes e lendários, ou quando é a única.
  const special = b.enemy && (b.enemy.shiny || b.enemy.roamer || b.kind === 'legendary');
  const bestBall =
    owned
      .filter((ball) => ball !== 'poke-ball' && ball !== 'master-ball' && (ball !== 'ultra-ball' || special))
      .sort((x, y) => ballMultiplierNow(state, y) - ballMultiplierNow(state, x))[0] ??
    (owned.includes('ultra-ball') ? 'ultra-ball' : null);

  const throwIf = (ball: string | null) => {
    if (!ball || !usable || (state.items[ball] ?? 0) <= 0) return;
    engine.dispatch((s, now) => throwBall(s, ball, now));
    setView('main');
  };

  // --- Desafios ------------------------------------------------------------------------------
  const wild = b.kind === 'wild';
  const bossReady = canChallengeBoss(state, b.routeId);
  const prog = state.routes[b.routeId];
  const rocketHere = canChallengeRocket(state) && state.rocket?.routeId === b.routeId;
  const raidUp = canChallengeRaid(state);
  const rematchReady = canRematch(state, b.routeId) && wild;
  const bossName = route.boss ? bossLook(state, route.boss).name : '';
  const challengeLabel = !wild
    ? null
    : bossReady
      ? `DESAFIAR ${bossName.toUpperCase()}`
      : raidUp
        ? 'RAIDE'
        : rocketHere
          ? 'EQUIPE ROCKET'
          : rematchReady
            ? `REVANCHE: ${bossName.toUpperCase()}`
            : null;

  const challenge = () => {
    if (!wild) return;
    if (bossReady) engine.dispatch((s) => challengeBoss(s, b.routeId));
    else if (raidUp) engine.dispatch(challengeRaid);
    else if (rocketHere) engine.dispatch(challengeRocket);
    else if (rematchReady) engine.dispatch((s, now) => challengeRematch(s, b.routeId, now));
  };

  /** Grama → pesca → surf (só os que existem na rota). */
  const cycleMode = () => {
    if (modes.length < 2) return;
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    engine.dispatch((s) => setEncounterMode(s, next));
  };

  // --- Comandos ------------------------------------------------------------------------------
  const fighting = b.phase === 'fighting' && !!b.enemy;
  const manual = state.settings.battleMode === 'manual';
  const waiting = awaitingCommand(state);
  // MEGA: só no manual (no automático a Mega Evolução é sozinha) e só com a pedra certa.
  const mega = state.settings.battleMode === 'manual' ? megaAvailable(state) : undefined;
  const doMega = () => engine.dispatch((s) => megaEvolve(s));
  const player = activePokemon(state);
  const reserves = reservePokemon(state);
  const runLabel = wild ? 'FUGIR' : b.kind === 'boss' || b.kind === 'rocket' ? 'FUGIR' : 'DESISTIR';
  const runHint = !wild
    ? b.kind === 'tower'
      ? `parar no andar ${b.floor}`
      : b.kind === 'tournament'
        ? `perde a vaga (${state.tournament.score[0]}–${state.tournament.score[1]})`
        : b.kind === 'ghost'
          ? 'conta como derrota'
          : b.kind === 'legendary'
            ? `${legendaryRules(b.enemy?.speciesId ?? 0).throwLimit - (b.enemy?.throws ?? 0)} bolas até fugir`
            : b.kind === 'raid'
              ? `${Math.ceil((b.raidMs ?? 0) / 1000)} s restantes`
              : 'sair da batalha'
    : 'sem recompensa';

  const run = () => {
    engine.dispatch((s, now) => runAway(s, now));
    setView('main');
  };
  const toggleMode = () => {
    engine.dispatch((s) => {
      s.settings.battleMode = s.settings.battleMode === 'manual' ? 'auto' : 'manual';
      s.battle.pendingMove = undefined;
    });
    setView('main');
  };
  // Espera do golpe (manual): a barra enche até a vez do ativo; antes disso LUTAR fica travado.
  const charge =
    manual && fighting && !waiting && !b.pendingMove
      ? Math.max(0, 1 - Math.max(0, b.playerTimerMs) / Math.max(1, b.playerIntervalMs ?? b.playerTimerMs))
      : 1;

  // O submenu fica aberto entre um encontro e outro (no automático eles mudam rápido); fecha
  // depois de uma ação ou com Esc. No manual, LUTAR ganha o foco quando chega a vez.
  const fightButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (waiting && view === 'main' && document.activeElement === document.body) fightButton.current?.focus();
  }, [waiting, view]);

  useHotkeys({
    a: toggleMode,
    e: cycleMode,
    m: () => mega && doMega(),
    q: () => throwIf('poke-ball'),
    w: () => throwIf(bestBall),
    d: challenge,
    f: run,
    Escape: () => setView('main'),
  });

  return (
    <div className="battle-ui">
      <div className="dialog frame frame-dialog" aria-live="polite">
        <ol className="dialog-history" aria-hidden>
          {history.map((l) => (
            <li key={l.id}>{l.text}</li>
          ))}
        </ol>
        <p className="dialog-text">
          {text}
          {message && typed >= message.length && <span className="dialog-caret" />}
        </p>
        <div className="dialog-foot">
          <div className="battle-mode" role="radiogroup" aria-label="Modo de batalha (tecla A)">
            {(['auto', 'manual'] as const).map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={state.settings.battleMode === m}
                className={state.settings.battleMode === m ? 'on' : ''}
                title={
                  m === 'auto'
                    ? 'Automático: os golpes saem sozinhos (tecla A alterna)'
                    : 'Manual: a batalha espera você escolher a cada vez (tecla A alterna)'
                }
                onClick={() => state.settings.battleMode !== m && toggleMode()}
              >
                {m === 'auto' ? 'AUTO' : 'MANUAL'}
              </button>
            ))}
          </div>
          {mega && (
            <button className="dialog-mega" onClick={doMega} title="Mega Evoluir (tecla M)">
              MEGA
            </button>
          )}
          {challengeLabel && (
            <button className="dialog-challenge" onClick={challenge} title="Tecla D">
              <PixelIcon name={rocketHere && !bossReady && !raidUp ? 'rocket' : 'boss'} scale={1} />
              {challengeLabel}
            </button>
          )}
          {wild && route.boss && !challengeLabel && !prog.bossDefeated && (
            <span
              className="dialog-goal"
              title={`Vença ${route.killsRequired} Pokémon para desafiar ${bossName}`}
            >
              {bossName}: {Math.min(prog.kills, route.killsRequired)}/{route.killsRequired}
            </span>
          )}
          <button className="log-toggle" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
            REGISTRO {showLog ? '▼' : '▲'}
          </button>
        </div>
        {showLog && (
          <ol className="battle-log frame frame-menu">
            {log.map((l) => (
              <li key={l.id}>{l.text}</li>
            ))}
            {!log.length && <li>Nada por enquanto.</li>}
          </ol>
        )}
        {/* Nos primeiros minutos, o professor aparece de corpo inteiro com uma dica por vez. */}
        <Coach state={state} />
      </div>

      {/* Menu de comandos dos portáteis: LUTAR / MOCHILA / POKéMON / FUGIR, com submenus. */}
      <section
        className={`battle-cmds frame frame-menu ${waiting ? 'waiting' : ''} ${manual ? '' : 'auto'} view-${view}`}
        aria-label="Comandos"
      >
        {view === 'main' && (
          <div className="bc-main">
            {manual && (
              <button
                ref={fightButton}
                className="bc-big bc-fight"
                disabled={!waiting}
                onClick={() => setView('fight')}
                style={{ ['--charge' as string]: `${Math.round(charge * 100)}%` }}
              >
                <strong>LUTAR</strong>
                <small>
                  {b.pendingMove
                    ? `usando: ${moveName(b.pendingMove)}`
                    : waiting
                      ? 'escolher golpe'
                      : 'aguardando a vez…'}
                </small>
                {!waiting && <span className="bc-charge" aria-hidden />}
              </button>
            )}
            <button className="bc-big bc-bag" onClick={() => setView('bag')}>
              <strong>MOCHILA</strong>
              <small>
                {!usable
                  ? 'sem captura aqui'
                  : owned.length === 1
                    ? 'capturar com Poké Ball'
                    : `capturar · ${owned.length} tipos de bola`}
              </small>
            </button>
            <button className="bc-big bc-party" onClick={() => setView('party')}>
              <strong>POKéMON</strong>
              <small>{reserves.length ? `equipe de ${reserves.length + 1}` : 'ver equipe'}</small>
            </button>
            <button className="bc-big bc-run" disabled={!fighting} onClick={run} title="Tecla F">
              <strong>{runLabel}</strong>
              <small>{runHint}</small>
            </button>
          </div>
        )}

        {view === 'fight' && manual && (
          <div className="bc-sub">
            <button
              className="bc-back"
              onClick={() => setView('main')}
              aria-label="Voltar"
              title="Voltar (Esc)"
            />
            <div className="bc-moves">
              {movesOf(player).map((move) => {
                const mv = getMove(move);
                const eff = b.enemy ? typeEffectiveness(mv.type, getSpecies(b.enemy.speciesId).types) : 1;
                return (
                  <button
                    key={move}
                    className={`bc-move type-bg-${mv.type} ${b.pendingMove === move ? 'queued' : ''}`}
                    disabled={!waiting}
                    onClick={() => {
                      engine.dispatch((s) => void selectMove(s, move));
                      setView('main');
                    }}
                  >
                    <strong>{moveName(move).toUpperCase()}</strong>
                    <small>
                      <TypeBadge type={mv.type} /> POD {mv.power}
                      {eff !== 1 && (
                        <span className={`bc-eff ${eff > 1 ? 'up' : 'down'}`}>
                          {eff === 0 ? 'SEM EFEITO' : eff > 1 ? 'SUPER EFETIVO' : 'POUCO EFETIVO'}
                        </span>
                      )}
                    </small>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === 'bag' && (
          <div className="bc-sub">
            <button
              className="bc-back"
              onClick={() => setView('main')}
              aria-label="Voltar"
              title="Voltar (Esc)"
            />
            <div className="bc-list">
              {!usable && (
                <p className="bc-note">
                  {!fighting
                    ? 'Esperando o próximo Pokémon…'
                    : b.kind === 'wild' && !canCaptureHere(state)
                      ? 'Nuzlocke: a captura desta área já foi usada.'
                      : 'Não dá para capturar nesta batalha.'}
                </p>
              )}
              {owned.map((ball) => {
                const chance = usable ? Math.round(currentCaptureChance(state, ball) * 100) : null;
                const mult = ballMultiplierNow(state, ball);
                return (
                  <button
                    key={ball}
                    className={`bc-ball ${ball === bestBall ? 'best' : ''}`}
                    disabled={!usable}
                    title={`${itemName(ball)}: bola ${formatMultiplier(mult)}${ball === 'poke-ball' ? ' (tecla Q)' : ball === bestBall ? ' (tecla W)' : ''}`}
                    onClick={() => throwIf(ball)}
                  >
                    <ItemIcon id={ball} size={28} />
                    <span>
                      <strong>{itemName(ball).toUpperCase()}</strong>
                      <small>
                        ×{state.items[ball]}
                        {chance !== null && ` · ${chance}%`}
                      </small>
                    </span>
                  </button>
                );
              })}
              {!owned.length && <p className="bc-note">Sem bolas na mochila.</p>}
              <button className="bc-ball bc-shop" onClick={() => onOpen('shop')}>
                <ItemIcon id="coin-case" size={28} />
                <span>
                  <strong>LOJA</strong>
                  <small>comprar bolas</small>
                </span>
              </button>
            </div>
          </div>
        )}

        {view === 'party' && (
          <div className="bc-sub">
            <button
              className="bc-back"
              onClick={() => setView('main')}
              aria-label="Voltar"
              title="Voltar (Esc)"
            />
            <div className="bc-list">
              {[player, ...reserves].map((p) => {
                const max = statsOf(p).hp;
                const isActive = p.uid === player.uid;
                return (
                  <button
                    key={p.uid}
                    className={`bc-mon ${isActive ? 'active' : ''}`}
                    disabled={isActive || p.currentHp <= 0 || !fighting}
                    title={
                      isActive ? 'Em campo' : p.currentHp <= 0 ? 'Desmaiado' : `Trocar por ${pokemonName(p)}`
                    }
                    onClick={() => {
                      engine.dispatch((s) => void switchActive(s, p.uid));
                      setView('main');
                    }}
                  >
                    <PokemonSprite speciesId={p.speciesId} kind="icon" />
                    <span>
                      <strong>
                        {pokemonName(p).toUpperCase()} <em>Nv{p.level}</em>
                      </strong>
                      <HpBar value={p.currentHp} max={max} label={false} />
                    </span>
                  </button>
                );
              })}
              <button className="bc-mon bc-shop" onClick={() => onOpen('party')}>
                <ItemIcon id="poke-ball" size={28} />
                <span>
                  <strong>EQUIPE</strong>
                  <small>{reserves.length ? 'ver equipe' : 'montar equipe'}</small>
                </span>
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
