import { describe, expect, it } from 'vitest';
import { captureChance } from './capture';

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
