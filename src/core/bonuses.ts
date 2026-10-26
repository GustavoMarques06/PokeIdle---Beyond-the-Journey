// Modificadores do jogador: equipe passiva, pesquisa, maestria e prestígio.
// Tudo que altera combate ou recompensas passa por `computeModifiers`.

import {
  BALANCE,
  MASTERY_BONUS_PER_LEVEL,
  MASTERY_THRESHOLDS,
  PASSIVE,
  PASSIVE_SLOTS,
  RESEARCH,
  getRoute,
  getSpecies,
  lineRoot,
  superEffectiveAgainst,
  TYPE_ROLES,
  type BonusKind,
  type BuffKind,
  type ResearchEffect,
  type TypeName,
} from '../game-data';
import type { DuelScales } from './combat';
import { dexBonuses, typeMedalBoost } from './dex';
import { environmentMoveBoost, mergeBoosts, routeWeather, type Weather } from './env';
import type { GameState } from './game';
import type { PokemonInstance } from './pokemon';

export const BONUS_KINDS: BonusKind[] = ['damage', 'defense', 'speed', 'exp', 'coins', 'capture', 'heal'];

// --- Equipe passiva --------------------------------------------------------

export function passiveSlotsUnlocked(state: GameState): number {
  return PASSIVE_SLOTS.filter((slot) => {
    const route = getRoute(slot.requiresRoute);
    const prog = state.routes[slot.requiresRoute];
    return route.boss ? prog?.bossDefeated : (prog?.kills ?? 0) >= route.killsRequired;
  }).length;
}

export function passivePokemon(state: GameState): PokemonInstance[] {
  return state.passives
    .map((uid) => state.collection.find((p) => p.uid === uid))
    .filter((p): p is PokemonInstance => !!p && p.uid !== state.activeUid)
    .slice(0, passiveSlotsUnlocked(state));
}

export function passiveKind(p: { speciesId: number }): BonusKind {
  return TYPE_ROLES[getSpecies(p.speciesId).types[0]] ?? 'coins';
}

export function passiveValue(p: { speciesId: number; level: number }): number {
  const kind = passiveKind(p);
  return PASSIVE.base[kind] + PASSIVE.perLevel[kind] * p.level;
}

export interface PassiveContribution {
  uid: number;
  speciesId: number;
  kind: BonusKind;
  /** Valor bruto do Pokémon. */
  value: number;
  /** Valor após a regra de empilhamento (antes do teto). */
  effective: number;
  /** Ignorado por repetir uma espécie já presente. */
  duplicate: boolean;
  typeTargets: TypeName[];
  typeValue: number;
}

/** Contribuição de cada passivo, com empilhamento decrescente e espécies repetidas anuladas. */
export function passiveContributions(state: GameState): PassiveContribution[] {
  const list = passivePokemon(state).map<PassiveContribution>((p) => ({
    uid: p.uid,
    speciesId: p.speciesId,
    kind: passiveKind(p),
    value: passiveValue(p),
    effective: 0,
    duplicate: false,
    typeTargets: [...new Set(getSpecies(p.speciesId).types.flatMap(superEffectiveAgainst))],
    typeValue: PASSIVE.typeAdvantage.base + PASSIVE.typeAdvantage.perLevel * p.level,
  }));

  const best = new Map<number, PassiveContribution>();
  for (const c of list) {
    const prev = best.get(c.speciesId);
    if (!prev || c.value > prev.value) best.set(c.speciesId, c);
  }
  for (const c of list) c.duplicate = best.get(c.speciesId) !== c;

  for (const kind of BONUS_KINDS) {
    const same = list.filter((c) => c.kind === kind && !c.duplicate).sort((a, b) => b.value - a.value);
    same.forEach((c, i) => (c.effective = c.value * PASSIVE.stackFalloff ** i));
  }
  return list;
}

// --- Pesquisa, maestria e prestígio ----------------------------------------------

export function researchLevel(state: GameState, id: string): number {
  return state.research.levels[id] ?? 0;
}

function researchTotal(state: GameState, effect: ResearchEffect): number {
  return RESEARCH.filter((r) => r.effect === effect).reduce(
    (sum, r) => sum + r.perLevel * researchLevel(state, r.id),
    0,
  );
}

export function prestigeLevel(state: GameState, id: string): number {
  return state.prestige.levels[id] ?? 0;
}

export function masteryLevel(points: number): number {
  let level = 0;
  while (level < MASTERY_THRESHOLDS.length && points >= MASTERY_THRESHOLDS[level]) level++;
  return level;
}

export function masteryOf(
  state: GameState,
  speciesId: number,
): { points: number; level: number; next?: number } {
  const points = state.mastery[lineRoot(speciesId)] ?? 0;
  const level = masteryLevel(points);
  return { points, level, next: MASTERY_THRESHOLDS[level] };
}

// --- Modificadores agregados -------------------------------------------------------

