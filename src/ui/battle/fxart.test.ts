import { describe, expect, it } from 'vitest';
import { artMs, impactArt, statusArt } from './fxart';

const FILES = Object.keys(import.meta.glob('../../../public/sprites/fx/*.png', { query: '?url' })).map((f) =>
  f.split('/').pop(),
);
const TYPES = [
  'normal',
  'fighting',
  'flying',
  'ground',
  'rock',
  'ghost',
  'dark',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'fairy',
];

describe('efeitos desenhados (PVFX Foundry e Foozle, CC0)', () => {
  it('cada tipo com efeito aponta para uma folha que existe e não atrasa a luta', () => {
    for (const type of TYPES) {
      for (const big of [false, true]) {
        const art = impactArt(type, big);
        expect(art, `${type} ${big ? 'forte' : ''}`).toBeTruthy();
        expect(FILES).toContain(`${art!.name}.png`);
        expect(art!.n).toBeGreaterThan(5);
        expect(artMs(art!, 1)).toBeLessThanOrEqual(1000);
      }
    }
  });

  it('os tipos sem efeito desenhado seguem com as partículas', () => {
    for (const type of ['steel', 'poison', 'bug', 'dragon']) expect(impactArt(type, false)).toBeUndefined();
  });

  it('o golpe forte usa a versão própria ou toca ampliado', () => {
    expect(impactArt('electric', true)?.name).not.toBe(impactArt('electric', false)?.name);
    expect(impactArt('fire', true)?.boost).toBe(true);
    expect(impactArt('fire', false)?.boost).toBeUndefined();
  });

  it('os cinco status têm efeito em loop', () => {
    for (const kind of ['sleep', 'paralysis', 'burn', 'freeze', 'poison']) {
      const art = statusArt(kind);
      expect(art, kind).toBeTruthy();
      expect(art!.loop).toBe(true);
      expect(FILES).toContain(`${art!.name}.png`);
    }
  });
});
