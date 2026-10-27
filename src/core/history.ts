// Histórico dos totais (vitórias, EXP, moedas, capturas) para o painel de estatísticas.

import { BALANCE } from '../game-data';
import type { GameState, HistorySample } from './state';

/** Guarda os totais a cada `sampleMinutes` para o painel de estatísticas. */
export function sampleHistory(state: GameState, now: number): void {
  const h = BALANCE.history;
  const last = state.history.at(-1);
  if (last && now < last.at)
    state.history = []; // relógio voltou: recomeça o histórico.
  else if (last && now - last.at < h.sampleMinutes * 60_000) return;
  const s = state.stats;
  state.history.push({
    at: now,
    kills: s.totalKills,
    exp: s.expEarned,
    coins: s.coinsEarned,
    captures: s.totalCaptures,
  });
  if (state.history.length > h.maxSamples) state.history.splice(0, state.history.length - h.maxSamples);
}

export type HistoryMetric = 'exp' | 'coins' | 'kills' | 'captures';

export interface HistoryInterval {
  from: number;
  to: number;
  /** Quanto o total cresceu no intervalo. */
  delta: Record<HistoryMetric, number>;
}

/** Intervalos entre amostras seguidas, mais o trecho da última amostra até agora. */
export function historyIntervals(history: HistorySample[], current: HistorySample): HistoryInterval[] {
  const points = [...history];
  const last = points.at(-1);
  if (last && current.at > last.at) points.push(current);
  const out: HistoryInterval[] = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    out.push({
      from: a.at,
      to: b.at,
      delta: {
        exp: Math.max(0, b.exp - a.exp),
        coins: Math.max(0, b.coins - a.coins),
        kills: Math.max(0, b.kills - a.kills),
        captures: Math.max(0, b.captures - a.captures),
      },
    });
  }
  return out;
}

/** Média por hora de uma métrica nas últimas `hours` horas (null se não há dados). */
export function ratePerHour(
  intervals: HistoryInterval[],
  metric: HistoryMetric,
  now: number,
  hours: number,
): number | null {
  const since = now - hours * 3_600_000;
  const recent = intervals.filter((iv) => iv.to > since);
  const ms = recent.reduce((sum, iv) => sum + (iv.to - Math.max(iv.from, since)), 0);
  if (ms < 60_000) return null;
  const total = recent.reduce(
    (sum, iv) => sum + iv.delta[metric] * ((iv.to - Math.max(iv.from, since)) / (iv.to - iv.from)),
    0,
  );
  return (total / ms) * 3_600_000;
}

/** Amostra com os totais atuais (o "agora" do gráfico). */
export function currentSample(state: GameState, now: number): HistorySample {
  const s = state.stats;
  return { at: now, kills: s.totalKills, exp: s.expEarned, coins: s.coinsEarned, captures: s.totalCaptures };
}
