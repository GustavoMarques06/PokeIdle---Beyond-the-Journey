// Game Corner de Celadon: letreiro de neon, caça-níquel com alavanca (os rolos param um a um, aposta ×1/×2/×5,
// festa de JACKPOT com fichas chovendo), Voltorb Flip (tabuleiro 5×5 com pistas, marcações e explosão), fichas no
// chão uma vez por dia e o balcão de prêmios com o prêmio da semana em promoção.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { BALANCE, PRIZES, SLOT_BET, SLOT_SINGLE_CHERRY, SLOT_SYMBOLS } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import {
  SLOT_MULTS,
  buyPrize,
  buyTokens,
  prizePrice,
  spinSlots,
  type SpinResult,
} from '../../../core/gamecorner';
import type { GameEvent, GameState } from '../../../core/game';
import {
  VF_CAP,
  VF_ENTRY,
  VF_MAX_LEVEL,
  VF_SIZE,
  cashOutVoltorb,
  closeVoltorb,
  cornerState,
  flipCard,
  floorAvailable,
  searchFloor,
  startVoltorb,
  voltorbHints,
  weeklyPrize,
} from '../../../core/voltorb';
import { audio } from '../../audio';
import { ItemIcon, PokemonSprite, Window } from '../../components/common';
import { formatNumber, itemName, moveName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked } from './shared';

const VOLTORB = 100;

function SlotIcon({ id }: { id: string }) {
  const sym = SLOT_SYMBOLS.find((s) => s.id === id)!;
  return sym.icon.speciesId ? (
    <PokemonSprite speciesId={sym.icon.speciesId} kind="icon" />
  ) : (
    <ItemIcon id={sym.icon.item!} size={30} />
  );
}

// --- Caça-níquel ---------------------------------------------------------------------------

function SlotMachine({ state }: { state: GameState }) {
  const engine = useEngine();
  const [spin, setSpin] = useState<(SpinResult & { id: number; mult: number }) | null>(null);
  const [stopped, setStopped] = useState(3);
  const [mult, setMult] = useState<number>(1);
  const [pull, setPull] = useState(0);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const g = BALANCE.gameCorner;
  const bet = SLOT_BET * mult;
  const rolling = stopped < 3;
  const fast = state.settings.reducedMotion;

  const play = () => {
    if (rolling || state.tokens < bet) return;
    let r: SpinResult | null = null;
    engine.dispatch((s) => {
      const events: GameEvent[] = [];
      r = spinSlots(s, events, mult);
      return events;
    });
    if (!r) return;
    const result = r as SpinResult;
    audio.sfx('throw');
    setPull((p) => p + 1);
    setSpin({ ...result, id: Date.now(), mult });
    setStopped(0);
    [0, 1, 2].forEach((i) =>
      timers.current.push(
        window.setTimeout(
          () => {
            setStopped(i + 1);
            audio.sfx('click');
            if (i === 2) {
              if (result.payout >= 250 * mult) audio.sfx('fanfare');
              else if (result.payout > 0) audio.sfx('coin');
            }
          },
          fast ? 0 : 550 + i * 380,
        ),
      ),
    );
  };

  const done = spin && !rolling;
  const jackpot = done && spin.payout >= 250 * spin.mult;
  const win = done && spin.payout > 0;
  return (
    <div className={`gc-cabinet ${rolling ? 'rolling' : ''} ${win ? 'win' : ''} ${jackpot ? 'jackpot' : ''}`}>
      <span className="gc-bulbs" aria-hidden />
      <div className="gc-screen">
        <div className="gc-reels">
          {[0, 1, 2].map((i) => {
            const moving = spin && i >= stopped;
            return (
              <span key={i} className={`gc-reel ${moving ? 'moving' : ''}`}>
                {moving ? (
                  <span
                    className="gc-strip"
                    style={{ animationDuration: `${0.32 + i * 0.05}s` } as CSSProperties}
                  >
                    {[...SLOT_SYMBOLS, ...SLOT_SYMBOLS].map((s, k) => (
                      <SlotIcon key={k} id={s.id} />
                    ))}
                  </span>
                ) : (
                  <span key={`${spin?.id}-${i}`} className="gc-face">
                    <SlotIcon id={spin ? spin.reels[i] : SLOT_SYMBOLS[(i * 2) % SLOT_SYMBOLS.length].id} />
                  </span>
                )}
              </span>
            );
          })}
          <span className="gc-line" aria-hidden />
        </div>
        <p className="gc-result" aria-live="polite">
          {rolling
            ? 'Girando…'
            : spin
              ? spin.payout > 0
                ? `+${formatNumber(spin.payout)} fichas!`
                : 'Não foi dessa vez.'
              : `Aposta: ${bet} fichas`}
        </p>
      </div>
      <button
        className="gc-lever"
        onClick={play}
        disabled={rolling || state.tokens < bet}
        aria-label={`Puxar a alavanca (${bet} fichas)`}
        title="Puxar a alavanca"
      >
        <span key={pull} className={pull ? 'pulled' : ''} />
      </button>
      <div className="gc-controls">
        <span className="gc-bets" role="group" aria-label="Aposta">
          {SLOT_MULTS.map((m) => (
            <button
              key={m}
              className={`gc-bet ${mult === m ? 'on' : ''}`}
              onClick={() => setMult(m)}
              disabled={rolling}
            >
              ×{m}
            </button>
          ))}
        </span>
        <button className="pbtn primary" disabled={state.tokens < bet || rolling} onClick={play}>
          GIRAR ({bet})
        </button>
        <button
          className="pbtn"
          disabled={state.coins < g.packPrice}
          onClick={() => engine.dispatch((s) => buyTokens(s, 1))}
        >
          +{g.tokensPerPack} fichas (₽{formatNumber(g.packPrice)})
        </button>
      </div>
      {jackpot && (
        <span key={spin.id} className="gc-jackpot" aria-hidden>
          <b>JACKPOT!</b>
          {Array.from({ length: 18 }, (_, k) => (
            <i key={k} style={{ '--k': k } as CSSProperties}>
              <ItemIcon id="coin-case" size={18} />
            </i>
          ))}
        </span>
      )}
    </div>
  );
}

