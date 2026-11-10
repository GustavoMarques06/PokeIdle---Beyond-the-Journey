// Safari: o saguão (zonas, surto da semana, pedidos do Guarda, loja de Pontos de Safari, Pokédex das zonas e
// recordes), a escolha do caminho a cada passo e o encontro numa cena viva: o Pokémon sai do mato, a isca cai, a
// pedra faz "tum", a bola sacode, o humor dele aparece num balão e, se fugir, ele sai correndo da tela. No lago a água
// se mexe e a vara aparece. O saguão também tem o Guia do Safari (capturas com o jogo fechado) e a dica do Guarda.

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  BALANCE,
  BERRIES,
  SAFARI_GUIDE,
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
  claimSafariGuide,
  claimSafariRequest,
  favoriteBerry,
  getZone,
  guardTip,
  guideDone,
  knowsFavorite,
  leaveSafari,
  outbreakOf,
  pokemonMeters,
  safariAct,
  safariCatchChance,
  safariFleeChance,
  safariProgress,
  safariRequests,
  safariShopBlocked,
  safariShopBought,
  safariWalk,
  safariDeeper,
  safariFollow,
  safariRetreat,
  depthPoints,
  walkCost,
  SAFARI_DEPTHS,
  TRACK_STEPS,
  startSafari,
  startSafariGuide,
  zoneOpen,
  zoneSpecies,
  type SafariAction,
  type SafariEnemy,
} from '../../../core/safari';
import type { GameEvent, GameState } from '../../../core/game';
import { ItemIcon, Money, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { SAFARI_TEXT, formatDuration, formatNumber, formatPercent, itemName, speciesName } from '../../i18n/pt-BR';
import { useEngine, useGameEvents } from '../../useGame';
import { Locked } from './shared';

const MOOD_TEXT = {
  watching: { icon: '?', text: 'está de olho em você' },
  eating: { icon: '♪', text: 'está comendo' },
  angry: { icon: '!!', text: 'está irritado' },
  muddy: { icon: '~', text: 'está se limpando da lama' },
} as const;

type Fx = {
  id: number;
  kind: 'throw' | 'caught' | 'fled' | 'missed' | 'photo';
  action?: string;
  speciesId?: number;
  shiny?: boolean;
  form?: string;
  item?: string;
};

const PATH_ICON: Record<SafariPath, string> = { grass: 'tree', tall: 'tree', water: 'rain' };

/** Detalhes de cada caminho para os cartões do saguão. */
const PATH_INFO: Record<SafariPath, { what: string; level: string }> = {
  grass: { what: 'Comuns da zona', level: 'Nível normal' },
  tall: { what: 'Os raros da zona', level: 'Nível +4' },
  water: { what: 'Pokémon de água', level: 'Vara: mais raros' },
};

// Pedra e Lama em pixel art: cada linha é uma fileira de pixels, cada letra uma cor da paleta (ponto = vazio).
const ROCK = {
  rows: ['..oooo..', '.ohhffo.', 'ohfffffo', 'offffsfo', 'offfsso.', '.osssso.', '..oooo..'],
  pal: { o: '#2e2e36', h: '#d8d8d0', f: '#9a9a96', s: '#68686a' },
};
const MUD = {
  rows: ['...oooo...', '.oommmmoo.', 'omhmmmmdmo', 'ommmmdmmmo', '.ommdmmmo.', '..oooooo..'],
  pal: { o: '#3a2410', m: '#8a6030', h: '#b88850', d: '#6a4420' },
};
const SPLAT = {
  rows: ['.oo..oooo..oo...', 'ommoommmmoommoo.', 'omhmmmmdmmmmmhmo', '.ommdmmmmmdmmmo.', '..om..omm..mo...', '...o...o....o...'],
  pal: MUD.pal,
};

function PixelArt({ art, className }: { art: { rows: string[]; pal: Record<string, string> }; className?: string }) {
  const w = art.rows[0].length;
  return (
    <svg className={className} viewBox={`0 0 ${w} ${art.rows.length}`} shapeRendering="crispEdges" aria-hidden>
      {art.rows.flatMap((row, y) =>
        [...row].map((c, x) => (c === '.' ? null : <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={art.pal[c]} />)),
      )}
    </svg>
  );
}

/** A cena: fundo da zona, mato balançando, o Pokémon (com humor) e os efeitos da última ação. */
function SafariScene({ zone, enemy, fx }: { zone: SafariZone; enemy: SafariEnemy | null; fx: Fx | null }) {
  return (
    <div className={`safari-scene zone-${zone.id} ${enemy?.path === 'water' ? 'at-water' : ''}`}>
      <img className="safari-bg" src={assetUrl(`sprites/backgrounds/${zone.scene}.png`)} alt="" draggable={false} />
      <span className="safari-grass back" aria-hidden />
      {enemy?.path === 'water' && (
        <>
          <span className="safari-water" aria-hidden />
          <span className="safari-rod" aria-hidden>
            <i />
          </span>
        </>
      )}
      {enemy && (
        <div
          key={`${enemy.speciesId}-${enemy.ivs.hp}-${enemy.ivs.spe}`}
          className={`safari-mon mood-${enemy.mood ?? 'watching'} ${fx?.kind === 'throw' && fx.action === 'rock' ? 'bonked' : ''}`}
        >
          <span className="safari-mood" title={MOOD_TEXT[enemy.mood ?? 'watching'].text}>
            {MOOD_TEXT[enemy.mood ?? 'watching'].icon}
          </span>
          <PokemonSprite speciesId={enemy.speciesId} kind="front" shiny={enemy.shiny} form={enemy.form} pixelScale={2} />
          {enemy.mood === 'muddy' && <PixelArt art={SPLAT} className="safari-mud-splat" />}
        </div>
      )}
      {fx?.kind === 'fled' && fx.speciesId && (
        <div key={fx.id} className="safari-mon fleeing">
          <PokemonSprite speciesId={fx.speciesId} kind="front" shiny={fx.shiny} form={fx.form} pixelScale={2} />
        </div>
      )}
      {fx?.kind === 'throw' && (
        <span key={fx.id} className={`safari-throw throw-${fx.action}`} aria-hidden>
          {fx.action === 'ball' ? (
            <ItemIcon id="safari-ball" size={24} />
          ) : fx.action === 'berry' || fx.action === 'bait' ? (
            <ItemIcon id={fx.item ?? 'oran-berry'} size={22} />
          ) : fx.action === 'block' ? (
            <ItemIcon id="pokeblock" size={22} />
          ) : (
            <PixelArt art={fx.action === 'mud' ? MUD : ROCK} />
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
  const tip = guardTip(state, now);
  const guide = prog.guide;
  const [dex, setDex] = useState<string | null>(null);
  const [guideZone, setGuideZone] = useState<SafariZone['id']>('plains');
  const seen = (id: number) => !!state.pokedex[id]?.seen;
  const openList = SAFARI_ZONES.filter((z) => zoneOpen(state, z));
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
          Sem batalhas: você recebe {cfg.balls + prog.extraBalls} Safari Balls e {600 + prog.upgrades.steps * 200} passos.
          Em cada encontro: bola, isca, berry, pedra, Lama, Pokébloco ou foto. O humor dele muda tudo. A entrada custa{' '}
          <Money value={cfg.fee} />. Gaste passos para entrar mais fundo na zona (mata e coração), onde vivem os
          raros e os shinies, e siga os rastros que aparecem no chão. A cada passo, escolha o caminho:
        </p>
        <ul className="safari-path-cards">
          {(Object.keys(SAFARI_PATHS) as SafariPath[]).map((p) => (
            <li key={p} className={`path-${p}`}>
              <PixelIcon name={PATH_ICON[p] as 'tree'} scale={2} />
              <strong>{SAFARI_PATHS[p].label}</strong>
              <span className="safari-path-cost">👣 {SAFARI_PATHS[p].steps}</span>
              <small>{PATH_INFO[p].what}</small>
              <small>{PATH_INFO[p].level}</small>
            </li>
          ))}
        </ul>
        <ul className="safari-zones">
          {SAFARI_ZONES.map((z) => {
            const open = zoneOpen(state, z);
            const caught = (prog.zoneCaught[z.id] ?? []).length;
            const total = zoneSpecies(z).length;
            return (
              <li key={z.id} className={`safari-zone frame frame-slot ${open ? '' : 'locked'} ${prog.zonesDone.includes(z.id) ? 'done' : ''}`}>
                <span className="safari-zone-pic">
                  <img src={assetUrl(`sprites/backgrounds/${z.scene}.png`)} alt="" draggable={false} />
                  {!open && (
                    <span className="safari-zone-lock">
                      <PixelIcon name="lock" scale={3} />
                    </span>
                  )}
                </span>
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
                ) : null}
              </li>
            );
          })}
        </ul>
        {dex && <ZoneDex state={state} zone={getZone(dex as SafariZone['id'])} />}
      </Window>

      <Window title="GUIA DO SAFARI">
        {guide ? (
          guideDone(guide, now) ? (
            <div className="safari-guide">
              <p>O Guia voltou da {getZone(guide.zone).name}!</p>
              <button className="pbtn primary" onClick={() => engine.dispatch((st, t) => void claimSafariGuide(st, t))}>
                Receber as capturas
              </button>
            </div>
          ) : (
            <p className="safari-guide">
              O Guia está na {getZone(guide.zone).name}. Volta em {formatDuration(guide.endsAt - now)}.
            </p>
          )
        ) : (
          <div className="safari-guide">
            <p className="hint">
              Sem tempo para entrar? O Guia passa {SAFARI_GUIDE.hours} h numa zona e traz de 1 a 3 Pokémon (a maioria
              da grama baixa), mesmo com o jogo fechado. Custa <Money value={SAFARI_GUIDE.fee} /> e rende metade dos
              Pontos de Safari.
            </p>
            <span className="safari-guide-row">
              <select value={guideZone} onChange={(ev) => setGuideZone(ev.target.value as SafariZone['id'])}>
                {openList.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <button
                className="pbtn primary"
                disabled={state.coins < SAFARI_GUIDE.fee || !openList.some((z) => z.id === guideZone)}
                onClick={() => engine.dispatch((st, t) => void startSafariGuide(st, guideZone, t))}
              >
                Mandar o Guia
              </button>
            </span>
          </div>
        )}
      </Window>

      <Window title={`PEDIDOS DO GUARDA · ${formatNumber(prog.points)} PONTOS`}>
        <ul className="safari-requests">
          {requests.map((r) => {
            const done = r.progress >= r.target;
            // Espécie ainda não vista: o pedido não estraga a surpresa, só diz a zona.
            const where = r.speciesId
              ? getZone(SAFARI_ZONES.find((z) => zoneSpecies(z).includes(r.speciesId!))?.id).name
              : '';
            const label =
              r.kind === 'catch'
                ? `Capture ${r.target} ${seen(r.speciesId!) ? speciesName(r.speciesId!) : 'Pokémon misteriosos'} · ${where}`
                : r.kind === 'photo'
                  ? `Fotografe ${seen(r.speciesId!) ? speciesName(r.speciesId!) : 'um Pokémon raro'} · ${where}`
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
        {tip && (
          <p className="safari-tip">
            <ItemIcon id={tip.berry} size={20} />
            <span>
              <strong>Dica do Guarda:</strong>{' '}
              {seen(tip.speciesId) ? `o ${speciesName(tip.speciesId)}` : `um Pokémon da ${getZone(tip.zone).name}`} adora{' '}
              {itemName(tip.berry)}. Jogue a favorita: ele fica calmo por mais tempo e sem ficar mais difícil de pegar.
            </span>
          </p>
        )}
      </Window>

      <Window title="LOJA DO SAFARI">
        <ul className="safari-shop">
          {SAFARI_SHOP.map((e) => {
            const bought = safariShopBought(state, e.id);
            const maxed = e.max !== undefined && bought >= e.max;
            const blocked = safariShopBlocked(state, e.id);
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
                    {blocked ? ` ${blocked}` : ''}
                  </small>
                </span>
                <button
                  className="pbtn small"
                  disabled={maxed || !!blocked || prog.points < e.cost}
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
          <dt>Maior Pokémon</dt>
          <dd>
            {prog.biggest
              ? `${speciesName(prog.biggest.speciesId)}${prog.biggest.shiny ? ' ★' : ''} · ${prog.biggest.meters.toFixed(2).replace('.', ',')} m (${
                  prog.biggest.mult >= 1 ? '+' : ''
                }${Math.round((prog.biggest.mult - 1) * 100)}% do normal)`
              : '—'}
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
        else if (e.outcome === 'fled') show({ kind: 'fled', speciesId: e.speciesId, shiny: e.shiny, form: e.form }, 900);
        else if (e.outcome === 'photo') show({ kind: 'photo' }, 500);
        else if (e.outcome === 'stayed') show({ kind: 'throw', action: e.action, item: e.item }, 700);
        if (e.sizeRecord) lines.push(`Recorde! O maior ${speciesName(e.speciesId)} que você já pegou no Safari.`);
      } else if (e.type === 'safariEnded') {
        lines.push(`Fim do Safari! ${e.caught} capturado(s).`);
        setEnded(e);
      } else if (e.type === 'safariZoneComplete') {
        lines.push(`Pokédex da ${getZone(e.zone as SafariZone['id']).name} completa! Prêmio do Guarda recebido.`);
      }
    }
    if (lines.length) setLog((l) => [...lines.reverse(), ...l].slice(0, 6));
  }, []);
  useGameEvents(onEvents);

  if (!activityUnlocked(state, 'safari')) return <Locked routeId={BALANCE.safari.unlock} />;
  const s = state.safari;
  const summary = ended && <EndSummary e={ended} onClose={() => setEnded(null)} />;
  if (!s) return <Lobby state={state} summary={summary} />;

  const zone = getZone(s.zone);
  const steps = s.steps ?? 600;
  const depth = Math.min(SAFARI_DEPTHS.length - 1, s.depth ?? 0);
  const deeper = depth < SAFARI_DEPTHS.length - 1 ? SAFARI_DEPTHS[depth + 1] : undefined;
  const act =(a: SafariAction, item?: string) => {
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
        <span>{SAFARI_DEPTHS[depth].name}</span>
        <span>★ {s.points ?? 0} pontos</span>
        <span>Capturados: {s.caught.length}</span>
      </div>
      <SafariScene zone={zone} enemy={e} fx={fx} />
      {!e ? (
        <div className="safari-paths">
          {/* Camadas da zona: mais fundo, mais raros, shinies e pontos, e tudo custa mais passos. */}
          <div className={`safari-depth depth-${depth}`}>
            <ol>
              {SAFARI_DEPTHS.map((d, i) => (
                <li key={d.name} className={i === depth ? 'here' : i < depth ? 'passed' : ''}>
                  {d.name}
                </li>
              ))}
            </ol>
            <small>
              {depth === 0
                ? 'Na borda: encontros comuns, caminhadas baratas.'
                : `Raros ×${SAFARI_DEPTHS[depth].rare}, shiny ×${String(SAFARI_DEPTHS[depth].shiny).replace('.', ',')}, pontos ×${String(SAFARI_DEPTHS[depth].points).replace('.', ',')}, níveis +${SAFARI_DEPTHS[depth].level}. Eles fogem mais.`}
            </small>
            <span className="safari-depth-actions">
              {deeper && (
                <button
                  className="pbtn small primary"
                  disabled={steps < deeper.enter}
                  onClick={() => engine.dispatch((st) => void safariDeeper(st))}
                  title={`Raros ×${deeper.rare}, shiny ×${deeper.shiny}, pontos ×${deeper.points}`}
                >
                  Ir mais fundo: {deeper.name} (👣 {deeper.enter})
                </button>
              )}
              {depth > 0 && (
                <button className="pbtn small" onClick={() => engine.dispatch((st) => void safariRetreat(st))}>
                  Voltar à borda
                </button>
              )}
            </span>
          </div>
          {s.track && (
            <button
              className="pbtn safari-track"
              disabled={steps < TRACK_STEPS}
              onClick={() => engine.dispatch((st, now) => safariFollow(st, now))}
              title="Seguir o rastro leva direto a esse Pokémon"
            >
              <span className="safari-track-prints" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <PokemonSprite
                speciesId={s.track.speciesId}
                kind="icon"
                silhouette={!state.pokedex[s.track.speciesId]?.caught}
              />
              <span>
                <strong>
                  Rastro de{' '}
                  {state.pokedex[s.track.speciesId]?.caught ? speciesName(s.track.speciesId) : 'um Pokémon que falta'}
                </strong>
                <small>Seguir: {TRACK_STEPS} passos, encontro garantido</small>
              </span>
            </button>
          )}
          <p className="hint">Para onde ir?</p>
          {(Object.keys(SAFARI_PATHS) as SafariPath[]).map((p) => (
            <button
              key={p}
              className={`pbtn safari-path path-${p}`}
              disabled={steps < walkCost(s, p)}
              onClick={() => engine.dispatch((st, now) => safariWalk(st, p, now))}
              title={SAFARI_PATHS[p].hint}
            >
              <PixelIcon name={PATH_ICON[p] as 'tree'} scale={2} />
              <span>
                <strong>{SAFARI_PATHS[p].label}</strong>
                <small>
                  {walkCost(s, p)} passos · {SAFARI_PATHS[p].hint}
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
            {e.mood && e.mood !== 'watching' ? ` (${e.moodTurns})` : ''}. {pokemonMeters(e.speciesId, e.ivs, e.form).toFixed(2).replace('.', ',')} m · Captura {formatPercent(safariCatchChance(state, e))} ·
            fuga {formatPercent(safariFleeChance(e))} · vale {Math.round(capturePoints(zone, e.speciesId, e.shiny) * depthPoints(e.depth))} pontos
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
                    {knowsFavorite(state, e.speciesId, state.lastTimerAt) && favoriteBerry(e.speciesId) === b.id ? ' ♥' : ''}
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
