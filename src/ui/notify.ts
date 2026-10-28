// Notificações do sistema (Windows, pelo plugin do Tauri; no navegador, a API Notification)
// para eventos que acontecem enquanto o jogo está em segundo plano. O jogador escolhe as
// categorias nas Opções; eventos iguais no mesmo instante viram um aviso só ("3 ovos chocaram").

import type { GameEvent } from '../core/game';
import type { GameEngine } from '../engine/GameEngine';
import { isTauri } from '../engine/storage';
import { describeEvent, speciesName } from './i18n/pt-BR';

export interface NotifyCategory {
  id: string;
  label: string;
  events: GameEvent['type'][];
}

/** Categorias que podem ser ligadas e desligadas nas Opções. */
export const NOTIFY_CATEGORIES: NotifyCategory[] = [
  { id: 'breeding', label: 'Creche, fósseis e treino', events: ['hatched', 'fossilReady', 'trainingFull'] },
  {
    id: 'exploring',
    label: 'Expedições, berries e acompanhante',
    events: ['expeditionDone', 'berryReady', 'companionFound'],
  },
  {
    id: 'visitors',
    label: 'Errantes, Equipe Rocket, raides e mercador',
    events: ['roamerAppeared', 'rocketAppeared', 'raidAppeared', 'merchantAppeared'],
  },
  {
    id: 'progress',
    label: 'Evoluções, chefes, Torre e torneio',
    events: [
      'evolutionReady',
      'bossAvailable',
      'towerEnded',
      'tournamentEnded',
      'hallOfFame',
      'challengeFailed',
    ],
  },
  { id: 'rare', label: 'Shiny capturado', events: ['captured'] },
];

const CATEGORY_OF = new Map<GameEvent['type'], string>(
  NOTIFY_CATEGORIES.flatMap((c) => c.events.map((e) => [e, c.id] as const)),
);

/** Texto quando vários eventos do mesmo tipo chegam juntos (progresso offline, timers). */
const GROUPED: Partial<Record<GameEvent['type'], (n: number) => string>> = {
  hatched: (n) => `${n} ovos chocaram na creche.`,
  expeditionDone: (n) => `${n} expedições voltaram.`,
  berryReady: (n) => `${n} berries estão prontas para colher.`,
  fossilReady: (n) => `${n} fósseis foram revividos.`,
  evolutionReady: (n) => `${n} Pokémon estão prontos para evoluir.`,
  trainingFull: (n) => `${n} Pokémon terminaram o treino.`,
  companionFound: (n) => `Seu acompanhante achou ${n} itens.`,
};

/** Um aviso de cada tipo a cada minuto, no máximo. */
const COOLDOWN_MS = 60_000;

/** Só a captura de shiny vira aviso (capturas comuns são frequentes demais). */
function relevant(e: GameEvent): boolean {
  if (e.type === 'captured') return e.shiny;
  return CATEGORY_OF.has(e.type);
}

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
      const n = new Notification(title, { body, icon: 'icons/icon-192.png' });
      // Clicar no aviso traz o jogo para a frente.
      n.onclick = () => {
        window.focus();
        n.close();
      };
    }
  } catch (err) {
    console.warn('Notificação falhou', err);
  }
}

function inBackground(): boolean {
  return document.visibilityState === 'hidden' || !document.hasFocus();
}

/**
 * Escolhe os eventos a notificar (puro, para testes): ignora categorias desligadas, junta os do
 * mesmo tipo num aviso só e respeita o intervalo mínimo por tipo.
 */
export function pickNotifications(
  events: GameEvent[],
  lastShown: Map<string, number>,
  now: number,
  off: readonly string[] = [],
): { type: string; text: string }[] {
  const groups = new Map<string, GameEvent[]>();
  for (const e of events) {
    if (!relevant(e) || off.includes(CATEGORY_OF.get(e.type)!)) continue;
    groups.set(e.type, [...(groups.get(e.type) ?? []), e]);
  }
  const out: { type: string; text: string }[] = [];
  for (const [type, list] of groups) {
    if (now - (lastShown.get(type) ?? -Infinity) < COOLDOWN_MS) continue;
    const first = list[0];
    const text =
      first.type === 'captured'
        ? `Shiny capturado: ${speciesName(first.speciesId)}${list.length > 1 ? ` e mais ${list.length - 1}` : ''}!`
        : list.length > 1
          ? (GROUPED[first.type]?.(list.length) ?? `${describeEvent(first)} (+${list.length - 1})`)
          : describeEvent(first);
    if (!text) continue;
    lastShown.set(type, now);
    out.push({ type, text });
  }
  return out;
}

export function installNotifications(engine: GameEngine): void {
  const lastShown = new Map<string, number>();
  engine.onEvents((events) => {
    const settings = engine.state?.settings;
    if (!settings?.notifications || !inBackground()) return;
    for (const n of pickNotifications(events, lastShown, Date.now(), settings.notifyOff)) {
      void show('PokéIdle', n.text);
    }
  });
}
