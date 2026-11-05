import { describe, expect, it } from 'vitest';
import { SPECIES, heightMeters } from '.';

describe('altura real das espécies', () => {
  it('todas as espécies têm altura, com os extremos certos', () => {
    for (const s of SPECIES) expect(heightMeters(s.id), s.name).toBeGreaterThan(0);
    expect(heightMeters(19)).toBeCloseTo(0.3, 1); // Rattata
    expect(heightMeters(6)).toBeCloseTo(1.7, 1); // Charizard
    expect(heightMeters(95)).toBeCloseTo(8.8, 1); // Onix
    expect(heightMeters(321)).toBeCloseTo(14.5, 1); // Wailord
    expect(heightMeters(150, 'megax')).toBeGreaterThan(heightMeters(150)); // Mewtwo: 2,0 m → Mega X 2,3 m
  });
});
