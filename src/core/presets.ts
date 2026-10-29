// Equipes salvas: o ativo, as reservas e os itens que cada um segura, guardados com um nome.
// Uma equipe pode ficar ligada a um tipo de desafio (ginásio, raide, Torre…): ao entrar nele,
// ela entra em campo sozinha, e a equipe de antes volta quando o desafio acaba.

import { BALANCE } from '../game-data';
import { busyUids, findPokemon } from './collection';
import type { GameState } from './game';
import { equipItem } from './itemuse';
import { isFallen } from './nuzlocke';
import { reservePokemon, reserveSlotsUnlocked } from './team';
import { setActive } from './actions';

/** Desafios aos quais uma equipe pode ser ligada. */
export const PRESET_USES = ['boss', 'raid', 'tower', 'tournament', 'legendary', 'ghost'] as const;
export type PresetUse = (typeof PRESET_USES)[number];

export interface TeamSnapshot {
  active: number;
  reserves: number[];
  /** Item segurado por uid na hora de salvar (quem não segurava nada fica como está). */
  held: Record<number, string>;
}

export interface TeamPreset extends TeamSnapshot {
  id: number;
  name: string;
  use?: PresetUse;
}

export const PRESET_NAME_MAX = 16;

export function snapshotTeam(state: GameState): TeamSnapshot {
  const uids = [state.activeUid, ...reservePokemon(state).map((p) => p.uid)];
  const held: Record<number, string> = {};
  for (const uid of uids) {
    const item = findPokemon(state, uid)?.held;
    if (item) held[uid] = item;
  }
  return { active: state.activeUid, reserves: uids.slice(1), held };
}

export function savePreset(state: GameState, name: string): TeamPreset | null {
  const list = (state.presets ??= []);
  if (list.length >= BALANCE.presets.max) return null;
  const preset: TeamPreset = {
    id: Math.max(0, ...list.map((p) => p.id)) + 1,
    name: name.trim().slice(0, PRESET_NAME_MAX) || `Equipe ${list.length + 1}`,
    ...snapshotTeam(state),
  };
  list.push(preset);
  return preset;
}

const presetById = (state: GameState, id: number) => state.presets?.find((p) => p.id === id);

/** Regrava a equipe salva com a equipe atual (mantém nome e desafio). */
export function updatePreset(state: GameState, id: number): boolean {
  const preset = presetById(state, id);
  if (!preset) return false;
  Object.assign(preset, snapshotTeam(state));
  return true;
}

export function renamePreset(state: GameState, id: number, name: string): void {
  const preset = presetById(state, id);
  const clean = name.trim().slice(0, PRESET_NAME_MAX);
  if (preset && clean) preset.name = clean;
}

export function deletePreset(state: GameState, id: number): void {
  state.presets = (state.presets ?? []).filter((p) => p.id !== id);
}

/** Liga a equipe a um desafio (só uma equipe por desafio); `null` desliga. */
export function setPresetUse(state: GameState, id: number, use: PresetUse | null): void {
  for (const p of state.presets ?? []) {
    if (p.id === id) {
      if (use) p.use = use;
      else delete p.use;
    } else if (use && p.use === use) delete p.use;
  }
}

/** Pode entrar na equipe agora: existe, não caiu no Nuzlocke e não está em outra atividade. */
function available(state: GameState, uid: number, team: Set<number>): boolean {
  if (!findPokemon(state, uid) || isFallen(state, uid)) return false;
  return team.has(uid) || !busyUids(state).has(uid);
}

/** Quantos membros da equipe salva não podem entrar agora (creche, expedição, apoio…). */
export function unavailableMembers(state: GameState, snap: TeamSnapshot): number {
  const team = new Set([state.activeUid, ...state.battleTeam]);
  return [snap.active, ...snap.reserves].filter((uid) => !available(state, uid, team)).length;
}

/** Põe uma equipe em campo. Quem não puder entrar fica de fora; os itens só trocam se houver estoque. */
export function applySnapshot(state: GameState, snap: TeamSnapshot): boolean {
  const team = new Set([state.activeUid, ...state.battleTeam]);
  const members = [snap.active, ...snap.reserves].filter((uid) => available(state, uid, team));
  if (!members.length) return false;
  const [active, ...reserves] = members;
  // As reservas de agora voltam para a Caixa antes, para o ativo novo não herdar a vaga delas.
  state.battleTeam = state.battleTeam.filter((uid) => uid === active);
  setActive(state, active);
  state.battleTeam = reserves.filter((uid) => uid !== state.activeUid).slice(0, reserveSlotsUnlocked(state));
  for (const uid of members) {
    const want = snap.held[uid];
    const p = findPokemon(state, uid);
    if (want && p && p.held !== want && (state.items[want] ?? 0) > 0) equipItem(state, uid, want);
  }
  return true;
}

/** Usa uma equipe salva (fora de desafios). */
export function applyPreset(state: GameState, id: number): boolean {
  const preset = presetById(state, id);
  if (!preset || state.battle.kind !== 'wild') return false;
  return applySnapshot(state, preset);
}

export const presetFor = (state: GameState, use: PresetUse) => state.presets?.find((p) => p.use === use);

/**
 * Ao entrar num desafio: põe em campo a equipe ligada a ele e guarda a equipe atual para
 * voltar depois (ver `restoreAfterChallenge`). Chamado antes de curar a equipe.
 */
export function applyChallengePreset(state: GameState, use: PresetUse): void {
  const preset = presetFor(state, use);
  if (!preset) return;
  const before = snapshotTeam(state);
  if (applySnapshot(state, preset)) state.presetReturn ??= before;
}

/** Desfaz a troca de um desafio que nem chegou a começar. */
export function undoChallengePreset(state: GameState): void {
  if (!state.presetReturn) return;
  applySnapshot(state, state.presetReturn);
  state.presetReturn = null;
}

/** De volta à rota depois de um desafio: a equipe de antes volta a campo. */
export function restoreAfterChallenge(state: GameState): void {
  if (!state.presetReturn || state.battle.kind !== 'wild') return;
  applySnapshot(state, state.presetReturn);
  state.presetReturn = null;
}