// --- Voltorb Flip --------------------------------------------------------------------------

const LINE_COLORS = ['#e85858', '#58b058', '#e8a030', '#4880e0', '#b060d0'];

function VoltorbFlip({ state }: { state: GameState }) {
  const engine = useEngine();
  const c = cornerState(state);
  const r = c.round;
  const [memo, setMemo] = useState<number | null>(null);
  const [marks, setMarks] = useState<Record<number, number[]>>({});
  const [boom, setBoom] = useState<number | null>(null);
  const hints = r ? voltorbHints(r.board) : null;

  const start = () => {
    audio.sfx('click');
    setMarks({});
    setBoom(null);
    engine.dispatch((s) => void startVoltorb(s));
  };
  const flip = (i: number) => {
    if (!r || r.over || r.flipped[i]) return;
    if (memo !== null) {
      setMarks((m) => {
        const cur = m[i] ?? [];
        return { ...m, [i]: cur.includes(memo) ? cur.filter((x) => x !== memo) : [...cur, memo] };
      });
      return;
    }
    let v: number | null = null;
    engine.dispatch((s) => {
      v = flipCard(s, i);
    });
    if (v === 0) {
      setBoom(i);
      audio.sfx('super');
    } else if (v !== null) {
      audio.sfx(v > 1 ? 'coin' : 'cursor');
      if (cornerState(state).round?.over === 'won') audio.sfx('fanfare');
    }
  };

  return (
    <Window
      title={`VOLTORB FLIP · NÍVEL ${c.level}`}
      icon={<PokemonSprite speciesId={VOLTORB} kind="icon" />}
      actions={
        <small className="vf-best">
          recorde {formatNumber(c.best)} · {c.wins} vitórias
        </small>
      }
    >
      {!r ? (
        <div className="vf-intro">
          <p>
            Vire as cartas para multiplicar as fichas: 1, 2 ou 3… ou um Voltorb, que explode e leva tudo da
            rodada. As pistas dizem a soma e quantos Voltorbs há em cada linha e coluna. Vire todos os 2 e 3
            para vencer e subir de nível (até {VF_MAX_LEVEL}).
          </p>
          <button className="pbtn primary" disabled={state.tokens < VF_ENTRY} onClick={start}>
            Jogar nível {c.level} ({VF_ENTRY} fichas)
          </button>
        </div>
      ) : (
        <>
          <div className="vf-top">
            <span className="vf-coins">
              RODADA <b key={r.coins}>{formatNumber(r.coins)}</b>
            </span>
            <span className="vf-memo" role="group" aria-label="Marcar cartas">
              <small>MEMO</small>
              {[0, 1, 2, 3].map((m) => (
                <button
                  key={m}
                  className={`vf-memo-btn ${memo === m ? 'on' : ''}`}
                  onClick={() => setMemo(memo === m ? null : m)}
                  title={m ? `Marcar ${m}` : 'Marcar Voltorb'}
                >
                  {m || <PokemonSprite speciesId={VOLTORB} kind="icon" />}
                </button>
              ))}
            </span>
          </div>
          <div className={`vf-board ${r.over ? `over ${r.over}` : ''}`}>
            {r.board.map((v, i) => {
              const x = i % VF_SIZE;
              const y = Math.floor(i / VF_SIZE);
              const open = r.flipped[i];
              return (
                <button
                  key={i}
                  className={`vf-card ${open ? 'open' : ''} ${open && v === 0 ? 'bomb' : ''}`}
                  style={
                    {
                      '--row': LINE_COLORS[y],
                      '--col': LINE_COLORS[x],
                      gridRow: y + 1,
                      gridColumn: x + 1,
                    } as CSSProperties
                  }
                  onClick={() => flip(i)}
                  aria-label={
                    open ? (v ? `carta ${v}` : 'Voltorb') : `carta virada, linha ${y + 1}, coluna ${x + 1}`
                  }
                >
                  <span className="vf-back">
                    {(marks[i] ?? []).map((m) => (
                      <i key={m} className={`vf-mark m${m}`}>
                        {m || '•'}
                      </i>
                    ))}
                  </span>
                  <span className="vf-front">
                    {v === 0 ? <PokemonSprite speciesId={VOLTORB} kind="icon" /> : v}
                  </span>
                  {boom === i && <span className="vf-boom" aria-hidden />}
                </button>
              );
            })}
            {hints!.rows.map(([sum, bombs], y) => (
              <span
                key={`r${y}`}
                className="vf-hint"
                style={{ gridRow: y + 1, gridColumn: VF_SIZE + 1, '--c': LINE_COLORS[y] } as CSSProperties}
              >
                <b>{String(sum).padStart(2, '0')}</b>
                <small>
                  <PokemonSprite speciesId={VOLTORB} kind="icon" /> {bombs}
                </small>
              </span>
            ))}
            {hints!.cols.map(([sum, bombs], x) => (
              <span
                key={`c${x}`}
                className="vf-hint"
                style={{ gridRow: VF_SIZE + 1, gridColumn: x + 1, '--c': LINE_COLORS[x] } as CSSProperties}
              >
                <b>{String(sum).padStart(2, '0')}</b>
                <small>
                  <PokemonSprite speciesId={VOLTORB} kind="icon" /> {bombs}
                </small>
              </span>
            ))}
          </div>
          {r.over ? (
            <div className={`vf-end ${r.over}`}>
              <strong>
                {r.over === 'won'
                  ? `Você levou ${formatNumber(r.coins)} fichas!`
                  : 'BUM! O Voltorb explodiu…'}
              </strong>
              <small>Próximo: nível {c.level}</small>
              <button
                className="pbtn primary"
                onClick={() => {
                  engine.dispatch((s) => closeVoltorb(s));
                  setMarks({});
                  setBoom(null);
                }}
              >
                Continuar
              </button>
            </div>
          ) : (
            <div className="vf-foot">
              <small>
                {memo !== null
                  ? 'Modo memo: toque nas cartas para marcar.'
                  : `Máximo por rodada: ${formatNumber(VF_CAP)} fichas.`}
              </small>
              <button
                className="pbtn small"
                disabled={!r.coins}
                onClick={() => engine.dispatch((s) => void cashOutVoltorb(s))}
              >
                Parar e levar {formatNumber(r.coins)}
              </button>
            </div>
          )}
        </>
      )}
    </Window>
  );
}

