// POKéDEX: o aparelho vermelho. Lente e LEDs na tampa, tela principal com a espécie, botão do
// grito, direcional (↑↓ espécie, ←→ aba), tela de abas e a lista no visor escuro.

import { genusName } from '../i18n/genus';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  DEX_MILESTONES,
  ROUTES,
  SPECIES,
  STARTER_GENERATIONS,
  TYPE_MEDAL_BONUS,
  BALANCE,
  WATER_SPOTS,
  formName,
  formSet,
  getSpecies,
  lineRoot,
} from '../../game-data';
import { canClaimMilestone, caughtCount, claimMilestone, typeProgress } from '../../core/dex';
import {
  completeResearchCount,
  formsCaught,
  researchComplete,
  researchTasks,
  tasksDone,
  type GameState,
} from '../../core/game';
import { setHuntTarget } from '../../core/hunt';
import { audio } from '../audio';
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

type Tab = 'stats' | 'line' | 'research' | 'where';

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats', label: 'DADOS' },
  { id: 'line', label: 'EVOLUÇÃO' },
  { id: 'research', label: 'PESQUISA' },
  { id: 'where', label: 'HABITAT' },
];

const num = (id: number) => String(id).padStart(3, '0');

/**
 * A lista desenha só as linhas à vista (mais uma folga): com 809 espécies, renderizar todas
 * criava centenas de linhas e disparava o download de centenas de ícones a cada abertura.
 * ROW_H e LIST_PAD seguem .dex-row e .dex-list (screens.css); LIST_H é o max-height da lista.
 */
const ROW_H = 34;
const LIST_PAD = 4;
const LIST_H = 340;
const OVERSCAN = 6;

