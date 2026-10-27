// Painel de estatísticas: ritmo por hora (última hora e 24 h) e um gráfico do ritmo ao
// longo do dia. Cada barra cobre o intervalo entre duas amostras; a altura é a média por
// hora naquele trecho (um retorno do offline vira uma barra larga e baixa, não um pico).

import { useState } from 'react';
import { BALANCE } from '../../game-data';
import type { GameState } from '../../core/game';
import { currentSample, historyIntervals, ratePerHour, type HistoryMetric } from '../../core/history';
import { formatNumber } from '../i18n/pt-BR';
import { PixelIcon, Window } from './common';

const METRICS: { id: HistoryMetric; label: string; unit: string; color: string }[] = [
  { id: 'exp', label: 'EXP', unit: 'EXP/h', color: 'var(--exp-dark)' },
  { id: 'coins', label: 'Moedas', unit: 'moedas/h', color: 'var(--gold-dark)' },
  { id: 'kills', label: 'Vitórias', unit: 'vitórias/h', color: 'var(--grass-dark)' },
  { id: 'captures', label: 'Capturas', unit: 'capturas/h', color: 'var(--red-dark)' },
];

const W = 320;
const H = 96;
const DAY_MS = 24 * 3_600_000;

const clock = (t: number) => new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function StatsPanel({ state }: { state: GameState }) {
  const [metric, setMetric] = useState<HistoryMetric>('exp');
  const [hover, setHover] = useState<number | null>(null);
  const now = state.lastTimerAt;
  const intervals = historyIntervals(state.history, currentSample(state, now));
  const m = METRICS.find((x) => x.id === metric)!;

  const start = now - DAY_MS;
  const bars = intervals
    .filter((iv) => iv.to > start)
    .map((iv) => ({ ...iv, rate: (iv.delta[metric] / (iv.to - iv.from)) * 3_600_000 }));
  const max = Math.max(1, ...bars.map((b) => b.rate));
  const x = (t: number) => ((Math.max(t, start) - start) / DAY_MS) * W;
  const shown = hover !== null ? bars[hover] : null;
  const covered = bars.reduce((sum, b) => sum + (b.to - Math.max(b.from, start)), 0);
  const enough = covered >= BALANCE.history.sampleMinutes * 60_000;

  return (
    <Window title="ESTATÍSTICAS" icon={<PixelIcon name="trophy" scale={2} />} className="stats-panel">
      <div className="stat-tiles">
        {METRICS.map((x) => {
          const hour = ratePerHour(intervals, x.id, now, 1);
          const day = ratePerHour(intervals, x.id, now, 24);
          return (
            <button
              key={x.id}
              className={`stat-tile ${metric === x.id ? 'on' : ''}`}
              onClick={() => setMetric(x.id)}
              aria-pressed={metric === x.id}
            >
              <small>{x.label} por hora</small>
              <strong>{hour === null ? '—' : formatNumber(hour)}</strong>
              <small>24 h: {day === null ? '—' : formatNumber(day)}</small>
            </button>
          );
        })}
      </div>

      {!enough ? (
        <p className="hint">
          O histórico é registrado a cada 15 minutos de jogo. Volte daqui a pouco para ver o gráfico.
        </p>
      ) : (
        <>
          <p className="stats-readout" aria-live="polite">
            {shown
              ? `${clock(shown.from)}–${clock(shown.to)} · ${formatNumber(shown.rate)} ${m.unit}`
              : `Ritmo de ${m.label} nas últimas 24 h · máximo ${formatNumber(max)} ${m.unit}`}
          </p>
          <svg
            className="stats-chart"
            viewBox={`0 0 ${W} ${H + 14}`}
            role="img"
            aria-label={`Gráfico de ${m.unit} nas últimas 24 horas`}
            onMouseLeave={() => setHover(null)}
          >
            <line x1={0} x2={W} y1={H} y2={H} className="stats-axis" />
            {bars.map((b, i) => {
              const x0 = x(b.from);
              const w = Math.max(2, x(b.to) - x0 - 2);
              const h = b.rate > 0 ? Math.max(2, (b.rate / max) * (H - 4)) : 0;
              return (
                <g key={b.from} onMouseEnter={() => setHover(i)}>
                  {/* Área de toque maior que a barra. */}
                  <rect x={x0} y={0} width={w + 2} height={H} fill="transparent" />
                  {h > 0 && (
                    <path
                      d={roundedTop(x0, H - h, w, h, Math.min(4, w / 2, h))}
                      fill={m.color}
                      opacity={hover === null || hover === i ? 1 : 0.45}
                    />
                  )}
                </g>
              );
            })}
            <text x={0} y={H + 11} className="stats-tick">
              −24 h
            </text>
            <text x={W / 2} y={H + 11} className="stats-tick" textAnchor="middle">
              −12 h
            </text>
            <text x={W} y={H + 11} className="stats-tick" textAnchor="end">
              agora
            </text>
          </svg>
        </>
      )}
    </Window>
  );
}

/** Barra com os cantos de cima arredondados e a base reta no eixo. */
function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
