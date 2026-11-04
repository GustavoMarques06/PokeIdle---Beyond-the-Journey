// Atalhos de teclado globais. Ignorados enquanto o jogador digita num campo de texto
// ou segura Ctrl/Alt/Meta (para não roubar atalhos do navegador).

import { useEffect, useRef } from 'react';

export type HotkeyMap = Record<string, (e: KeyboardEvent) => void>;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** Normaliza a tecla: letras em minúsculas, e "Escape", "1"… como vêm. */
export function keyName(e: KeyboardEvent): string {
  return e.key.length === 1 ? e.key.toLowerCase() : e.key;
}

/** Registra atalhos enquanto o componente estiver montado. `map` pode mudar a cada render. */
export function useHotkeys(map: HotkeyMap, enabled = true): void {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.repeat || isTyping(e.target)) return;
      const fn = ref.current[keyName(e)];
      if (!fn) return;
      e.preventDefault();
      fn(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}

/** Lista exibida nas Opções. */
export const HOTKEY_HELP: [string, string][] = [
  ['1 – 9, 0', 'abrir as telas do menu (Pokémon, Pokédex, Mochila, Loja… e o PC no 0)'],
  ['H', 'abrir a AJUDA (como o jogo funciona)'],
  ['M', 'Mega Evoluir (modo manual, com a Mega Stone)'],
  ['Q', 'lançar Poké Ball'],
  ['W', 'lançar a melhor bola para a situação'],
  ['D', 'desafiar o chefe, a raide, a Equipe Rocket ou fazer a revanche'],
  ['F', 'fugir / desistir do desafio'],
  ['A', 'alternar a batalha entre automática e manual'],
  ['Esc', 'voltar ao menu de comandos da batalha'],
  ['E', 'alternar entre grama, pesca e surf (em rotas com água)'],
  ['B', 'colher a árvore de berry da rota'],
  ['P', 'tirar uma foto da batalha'],
  ['Esc', 'fechar avisos e relatórios'],
];
