// Onde o save fica guardado. No navegador, localStorage. No app desktop (Tauri), em
// arquivos JSON na pasta de dados do usuário (%APPDATA%/com.pokeidle.beyondthejourney/saves),
// que sobrevivem a limpezas de cache do WebView; o localStorage continua como espelho.

import type { SaveStorage } from '../core/save';
import { SAVE_KEY } from '../core/save';

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

/** Quantos backups diários manter no app desktop. */
const DAILY_BACKUPS = 7;
const DAILY_PREFIX = 'pokeidle.daily-';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** `savedAt` de um save serializado (0 se ilegível), para escolher o mais recente. */
export function savedAtOf(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const at = (JSON.parse(raw) as { meta?: { savedAt?: unknown } }).meta?.savedAt;
    return typeof at === 'number' && Number.isFinite(at) ? at : 0;
  } catch {
    return 0;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Armazenamento em arquivos via comandos do Tauri. A leitura acontece uma vez na
 * abertura (o motor do jogo lê de forma síncrona); as gravações vão para uma fila que
 * mantém só o valor mais recente de cada chave e grava em ordem.
 */
export class FileStorage implements SaveStorage {
  private cache = new Map<string, string>();
  private pending = new Map<string, string | null>();
  private flushing: Promise<void> | null = null;

  private constructor(
    private invoke: Invoke,
    private mirror: Storage | null,
    private today: () => string,
  ) {}

  static async open(
    invoke: Invoke,
    mirror: Storage | null = safeLocalStorage(),
    today: () => string = () => new Date().toISOString().slice(0, 10),
  ): Promise<FileStorage> {
    const s = new FileStorage(invoke, mirror, today);
    const files = await invoke<Record<string, string>>('save_read_all');
    for (const [k, v] of Object.entries(files)) s.cache.set(k, v);
    // O espelho pode estar mais novo (o jogo fechou antes de a gravação em arquivo
    // terminar) ou ser a única cópia (primeira vez no app desktop).
    const mirrored = mirror?.getItem(SAVE_KEY);
    if (mirrored && savedAtOf(mirrored) > savedAtOf(s.cache.get(SAVE_KEY))) s.setItem(SAVE_KEY, mirrored);
    return s;
  }

  getItem(key: string): string | null {
    return this.cache.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.cache.set(key, value);
    this.queue(key, value);
    try {
      this.mirror?.setItem(key, value);
    } catch {
      // Espelho cheio: o arquivo continua sendo a cópia principal.
    }
    if (key === SAVE_KEY) this.dailyBackup(value);
  }

  removeItem(key: string): void {
    this.cache.delete(key);
    this.queue(key, null);
    this.mirror?.removeItem(key);
  }

  /** Espera as gravações pendentes (usado ao fechar e nos testes). */
  async flush(): Promise<void> {
    while (this.flushing) await this.flushing;
  }

  /** Uma cópia por dia, guardando as últimas `DAILY_BACKUPS`. */
  private dailyBackup(value: string): void {
    const key = `${DAILY_PREFIX}${this.today()}`;
    if (this.cache.has(key)) return;
    this.cache.set(key, value);
    this.queue(key, value);
    const old = [...this.cache.keys()]
      .filter((k) => k.startsWith(DAILY_PREFIX))
      .sort()
      .slice(0, -DAILY_BACKUPS);
    for (const k of old) {
      this.cache.delete(k);
      this.queue(k, null);
    }
  }

  private queue(key: string, value: string | null): void {
    this.pending.set(key, value);
    this.flushing ??= this.drain();
  }

  private async drain(): Promise<void> {
    while (this.pending.size) {
      const [key, value] = this.pending.entries().next().value!;
      this.pending.delete(key);
      try {
        if (value === null) await this.invoke('save_remove', { key });
        else await this.invoke('save_write', { key, value });
      } catch (err) {
        console.error(`Falha ao gravar ${key} em arquivo`, err);
      }
    }
    this.flushing = null;
  }
}

/** Escolhe o armazenamento conforme a plataforma. */
export async function createStorage(): Promise<SaveStorage> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await FileStorage.open(invoke);
    } catch (err) {
      console.error('Save em arquivo indisponível; usando localStorage', err);
    }
  }
  return safeLocalStorage() ?? memoryFallback();
}

function memoryFallback(): SaveStorage {
  const data = new Map<string, string>();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}
