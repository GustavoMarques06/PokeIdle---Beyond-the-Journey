import { describe, expect, it } from 'vitest';
import { BALANCE } from '../game-data';
import { activePokemon, newGame } from './game';
import { applyOffline, offlineWindow } from './offline';

const HOUR = 3_600_000;
const T0 = 1_700_000_000_000;

describe('offlineWindow', () => {
  it('conta o tempo decorrido', () => {
    const w = offlineWindow(T0, T0 + HOUR);
    expect(w).toMatchObject({ elapsedMs: HOUR, countedMs: HOUR, clockIssue: 'none', capped: false });
  });

  it('aplica o limite máximo de horas', () => {
    const w = offlineWindow(T0, T0 + 100 * HOUR);
    expect(w.countedMs).toBe(BALANCE.offline.maxHours * HOUR);
    expect(w.capped).toBe(true);
  });

  it('ignora intervalos curtos', () => {
    expect(offlineWindow(T0, T0 + 10_000).countedMs).toBe(0);
  });

  it('relógio voltando no tempo não concede nada', () => {
    const w = offlineWindow(T0, T0 - 2 * HOUR);
    expect(w.countedMs).toBe(0);
    expect(w.clockIssue).toBe('backwards');
  });

  it('pequeno recuo de relógio é tolerado sem alerta', () => {
    expect(offlineWindow(T0, T0 - 1000).clockIssue).toBe('none');
  });

  it('horários inválidos não concedem nada', () => {
    expect(offlineWindow(NaN, T0).clockIssue).toBe('invalid');
    expect(offlineWindow(0, T0).countedMs).toBe(0);
  });
});

describe('applyOffline', () => {
  it('concede EXP, moedas e vitórias coerentes', () => {
    const s = newGame(7, T0, 1);
    const level = activePokemon(s).level;
    const report = applyOffline(s, offlineWindow(T0, T0 + HOUR));
    expect(report.kills).toBeGreaterThan(0);
    expect(report.coins).toBe(s.coins);
    expect(activePokemon(s).level).toBeGreaterThan(level);
    expect(s.routes['rota-1'].kills).toBe(report.kills);
    expect(report.levelUps[0]).toMatchObject({ from: level, to: activePokemon(s).level });
  });

  it('é determinístico e monotônico no tempo', () => {
    const a = newGame(4, T0, 1);
    const b = newGame(4, T0, 1);
    const c = newGame(4, T0, 1);
    const ra = applyOffline(a, offlineWindow(T0, T0 + HOUR));
    const rb = applyOffline(b, offlineWindow(T0, T0 + HOUR));
    const rc = applyOffline(c, offlineWindow(T0, T0 + 4 * HOUR));
    expect(ra).toEqual(rb);
    expect(rc.kills).toBeGreaterThan(ra.kills);
  });

  it('não concede nada quando o tempo contabilizado é zero', () => {
    const s = newGame(1, T0, 1);
    const report = applyOffline(s, offlineWindow(T0, T0 - 10 * HOUR));
    expect(report.kills).toBe(0);
    expect(s.coins).toBe(0);
  });

  it('não concede vitórias se o Pokémon ativo não consegue vencer na rota', () => {
    const s = newGame(1, T0, 1);
    s.routes['rota-24-25'].unlocked = true;
    s.currentRouteId = 'rota-24-25';
    activePokemon(s).level = 2;
    const report = applyOffline(s, offlineWindow(T0, T0 + HOUR));
    expect(report.kills).toBe(0);
  });

  it('rende menos que o jogo ativo', () => {
    // Eficiência offline < 1 por definição.
    expect(BALANCE.offline.efficiency).toBeLessThan(1);
  });
});
