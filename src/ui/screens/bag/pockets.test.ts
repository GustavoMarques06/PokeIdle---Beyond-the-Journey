// Bolsos da Mochila: cada item no seu lugar, como nos portáteis.

import { describe, expect, it } from 'vitest';
import { itemPocket, keyItems } from './pockets';

describe('bolsos da mochila', () => {
  it('separa bolas, berries e remédios, pedras e Megas, itens de segurar e o resto', () => {
    expect(itemPocket('poke-ball')).toBe('balls');
    expect(itemPocket('master-ball')).toBe('balls');
    expect(itemPocket('oran-berry')).toBe('medicine');
    expect(itemPocket('rare-candy')).toBe('medicine');
    expect(itemPocket('protein')).toBe('medicine');
    expect(itemPocket('thunder-stone')).toBe('stones');
    expect(itemPocket('ice-stone')).toBe('stones');
    expect(itemPocket('garchompite')).toBe('stones');
    expect(itemPocket('leftovers')).toBe('held');
    expect(itemPocket('nugget')).toBe('items');
  });

  it('itens-chave: o estojo de TMs e as melhorias que são objetos', () => {
    expect(keyItems([])).toEqual(['tm-case']);
    expect(keyItems(['old-rod', 'surf'])).toEqual(['tm-case', 'old-rod', 'surf']);
  });
});
