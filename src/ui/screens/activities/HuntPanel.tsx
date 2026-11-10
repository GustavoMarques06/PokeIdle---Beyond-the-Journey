// Caça ao shiny: o alvo brilhando com um contador grande (que esquenta com a sequência), a curva da chance, o Poké
// Radar (carrega com os encontros; usado, quatro moitas tremem e você escolhe uma), as espécies da rota e o diário dos
// shinies encontrados.

import { useState, type CSSProperties } from 'react';
import { BALANCE, getRoute } from '../../../game-data';
import { computeModifiers } from '../../../core/bonuses';
import { currentEncounters, type GameState } from '../../../core/game';
import {
  RADAR_CHAIN,
  RADAR_CHARGE,
  huntShinyMultiplier,
  pickRadarBush,
  radarReady,
  setHuntTarget,
  type RadarBush,
} from '../../../core/hunt';
import { audio } from '../../audio';
import { ItemIcon, PokemonSprite, Shiny, Window } from '../../components/common';
import { formatNumber, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';

/** Curva da chance de shiny pela sequência (0 até o teto), com o ponto atual. */
function OddsCurve({ chain, base }: { chain: number; base: number }) {
  const cap = BALANCE.hunt.chainCap;
  const max = 1 + BALANCE.hunt.chainBonus * cap;
  const pts = Array.from({ length: cap + 1 }, (_, c) => {
    const m = 1 + BALANCE.hunt.chainBonus * c;
    return `${(c / cap) * 100},${40 - (m / max) * 36}`;
  }).join(' ');
  const cur = Math.min(chain, cap);
  const cx = (cur / cap) * 100;
  const cy = 40 - ((1 + BALANCE.hunt.chainBonus * cur) / max) * 36;
  return (
    <figure className="hunt-curve">
      <span className="hunt-curve-plot">
        <svg viewBox="0 0 100 42" preserveAspectRatio="none" aria-hidden>
          <polyline points={`0,40 ${pts} 100,40`} className="area" />
          <polyline points={pts} className="line" />
        </svg>
        <i className="dot" style={{ left: `${cx}%`, top: `${(cy / 42) * 100}%` }} aria-hidden />
      </span>
      <figcaption>
        sequência 0 → {cap}: chance ×1 → ×{max.toFixed(0)} · agora 1 em{' '}
        {formatNumber(base / (1 + BALANCE.hunt.chainBonus * cur))}
      </figcaption>
    </figure>
  );
}

function Radar({ state }: { state: GameState }) {
  const engine = useEngine();
  const h = state.hunt;
  const [result, setResult] = useState<{ pick: number; bush: RadarBush; bushes: RadarBush[] } | null>(null);
  const ready = radarReady(state);
  const charge = h.radar ?? 0;
  const bushes = ready ? h.radarBushes! : result?.bushes;

  const pick = (i: number) => {
    if (!ready) return;
    const all = [...h.radarBushes!];
    let got: RadarBush | null = null;
    engine.dispatch((s) => {
      got = pickRadarBush(s, i);
    });
    if (!got) return;
    const bush = got as RadarBush;
    audio.sfx(bush === 'sparkle' ? 'fanfare' : bush === 'strong' ? 'levelUp' : 'miss');
    setResult({ pick: i, bush, bushes: all });
  };

  return (
    <div className={`radar ${ready ? 'ready' : ''}`}>
      <div className="radar-device">
        <span className="radar-screen">
          <span className="radar-sweep" aria-hidden />
        </span>
        <span className="radar-charge">
          <i style={{ width: `${(charge / RADAR_CHARGE) * 100}%` }} />
        </span>
        <small>{ready ? 'PRONTO!' : `${charge}/${RADAR_CHARGE}`}</small>
      </div>
      {bushes ? (
        <div className="radar-field">
          {bushes.map((b, i) => {
            const revealed = result && !ready;
            return (
              <button
                key={i}
                className={`radar-bush ${ready ? b : ''} ${revealed ? `shown ${b}` : ''} ${result?.pick === i && !ready ? 'picked' : ''}`}
                onClick={() => pick(i)}
                disabled={!ready}
                aria-label={`Moita ${i + 1}`}
              >
                <span className="radar-grass" aria-hidden />
                {b === 'sparkle' && <span className="radar-sparkle" aria-hidden />}
                {revealed && b !== 'weak' && h.target && (
                  <span className="radar-mon">
                    <PokemonSprite speciesId={h.target} kind="icon" shiny={b === 'sparkle'} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="hint radar-hint">
          O Poké Radar carrega com {RADAR_CHARGE} encontros do alvo. Pronto, quatro moitas tremem: as que
          tremem forte têm o alvo (+{RADAR_CHAIN} na sequência) e, com sorte, uma brilha: o próximo alvo vem
          shiny!
        </p>
      )}
      {result && !ready && (
        <p className={`radar-result ${result.bush}`}>
          {result.bush === 'sparkle'
            ? '✨ A moita brilhou! O próximo alvo vai ser SHINY!'
            : result.bush === 'strong'
              ? `Era o alvo! A sequência subiu +${RADAR_CHAIN}.`
              : 'Só o vento… nada nessa moita.'}
        </p>
      )}
      {ready && <p className="radar-tip">Escolha uma moita! As que tremem forte escondem o alvo.</p>}
    </div>
  );
}

export function HuntPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const h = state.hunt;
  const route = getRoute(state.currentRouteId);
  const encounters = currentEncounters(state, route.id);
  const total = encounters.reduce((s, e) => s + e.weight, 0);
  const target = h.target;
  const base = 1 / (BALANCE.capture.shinyChance * computeModifiers(state).shiny);
  const odds = target ? base / huntShinyMultiplier(state, target) : base;
  const here = target ? encounters.find((e) => e.speciesId === target) : undefined;
  const heat = Math.min(1, h.chain / BALANCE.hunt.chainCap);
  const digits = String(Math.min(99999, h.encounters)).padStart(5, '0');

  return (
    <>
      <Window title="CAÇA AO SHINY" icon={<ItemIcon id="poke-radar" size={24} />} frame="dialog">
        {target ? (
          <div className="hunt-stage" style={{ '--heat': heat } as CSSProperties}>
            <div className="hunt-spot">
              <span className="hunt-aura" aria-hidden />
              <PokemonSprite speciesId={target} kind="front" shiny pixelScale={2} />
              <span className="hunt-stars" aria-hidden>
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="hunt-info">
              <strong>ALVO: {speciesName(target).toUpperCase()}</strong>
              <span className="hunt-odometer" aria-label={`${h.encounters} encontros`}>
                {[...digits].map((d, i) => (
                  <b key={`${i}-${d}`}>{d}</b>
                ))}
              </span>
              <small>encontros nesta caçada</small>
              <span className="hunt-chain">
                SEQUÊNCIA <b>{h.chain}</b> <small>(recorde {h.bestChain})</small>
                {h.radarShiny && <em className="hunt-guaranteed">✨ próximo: SHINY!</em>}
              </span>
              <small>
                Chance agora: <b>1 em {formatNumber(odds)}</b>
                {here
                  ? ` · ${Math.round((here.weight / total) * 100)}% dos encontros aqui`
                  : ' · não aparece na rota atual!'}
              </small>
              <button className="pbtn small" onClick={() => engine.dispatch((s) => setHuntTarget(s, null))}>
                Parar a caçada
              </button>
            </div>
          </div>
        ) : (
          <p className="hint">
            Escolha uma espécie que você já viu. Ela aparece {BALANCE.hunt.targetWeight}× mais e cada encontro
            seguido soma +{BALANCE.hunt.chainBonus * 100}% de chance de shiny (até {BALANCE.hunt.chainCap}).
            Trocar de rota ou ser derrotado quebra a sequência. Chance base atual: 1 em {formatNumber(base)}.
          </p>
        )}
        {target && <OddsCurve chain={h.chain} base={base} />}
      </Window>

      {target && (
        <Window
          title={`POKé RADAR · usado ${h.radarUses ?? 0}×`}
          icon={<ItemIcon id="poke-radar" size={24} />}
        >
          <Radar state={state} />
        </Window>
      )}

      <Window title={`ESPÉCIES DE ${route.name.toUpperCase()}`}>
        <ul className="hunt-options">
          {encounters.map((e) => {
            const seen = state.pokedex[e.speciesId]?.seen;
            return (
              <li key={e.speciesId}>
                <button
                  className={`pc-cell ${target === e.speciesId ? 'selected' : ''}`}
                  disabled={!seen}
                  onClick={() => {
                    audio.sfx('click');
                    engine.dispatch((s) => setHuntTarget(s, e.speciesId));
                  }}
                  title={seen ? `Caçar ${speciesName(e.speciesId)}` : 'Ainda não visto'}
                >
                  <PokemonSprite speciesId={e.speciesId} kind="icon" silhouette={!seen} />
                  <span>{formatNumber(h.counts[e.speciesId] ?? 0)}</span>
                  {state.pokedex[e.speciesId]?.shinyCaught && <Shiny />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hint">O número é o total de encontros com cada espécie.</p>
      </Window>

      {h.log.length > 0 && (
        <Window title={`DIÁRIO DE SHINIES · ${h.log.length}`} icon={<Shiny />}>
          <ul className="hunt-diary">
            {h.log.map((l, i) => (
              <li key={i} style={{ '--i': i } as CSSProperties}>
                <span className="hunt-diary-mon">
                  <PokemonSprite speciesId={l.speciesId} kind="front" shiny pixelScale={1} />
                </span>
                <strong>{speciesName(l.speciesId)}</strong>
                <small>após {formatNumber(l.encounters)} encontros</small>
                <small>{new Date(l.at).toLocaleDateString('pt-BR')}</small>
              </li>
            ))}
          </ul>
        </Window>
      )}
    </>
  );
}
