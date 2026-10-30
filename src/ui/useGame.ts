import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import type { GameEvent, GameState } from '../core/game';
import type { GameEngine } from '../engine/GameEngine';

export const EngineContext = createContext<GameEngine | null>(null);

export function useEngine(): GameEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('EngineContext ausente');
  return engine;
}

/**
 * Assinatura com limite de frequência: os passos do motor (10 por segundo) chegam no máximo a
 * cada `ms`; ações do jogador e trocas de save (avisos urgentes) chegam na hora.
 */
function throttledStore(engine: GameEngine, ms: number) {
  let version = engine.getVersion();
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    getSnapshot: () => version,
    subscribe: (notify: () => void) => {
      const fire = () => {
        clearTimeout(timer);
        timer = undefined;
        last = performance.now();
        version = engine.getVersion();
        notify();
      };
      const off = engine.subscribe(() => {
        if (engine.urgent) return fire();
        if (timer) return;
        const wait = ms - (performance.now() - last);
        if (wait <= 0) fire();
        else timer = setTimeout(fire, wait);
      });
      return () => {
        off();
        clearTimeout(timer);
      };
    },
  };
}

/**
 * Re-renderiza a cada atualização do motor e devolve o estado atual. Com `ms`, no máximo uma
 * vez a cada `ms` (a batalha usa todas; HUD e telas laterais não precisam de 10 por segundo).
 */
export function useGameState(ms = 0): GameState | null {
  const engine = useEngine();
  const store = useMemo(
    () =>
      ms > 0 ? throttledStore(engine, ms) : { subscribe: engine.subscribe, getSnapshot: engine.getVersion },
    [engine, ms],
  );
  useSyncExternalStore(store.subscribe, store.getSnapshot);
  return engine.state;
}

export function useGameEvents(fn: (events: GameEvent[]) => void): void {
  const engine = useEngine();
  useEffect(() => engine.onEvents(fn), [engine, fn]);
}
