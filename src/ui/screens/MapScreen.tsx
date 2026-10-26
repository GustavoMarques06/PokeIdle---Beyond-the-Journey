// MAPA: o mapa da região (rotas posicionadas como no Town Map dos jogos), com abas por
// região, marcadores de errantes e da Equipe Rocket, e o painel da rota escolhida.

import { useState } from 'react';
import { REGIONS, getRoute, type Route } from '../../game-data';
import {
  canChallengeBoss,
  challengeBoss,
  encounterRoute,
  routeCleared,
  selectRoute,
  type GameState,
} from '../../core/game';
import { Badges } from '../components/Hud';
import { Bar, ItemIcon, PixelIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import { speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

const MAX_ICONS = 9;

function regionUnlocked(state: GameState, regionId: string): boolean {
  return REGIONS.find((r) => r.id === regionId)!.routes.some((id) => state.routes[id]?.unlocked);
}

export function MapScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const current = getRoute(state.currentRouteId);
  const [regionId, setRegionId] = useState(current.regionId);
  const [selectedId, setSelectedId] = useState(current.id);
  const region = REGIONS.find((r) => r.id === regionId)!;
  const routes = region.routes.map(getRoute);
  const selected =
    routes.find((r) => r.id === selectedId) ?? routes.find((r) => r.id === current.id) ?? routes[0];

  const pickRegion = (id: string) => {
    setRegionId(id);
    const list = REGIONS.find((r) => r.id === id)!.routes;
    setSelectedId(list.includes(state.currentRouteId) ? state.currentRouteId : list[0]);
  };

  return (
    <Window
      frame="paper"
      title={`MAPA DE ${region.name.toUpperCase()}`}
      icon={<ItemIcon id="town-map" size={24} />}
      className="map-screen"
      actions={<Badges state={state} regionId={region.id} size={18} />}
    >
      <div className="region-tabs" role="tablist">
        {REGIONS.map((r) => {
          const open = regionUnlocked(state, r.id);
          return (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.id === region.id}
              className={`region-tab ${r.id === region.id ? 'active' : ''}`}
              disabled={!open}
              onClick={() => pickRegion(r.id)}
              title={open ? r.name : 'Vença o Campeão da região anterior'}
            >
              {!open && <PixelIcon name="lock" scale={1} />}
              {r.name.toUpperCase()}
            </button>
          );
        })}
      </div>

      <RegionMap state={state} routes={routes} selectedId={selected.id} onSelect={setSelectedId} />

      <RouteDetails
        state={state}
        route={selected}
        onGo={() => engine.dispatch((s, now) => selectRoute(s, selected.id, now))}
        onChallenge={() => engine.dispatch((s) => challengeBoss(s, selected.id))}
      />
    </Window>
  );
}

