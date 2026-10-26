// Recompensas da Pokédex: marcos por espécies capturadas e medalhas por tipo completo.

import { DEX_MILESTONES, SPECIES, TYPE_MEDAL_BONUS, TYPE_MEDAL_TYPES, type TypeName } from '../game-data';
import { giveItems } from './collection';
import type { GameState } from './game';

export function caughtCount(state: GameState): number {
  return Object.values(state.pokedex).filter((d) => d.caught).length;
}

export function canClaimMilestone(state: GameState, id: string): boolean {
  const def = DEX_MILESTONES.find((m) => m.id === id);
  return !!def && !state.dexClaimed.includes(id) && caughtCount(state) >= def.caught;
}

export function claimMilestone(state: GameState, id: string): boolean {
  if (!canClaimMilestone(state, id)) return false;
  const def = DEX_MILESTONES.find((m) => m.id === id)!;
  state.dexClaimed.push(id);
  state.coins += def.reward.coins ?? 0;
  state.research.points += def.reward.research ?? 0;
  giveItems(state, def.reward.items);
  return true;
}

export function claimableMilestones(state: GameState): number {
  return DEX_MILESTONES.filter((m) => canClaimMilestone(state, m.id)).length;
}

/** Bônus permanentes somados dos marcos já resgatados. */
export function dexBonuses(state: GameState): { exp: number; coins: number; capture: number; shiny: number } {
  const out = { exp: 0, coins: 0, capture: 0, shiny: 0 };
  for (const m of DEX_MILESTONES) {
    if (!state.dexClaimed.includes(m.id) || !m.bonus) continue;
    out.exp += m.bonus.exp ?? 0;
    out.coins += m.bonus.coins ?? 0;
    out.capture += m.bonus.capture ?? 0;
    out.shiny += m.bonus.shiny ?? 0;
  }
  return out;
}

const speciesByType = new Map<TypeName, number[]>(
  TYPE_MEDAL_TYPES.map((t) => [t, SPECIES.filter((s) => s.types.includes(t)).map((s) => s.id)]),
);

export function typeProgress(state: GameState): { type: TypeName; caught: number; total: number }[] {
  return TYPE_MEDAL_TYPES.map((type) => {
    const ids = speciesByType.get(type) ?? [];
    return { type, caught: ids.filter((id) => state.pokedex[id]?.caught).length, total: ids.length };
  });
}

/** Tipos com todas as espécies capturadas: golpes desse tipo causam mais dano. */
export function typeMedalBoost(state: GameState): Record<TypeName, number> {
  const out: Record<TypeName, number> = {};
  for (const p of typeProgress(state))
    if (p.total > 0 && p.caught >= p.total) out[p.type] = 1 + TYPE_MEDAL_BONUS;
  return out;
}
