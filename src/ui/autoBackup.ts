// Cópia automática num arquivo do computador (Chrome e Edge: File System Access). O jogador escolhe o arquivo uma vez;
// depois, o jogo grava nele a cada poucos minutos e ao sair. Se o navegador apagar os dados do site, o arquivo fica.
// O acesso ao arquivo fica guardado no IndexedDB; depois de reabrir o navegador, pode ser preciso um toque para o
// navegador liberar de novo.

import type { GameState } from '../core/game';
import { TRANSFER_EXTENSION, encodeTransferCode, transferFileName } from '../core/transfer';
import { isTauri } from '../engine/storage';
import { markBackup } from './backup';

interface Writable {
  write(data: string): Promise<void>;
  close(): Promise<void>;
}
interface FileHandle {
  name: string;
  createWritable(): Promise<Writable>;
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
}
type Picker = (o: {
  suggestedName: string;
  types: { description: string; accept: Record<string, string[]> }[];
}) => Promise<FileHandle>;

const DB = 'pokeidle-backup';
const STORE = 'handles';
const KEY = 'auto';

export type AutoBackupStatus = 'off' | 'on' | 'paused';

export const autoBackupSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'showSaveFilePicker' in window &&
  !isTauri() &&
  typeof indexedDB !== 'undefined';

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

const getHandle = () => idb<FileHandle | undefined>('readonly', (s) => s.get(KEY)).catch(() => undefined);

export async function autoBackupStatus(): Promise<{ status: AutoBackupStatus; file?: string }> {
  if (!autoBackupSupported()) return { status: 'off' };
  const handle = await getHandle();
  if (!handle) return { status: 'off' };
  const perm = await handle.queryPermission({ mode: 'readwrite' }).catch(() => 'denied' as PermissionState);
  return { status: perm === 'granted' ? 'on' : 'paused', file: handle.name };
}

async function writeTo(handle: FileHandle, state: GameState): Promise<void> {
  const now = Date.now();
  const { code } = await encodeTransferCode(state, now);
  const w = await handle.createWritable();
  await w.write(code);
  await w.close();
  markBackup(now);
}

/** Escolher o arquivo (precisa de um clique do jogador) e já gravar a primeira cópia. */
export async function startAutoBackup(state: GameState): Promise<string> {
  const pick = (window as unknown as { showSaveFilePicker: Picker }).showSaveFilePicker;
  const handle = await pick({
    suggestedName: transferFileName(state, Date.now()).replace(/-\d{4}-\d{2}-\d{2}/, ''),
    types: [{ description: 'Save do PokéIdle', accept: { 'text/plain': [TRANSFER_EXTENSION] } }],
  });
  await idb('readwrite', (s) => s.put(handle, KEY));
  await writeTo(handle, state);
  return handle.name;
}

/** Depois de reabrir o navegador: o clique do jogador libera o arquivo de novo. */
export async function resumeAutoBackup(state: GameState): Promise<boolean> {
  const handle = await getHandle();
  if (!handle) return false;
  if ((await handle.requestPermission({ mode: 'readwrite' })) !== 'granted') return false;
  await writeTo(handle, state);
  return true;
}

export async function stopAutoBackup(): Promise<void> {
  await idb('readwrite', (s) => s.delete(KEY)).catch(() => undefined);
}

/** Grava a cópia se o arquivo estiver liberado; sem permissão, não pergunta nada (não houve clique). */
export async function autoBackupTick(state: GameState): Promise<void> {
  if (!autoBackupSupported()) return;
  const handle = await getHandle();
  if (!handle || (await handle.queryPermission({ mode: 'readwrite' })) !== 'granted') return;
  await writeTo(handle, state).catch(() => undefined);
}