export function DexScreen({ state }: { state: GameState }) {
  const engine = useEngine();
  const [region, setRegion] = useState<number | 'all'>('all');
  const [type, setType] = useState<string>('all');
  const [status, setStatus] = useState<Status>('all');
  const [selected, setSelected] = useState<number>(state.collection[0].speciesId);
  const [tab, setTab] = useState<Tab>('stats');
  const listRef = useRef<HTMLUListElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

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
  const slug = sp.slug;
  const habitats = [
    ...ROUTES.filter((r) => r.encounters.some((e) => e.speciesId === selected)).map((r) => r.name),
    ...ROUTES.flatMap((r) => {
      const spot = WATER_SPOTS[r.id];
      const fish = spot?.fish?.find(([s]) => s === slug);
      const surf = spot?.surf?.some(([s]) => s === slug);
      return [
        ...(fish ? [`${r.name} (pesca, ${itemName(fish[2])})`] : []),
        ...(surf ? [`${r.name} (surf)`] : []),
      ];
    }),
  ];
  const total = Object.values(sp.baseStats).reduce((a, v) => a + v, 0);

  // Janela da lista: só as linhas entre `first` e `last` são desenhadas.
  const first = Math.max(0, Math.floor((scrollTop - LIST_PAD) / ROW_H) - OVERSCAN);
  const last = Math.min(list.length, Math.ceil((scrollTop + LIST_H) / ROW_H) + OVERSCAN);
  const selectedIndex = list.findIndex((s) => s.id === selected);

  // A linha selecionada fica sempre à vista na lista (sem rolar a página inteira). A posição
  // vem do índice, porque a linha pode ainda não estar desenhada.
  useEffect(() => {
    const box = listRef.current;
    if (!box || selectedIndex < 0) return;
    const top = LIST_PAD + selectedIndex * ROW_H;
    if (top < box.scrollTop) box.scrollTop = top;
    else if (top + ROW_H > box.scrollTop + box.clientHeight) box.scrollTop = top + ROW_H - box.clientHeight;
  }, [selectedIndex]);

  /** Direcional ↑↓: anda pela lista filtrada. */
  const step = (dir: 1 | -1) => {
    if (!list.length) return;
    setSelected(list[(selectedIndex + dir + list.length) % list.length].id);
    audio.sfx('cursor');
  };
  /** Direcional ←→: troca a aba da segunda tela. */
  const stepTab = (dir: 1 | -1) => {
    const at = TABS.findIndex((t) => t.id === tab);
    setTab(TABS[(at + dir + TABS.length) % TABS.length].id);
    audio.sfx('cursor');
  };
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).tagName === 'SELECT') return;
    const act = {
      ArrowUp: () => step(-1),
      ArrowDown: () => step(1),
      ArrowLeft: () => stepTab(-1),
      ArrowRight: () => stepTab(1),
    }[e.key];
    if (!act) return;
    e.preventDefault();
    act();
  };

  return (
    <>
      <div className="dex-device" onKeyDown={onKeyDown}>
        {/* Tampa: lente azul (pisca a cada espécie nova), LEDs e o visor com os totais. */}
        <div className="dex-top">
          <span key={selected} className="dex-lens" aria-hidden />
          <span className="dex-leds" aria-hidden>
            <i className="led-red" />
            <i className="led-yellow" />
            <i className="led-green" />
          </span>
          <strong className="dex-brand">POKéDEX</strong>
          <span className="dex-totals">
            <span>
              VISTOS <b key={`s-${seen}`}>{seen}</b>
            </span>
            <span>
              CAPT. <b key={`c-${caught}`}>{caught}</b>/{SPECIES.length}
            </span>
          </span>
        </div>

        <div className="dex-body">
          {/* Tela principal, na moldura cinza com o ponto vermelho e o alto-falante. */}
          <div className="dex-bezel">
            <div className="dex-lcd dex-main">
              <div className="dex-portrait" key={selected}>
                <PokemonSprite speciesId={selected} kind="front" silhouette={!known} pixelScale={2} />
                <span className="dex-scan" aria-hidden />
              </div>
              <div className="dex-facts" key={`facts-${selected}`}>
                <span className="dex-no">Nº{num(sp.id)}</span>
                <strong className="dex-title">
                  {known ? sp.name.toUpperCase() : '?????'}
                  {entry?.shinyCaught && <Shiny />}
                </strong>
                <span className="dex-genus">{known ? genusName(sp.genus) : 'Pokémon desconhecido'}</span>
                {known && (
                  <span className="types">
                    {sp.types.map((t) => (
                      <TypeBadge key={t} type={t} />
                    ))}
                  </span>
                )}
                <span className={`dex-state ${entry?.caught ? 'caught' : known ? 'seen' : ''}`}>
                  {entry?.caught && <PixelIcon name="miniBall" scale={2} />}
                  {entry?.caught ? 'CAPTURADO' : known ? 'VISTO' : 'NÃO ENCONTRADO'}
                </span>
              </div>
            </div>
            <div className="dex-bezel-foot" aria-hidden>
              <i className="dex-bezel-dot" />
              <span className="dex-speaker" />
            </div>
          </div>

          {/* Controles: botão do grito, visor verde e direcional. */}
          <div className="dex-controls">
            <button
              className="dex-round"
              onClick={() => audio.cry(selected)}
              disabled={!known}
              title={known ? 'Ouvir o grito' : 'Espécie ainda não vista'}
              aria-label="Ouvir o grito"
            />
            <span className="dex-green">
              {known ? sp.types.map((t) => TYPE_NAMES[t].toUpperCase()).join(' / ') : '???'}
              {known && <small>BST {total}</small>}
            </span>
            <div className="dex-dpad" role="group" aria-label="Direcional">
              <button
                className="up"
                onClick={() => step(-1)}
                title="Espécie anterior (↑)"
                aria-label="Espécie anterior"
              />
              <button
                className="left"
                onClick={() => stepTab(-1)}
                title="Aba anterior (←)"
                aria-label="Aba anterior"
              />
              <span className="mid" />
              <button
                className="right"
                onClick={() => stepTab(1)}
                title="Próxima aba (→)"
                aria-label="Próxima aba"
              />
              <button
                className="down"
                onClick={() => step(1)}
                title="Próxima espécie (↓)"
                aria-label="Próxima espécie"
              />
            </div>
          </div>

          {/* Segunda tela: uma aba por vez, em vez de tudo empilhado. */}
          <div className="dex-tabs" role="tablist" aria-label="Informações da espécie">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'active' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="dex-lcd dex-info" role="tabpanel">
            {!known ? (
              <p className="dex-unknown">Sem dados. Encontre esta espécie para registrá-la.</p>
            ) : tab === 'stats' ? (
              <table className="dex-stats" key={`stats-${selected}`}>
                <tbody>
                  {(Object.keys(STAT_NAMES) as (keyof typeof STAT_NAMES)[]).map((k) => (
                    <tr key={k}>
                      <th>{STAT_NAMES[k].toUpperCase()}</th>
                      <td>{sp.baseStats[k]}</td>
                      <td className="dex-statbar">
                        <span className="dex-stat-track">
                          <span
                            className={`dex-stat-fill ${sp.baseStats[k] >= 100 ? 'high' : sp.baseStats[k] < 50 ? 'low' : ''}`}
                            style={{ width: `${Math.min(100, (sp.baseStats[k] / 160) * 100)}%` }}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : tab === 'line' ? (
              <>
                <div className="dex-line">
                  {evolutionLine(selected).map((id, i) => (
                    <span key={id} className="dex-line-step">
                      {i > 0 && <span className="dex-arrow">›</span>}
                      <button
                        className={id === selected ? 'current' : ''}
                        onClick={() => setSelected(id)}
                        title={state.pokedex[id]?.seen ? speciesName(id) : '???'}
                      >
                        <PokemonSprite speciesId={id} kind="icon" silhouette={!state.pokedex[id]?.seen} />
                        <small>{state.pokedex[id]?.seen ? speciesName(id) : '???'}</small>
                      </button>
                    </span>
                  ))}
                </div>
                {formSet(selected) && <FormCollection state={state} speciesId={selected} />}
              </>
            ) : tab === 'research' ? (
              <ResearchJournal state={state} speciesId={selected} />
            ) : (
              <div className="dex-where">
                <p>
                  <b>ONDE APARECE</b>
                  {habitats.length ? habitats.join(', ') : 'evolução, ovo ou evento'}
                </p>
                <div className="dex-hunt">
                  <span>
                    <b>ENCONTROS</b> {formatNumber(state.hunt.counts[selected] ?? 0)}
                  </span>
                  {state.hunt.target === selected ? (
                    <span className="tag tag-active">ALVO DA CAÇA</span>
                  ) : (
                    <button
                      className="pbtn small"
                      onClick={() => engine.dispatch((s) => setHuntTarget(s, selected))}
                    >
                      <ItemIcon id="poke-radar" size={16} /> Caçar shiny
                    </button>
                  )}
                </div>
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

          {/* Lista no visor escuro: número, ícone, nome e a Poké Ball de capturado. */}
          <ul className="dex-list" ref={listRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
            {first > 0 && <li className="dex-spacer" style={{ height: first * ROW_H }} aria-hidden />}
            {list.slice(first, last).map((s) => {
              const d = state.pokedex[s.id];
              return (
                <li key={s.id}>
                  <button
                    className={`dex-row ${selected === s.id ? 'selected' : ''} ${d?.caught ? 'caught' : d?.seen ? 'seen' : ''}`}
                    onClick={() => setSelected(s.id)}
                  >
                    <span className="dex-row-num">{num(s.id)}</span>
                    <PokemonSprite speciesId={s.id} kind="icon" silhouette={!d?.seen} />
                    <span className="dex-row-name">{d?.seen ? s.name.toUpperCase() : '----------'}</span>
                    {d?.caught && <PixelIcon name="miniBall" scale={2} className="dex-caught" />}
                  </button>
                </li>
              );
            })}
            {last < list.length && (
              <li className="dex-spacer" style={{ height: (list.length - last) * ROW_H }} aria-hidden />
            )}
            {!list.length && <li className="dex-empty">Nenhuma espécie com esses filtros.</li>}
          </ul>
        </div>
      </div>

      <DexRewards state={state} />
    </>
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

/** Diário de pesquisa da espécie: tarefas e o bônus de pesquisa completa. */
function ResearchJournal({ state, speciesId }: { state: GameState; speciesId: number }) {
  const entry = state.dexResearch[speciesId] ?? researchEntryPreview;
  const done = tasksDone(state, speciesId);
  const need = BALANCE.dexResearch.tasksToComplete;
  const complete = researchComplete(state, speciesId);
  return (
    <div className={`dex-research ${complete ? 'complete' : ''}`}>
      <div className="dex-research-head">
        PESQUISA {Math.min(done, need)}/{need}
        {complete && <span className="tag tag-active">COMPLETA</span>}
        <small>· {completeResearchCount(state)} espécies completas</small>
      </div>
      <ul>
        {researchTasks(speciesId).map((t) => {
          const v = t.value(entry);
          return (
            <li key={t.id} className={v >= t.target ? 'done' : ''}>
              {v >= t.target ? '✔' : '·'} {t.label}{' '}
              <small>
                {Math.min(v, t.target)}/{t.target}
              </small>
            </li>
          );
        })}
      </ul>
      <small className="hint">
        {complete
          ? `Bônus ativo: +${Math.round(BALANCE.dexResearch.captureBonus * 100)}% de captura e +${Math.round(BALANCE.dexResearch.expBonus * 100)}% de EXP contra esta espécie.`
          : `Complete ${need} tarefas para ganhar +${Math.round(BALANCE.dexResearch.captureBonus * 100)}% de captura e +${Math.round(BALANCE.dexResearch.expBonus * 100)}% de EXP contra ela.`}
      </small>
    </div>
  );
}

const researchEntryPreview = { caught: 0, defeated: 0, night: 0, evolved: 0 };

/** Formas da espécie: as capturadas aparecem; as que faltam ficam em silhueta. */
function FormCollection({ state, speciesId }: { state: GameState; speciesId: number }) {
  const set = formSet(speciesId)!;
  const caught = new Set(formsCaught(state, speciesId));
  const hint =
    set.rule === 'season'
      ? 'A forma depende da estação do ano no momento da captura (muda todo mês).'
      : set.rule === 'weather'
        ? 'Lute com um Castform seu sob sol, chuva ou granizo para registrar a forma.'
        : set.rule === 'pattern'
          ? 'Cada Spinda tem um padrão de manchas.'
          : set.rule === 'regional'
            ? 'Em Alola, esta espécie aparece na forma de lá: outros tipos, golpes e habilidades. Os ovos saem na forma da mãe.'
            : 'Cada Unown aparece com uma letra ao acaso.';
  return (
    <div className="dex-forms">
      <div className="dex-research-head">
        FORMAS {caught.size}/{set.forms.length}
      </div>
      <div className="dex-form-grid">
        {set.forms.map((f) => (
          <span key={f} className={`dex-form ${caught.has(f) ? 'got' : ''}`} title={formName(speciesId, f)}>
            <PokemonSprite speciesId={speciesId} kind="front" form={f} silhouette={!caught.has(f)} />
            <small>{formName(speciesId, f)}</small>
          </span>
        ))}
      </div>
      <small className="hint">{hint}</small>
    </div>
  );
}
