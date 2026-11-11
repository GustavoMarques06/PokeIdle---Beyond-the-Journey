// Jardim de berries: uma cena viva (céu do dia ou da noite, chuva quando chove, o Pokémon de planta da equipe andando
// entre os canteiros), plantas em pixel art que crescem em 4 estágios, regador com gotas, insetos que vêm beliscar
// (toque para espantar), berries pulando na colheita e o caderno de mutações descobertas.

import { useCallback, useRef, useState, type CSSProperties } from 'react';
import { BALANCE, BERRIES, assetUrl } from '../../../game-data';
import {
  MAX_WATER,
  buffValue,
  canWater,
  eatBerry,
  beesNext,
  beesVisiting,
  berryInSeason,
  gardenGuardian,
  gardenHelper,
  gardenSeason,
  gardenPlots,
  harvest,
  mutationFlag,
  mutationOf,
  pestActive,
  plantBerry,
  plotReady,
  shooPest,
  waterPlot,
  type GardenPlot,
} from '../../../core/garden';
import type { GameEvent, GameState } from '../../../core/game';
import { audio } from '../../audio';
import { PixelFx } from '../../components/PixelFx';
import { Bar, ItemIcon, PixelIcon, PokemonSprite, Window } from '../../components/common';
import { BUFF_NAMES, formatDuration, formatPercent, itemName, speciesName } from '../../i18n/pt-BR';
import { useEngine, useGameEvents } from '../../useGame';
import { Countdown, Locked } from './shared';

/** Cor da flor e do fruto de cada berry. */
const BERRY_COLOR: Record<string, string> = {
  'oran-berry': '#4878e0',
  'pecha-berry': '#f088b0',
  'cheri-berry': '#e04040',
  'leppa-berry': '#e87030',
  'razz-berry': '#c02858',
  'persim-berry': '#f0a0c8',
  'sitrus-berry': '#f0d040',
  'lum-berry': '#58c058',
};

/** A planta em pixel art: monte de terra com semente, broto, planta com folhas e planta florida (cor da berry). */
function Plant({ stage, color }: { stage: number; color: string }) {
  const leaf = '#48a838';
  const dark = '#2a6a20';
  return (
    <svg className={`plant plant-${stage}`} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {stage === 0 && (
        <>
          <path fill="#5a3a18" d="M4 13h8v2H4z" />
          <path fill="#8a6030" d="M5 12h6v1H5z" />
          <path fill="#e8d8a0" d="M7 11h2v1H7z" />
        </>
      )}
      {stage >= 1 && <path fill={dark} d={stage === 1 ? 'M7 10h1v5H7z' : 'M7 5h2v10H7z'} />}
      {stage === 1 && <path fill={leaf} d="M4 9h3v1H4zM5 8h2v1H5zM8 9h3v1H8zM8 8h2v1H8z" />}
      {stage >= 2 && (
        <path fill={leaf} d="M3 11h4v1H3zM4 10h3v1H4zM9 9h4v1H9zM9 8h3v1H9zM3 7h4v1H3zM4 6h3v1H4z" />
      )}
      {stage >= 2 && <path fill={dark} d="M3 12h4v1H3zM9 10h4v1H9zM3 8h4v1H3z" />}
      {stage === 2 && <path fill={color} d="M6 2h4v1H6zM5 3h6v2H5zM6 5h4v1H6z" />}
      {stage === 2 && <path fill="#f8f0a0" d="M7 3h2v2H7z" />}
    </svg>
  );
}

type Fx = {
  id: number;
  plot: number;
  kind: 'harvest' | 'water' | 'shoo' | 'mutation';
  berry?: string;
  qty?: number;
};

