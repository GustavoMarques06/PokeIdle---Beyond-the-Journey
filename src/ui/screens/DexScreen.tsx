// POKéDEX: aparelho vermelho com tela de detalhes e grade de espécies, filtros por região e tipo.

import { useState } from 'react';
import {
  DEX_MILESTONES,
  ROUTES,
  SPECIES,
  STARTER_GENERATIONS,
  TYPE_MEDAL_BONUS,
  getSpecies,
  lineRoot,
} from '../../game-data';
import { canClaimMilestone, caughtCount, claimMilestone, typeProgress } from '../../core/dex';
import type { GameState } from '../../core/game';
import { setHuntTarget } from '../../core/hunt';
import { Bar, ItemIcon, PixelIcon, PokemonSprite, Shiny, TypeBadge, Window } from '../components/common';
import { STAT_NAMES, TYPE_NAMES, formatNumber, formatPercent, itemName, speciesName } from '../i18n/pt-BR';
import { useEngine } from '../useGame';

type Status = 'all' | 'caught' | 'seen' | 'missing';

const REGIONS = STARTER_GENERATIONS.map((g) => ({ generation: g.generation, region: g.region }));
const TYPES = Object.keys(TYPE_NAMES);

/** Linha evolutiva completa a partir da primeira espécie. */
function evolutionLine(speciesId: number): number[] {
  const out: number[] = [];
  const walk = (id: number) => {
    out.push(id);
    for (const e of getSpecies(id).evolutions) walk(e.to);
  };
  walk(lineRoot(speciesId));
  return out;
}

