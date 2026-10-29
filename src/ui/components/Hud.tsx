// Faixa superior: uma placa só, em três grupos (treinador · rota · carteira). Os detalhes
// (insígnias, jornada, pesquisa, prestígio) ficam num painel que abre no hover ou no foco.

import { useEffect, useRef, useState } from 'react';
import { BADGES, ROUTES, getRoute } from '../../game-data';
import { routeWeather } from '../../core/env';
import { routeCleared, type GameState } from '../../core/game';
import { trainerLevel } from '../../core/meta';
import { REGION_NAMES, WEATHER_EFFECTS, WEATHER_NAMES, speciesName } from '../i18n/pt-BR';
import { BadgeIcon, Bar, ItemIcon, PixelIcon, PokemonSprite, TrainerSprite } from './common';

/** Estojo de insígnias de uma região: obtidas em cor, as demais em silhueta. */
export function Badges({
  state,
  regionId,
  size = 22,
}: {
  state: GameState;
  regionId?: string;
  size?: number;
}) {
  const region = regionId ?? getRoute(state.currentRouteId).regionId;
  return (
    <span className="badges" aria-label={`Insígnias de ${REGION_NAMES[region] ?? region}`}>
      {BADGES.filter((b) => b.regionId === region).map((b) => (
        <BadgeIcon
          key={b.id}
          id={b.id}
          name={b.name}
          size={size}
          earned={!!state.routes[b.routeId]?.bossDefeated}
        />
      ))}
    </span>
  );
}

const WEATHER_ICON = {
  clear: 'cloud',
  sun: 'sun',
  rain: 'rain',
  sand: 'sand',
  fog: 'fog',
  hail: 'hail',
} as const;

/** Período do dia para exibição (o jogo só distingue dia e noite; entardecer e amanhecer são visuais). */
function dayPhase(now: number, night: boolean): string {
  const h = new Date(now).getHours();
  if (h >= 16 && h < 18) return 'Entardecer';
  if (h >= 6 && h < 8) return 'Amanhecer';
  return night ? 'Noite' : 'Dia';
}

const COUNT_MS = 450;

/** Valor exibido que corre até o valor real, e o último ganho (para o "+N" que sobe). */
function useCountUp(value: number) {
  const [shown, setShown] = useState(value);
  const [gain, setGain] = useState<{ id: number; amount: number } | null>(null);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (value === from) return;
    if (value > from) setGain((g) => ({ id: (g?.id ?? 0) + 1, amount: value - from }));
    if (document.documentElement.classList.contains('reduced-motion')) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / COUNT_MS);
      setShown(from + (value - from) * (1 - (1 - k) ** 3));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return { shown, gain };
}

const fmt = (n: number) => Math.floor(n).toLocaleString('pt-BR');

