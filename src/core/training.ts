// Campo de Treino: o Pokémon escolhido treina um atributo em tempo real e acumula EVs,
// inclusive com o jogo fechado. Duplicatas e vitaminas dão EVs na hora.

import { BALANCE, type StatKey } from '../game-data';
import { busyUids, findPokemon, routeDone } from './collection';
import type { GameEvent, GameState } from './state';
import { addEvs, evRoom, evTotal, heldOf, statsOf, type PokemonInstance } from './pokemon';

export interface TrainingSlot {
  uid: number;
  stat: StatKey;
  /** Último instante processado. */
  at: number;
  /** Fração de EV ainda não somada. */
  carry: number;
  /** Plano de treino: os atributos em ordem; quando um enche, passa sozinho para o próximo. */
  plan?: StatKey[];
}

export interface TrainingState {
  slots: TrainingSlot[];
}

export const emptyTraining = (): TrainingState => ({ slots: [] });

export function trainingSlotsUnlocked(state: GameState): number {
  return BALANCE.training.slots.filter((routeId) => routeDone(state, routeId)).length;
}

export function trainingUnlocked(state: GameState): boolean {
  return trainingSlotsUnlocked(state) > 0;
}

/** EVs por hora do Pokémon (a Braçadeira Macho dobra). */
export function trainingRate(p: PokemonInstance): number {
  return BALANCE.training.evsPerHour * (heldOf(p)?.training ?? 1);
}

/** Soma EVs mantendo a proporção do HP atual. */
export function gainEvs(p: PokemonInstance, stat: StatKey, amount: number): number {
  const before = statsOf(p).hp;
  const gained = addEvs(p, stat, amount);
  if (gained > 0) p.currentHp += Math.max(0, statsOf(p).hp - before);
  return gained;
}

export function startTraining(state: GameState, uid: number, stat: StatKey, now: number): boolean {
  const p = findPokemon(state, uid);
  if (!p || busyUids(state).has(uid) || evRoom(p, stat) <= 0) return false;
  if (state.training.slots.length >= trainingSlotsUnlocked(state)) return false;
  state.training.slots.push({ uid, stat, at: now, carry: 0 });
  return true;
}

/** Planos prontos (distribuições comuns de EVs). */
export const TRAINING_PLANS: { id: string; name: string; stats: StatKey[] }[] = [
  { id: 'physical', name: 'Atacante físico', stats: ['atk', 'spe', 'hp'] },
  { id: 'special', name: 'Atacante especial', stats: ['spAtk', 'spe', 'hp'] },
  { id: 'tank', name: 'Tanque', stats: ['hp', 'def', 'spDef'] },
  { id: 'wall', name: 'Muralha especial', stats: ['hp', 'spDef', 'def'] },
  { id: 'bruiser', name: 'Lutador resistente', stats: ['atk', 'hp', 'def'] },
];

/** Liga (ou desliga, com null) um plano no Pokémon em treino; começa pelo primeiro atributo que ainda tem espaço. */
export function setTrainingPlan(state: GameState, uid: number, plan: StatKey[] | null): void {
  const slot = state.training.slots.find((s) => s.uid === uid);
  const p = findPokemon(state, uid);
  if (!slot || !p) return;
  if (!plan) {
    delete slot.plan;
    return;
  }
  slot.plan = [...plan];
  const first = plan.find((k) => evRoom(p, k) > 0);
  if (first) slot.stat = first;
}

export function stopTraining(state: GameState, uid: number): void {
  state.training.slots = state.training.slots.filter((s) => s.uid !== uid);
}

/** Troca o atributo treinado sem perder o que já foi acumulado. */
export function retarget(state: GameState, uid: number, stat: StatKey): void {
  const slot = state.training.slots.find((s) => s.uid === uid);
  const p = findPokemon(state, uid);
  if (slot && p && evRoom(p, stat) > 0) slot.stat = stat;
}

/** Roda `fn` e devolve quantos EVs cada Pokémon em treino ganhou durante ela. */
export function measureTraining(
  state: GameState,
  fn: () => void,
): { uid: number; speciesId: number; stat: StatKey; gained: number }[] {
  const before = state.training.slots.map((s) => {
    const p = findPokemon(state, s.uid);
    return { slot: s, total: p ? evTotal(p) : 0 };
  });
  fn();
  return before
    .map(({ slot, total }) => ({ slot, p: findPokemon(state, slot.uid), total }))
    .filter((x): x is { slot: TrainingSlot; p: PokemonInstance; total: number } => !!x.p)
    .map(({ slot, p, total }) => ({
      uid: p.uid,
      speciesId: p.speciesId,
      stat: slot.stat,
      gained: evTotal(p) - total,
    }))
    .filter((g) => g.gained > 0);
}

export function trainingTick(state: GameState, now: number, events: GameEvent[]): void {
  const maxMs = BALANCE.training.maxOfflineHours * 3_600_000;
  state.training.slots = state.training.slots.filter((slot) => {
    const p = findPokemon(state, slot.uid);
    if (!p) return false;
    const elapsed = now - slot.at;
    slot.at = now;
    if (elapsed <= 0) return true;
    const amount = (Math.min(elapsed, maxMs) / 3_600_000) * trainingRate(p) + slot.carry;
    const whole = Math.floor(amount);
    slot.carry = amount - whole;
    if (whole > 0) gainEvs(p, slot.stat, whole);
    if (evRoom(p, slot.stat) > 0) return true;
    // Com plano, passa para o próximo atributo que ainda cabe.
    const next = slot.plan?.find((k) => evRoom(p, k) > 0);
    if (next) {
      slot.stat = next;
      return true;
    }
    events.push({ type: 'trainingFull', uid: p.uid, stat: slot.stat });
    return false;
  });
}

/** Sparring: uma duplicata da mesma espécie vira EVs no atributo escolhido (e some da coleção). */
export function trainWithDuplicate(
  state: GameState,
  targetUid: number,
  dupUid: number,
  stat: StatKey,
): boolean {
  const target = findPokemon(state, targetUid);
  const dup = findPokemon(state, dupUid);
  if (!target || !dup || targetUid === dupUid || target.speciesId !== dup.speciesId) return false;
  if (busyUids(state).has(dupUid) || evRoom(target, stat) <= 0) return false;
  if (dup.held) state.items[dup.held] = (state.items[dup.held] ?? 0) + 1;
  state.collection = state.collection.filter((p) => p.uid !== dupUid);
  gainEvs(target, stat, BALANCE.training.duplicateEvs);
  return true;
}
