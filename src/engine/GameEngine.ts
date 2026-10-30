// Ponte entre as regras (src/core) e a interface. Mantém o loop de passo fixo,
// o autosave e a detecção de tempo offline; a UI só lê o estado e despacha ações.

import { BALANCE, type PlayerAvatar } from '../game-data';
import { computeModifiers } from '../core/bonuses';
import { advance, newGame, type GameEvent, type GameState } from '../core/game';
import { checkAchievements } from '../core/meta';
import { applyOffline, offlineWindow, type OfflineReport } from '../core/offline';
import { clearSave, loadGame, saveGame, type SaveStorage } from '../core/save';
import { updateTimers } from '../core/timers';
import { measureTraining } from '../core/training';

type Listener = () => void;
type EventListener = (events: GameEvent[]) => void;

const SAVE_TRIGGERS = new Set<GameEvent['type']>([
  'captured',
  'bossDefeated',
  'evolved',
  'routeUnlocked',
  'levelUp',
  'achievement',
  'hatched',
  'towerEnded',
  'rocketDefeated',
  'hallOfFame',
]);

const pageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';

/** Intervalo dos cronômetros de tempo real (ovos, berries, eventos). */
const TIMERS_MS = 1000;
/** Ações do jogador em sequência (vários cliques) viram uma única gravação. */
const ACTION_SAVE_DELAY_MS = 400;

export class GameEngine {
  state: GameState | null = null;
  version = 0;
  offlineReport: OfflineReport | null = null;
  notice: string | null = null;
  /** Tamanho do último save gravado (bytes), exibido nas Opções. */
  saveBytes = 0;
  /**
   * O aviso atual veio de uma ação do jogador ou de uma troca de save (mostrar na hora), e não
   * de um passo comum do motor (as assinaturas com limite de frequência podem esperar).
   */
  urgent = true;

  private listeners = new Set<Listener>();
  private eventListeners = new Set<EventListener>();
  private saveListeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;
  private accumulator = 0;
  private lastSave = 0;
  private lastTimers = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private storage: SaveStorage,
    private clock: () => number = Date.now,
  ) {}

  // --- assinatura (useSyncExternalStore) -----------------------------------

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getVersion = (): number => this.version;

  onEvents(fn: EventListener): () => void {
    this.eventListeners.add(fn);
    return () => this.eventListeners.delete(fn);
  }

  /** Avisa a cada gravação bem-sucedida (o indicador "Salvando…" da interface). */
  onSave(fn: () => void): () => void {
    this.saveListeners.add(fn);
    return () => this.saveListeners.delete(fn);
  }

  private emit(events: GameEvent[] = [], urgent = true): void {
    this.version++;
    this.urgent = urgent;
    if (events.length) for (const fn of this.eventListeners) fn(events);
    // Aba escondida: o jogo segue andando, mas ninguém vê a tela; ela é redesenhada ao voltar.
    if (!urgent && pageHidden()) return;
    for (const fn of this.listeners) fn();
  }

  private onVisibility = (): void => {
    if (!pageHidden()) this.emit();
  };

  // --- ciclo de vida -------------------------------------------------------

  load(): void {
    const result = loadGame(this.storage);
    if (result.restoredFromBackup) {
      this.notice = `O save principal estava corrompido (${result.error}); o backup anterior foi restaurado.`;
    } else if (result.error) {
      this.notice = `Não foi possível ler o save (${result.error}). Um novo jogo será iniciado.`;
    }
    if (result.file) {
      this.state = result.file.state;
      const maxHours = computeModifiers(this.state).offlineMaxHours;
      const window = offlineWindow(result.file.meta.savedAt, this.clock(), maxHours);
      const report = applyOffline(this.state, window);
      if (report.countedMs > 0 || report.clockIssue !== 'none') this.offlineReport = report;
      const gains = measureTraining(this.state, () => void updateTimers(this.state!, this.clock()));
      if (this.offlineReport) this.offlineReport.training = gains;
      this.save();
    }
    this.emit();
  }

  start(): void {
    if (this.timer) return;
    this.lastTick = this.clock();
    this.timer = setInterval(() => this.tick(), BALANCE.tickMs);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    this.save();
  }

  newGame(starterId: number, trainerName?: string, avatar?: PlayerAvatar): void {
    const now = this.clock();
    this.state = newGame(starterId, now, (Math.random() * 2 ** 32) | 0, trainerName, avatar);
    // Quem pediu ao sistema menos movimento começa com "Reduzir animações" ligado.
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      this.state.settings.reducedMotion = true;
    }
    updateTimers(this.state, now);
    this.offlineReport = null;
    this.save();
    this.emit();
  }

  resetSave(): void {
    this.cancelScheduledSave();
    clearSave(this.storage);
    this.state = null;
    this.offlineReport = null;
    this.emit();
  }

  replaceState(state: GameState): void {
    this.state = state;
    this.offlineReport = null;
    this.save();
    this.emit();
  }

  dismissOfflineReport(): void {
    this.offlineReport = null;
    this.emit();
  }

  dismissNotice(): void {
    this.notice = null;
    this.emit();
  }

  /** Grava agora (e cancela uma gravação agendada). */
  save(): void {
    this.cancelScheduledSave();
    if (!this.state) return;
    const now = this.clock();
    try {
      this.saveBytes = saveGame(this.storage, this.state, now);
      this.lastSave = now;
      for (const fn of this.saveListeners) fn();
    } catch (err) {
      console.error('Falha ao salvar', err);
    }
  }

  /** Agenda uma gravação em breve; chamadas seguidas são agrupadas. */
  scheduleSave(): void {
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.save();
    }, ACTION_SAVE_DELAY_MS);
  }

  private cancelScheduledSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
  }

  /** Executa uma ação do jogador e notifica a UI. */
  dispatch(action: (state: GameState, now: number) => GameEvent[] | unknown): void {
    if (!this.state) return;
    const out = action(this.state, this.clock());
    const events = Array.isArray(out) ? (out as GameEvent[]) : [];
    events.push(...checkAchievements(this.state));
    this.scheduleSave();
    this.emit(events);
  }

  // --- loop ----------------------------------------------------------------

  private tick(): void {
    if (!this.state) return;
    const now = this.clock();
    const delta = now - this.lastTick;
    this.lastTick = now;

    if (delta < 0) return; // relógio recuou: ignora este intervalo.
    if (delta > BALANCE.offline.gapThresholdMs) {
      // Aba suspensa ou computador dormindo: trata como tempo offline.
      const maxHours = computeModifiers(this.state).offlineMaxHours;
      const report = applyOffline(this.state, offlineWindow(now - delta, now, maxHours));
      if (report.countedMs > 0) this.offlineReport = report;
      updateTimers(this.state, now);
      this.accumulator = 0;
      this.save();
      this.emit();
      return;
    }

    this.accumulator += delta;
    const ms = Math.floor(this.accumulator / BALANCE.tickMs) * BALANCE.tickMs;
    if (ms <= 0) return;
    this.accumulator -= ms;
    const events = advance(this.state, ms, now);
    if (now - this.lastTimers >= TIMERS_MS) {
      this.lastTimers = now;
      events.push(...updateTimers(this.state, now));
    }
    events.push(...checkAchievements(this.state));

    if (events.some((e) => SAVE_TRIGGERS.has(e.type)) || now - this.lastSave >= BALANCE.save.autosaveMs) {
      this.save();
    }
    this.emit(events, false);
  }
}