function PlotView({
  state,
  i,
  p,
  seed,
  fx,
  onPlant,
  onHarvest,
  onWater,
  onShoo,
}: {
  state: GameState;
  i: number;
  p: GardenPlot | null;
  seed: string | null;
  fx: Fx[];
  onPlant: () => void;
  onHarvest: () => void;
  onWater: () => void;
  onShoo: () => void;
}) {
  const now = state.lastTimerAt;
  const mine = fx.filter((f) => f.plot === i);
  if (!p) {
    return (
      <li className={`garden-bed empty ${seed ? 'can-plant' : ''}`}>
        <button
          className="bed-soil"
          disabled={!seed}
          onClick={onPlant}
          title={seed ? `Plantar ${itemName(seed)}` : 'Escolha uma berry abaixo'}
        >
          {seed ? (
            <span className="bed-seed">
              <ItemIcon id={seed} size={18} /> PLANTAR
            </span>
          ) : (
            <span className="bed-hint">vazio</span>
          )}
        </button>
        {mine.map((f) =>
          f.kind === 'harvest' ? (
            <span key={f.id} className="bed-pop" aria-hidden>
              {Array.from({ length: Math.min(5, f.qty ?? 1) }, (_, k) => (
                <i key={k} style={{ '--k': k } as CSSProperties}>
                  <ItemIcon id={f.berry!} size={18} />
                </i>
              ))}
              <b>+{f.qty}</b>
              <PixelFx fx="bloom" scale={1} x="50%" y="70%" pivot />
            </span>
          ) : f.kind === 'mutation' ? (
            <span key={f.id} className="bed-mutation" aria-hidden>
              <ItemIcon id={f.berry!} size={26} />
              <b>MUTAÇÃO!</b>
              <PixelFx fx="spore" scale={1} x="50%" y="60%" />
            </span>
          ) : null,
        )}
        <small className="bed-name">&nbsp;</small>
      </li>
    );
  }
  const ready = plotReady(p, now);
  const grow = Math.min(1, (now - p.plantedAt) / Math.max(1, p.readyAt - p.plantedAt));
  const stage = ready ? 3 : grow > 0.66 ? 2 : grow > 0.25 ? 1 : 0;
  const color = BERRY_COLOR[p.berry] ?? '#e04040';
  const pest = pestActive(p, now);
  const waters = p.waters ?? 0;
  const wet = !!p.wateredAt && now - p.wateredAt < 10 * 60_000;
  return (
    <li className={`garden-bed stage-${stage} ${ready ? 'ready' : ''} ${wet ? 'wet' : ''}`}>
      <button
        className="bed-soil"
        onClick={ready ? onHarvest : undefined}
        disabled={!ready}
        title={ready ? 'Colher!' : `${itemName(p.berry)} crescendo`}
      >
        <span className="bed-plant">
          {stage < 3 ? (
            <Plant stage={stage} color={color} />
          ) : (
            <>
              <Plant stage={2} color={color} />
              <span className="bed-fruits">
                <ItemIcon id={p.berry} size={18} />
                <ItemIcon id={p.berry} size={18} />
                <ItemIcon id={p.berry} size={18} />
              </span>
            </>
          )}
        </span>
        {ready && <span className="bed-sparkle" aria-hidden />}
      </button>
      {pest && (
        <button
          className="bed-pest"
          onClick={onShoo}
          title={`Um ${speciesName(p.pest!)} está beliscando! Toque para espantar`}
        >
          <span className="bed-pest-alert">!</span>
          <PokemonSprite speciesId={p.pest!} kind="icon" />
        </button>
      )}
      {mine.map((f) =>
        f.kind === 'water' ? (
          <span key={f.id} className="bed-rain" aria-hidden>
            <i />
            <i />
            <i />
            <i />
            <PixelFx fx="splash" scale={1} x="50%" y="85%" />
          </span>
        ) : f.kind === 'shoo' ? (
          <span key={f.id} className="bed-shoo" aria-hidden>
            xô!
          </span>
        ) : null,
      )}
      <small className="bed-name">{itemName(p.berry)}</small>
      <span className="bed-info">
        <Countdown until={p.readyAt} now={now} done="COLHER!" />
        {!ready && (
          <button
            className="bed-water"
            disabled={!canWater(p, now)}
            onClick={onWater}
            title={`Regar (${waters}/${MAX_WATER}): cresce mais rápido; 3 regas = +1 berry`}
          >
            <span className="bed-drops">
              {Array.from({ length: MAX_WATER }, (_, k) => (
                <i key={k} className={k < waters ? 'on' : ''} />
              ))}
            </span>
          </button>
        )}
      </span>
    </li>
  );
}

const SEASON_LABEL = { spring: 'Primavera:', summer: 'Verão:', autumn: 'Outono:', winter: 'Inverno:' } as const;

