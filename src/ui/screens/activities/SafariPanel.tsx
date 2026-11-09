// Safari: o saguão (zonas, surto da semana, pedidos do Guarda, loja de Pontos de Safari, Pokédex das zonas e
// recordes), a escolha do caminho a cada passo e o encontro numa cena viva: o Pokémon sai do mato, a isca cai, a
// pedra faz "tum", a bola sacode, o humor dele aparece num balão e, se fugir, ele sai correndo da tela.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BALANCE,
  BERRIES,
  SAFARI_PATHS,
  SAFARI_SHOP,
  SAFARI_ZONES,
  assetUrl,
  getRoute,
  type SafariPath,
  type SafariZone,
} from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  buySafari,
  capturePoints,
  claimSafariRequest,
  favoriteBerry,
  getZone,
  leaveSafari,
  outbreakOf,
  safariAct,
  safariCatchChance,
  safariFleeChance,
  safariProgress,
  safariRequests,
  safariShopBought,
  safariWalk,
  startSafari,
  zoneOpen,
  zoneSpecies,
  type SafariAction,
  type SafariEnemy,
} from '../../../core/safari';
import type { GameEvent, GameState } from '../../../core/game';
import { ItemIcon, Money, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { SAFARI_TEXT, formatNumber, formatPercent, itemName, speciesName } from '../../i18n/pt-BR';
import { useEngine, useGameEvents } from '../../useGame';
import { Locked } from './shared';

const MOOD_TEXT = {
  watching: { icon: '?', text: 'está de olho em você' },
  eating: { icon: '♪', text: 'está comendo' },
  angry: { icon: '!!', text: 'está irritado' },
  muddy: { icon: '~', text: 'está se limpando da lama' },
} as const;

type Fx = { id: number; kind: 'throw' | 'caught' | 'fled' | 'missed' | 'photo'; action?: string; speciesId?: number; shiny?: boolean };

const PATH_ICON: Record<SafariPath, string> = { grass: 'tree', tall: 'tree', water: 'rain' };

/** A cena: fundo da zona, mato balançando, o Pokémon (com humor) e os efeitos da última ação. */
function SafariScene({ zone, enemy, fx }: { zone: SafariZone; enemy: SafariEnemy | null; fx: Fx | null }) {
  return (
    <div className={`safari-scene zone-${zone.id} ${enemy?.path === 'water' ? 'at-water' : ''}`}>
      <img className="safari-bg" src={assetUrl(`sprites/backgrounds/${zone.scene}.png`)} alt="" draggable={false} />
      <span className="safari-grass back" aria-hidden />
      {enemy && (
        <div
          key={`${enemy.speciesId}-${enemy.ivs.hp}-${enemy.ivs.spe}`}
          className={`safari-mon mood-${enemy.mood ?? 'watching'} ${fx?.kind === 'throw' && fx.action === 'rock' ? 'bonked' : ''}`}
        >
          <span className="safari-mood" title={MOOD_TEXT[enemy.mood ?? 'watching'].text}>
            {MOOD_TEXT[enemy.mood ?? 'watching'].icon}
          </span>
          <PokemonSprite speciesId={enemy.speciesId} kind="front" shiny={enemy.shiny} form={enemy.form} pixelScale={2} />
          {enemy.mood === 'muddy' && <span className="safari-mud-splat" aria-hidden />}
        </div>
      )}
      {fx?.kind === 'fled' && fx.speciesId && (
        <div key={fx.id} className="safari-mon fleeing">
          <PokemonSprite speciesId={fx.speciesId} kind="front" shiny={fx.shiny} pixelScale={2} />
        </div>
      )}
      {fx?.kind === 'throw' && (
        <span key={fx.id} className={`safari-throw throw-${fx.action}`} aria-hidden>
          {fx.action === 'ball' ? (
            <ItemIcon id="safari-ball" size={24} />
          ) : fx.action === 'berry' || fx.action === 'bait' ? (
            <ItemIcon id="oran-berry" size={22} />
          ) : fx.action === 'block' ? (
            <ItemIcon id="pokeblock" size={22} />
          ) : (
            <i />
          )}
        </span>
      )}
      {(fx?.kind === 'caught' || fx?.kind === 'missed') && (
        <span key={fx.id} className={`safari-ball-shake ${fx.kind}`} aria-hidden>
          <ItemIcon id="safari-ball" size={28} />
          {fx.kind === 'caught' && (
            <span className="safari-stars">
              <i />
              <i />
              <i />
              <i />
            </span>
          )}
        </span>
      )}
      {fx?.kind === 'photo' && <span key={fx.id} className="safari-flash" aria-hidden />}
      <span className="safari-grass front" aria-hidden />
    </div>
  );
}

function EndSummary({ e, onClose }: { e: Extract<GameEvent, { type: 'safariEnded' }>; onClose: () => void }) {
  return createPortal(
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Fim do Safari">
      <div className="safari-summary frame frame-dialog">
        <h3>FIM DO SAFARI!</h3>
        {e.record && <p className="safari-record">NOVO RECORDE!</p>}
        <p>
          Você capturou <strong>{e.caught}</strong> Pokémon e ganhou <strong>{e.points ?? 0}</strong> Pontos de Safari.
        </p>
        {e.species && e.species.length > 0 && (
          <ul className="safari-summary-list">
            {e.species.map((id, i) => (
              <li key={i} style={{ '--i': i } as CSSProperties}>
                <PokemonSprite speciesId={id} kind="icon" />
              </li>
            ))}
          </ul>
        )}
        <button className="pbtn primary" onClick={onClose} autoFocus>
          Voltar ao saguão
        </button>
      </div>
    </div>,
    document.body,
  );
}

function ZoneDex({ state, zone }: { state: GameState; zone: SafariZone }) {
  const caught = safariProgress(state).zoneCaught[zone.id] ?? [];
  return (
    <ul className="safari-dex">
      {zoneSpecies(zone).map((id) => (
        <li key={id} className={caught.includes(id) ? 'has' : ''} title={state.pokedex[id]?.seen ? speciesName(id) : '???'}>
          <PokemonSprite speciesId={id} kind="icon" silhouette={!caught.includes(id)} />
        </li>
      ))}
    </ul>
  );
}

function Lobby({ state, summary }: { state: GameState; summary: ReactNode }) {
  const engine = useEngine();
  const cfg = BALANCE.safari;
  const now = state.lastTimerAt;
  const prog = safariProgress(state);
  const outbreak = outbreakOf(state, now);
  const requests = safariRequests(state, now);
  const [dex, setDex] = useState<string | null>(null);
  return (
    <>
      {summary}
      {outbreak && (
        <div className="safari-outbreak frame frame-dialog">
          <PokemonSprite speciesId={outbreak.speciesId} kind="front" pixelScale={1} silhouette={!state.pokedex[outbreak.speciesId]?.seen} />
          <div>
            <strong>SURTO DA SEMANA</strong>
            <p>
              {state.pokedex[outbreak.speciesId]?.seen ? speciesName(outbreak.speciesId) : 'Um Pokémon'} está aparecendo em
              massa na {getZone(outbreak.zone).name}! 5× mais encontros e shiny 3× mais provável.
            </p>
          </div>
        </div>
      )}
      <Window title="ZONA SAFARI" icon={<ItemIcon id="safari-ball" size={24} />} frame="dialog">
        <p className="hint">
          Sem batalhas: você recebe {cfg.balls + prog.extraBalls} Safari Balls e passos para andar. Escolha o caminho a
          cada passo (grama baixa, grama alta com os raros, ou o lago). Em cada encontro: bola, isca, berry, pedra, Lama,
          Pokébloco ou foto. O humor dele muda tudo. A entrada custa <Money value={cfg.fee} />.
        </p>
        <ul className="safari-zones">
          {SAFARI_ZONES.map((z) => {
            const open = zoneOpen(state, z);
            const caught = (prog.zoneCaught[z.id] ?? []).length;
            const total = zoneSpecies(z).length;
            return (
              <li key={z.id} className={`safari-zone frame frame-slot ${open ? '' : 'locked'} ${prog.zonesDone.includes(z.id) ? 'done' : ''}`}>
                <img src={assetUrl(`sprites/backgrounds/${z.scene}.png`)} alt="" draggable={false} />
                <strong>{z.name}</strong>
                <small>
                  {open ? `Pokédex ${caught}/${total}${prog.zonesDone.includes(z.id) ? ' ★' : ''}` : `Libere: ${getRoute(z.unlock).name}`}
                </small>
                {open ? (
                  <span className="safari-zone-actions">
                    <button
                      className="pbtn small primary"
                      disabled={state.coins < cfg.fee}
                      onClick={() => engine.dispatch((st, t) => startSafari(st, t, z.id))}
                    >
                      Entrar
                    </button>
                    <button className="pbtn small" onClick={() => setDex((d) => (d === z.id ? null : z.id))}>
                      Pokédex
                    </button>
                  </span>
                ) : (
                  <PixelIcon name="lock" scale={2} />
                )}
              </li>
            );
          })}
        </ul>
        {dex && <ZoneDex state={state} zone={getZone(dex as SafariZone['id'])} />}
      </Window>

      <Window title={`PEDIDOS DO GUARDA · ${formatNumber(prog.points)} PONTOS`}>
        <ul className="safari-requests">
          {requests.map((r) => {
            const done = r.progress >= r.target;
            const label =
              r.kind === 'catch'
                ? `Capture ${r.target} ${speciesName(r.speciesId!)}`
                : r.kind === 'photo'
                  ? `Fotografe ${state.pokedex[r.speciesId!]?.seen ? speciesName(r.speciesId!) : 'um Pokémon raro'} (${getZone(
                      SAFARI_ZONES.find((z) => zoneSpecies(z).includes(r.speciesId!))?.id,
                    ).name})`
                  : `Capture ${r.target} Pokémon na ${getZone(r.zone).name}`;
            return (
              <li key={r.id} className={r.claimed ? 'claimed' : done ? 'done' : ''}>
                {r.speciesId && <PokemonSprite speciesId={r.speciesId} kind="icon" silhouette={!state.pokedex[r.speciesId]?.seen} />}
                <span>
                  <strong>{label}</strong>
                  <small>
                    {Math.min(r.progress, r.target)}/{r.target} · {r.reward} pontos
                  </small>
                </span>
                {r.claimed ? (
                  <span className="tag">OK</span>
                ) : (
                  <button
                    className="pbtn small primary"
                    disabled={!done}
                    onClick={() => engine.dispatch((st, t) => void claimSafariRequest(st, r.id, t))}
                  >
                    Receber
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="hint">Novos pedidos toda semana.</p>
      </Window>

      <Window title="LOJA DO SAFARI">
        <ul className="safari-shop">
          {SAFARI_SHOP.map((e) => {
            const bought = safariShopBought(state, e.id);
            const maxed = e.max !== undefined && bought >= e.max;
            return (
              <li key={e.id}>
                <span>
                  <strong>
                    {e.name}
                    {e.max && e.max > 1 ? ` (${bought}/${e.max})` : ''}
                  </strong>
                  <small>
                    {e.description}
                    {e.item ? ` Você tem ${state.items[e.item] ?? 0}.` : ''}
                    {e.id === 'balls' && prog.extraBalls ? ` Comprado: +${prog.extraBalls}.` : ''}
                  </small>
                </span>
                <button
                  className="pbtn small"
                  disabled={maxed || prog.points < e.cost}
                  onClick={() => engine.dispatch((st) => void buySafari(st, e.id))}
                >
                  {maxed ? 'Comprado' : `${e.cost} pts`}
                </button>
              </li>
            );
          })}
        </ul>
      </Window>

      <Window title="RECORDES">
        <dl className="safari-records">
          <dt>Visitas</dt>
          <dd>{prog.visits}</dd>
          <dt>Mais capturas numa visita</dt>
          <dd>{prog.best}</dd>
          <dt>Shinies no Safari</dt>
          <dd>{prog.shinies}</dd>
          <dt>Capturas no Safari</dt>
          <dd>{state.stats.safariCaptures}</dd>
          <dt>Zonas completas</dt>
          <dd>
            {prog.zonesDone.length}/{SAFARI_ZONES.length}
          </dd>
        </dl>
      </Window>
    </>
  );
}

export function SafariPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [log, setLog] = useState<string[]>([]);
  const [fx, setFx] = useState<Fx | null>(null);
  const [ended, setEnded] = useState<Extract<GameEvent, { type: 'safariEnded' }> | null>(null);
  const [berryOpen, setBerryOpen] = useState(false);
  const nextId = useRef(1);
  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);
  const show = (f: Omit<Fx, 'id'>, ms: number) => {
    const id = nextId.current++;
    setFx({ ...f, id });
    timers.current.push(window.setTimeout(() => setFx((cur) => (cur?.id === id ? null : cur)), ms));
  };

  const onEvents = useCallback((events: GameEvent[]) => {
    const lines: string[] = [];
    for (const e of events) {
      if (e.type === 'safariResult') {
        lines.push(SAFARI_TEXT[e.outcome](speciesName(e.speciesId)));
        if (e.outcome === 'caught') show({ kind: 'caught' }, 1400);
        else if (e.outcome === 'missed') show({ kind: 'missed' }, 900);
        else if (e.outcome === 'fled') show({ kind: 'fled', speciesId: e.speciesId }, 900);
        else if (e.outcome === 'photo') show({ kind: 'photo' }, 500);
        else if (e.outcome === 'stayed') show({ kind: 'throw', action: e.action }, 700);
      } else if (e.type === 'safariEnded') {
        lines.push(`Fim do Safari! ${e.caught} capturado(s).`);
        setEnded(e);
      } else if (e.type === 'safariZoneComplete') {
        lines.push(`Pokédex da ${getZone(e.zone as SafariZone['id']).name} completa! Prêmio do Guarda recebido.`);
      }
    }
    if (lines.length) setLog((l) => [...lines.reverse(), ...l].slice(0, 6));
    // Os eventos não trazem o shiny: a fuga mostra o sprite normal.
    void stateRef;
  }, []);
  useGameEvents(onEvents);

  if (!activityUnlocked(state, 'safari')) return <Locked routeId={BALANCE.safari.unlock} />;
  const s = state.safari;
  const summary = ended && <EndSummary e={ended} onClose={() => setEnded(null)} />;
  if (!s) return <Lobby state={state} summary={summary} />;

  const zone = getZone(s.zone);
  const steps = s.steps ?? 600;
  const act = (a: SafariAction, item?: string) => {
    setBerryOpen(false);
    engine.dispatch((st, now) => safariAct(st, a, now, item));
  };
  const e = s.enemy;
  const berries = BERRIES.filter((b) => (state.items[b.id] ?? 0) > 0);

  return (
    <Window title={`ZONA SAFARI · ${zone.name.toUpperCase()}`} icon={<ItemIcon id="safari-ball" size={24} />} frame="dialog">
      {summary}
      <div className="safari-hud">
        <span>
          <ItemIcon id="safari-ball" size={18} /> ×{s.balls}
        </span>
        <span>👣 {steps} passos</span>
        <span>★ {s.points ?? 0} pontos</span>
        <span>Capturados: {s.caught.length}</span>
      </div>
      <SafariScene zone={zone} enemy={e} fx={fx} />
      {!e ? (
        <div className="safari-paths">
          <p className="hint">Para onde ir?</p>
          {(Object.keys(SAFARI_PATHS) as SafariPath[]).map((p) => (
            <button
              key={p}
              className={`pbtn safari-path path-${p}`}
              disabled={steps < SAFARI_PATHS[p].steps}
              onClick={() => engine.dispatch((st, now) => safariWalk(st, p, now))}
              title={SAFARI_PATHS[p].hint}
            >
              <PixelIcon name={PATH_ICON[p] as 'tree'} scale={2} />
              <span>
                <strong>{SAFARI_PATHS[p].label}</strong>
                <small>
                  {SAFARI_PATHS[p].steps} passos · {SAFARI_PATHS[p].hint}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <p className="safari-status">
            <strong>
              {speciesName(e.speciesId).toUpperCase()} Nv{e.level} {e.shiny && <Shiny />}
            </strong>{' '}
            {MOOD_TEXT[e.mood ?? 'watching'].text}
            {e.mood && e.mood !== 'watching' ? ` (${e.moodTurns})` : ''}. Captura {formatPercent(safariCatchChance(state, e))} ·
            fuga {formatPercent(safariFleeChance(e))} · vale {capturePoints(zone, e.speciesId, e.shiny)} pontos
          </p>
          <div className="safari-actions">
            <button className="pbtn primary" onClick={() => act('ball')}>
              <ItemIcon id="safari-ball" size={20} /> BOLA
            </button>
            <button className="pbtn" onClick={() => act('bait')} title="Ele come: foge menos, mas fica mais difícil de pegar">
              <ItemIcon id="oran-berry" size={20} /> ISCA
            </button>
            <button
              className="pbtn"
              disabled={!berries.length}
              onClick={() => setBerryOpen((v) => !v)}
              title="Uma berry do Jardim: a favorita dele o deixa calmo por mais tempo, sem atrapalhar a captura"
            >
              <ItemIcon id="sitrus-berry" size={20} /> BERRY
            </button>
            <button className="pbtn" onClick={() => act('rock')} title="Ele se irrita: mais fácil de pegar, mas foge mais">
              <PixelIcon name="sand" scale={2} /> PEDRA
            </button>
            <button
              className="pbtn"
              disabled={!(state.items['safari-mud'] > 0)}
              onClick={() => act('mud')}
              title="Ele demora para se limpar: foge bem menos por 2 vezes"
            >
              <ItemIcon id="safari-mud" size={20} /> LAMA ×{state.items['safari-mud'] ?? 0}
            </button>
            <button
              className="pbtn"
              disabled={!(state.items.pokeblock > 0)}
              onClick={() => act('block')}
              title="Ele come feliz: fica calmo e mais fácil de pegar"
            >
              <ItemIcon id="pokeblock" size={20} /> BLOCO ×{state.items.pokeblock ?? 0}
            </button>
            <button
              className="pbtn"
              disabled={!!e.photographed}
              onClick={() => act('photo')}
              title="Foto: Pontos de Safari e pesquisa, sem gastar bola"
            >
              <PixelIcon name="camera" scale={2} /> FOTO
            </button>
            <button className="pbtn" onClick={() => act('run')}>
              SEGUIR
            </button>
          </div>
          {berryOpen && (
            <ul className="safari-berries">
              {berries.map((b) => (
                <li key={b.id}>
                  <button className="pbtn small" onClick={() => act('berry', b.id)}>
                    <ItemIcon id={b.id} size={18} /> {itemName(b.id)} ×{state.items[b.id]}
                    {state.pokedex[e.speciesId]?.caught && favoriteBerry(e.speciesId) === b.id ? ' ♥' : ''}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <p className="hint">
        Capturados nesta visita: {s.caught.length ? s.caught.map(speciesName).join(', ') : 'nenhum ainda'}.
      </p>
      <ul className="safari-log">
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <button className="pbtn small danger" onClick={() => engine.dispatch(leaveSafari)}>
        Sair do Safari (as bolas e os passos que sobraram se perdem)
      </button>
    </Window>
  );
}
