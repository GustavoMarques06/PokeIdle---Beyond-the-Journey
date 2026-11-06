// Modo Desempenho: o que o motor não precisa saber, mas a interface inteira consulta (sprites parados, menos redesenho).
// Fica também no localStorage porque o pré-carregamento começa antes de o save abrir.

import { useSyncExternalStore } from 'react';

const KEY = 'pokeidle.performance';
const listeners = new Set<() => void>();

function readStored(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

let on = readStored();

export const isPerfMode = (): boolean => on;

export function setPerfMode(value: boolean): void {
  if (value === on) return;
  on = value;
  try {
    localStorage.setItem(KEY, value ? '1' : '0');
  } catch {
    // Sem acesso ao armazenamento: vale só até fechar o jogo.
  }
  for (const fn of listeners) fn();
}

export function usePerfMode(): boolean {
  return useSyncExternalStore((fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, isPerfMode);
}

/** Pouca máquina, pelo que o navegador informa (o Safari não informa a memória). */
export function looksWeak(cores: number | undefined, memoryGb: number | undefined): boolean {
  return (cores !== undefined && cores <= 2) || (memoryGb !== undefined && memoryGb <= 2);
}

/** Abaixo disso, a luta já parece travar. */
export const LOW_FPS = 25;