function RegionMap({
  state,
  routes,
  selectedId,
  onSelect,
}: {
  state: GameState;
  routes: Route[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const points = routes.map((r) => `${r.map[0]},${r.map[1]}`).join(' ');
  return (
    <div className="region-map" role="group" aria-label="Mapa da região">
      <svg className="region-land" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {routes.map((r) => (
          <ellipse
            key={`sh-${r.id}`}
            cx={r.map[0] + 0.8}
            cy={r.map[1] + 1.2}
            rx={10}
            ry={11}
            className="land-shadow"
          />
        ))}
        {routes.map((r) => (
          <ellipse key={`l-${r.id}`} cx={r.map[0]} cy={r.map[1]} rx={10} ry={11} className="land" />
        ))}
        {routes.map((r) => (
          <ellipse
            key={`g-${r.id}`}
            cx={r.map[0]}
            cy={r.map[1]}
            rx={6.5}
            ry={7.5}
            className={`land-${r.scene}`}
          />
        ))}
        <polyline points={points} className="map-path-shadow" />
        <polyline points={points} className="map-path" />
      </svg>

      {routes.map((r) => {
        const prog = state.routes[r.id];
        const here = state.currentRouteId === r.id;
        const cleared = routeCleared(state, r.id);
        const ready = canChallengeBoss(state, r.id) && r.kind === 'wild';
        const roamer = state.roamer && state.roamer.routeId === encounterRoute(r).id && r.kind === 'wild';
        const rocket = state.rocket?.routeId === r.id;
        return (
          <button
            key={r.id}
            className={[
              'map-node',
              r.kind === 'trial' ? 'trial' : r.boss ? 'gym' : 'wild',
              prog.unlocked ? '' : 'locked',
              cleared ? 'cleared' : '',
              here ? 'here' : '',
              r.id === selectedId ? 'selected' : '',
            ].join(' ')}
            style={{ left: `${r.map[0]}%`, top: `${r.map[1]}%` }}
            onClick={() => onSelect(r.id)}
            title={r.name}
            aria-label={`${r.name}${here ? ' (você está aqui)' : ''}`}
          >
            {here && <PixelIcon name="miniBall" scale={2} className="node-here" />}
            {ready && <span className="node-flag" aria-hidden />}
            {roamer && (
              <span className="node-roamer" title={`${speciesName(state.roamer!.speciesId)} está aqui!`}>
                <PokemonSprite speciesId={state.roamer!.speciesId} kind="icon" />
              </span>
            )}
            {rocket && (
              <span className="node-rocket" title="Equipe Rocket!">
                <PixelIcon name="rocket" scale={1} />
              </span>
            )}
          </button>
        );
      })}
      <span className="map-label">{routes.find((r) => r.id === selectedId)?.name.toUpperCase()}</span>
    </div>
  );
}

function RouteDetails({
  state,
  route,
  onGo,
  onChallenge,
}: {
  state: GameState;
  route: Route;
  onGo: () => void;
  onChallenge: () => void;
}) {
  const prog = state.routes[route.id];
  const here = state.currentRouteId === route.id;
  const bossReady = canChallengeBoss(state, route.id);
  const wild = encounterRoute(route);
  const encounters = wild.encounters;
  const min = Math.min(...encounters.map((e) => e.minLevel));
  const max = Math.max(...encounters.map((e) => e.maxLevel));
  return (
    <div className={`route-details ${prog.unlocked ? '' : 'locked'}`}>
      <div className="node-head">
        <strong>{route.name.toUpperCase()}</strong>
        {encounters.length > 0 && (
          <span className="node-lv">
            Nv{min}–{max}
          </span>
        )}
      </div>
      {!prog.unlocked ? (
        <p className="node-desc">Conclua a área anterior para liberar.</p>
      ) : (
        <>
          <p className="node-desc">
            {route.description}
            {route.kind === 'trial' && ` Enquanto espera, você treina em ${wild.name}.`}
            {route.safari && ' Zona Safari: captura facilitada.'}
          </p>
          {route.kind === 'wild' && (
            <div className="node-progress">
              <Bar value={prog.kills} max={route.killsRequired} tone="grass" />
              <span>
                {Math.min(prog.kills, route.killsRequired)}/{route.killsRequired}
              </span>
            </div>
          )}
          <div className="node-encounters">
            {encounters.slice(0, MAX_ICONS).map((e) => (
              <span key={e.speciesId} className={`enc ${e.time ? `enc-${e.time}` : ''}`}>
                <PokemonSprite
                  speciesId={e.speciesId}
                  kind="icon"
                  silhouette={!state.pokedex[e.speciesId]?.seen}
                />
                {e.time && <PixelIcon name={e.time === 'night' ? 'moon' : 'sun'} scale={1} />}
              </span>
            ))}
            {encounters.length > MAX_ICONS && (
              <span className="more">+{encounters.length - MAX_ICONS} raros</span>
            )}
          </div>
          <div className="node-actions">
            {!here && (
              <button className="pbtn small" onClick={onGo}>
                Ir para cá
              </button>
            )}
            {route.boss && (
              <span className={`node-boss ${prog.bossDefeated ? 'beaten' : ''}`}>
                <TrainerSprite id={route.boss.trainer} size={40} head />
                {route.boss.name} — {route.boss.title}
                {prog.bossDefeated && <PixelIcon name="check" scale={2} />}
              </span>
            )}
            {bossReady && (
              <button
                className="pbtn small primary"
                disabled={state.battle.kind !== 'wild'}
                onClick={onChallenge}
              >
                Desafiar {route.boss?.name}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
