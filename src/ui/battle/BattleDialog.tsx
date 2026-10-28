// Parte de baixo da batalha: caixa de mensagens (texto com efeito de digitação) e, ao lado,
// dois painéis separados no estilo FRLG — BOLAS (capturar) e AÇÕES (trocar, desafiar, fugir).

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { getRoute } from '../../game-data';
import { legendaryRules } from '../../core/legendary';
import { canCaptureHere } from '../../core/nuzlocke';
import {
  activePokemon,
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
  activeMode,
  hasWater,
  modesAt,
  retreatFromBoss,
  setEncounterMode,
  throwBall,
  type EncounterMode,
  type GameEvent,
  type GameState,
} from '../../core/game';
import { ItemIcon, PixelIcon, TrainerSprite } from '../components/common';
import { Coach } from '../components/Coach';
import { useHotkeys } from '../hotkeys';
import { battleText } from '../i18n/battleText';
import { ENCOUNTER_MODE_NAMES, speciesName } from '../i18n/pt-BR';
import { useEngine, useGameEvents } from '../useGame';

const HOLD_MS = 2500;
const TYPE_MS = 14;

export type ScreenId =
  'party' | 'dex' | 'bag' | 'shop' | 'map' | 'activities' | 'missions' | 'trainer' | 'upgrades';

/** Um botão dos painéis: ícone, rótulo, linha de apoio e tecla de atalho. */
function Card({
  icon,
  label,
  sub,
  hotkey,
  tone,
  disabled,
  title,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  sub?: string;
  hotkey?: string;
  tone?: 'boss' | 'danger';
  disabled?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`cmd ${tone ? `cmd-${tone}` : ''}`}
      disabled={disabled}
      onClick={onClick}
      title={title ?? (hotkey ? `Tecla ${hotkey}` : undefined)}
    >
      {hotkey && <kbd className="cmd-key">{hotkey}</kbd>}
      <span className="cmd-icon">{icon}</span>
      <span className="cmd-label">{label}</span>
      {sub && <span className="cmd-sub">{sub}</span>}
    </button>
  );
}

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
            {ENCOUNTER_MODE_NAMES[m].toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}

