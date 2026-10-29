// MAPA: a arte oficial do mapa de cada região, com as áreas marcadas no lugar onde ficam
// nos jogos, abas por região, marcadores (errante, Equipe Rocket, raide, árvore de berry pronta,
// pesca/surf e o acompanhante na sua área) e o painel da área escolhida. O botão Ampliar abre o
// mapa grande numa janela.

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { DEPT_STORE, REGIONS, WATER_SPOTS, assetUrl, getRoute, type Route } from '../../game-data';
import {
  canChallengeBoss,
  challengeBoss,
  bestRod,
  canSurf,
  encounterRoute,
  modeEncounters,
  routeCleared,
  selectRoute,
  treeBerry,
  treeReady,
  type GameState,
} from '../../core/game';
import { Badges } from '../components/Hud';
import { Bar, ItemIcon, PixelIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import { useHotkeys } from '../hotkeys';
import { formatDuration, itemName, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

const MAX_ICONS = 9;

/**
 * Arte oficial de cada região (public/maps/<id>.webp) e seu tamanho, para manter a proporção.
 * Fontes: FireRed/LeafGreen, HeartGold/SoulSilver, Omega Ruby/Alpha Sapphire, Platinum,
 * Black 2/White 2 e X/Y (via Bulbapedia). As posições das áreas (Route.map) são % desta imagem.
 */
const MAP_ART: Record<string, { w: number; h: number; game: string }> = {
  kanto: { w: 1000, h: 750, game: 'FireRed/LeafGreen' },
  johto: { w: 1400, h: 750, game: 'HeartGold/SoulSilver' },
  hoenn: { w: 1250, h: 884, game: 'Omega Ruby/Alpha Sapphire' },
  sinnoh: { w: 1024, h: 724, game: 'Platinum' },
  unova: { w: 1280, h: 837, game: 'Black 2/White 2' },
  kalos: { w: 1032, h: 676, game: 'X/Y' },
};

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
  const details = (
    <RouteDetails
      state={state}
      route={selected}
      onGo={() => engine.dispatch((s, now) => selectRoute(s, selected.id, now))}
      onChallenge={() => engine.dispatch((s) => challengeBoss(s, selected.id))}
    />
  );

  const [enlarged, setEnlarged] = useState(false);
  useHotkeys({ Escape: () => setEnlarged(false) }, enlarged);

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

      <RegionMap
        state={state}
        regionId={region.id}
        routes={routes}
        selectedId={selected.id}
        onSelect={setSelectedId}
        onEnlarge={() => setEnlarged(true)}
      />

      {details}

      {/* No body: dentro da coluna lateral o `position: fixed` ficaria preso à coluna. */}
      {enlarged &&
        createPortal(
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label={`Mapa de ${region.name}`}
            onClick={(e) => e.target === e.currentTarget && setEnlarged(false)}
          >
            <div className="modal map-modal frame frame-paper">
              <header className="window-title">
                <ItemIcon id="town-map" size={24} />
                <h3>MAPA DE {region.name.toUpperCase()}</h3>
                <span className="window-actions">
                  <button className="pbtn small" onClick={() => setEnlarged(false)}>
                    Fechar
                  </button>
                </span>
              </header>
              <RegionMap
                state={state}
                regionId={region.id}
                routes={routes}
                selectedId={selected.id}
                onSelect={setSelectedId}
              />
              {details}
            </div>
          </div>,
          document.body,
        )}
    </Window>
  );
}

