// Game Corner: fichas, caça-níqueis de três rolos e balcão de prêmios.

import { useEffect, useState } from 'react';
import { BALANCE, PRIZES, SLOT_BET, SLOT_SINGLE_CHERRY, SLOT_SYMBOLS } from '../../../game-data';
import { activityUnlocked } from '../../../core/collection';
import { buyPrize, buyTokens, spinSlots, type SpinResult } from '../../../core/gamecorner';
import type { GameState } from '../../../core/game';
import { ItemIcon, PokemonSprite, Window } from '../../components/common';
import { formatNumber, itemName, moveName, speciesName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Locked } from './shared';

function SlotIcon({ id }: { id: string }) {
  const sym = SLOT_SYMBOLS.find((s) => s.id === id)!;
  return sym.icon.speciesId ? (
    <PokemonSprite speciesId={sym.icon.speciesId} kind="icon" />
  ) : (
    <ItemIcon id={sym.icon.item!} size={30} />
  );
}

export function GameCornerPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [spin, setSpin] = useState<(SpinResult & { id: number }) | null>(null);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    if (!rolling) return;
    const t = setTimeout(() => setRolling(false), state.settings.reducedMotion ? 0 : 600);
    return () => clearTimeout(t);
  }, [rolling, spin, state.settings.reducedMotion]);
  if (!activityUnlocked(state, 'gamecorner')) return <Locked routeId={BALANCE.gameCorner.unlock} />;
  const g = BALANCE.gameCorner;

  const play = () =>
    engine.dispatch((s) => {
      const events: never[] = [];
      const r = spinSlots(s, events);
      if (r) {
        setSpin({ ...r, id: Date.now() });
        setRolling(true);
      }
      return events;
    });

  return (
    <>
      <Window
        title="GAME CORNER DE CELADON"
        icon={<ItemIcon id="coin-case" size={24} />}
        frame="dialog"
        actions={<strong className="tokens">{formatNumber(state.tokens)} FICHAS</strong>}
      >
        <div className={`slot-machine ${rolling ? 'rolling' : ''}`}>
          <div className="slot-reels">
            {[0, 1, 2].map((i) => (
              <span key={i} className="slot-reel frame frame-slot">
                {spin && !rolling ? (
                  <SlotIcon id={spin.reels[i]} />
                ) : (
                  <SlotIcon id={SLOT_SYMBOLS[(i * 2) % SLOT_SYMBOLS.length].id} />
                )}
              </span>
            ))}
          </div>
          <p className="slot-result">
            {rolling
              ? 'Girando…'
              : spin
                ? spin.payout > 0
                  ? `Você ganhou ${spin.payout} fichas!`
                  : 'Não foi dessa vez.'
                : 'Aposta: ' + SLOT_BET + ' fichas'}
          </p>
          <div className="slot-actions">
            <button className="pbtn primary" disabled={state.tokens < SLOT_BET || rolling} onClick={play}>
              Girar ({SLOT_BET})
            </button>
            <button
              className="pbtn"
              disabled={state.coins < g.packPrice}
              onClick={() => engine.dispatch((s) => buyTokens(s, 1))}
            >
              +{g.tokensPerPack} fichas (₽{formatNumber(g.packPrice)})
            </button>
          </div>
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
      </Window>

      <Window title="BALCÃO DE PRÊMIOS" icon={<ItemIcon id="star-piece" size={24} />}>
        <ul className="shop-list">
          {PRIZES.map((p, i) => {
            const owned = p.kind === 'tm' && state.tms.includes(p.move);
            return (
              <li key={i} className="shop-row">
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
                </span>
                <button
                  className="pbtn small"
                  disabled={owned || state.tokens < p.tokens}
                  onClick={() => engine.dispatch((s, t) => buyPrize(s, i, t))}
                >
                  {owned ? 'Já tem' : `${formatNumber(p.tokens)} F`}
                </button>
              </li>
            );
          })}
        </ul>
      </Window>
    </>
  );
}
