// A AJUDA é uma página separada (ajuda.html), aberta em outra aba do navegador: fica fora do jogo, dá para
// lê-la com calma ao lado dele e funciona até com o jogo fechado.

import { isTauri } from '../../engine/storage';

export const helpUrl = () => `${import.meta.env.BASE_URL}ajuda.html`;

export function openHelp(): void {
  // No aplicativo de Windows não há abas: a página abre na mesma janela e o link "Voltar ao jogo" traz o jogo de volta.
  if (isTauri()) window.location.assign(helpUrl());
  else window.open(helpUrl(), '_blank', 'noopener');
}