function RegionMap({
  state,
  regionId,
  routes,
  selectedId,
  onSelect,
  onEnlarge,
}: {
  state: GameState;
  regionId: string;
  routes: Route[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEnlarge?: () => void;
}) {
  const art = MAP_ART[regionId];
  return (
    <div
      className="region-map"
      role="group"
      aria-label="Mapa da região"
      style={art ? { aspectRatio: `${art.w} / ${art.h}` } : undefined}
    >
      <img
        className="region-art"
        src={assetUrl(`maps/${regionId}.webp`)}
        alt=""
        draggable={false}
        title={art ? `Mapa de ${art.game}` : undefined}
      />

      {routes.map((r) => {
        const prog = state.routes[r.id];
        const here = state.currentRouteId === r.id;
        const cleared = routeCleared(state, r.id);
        const ready = canChallengeBoss(state, r.id) && r.kind === 'wild';
        const roamer = state.roamer && state.roamer.routeId === encounterRoute(r).id && r.kind === 'wild';
        const rocket = state.rocket?.routeId === r.id;
        const raid = state.raid?.routeId === r.id;
        const water = WATER_SPOTS[r.id];
        const tree = prog.unlocked && treeBerry(r.id) && treeReady(state, r.id, state.lastTimerAt);
        const companion =
          here && state.companion ? state.collection.find((p) => p.uid === state.companion!.uid) : undefined;
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
            {r.id === DEPT_STORE.routeId && (
              <span className="node-shop" title={DEPT_STORE.name}>
                <ItemIcon id="dowsing-machine" size={18} />
              </span>
            )}
            {rocket && (
              <span className="node-rocket" title="Equipe Rocket!">
                <PixelIcon name="rocket" scale={1} />
              </span>
            )}
            {companion && (
              <span className="node-companion" title={`${speciesName(companion.speciesId)} acompanha você`}>
                <PokemonSprite speciesId={companion.speciesId} kind="icon" />
              </span>
            )}
            {(raid || tree || (water && prog.unlocked)) && (
              <span className="node-marks">
                {raid && (
                  <span className="mark-raid" title={`Raide: ${speciesName(state.raid!.speciesId)}`}>
                    <ItemIcon id="dynamax-band" size={18} />
                  </span>
                )}
                {tree && (
                  <span
                    className="mark-tree"
                    title={`Árvore de ${itemName(treeBerry(r.id)!)} pronta para colher`}
                  >
                    <PixelIcon name="tree" scale={2} />
                  </span>
                )}
                {water?.fish && prog.unlocked && (
                  <span title="Dá para pescar aqui" className={`mark-water ${bestRod(state) ? '' : 'off'}`}>
                    <ItemIcon id="old-rod" size={16} />
                  </span>
                )}
                {water?.surf && prog.unlocked && (
                  <span title="Dá para surfar aqui" className={`mark-water ${canSurf(state) ? '' : 'off'}`}>
                    <ItemIcon id="surf" size={16} />
                  </span>
                )}
              </span>
            )}
          </button>
        );
      })}
      <span className="map-label">{routes.find((r) => r.id === selectedId)?.name.toUpperCase()}</span>
      {onEnlarge && (
        <button className="pbtn small map-enlarge" onClick={onEnlarge} title="Ver o mapa grande">
          Ampliar
        </button>
      )}
    </div>
  );
}

/** Pesca, surf e árvore de berry da área (no painel do mapa). */
function WaterAndTree({ state, route }: { state: GameState; route: Route }) {
  const fish = modeEncounters(state, route.id, 'fish');
  const surf = modeEncounters(state, route.id, 'surf');
  const spot = WATER_SPOTS[route.id];
  const tree = treeBerry(route.id);
  if (!spot && !tree) return null;
  const readyAt = state.berryTrees[route.id] ?? 0;
  const row = (label: string, icon: string, list: { speciesId: number }[] | null, lockedText: string) => (
    <div className="node-water">
      <ItemIcon id={icon} size={18} /> <strong>{label}</strong>
      {list ? (
        [...new Set(list.map((e) => e.speciesId))].map((id) => (
          <PokemonSprite key={id} speciesId={id} kind="icon" silhouette={!state.pokedex[id]?.seen} />
        ))
      ) : (
        <small>{lockedText}</small>
      )}
    </div>
  );
  return (
    <div className="node-extra">
      {spot?.fish && row('PESCA', bestRod(state) ?? 'old-rod', fish, 'compre uma vara no Poké Mart')}
      {spot?.surf && row('SURF', 'surf', surf, 'compre a HM Surf no Poké Mart')}
      {tree && (
        <div className="node-water">
          <PixelIcon name="tree" scale={2} /> <strong>ÁRVORE</strong> <ItemIcon id={tree} size={18} />{' '}
          <small>
            {readyAt <= state.lastTimerAt
              ? 'pronta — vá até a área e colha na batalha (tecla B)'
              : `dá frutos em ${formatDuration(readyAt - state.lastTimerAt)}`}
          </small>
        </div>
      )}
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
            {route.id === DEPT_STORE.routeId &&
              ` Aqui fica a ${DEPT_STORE.name}, que vende todos os itens (menu LOJA).`}
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
          <WaterAndTree state={state} route={wild} />
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
