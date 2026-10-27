import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../core/save';
import { FileStorage, savedAtOf } from './storage';

/** Simula os comandos do Tauri sobre uma pasta em memória. */
function fakeTauri(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const calls: string[] = [];
  const invoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
    calls.push(cmd);
    if (cmd === 'save_read_all') return Object.fromEntries(files) as T;
    if (cmd === 'save_write') files.set(args!.key as string, args!.value as string);
    if (cmd === 'save_remove') files.delete(args!.key as string);
    return undefined as T;
  };
  return { files, calls, invoke };
}

function fakeMirror(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size;
    },
  };
}

const save = (savedAt: number) => JSON.stringify({ meta: { savedAt }, state: {} });

describe('FileStorage (app desktop)', () => {
  it('lê os arquivos na abertura e grava em arquivo e no espelho', async () => {
    const tauri = fakeTauri({ [SAVE_KEY]: save(10) });
    const mirror = fakeMirror();
    const fs = await FileStorage.open(tauri.invoke, mirror, () => '2026-10-26');
    expect(fs.getItem(SAVE_KEY)).toBe(save(10));
    fs.setItem(SAVE_KEY, save(20));
    await fs.flush();
    expect(tauri.files.get(SAVE_KEY)).toBe(save(20));
    expect(mirror.getItem(SAVE_KEY)).toBe(save(20));
  });

  it('usa o espelho quando ele é mais novo (jogo fechou antes de gravar o arquivo)', async () => {
    const tauri = fakeTauri({ [SAVE_KEY]: save(10) });
    const fs = await FileStorage.open(tauri.invoke, fakeMirror({ [SAVE_KEY]: save(99) }), () => 'd');
    expect(savedAtOf(fs.getItem(SAVE_KEY))).toBe(99);
    await fs.flush();
    expect(savedAtOf(tauri.files.get(SAVE_KEY))).toBe(99);
  });

  it('guarda um backup por dia e só os 7 mais recentes', async () => {
    let day = 1;
    const tauri = fakeTauri();
    const fs = await FileStorage.open(tauri.invoke, null, () => `2026-10-${String(day).padStart(2, '0')}`);
    for (day = 1; day <= 10; day++) {
      fs.setItem(SAVE_KEY, save(day));
      fs.setItem(SAVE_KEY, save(day + 0.5));
    }
    await fs.flush();
    const daily = [...tauri.files.keys()].filter((k) => k.startsWith('pokeidle.daily-')).sort();
    expect(daily).toHaveLength(7);
    expect(daily[0]).toBe('pokeidle.daily-2026-10-04');
    // O backup do dia é a primeira gravação daquele dia.
    expect(savedAtOf(tauri.files.get('pokeidle.daily-2026-10-10'))).toBe(10);
  });

  it('gravações seguidas da mesma chave viram uma só', async () => {
    const tauri = fakeTauri();
    const fs = await FileStorage.open(tauri.invoke, null, () => 'd');
    fs.setItem('x', '1');
    fs.setItem('x', '2');
    fs.setItem('x', '3');
    fs.removeItem('y');
    await fs.flush();
    expect(tauri.files.get('x')).toBe('3');
    expect(tauri.calls.filter((c) => c === 'save_write').length).toBeLessThanOrEqual(2);
  });
});