export function BattleDialog({ state, onOpen }: { state: GameState; onOpen: (s: ScreenId) => void }) {
  const engine = useEngine();
  const [message, setMessage] = useState('');
  const [typed, setTyped] = useState(0);
  const [log, setLog] = useState<{ id: number; text: string }[]>([]);
  const [showLog, setShowLog] = useState(false);
  const holdUntil = useRef(0);
  const nextId = useRef(1);

  const onEvents = useCallback(
    (events: GameEvent[]) => {
      const st = engine.state;
      if (!st) return;
      const ctx = {
        routeId: st.battle.routeId,
        bossBattle: st.battle.kind !== 'wild' && st.battle.kind !== 'legendary',
        playerName: speciesName(activePokemon(st).speciesId),
        trainerName: st.battle.trainer?.name,
      };
      const lines = events.map((e) => battleText(e, ctx)).filter((l) => l !== null);
      if (!lines.length) return;
      setLog((l) =>
        [...lines.map((x) => ({ id: nextId.current++, text: x.text })).reverse(), ...l].slice(0, 30),
      );
      const now = performance.now();
      const important = [...lines].reverse().find((l) => l.important);
      const pick = important ?? (now >= holdUntil.current ? lines[lines.length - 1] : null);
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
        : `O que ${speciesName(activePokemon(state).speciesId)} vai fazer?`;
  const text = message ? message.slice(0, typed) : idleText;

  // --- Bolas -------------------------------------------------------------------------------
  const usable = canThrowBall(state);
  const great = state.items['great-ball'] ?? 0;
  const ultra = state.items['ultra-ball'] ?? 0;
  const special = b.enemy && (b.enemy.shiny || b.enemy.roamer || b.kind === 'legendary');
  const secondBall = ultra > 0 && (special || great <= 0) ? 'ultra-ball' : great > 0 ? 'great-ball' : null;

  const throwIf = (ball: string | null) => {
    if (ball && usable && (state.items[ball] ?? 0) > 0) engine.dispatch((s, now) => throwBall(s, ball, now));
  };

  // --- Ações ---------------------------------------------------------------------------------
  const wild = b.kind === 'wild';
  const bossReady = canChallengeBoss(state, b.routeId);
  const rocketHere = canChallengeRocket(state) && state.rocket?.routeId === b.routeId;
  const raidUp = canChallengeRaid(state);
  const rematchReady = canRematch(state, b.routeId) && wild;

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

  useHotkeys({
    e: cycleMode,
    q: () => throwIf('poke-ball'),
    w: () => throwIf(secondBall),
    d: challenge,
    f: () => {
      if (!wild) engine.dispatch((s, now) => retreatFromBoss(s, now));
    },
  });

  const ballCard = (ball: string, label: string, key: string) => {
    const qty = state.items[ball] ?? 0;
    const chance = usable ? Math.round(currentCaptureChance(state, ball) * 100) : null;
    return (
      <Card
        icon={<ItemIcon id={ball} size={32} />}
        label={label}
        sub={`×${qty}${chance !== null && qty > 0 ? ` · ${chance}%` : ''}`}
        hotkey={key}
        disabled={!usable || qty <= 0}
        title={`${chance !== null ? `Chance de captura: ${chance}%` : 'Só em batalhas contra Pokémon selvagens'} (tecla ${key})`}
        onClick={() => throwIf(ball)}
      />
    );
  };

  const challengeCard = () => {
    if (bossReady || (!raidUp && !rocketHere && !rematchReady)) {
      return (
        <Card
          icon={
            route.boss ? (
              <TrainerSprite id={route.boss.trainer} size={40} head />
            ) : (
              <PixelIcon name="boss" scale={3} />
            )
          }
          label="DESAFIAR"
          sub={route.boss ? route.boss.name : 'sem chefe'}
          hotkey="D"
          tone={bossReady ? 'boss' : undefined}
          disabled={!bossReady || !wild}
          title={
            route.boss ? `${route.boss.name} — ${route.boss.title} (tecla D)` : 'Esta área não tem chefe'
          }
          onClick={challenge}
        />
      );
    }
    if (raidUp && state.raid) {
      return (
        <Card
          icon={<PixelIcon name="boss" scale={3} />}
          label="RAIDE"
          sub={`${speciesName(state.raid.speciesId)} Nv${state.raid.level}`}
          hotkey="D"
          tone="boss"
          onClick={challenge}
        />
      );
    }
    if (rocketHere) {
      return (
        <Card
          icon={<PixelIcon name="rocket" scale={3} />}
          label="ROCKET"
          sub="expulsar a equipe"
          hotkey="D"
          tone="boss"
          onClick={challenge}
        />
      );
    }
    return (
      <Card
        icon={<TrainerSprite id={route.boss!.trainer} size={40} head />}
        label="REVANCHE"
        sub={route.boss!.name}
        hotkey="D"
        tone="boss"
        title={`Enfrentar ${route.boss!.name} de novo, mais forte (tecla D)`}
        onClick={challenge}
      />
    );
  };

  return (
    <div className="battle-ui">
      <div className="dialog frame frame-dialog" aria-live="polite">
        <p className="dialog-text">
          {text}
          {message && typed >= message.length && <span className="dialog-caret" />}
        </p>
        <button className="log-toggle" onClick={() => setShowLog((v) => !v)} aria-expanded={showLog}>
          REGISTRO {showLog ? '▼' : '▲'}
        </button>
        {showLog && (
          <ol className="battle-log frame frame-menu">
            {log.map((l) => (
              <li key={l.id}>{l.text}</li>
            ))}
            {!log.length && <li>Nada por enquanto.</li>}
          </ol>
        )}
        {/* Nos primeiros minutos, o professor fala nesta mesma caixa, como nos portáteis. */}
        <Coach state={state} />
      </div>

      <div className="battle-deck">
        <section className="deck-panel deck-balls frame frame-menu" aria-label="Bolas">
          <h3 className="deck-title">BOLAS</h3>
          {b.kind === 'wild' && !canCaptureHere(state) && (
            <p className="deck-note">Nuzlocke: a captura desta área já foi usada.</p>
          )}
          <div className="deck-grid">
            {ballCard('poke-ball', 'POKé BALL', 'Q')}
            {secondBall ? (
              ballCard(secondBall, secondBall === 'ultra-ball' ? 'ULTRA BALL' : 'GREAT BALL', 'W')
            ) : (
              <Card
                icon={<ItemIcon id="coin-case" size={32} />}
                label="LOJA"
                sub="comprar bolas"
                onClick={() => onOpen('shop')}
              />
            )}
          </div>
        </section>

        <section className="deck-panel deck-actions frame frame-menu" aria-label="Ações">
          <h3 className="deck-title">AÇÕES</h3>
          {wild && hasWater(encounterId) && (
            <ModeSwitch
              modes={modes}
              mode={mode}
              onPick={(m) => engine.dispatch((s) => setEncounterMode(s, m))}
            />
          )}
          <div className="deck-grid">
            <Card
              icon={<ItemIcon id="poke-ball" size={32} />}
              label="POKéMON"
              sub="trocar ativo"
              onClick={() => onOpen('party')}
            />
            {wild ? (
              challengeCard()
            ) : (
              <Card
                icon={<ItemIcon id="escape-rope" size={32} />}
                label={
                  b.kind === 'tower' || b.kind === 'legendary' || b.kind === 'tournament'
                    ? 'DESISTIR'
                    : 'FUGIR'
                }
                sub={
                  b.kind === 'tower'
                    ? `parar no andar ${b.floor}`
                    : b.kind === 'tournament'
                      ? `partida ${state.tournament.score[0]}–${state.tournament.score[1]} (perde a vaga)`
                      : b.kind === 'legendary'
                        ? `${legendaryRules(b.enemy?.speciesId ?? 0).throwLimit - (b.enemy?.throws ?? 0)} bolas até fugir`
                        : b.kind === 'raid'
                          ? `${Math.ceil((b.raidMs ?? 0) / 1000)} s restantes`
                          : 'sair da batalha'
                }
                hotkey="F"
                tone="danger"
                onClick={() => engine.dispatch((s, now) => retreatFromBoss(s, now))}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
