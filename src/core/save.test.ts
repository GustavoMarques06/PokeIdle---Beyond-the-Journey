import { describe, expect, it } from 'vitest';
import { advance, newGame } from './game';
import {
  BACKUP_KEY,
  SAVE_KEY,
  exportSave,
  importSave,
  loadGame,
  memoryStorage,
  parseSave,
  saveGame,
  serialize,
} from './save';

describe('save', () => {
  it('salva e carrega o mesmo estado', () => {
    const storage = memoryStorage();
    const s = newGame(4, 1000, 7);
    advance(s, 60_000, 1000);
    saveGame(storage, s, 5000);
    const { file } = loadGame(storage);
    expect(file?.state).toEqual(s);
    expect(file?.meta.savedAt).toBe(5000);
  });

  it('mantém o save anterior como backup', () => {
    const storage = memoryStorage();
    const s = newGame(4, 0, 7);
    saveGame(storage, s, 1);
    s.coins = 999;
    saveGame(storage, s, 2);
    expect(parseSave(storage.getItem(BACKUP_KEY))).toMatchObject({
      ok: true,
      file: { meta: { savedAt: 1 } },
    });
  });

  it('save corrompido é recuperado pelo backup', () => {
    const storage = memoryStorage();
    const s = newGame(1, 0, 7);
    saveGame(storage, s, 1);
    saveGame(storage, s, 2);
    storage.setItem(SAVE_KEY, '{"meta":{"formatVersion":1},"sta');
    const result = loadGame(storage);
    expect(result.restoredFromBackup).toBe(true);
    expect(result.file?.state.collection[0].speciesId).toBe(1);
  });

  it('sem save algum, começa do zero sem erro', () => {
    expect(loadGame(memoryStorage())).toEqual({ file: null, restoredFromBackup: false, error: undefined });
  });

  it('rejeita versões futuras e dados inválidos', () => {
    const s = newGame(1, 0, 7);
    const future = JSON.parse(serialize(s, 1));
    future.meta.formatVersion = 999;
    expect(parseSave(JSON.stringify(future)).ok).toBe(false);

    const broken = JSON.parse(serialize(s, 1));
    broken.state.collection[0].speciesId = 99999;
    expect(parseSave(JSON.stringify(broken)).ok).toBe(false);

    const negative = JSON.parse(serialize(s, 1));
    negative.state.coins = -5;
    expect(parseSave(JSON.stringify(negative)).ok).toBe(false);
  });

  it('não grava um save inválido por cima do backup', () => {
    const storage = memoryStorage();
    storage.setItem(SAVE_KEY, 'lixo');
    saveGame(storage, newGame(1, 0, 7), 1);
    expect(storage.getItem(BACKUP_KEY)).toBeNull();
  });

  it('exportação e importação manual', () => {
    const s = newGame(7, 0, 7);
    const result = importSave(exportSave(s, 10));
    expect(result.ok && result.file.state).toEqual(s);
    expect(importSave('não é base64!').ok).toBe(false);
  });
});