// --- Painel --------------------------------------------------------------------------------

export function GameCornerPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [found, setFound] = useState<number | null>(null);
  if (!activityUnlocked(state, 'gamecorner')) return <Locked routeId={BALANCE.gameCorner.unlock} />;
  const now = state.lastTimerAt;
  const weekly = weeklyPrize(now);

  return (
    <>
      <div className="gc-marquee" aria-hidden>
        <span>GAME CORNER</span>
        <small>CELADON CITY</small>
      </div>
      <Window
        title="CAÇA-NÍQUEL"
        icon={<ItemIcon id="coin-case" size={24} />}
        frame="dialog"
        actions={<strong className="tokens gc-tokens">{formatNumber(state.tokens)} FICHAS</strong>}
      >
        <SlotMachine state={state} />
        <div className="gc-floor">
          {floorAvailable(state, now) ? (
            <button
              className="pbtn small"
              onClick={() => {
                let n = 0;
                engine.dispatch((s, t) => {
                  n = searchFloor(s, t);
                });
                if (n) {
                  audio.sfx('itemGet');
                  setFound(n);
                }
              }}
            >
              🔍 Procurar fichas no chão
            </button>
          ) : (
            <small>
              {found ? `Você achou ${found} fichas no chão!` : 'Hoje você já procurou fichas no chão.'}
            </small>
          )}
        </div>
        <ul className="slot-table">
          {SLOT_SYMBOLS.map((sym) => (
            <li key={sym.id}>
              <SlotIcon id={sym.id} />
              <SlotIcon id={sym.id} />
              <SlotIcon id={sym.id} /> <strong>{sym.three}</strong>
              <span className="hint">dois primeiros: {sym.two}</span>
            </li>
          ))}
          <li>
            <SlotIcon id="cherry" /> <span className="hint">uma cereja no 1º rolo: {SLOT_SINGLE_CHERRY}</span>
          </li>
        </ul>
        <p className="hint">Prêmios multiplicados pela aposta (×1, ×2 ou ×5).</p>
      </Window>

      <VoltorbFlip state={state} />

      <Window title="BALCÃO DE PRÊMIOS" icon={<ItemIcon id="star-piece" size={24} />}>
        <ul className="shop-list">
          {PRIZES.map((p, i) => {
            const owned = p.kind === 'tm' && state.tms.includes(p.move);
            const price = prizePrice(i, now);
            const sale = weekly.index === i;
            return (
              <li key={i} className={`shop-row ${sale ? 'gc-sale' : ''}`}>
                {p.kind === 'pokemon' ? (
                  <PokemonSprite speciesId={p.speciesId} kind="icon" />
                ) : (
                  <ItemIcon id={p.kind === 'tm' ? 'tm' : p.item} size={28} />
                )}
                <span className="item-name">
                  {p.kind === 'pokemon'
                    ? `${speciesName(p.speciesId).toUpperCase()} Nv${p.level}`
                    : p.kind === 'tm'
                      ? `TM ${moveName(p.move).toUpperCase()}`
                      : `${itemName(p.item).toUpperCase()} ×${p.qty}`}
                  {sale && <span className="gc-sale-tag">PROMOÇÃO DA SEMANA −30%</span>}
                </span>
                <button
                  className="pbtn small"
                  disabled={owned || state.tokens < price}
                  onClick={() => {
                    audio.sfx('itemGet');
                    engine.dispatch((s, t) => buyPrize(s, i, t));
                  }}
                >
                  {owned ? (
                    'Já tem'
                  ) : sale ? (
                    <>
                      <s>{formatNumber(p.tokens)}</s> {formatNumber(price)} F
                    </>
                  ) : (
                    `${formatNumber(price)} F`
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Window>
    </>
  );
}
