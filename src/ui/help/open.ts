// A AJUDA abre dentro do jogo (HelpOverlay, em App.tsx), por cima de tudo, sem sair da partida. A página separada
// (ajuda.html) continua existindo para quem tiver o link.

export const helpUrl = () => `${import.meta.env.BASE_URL}ajuda.html`;

export const HELP_EVENT = 'pokeidle:help';

export function openHelp(): void {
  window.dispatchEvent(new Event(HELP_EVENT));
}