export function Hud({ state, onOpenMap }: { state: GameState; onOpenMap?: () => void }) {
  const route = getRoute(state.currentRouteId);
  const prog = state.routes[route.id];
  const cleared = ROUTES.filter((r) => routeCleared(state, r.id)).length;
  const trainer = trainerLevel(state);
  const weather = routeWeather(route, state.env);
  const night = state.env.period === 'night';
  const trial = route.kind === 'trial';
  const regionBadges = BADGES.filter((b) => b.regionId === route.regionId);
  const earned = regionBadges.filter((b) => state.routes[b.routeId]?.bossDefeated).length;
  const routeDone = trial ? prog.bossDefeated : prog.kills >= route.killsRequired;
  const journey = Math.round((cleared / ROUTES.length) * 100);
  const money = useCountUp(state.coins);
  const envText = `${dayPhase(state.lastTimerAt, night)} · ${WEATHER_NAMES[weather]}. ${WEATHER_EFFECTS[weather]}${night ? ' À noite: Fantasma/Sombrio +15% e outros Pokémon aparecem.' : ''}`;

  return (
    <header className="hud frame frame-menu">
      {/* Treinador: retrato, nome e a barra de EXP do nível de treinador. */}
      <div className="hud-seg hud-trainer">
        <span className="hud-portrait">
          <TrainerSprite id={state.trainerAvatar} outfit={state.trainerOutfit} size={36} head />
        </span>
        <div className="hud-stack">
          <strong>{state.trainerName.toUpperCase()}</strong>
          <small>TREINADOR NV {trainer.level}</small>
          <span
            className="hud-trainer-exp"
            title={`EXP de treinador: ${Math.round(trainer.progress * 100)}%`}
          >
            <Bar value={trainer.progress} max={1} tone="exp" />
          </span>
        </div>
      </div>

      <div className={`hud-seg hud-route ${routeDone ? 'done' : ''}`}>
        <div className="hud-route-head">
          <span className="hud-region">{route.region.toUpperCase()}</span>
          <strong>{route.name.toUpperCase()}</strong>
          <span className="hud-env" title={envText}>
            <PixelIcon
              name={weather === 'clear' ? (night ? 'moon' : 'sun') : WEATHER_ICON[weather]}
              scale={2}
            />
            <small>
              {weather === 'clear' ? '' : `${WEATHER_NAMES[weather].toUpperCase()} · `}
              {dayPhase(state.lastTimerAt, night).toUpperCase()}
            </small>
          </span>
        </div>
        {trial ? (
          <small>{prog.bossDefeated ? 'Desafio vencido' : `Desafio: ${route.boss?.name}`}</small>
        ) : (
          <div
            className="hud-route-bar"
            title={`${Math.min(prog.kills, route.killsRequired)} de ${route.killsRequired} vitórias`}
          >
            <Bar value={prog.kills} max={route.killsRequired} tone="grass" />
            <small>
              {Math.min(prog.kills, route.killsRequired)}/{route.killsRequired}
            </small>
          </div>
        )}
      </div>

      {(state.roamer || state.rocket) && (
        <button className="hud-seg hud-events" onClick={onOpenMap} title="Ver no mapa">
          {state.roamer && (
            <span title={`${speciesName(state.roamer.speciesId)} em ${getRoute(state.roamer.routeId).name}`}>
              <PokemonSprite speciesId={state.roamer.speciesId} kind="icon" />
            </span>
          )}
          {state.rocket && (
            <span title={`Equipe Rocket em ${getRoute(state.rocket.routeId).name}`}>
              <PixelIcon name="rocket" scale={2} />
            </span>
          )}
        </button>
      )}

      {/* Insígnias da região num contador; o estojo completo e a jornada abrem no painel. */}
      <div
        className="hud-seg hud-pop"
        tabIndex={0}
        aria-label={`Insígnias: ${earned} de ${regionBadges.length}`}
      >
        <span className="hud-badge-count">
          <PixelIcon name="medal" scale={2} />
          {earned}/{regionBadges.length}
        </span>
        <div className="hud-panel frame frame-menu" role="tooltip">
          <small>INSÍGNIAS DE {(REGION_NAMES[route.regionId] ?? route.region).toUpperCase()}</small>
          <Badges state={state} />
          <small>JORNADA · {journey}%</small>
          <Bar value={cleared} max={ROUTES.length} tone="gold" />
        </div>
      </div>

      <div className="hud-seg hud-pop hud-money" tabIndex={0} aria-label={`${fmt(state.coins)} Pokédólares`}>
        <span className="money">
          <PixelIcon name="pokedollar" scale={2} title="Pokédólares" />
          {fmt(money.shown)}
        </span>
        {money.gain && (
          <span key={money.gain.id} className="hud-gain" aria-hidden>
            +{fmt(money.gain.amount)}
          </span>
        )}
        <div className="hud-panel frame frame-menu" role="tooltip">
          <span className="hud-points">
            <ItemIcon id="up-grade" size={24} />
            {state.research.points} <small>pontos de pesquisa</small>
          </span>
          {state.prestige.totalEarned > 0 && (
            <span className="hud-points">
              <ItemIcon id="star-piece" size={24} />
              {state.prestige.points} <small>pontos de prestígio</small>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