export function GardenPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [seed, setSeed] = useState<string | null>(null);
  const [fx, setFx] = useState<Fx[]>([]);
  const nextId = useRef(1);
  const push = (f: Omit<Fx, 'id'>, ms: number) => {
    const id = nextId.current++;
    setFx((list) => [...list, { ...f, id }]);
    window.setTimeout(() => setFx((list) => list.filter((x) => x.id !== id)), ms);
  };
  useGameEvents(
    useCallback((events: GameEvent[]) => {
      for (const e of events) if (e.type === 'gardenMutation') audio.sfx('achievement');
    }, []),
  );
  const plots = gardenPlots(state);
  if (plots === 0) return <Locked routeId={BALANCE.garden.plots[0]} />;
  const now = state.lastTimerAt;
  const owned = BERRIES.filter((b) => (state.items[b.id] ?? 0) > 0);
  const anyReady = state.garden.some((p) => plotReady(p, now));
  const helper = gardenHelper(state);
  const raining = state.env.weather === 'rain';
  const night = state.env.period === 'night';
  const found = BERRIES.filter((b) => state.flags.includes(mutationFlag(b.id)));
  const season = gardenSeason(now);
  const bees = beesVisiting(now);
  const guardian = gardenGuardian(state);
  const seasonAnim = night
    ? 'fireflies'
    : season === 'spring'
      ? 'blossoms'
      : season === 'autumn'
        ? 'leaves'
        : season === 'winter'
          ? 'snow'
          : undefined;

  const doHarvest = (i: number) => {
    const berry = state.garden[i]?.berry;
    let qty = 0;
    let mutated: string | undefined;
    engine.dispatch((s, t) => {
      const events: GameEvent[] = [];
      qty = harvest(s, i, t, events);
      mutated = events.find(
        (e): e is Extract<GameEvent, { type: 'gardenMutation' }> => e.type === 'gardenMutation',
      )?.berry;
      return events;
    });
    if (qty && berry) {
      audio.sfx('itemGet');
      push({ plot: i, kind: 'harvest', berry, qty }, 1300);
      if (mutated) push({ plot: i, kind: 'mutation', berry: mutated }, 1800);
    }
  };
  const doHarvestAll = () => {
    state.garden.forEach((p, i) => plotReady(p, now) && doHarvest(i));
  };

  return (
    <>
      <Window
        title="JARDIM DE BERRIES"
        icon={<ItemIcon id="berry-pouch" size={24} />}
        frame="dialog"
        actions={
          anyReady && (
            <button className="pbtn small primary" onClick={doHarvestAll}>
              Colher tudo
            </button>
          )
        }
      >
        <div className={`garden-scene ${night ? 'night' : ''} ${raining ? 'raining' : ''} season-${season}`}>
          <span className="garden-sky" aria-hidden />
          {raining && <span className="garden-raindrops" aria-hidden />}
          {/* A estação no céu do jardim: pétalas na primavera, folhas no outono, neve no inverno (pixel art do pixelfx) e,
              à noite, vaga-lumes. No verão, um brilho de calor em CSS. Com chuva, só a chuva. */}
          {!raining && seasonAnim ? (
            <img
              className="garden-anim"
              src={assetUrl(`sprites/weather/${seasonAnim}.webp`)}
              alt=""
              aria-hidden
              draggable={false}
            />
          ) : (
            !raining && (
              <span className={`garden-season-fx s-${season}`} aria-hidden>
                {Array.from({ length: 9 }, (_, k) => (
                  <i key={k} style={{ '--i': k } as CSSProperties} />
                ))}
              </span>
            )
          )}
          {bees && (
            <span className="garden-bees" aria-hidden>
              {[0, 1, 2].map((k) => (
                <span key={k} className="garden-bee" style={{ '--i': k } as CSSProperties}>
                  <PokemonSprite speciesId={415} kind="icon" />
                </span>
              ))}
            </span>
          )}
          {guardian && (
            <span
              className="garden-guardian"
              title={`${speciesName(guardian.speciesId)} vigia o jardim: espanta os insetos sozinho`}
            >
              <PokemonSprite speciesId={guardian.speciesId} kind="icon" shiny={guardian.shiny} />
            </span>
          )}
          {helper && (
            <span
              className="garden-helper"
              title={`${speciesName(helper.speciesId)} ajuda no jardim: cresce 10% mais rápido`}
            >
              <PokemonSprite speciesId={helper.speciesId} kind="front" shiny={helper.shiny} pixelScale={1} />
            </span>
          )}
          <ul className="garden-beds">
            {BALANCE.garden.plots.map((_, i) =>
              i >= plots ? (
                <li key={i} className="garden-bed locked">
                  <span className="bed-soil">
                    <PixelIcon name="lock" scale={2} />
                  </span>
                  <small className="bed-name">fechado</small>
                </li>
              ) : (
                <PlotView
                  key={i}
                  state={state}
                  i={i}
                  p={state.garden[i] ?? null}
                  seed={seed}
                  fx={fx}
                  onPlant={() => {
                    if (!seed) return;
                    audio.sfx('click');
                    engine.dispatch((s, t) => plantBerry(s, i, seed, t));
                    if ((state.items[seed] ?? 0) <= 1) setSeed(null);
                  }}
                  onHarvest={() => doHarvest(i)}
                  onWater={() => {
                    audio.sfx('splash');
                    engine.dispatch((s, t) => waterPlot(s, i, t));
                    push({ plot: i, kind: 'water' }, 900);
                  }}
                  onShoo={() => {
                    audio.sfx('escape');
                    engine.dispatch((s, t) => shooPest(s, i, t));
                    push({ plot: i, kind: 'shoo' }, 800);
                  }}
                />
              ),
            )}
          </ul>
        </div>
        <p className="hint">
          {raining ? '🌧 Está chovendo: o jardim se rega sozinho. ' : ''}
          Regue até {MAX_WATER}× (cresce mais rápido; 3 regas = +1 berry). Insetos beliscam: toque para
          espantar.
          {helper
            ? ` ${speciesName(helper.speciesId)} ajuda: cresce 10% mais rápido.`
            : ' Um Pokémon de planta na equipe faz crescer mais rápido.'}{' '}
          Berries diferentes lado a lado podem gerar uma mutação.
        </p>
        <ul className="garden-status">
          <li className={`gs-season s-${season}`}>
            <strong>{SEASON_LABEL[season]}</strong> berries da estação crescem 20% mais rápido
          </li>
          <li className={bees ? 'on' : ''}>
            <strong>{bees ? 'Combee polinizando!' : 'Combee'}</strong>{' '}
            {bees
              ? `colha agora: mutação 2× por mais ${formatDuration(beesNext(now) - now)}`
              : `voltam em ${formatDuration(beesNext(now) - now)}`}
          </li>
          <li className={guardian ? 'on' : ''}>
            <strong>Guardião</strong>{' '}
            {guardian
              ? `${speciesName(guardian.speciesId)} espanta os insetos sozinho`
              : 'um Pokémon Voador ou de Fogo na equipe espanta os insetos'}
          </li>
        </ul>
      </Window>

      <Window title="BERRIES" icon={<ItemIcon id="oran-berry" size={24} />}>
        {owned.length === 0 && (
          <p className="hint">Você não tem berries. Compre no Poké Mart ou ganhe em expedições.</p>
        )}
        <ul className="berry-list">
          {owned.map((b) => (
            <li key={b.id} className={`berry-row ${seed === b.id ? 'selected' : ''}`}>
              <ItemIcon id={b.id} size={28} />
              <div>
                <strong>
                  {itemName(b.id).toUpperCase()} ×{state.items[b.id]}
                  {berryInSeason(b.id, season) && <span className="berry-season">DA ESTAÇÃO</span>}
                </strong>
                <small>
                  Cresce em {formatDuration(b.growMinutes * 60_000)} · rende {b.yield[0]}–{b.yield[1]} ·
                  comer: {BUFF_NAMES[b.buff.kind]}{' '}
                  {b.buff.kind === 'shiny' ? '×2' : `+${formatPercent(b.buff.value)}`} por {b.buff.minutes}{' '}
                  min
                </small>
              </div>
              <button
                className={`pbtn small ${seed === b.id ? 'primary' : ''}`}
                onClick={() => setSeed(seed === b.id ? null : b.id)}
              >
                {seed === b.id ? 'Cancelar' : 'Plantar'}
              </button>
              <button className="pbtn small" onClick={() => engine.dispatch((s) => eatBerry(s, b.id))}>
                Comer
              </button>
            </li>
          ))}
        </ul>
      </Window>

      <Window
        title={`CADERNO DE MUTAÇÕES · ${found.length}/${BERRIES.length - 1}`}
        icon={<ItemIcon id="lum-berry" size={24} />}
      >
        <ul className="mutation-book">
          {BERRIES.slice(1).map((b, k) => {
            const known = found.some((f) => f.id === b.id);
            const from = BERRIES[k];
            return (
              <li key={b.id} className={known ? 'known' : ''}>
                <span className="mut-recipe">
                  <ItemIcon id={from.id} size={16} /> + <span className="mut-any">?</span>
                </span>
                <span className="mut-arrow">→</span>
                <span className={`mut-result ${known ? '' : 'unknown'}`}>
                  <ItemIcon id={b.id} size={22} />
                </span>
                <small>{known ? itemName(b.id) : '???'}</small>
              </li>
            );
          })}
        </ul>
        <p className="hint">
          A mutação dá uma berry acima da mais rara das duas vizinhas (ex.: {itemName('oran-berry')} ao lado
          de {itemName('pecha-berry')} pode dar{' '}
          {itemName(mutationOf('oran-berry', 'pecha-berry') ?? 'cheri-berry')}).
        </p>
      </Window>

      <ActiveBuffs state={state} />
    </>
  );
}

export function ActiveBuffs({ state }: { state: GameState }) {
  const active = Object.entries(state.buffs).filter(([, b]) => b && b.ms > 0);
  if (!active.length) return null;
  const max = BALANCE.garden.maxBuffMinutes * 60_000;
  return (
    <Window title="BÔNUS ATIVOS" frame="dialog">
      <ul className="bonus-list">
        {active.map(([kind, b]) => (
          <li key={kind}>
            <span>
              {BUFF_NAMES[kind]}{' '}
              {kind === 'shiny' ? '×2' : `+${formatPercent(buffValue(state, kind as never))}`}
            </span>
            <Bar value={b!.ms} max={max} tone="gold" />
            <strong>{formatDuration(b!.ms)}</strong>
          </li>
        ))}
      </ul>
      <p className="hint">Os bônus de berries só correm enquanto o jogo simula batalhas.</p>
    </Window>
  );
}
