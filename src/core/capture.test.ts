import { describe, expect, it } from 'vitest';
import { captureAnimMs, captureChance, captureRevealMs, captureShakes } from './capture';

describe('animação de captura', () => {
  it('balança mais quanto mais perto de capturar, e sempre 3 vezes ao capturar', () => {
    expect(captureShakes(0.1, false)).toBe(1);
    expect(captureShakes(0.3, false)).toBe(2);
    expect(captureShakes(0.6, false)).toBe(3);
    expect(captureShakes(0.01, true)).toBe(3);
  });

  it('o resultado aparece antes do fim da animação', () => {
    for (const shakes of [1, 2, 3]) {
      expect(captureRevealMs(shakes)).toBeLessThan(captureAnimMs(shakes, false));
    }
    expect(captureAnimMs(3, true)).toBe(3000);
  });
});

describe('captureChance', () => {
  it('HP baixo aumenta a chance', () => {
    expect(captureChance(45, 1, 100, 'poke-ball')).toBeGreaterThan(captureChance(45, 100, 100, 'poke-ball'));
  });

  it('Great Ball é melhor que Poké Ball', () => {
    expect(captureChance(45, 50, 100, 'great-ball')).toBeGreaterThan(captureChance(45, 50, 100, 'poke-ball'));
  });

  it('fica sempre entre 0 e 1', () => {
    for (const rate of [3, 45, 255]) {
      for (const hp of [0, 1, 50, 100]) {
        const c = captureChance(rate, hp, 100, 'great-ball');
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    }
  });
});
