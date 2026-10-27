// Estado do jogo e regras de alto nível. Tudo aqui é independente da interface:
// as funções mutam o `GameState` recebido e devolvem eventos para a UI animar.
// O código fica dividido em state.ts (formato e consultas), battle.ts (simulação) e
// actions.ts (ações do jogador); este arquivo é o ponto de entrada para o resto do jogo.

export * from './state';
export * from './battle';
export * from './actions';
export { dexEntry, markCaught } from './collection';
