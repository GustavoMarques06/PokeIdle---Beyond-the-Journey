// Jardim de berries: canteiros que crescem em tempo real, colheita e bônus ao comer.

import { useState } from 'react';
import { BALANCE, BERRIES } from '../../../game-data';
import {
  buffValue,
  eatBerry,
  gardenPlots,
  harvest,
  harvestAll,
  plantBerry,
  plotReady,
} from '../../../core/garden';
import type { GameState } from '../../../core/game';
import { Bar, ItemIcon, PixelIcon, Window } from '../../components/common';
import { BUFF_NAMES, formatDuration, formatPercent, itemName } from '../../i18n/pt-BR';
import { useEngine } from '../../useGame';
import { Countdown, Locked } from './shared';

export function GardenPanel({ state }: { state: GameState }) {
  const engine = useEngine();
  const [seed, setSeed] = useState<string | null>(null);
  const plots = gardenPlots(state);
  if (plots === 0) return <Locked routeId={BALANCE.garden.plots[0]} />;
  const now = state.lastTimerAt;
  const owned = BERRIES.filter((b) => (state.items[b.id] ?? 0) > 0);
  const anyReady = state.garden.some((p) => plotReady(p, now));

  return (
    <>
      <Window
        title="JARDIM DE BERRIES"
        icon={<ItemIcon id="berry-pouch" size={24} />}
        frame="dialog"
        actions={
          anyReady && (
            <button
              className="pbtn small primary"
              onClick={() => engine.dispatch((s, t) => void harvestAll(s, t))}
            >
              Colher tudo
            </button>
          )
        }
      >
        <ul className="garden-plots">
          {BALANCE.garden.plots.map((_, i) => {
            if (i >= plots) {
              return (
                <li key={i} className="garden-plot locked">
                  <PixelIcon name="lock" scale={2} />
                </li>
              );
            }
            const p = state.garden[i];
            if (!p) {
              return (
                <li key={i} className="garden-plot empty">
                  <button
                    className="plot-soil"
                    disabled={!seed}
                    onClick={() => seed && engine.dispatch((s, t) => plantBerry(s, i, seed, t))}
                    title={seed ? `Plantar ${itemName(seed)}` : 'Escolha uma berry abaixo'}
                  >
                    {seed ? 'PLANTAR' : 'VAZIO'}
                  </button>
                </li>
              );
            }
            const ready = plotReady(p, now);
            const grow = Math.min(1, (now - p.plantedAt) / (p.readyAt - p.plantedAt));
            const stage = ready ? 3 : grow > 0.6 ? 2 : grow > 0.25 ? 1 : 0;
            return (
              <li key={i} className={`garden-plot stage-${stage} ${ready ? 'ready' : ''}`}>
                <button
                  className="plot-soil"
                  disabled={!ready}
                  onClick={() => engine.dispatch((s, t) => void harvest(s, i, t))}
                  title={ready ? 'Colher' : 'Crescendo…'}
                >
                  {stage >= 2 ? (
                    <ItemIcon id={p.berry} size={stage === 3 ? 30 : 20} />
                  ) : (
                    <span className="sprout" />
                  )}
                </button>
                <small>{itemName(p.berry)}</small>
                <Countdown until={p.readyAt} now={now} done="COLHER!" />
              </li>
            );
          })}
        </ul>
      </Window>

      <Window title="BERRIES" icon={<ItemIcon id="oran-berry" size={24} />}>
        {owned.length === 0 && (
          <p className="hint">Você não tem berries. Compre no Poké Mart ou ganhe em expedições.</p>
        )}
        <ul className="berry-list">
          {owned.map((b) => (
            <li key={b.id} className={`berry-row ${seed === b.id ? 'selected' : ''}`}>
              <ItemIcon id={b.id} size={28} />
              <div>
                <strong>
                  {itemName(b.id).toUpperCase()} ×{state.items[b.id]}
                </strong>
                <small>
                  Cresce em {formatDuration(b.growMinutes * 60_000)} · rende {b.yield[0]}–{b.yield[1]} ·
                  comer: {BUFF_NAMES[b.buff.kind]}{' '}
                  {b.buff.kind === 'shiny' ? '×2' : `+${formatPercent(b.buff.value)}`} por {b.buff.minutes}{' '}
                  min
                </small>
              </div>
              <button className="pbtn small" onClick={() => setSeed(seed === b.id ? null : b.id)}>
                {seed === b.id ? 'Cancelar' : 'Plantar'}
              </button>
              <button className="pbtn small" onClick={() => engine.dispatch((s) => eatBerry(s, b.id))}>
                Comer
              </button>
            </li>
          ))}
        </ul>
      </Window>

      <ActiveBuffs state={state} />
    </>
  );
}

export function ActiveBuffs({ state }: { state: GameState }) {
  const active = Object.entries(state.buffs).filter(([, b]) => b && b.ms > 0);
  if (!active.length) return null;
  const max = BALANCE.garden.maxBuffMinutes * 60_000;
  return (
    <Window title="BÔNUS ATIVOS" frame="dialog">
      <ul className="bonus-list">
        {active.map(([kind, b]) => (
          <li key={kind}>
            <span>
              {BUFF_NAMES[kind]}{' '}
              {kind === 'shiny' ? '×2' : `+${formatPercent(buffValue(state, kind as never))}`}
            </span>
            <Bar value={b!.ms} max={max} tone="gold" />
            <strong>{formatDuration(b!.ms)}</strong>
          </li>
        ))}
      </ul>
      <p className="hint">Os bônus de berries só correm enquanto o jogo simula batalhas.</p>
    </Window>
  );
}
