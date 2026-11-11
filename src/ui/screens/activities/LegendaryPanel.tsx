// Lendários: o boato do dia (manchete de jornal), a previsão das próximas horas, as bolas e as regras, o Santuário
// (um templo com os lendários capturados nos pedestais e os que faltam como estátuas) e os desafios de cada região
// (com quando aparecem, a próxima janela, o que pedem e a caça ao shiny).

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  BALANCE,
  LEGENDARIES,
  LEGEND_BALLS,
  LEGEND_WHEN,
  REGIONS,
  assetUrl,
  getRoute,
  type LegendaryDef,
} from '../../../game-data';
import { periodAt, weatherAt } from '../../../core/env';
import { challengeLegendary, type GameState } from '../../../core/game';
import {
  legendaryInSeason,
  legendaryMissing,
  legendaryNextWindow,
  legendaryRegionOpen,
  legendaryRules,
  legendaryShinyBoost,
  legendaryStatus,
  legendaryWindowOpen,
  rumorEndsAt,
  rumorOf,
} from '../../../core/legendary';
import { audio } from '../../audio';
import { ItemIcon, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { WEATHER_NAMES, formatDuration, itemName, speciesName } from '../../i18n/pt-BR';
import { LEGEND_LORE, legendGlow, legendTitle, nextLegendTitle, whenText } from '../../i18n/legends';
import { useEngine } from '../../useGame';

const BALLS = [
  'poke-ball',
  'great-ball',
  'ultra-ball',
  'dusk-ball',
  'quick-ball',
  'dive-ball',
  'nest-ball',
  'master-ball',
];

type Filter = 'all' | 'now' | 'missing' | 'caught';

const FILTERS: [Filter, string][] = [
  ['all', 'Todos'],
  ['now', 'Disponíveis agora'],
  ['missing', 'Faltam'],
  ['caught', 'Capturados'],
];

const WEATHER_ICON = {
  clear: 'cloud',
  sun: 'sun',
  rain: 'rain',
  sand: 'sand',
  fog: 'fog',
  hail: 'hail',
} as const;

/** Ícones do clima e da hora em que o lendário aparece. */
function WhenIcons({ speciesId }: { speciesId: number }) {
  const when = LEGEND_WHEN[speciesId];
  if (!when) return null;
  return (
    <span className="legend-when-icons" aria-hidden>
      {when.weather?.map((w) => (
        <PixelIcon key={w} name={WEATHER_ICON[w]} scale={1} title={WEATHER_NAMES[w]} />
      ))}
      {when.period?.map((p) =>
        p === 'night' ? (
          <PixelIcon key={p} name="moon" scale={1} title="de noite" />
        ) : (
          <i key={p} className="legend-chip">
            DIA
          </i>
        ),
      )}
    </span>
  );
}

function LegendaryCard({
  state,
  def,
  now,
  rumor,
}: {
  state: GameState;
  def: LegendaryDef;
  now: number;
  rumor?: number;
}) {
  const engine = useEngine();
  const status = legendaryStatus(state, def, now);
  const locked = status === 'locked';
  const wait = (state.legends.cooldowns[def.speciesId] ?? 0) - now;
  const busy = state.battle.kind !== 'wild';
  const owned = state.collection.filter((p) => p.speciesId === def.speciesId).length;
  const caught = state.legends.caught.includes(def.speciesId);
  const missing = legendaryMissing(state, def.speciesId);
  const when = whenText(def.speciesId);
  const encounters = state.legends.encounters?.[def.speciesId] ?? 0;
  const isRumor = rumor === def.speciesId;
  const inSeason = legendaryInSeason(state, def.speciesId);
  // Anel da espera: a espera longa é a de recaptura; a curta, a de fuga ou derrota.
  const rules = legendaryRules(def.speciesId);
  const waitTotal = (wait > rules.cooldownMinutes * 60_000 ? rules.recaptureMinutes : rules.cooldownMinutes) * 60_000;
  const left = Math.max(0, Math.min(1, wait / waitTotal));
  const next = status === 'hidden' ? legendaryNextWindow(def.speciesId, now) : undefined;
  const dexName = (id: number) => (state.pokedex[id]?.caught ? speciesName(id) : '???');
  return (
    <li
      className={`legend-card frame frame-slot ${status} ${isRumor ? 'rumor' : ''}`}
      style={{ '--glow': legendGlow(def.speciesId), '--left': left } as CSSProperties}
    >
      {isRumor && <span className="legend-rumor-tag">BOATO</span>}
      {status === 'ready' && when && !isRumor && inSeason && <span className="legend-now-tag">AGORA!</span>}
      <span className="legend-card-art">
        {status === 'cooldown' && <span className="legend-ring" aria-hidden />}
        <PokemonSprite
          speciesId={def.speciesId}
          kind="front"
          silhouette={locked || status === 'needs'}
          pixelScale={1}
        />
      </span>
      <strong>{locked ? '???' : speciesName(def.speciesId).toUpperCase()}</strong>
      <small>
        Nv{def.level} · +{Math.round((def.boost - 1) * 100)}% atributos
      </small>
      {state.pokedex[def.speciesId]?.shinyCaught && <Shiny />}
      {caught && (
        <span className="tag tag-active" title="Exemplares na sua coleção">
          CAPTURADO{owned > 1 ? ` ×${owned}` : ''}
        </span>
      )}
      {!locked && when && (
        <small className="legend-when">
          <WhenIcons speciesId={def.speciesId} /> Aparece {when}
        </small>
      )}
      {status === 'needs' && (
        <ul className="legend-needs">
          {missing.items.map((id) => (
            <li key={id}>
              <ItemIcon id={id} size={16} /> {itemName(id)}
            </li>
          ))}
          {missing.team.map((id) => (
            <li key={`t${id}`}>
              <PokemonSprite speciesId={id} kind="icon" /> {speciesName(id)} na equipe
            </li>
          ))}
          {missing.caught.map((id) => (
            <li key={`c${id}`}>
              <PokemonSprite speciesId={id} kind="icon" silhouette={!state.pokedex[id]?.caught} /> capturar{' '}
              {dexName(id)}
              {/* Kyurem aceita o Reshiram ou o Zekrom. */}
              {def.speciesId === 646 && id === 643 ? ` ou ${dexName(644)}` : ''}
            </li>
          ))}
        </ul>
      )}
      {status === 'hidden' && (
        <span className="tag legend-next">
          {next !== undefined && next > now
            ? `APARECE DAQUI A ${formatDuration(next - now)}`
            : 'NÃO ESTÁ POR AQUI AGORA'}
        </span>
      )}
      {status === 'cooldown' && <span className="tag">VOLTA EM {formatDuration(wait)}</span>}
      {status === 'locked' && <PixelIcon name="lock" scale={2} />}
      {!locked && encounters > 0 && (
        <small className="legend-hunt" title="Cada encontro aumenta a chance de ele vir shiny (até 5×)">
          ✦ {encounters} encontro{encounters > 1 ? 's' : ''} · shiny ×
          {legendaryShinyBoost(state, def.speciesId).toFixed(1)}
        </small>
      )}
      {status === 'ready' && (
        <button
          className="pbtn small primary"
          disabled={busy}
          title={
            busy
              ? 'Termine a batalha atual primeiro'
              : caught
                ? 'Enfrentar de novo para capturar outro'
                : 'Iniciar a batalha'
          }
          onClick={() => engine.dispatch((s, t) => challengeLegendary(s, def.speciesId, t))}
        >
          {caught ? 'Enfrentar de novo' : 'Enfrentar'}
        </button>
      )}
    </li>
  );
}

/**
 * O Santuário: um templo com colunas e tochas. Os lendários capturados flutuam nos pedestais sob um feixe de luz; os
 * que faltam são estátuas de pedra. Tocar num capturado toca o grito dele e mostra a história e os números.
 */
function Sanctuary({ state }: { state: GameState }) {
  const [open, setOpen] = useState<number | null>(null);
  // A história abre embaixo dos pedestais: rola até ela para não ficar fora da tela.
  const loreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open !== null) loreRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open]);
  const legends = LEGENDARIES.filter((l) => l.tier !== 'pseudo');
  const caught = legends.filter((l) => state.legends.caught.includes(l.speciesId));
  const title = legendTitle(caught.length, legends.length);
  const next = nextLegendTitle(caught.length, legends.length);
  const progress = next ? (caught.length - next.from) / (next.at - next.from) : 1;
  const shown = open !== null ? legends.find((l) => l.speciesId === open) : undefined;
  const shownShiny = !!shown && !!state.pokedex[shown.speciesId]?.shinyCaught;
  const shownBalls = shown ? Object.entries(LEGEND_BALLS[shown.speciesId] ?? {}) : [];
  const shownWhen = shown ? whenText(shown.speciesId) : '';
  return (
    <Window
      title={`SANTUÁRIO · ${caught.length}/${legends.length}`}
      icon={<ItemIcon id="master-ball" size={24} />}
    >
      <div className="sanctuary-progress">
        <span>
          {title ? (
            <>
              Título: <strong>{title.toUpperCase()}</strong>
            </>
          ) : (
            'Sem título ainda'
          )}
        </span>
        <span className="sanctuary-bar" aria-hidden>
          <i style={{ width: `${Math.round(progress * 100)}%` }} />
        </span>
        <small>
          {next
            ? `${next.at - caught.length === 1 ? 'falta 1' : `faltam ${next.at - caught.length}`} para ${next.name}`
            : 'Todas as lendas reunidas!'}
        </small>
      </div>
      <div className="sanctuary-hall">
        <span className="sanctuary-stars" aria-hidden />
        <span className="sanctuary-torch left" aria-hidden>
          <i />
        </span>
        <span className="sanctuary-torch right" aria-hidden>
          <i />
        </span>
        <span className="sanctuary-dust" aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
        <ul className="sanctuary">
          {legends.map((l, i) => {
            const has = state.legends.caught.includes(l.speciesId);
            return (
              <li
                key={l.speciesId}
                className={`pedestal ${has ? 'has' : ''} ${open === l.speciesId ? 'open' : ''}`}
                style={{ '--glow': legendGlow(l.speciesId), '--i': i } as CSSProperties}
              >
                <button
                  onClick={() => {
                    if (open !== l.speciesId) audio.cry(l.speciesId);
                    setOpen(open === l.speciesId ? null : l.speciesId);
                  }}
                  title={has ? speciesName(l.speciesId) : '???'}
                  disabled={!has}
                >
                  <span className="pedestal-mon">
                    <PokemonSprite
                      speciesId={l.speciesId}
                      kind="front"
                      silhouette={!has}
                      shiny={!!state.pokedex[l.speciesId]?.shinyCaught}
                    />
                  </span>
                  <span className="pedestal-base" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {shown && (
        <div
          key={shown.speciesId}
          ref={loreRef}
          className="sanctuary-lore frame frame-dialog"
          style={{ '--glow': legendGlow(shown.speciesId) } as CSSProperties}
        >
          <span className="sanctuary-lore-art">
            <PokemonSprite speciesId={shown.speciesId} kind="front" shiny={shownShiny} pixelScale={1} />
          </span>
          <div>
            <strong>
              {speciesName(shown.speciesId).toUpperCase()} {shownShiny && <Shiny />}
            </strong>
            <p>{LEGEND_LORE[shown.speciesId] ?? 'Uma lenda viva.'}</p>
            <ul className="sanctuary-facts">
              <li>Na coleção: ×{state.collection.filter((p) => p.speciesId === shown.speciesId).length}</li>
              <li>Encontros: {state.legends.encounters?.[shown.speciesId] ?? 0}</li>
              {shownWhen && <li>Aparece {shownWhen}</li>}
              {shownBalls.length > 0 && (
                <li>
                  Bola favorita:
                  {shownBalls.map(([ball, mult]) => (
                    <span key={ball} title={itemName(ball)}>
                      <ItemIcon id={ball} size={16} /> ×{String(mult).replace('.', ',')}
                    </span>
                  ))}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </Window>
  );
}

/**
 * Previsão das próximas horas: o clima e o período de cada faixa de 2 h e quais lendários (já liberados e com a chave)
 * aparecem nela. O clima do jogo é sorteado por faixa de tempo, então dá para saber de antemão. A faixa atual conta
 * a partir de agora, e uma faixa em que o dia vira noite (ou o contrário) mostra os lendários dos dois períodos.
 */
function Forecast({ state, now, rumor }: { state: GameState; now: number; rumor?: number }) {
  const slot = BALANCE.weather.slotHours * 3_600_000;
  const start = Math.floor(now / slot) * slot;
  const rumorEnd = rumorEndsAt(now);
  const open = LEGENDARIES.filter((l) => !['locked', 'needs'].includes(legendaryStatus(state, l, now)));
  const slots = Array.from({ length: 6 }, (_, i) => {
    const from = i === 0 ? now : start + i * slot;
    const to = start + (i + 1) * slot;
    const weather = weatherAt(from);
    const period = periodAt(from);
    const turns = periodAt(to - 1) !== period;
    const here = open.filter((l) => {
      // Quem só volta depois desta faixa (fugiu ou acabou de ser capturado) não entra.
      if ((state.legends.cooldowns[l.speciesId] ?? 0) >= to) return false;
      // O do boato aparece a qualquer hora, até a meia-noite.
      if (l.speciesId === rumor && from < rumorEnd) return true;
      return !!LEGEND_WHEN[l.speciesId] && legendaryWindowOpen(l.speciesId, from, to);
    });
    return { t: start + i * slot, weather, period, turns, here };
  });
  const elapsed = Math.max(0, Math.min(1, (now - start) / slot));
  return (
    <Window title="PREVISÃO DOS LENDÁRIOS · próximas 12 h" icon={<PixelIcon name="sun" scale={2} />}>
      <ul className="lg-forecast">
        {slots.map((s, i) => (
          <li key={s.t} className={`${i === 0 ? 'now' : ''} ${s.period}`}>
            <small>
              {i === 0
                ? 'AGORA'
                : new Date(s.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </small>
            <span className={`lg-sky w-${s.weather} ${s.period}`}>
              <i className="lg-fx" aria-hidden />
              <PixelIcon name={WEATHER_ICON[s.weather as keyof typeof WEATHER_ICON] ?? 'cloud'} scale={2} />
            </span>
            <small className="lg-wname">
              {WEATHER_NAMES[s.weather]} ·{' '}
              {s.turns
                ? s.period === 'day'
                  ? 'anoitece'
                  : 'amanhece'
                : s.period === 'night'
                  ? 'noite'
                  : 'dia'}
            </small>
            {i === 0 && (
              <span className="lg-progress" title="Quanto desta faixa já passou">
                <i style={{ width: `${Math.round(elapsed * 100)}%` }} />
              </span>
            )}
            <span className="lg-mons">
              {s.here.slice(0, 6).map((l) => (
                <span
                  key={l.speciesId}
                  className={l.speciesId === rumor ? 'rumor' : ''}
                  title={`${speciesName(l.speciesId)}${l.speciesId === rumor ? ' (boato do dia)' : ''}`}
                >
                  <PokemonSprite
                    speciesId={l.speciesId}
                    kind="icon"
                    silhouette={!state.pokedex[l.speciesId]?.caught}
                  />
                </span>
              ))}
              {s.here.length > 6 && <small>+{s.here.length - 6}</small>}
              {!s.here.length && <small className="lg-none">—</small>}
            </span>
          </li>
        ))}
      </ul>
      <p className="hint">
        Os ícones são os lendários que dependem do clima ou da hora e aparecem naquela faixa, mais o do boato de
        hoje (com contorno dourado). Os que aparecem sempre e os que estão em espera não entram. Silhueta = ainda
        não capturado.
      </p>
    </Window>
  );
}

/** O boato do dia, como manchete de jornal: silhueta inquieta, pegadas e quanto tempo o boato ainda vale. */
function RumorBanner({ state, rumor, now }: { state: GameState; rumor: number; now: number }) {
  const known = !!state.pokedex[rumor]?.caught;
  const wait = (state.legends.cooldowns[rumor] ?? 0) - now;
  return (
    <div className="legend-rumor frame frame-dialog" style={{ '--glow': legendGlow(rumor) } as CSSProperties}>
      <span className={`legend-rumor-art ${known ? '' : 'unknown'}`}>
        <PokemonSprite speciesId={rumor} kind="front" silhouette={!known} pixelScale={1} />
      </span>
      <div>
        <span className="legend-rumor-head">
          <b>EXTRA!</b> BOATO DO DIA
        </span>
        <p>
          Dizem que viram {known ? speciesName(rumor) : 'um Pokémon lendário'} por aí! Hoje ele aparece a
          qualquer hora e fica 1,5× mais fácil de capturar.
        </p>
        <small className="legend-rumor-time">
          {wait > 0 ? `Ele ainda descansa: volta em ${formatDuration(wait)}. ` : ''}O boato vale por mais{' '}
          {formatDuration(rumorEndsAt(now) - now)}.
        </small>
      </div>
      <span className="legend-rumor-steps" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/** Mapa das lendas: a arte de cada região com os lendários nas rotas onde você os enfrentou. */
function LegendMap({ state }: { state: GameState }) {
  const sightings = state.legends.sightings ?? {};
  const regions = REGIONS.filter((r) => Object.values(sightings).some((ids) => ids.some((id) => r.routes.includes(id))));
  const [regionId, setRegionId] = useState<string | null>(null);
  if (!regions.length) {
    return (
      <Window title="MAPA DAS LENDAS" icon={<ItemIcon id="town-map" size={24} />}>
        <p className="hint">Enfrente um lendário e o lugar onde ele apareceu fica marcado aqui, no mapa da região.</p>
      </Window>
    );
  }
  const region = regions.find((r) => r.id === regionId) ?? regions[0];
  const pins = Object.entries(sightings).flatMap(([id, routes]) =>
    routes.filter((r) => region.routes.includes(r)).map((r) => ({ speciesId: +id, route: getRoute(r) })),
  );
  // Vários lendários na mesma rota: os marcadores se espalham lado a lado em vez de se cobrirem.
  const atRoute: Record<string, number> = {};
  const spread = pins.map((pin) => {
    const k = (atRoute[pin.route.id] = (atRoute[pin.route.id] ?? -1) + 1);
    const total = pins.filter((x) => x.route.id === pin.route.id).length;
    return (k - (total - 1) / 2) * 30;
  });
  return (
    <Window title={`MAPA DAS LENDAS · ${pins.length} aparições`} icon={<ItemIcon id="town-map" size={24} />}>
      {regions.length > 1 && (
        <div className="legend-map-tabs" role="tablist">
          {regions.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={r.id === region.id}
              className={`pbtn small ${r.id === region.id ? 'primary' : ''}`}
              onClick={() => setRegionId(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      <div className="legend-map">
        <img src={assetUrl(`maps/${region.id}.webp`)} alt={`Mapa de ${region.name}`} draggable={false} />
        {pins.map((pin, i) => {
          const caught = state.legends.caught.includes(pin.speciesId);
          return (
            <span
              key={`${pin.speciesId}-${pin.route.id}`}
              className={`legend-pin ${caught ? 'caught' : ''}`}
              style={
                {
                  left: `calc(${pin.route.map[0]}% + ${spread[i]}px)`,
                  top: `${pin.route.map[1]}%`,
                  '--glow': legendGlow(pin.speciesId),
                  '--i': i,
                } as CSSProperties
              }
              title={`${caught ? speciesName(pin.speciesId) : 'Lendário'} · ${pin.route.name}`}
            >
              <PokemonSprite speciesId={pin.speciesId} kind="icon" silhouette={!caught} />
            </span>
          );
        })}
      </div>
    </Window>
  );
}

/** Galeria das capturas: cada lendário capturado, com onde, quando e qual bola; "Rever" repete a captura. */
function CaptureGallery({ state }: { state: GameState }) {
  const [replay, setReplay] = useState<{ id: number; key: number } | null>(null);
  const caught = LEGENDARIES.filter((l) => state.legends.caught.includes(l.speciesId));
  if (!caught.length) return null;
  const captures = state.legends.captures ?? {};
  return (
    <Window title={`GALERIA DAS CAPTURAS · ${caught.length}`} icon={<ItemIcon id="master-ball" size={24} />}>
      <ul className="legend-gallery">
        {caught.map((l) => {
          const c = captures[l.speciesId];
          const playing = replay?.id === l.speciesId;
          return (
            <li key={l.speciesId} style={{ '--glow': legendGlow(l.speciesId) } as CSSProperties}>
              <span key={playing ? replay!.key : 'still'} className={`legend-gallery-scene ${playing ? 'replay' : ''}`}>
                <span className="lg-ball">
                  <ItemIcon id={c?.ball ?? 'poke-ball'} size={22} />
                </span>
                <span className="lg-mon">
                  <PokemonSprite speciesId={l.speciesId} kind="front" shiny={c?.shiny} pixelScale={1} />
                </span>
                <span className="lg-stars" aria-hidden>
                  {Array.from({ length: 8 }, (_, k) => (
                    <i key={k} style={{ '--a': `${k * 45}deg` } as CSSProperties} />
                  ))}
                </span>
              </span>
              <strong>
                {speciesName(l.speciesId)} {c?.shiny && <Shiny />}
              </strong>
              <small>
                {c
                  ? `${new Date(c.at).toLocaleDateString('pt-BR')} · ${getRoute(c.routeId).name} · ${itemName(c.ball)}${c.throws > 1 ? ` (${c.throws}ª bola)` : ' de primeira!'}`
                  : 'Capturado antes deste registro'}
              </small>
              <button
                className="pbtn small"
                onClick={() => {
                  audio.sfx('throw');
                  setTimeout(() => audio.cry(l.speciesId), 1300);
                  setReplay({ id: l.speciesId, key: Date.now() });
                }}
              >
                Rever
              </button>
            </li>
          );
        })}
      </ul>
    </Window>
  );
}

export function LegendaryPanel({ state }: { state: GameState }) {
  const now = state.lastTimerAt;
  const rumor = rumorOf(state, now);
  const rule = (r: typeof BALANCE.legendary) =>
    `${r.throwLimit} bolas falhas e ele foge; se você desmaiar, desistir ou ele fugir, volta em ${r.cooldownMinutes} min; depois de capturado, volta em ${formatDuration(r.recaptureMinutes * 60_000)} para você pegar outro; ${r.guaranteedPerfectIvs} IVs em 31`;
  const pseudos = LEGENDARIES.filter((l) => l.tier === 'pseudo').map((l) => speciesName(l.speciesId));
  const [filter, setFilter] = useState<Filter>('all');
  const matches = (l: LegendaryDef) =>
    filter === 'all' ||
    (filter === 'now'
      ? legendaryStatus(state, l, now) === 'ready'
      : state.legends.caught.includes(l.speciesId) === (filter === 'caught'));
  const anyShown =
    filter === 'all' || LEGENDARIES.some((l) => legendaryRegionOpen(state, l.regionId) && matches(l));
  return (
    <>
      {rumor !== undefined && <RumorBanner state={state} rumor={rumor} now={now} />}
      <Forecast state={state} now={now} rumor={rumor} />
      <Window
        title="LENDÁRIOS E QUASE LENDÁRIOS"
        icon={<ItemIcon id="master-ball" size={24} />}
        frame="dialog"
      >
        <ul className="legend-balls">
          {BALLS.map((b) => (
            <li key={b} className={state.items[b] ? '' : 'none'} title={itemName(b)}>
              <ItemIcon id={b} size={24} /> ×{state.items[b] ?? 0}
            </li>
          ))}
        </ul>
        <details className="legend-rules">
          <summary>Como funciona</summary>
          <p className="hint">
            Vença o Campeão de uma região para liberar os desafios dela. Cada lendário aparece com um clima ou
            numa hora do dia, e alguns pedem uma chave (um item, Pokémon na equipe ou outros lendários). A
            batalha é de verdade: ele luta de volta, se enfurece abaixo de metade do HP e não pode ser
            derrotado (fica com 1 de HP). Capture-o <strong>lançando as bolas à mão</strong>; status (sono,
            paralisia…) e a bola certa ajudam muito.
          </p>
          <p className="hint">
            <strong>Lendários:</strong> taxa de captura minúscula; {rule(BALANCE.legendary)}. Cada encontro
            aumenta a chance de shiny.
          </p>
          <p className="hint">
            <strong>Quase lendários</strong> ({pseudos.join(', ')}): mais fáceis, mas ainda duros;{' '}
            {rule(BALANCE.pseudo)}.
          </p>
        </details>
      </Window>
      <Sanctuary state={state} />
      <CaptureGallery state={state} />
      <LegendMap state={state} />
      <div className="legend-filter" role="group" aria-label="Filtrar lendários">
        {FILTERS.map(([id, label]) => (
          <button
            key={id}
            className={`pbtn small ${filter === id ? 'primary' : ''}`}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {!anyShown && <p className="hint">Nenhum lendário neste filtro agora.</p>}
      {REGIONS.map((region) => {
        const all = LEGENDARIES.filter((l) => l.regionId === region.id);
        if (!all.length) return null;
        const open = legendaryRegionOpen(state, region.id);
        // Região fechada: só o portão (sem a fila de "???"), e some quando há filtro.
        if (!open && filter !== 'all') return null;
        const shown = open ? all.filter(matches) : [];
        if (open && !shown.length) return null;
        const got = all.filter((l) => state.legends.caught.includes(l.speciesId)).length;
        const groups = [
          { label: 'QUASE LENDÁRIOS', list: shown.filter((l) => l.tier === 'pseudo') },
          { label: 'LENDÁRIOS', list: shown.filter((l) => l.tier !== 'pseudo') },
        ];
        return (
          <Window
            key={region.id}
            title={`${region.name.toUpperCase()} · ${got}/${all.length}${open ? '' : ' · BLOQUEADO'}`}
            className={got === all.length ? 'legend-region-done' : ''}
          >
            {!open && (
              <>
                <div className="legend-gate" aria-hidden>
                  <span />
                  <span />
                  <b>
                    <PixelIcon name="lock" scale={3} />
                  </b>
                </div>
                <p className="hint">
                  Vença o Campeão de {region.name} para desafiar. {all.length} lendas esperam atrás do portão.
                </p>
              </>
            )}
            {groups.map(
              (g) =>
                g.list.length > 0 && (
                  <section key={g.label}>
                    <h4 className="legend-group">{g.label}</h4>
                    <ul className="legend-list">
                      {g.list.map((def) => (
                        <LegendaryCard key={def.speciesId} state={state} def={def} now={now} rumor={rumor} />
                      ))}
                    </ul>
                  </section>
                ),
            )}
          </Window>
        );
      })}
    </>
  );
}
