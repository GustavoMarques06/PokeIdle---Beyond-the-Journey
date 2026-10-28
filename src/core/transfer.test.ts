import { describe, expect, it } from 'vitest';
import { newGame } from './game';
import { exportSave } from './save';
import { decodeTransferCode, encodeTransferCode, transferFileName, TRANSFER_PREFIX } from './transfer';

describe('código de transferência', () => {
  it('ida e volta preserva o jogo e comprime o save', async () => {
    const s = newGame(4, 1000, 7, 'Ash');
    s.coins = 12345;
    const { code, rawBytes } = await encodeTransferCode(s, 2000);
    expect(code.startsWith(`${TRANSFER_PREFIX}.`)).toBe(true);
    expect(code.length).toBeLessThan(rawBytes);
    const back = await decodeTransferCode(`  ${code.slice(0, 40)}\n${code.slice(40)}  `);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.file.state.coins).toBe(12345);
      expect(back.file.state.trainerName).toBe('Ash');
      expect(back.file.meta.savedAt).toBe(2000);
    }
  });

  it('recusa código alterado ou cortado', async () => {
    const { code } = await encodeTransferCode(newGame(1, 0, 1), 0);
    const [prefix, sum, body] = code.split('.');
    expect((await decodeTransferCode(`${prefix}.${sum}x.${body}`)).ok).toBe(false);
    expect((await decodeTransferCode(code.slice(0, code.length - 20))).ok).toBe(false);
    expect((await decodeTransferCode(`${prefix}.${sum}`)).ok).toBe(false);
    expect((await decodeTransferCode('')).ok).toBe(false);
  });

  it('aceita a exportação antiga (base64) e o JSON puro', async () => {
    const s = newGame(7, 0, 3);
    const legacy = await decodeTransferCode(exportSave(s, 5));
    expect(legacy.ok).toBe(true);
    const json = await decodeTransferCode(
      JSON.stringify({ meta: { formatVersion: 6, gameVersion: 'x', savedAt: 1 }, state: s }),
    );
    expect(json.ok).toBe(true);
  });

  it('nome do arquivo usa o treinador e a data', () => {
    const s = newGame(1, 0, 1, 'Ação!');
    expect(transferFileName(s, Date.UTC(2026, 9, 27))).toBe('pokeidle-acao-2026-10-27.pkidle');
  });
});
