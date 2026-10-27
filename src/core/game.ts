// Estado do jogo e regras de alto nível. Tudo aqui é independente da interface:
// as funções mutam o `GameState` recebido e devolvem eventos para a UI animar.
// O código fica dividido em state.ts (formato e consultas), battle.ts (simulação) e
// actions.ts (ações do jogador); este arquivo é o ponto de entrada para o resto do jogo.

export * from './state';
export * from './battle';
export * from './actions';
export { dexEntry, markCaught } from './collection';
export * from './itemuse';
export {
  retarget,
  startTraining,
  stopTraining,
  trainWithDuplicate,
  trainingRate,
  trainingSlotsUnlocked,
  trainingUnlocked,
  type TrainingSlot,
} from './training';
export { raidUnlocked, type RaidState } from './raids';
export { canRematch } from './rematch';
export { addFriendship } from './friendship';
export {
  buyFromMerchant,
  incomePerHour,
  merchantUnlocked,
  sellItem,
  sellPrice,
  type MerchantOffer,
  type MerchantState,
} from './market';
export { activeMode, bestRod, canSurf, hasWater, modeEncounters, modesAt, setEncounterMode } from './water';
export { harvestTree, treeBerry, treeReady } from './berrytrees';
export { companionTick, setCompanion, type CompanionState } from './companion';
export {
  completeResearchCount,
  researchComplete,
  researchEntry,
  researchTasks,
  tasksDone,
  type DexResearchEntry,
} from './dexresearch';
export { battleForm, formsCaught, seasonAt } from './forms';
export { recordOf, weekOf, weeklyMvp } from './records';
export {
  leaveSafari,
  safariAct,
  safariCatchChance,
  safariFleeChance,
  safariUnlocked,
  startSafari,
  type SafariAction,
  type SafariState,
} from './safari';
export {
  ROUND_NAMES,
  bestPlace,
  canPlayTournament,
  playTournament,
  refreshSeason,
  tournamentUnlocked,
  type TournamentState,
} from './tournament';
