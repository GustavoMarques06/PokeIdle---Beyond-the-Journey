// Notificações do sistema (Windows, pelo plugin do Tauri; no navegador, a API Notification)
// para eventos que acontecem enquanto o jogo está em segundo plano.

import type { GameEvent } from '../core/game';
import type { GameEngine } from '../engine/GameEngine';
import { isTauri } from '../engine/storage';
import { describeEvent } from './i18n/pt-BR';

/** Eventos que valem um aviso fora do jogo. */
const NOTIFY_EVENTS = new Set<GameEvent['type']>([
  'hatched',
  'expeditionDone',
  'berryReady',
  'fossilReady',
  'roamerAppeared',
  'rocketAppeared',
  'evolutionReady',
  'bossAvailable',
]);

/** Um aviso de cada tipo a cada minuto, no máximo. */
const COOLDOWN_MS = 60_000;

async function tauriNotification() {
  return import('@tauri-apps/plugin-notification');
}

/** Pede permissão ao sistema. Devolve se as notificações podem ser mostradas. */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (isTauri()) {
      const n = await tauriNotification();
      return (await n.isPermissionGranted()) || (await n.requestPermission()) === 'granted';
    }
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function show(title: string, body: string): Promise<void> {
  try {
    if (isTauri()) {
      const n = await tauriNotification();
      if (await n.isPermissionGranted()) n.sendNotification({ title, body });
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'sprites/items/poke-ball.png' });
    }
  } catch (err) {
    console.warn('Notificação falhou', err);
  }
}

function inBackground(): boolean {
  return document.visibilityState === 'hidden' || !document.hasFocus();
}

/** Escolhe os eventos a notificar (puro, para testes). */
export function pickNotifications(
  events: GameEvent[],
  lastShown: Map<string, number>,
  now: number,
): { type: string; text: string }[] {
  const out: { type: string; text: string }[] = [];
  for (const e of events) {
    if (!NOTIFY_EVENTS.has(e.type)) continue;
    if (now - (lastShown.get(e.type) ?? -Infinity) < COOLDOWN_MS) continue;
    const text = describeEvent(e);
    if (!text) continue;
    lastShown.set(e.type, now);
    out.push({ type: e.type, text });
  }
  return out;
}

export function installNotifications(engine: GameEngine): void {
  const lastShown = new Map<string, number>();
  engine.onEvents((events) => {
    if (!engine.state?.settings.notifications || !inBackground()) return;
    for (const n of pickNotifications(events, lastShown, Date.now())) void show('PokéIdle', n.text);
  });
}
