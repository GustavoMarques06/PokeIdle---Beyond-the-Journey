// Lendários: o boato do dia, os desafios de cada região (com quando aparecem, o que pedem e a caça ao shiny) e o
// Santuário, um salão com os lendários capturados animados nos pedestais e os que faltam em silhueta.

import { useState, type CSSProperties } from 'react';
import { BALANCE, LEGENDARIES, LEGEND_WHEN, REGIONS, type LegendaryDef } from '../../../game-data';
import { periodAt, weatherAt } from '../../../core/env';
import { challengeLegendary, type GameState } from '../../../core/game';
import {
  legendaryInSeason,
  legendaryMissing,
  legendaryRegionOpen,
  legendaryShinyBoost,
  legendaryStatus,
  rumorOf,
} from '../../../core/legendary';
import { ItemIcon, PixelIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { WEATHER_NAMES, formatDuration, itemName, speciesName } from '../../i18n/pt-BR';
import { LEGEND_LORE, legendGlow, legendTitle, whenText } from '../../i18n/legends';
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
  return (
    <li
      className={`legend-card frame frame-slot ${status} ${isRumor ? 'rumor' : ''}`}
      style={{ '--glow': legendGlow(def.speciesId) } as CSSProperties}
    >
      {isRumor && <span className="legend-rumor-tag">BOATO</span>}
      {status === 'ready' && when && !isRumor && inSeason && <span className="legend-now-tag">AGORA!</span>}
      <span className="legend-card-art">
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
      {!locked && when && <small className="legend-when">Aparece {when}</small>}
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
              {state.pokedex[id]?.caught ? speciesName(id) : '???'}
            </li>
          ))}
        </ul>
      )}
      {status === 'hidden' && <span className="tag">NÃO ESTÁ POR AQUI AGORA</span>}
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

