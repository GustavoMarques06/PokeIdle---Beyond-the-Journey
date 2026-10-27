import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BALANCE } from '../game-data';
import { activePokemon, type GameEvent } from '../core/game';
import { BACKUP_KEY, SAVE_KEY, memoryStorage, saveGame } from '../core/save';
import { newGame } from '../core/game';
import { GameEngine } from './GameEngine';

const T0 = Date.UTC(2026, 9, 26, 12);

function setup() {
  const storage = memoryStorage();
  let now = T0;
  const engine = new GameEngine(storage, () => now);
  /** Avança o relógio e os timers juntos, em passos do loop (como o tempo real). */
  const tick = (ms: number) => {
    for (let t = 0; t < ms; t += BALANCE.tickMs) {
      now += BALANCE.tickMs;
      vi.advanceTimersByTime(BALANCE.tickMs);
    }
  };
  return { storage, engine, tick, setNow: (t: number) => (now = t) };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('GameEngine', () => {
  it('sem save, fica na escolha do inicial; novo jogo grava na hora', () => {
    const { engine, storage } = setup();
    engine.load();
    expect(engine.state).toBeNull();
    engine.newGame(7, 'Ash');
    expect(engine.state?.trainerName).toBe('Ash');
    expect(storage.getItem(SAVE_KEY)).not.toBeNull();
    expect(engine.saveBytes).toBeGreaterThan(0);
  });

  it('o loop avança a simulação e notifica os ouvintes', () => {
    const { engine, tick } = setup();
    engine.newGame(4);
    const seen: GameEvent[] = [];
    engine.onEvents((ev) => seen.push(...ev));
    const listener = vi.fn();
    engine.subscribe(listener);
    engine.start();
    tick(60_000);
    expect(listener).toHaveBeenCalled();
    expect(seen.some((e) => e.type === 'enemyFainted')).toBe(true);
    expect(engine.state!.stats.playTimeMs).toBeGreaterThan(50_000);
    engine.stop();
  });

  it('agrupa as gravações de ações seguidas', () => {
    const { engine, storage, tick } = setup();
    engine.newGame(4);
    const setItem = vi.spyOn(storage, 'setItem');
    for (let i = 0; i < 5; i++) engine.dispatch((s) => void (s.coins += 1));
    expect(setItem).not.toHaveBeenCalled();
    tick(500);
    // Uma gravação = backup + save principal.
    expect(setItem.mock.calls.filter(([k]) => k === SAVE_KEY)).toHaveLength(1);
    expect(JSON.parse(storage.getItem(SAVE_KEY)!).state.coins).toBe(5);
  });

  it('save() imediato cancela a gravação agendada', () => {
    const { engine, storage, tick } = setup();
    engine.newGame(4);
    engine.dispatch((s) => void (s.coins = 42));
    engine.save();
    const setItem = vi.spyOn(storage, 'setItem');
    tick(1000);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('ao carregar, aplica o progresso offline e gera o relatório', () => {
    const { engine, storage, setNow } = setup();
    const s = newGame(7, T0, 3);
    saveGame(storage, s, T0);
    setNow(T0 + 2 * 3_600_000);
    engine.load();
    expect(engine.offlineReport?.countedMs).toBe(2 * 3_600_000);
    expect(engine.offlineReport!.kills).toBeGreaterThan(0);
    expect(activePokemon(engine.state!).exp).toBeGreaterThan(s.collection[0].exp);
  });

  it('save corrompido: restaura o backup e avisa', () => {
    const { engine, storage } = setup();
    const s = newGame(4, T0, 1);
    saveGame(storage, s, T0);
    storage.setItem(BACKUP_KEY, storage.getItem(SAVE_KEY)!);
    storage.setItem(SAVE_KEY, '{quebrado');
    engine.load();
    expect(engine.state).not.toBeNull();
    expect(engine.notice).toMatch(/backup/);
  });

  it('uma pausa longa do loop (computador dormindo) vira progresso offline', () => {
    const { engine, setNow, tick } = setup();
    engine.newGame(7);
    engine.start();
    tick(1000);
    setNow(T0 + 1000 + 3_600_000);
    vi.advanceTimersByTime(BALANCE.tickMs);
    expect(engine.offlineReport?.countedMs).toBeGreaterThan(3_500_000);
    engine.stop();
  });

  it('relógio que volta para trás não gera progresso', () => {
    const { engine, setNow } = setup();
    engine.newGame(4);
    engine.start();
    const before = engine.state!.stats.playTimeMs;
    setNow(T0 - 3_600_000);
    vi.advanceTimersByTime(BALANCE.tickMs * 5);
    expect(engine.state!.stats.playTimeMs).toBe(before);
    expect(engine.offlineReport).toBeNull();
    engine.stop();
  });
});
