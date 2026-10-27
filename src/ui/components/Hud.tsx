// Faixa superior: treinador, insígnias da região, rota, dinheiro, ambiente e eventos.

import { BADGES, ROUTES, getRoute } from '../../game-data';
import { routeWeather } from '../../core/env';
import { routeCleared, type GameState } from '../../core/game';
import { trainerLevel } from '../../core/meta';
import { REGION_NAMES, WEATHER_EFFECTS, WEATHER_NAMES, speciesName } from '../i18n/pt-BR';
import { BadgeIcon, Bar, ItemIcon, Money, PixelIcon, PokemonSprite, TrainerSprite } from './common';

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
  if (h >= 16 && h < 18) return 'ENTARDECER';
  if (h >= 6 && h < 8) return 'AMANHECER';
  return night ? 'NOITE' : 'DIA';
}

export function Hud({ state, onOpenMap }: { state: GameState; onOpenMap?: () => void }) {
  const route = getRoute(state.currentRouteId);
  const prog = state.routes[route.id];
  const cleared = ROUTES.filter((r) => routeCleared(state, r.id)).length;
  const trainer = trainerLevel(state);
  const weather = routeWeather(route, state.env);
  const night = state.env.period === 'night';
  const trial = route.kind === 'trial';

  return (
    <header className="hud">
      <div className="hud-plate frame frame-menu hud-trainer">
        <TrainerSprite id={state.trainerAvatar} size={48} head />
        <div>
          <strong>{state.trainerName.toUpperCase()}</strong>
          <small>
            TREINADOR Nv{trainer.level} <Bar value={trainer.progress} max={1} tone="exp" />
          </small>
        </div>
      </div>

      <div className="hud-plate frame frame-menu">
        <Badges state={state} />
      </div>

      <div className="hud-plate frame frame-menu hud-route">
        <ItemIcon id="town-map" size={30} />
        <div>
          <strong>
            {route.region.toUpperCase()} · {route.name.toUpperCase()}
          </strong>
          {trial ? (
            <small>{prog.bossDefeated ? 'Desafio vencido' : `Desafio: ${route.boss?.name}`}</small>
          ) : (
            <small>
              {Math.min(prog.kills, route.killsRequired)}/{route.killsRequired} vitórias
              <Bar value={prog.kills} max={route.killsRequired} tone="grass" />
            </small>
          )}
        </div>
      </div>

      <div
        className="hud-plate frame frame-menu hud-env"
        title={`${night ? 'Noite' : 'Dia'} · ${WEATHER_NAMES[weather]}. ${WEATHER_EFFECTS[weather]}${night ? ' À noite: Fantasma/Sombrio +15% e outros Pokémon aparecem.' : ''}`}
      >
        {/* Um ícone só: o clima, ou o sol/a lua quando o céu está limpo. */}
        <PixelIcon name={weather === 'clear' ? (night ? 'moon' : 'sun') : WEATHER_ICON[weather]} scale={2} />
        <small>
          {weather === 'clear' ? '' : `${WEATHER_NAMES[weather].toUpperCase()} · `}
          {dayPhase(state.lastTimerAt, night)}
        </small>
      </div>

      {(state.roamer || state.rocket) && (
        <button className="hud-plate frame frame-menu hud-events" onClick={onOpenMap} title="Ver no mapa">
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

      <div className="hud-plate frame frame-menu hud-money">
        <Money value={state.coins} />
        <span className="hud-points" title="Pontos de pesquisa">
          <ItemIcon id="up-grade" size={24} />
          {state.research.points}
        </span>
        {state.prestige.totalEarned > 0 && (
          <span className="hud-points" title="Pontos de prestígio">
            <ItemIcon id="star-piece" size={24} />
            {state.prestige.points}
          </span>
        )}
      </div>

      <div className="hud-plate frame frame-menu hud-journey">
        <small>JORNADA</small>
        <strong>{Math.round((cleared / ROUTES.length) * 100)}%</strong>
        <Bar value={cleared} max={ROUTES.length} tone="gold" />
      </div>
    </header>
  );
}