export function DexScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [region, setRegion] = useState<number | 'all'>('all');
  const [type, setType] = useState<string>('all');
  const [status, setStatus] = useState<Status>('all');
  const [selected, setSelected] = useState<number>(state.collection[0].speciesId);

  const seen = SPECIES.filter((s) => state.pokedex[s.id]?.seen).length;
  const caught = SPECIES.filter((s) => state.pokedex[s.id]?.caught).length;
  const list = SPECIES.filter((s) => {
    const d = state.pokedex[s.id];
    if (region !== 'all' && s.generation !== region) return false;
    if (type !== 'all' && !s.types.includes(type)) return false;
    if (status === 'caught') return d?.caught;
    if (status === 'seen') return d?.seen && !d.caught;
    if (status === 'missing') return !d?.caught;
    return true;
  });

  const sp = getSpecies(selected);
  const entry = state.pokedex[selected];
  const known = !!entry?.seen;
  const habitats = ROUTES.filter((r) => r.encounters.some((e) => e.speciesId === selected));

  return (
    <div className="dex frame frame-dex">
      <div className="dex-header">
        <PixelIcon name="pokedex" scale={2} />
        <strong>POKéDEX</strong>
        <span>
          VISTOS {seen} · CAPTURADOS {caught}/{SPECIES.length}
        </span>
      </div>

      <div className="dex-screen frame frame-screen">
        <div className="dex-detail">
          <div className="dex-portrait">
            <PokemonSprite speciesId={selected} kind="front" silhouette={!known} pixelScale={2} />
          </div>
          <div className="dex-facts">
            <div className="dex-title">
              Nº{String(sp.id).padStart(3, '0')} {known ? sp.name.toUpperCase() : '?????'}
              {entry?.shinyCaught && <Shiny />}
            </div>
            <div className="dex-genus">{known ? sp.genus : 'Pokémon desconhecido'}</div>
            {known && (
              <div className="types">
                {sp.types.map((t) => (
                  <TypeBadge key={t} type={t} />
                ))}
              </div>
            )}
            <div className="dex-state">
              {entry?.caught ? (
                <>
                  <PixelIcon name="miniBall" scale={2} /> CAPTURADO
                </>
              ) : known ? (
                'VISTO'
              ) : (
                'NÃO ENCONTRADO'
              )}
            </div>
          </div>
        </div>
        {known && (
          <>
            <table className="dex-stats">
              <tbody>
                {(Object.keys(STAT_NAMES) as (keyof typeof STAT_NAMES)[]).map((k) => (
                  <tr key={k}>
                    <th>{STAT_NAMES[k].toUpperCase()}</th>
                    <td>{sp.baseStats[k]}</td>
                    <td className="dex-statbar">
                      <Bar value={sp.baseStats[k]} max={160} tone="grass" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="dex-line">
              {evolutionLine(selected).map((id, i) => (
                <span key={id} className="dex-line-step">
                  {i > 0 && <span className="dex-arrow">›</span>}
                  <button
                    onClick={() => setSelected(id)}
                    title={state.pokedex[id]?.seen ? speciesName(id) : '???'}
                  >
                    <PokemonSprite speciesId={id} kind="icon" silhouette={!state.pokedex[id]?.seen} />
                  </button>
                </span>
              ))}
            </div>
          </>
        )}
        <div className="dex-habitat">
          HABITAT:{' '}
          {habitats.length
            ? habitats.map((r) => r.name).join(', ')
            : known
              ? 'evolução, ovo ou evento'
              : '???'}
        </div>
        {known && (
          <div className="dex-hunt">
            ENCONTROS: {formatNumber(state.hunt.counts[selected] ?? 0)}
            {state.hunt.target === selected ? (
              <span className="tag tag-active">ALVO DA CAÇA</span>
            ) : (
              <button
                className="pbtn small"
                onClick={() => engine.dispatch((s) => setHuntTarget(s, selected))}
              >
                <PixelIcon name="target" scale={1} /> Caçar shiny
              </button>
            )}
          </div>
        )}
      </div>

      <div className="dex-filters">
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          aria-label="Região"
        >
          <option value="all">Região</option>
          {REGIONS.map((r) => (
            <option key={r.generation} value={r.generation}>
              {r.region}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Tipo">
          <option value="all">Tipo</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {TYPE_NAMES[t]}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status)} aria-label="Estado">
          <option value="all">Estado</option>
          <option value="caught">Capturados</option>
          <option value="seen">Só vistos</option>
          <option value="missing">Faltando</option>
        </select>
      </div>

      <ul className="dex-grid frame frame-screen">
        {list.map((s) => {
          const d = state.pokedex[s.id];
          return (
            <li key={s.id}>
              <button
                className={`dex-cell ${selected === s.id ? 'selected' : ''} ${d?.caught ? 'caught' : d?.seen ? 'seen' : ''}`}
                onClick={() => setSelected(s.id)}
              >
                <span className="dex-num">{String(s.id).padStart(3, '0')}</span>
                <PokemonSprite speciesId={s.id} kind="icon" silhouette={!d?.seen} />
                {d?.caught && <PixelIcon name="miniBall" scale={1} className="dex-caught" />}
              </button>
            </li>
          );
        })}
        {!list.length && <li className="dex-empty">Nenhuma espécie com esses filtros.</li>}
      </ul>

      <DexRewards state={state} />
    </div>
  );
}

function bonusText(
  b: { exp?: number; coins?: number; capture?: number; shiny?: number } | undefined,
): string {
  if (!b) return '';
  return [
    b.exp ? `EXP +${formatPercent(b.exp)}` : '',
    b.coins ? `moedas +${formatPercent(b.coins)}` : '',
    b.capture ? `captura +${formatPercent(b.capture)}` : '',
    b.shiny ? `shiny +${formatPercent(b.shiny)}` : '',
  ]
    .filter(Boolean)
    .join(', ');
}

/** Marcos de capturas (recompensa + bônus permanente) e medalhas por tipo completo. */
function DexRewards({ state }: { state: GameState }) {
  const engine = useEngine();
  const caught = caughtCount(state);
  const types = typeProgress(state);
  return (
    <>
      <Window title="RECOMPENSAS DA POKéDEX" icon={<PixelIcon name="pokedex" scale={1} />} frame="dialog">
        <ul className="milestone-list">
          {DEX_MILESTONES.map((m) => {
            const claimed = state.dexClaimed.includes(m.id);
            const ready = canClaimMilestone(state, m.id);
            const items = Object.entries(m.reward.items ?? {}).map(([id, n]) => `${itemName(id)} ×${n}`);
            return (
              <li key={m.id} className={`milestone ${claimed ? 'claimed' : ''} ${ready ? 'ready' : ''}`}>
                <strong>{m.caught}</strong>
                <div>
                  <small>
                    {[m.reward.research ? `${m.reward.research} pesquisa` : '', ...items]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                  <small className="milestone-bonus">Permanente: {bonusText(m.bonus)}</small>
                  {!claimed && !ready && <Bar value={caught} max={m.caught} tone="grass" />}
                </div>
                {claimed ? (
                  <PixelIcon name="check" scale={2} />
                ) : (
                  <button
                    className="pbtn small primary"
                    disabled={!ready}
                    onClick={() => engine.dispatch((s) => claimMilestone(s, m.id))}
                  >
                    Resgatar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Window>
      <Window title="MEDALHAS DE TIPO" icon={<ItemIcon id="star-piece" size={20} />}>
        <p className="hint">
          Capture todas as espécies de um tipo: golpes desse tipo causam +{formatPercent(TYPE_MEDAL_BONUS)} de
          dano.
        </p>
        <ul className="type-medals">
          {types.map((t) => (
            <li key={t.type} className={t.caught >= t.total ? 'done' : ''}>
              <TypeBadge type={t.type} />
              <Bar value={t.caught} max={t.total} tone={t.caught >= t.total ? 'gold' : 'grass'} />
              <small>
                {t.caught}/{t.total}
              </small>
            </li>
          ))}
        </ul>
      </Window>
    </>
  );
}