export interface Modifiers {
  /** Multiplicadores (1 = neutro). */
  damage: number;
  exp: number;
  coins: number;
  capture: number;
  shiny: number;
  /** Multiplicador do dano recebido (< 1 = menos dano). */
  damageTaken: number;
  /** Multiplicador do intervalo entre ataques (< 1 = mais rápido). */
  attackInterval: number;
  /** Fração do HP curada após cada vitória. */
  heal: number;
  /** Dano extra contra cada tipo defensor. */
  typeDamage: Record<TypeName, number>;
  offlineMaxHours: number;
  offlineEfficiency: number;
  /** Soma dos bônus passivos por tipo (após teto), para exibição. */
  passive: Record<BonusKind, number>;
  masteryLevel: number;
  /** Multiplicadores por tipo de golpe: clima/período (os dois lados) e medalhas (só o jogador). */
  playerMoveBoost: Record<TypeName, number>;
  enemyMoveBoost: Record<TypeName, number>;
  weather: Weather;
}

/** Valor de um bônus de berry ativo (0 se não houver). */
function buff(state: GameState, kind: BuffKind): number {
  const b = state.buffs?.[kind];
  return b && b.ms > 0 ? b.value : 0;
}

export function computeModifiers(state: GameState): Modifiers {
  const contributions = passiveContributions(state);
  const passive = Object.fromEntries(BONUS_KINDS.map((k) => [k, 0])) as Record<BonusKind, number>;
  for (const c of contributions) passive[c.kind] += c.effective;
  for (const k of BONUS_KINDS) passive[k] = Math.min(PASSIVE.caps[k], passive[k]);

  const typeDamage: Record<TypeName, number> = {};
  const byTarget = new Map<TypeName, number[]>();
  for (const c of contributions) {
    if (c.duplicate) continue;
    for (const t of c.typeTargets) byTarget.set(t, [...(byTarget.get(t) ?? []), c.typeValue]);
  }
  for (const [t, values] of byTarget) {
    values.sort((a, b) => b - a);
    const total = values.reduce((sum, v, i) => sum + v * PASSIVE.stackFalloff ** i, 0);
    typeDamage[t] = Math.min(PASSIVE.typeAdvantage.cap, total);
  }

  const active = state.collection.find((p) => p.uid === state.activeUid);
  const mastery = active ? masteryOf(state, active.speciesId).level : 0;
  const masteryBonus = mastery * MASTERY_BONUS_PER_LEVEL;
  const fortune = 0.15 * prestigeLevel(state, 'fortune');
  const dex = dexBonuses(state);
  const route = getRoute(state.battle?.routeId ?? state.currentRouteId);
  const weather = routeWeather(route, state.env);
  const envBoost = environmentMoveBoost(weather, state.env.period);

  return {
    damage:
      (1 + passive.damage) *
      (1 + 0.1 * prestigeLevel(state, 'power')) *
      (1 + masteryBonus) *
      (1 + buff(state, 'damage')),
    exp:
      (1 + passive.exp) *
      (1 + researchTotal(state, 'exp')) *
      (1 + fortune) *
      (1 + dex.exp + buff(state, 'exp')),
    coins:
      (1 + passive.coins) *
      (1 + researchTotal(state, 'coins')) *
      (1 + fortune) *
      (1 + dex.coins + buff(state, 'coins')),
    capture:
      (1 + passive.capture) *
      (1 + researchTotal(state, 'capture')) *
      (1 + dex.capture + buff(state, 'capture')) *
      (route.safari ? BALANCE.capture.safariBonus : 1),
    shiny: (1 + 0.5 * prestigeLevel(state, 'shiny')) * (1 + dex.shiny + buff(state, 'shiny')),
    damageTaken: (1 - passive.defense) * (1 - masteryBonus),
    attackInterval: 1 / ((1 + passive.speed) * (1 + buff(state, 'speed'))),
    heal: BALANCE.combat.healOnVictory + passive.heal + researchTotal(state, 'heal') + buff(state, 'heal'),
    typeDamage,
    offlineMaxHours: BALANCE.offline.maxHours + researchTotal(state, 'offlineHours'),
    offlineEfficiency: Math.min(1, BALANCE.offline.efficiency + researchTotal(state, 'offlineEfficiency')),
    passive,
    masteryLevel: mastery,
    playerMoveBoost: mergeBoosts(envBoost, typeMedalBoost(state)),
    enemyMoveBoost: envBoost,
    weather,
  };
}

/** Escalas aplicadas ao combate contra um inimigo específico. */
export function combatScales(mods: Modifiers, enemyTypes: TypeName[]): DuelScales {
  const typeBonus = Math.max(0, ...enemyTypes.map((t) => mods.typeDamage[t] ?? 0));
  return {
    playerDamage: BALANCE.combat.playerDamageScale * mods.damage * (1 + typeBonus),
    enemyDamage: BALANCE.combat.enemyDamageScale * mods.damageTaken,
    playerInterval: mods.attackInterval,
  };
}
