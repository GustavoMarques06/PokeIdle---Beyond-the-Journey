import { describe, expect, it } from 'vitest';
import { isPerfMode, looksWeak, setPerfMode } from './perfMode';

describe('modo Desempenho', () => {
  it('reconhece máquina fraca pelo que o navegador informa', () => {
    expect(looksWeak(2, undefined)).toBe(true);
    expect(looksWeak(8, 2)).toBe(true);
    expect(looksWeak(8, 8)).toBe(false);
    // O Safari não informa a memória, e isso sozinho não diz nada.
    expect(looksWeak(undefined, undefined)).toBe(false);
  });

  it('guarda a escolha', () => {
    setPerfMode(true);
    expect(isPerfMode()).toBe(true);
    setPerfMode(false);
    expect(isPerfMode()).toBe(false);
  });
});
