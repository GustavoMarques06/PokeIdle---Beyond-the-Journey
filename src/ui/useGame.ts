import { createContext, useContext, useEffect, useSyncExternalStore } from 'react';
import type { GameEvent, GameState } from '../core/game';
import type { GameEngine } from '../engine/GameEngine';

export const EngineContext = createContext<GameEngine | null>(null);

export function useEngine(): GameEngine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error('EngineContext ausente');
  return engine;
}

/** Re-renderiza a cada atualização do motor e devolve o estado atual. */
export function useGameState(): GameState | null {
  const engine = useEngine();
  useSyncExternalStore(engine.subscribe, engine.getVersion);
  return engine.state;
}

export function useGameEvents(fn: (events: GameEvent[]) => void): void {
  const engine = useEngine();
  useEffect(() => engine.onEvents(fn), [engine, fn]);
}
