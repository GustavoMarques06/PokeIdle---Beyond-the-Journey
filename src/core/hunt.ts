// Caça ao shiny: o jogador escolhe uma espécie-alvo; ela aparece com mais frequência
// e cada encontro seguido aumenta a chance de shiny (a sequência quebra ao trocar de
// rota, de alvo ou ao ser derrotado). O Poké Radar carrega com os encontros do alvo; usado, mostra quatro moitas
// tremendo: as que tremem forte têm o alvo (a sequência sobe +5) e, com sorte, uma brilha: o próximo alvo vem shiny.

import { BALANCE } from '../game-data';
import type { GameState } from './game';
import { seededRng } from './rng';

/** Encontros com o alvo para carregar o Poké Radar. */
export const RADAR_CHARGE = 25;
export const RADAR_CHAIN = 5;
export type RadarBush = 'sparkle' | 'strong' | 'weak';

export interface HuntState {
  target: number | null;
  /** Encontros com o alvo desde que a caçada começou. */
  encounters: number;
  chain: number;
  bestChain: number;
  /** Encontros por espécie (todas as espécies, para o contador da Pokédex). */
  counts: Record<number, number>;
  /** Shinies do alvo encontrados nesta caçada e nas anteriores. */
  log: { speciesId: number; encounters: number; at: number }[];
  /** Carga do Poké Radar (0 a RADAR_CHARGE), as moitas quando está pronto e se o próximo alvo vem shiny. */
  radar?: number;
  radarBushes?: RadarBush[];
  radarShiny?: boolean;
  radarUses?: number;
}

export const emptyHunt = (): HuntState => ({
  target: null,
  encounters: 0,
  chain: 0,
  bestChain: 0,
  counts: {},
  log: [],
});

export function setHuntTarget(state: GameState, speciesId: number | null): void {
  if (speciesId !== null && !state.pokedex[speciesId]?.seen) return;
  state.hunt.target = speciesId;
  state.hunt.encounters = 0;
  state.hunt.chain = 0;
  state.hunt.radar = 0;
  state.hunt.radarBushes = undefined;
  state.hunt.radarShiny = false;
}

export function huntWeight(state: GameState, speciesId: number): number {
  return state.hunt.target === speciesId ? BALANCE.hunt.targetWeight : 1;
}

export function huntShinyMultiplier(state: GameState, speciesId: number): number {
  if (state.hunt.target !== speciesId) return 1;
  if (state.hunt.radarShiny) return 1e9; // a moita brilhante do Poké Radar
  return 1 + BALANCE.hunt.chainBonus * Math.min(state.hunt.chain, BALANCE.hunt.chainCap);
}

/** Chamado a cada encontro selvagem. */
export function recordEncounter(state: GameState, speciesId: number, shiny: boolean, now: number): void {
  const h = state.hunt;
  h.counts[speciesId] = (h.counts[speciesId] ?? 0) + 1;
  if (h.target !== speciesId) return;
  h.encounters++;
  h.chain++;
  h.bestChain = Math.max(h.bestChain, h.chain);
  h.radarShiny = false;
  if (!h.radarBushes) {
    h.radar = Math.min(RADAR_CHARGE, (h.radar ?? 0) + 1);
    if (h.radar >= RADAR_CHARGE) h.radarBushes = makeBushes(h, now);
  }
  if (shiny) {
    h.log.unshift({ speciesId, encounters: h.encounters, at: now });
    h.log = h.log.slice(0, 20);
    h.encounters = 0;
    h.chain = 0;
  }
}

export function breakChain(state: GameState): void {
  state.hunt.chain = 0;
}

/** As quatro moitas do radar: duas tremem forte (o alvo) e, com chance maior quanto maior a sequência, uma brilha. */
function makeBushes(h: HuntState, now: number): RadarBush[] {
  const rng = seededRng((now ^ (h.encounters * 2654435761)) | 0);
  const bushes: RadarBush[] = ['strong', 'strong', 'weak', 'weak'];
  if (rng.next() < Math.min(0.15, 0.03 + h.chain / 400)) bushes[0] = 'sparkle';
  for (let i = bushes.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [bushes[i], bushes[j]] = [bushes[j], bushes[i]];
  }
  return bushes;
}

export const radarReady = (state: GameState) => !!state.hunt.target && !!state.hunt.radarBushes;

/** Escolhe uma moita do Poké Radar. */
export function pickRadarBush(state: GameState, bush: number): RadarBush | null {
  const h = state.hunt;
  const pick = h.radarBushes?.[bush];
  if (!h.target || !pick) return null;
  if (pick === 'sparkle') h.radarShiny = true;
  else if (pick === 'strong') {
    h.chain += RADAR_CHAIN;
    h.bestChain = Math.max(h.bestChain, h.chain);
  }
  h.radar = 0;
  h.radarBushes = undefined;
  h.radarUses = (h.radarUses ?? 0) + 1;
  return pick;
}
