// Lendários: batalhas manuais, uma por espécie. Liberadas quando o Campeão da região
// é vencido. O lendário não pode ser derrotado (fica com 1 de HP) e só é capturado
// com bolas lançadas à mão; falhar demais o faz fugir.

import { BALANCE, LEGENDARIES, LEGENDARY_REGION_UNLOCK, type LegendaryDef } from '../game-data';
import { routeDone } from './collection';
import type { GameEvent, GameState } from './game';

export interface LegendState {
  /** Lendários já capturados (ids de espécie). */
  caught: number[];
  /** Quando cada lendário volta a aceitar um desafio (tempo real). */
  cooldowns: Record<number, number>;
}

export const emptyLegends = (): LegendState => ({ caught: [], cooldowns: {} });

export function legendaryRegionOpen(state: GameState, regionId: string): boolean {
  const unlock = LEGENDARY_REGION_UNLOCK[regionId];
  return !!unlock && routeDone(state, unlock);
}

export type LegendaryStatus = 'locked' | 'caught' | 'cooldown' | 'ready';

export function legendaryStatus(state: GameState, def: LegendaryDef, now: number): LegendaryStatus {
  if (state.legends.caught.includes(def.speciesId)) return 'caught';
  if (!legendaryRegionOpen(state, def.regionId)) return 'locked';
  return (state.legends.cooldowns[def.speciesId] ?? 0) > now ? 'cooldown' : 'ready';
}

export function legendaryDef(speciesId: number): LegendaryDef | undefined {
  return LEGENDARIES.find((l) => l.speciesId === speciesId);
}

/** Regras da batalha: lendários e quase lendários usam números diferentes. */
export function legendaryRules(speciesId: number) {
  return legendaryDef(speciesId)?.tier === 'pseudo' ? BALANCE.pseudo : BALANCE.legendary;
}

/** Fim da batalha sem captura: o lendário some por um tempo. */
export function endLegendary(
  state: GameState,
  speciesId: number,
  now: number,
  reason: 'fled' | 'defeat' | 'retreat',
  events: GameEvent[],
): void {
  state.legends.cooldowns[speciesId] = now + legendaryRules(speciesId).cooldownMinutes * 60_000;
  events.push({ type: 'legendaryEnded', speciesId, reason });
}
