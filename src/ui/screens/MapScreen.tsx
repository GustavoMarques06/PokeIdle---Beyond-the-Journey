// MAPA: a arte oficial do mapa de cada região, com as áreas marcadas no lugar onde ficam
// nos jogos, abas por região, marcadores (errante, Equipe Rocket, raide, árvore de berry pronta,
// pesca/surf e o acompanhante na sua área) e o painel da área escolhida. O botão Ampliar abre o
// mapa grande numa janela.

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
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
import { bossLook } from '../../core/rival';
import { Badges } from '../components/Hud';
import { Bar, ItemIcon, PixelIcon, PokemonSprite, TrainerSprite, Window } from '../components/common';
import type { IconName } from '../theme/icons';
import { useHotkeys } from '../hotkeys';
import { WEATHER_NAMES, formatDuration, itemName, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';
import { frontOn } from '../../core/env';

const MAX_ICONS = 9;

const FRONT_ICON = {
  clear: 'cloud',
  sun: 'sun',
  rain: 'rain',
  sand: 'sand',
  fog: 'fog',
  hail: 'hail',
} as const;

/**
 * Arte de cada região (public/maps/<id>.webp) e o seu tamanho, para manter a proporção. Todas desenhadas para o jogo
 * (originais em art/maps/novos).
 * As posições das áreas (Route.map) são % desta imagem.
 */
const MAP_ART: Record<string, { w: number; h: number; game: string }> = {
  kanto: { w: 1491, h: 1055, game: 'PokéIdle' },
  johto: { w: 1536, h: 1024, game: 'PokéIdle' },
  hoenn: { w: 1491, h: 1055, game: 'PokéIdle' },
  sinnoh: { w: 1536, h: 1024, game: 'PokéIdle' },
  unova: { w: 1491, h: 1055, game: 'PokéIdle' },
  kalos: { w: 1491, h: 1055, game: 'PokéIdle' },
  alola: { w: 1491, h: 1055, game: 'PokéIdle' },
};

function regionUnlocked(state: GameState, regionId: string): boolean {
  return REGIONS.find((r) => r.id === regionId)!.routes.some((id) => state.routes[id]?.unlocked);
}

/** Ícone do tipo de lugar no marcador do mapa. */
function placeGlyph(scene: string): IconName {
  if (scene.startsWith('league')) return 'medal';
  if (['beach', 'river', 'sea', 'seafloor'].includes(scene)) return 'wave';
  if (['snowfield', 'icecave'].includes(scene)) return 'hail';
  if (scene === 'volcano') return 'flame';
  if (scene === 'desert') return 'sand';
  if (['cave', 'dampcave', 'mountain', 'summit', 'ruins'].includes(scene)) return 'rock';
  if (['city', 'street', 'lab', 'tower', 'powerplant', 'rocket-base'].includes(scene)) return 'house';
  return 'tree';
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

  // A frente de clima que cruza esta região agora (só aparece se a rota dela já foi liberada).
  const regionFront = state.env.fronts?.find(
    (f) => region.routes.includes(f.routeId) && state.routes[f.routeId]?.unlocked,
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
        key={region.id}
        state={state}
        regionId={region.id}
        routes={routes}
        selectedId={selected.id}
        onSelect={setSelectedId}
        onEnlarge={() => setEnlarged(true)}
      />

      {regionFront && (
        <button
          className={`map-front w-${regionFront.weather}`}
          onClick={() => setSelectedId(regionFront.routeId)}
        >
          <PixelIcon name={FRONT_ICON[regionFront.weather]} scale={2} />
          <span>
            <strong>
              Frente de {WEATHER_NAMES[regionFront.weather]} em {getRoute(regionFront.routeId).name}
            </strong>
            <small>
              Fica mais {formatDuration(regionFront.until - state.lastTimerAt)}
              {regionFront.next ? ` e segue para ${getRoute(regionFront.next).name}` : ' e se desfaz'}. Na
              rota dela o shiny é 1,5× mais provável.
            </small>
          </span>
        </button>
      )}

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
                wheelZoom
              />
              {details}
            </div>
          </div>,
          document.body,
        )}
    </Window>
  );
}

