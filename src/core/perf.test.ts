// Casos extremos e desempenho: coleção enorme, save grande, muitas horas offline e relógio absurdo.

import { describe, expect, it } from 'vitest';
import { SPECIES } from '../game-data';
import { addToCollection } from './collection';
import { measureTraining, startTraining } from './training';
import { advance, newGame } from './game';
import { applyOffline, offlineWindow } from './offline';
import { evsOf } from './pokemon';
import { parseSave, serialize } from './save';
import { updateTimers } from './timers';

const IVS = { hp: 31, atk: 31, def: 31, spAtk: 31, spDef: 31, spe: 31 };

function bigGame() {
  const s = newGame(4, 0, 7);
  for (let i = 0; i < 1500; i++) {
    const sp = SPECIES[i % SPECIES.length];
    const p = addToCollection(s, sp.id, 1 + (i % 100), { ...IVS }, i % 50 === 0, 0, 'perf');
    p.held = i % 3 === 0 ? 'leftovers' : undefined;
  }
  return s;
}

describe('desempenho e casos extremos', () => {
  it('salvar e carregar 1.500 Pokémon é rápido e fiel', () => {
    const s = bigGame();
    const t0 = performance.now();
    const raw = serialize(s, 1000);
    const parsed = parseSave(raw);
    const ms = performance.now() - t0;
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.file.state.collection).toHaveLength(s.collection.length);
    expect(ms).toBeLessThan(1500);
    expect(raw.length).toBeLessThan(5_000_000);
  });

  it('o progresso offline de 8 h com a coleção grande termina rápido', () => {
    const s = bigGame();
    const t0 = performance.now();
    const report = applyOffline(s, offlineWindow(0, 8 * 3_600_000 + 5000));
    expect(performance.now() - t0).toBeLessThan(3000);
    expect(report.countedMs).toBeLessThanOrEqual(8 * 3_600_000);
  });

  it('simular 30 min de combate ativo não trava', () => {
    const s = newGame(1, 0, 3);
    const t0 = performance.now();
    advance(s, 30 * 60_000, 0);
    expect(performance.now() - t0).toBeLessThan(4000);
  });

  it('o treino respeita o limite de horas offline e relógios no futuro distante', () => {
    const s = newGame(1, 0, 1);
    s.routes['floresta-viridian'].bossDefeated = true;
    const p = addToCollection(s, 25, 20, { ...IVS }, false, 0, 'perf');
    startTraining(s, p.uid, 'atk', 0);
    const gains = measureTraining(s, () => void updateTimers(s, 10 * 365 * 24 * 3_600_000));
    // 24 h no máximo (20 EVs/h), nunca acima do teto de 252 por atributo.
    expect(evsOf(p).atk).toBeLessThanOrEqual(252);
    expect(evsOf(p).atk).toBeGreaterThan(0);
    expect(gains[0]?.gained ?? 0).toBeLessThanOrEqual(24 * 20 + 1);
  });

  it('relógio que volta no tempo não desconta EVs nem quebra o treino', () => {
    const s = newGame(1, 0, 1);
    s.routes['floresta-viridian'].bossDefeated = true;
    const p = addToCollection(s, 25, 20, { ...IVS }, false, 5_000_000, 'perf');
    startTraining(s, p.uid, 'atk', 5_000_000);
    updateTimers(s, 1_000);
    expect(evsOf(p).atk).toBe(0);
    expect(s.training.slots).toHaveLength(1);
  });
});
