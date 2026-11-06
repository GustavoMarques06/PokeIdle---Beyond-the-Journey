// Proteção do save no aparelho: pedir armazenamento persistente, baixar uma cópia e lembrar o jogador de fazer isso.
// O save fica só neste navegador; limpar os dados (ou o iPhone, depois de dias sem abrir o site) apaga tudo.

import type { GameState } from '../core/game';
import { encodeTransferCode, transferFileName } from '../core/transfer';

const DAY = 86_400_000;
export const BACKUP_EVERY_DAYS = 7;
const SNOOZE_DAYS = 3;
const INSTALL_SNOOZE_DAYS = 14;

const KEYS = {
  backup: 'pokeidle.lastBackup',
  backupSnooze: 'pokeidle.backupSnooze',
  installSnooze: 'pokeidle.installSnooze',
};

function readTime(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writeTime(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // Sem acesso ao armazenamento: o lembrete só volta antes da hora.
  }
}

/** Hora de lembrar? Quem começou há pouco não precisa, e "Depois" adia por alguns dias. */
export function backupDue(now: number, createdAt: number, lastBackup: number, snoozedAt: number): boolean {
  if (now - createdAt < BACKUP_EVERY_DAYS * DAY) return false;
  if (now - snoozedAt < SNOOZE_DAYS * DAY) return false;
  return now - lastBackup >= BACKUP_EVERY_DAYS * DAY;
}

export const shouldRemindBackup = (state: GameState, now: number) =>
  backupDue(now, state.createdAt, readTime(KEYS.backup), readTime(KEYS.backupSnooze));

export const snoozeBackup = (now: number) => writeTime(KEYS.backupSnooze, now);
export const markBackup = (now: number) => writeTime(KEYS.backup, now);

/** Baixa o save num arquivo que o botão CARREGAR JOGO aceita de volta. */
export async function downloadBackup(state: GameState, now: number, code?: string): Promise<void> {
  const text = code ?? (await encodeTransferCode(state, now)).code;
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = transferFileName(state, now);
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  markBackup(now);
}

/** iPhone ou iPad no navegador (fora do app instalado): é onde o sistema pode apagar os dados sozinho. */
export function iosInBrowser(): boolean {
  const iOS =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (!iOS) return false;
  const standalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    !!window.matchMedia?.('(display-mode: standalone)').matches;
  return !standalone;
}

export const shouldSuggestInstall = (now: number) =>
  iosInBrowser() && now - readTime(KEYS.installSnooze) >= INSTALL_SNOOZE_DAYS * DAY;

export const snoozeInstall = (now: number) => writeTime(KEYS.installSnooze, now);

/** Pede ao navegador para não apagar os dados deste site quando faltar espaço (o pedido vale por abertura). */
export function requestPersistentStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}
