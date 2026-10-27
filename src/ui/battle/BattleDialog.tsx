// Caixa de mensagens da batalha (texto com efeito de digitação) e menu de comandos
// no estilo FRLG: POKé BALL / GREAT BALL / POKéMON / DESAFIAR-FUGIR.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getRoute } from '../../game-data';
import { legendaryRules } from '../../core/legendary';
import {
  activePokemon,
  canChallengeBoss,
  canChallengeRocket,
  canThrowBall,
  challengeBoss,
  challengeRocket,
  currentCaptureChance,
  retreatFromBoss,
  throwBall,
  type GameEvent,
  type GameState,
} from '../../core/game';
import { ItemIcon, PixelIcon, TrainerSprite } from '../components/common';
import { useHotkeys } from '../hotkeys';
import { battleText } from '../i18n/battleText';
import { speciesName } from '../i18n/pt-BR';
import { useEngine, useGameEvents } from '../useGame';

const HOLD_MS = 2500;
const TYPE_MS = 14;

export type ScreenId =
  'party' | 'dex' | 'bag' | 'shop' | 'map' | 'activities' | 'missions' | 'trainer' | 'upgrades';

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
    const t = setTimeout(() => setTyped((n) => Math.min(message.length, n + 2)), TYPE_MS);
    return () => clearTimeout(t);
  }, [typed, message]);

  const b = state.battle;
  const route = getRoute(b.routeId);
  const idleText =
    b.phase === 'spawning'
      ? b.kind === 'wild'
        ? route.kind === 'trial'
          ? `Treinando antes do desafio contra ${route.boss?.name}…`
          : 'Andando pela grama alta…'
        : `${b.trainer?.name ?? 'O treinador'} está escolhendo o próximo Pokémon…`
      : b.phase === 'defeat'
        ? 'Seu Pokémon está se recuperando…'
        : `O que ${speciesName(activePokemon(state).speciesId)} vai fazer?`;
  const text = message ? message.slice(0, typed) : idleText;

  const usable = canThrowBall(state);
  const bossReady = canChallengeBoss(state, b.routeId);
  const rocketHere = canChallengeRocket(state) && state.rocket?.routeId === b.routeId;
  const great = state.items['great-ball'] ?? 0;
  const ultra = state.items['ultra-ball'] ?? 0;
  const special = b.enemy && (b.enemy.shiny || b.enemy.roamer || b.kind === 'legendary');
  const secondBall = ultra > 0 && (special || great <= 0) ? 'ultra-ball' : great > 0 ? 'great-ball' : null;

  const throwIf = (ball: string | null) => {
    if (ball && usable && (state.items[ball] ?? 0) > 0) engine.dispatch((s, now) => throwBall(s, ball, now));
  };
  useHotkeys({
    q: () => throwIf('poke-ball'),
    w: () => throwIf(secondBall),
    d: () => {
      if (b.kind !== 'wild') return;
      if (bossReady) engine.dispatch((s) => challengeBoss(s, b.routeId));
      else if (rocketHere) engine.dispatch(challengeRocket);
    },
    f: () => {
      if (b.kind !== 'wild') engine.dispatch((s, now) => retreatFromBoss(s, now));
    },
  });

  const ballCmd = (ball: string, label: string, key: string) => {
    const qty = state.items[ball] ?? 0;
    const chance = usable ? Math.round(currentCaptureChance(state, ball) * 100) : null;
    return (
      <button
        className="cmd"
        disabled={!usable || qty <= 0}
        onClick={() => engine.dispatch((s, now) => throwBall(s, ball, now))}
        title={`${chance !== null ? `Chance de captura: ${chance}%` : 'Só em batalhas contra Pokémon selvagens'} (tecla ${key})`}
      >
        <ItemIcon id={ball} size={30} />
        <span className="cmd-label">{label}</span>
        <span className="cmd-sub">
          ×{qty}
          {chance !== null && qty > 0 ? ` · ${chance}%` : ''}
        </span>
      </button>
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
      </div>

      <div className="commands frame frame-menu" role="group" aria-label="Comandos">
        {ballCmd('poke-ball', 'POKé BALL', 'Q')}
        {secondBall ? (
          ballCmd(secondBall, secondBall === 'ultra-ball' ? 'ULTRA BALL' : 'GREAT BALL', 'W')
        ) : (
          <button className="cmd" onClick={() => onOpen('shop')}>
            <ItemIcon id="coin-case" size={30} />
            <span className="cmd-label">LOJA</span>
            <span className="cmd-sub">comprar bolas</span>
          </button>
        )}
        <button className="cmd" onClick={() => onOpen('party')}>
          <ItemIcon id="poke-ball" size={30} />
          <span className="cmd-label">POKéMON</span>
          <span className="cmd-sub">trocar ativo</span>
        </button>
        {b.kind !== 'wild' ? (
          <button
            className="cmd cmd-danger"
            title="Tecla F"
            onClick={() => engine.dispatch((s, now) => retreatFromBoss(s, now))}
          >
            <ItemIcon id="escape-rope" size={30} />
            <span className="cmd-label">
              {b.kind === 'tower' || b.kind === 'legendary' ? 'DESISTIR' : 'FUGIR'}
            </span>
            <span className="cmd-sub">
              {b.kind === 'tower'
                ? `parar no andar ${b.floor}`
                : b.kind === 'legendary'
                  ? `${legendaryRules(b.enemy?.speciesId ?? 0).throwLimit - (b.enemy?.throws ?? 0)} bolas até fugir`
                  : 'sair da batalha'}
            </span>
          </button>
        ) : rocketHere && !bossReady ? (
          <button className="cmd cmd-boss" title="Tecla D" onClick={() => engine.dispatch(challengeRocket)}>
            <PixelIcon name="rocket" scale={3} />
            <span className="cmd-label">ROCKET</span>
            <span className="cmd-sub">expulsar a equipe</span>
          </button>
        ) : (
          <button
            className={`cmd ${bossReady ? 'cmd-boss' : ''}`}
            disabled={!bossReady}
            onClick={() => engine.dispatch((s) => challengeBoss(s, b.routeId))}
            title={
              route.boss ? `${route.boss.name} — ${route.boss.title} (tecla D)` : 'Esta área não tem chefe'
            }
          >
            {route.boss ? (
              <TrainerSprite id={route.boss.trainer} size={40} head />
            ) : (
              <PixelIcon name="boss" scale={3} />
            )}
            <span className="cmd-label">DESAFIAR</span>
            <span className="cmd-sub">{route.boss ? route.boss.name : 'sem chefe'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
