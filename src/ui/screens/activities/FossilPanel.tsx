// Laboratório de fósseis (Ilha Cinnabar): a máquina de reviver (tubo de vidro com a silhueta tomando forma, bolhas e
// luzes; pronta, a cápsula abre com clarão), a Escavação (parede de rocha com tesouros: picareta e martelo, a parede
// treme e desaba), o Museu de Fósseis (pedestais com o que você já reviveu) e os fósseis que você tem.

import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { BALANCE, FOSSILS, formSet } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import { formsCaught } from '../../../core/forms';
import {
  UNOWN_ID,
  UNOWN_TABLET,
  UNOWN_WORD_COINS,
  claimUnownWord,
  unownWordStatus,
} from '../../../core/unown';
import {
  DIG_COST,
  DIG_H,
  DIG_W,
  FREE_DIGS,
  digHit,
  digState,
  finishDig,
  freeDigsLeft,
  hitArea,
  startDig,
  treasureUncovered,
  type DigTool,
} from '../../../core/dig';
import { claimFossil, startRevive } from '../../../core/fossils';
import type { GameEvent, GameState } from '../../../core/game';
import { audio } from '../../audio';
import { ItemIcon, Money, PokemonSprite, Shiny, Window } from '../../components/common';
import { itemName, speciesName, unownLetter } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked } from './shared';

/** O que o cientista diz enquanto a máquina trabalha. */
function scientistLine(progress: number, ready: boolean, empty: boolean): string {
  if (empty) return 'A máquina está pronta! Traga um fóssil e eu devolvo a vida a ele.';
  if (ready) return 'Funcionou! Abra a cápsula e conheça um Pokémon de milhões de anos!';
  if (progress < 0.3) return 'Estou extraindo o DNA do fóssil… paciência, é delicado.';
  if (progress < 0.7) return 'A forma já está aparecendo no tubo! Olhe só esse contorno!';
  return 'Quase lá! Ele já está se mexendo lá dentro!';
}

function Machine({ state, onOpen }: { state: GameState; onOpen: (i: number) => void }) {
  const now = state.lastTimerAt;
  const run = state.fossils[0];
  const def = run && FOSSILS.find((f) => f.item === run.item);
  const total = def ? def.hours * 3_600_000 : 1;
  const progress = run ? Math.min(1, 1 - (run.readyAt - now) / total) : 0;
  const ready = !!run && now >= run.readyAt;
  return (
    <div className={`fl-lab ${run ? 'working' : 'idle'} ${ready ? 'ready' : ''}`}>
      <div className="fl-machine" style={{ '--p': progress } as CSSProperties}>
        <span className="fl-lights" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        <div className="fl-tube">
          <span className="fl-liquid" aria-hidden />
          <span className="fl-bubbles" aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </span>
          {run && (
            <span className="fl-specimen">
              <PokemonSprite speciesId={run.speciesId} kind="front" silhouette={!ready} pixelScale={1} />
            </span>
          )}
          {!run && <span className="fl-empty">vazio</span>}
        </div>
        <div className="fl-panel">
          <span className="fl-screen">
            {run ? (ready ? 'PRONTO!' : `${Math.floor(progress * 100)}%`) : '---'}
          </span>
          {run && <span className="fl-meter" aria-hidden />}
        </div>
      </div>
      <div className="fl-talk">
        <span className="caretaker-tag">CIENTISTA</span>
        <p>{scientistLine(progress, ready, !run)}</p>
        {run && (
          <p className="fl-status">
            {itemName(run.item)} · <Countdown until={run.readyAt} now={now} done="PRONTO!" />
          </p>
        )}
        {ready && (
          <button className="pbtn primary fl-open" onClick={() => onOpen(0)}>
            Abrir a cápsula!
          </button>
        )}
      </div>
    </div>
  );
}

function Reveal({ speciesId, shiny, onClose }: { speciesId: number; shiny: boolean; onClose: () => void }) {
  return createPortal(
    <div
      className="modal-backdrop fl-reveal"
      role="dialog"
      aria-modal="true"
      aria-label="Fóssil revivido"
      onClick={onClose}
    >
      <div className="fl-reveal-card frame frame-dialog">
        <span className="fl-flash" aria-hidden />
        <span className="fl-rays" aria-hidden />
        <PokemonSprite speciesId={speciesId} kind="front" shiny={shiny} pixelScale={2} />
        <h3>
          {speciesName(speciesId).toUpperCase()} voltou à vida! {shiny && <Shiny />}
        </h3>
        <p>Ele foi para a sua coleção no Nv{BALANCE.fossils.reviveLevel}.</p>
        <button className="pbtn primary" onClick={onClose} autoFocus>
          Que incrível!
        </button>
      </div>
    </div>,
    document.body,
  );
}

