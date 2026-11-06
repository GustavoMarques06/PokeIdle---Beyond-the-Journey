import { describe, expect, it } from 'vitest';
import { isNewVersion } from './UpdateNotice';

describe('isNewVersion', () => {
  it('só avisa quando o número do site é outro', () => {
    expect(isNewVersion('a', 'b')).toBe(true);
    expect(isNewVersion('a', 'a')).toBe(false);
  });

  it('ignora resposta sem número (por exemplo, uma página de erro)', () => {
    expect(isNewVersion('a', undefined)).toBe(false);
    expect(isNewVersion('a', '')).toBe(false);
    expect(isNewVersion('a', 7)).toBe(false);
  });
});