/**
 * Nome curto do lugar para escrever no mapa: a cidade ("Rotas 4 e Cerulean" → "Cerulean"), sem o "(Hoenn)" das
 * Estradas da Vitória. As salas da Liga ganham um nome só, no Campeão.
 */
export function placeLabel(r: Route): string | null {
  if (r.kind === 'trial') return r.boss?.champion ? 'LIGA' : null;
  const name = r.name.replace(/\s*\(.*\)$/, '');
  const at = name.lastIndexOf(' e ');
  if (at < 0) return name;
  const tail = name.slice(at + 3);
  return tail.startsWith('a ') ? name.slice(0, at) : tail;
}

/** Níveis de zoom do mapa. Os marcadores mantêm o tamanho: aproximar afasta um do outro. */
// Até 2×: a arte oficial tem de 1000 a 1400 px de largura, e acima disso ela começaria a borrar.
const ZOOMS = [1, 1.5, 2];

/**
 * Zoom do mapa: botões + e − (e a roda do mouse no mapa ampliado), mantendo o mesmo ponto no meio ao trocar.
 * Com zoom, dá para arrastar o mapa com o mouse; no toque, o dedo rola a área como qualquer lista.
 */
function useMapZoom(wheel: boolean) {
  const viewport = useRef<HTMLDivElement>(null);
  const [level, setLevel] = useState(1);
  const zoom = ZOOMS[level - 1];
  const prev = useRef(zoom);
  // O meio da vista continua no meio depois do zoom.
  useEffect(() => {
    const el = viewport.current;
    const from = prev.current;
    prev.current = zoom;
    if (!el || from === zoom) return;
    const cx = (el.scrollLeft + el.clientWidth / 2) / from;
    const cy = (el.scrollTop + el.clientHeight / 2) / from;
    el.scrollLeft = cx * zoom - el.clientWidth / 2;
    el.scrollTop = cy * zoom - el.clientHeight / 2;
  }, [zoom]);
  useEffect(() => {
    const el = viewport.current;
    if (!el || !wheel) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setLevel((l) => Math.max(1, Math.min(ZOOMS.length, l + (e.deltaY < 0 ? 1 : -1))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [wheel]);
  // Arrastar com o mouse (só com zoom; um clique sem arrastar continua escolhendo a área).
  const drag = useRef<{ x: number; y: number; left: number; top: number; moved: boolean } | null>(null);
  const dragProps = {
    onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => {
      const el = viewport.current;
      if (!el || zoom <= 1 || e.pointerType !== 'mouse' || e.button !== 0) return;
      drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false };
    },
    onPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      const el = viewport.current;
      if (!d || !el) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      d.moved = true;
      el.classList.add('dragging');
      el.scrollLeft = d.left - dx;
      el.scrollTop = d.top - dy;
    },
    onPointerUp: () => {
      viewport.current?.classList.remove('dragging');
      // Depois de arrastar, o clique que vem junto não escolhe a área embaixo do cursor.
      if (drag.current?.moved) {
        const swallow = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      }
      drag.current = null;
    },
    onPointerLeave: () => {
      viewport.current?.classList.remove('dragging');
      drag.current = null;
    },
  };
  return {
    viewport,
    zoom,
    setZoom: (l: number) => setLevel(Math.max(1, Math.min(ZOOMS.length, l))),
    level,
    dragProps,
  };
}

function RegionMap({
  state,
  regionId,
  routes,
  selectedId,
  onSelect,
  onEnlarge,
  wheelZoom = false,
}: {
  state: GameState;
  regionId: string;
  routes: Route[];
  selectedId: string;
  onSelect: (id: string) => void;
  onEnlarge?: () => void;
  /** Roda do mouse aproxima (no mapa ampliado; na coluna, a roda continua rolando a janela). */
  wheelZoom?: boolean;
}) {
  const art = MAP_ART[regionId];
  const { viewport, zoom, level, setZoom, dragProps } = useMapZoom(wheelZoom);
  return (
    <div
      className={`region-map ${zoom > 1 ? 'zoomed' : ''}`}
      role="group"
      aria-label="Mapa da região"
      style={
        art ? { aspectRatio: `${art.w} / ${art.h}`, ['--map-ratio' as string]: art.w / art.h } : undefined
      }
    >
      <div className="map-viewport" ref={viewport} {...dragProps}>
        <div className="map-canvas" style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}>
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
            // Frente de clima: onde ela está agora e a rota para onde vai em seguida.
            const front = frontOn(state.env, r.id);
            const frontNext = !front && state.env.fronts?.some((f) => f.next === r.id);
            const water = WATER_SPOTS[r.id];
            const tree = prog.unlocked && treeBerry(r.id) && treeReady(state, r.id, state.lastTimerAt);
            const companion =
              here && state.companion
                ? state.collection.find((p) => p.uid === state.companion!.uid)
                : undefined;
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
                {placeLabel(r) && (
                  <span className={`node-name ${r.kind === 'trial' ? 'league' : ''}`} aria-hidden>
                    {placeLabel(r)}
                  </span>
                )}
                {r.kind !== 'trial' && (
                  <span className="node-glyph" aria-hidden>
                    <PixelIcon name={placeGlyph(r.scene)} scale={1} />
                  </span>
                )}
                {here && (
                  <span className="node-here node-here-trainer" aria-hidden>
                    <TrainerSprite id={state.trainerAvatar} outfit={state.trainerOutfit} size={26} head />
                  </span>
                )}
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
                  <span
                    className="node-companion"
                    title={`${speciesName(companion.speciesId)} acompanha você`}
                  >
                    <PokemonSprite speciesId={companion.speciesId} kind="icon" />
                  </span>
                )}
                {front && prog.unlocked && (
                  <span
                    className={`node-front w-${front.weather}`}
                    title={`Frente de ${WEATHER_NAMES[front.weather]} por mais ${formatDuration(front.until - state.lastTimerAt)}: shiny 1,5× mais provável`}
                  >
                    <PixelIcon name={FRONT_ICON[front.weather]} scale={2} />
                  </span>
                )}
                {frontNext && prog.unlocked && (
                  <span className="node-front-next" title="A frente vem para cá" aria-hidden />
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
                      <span
                        title="Dá para pescar aqui"
                        className={`mark-water ${bestRod(state) ? '' : 'off'}`}
                      >
                        <ItemIcon id="old-rod" size={16} />
                      </span>
                    )}
                    {water?.surf && prog.unlocked && (
                      <span
                        title="Dá para surfar aqui"
                        className={`mark-water ${canSurf(state) ? '' : 'off'}`}
                      >
                        <ItemIcon id="surf" size={16} />
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <span className="map-label">{routes.find((r) => r.id === selectedId)?.name.toUpperCase()}</span>
      <span className="map-zoom" role="group" aria-label="Zoom do mapa">
        <button
          className="pbtn small"
          onClick={() => setZoom(level - 1)}
          disabled={level <= 1}
          aria-label="Afastar o mapa"
          title="Afastar"
        >
          −
        </button>
        <b>{String(zoom).replace('.', ',')}×</b>
        <button
          className="pbtn small"
          onClick={() => setZoom(level + 1)}
          disabled={level >= ZOOMS.length}
          aria-label="Aproximar o mapa"
          title="Aproximar"
        >
          +
        </button>
      </span>
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
              // A mesma espécie pode vir de dia e de noite (Clefairy no Mt. Moon): a chave leva o período.
              <span
                key={`${e.speciesId}-${e.time ?? 'any'}`}
                className={`enc ${e.time ? `enc-${e.time}` : ''}`}
              >
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
                <TrainerSprite id={bossLook(state, route.boss).trainer} size={40} head />
                {bossLook(state, route.boss).name} — {bossLook(state, route.boss).title}
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