/** O Santuário: pedestais com os lendários capturados (animados) e os que faltam em silhueta; tocar mostra a lore. */
function Sanctuary({ state }: { state: GameState }) {
  const [open, setOpen] = useState<number | null>(null);
  const legends = LEGENDARIES.filter((l) => l.tier !== 'pseudo');
  const caught = legends.filter((l) => state.legends.caught.includes(l.speciesId));
  const title = legendTitle(caught.length, legends.length);
  const shown = open !== null ? legends.find((l) => l.speciesId === open) : undefined;
  return (
    <Window
      title={`SANTUÁRIO · ${caught.length}/${legends.length}`}
      icon={<ItemIcon id="master-ball" size={24} />}
    >
      {title && (
        <p className="sanctuary-title">
          Título: <strong>{title.toUpperCase()}</strong>
        </p>
      )}
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
                onClick={() => setOpen((cur) => (cur === l.speciesId ? null : l.speciesId))}
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
      {shown && (
        <div
          className="sanctuary-lore frame frame-dialog"
          style={{ '--glow': legendGlow(shown.speciesId) } as CSSProperties}
        >
          <PokemonSprite speciesId={shown.speciesId} kind="front" pixelScale={1} />
          <div>
            <strong>{speciesName(shown.speciesId).toUpperCase()}</strong>
            <p>{LEGEND_LORE[shown.speciesId] ?? 'Uma lenda viva.'}</p>
          </div>
        </div>
      )}
    </Window>
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

/**
 * Previsão das próximas horas: o clima e o período de cada faixa de 2 h e quais lendários (já liberados e com a chave)
 * aparecem nela. O clima do jogo é sorteado por faixa de tempo, então dá para saber de antemão.
 */
function Forecast({ state, now }: { state: GameState; now: number }) {
  const slot = BALANCE.weather.slotHours * 3_600_000;
  const start = Math.floor(now / slot) * slot;
  const ready = LEGENDARIES.filter((l) => !['locked', 'needs'].includes(legendaryStatus(state, l, now)));
  const slots = Array.from({ length: 6 }, (_, i) => {
    const t = start + i * slot;
    const mid = t + slot / 2;
    const weather = weatherAt(t);
    const period = periodAt(mid);
    const here = ready.filter((l) => {
      const when = LEGEND_WHEN[l.speciesId];
      return !when || when.weather?.includes(weather as never) || when.period?.includes(period);
    });
    return { t, weather, period, here };
  });
  return (
    <Window title="PREVISÃO DOS LENDÁRIOS · próximas 12 h" icon={<PixelIcon name="sun" scale={2} />}>
      <ul className="lg-forecast">
        {slots.map((s, i) => {
          const special = s.here.filter((l) => LEGEND_WHEN[l.speciesId]);
          return (
            <li key={s.t} className={`${i === 0 ? 'now' : ''} ${s.period}`}>
              <small>
                {i === 0
                  ? 'AGORA'
                  : new Date(s.t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </small>
              <span className={`lg-sky w-${s.weather}`}>
                <PixelIcon name={WEATHER_ICON[s.weather as keyof typeof WEATHER_ICON] ?? 'cloud'} scale={2} />
              </span>
              <small className="lg-wname">
                {WEATHER_NAMES[s.weather]} · {s.period === 'night' ? 'noite' : 'dia'}
              </small>
              <span className="lg-mons">
                {special.slice(0, 6).map((l) => (
                  <span key={l.speciesId} title={speciesName(l.speciesId)}>
                    <PokemonSprite
                      speciesId={l.speciesId}
                      kind="icon"
                      silhouette={!state.pokedex[l.speciesId]?.caught}
                    />
                  </span>
                ))}
                {special.length > 6 && <small>+{special.length - 6}</small>}
                {!special.length && <small className="lg-none">—</small>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="hint">
        Os ícones são os lendários que dependem do clima ou da hora e aparecem naquela faixa (os que aparecem
        sempre não entram na previsão). Silhueta = ainda não capturado.
      </p>
    </Window>
  );
}

export function LegendaryPanel({ state }: { state: GameState }) {
  const now = state.lastTimerAt;
  const rumor = rumorOf(state, now);
  const rule = (r: typeof BALANCE.legendary) =>
    `${r.throwLimit} bolas falhas e ele foge; se você desmaiar, desistir ou ele fugir, volta em ${r.cooldownMinutes} min; depois de capturado, volta em ${formatDuration(r.recaptureMinutes * 60_000)} para você pegar outro; ${r.guaranteedPerfectIvs} IVs em 31`;
  return (
    <>
      {rumor !== undefined && (
        <div
          className="legend-rumor frame frame-dialog"
          style={{ '--glow': legendGlow(rumor) } as CSSProperties}
        >
          <span className="legend-rumor-art">
            <PokemonSprite
              speciesId={rumor}
              kind="front"
              silhouette={!state.pokedex[rumor]?.caught}
              pixelScale={1}
            />
          </span>
          <div>
            <strong>BOATO DO DIA</strong>
            <p>
              Dizem que viram {state.pokedex[rumor]?.caught ? speciesName(rumor) : 'um Pokémon lendário'} por
              aí! Hoje ele aparece a qualquer hora e fica 1,5× mais fácil de capturar.
            </p>
          </div>
        </div>
      )}
      <Window
        title="LENDÁRIOS E QUASE LENDÁRIOS"
        icon={<ItemIcon id="master-ball" size={24} />}
        frame="dialog"
      >
        <p className="hint">
          Vença o Campeão de uma região para liberar os desafios dela. Cada lendário aparece com um clima ou
          numa hora do dia, e alguns pedem uma chave (um item, Pokémon na equipe ou outros lendários). A
          batalha é de verdade: ele luta de volta, se enfurece abaixo de metade do HP e não pode ser derrotado
          (fica com 1 de HP). Capture-o <strong>lançando as bolas à mão</strong>; status (sono, paralisia…) e
          a bola certa ajudam muito.
        </p>
        <p className="hint">
          <strong>Lendários:</strong> taxa de captura minúscula; {rule(BALANCE.legendary)}. Cada encontro
          aumenta a chance de shiny.
        </p>
        <p className="hint">
          <strong>Quase lendários</strong> (Dragonite, Tyranitar, Salamence, Metagross, Garchomp, Hydreigon):
          mais fáceis, mas ainda duros; {rule(BALANCE.pseudo)}.
        </p>
        <ul className="legend-balls">
          {BALLS.map((b) => (
            <li key={b}>
              <ItemIcon id={b} size={24} /> ×{state.items[b] ?? 0}
            </li>
          ))}
        </ul>
      </Window>
      <Forecast state={state} now={now} />
      <Sanctuary state={state} />
      {REGIONS.map((region) => {
        const all = LEGENDARIES.filter((l) => l.regionId === region.id);
        if (!all.length) return null;
        const open = legendaryRegionOpen(state, region.id);
        const groups = [
          { label: 'QUASE LENDÁRIOS', list: all.filter((l) => l.tier === 'pseudo') },
          { label: 'LENDÁRIOS', list: all.filter((l) => l.tier !== 'pseudo') },
        ];
        return (
          <Window key={region.id} title={`${region.name.toUpperCase()}${open ? '' : ' · BLOQUEADO'}`}>
            {!open && <p className="hint">Vença o Campeão de {region.name} para desafiar.</p>}
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
