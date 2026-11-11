// Creche: dois hóspedes compatíveis geram ovos com as vitórias. Os ovos andam nas chocadeiras (ou levados na
// equipe), não dizem a espécie até chocar (só a cor da casca e uma pista) e, prontos, esperam o jogador tocar para ver
// a cerimônia, o sorteio e os IVs herdados. Vários prontos chocam em sequência, com um resumo no fim.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { audio } from '../../audio';
import { BALANCE, getSpecies, type TypeName } from '../../../game-data';
import { activityUnlocked, findPokemon } from '../../../core/collection';
import {
  HATCH_MILESTONES,
  breedingEffects,
  carryEgg,
  compatible,
  daycareCompatible,
  daycarePokemon,
  eggCrack,
  eggHint,
  eggPlace,
  eggReady,
  eggWarmth,
  hatchEgg,
  incompatibility,
  incubatorSlots,
  nestSize,
  prioritizeEgg,
  takeFromDaycare,
  warmEgg,
  type Egg,
  type HatchBonus,
  type HatchResult,
} from '../../../core/daycare';
import type { GameEvent, GameState } from '../../../core/game';
import { NICKNAME_MAX, setNickname, type PokemonInstance } from '../../../core/pokemon';
import type { Ivs } from '../../../core/stats';
import { reservePokemon, reserveSlotsUnlocked } from '../../../core/team';
import { Bar, ItemIcon, PokemonSprite, Shiny, TrainerSprite, Window } from '../../components/common';
import { STAT_NAMES, formatDuration, moveName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { DaycarePc } from './DaycarePc';
import { Locked } from './shared';

// --- Ovo em pixel art -------------------------------------------------------------------------

const TYPE_SPOT: Record<TypeName, string> = {
  normal: '#a8a878',
  fire: '#f08030',
  water: '#6890f0',
  grass: '#58b040',
  electric: '#e8c020',
  ice: '#68c0d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#c89848',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#98b020',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#a0a0c0',
  fairy: '#e890b0',
};

/** Linhas do ovo (y, x inicial, x final) numa grade de 16×16. */
const EGG_ROWS: [number, number, number][] = [
  [1, 6, 9],
  [2, 5, 10],
  [3, 4, 11],
  [4, 4, 11],
  [5, 3, 12],
  [6, 3, 12],
  [7, 3, 12],
  [8, 3, 12],
  [9, 3, 12],
  [10, 3, 12],
  [11, 3, 12],
  [12, 4, 11],
  [13, 4, 11],
  [14, 5, 10],
];
const EGG_OUTLINE = EGG_ROWS.map(([y, a, b]) => `M${a - 1} ${y}h${b - a + 3}v1h-${b - a + 3}z`).join('') + 'M5 0h6v1h-6z M5 15h6v1h-6z';
const EGG_FILL = EGG_ROWS.map(([y, a, b]) => `M${a} ${y}h${b - a + 1}v1h-${b - a + 1}z`).join('');
const EGG_SPOTS = 'M5 4h2v2h-2z M9 6h3v2h-3z M4 9h2v2h-2z M8 10h2v2h-2z M6 13h2v1h-2z M10 12h1v1h-1z';

/** Ovo desenhado pelo jogo: casca creme com manchas na cor do tipo, rachaduras do estágio e brilho se for shiny. */
export function EggSprite({
  crack,
  size = 32,
  type,
  shiny,
}: {
  crack: 0 | 1 | 2 | 3;
  size?: number;
  type?: TypeName;
  shiny?: boolean;
}) {
  const spot = type ? TYPE_SPOT[type] : '#58b040';
  return (
    <span className={`egg-sprite ${shiny ? 'egg-shiny' : ''}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
        <path d={EGG_OUTLINE} fill="#3a2c20" />
        <path d={EGG_FILL} fill="#f8f0d8" />
        <path d={EGG_SPOTS} fill={spot} />
        <path d="M5 3h1v1h-1z M4 5h1v2h-1z" fill="#ffffff" />
        <path d="M11 9h1v3h-1z M10 12h1v1h-1z M7 13h3v1h-3z" fill="#d8c8a0" />
        {crack > 0 && <path d="M7 5h1v1h1v1h-1v1h-1z" fill="#3a2c20" />}
        {crack > 1 && <path d="M9 8h1v1h1v1h-1v1h-1v-1h-1v-1h1z M5 9h1v1h-1z" fill="#3a2c20" />}
        {crack > 2 && <path d="M6 3h1v2h-1z M10 5h1v2h-1z M4 7h1v2h-1z M11 11h1v1h-1z" fill="#3a2c20" />}
      </svg>
      {shiny && <i className="egg-glint" aria-hidden />}
    </span>
  );
}

const eggType = (egg: Egg) => getSpecies(egg.speciesId).types[0];

/** Humor do ovo pela casca: quieto, mexendo, quase chocando ou pronto (cada um com a sua animação). */
const eggMood = (egg: Egg) => {
  const f = egg.progress / egg.cycles;
  return f >= 1 ? 'ready' : f > 0.85 ? 'hatching' : f > 0.5 ? 'stirring' : 'calm';
};

const delayOf = (egg: Egg) => ({ '--delay': `${(egg.id % 7) * -0.37}s` }) as CSSProperties;

// --- Cerimônia ----------------------------------------------------------------------------------

const bonusText = (b: HatchBonus): string => {
  switch (b.kind) {
    case 'iv':
      return `IV perfeito em ${STAT_NAMES[b.stat]}!`;
    case 'eggMove':
      return `Nasceu sabendo ${moveName(b.move)}!`;
    case 'hidden':
      return 'Habilidade oculta!';
    case 'friendship':
      return 'Já nasceu muito apegado a você!';
    case 'coins':
      return `Achou ${b.amount} moedas na casca!`;
  }
};

const ROULETTE = ['IV perfeito', 'Golpe de ovo', 'Habilidade oculta', 'Amizade', 'Moedas'];
const STAT_KEYS: (keyof Ivs)[] = ['hp', 'atk', 'def', 'spAtk', 'spDef', 'spe'];

/** Os 6 IVs do filhote, com o ícone do pai de quem veio cada um herdado. */
function InheritedIvs({ result }: { result: HatchResult }) {
  return (
    <ul className="hatch-ivs">
      {STAT_KEYS.map((k, i) => {
        const from = result.from[k];
        const parent = from === undefined ? undefined : result.parents[from];
        return (
          <li
            key={k}
            className={`${result.ivs[k] === 31 ? 'perfect' : ''} ${parent ? 'inherited' : ''}`}
            style={{ '--i': i } as CSSProperties}
            title={parent ? `Herdado de ${speciesName(parent.s)}` : 'Sorteado'}
          >
            <small>{STAT_NAMES[k]}</small>
            <strong>{result.ivs[k]}</strong>
            {parent && <PokemonSprite speciesId={parent.s} kind="icon" shiny={parent.shiny} />}
          </li>
        );
      })}
    </ul>
  );
}

function NicknameField({ uid }: { uid: number }) {
  const engine = useEngine();
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  if (saved) return <p className="hatch-text">Apelido salvo!</p>;
  return (
    <form
      className="hatch-nick"
      onSubmit={(e) => {
        e.preventDefault();
        engine.dispatch((s) => {
          const p = findPokemon(s, uid);
          if (p) setNickname(p, text);
        });
        setSaved(true);
      }}
    >
      <input
        aria-label="Apelido do filhote"
        placeholder="Dar um apelido?"
        maxLength={NICKNAME_MAX}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="pbtn small" type="submit" disabled={!text.trim()}>
        OK
      </button>
    </form>
  );
}

/** Cerimônia: o ovo balança e racha cada vez mais forte, um clarão espalha a casca, o filhote pula para fora, a
    roleta diz o presente dele e os IVs mostram de qual pai veio cada um. */
function HatchOverlay({
  egg,
  left,
  onNext,
  onSkipAll,
}: {
  egg: Egg;
  /** Quantos ovos prontos ainda faltam depois deste. */
  left: number;
  onNext: (result: HatchResult | null) => void;
  onSkipAll: (result: HatchResult | null) => void;
}) {
  const engine = useEngine();
  const [stage, setStage] = useState<'shake1' | 'shake2' | 'shake3' | 'flash' | 'born' | 'spin' | 'done'>('shake1');
  const [result, setResult] = useState<HatchResult | null>(null);
  const [spin, setSpin] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const at = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    audio.sfx('cursor');
    at(900, () => {
      setStage('shake2');
      audio.sfx('cursor');
    });
    at(1800, () => {
      setStage('shake3');
      audio.sfx('hit');
    });
    at(2700, () => {
      setStage('flash');
      audio.sfx('evolve');
      let res: HatchResult | null = null;
      engine.dispatch((s, now) => {
        const events: GameEvent[] = [];
        res = hatchEgg(s, egg.id, now, events);
        return events;
      });
      setResult(res);
      const born = res as HatchResult | null;
      if (born) {
        at(500, () => audio.cry(born.speciesId));
        if (born.shiny) at(900, () => audio.sfx('fanfare'));
      }
    });
    at(3300, () => setStage('born'));
    at(4700, () => setStage('spin'));
    const list = timers.current;
    return () => list.forEach((t) => window.clearTimeout(t));
  }, [engine, egg.id]);
  useEffect(() => {
    if (stage !== 'spin') return;
    let n = 0;
    let timer = 0;
    // A roleta desacelera até parar, com um clique a cada casa.
    const step = () => {
      n++;
      setSpin(n);
      audio.sfx('cursor');
      if (n >= 16) {
        setStage('done');
        audio.sfx('itemGet');
        return;
      }
      timer = window.setTimeout(step, 50 + n * n * 1.6);
    };
    timer = window.setTimeout(step, 60);
    return () => window.clearTimeout(timer);
  }, [stage]);

  const shaking = stage.startsWith('shake');
  const crack = stage === 'shake1' ? 1 : stage === 'shake2' ? 2 : 3;
  const shown = result && !shaking && stage !== 'flash';
  return (
    <div className="modal-backdrop hatch-backdrop" role="dialog" aria-modal="true" aria-label="Ovo chocando">
      <div className={`hatch-stage frame frame-dialog stage-${stage} ${result?.shiny ? 'is-shiny' : ''}`}>
        <span className="hatch-rays" aria-hidden />
        <span className="hatch-motes" aria-hidden>
          {Array.from({ length: 10 }, (_, i) => (
            <i key={i} style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
        {(shaking || stage === 'flash') && (
          <div className={`hatch-egg ${shaking ? `shake ${stage}` : 'burst'}`}>
            <EggSprite crack={crack} size={96} type={eggType(egg)} shiny={egg.shiny} />
          </div>
        )}
        {stage === 'flash' && (
          <>
            <div className="hatch-flash" />
            <span className="hatch-shell" aria-hidden>
              {Array.from({ length: 10 }, (_, i) => (
                <i key={i} style={{ '--a': `${i * 36 + 10}deg` } as CSSProperties} />
              ))}
            </span>
          </>
        )}
        {shown && (
          <div className={`hatch-born ${result.shiny ? 'shiny' : ''}`}>
            <span className="hatch-mon">
              <PokemonSprite speciesId={result.speciesId} kind="front" shiny={result.shiny} pixelScale={2} />
              {result.shiny && (
                <span className="hatch-stars" aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <i key={i} style={{ '--i': i } as CSSProperties} />
                  ))}
                </span>
              )}
            </span>
            <p className="hatch-text">
              Oh? Nasceu um <strong>{speciesName(result.speciesId).toUpperCase()}</strong>
              {result.shiny && <Shiny />}!
            </p>
            {(stage === 'spin' || stage === 'done') && (
              <p className={`hatch-bonus ${stage === 'done' ? 'landed' : 'spinning'}`}>
                {stage === 'done' ? bonusText(result.bonus) : ROULETTE[spin % ROULETTE.length]}
              </p>
            )}
            {stage === 'done' && (
              <>
                <InheritedIvs result={result} />
                <NicknameField uid={result.uid} />
                <span className="hatch-confetti" aria-hidden>
                  {Array.from({ length: 14 }, (_, i) => (
                    <i key={i} style={{ '--i': i } as CSSProperties} />
                  ))}
                </span>
              </>
            )}
          </div>
        )}
        {shaking && (
          <p className="hatch-text">
            {stage === 'shake1' ? 'Oh?' : stage === 'shake2' ? 'O ovo está se mexendo!' : 'Está rachando!!'}
          </p>
        )}
        <div className="hatch-actions">
          {stage === 'done' || !result ? (
            <button className="pbtn primary" onClick={() => onNext(result)} disabled={shaking || stage === 'flash'}>
              {stage !== 'done' ? 'Fechar' : left > 0 ? `Próximo ovo (${left})` : 'Que lindo!'}
            </button>
          ) : (
            <button className="pbtn" onClick={() => setStage('done')}>
              Pular
            </button>
          )}
          {left > 0 && stage === 'done' && (
            <button className="pbtn" onClick={() => onSkipAll(result)}>
              Chocar todos de uma vez
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Resumo de vários ovos chocados em sequência. */
function HatchSummary({ results, onClose }: { results: HatchResult[]; onClose: () => void }) {
  return (
    <div className="modal-backdrop hatch-backdrop" role="dialog" aria-modal="true" aria-label="Ovos chocados">
      <div className="hatch-stage hatch-summary frame frame-dialog stage-done">
        <span className="hatch-rays" aria-hidden />
        <h3>{results.length} OVOS CHOCARAM!</h3>
        <ul>
          {results.map((r, i) => (
            <li key={r.uid} className={r.shiny ? 'shiny' : ''} style={{ '--i': i } as CSSProperties}>
              <PokemonSprite speciesId={r.speciesId} kind="icon" shiny={r.shiny} />
              <span>
                <strong>
                  {speciesName(r.speciesId).toUpperCase()}
                  {r.shiny && <Shiny />}
                </strong>
                <small>{bonusText(r.bonus)}</small>
              </span>
            </li>
          ))}
        </ul>
        <button className="pbtn primary" onClick={onClose}>
          Que lindos!
        </button>
      </div>
    </div>
  );
}

// --- Ninho e lista ------------------------------------------------------------------------------

function EggRow({
  state,
  egg,
  onHatch,
  isNew,
  selected,
}: {
  state: GameState;
  egg: Egg;
  onHatch: () => void;
  isNew: boolean;
  selected: boolean;
}) {
  const engine = useEngine();
  const d = BALANCE.daycare;
  const place = eggPlace(state, egg);
  const ready = eggReady(egg);
  const { title, hint } = eggHint(egg);
  const warmth = eggWarmth(state);
  const left = Math.max(0, egg.cycles - egg.progress);
  const speed = warmth * (place === 'carried' ? d.carriedMult : 1);
  const kills = Math.ceil((left * d.killsPerCycle) / speed);
  const minutes = (left * d.minutesPerCycle * 60_000) / warmth;
  const teamFull = reservePokemon(state).length >= reserveSlotsUnlocked(state);
  const warmers = state.items['egg-warmer'] ?? 0;
  return (
    <li
      className={`egg-row egg-${place} ${ready ? 'egg-ready' : ''} ${isNew ? 'egg-new' : ''} ${selected ? 'selected' : ''} ${warmth > 1 && place !== 'waiting' ? 'egg-warm-row' : ''}`}
    >
      <button
        className={`egg-button mood-${eggMood(egg)}`}
        disabled={!ready}
        onClick={onHatch}
        title={ready ? 'Chocar!' : 'Ainda não está pronto'}
        style={delayOf(egg)}
      >
        <EggSprite crack={eggCrack(egg)} size={48} type={eggType(egg)} shiny={egg.shiny} />
        {ready && <span className="egg-alert">!</span>}
        {place === 'carried' && <span className="egg-carried-tag">NA EQUIPE</span>}
        {isNew && (
          <span className="egg-sparkle" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
      <div>
        <strong>{title}</strong>
        <small className="egg-hint">
          {egg.gift ? `Ovo raro (${egg.gift}). ` : ''}
          {hint}
        </small>
        {!ready && <Bar value={egg.progress} max={egg.cycles} tone="exp" />}
        <small>
          {ready
            ? 'Toque no ovo para chocar!'
            : place === 'waiting'
              ? 'Esperando uma chocadeira livre.'
              : `Choca em ${kills} vitórias ou ${formatDuration(minutes)}`}
        </small>
        <div className="egg-actions">
          {ready && (
            <button className="pbtn small primary" onClick={onHatch}>
              Chocar!
            </button>
          )}
          {!ready && place === 'waiting' && (
            <button className="pbtn small" onClick={() => engine.dispatch((s) => void prioritizeEgg(s, egg.id))}>
              Pôr na chocadeira
            </button>
          )}
          {!ready && place !== 'carried' && (
            <button
              className="pbtn small"
              disabled={state.carriedEgg === undefined && teamFull}
              title={
                state.carriedEgg === undefined && teamFull
                  ? 'Precisa de uma vaga livre na equipe'
                  : `Anda ${d.carriedMult}× mais rápido com as vitórias, mas ocupa uma vaga da equipe`
              }
              onClick={() => engine.dispatch((s) => void carryEgg(s, egg.id))}
            >
              Levar na equipe
            </button>
          )}
          {place === 'carried' && (
            <button className="pbtn small" onClick={() => engine.dispatch((s) => void carryEgg(s, undefined))}>
              Devolver ao ninho
            </button>
          )}
          {!ready && warmers > 0 && (
            <button
              className="pbtn small"
              title="Adianta metade do caminho até chocar"
              onClick={() => {
                audio.sfx('heal');
                engine.dispatch((s) => void warmEgg(s, egg.id));
              }}
            >
              <ItemIcon id="egg-warmer" size={16} /> Aquecer ({warmers})
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** O ninho: uma chocadeira por vaga, com o ovo dentro balançando e o calor subindo; o da equipe ao lado; e a fila. */
function Nest({
  state,
  fresh,
  selected,
  onPick,
}: {
  state: GameState;
  fresh: number[];
  selected: number | null;
  onPick: (egg: Egg) => void;
}) {
  const slots = incubatorSlots(state);
  const inside = state.eggs.filter((e) => eggPlace(state, e) === 'incubator');
  const carried = state.eggs.find((e) => eggPlace(state, e) === 'carried');
  const waiting = state.eggs.filter((e) => eggPlace(state, e) === 'waiting');
  const warm = eggWarmth(state) > 1;
  const eggButton = (egg: Egg, size: number) => (
    <button
      className={`nest-egg mood-${eggMood(egg)} ${fresh.includes(egg.id) ? 'egg-new' : ''} ${selected === egg.id ? 'selected' : ''}`}
      style={delayOf(egg)}
      onClick={() => onPick(egg)}
      title={eggReady(egg) ? 'Chocar!' : eggHint(egg).title}
    >
      <EggSprite crack={eggCrack(egg)} size={size} type={eggType(egg)} shiny={egg.shiny} />
      {eggReady(egg) && <span className="egg-alert">!</span>}
    </button>
  );
  const cup = (egg: Egg | undefined, key: string, label?: string) => (
    <div key={key} className={`nest-cup ${egg ? '' : 'empty'} ${warm && egg ? 'warm' : ''} ${label ? 'carried' : ''}`}>
      {egg ? eggButton(egg, 44) : <span className="nest-empty">vazia</span>}
      <span className="nest-heat" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      {label && <small className="nest-label">{label}</small>}
    </div>
  );
  if (!state.eggs.length) return null;
  return (
    <>
      <div className="nest">
        {Array.from({ length: slots }, (_, i) => cup(inside[i], `slot-${i}`))}
        {carried && cup(carried, 'carried', 'NA EQUIPE')}
      </div>
      {waiting.length > 0 && (
        <div className="nest-queue">
          <small>NA FILA</small>
          {waiting.map((egg) => (
            <span key={egg.id} className="nest-queue-egg">
              {eggButton(egg, 30)}
            </span>
          ))}
        </div>
      )}
    </>
  );
}

function BreedingNotes({ a, b }: { a: PokemonInstance; b: PokemonInstance }) {
  const fx = breedingEffects(a, b);
  const d = BALANCE.daycare;
  const notes = [
    fx.knot ? `Destiny Knot: herda ${d.knotIvs} IVs dos pais.` : `Herda ${d.inheritedIvs} IVs dos pais.`,
    ...fx.powers.map((p) => `Power Item: IV de ${STAT_NAMES[p.stat]} garantido.`),
    ...(fx.everstone ? ['Everstone: o filhote herda a natureza.'] : []),
    ...(fx.masuda ? [`Pais de treinadores diferentes: shiny ${d.masudaMultiplier}× mais provável.`] : []),
    ...(fx.hidden ? [`A mãe tem a habilidade oculta: ${Math.round(d.hiddenInherit * 100)}% de chance de passar.`] : []),
  ];
  return (
    <ul className="breeding-notes">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}

/** O que o dono da Creche diz do casal: muda com o par e com o tempo. */
function caretakerLine(state: GameState, a?: PokemonInstance, b?: PokemonInstance): string {
  if (!a) return 'Olá! Quer deixar um Pokémon com a gente? Cuidamos bem dele enquanto você treina.';
  if (!b) return `O ${speciesName(a.speciesId)} está esperando companhia. Traga mais um!`;
  if (!compatible(a, b)) {
    return incompatibility(a, b) === 'gender'
      ? 'Os dois preferem brincar com outros… (precisam ser um macho e uma fêmea, ou um deles ser Ditto).'
      : 'Esses dois não parecem se gostar… (precisam de um grupo de ovos em comum, ou de um Ditto).'
  }
  const lines = [
    'Os dois se dão muito bem! Logo deve aparecer um ovo.',
    'Eles estão sempre brincando juntos!',
    `O ${speciesName(a.speciesId)} não desgruda do ${speciesName(b.speciesId)}.`,
    'Hoje os dois passaram a tarde tirando um cochilo juntinhos.',
  ];
  return lines[Math.floor(state.lastTimerAt / 600_000) % lines.length];
}

export function DaycarePanel({ state }: { state: GameState }) {
  const engine = useEngine();
  // Fila de ovos chocando em sequência e o que já nasceu nela (para o resumo).
  const [queue, setQueue] = useState<Egg[]>([]);
  const [results, setResults] = useState<HatchResult[]>([]);
  const [summary, setSummary] = useState<HatchResult[] | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  // Ovos que chegaram com a tela aberta caem no ninho com brilho (os que já estavam não).
  const seen = useRef<Set<number> | null>(null);
  const [fresh, setFresh] = useState<number[]>([]);
  const ids = state.eggs.map((e) => e.id).join(',');
  useEffect(() => {
    const now = new Set(ids ? ids.split(',').map(Number) : []);
    if (seen.current) {
      const arrived = [...now].filter((id) => !seen.current!.has(id));
      if (arrived.length) {
        setFresh((f) => [...f, ...arrived]);
        audio.sfx('itemGet');
        const t = window.setTimeout(() => setFresh((f) => f.filter((id) => !arrived.includes(id))), 1600);
        seen.current = now;
        return () => window.clearTimeout(t);
      }
    }
    seen.current = now;
  }, [ids]);
  if (!activityUnlocked(state, 'daycare')) return <Locked routeId={BALANCE.daycare.unlock} />;
  const d = BALANCE.daycare;
  const guests = daycarePokemon(state);
  const [a, b] = guests;
  const ok = daycareCompatible(state);
  const nest = nestSize(state);
  const full = state.eggs.length >= nest;
  const warmth = eggWarmth(state);
  const ready = state.eggs.filter(eggReady);

  const startHatching = (first: Egg) => {
    setResults([]);
    setQueue([first, ...ready.filter((e) => e.id !== first.id)]);
  };
  const finish = (all: HatchResult[]) => {
    setQueue([]);
    setResults([]);
    if (all.length > 1) setSummary(all);
  };
  const next = (r: HatchResult | null) => {
    const all = r ? [...results, r] : results;
    const rest = queue.slice(1).filter((e) => state.eggs.some((x) => x.id === e.id && eggReady(x)));
    if (rest.length) {
      setResults(all);
      setQueue(rest);
    } else finish(all);
  };
  const skipAll = (r: HatchResult | null) => {
    const all = r ? [...results, r] : [...results];
    const rest = queue.slice(1);
    engine.dispatch((s, now) => {
      const events: GameEvent[] = [];
      for (const egg of rest) {
        const res = hatchEgg(s, egg.id, now, events);
        if (res) all.push(res);
      }
      return events;
    });
    audio.sfx('fanfare');
    finish(all);
  };
  const pick = (egg: Egg) => {
    if (eggReady(egg)) startHatching(egg);
    else setSelected((cur) => (cur === egg.id ? null : egg.id));
  };
  const current = queue[0];

  return (
    <>
      {/* No body: dentro da janela (que isola a pintura) o fundo fixo ficaria preso a ela. */}
      {current &&
        createPortal(
          <HatchOverlay key={current.id} egg={current} left={queue.length - 1} onNext={next} onSkipAll={skipAll} />,
          document.body,
        )}
      {summary && createPortal(<HatchSummary results={summary} onClose={() => setSummary(null)} />, document.body)}
      {picking && <DaycarePc state={state} onClose={() => setPicking(false)} />}
      <Window title="CRECHE POKéMON" icon={<ItemIcon id="mystery-egg" size={24} />} frame="dialog">
        <div className={`daycare-yard ${ok ? 'in-love' : guests.length === 2 ? 'grumpy' : ''}`}>
          {ok && (
            <span className="yard-hearts" aria-hidden>
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          )}
          {!ok && guests.length === 2 && (
            <span className="yard-grumble" aria-hidden>
              …
            </span>
          )}
          {[0, 1].map((i) => {
            const p = guests[i];
            return p ? (
              <button
                key={p.uid}
                className={`daycare-guest frame frame-slot guest-${i}`}
                onClick={() => engine.dispatch((s) => takeFromDaycare(s, p.uid))}
                title="Retirar da creche"
              >
                <PokemonSprite speciesId={p.speciesId} kind="front" shiny={p.shiny} pixelScale={1} />
                <span>
                  {speciesName(p.speciesId).toUpperCase()} Nv{p.level}
                  {p.shiny && <Shiny />}
                </span>
                {p.held && (
                  <small className="daycare-held">
                    <ItemIcon id={p.held} size={16} />
                  </small>
                )}
                <small>Retirar</small>
              </button>
            ) : (
              <button
                key={i}
                className="daycare-guest daycare-open frame frame-slotEmpty"
                onClick={() => setPicking(true)}
                title="Abrir o PC e escolher um hóspede"
              >
                <span className="daycare-plus" aria-hidden>
                  +
                </span>
                <span>VAGA {i + 1}</span>
                <small>{a ? `Escolha o par do ${speciesName(a.speciesId)}` : 'Abrir o PC'}</small>
              </button>
            );
          })}
        </div>
        {/* O gramado: os hóspedes passeiam. Compatíveis se encontram no meio; brigados, cada um vai para um lado. */}
        {guests.length > 0 && (
          <div
            className={`yard-lane ${ok ? 'together' : guests.length === 2 ? 'apart' : 'alone'}`}
            aria-hidden
          >
            <span className="yard-flowers" />
            {guests.map((p, i) => (
              <span key={p.uid} className={`yard-walker w-${i}`}>
                <PokemonSprite speciesId={p.speciesId} kind="icon" shiny={p.shiny} />
              </span>
            ))}
            {ok && <span className="yard-meet">♥</span>}
            {ok && !full && state.daycare.eggProgress / d.killsPerEgg > 0.8 && (
              <span className="yard-egg">
                <EggSprite crack={0} size={20} />
              </span>
            )}
          </div>
        )}
        <div className="daycare-owner">
          <span className="daycare-owner-sprite" aria-hidden>
            <TrainerSprite id="class-pokemonbreeder" size={44} head />
          </span>
          <p className="daycare-status caretaker">
            <span className="caretaker-tag">DONA DA CRECHE</span> {caretakerLine(state, a, b)}
          </p>
        </div>
        {a && b && ok && <BreedingNotes a={a} b={b} />}
        {ok && (
          <div className="node-progress">
            <Bar value={full ? 0 : state.daycare.eggProgress} max={d.killsPerEgg} tone="gold" />
            <span>
              {full ? 'Ninho cheio: choque algum ovo' : `${Math.floor(state.daycare.eggProgress)}/${d.killsPerEgg} vitórias`}
            </span>
          </div>
        )}
        <p className="hint">
          Itens dos pais mudam o filhote: Destiny Knot, Power Items e Everstone. Aquecedor e Chocadeira extra também
          estão na Loja de Departamentos.
        </p>
      </Window>

      <Window
        title={`OVOS · ${state.eggs.length}/${nest} · ${incubatorSlots(state)} CHOCADEIRAS`}
        icon={<ItemIcon id="mystery-egg" size={24} />}
        className={`eggs-window ${selected !== null ? 'has-selected' : ''}`}
        actions={
          ready.length > 0 && (
            <button className="pbtn small primary" onClick={() => startHatching(ready[0])}>
              {ready.length > 1 ? `Chocar todos (${ready.length})` : 'Chocar!'}
            </button>
          )
        }
      >
        {state.eggs.length === 0 && <p className="hint">Nenhum ovo ainda.</p>}
        {warmth > 1 && <p className="egg-warm">Tem um Pokémon quentinho na equipe: os ovos andam {warmth}× mais rápido!</p>}
        <Nest state={state} fresh={fresh} selected={selected} onPick={pick} />
        {state.eggs.length > 0 && <p className="hint nest-tip">Toque num ovo para ver os detalhes dele.</p>}
        <ul className="egg-list">
          {state.eggs.map((egg) => (
            <EggRow
              key={egg.id}
              state={state}
              egg={egg}
              isNew={fresh.includes(egg.id)}
              selected={selected === egg.id}
              onHatch={() => startHatching(egg)}
            />
          ))}
        </ul>
        <label className="check-row">
          <input
            type="checkbox"
            checked={state.settings.autoHatch}
            onChange={(e) => {
              const on = e.target.checked;
              engine.dispatch((s) => {
                s.settings.autoHatch = on;
              });
            }}
          />{' '}
          Chocar sozinho (sem a cerimônia, bom para quando o jogo fica fechado)
        </label>
        <p className="hint">
          Só os ovos nas chocadeiras (e o levado na equipe) andam. A casca tem a cor do tipo, mas a espécie só aparece
          ao chocar; chance de shiny {d.shinyMultiplier}× maior. Chama Corporal ou Armadura de Magma na equipe choca{' '}
          {d.flameBodyMult}× mais rápido.
        </p>
      </Window>

      <Window title={`DIÁRIO DA CHOCADEIRA · ${state.stats.hatched} chocados`}>
        <ul className="milestone-list hatch-diary">
          {HATCH_MILESTONES.map((m) => {
            const done = state.stats.hatched >= m.at;
            return (
              <li key={m.id} className={`milestone ${done ? 'done' : ''}`}>
                <EggSprite crack={done ? 3 : 0} size={28} />
                <div>
                  <strong>{m.at} ovos</strong>
                  <small>{m.text}</small>
                </div>
                {done ? <span className="tag">OK</span> : <Bar value={state.stats.hatched} max={m.at} tone="gold" />}
              </li>
            );
          })}
        </ul>
      </Window>

    </>
  );
}
