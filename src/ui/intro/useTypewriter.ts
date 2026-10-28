// Texto em máquina de escrever, como nas caixas de diálogo dos portáteis. `finish` completa
// a fala de uma vez (o primeiro toque de quem tem pressa).

import { useEffect, useState } from 'react';

const CHARS_PER_SEC = 45;

export function useTypewriter(text: string, instant: boolean) {
  const [shown, setShown] = useState(instant ? text.length : 0);
  const [prev, setPrev] = useState(text);
  if (prev !== text) {
    setPrev(text);
    setShown(instant ? text.length : 0);
  }
  useEffect(() => {
    if (shown >= text.length) return;
    const id = setTimeout(() => setShown((s) => Math.min(text.length, s + 1)), 1000 / CHARS_PER_SEC);
    return () => clearTimeout(id);
  }, [shown, text]);
  return { shown: text.slice(0, shown), done: shown >= text.length, finish: () => setShown(text.length) };
}

/** Preferência do sistema por menos movimento (lida uma vez, na montagem). */
export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