function DigSite({ state }: { state: GameState }) {
  const engine = useEngine();
  const now = state.lastTimerAt;
  const d = digState(state);
  const run = d.run;
  const [tool, setTool] = useState<DigTool>('pick');
  const [shake, setShake] = useState(0);
  const [dust, setDust] = useState<{ id: number; x: number; y: number } | null>(null);
  const [result, setResult] = useState<Extract<GameEvent, { type: 'digDone' }> | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const free = freeDigsLeft(state, now);

  // Roda uma ação da escavação e, se ela terminou, mostra o resultado.
  const act = (fn: (s: GameState) => GameEvent[]) => {
    let done: Extract<GameEvent, { type: 'digDone' }> | undefined;
    engine.dispatch((s) => {
      const events = fn(s);
      done = events.find((e): e is Extract<GameEvent, { type: 'digDone' }> => e.type === 'digDone');
      return events;
    });
    if (done) {
      setResult(done);
      audio.sfx(done.items.length || done.unown?.length ? 'fanfare' : 'faint');
    }
  };
  const hit = (x: number, y: number) => {
    audio.sfx(tool === 'pick' ? 'hit' : 'super');
    setShake((s) => s + 1);
    setDust({ id: Date.now(), x, y });
    act((s) => digHit(s, x, y, tool));
  };
  const area = hover
    ? new Set(hitArea(tool, hover.x, hover.y).map((c) => c.y * DIG_W + c.x))
    : new Set<number>();
  const found = Object.entries(d.found).sort((a, b) => b[1] - a[1]);

  return (
    <Window title={`ESCAVAÇÃO · ${d.digs} paredes`} icon={<ItemIcon id="hard-stone" size={24} />}>
      {!run ? (
        <div className="dig-start">
          <p>
            Uma parede de rocha cheia de segredos: fósseis, pedras de evolução, tesouros e, às vezes, uma
            tabuleta das Ruínas de Alph, que vira um Unown de uma letra que falta. Cave com cuidado:
            cada golpe abala a parede e, se ela desabar, só vem o que estiver totalmente descoberto.
          </p>
          <button
            className="pbtn primary"
            disabled={free === 0 && state.coins < DIG_COST}
            onClick={() => {
              audio.sfx('click');
              engine.dispatch((s, t) => void startDig(s, t));
            }}
          >
            {free > 0 ? (
              `Começar a cavar (${free}/${FREE_DIGS} grátis hoje)`
            ) : (
              <>
                Nova parede · <Money value={DIG_COST} />
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          <div className="dig-bar">
            <span className="dig-stab-label">PAREDE</span>
            <span className="dig-stab">
              <i
                style={{ width: `${run.stability}%` }}
                className={run.stability < 30 ? 'low' : run.stability < 60 ? 'mid' : ''}
              />
            </span>
            <span className="dig-tools" role="group" aria-label="Ferramenta">
              <button
                className={`dig-tool ${tool === 'pick' ? 'on' : ''}`}
                onClick={() => setTool('pick')}
                title="Picareta: fundo no centro, abala pouco"
              >
                ⛏ Picareta
              </button>
              <button
                className={`dig-tool ${tool === 'hammer' ? 'on' : ''}`}
                onClick={() => setTool('hammer')}
                title="Martelo: área 3×3, abala mais"
              >
                🔨 Martelo
              </button>
            </span>
          </div>
          <div
            key={shake}
            className={`dig-wall ${run.stability < 30 ? 'cracked' : ''} ${shake ? 'shake' : ''}`}
            style={{ '--w': DIG_W, '--h': DIG_H } as CSSProperties}
            onMouseLeave={() => setHover(null)}
          >
            <div className="dig-treasures" aria-hidden>
              {run.treasures.map((t, i) => (
                <span
                  key={i}
                  className={`dig-treasure ${treasureUncovered(run, t) ? 'free' : ''}`}
                  style={{ gridColumn: `${t.x + 1} / span ${t.w}`, gridRow: `${t.y + 1} / span ${t.h}` }}
                >
                  {t.item === UNOWN_TABLET ? (
                    <span className="dig-tablet" title="Tabuleta das Ruínas de Alph">
                      ?
                    </span>
                  ) : (
                    <ItemIcon id={t.item} size={t.w >= 3 ? 56 : t.w === 2 ? 36 : 22} />
                  )}
                </span>
              ))}
            </div>
            <div className="dig-rocks">
              {run.depth.map((depth, i) => {
                const x = i % DIG_W;
                const y = Math.floor(i / DIG_W);
                return (
                  <button
                    key={i}
                    className={`dig-cell d${depth} ${area.has(i) ? 'aim' : ''}`}
                    onClick={() => hit(x, y)}
                    onMouseEnter={() => setHover({ x, y })}
                    aria-label={`Bloco ${x + 1}, ${y + 1}${depth ? `, profundidade ${depth}` : ', descoberto'}`}
                  />
                );
              })}
            </div>
            {dust && (
              <span
                key={dust.id}
                className="dig-dust"
                style={{
                  left: `${((dust.x + 0.5) / DIG_W) * 100}%`,
                  top: `${((dust.y + 0.5) / DIG_H) * 100}%`,
                }}
                aria-hidden
              >
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            )}
          </div>
          <div className="dig-foot">
            <small>
              {run.treasures.filter((t) => treasureUncovered(run, t)).length}/{run.treasures.length} tesouros
              descobertos · {run.hits} golpes
            </small>
            <button className="pbtn small" onClick={() => act((s) => finishDig(s))}>
              Levar o que achei
            </button>
          </div>
        </>
      )}
      {found.length > 0 && (
        <ul className="dig-found">
          {found.map(([item, n]) => (
            <li key={item} title={`${itemName(item)} ×${n}`}>
              <ItemIcon id={item} size={22} />
              <small>×{n}</small>
            </li>
          ))}
        </ul>
      )}
      {result &&
        createPortal(
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Resultado da escavação"
            onClick={() => setResult(null)}
          >
            <div className="dig-result frame frame-dialog">
              <h3>{result.collapsed ? 'A PAREDE DESABOU!' : 'ESCAVAÇÃO CONCLUÍDA'}</h3>
              {result.items.length || result.unown?.length ? (
                <ul className="dig-result-items">
                  {result.items.map((item, i) => (
                    <li key={i} style={{ '--i': i } as CSSProperties}>
                      <ItemIcon id={item} size={40} />
                      <small>{itemName(item)}</small>
                    </li>
                  ))}
                  {(result.unown ?? []).map((form, i) => (
                    <li key={`u${i}`} style={{ '--i': result.items.length + i } as CSSProperties}>
                      <PokemonSprite speciesId={UNOWN_ID} kind="front" form={form} />
                      <small>Unown {unownLetter(form)}</small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nada inteiro dessa vez… Os tesouros precisam estar totalmente descobertos.</p>
              )}
              {result.missed > 0 && (
                <p className="hint">{result.missed} tesouro(s) ficaram presos na rocha.</p>
              )}
              <button className="pbtn primary" onClick={() => setResult(null)} autoFocus>
                OK
              </button>
            </div>
          </div>,
          document.body,
        )}
    </Window>
  );
}

/**
 * Ruínas de Alph: a palavra da semana em pedras com os Unown (acesas as letras que você já tem) e o alfabeto da
 * coleção. Formar a palavra rende moedas e um Unown de uma letra que falta.
 */
function AlphRuins({ state }: { state: GameState }) {
  const engine = useEngine();
  const now = state.lastTimerAt;
  const status = unownWordStatus(state, now);
  const all = formSet(UNOWN_ID)?.forms ?? [];
  const have = formsCaught(state, UNOWN_ID);
  return (
    <Window
      title={`RUÍNAS DE ALPH · ${have.length}/${all.length} letras`}
      icon={<PokemonSprite speciesId={UNOWN_ID} kind="icon" />}
    >
      <p className="hint">
        Toda semana as ruínas pedem uma palavra. Tenha um Unown de cada letra dela (letra repetida pede Unown
        repetido) para ganhar <Money value={UNOWN_WORD_COINS} /> e um Unown de uma letra que falta. Os seus Unown
        não são gastos. As letras vêm das expedições nas ruínas e das tabuletas da Escavação.
      </p>
      <ol className={`alph-word ${status.ready ? 'ready' : ''}`} aria-label={`Palavra da semana: ${status.word}`}>
        {status.letters.map((l, i) => (
          <li key={i} className={l.have ? 'have' : ''} style={{ '--i': i } as CSSProperties}>
            <PokemonSprite speciesId={UNOWN_ID} kind="front" form={l.letter} silhouette={!l.have} />
            <strong>{unownLetter(l.letter)}</strong>
          </li>
        ))}
      </ol>
      <button
        className="pbtn primary"
        disabled={!status.ready || status.claimed}
        onClick={() => {
          audio.sfx('fanfare');
          engine.dispatch((s, t) => claimUnownWord(s, t));
        }}
      >
        {status.claimed
          ? 'Palavra desta semana já resgatada'
          : status.ready
            ? `Formar ${status.word} e pegar o prêmio`
            : `Faltam ${status.letters.filter((l) => !l.have).length} letra(s)`}
      </button>
      <ul className="alph-letters" aria-label="Letras de Unown na coleção">
        {all.map((f) => (
          <li key={f} className={have.includes(f) ? 'have' : ''} title={`Unown ${unownLetter(f)}`}>
            {unownLetter(f)}
          </li>
        ))}
      </ul>
    </Window>
  );
}

export function FossilPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [reveal, setReveal] = useState<{ speciesId: number; shiny: boolean } | null>(null);
  if (!activityUnlocked(state, 'fossils')) return <Locked routeId={BALANCE.fossils.unlock} />;
  const busy = state.fossils.length >= BALANCE.fossils.slots;
  const museum = state.fossilsRevived ?? {};
  const revivedKinds = FOSSILS.filter((f) => museum[f.speciesId]).length;

  const open = (i: number) => {
    let got = null as { speciesId: number; shiny: boolean } | null;
    engine.dispatch((s, t) => {
      const p = claimFossil(s, i, t);
      if (p) got = { speciesId: p.speciesId, shiny: p.shiny };
    });
    if (got) {
      audio.sfx('evolve');
      setReveal(got);
    }
  };

  return (
    <>
      {reveal && <Reveal speciesId={reveal.speciesId} shiny={reveal.shiny} onClose={() => setReveal(null)} />}
      <Window title="LABORATÓRIO POKéMON" icon={<ItemIcon id="old-amber" size={24} />} frame="dialog">
        <Machine state={state} onOpen={open} />
      </Window>

      <DigSite state={state} />
      <AlphRuins state={state} />

      <Window title="SEUS FÓSSEIS" icon={<ItemIcon id="helix-fossil" size={24} />}>
        <ul className="fossil-list">
          {FOSSILS.map((f) => {
            const qty = state.items[f.item] ?? 0;
            return (
              <li key={f.item} className={qty ? '' : 'missing'}>
                <ItemIcon id={f.item} size={28} />
                <div>
                  <strong>
                    {itemName(f.item).toUpperCase()} ×{qty}
                  </strong>
                  <small>
                    → {state.pokedex[f.speciesId]?.caught ? speciesName(f.speciesId) : '???'} · {f.hours} h
                  </small>
                </div>
                <button
                  className="pbtn small"
                  disabled={!qty || busy}
                  onClick={() => {
                    audio.sfx('item');
                    engine.dispatch((s, t) => startRevive(s, f.item, t));
                  }}
                >
                  Reviver
                </button>
              </li>
            );
          })}
        </ul>
        <p className="hint">Fósseis aparecem na Escavação, em chefes, nas Ruínas e em outras expedições.</p>
      </Window>

      <Window
        title={`MUSEU DE FÓSSEIS · ${revivedKinds}/${FOSSILS.length}`}
        icon={<ItemIcon id="old-amber" size={24} />}
      >
        <ul className="museum">
          {FOSSILS.map((f) => {
            const n = museum[f.speciesId] ?? 0;
            return (
              <li
                key={f.item}
                className={n ? 'on' : ''}
                title={n ? `${speciesName(f.speciesId)} · revivido ${n}×` : itemName(f.item)}
              >
                <span className="museum-show">
                  {n ? (
                    <PokemonSprite speciesId={f.speciesId} kind="front" pixelScale={1} />
                  ) : (
                    <ItemIcon id={f.item} size={32} />
                  )}
                </span>
                <span className="museum-pedestal" />
                <small>{n ? speciesName(f.speciesId) : '???'}</small>
              </li>
            );
          })}
        </ul>
      </Window>
    </>
  );
}
