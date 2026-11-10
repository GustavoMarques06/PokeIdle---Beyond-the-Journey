// Lendários: batalhas manuais, liberadas quando o Campeão da região é vencido. Cada um é avistado com certos climas
// ou horas (LEGEND_WHEN) e alguns pedem uma chave (LEGEND_NEEDS: itens, Pokémon na equipe ou outros lendários já
// capturados). Um boato por dia aponta um lendário que aparece a qualquer hora e é mais fácil de capturar. Depois
// da captura ele volta (um dia depois; quase lendários, em algumas horas) para quem quiser outro exemplar, e cada
// encontro aumenta a chance de vir shiny. O lendário não pode ser derrotado (fica com 1 de HP), se enfurece abaixo
// de metade do HP e só é capturado com bolas lançadas à mão; falhar demais o faz fugir.

import {
  BALANCE,
  LEGENDARIES,
  LEGENDARY_REGION_UNLOCK,
  LEGEND_BALLS,
  LEGEND_NEEDS,
  LEGEND_WHEN,
  type LegendaryDef,
} from '../game-data';
import { routeDone } from './collection';
import { periodAt, weatherAt } from './env';
import type { GameEvent, GameState } from './game';
import { teamPokemon } from './team';

export interface LegendState {
  /** Lendários já capturados ao menos uma vez (ids de espécie, sem repetir). */
  caught: number[];
  /** Quando cada lendário volta a aceitar um desafio (tempo real). */
  cooldowns: Record<number, number>;
  /** Encontros com cada lendário (caça ao shiny: cada um aumenta a chance). */
  encounters?: Record<number, number>;
  /** Último dia em que o boato foi anunciado. */
  rumorDay?: number;
  /** O lendário do boato desse dia (fixo até o dia virar, mesmo que a equipe ou as capturas mudem). */
  rumorId?: number;
}

export const emptyLegends = (): LegendState => ({ caught: [], cooldowns: {} });

export function legendaryRegionOpen(state: GameState, regionId: string): boolean {
  const unlock = LEGENDARY_REGION_UNLOCK[regionId];
  return !!unlock && routeDone(state, unlock);
}

/** 'needs': falta a chave; 'hidden': não é o clima ou a hora dele; 'cooldown': fugiu ou acabou de ser capturado. */
export type LegendaryStatus = 'locked' | 'needs' | 'hidden' | 'cooldown' | 'ready';

/** O que ainda falta para o lendário aparecer (vazio = nada). */
export function legendaryMissing(state: GameState, speciesId: number): {
  items: string[];
  team: number[];
  caught: number[];
} {
  const need = LEGEND_NEEDS[speciesId] ?? {};
  const inTeam = new Set(teamPokemon(state).map((p) => p.speciesId));
  let caught = (need.caught ?? []).filter((id) => !state.legends.caught.includes(id));
  // Kyurem vem depois do Reshiram OU do Zekrom.
  if (speciesId === 646 && state.legends.caught.includes(644)) caught = [];
  return {
    items: (need.items ?? []).filter((id) => !(state.items[id] > 0)),
    team: (need.team ?? []).filter((id) => !inTeam.has(id)),
    caught,
  };
}

const missingAny = (m: ReturnType<typeof legendaryMissing>) => m.items.length + m.team.length + m.caught.length > 0;

/** O clima ou a hora de agora são os do lendário? (quem não tem condição está sempre por aí) */
export function legendaryInSeason(state: GameState, speciesId: number): boolean {
  const when = LEGEND_WHEN[speciesId];
  if (!when) return true;
  return !!when.weather?.includes(state.env.weather) || !!when.period?.includes(state.env.period);
}

export function legendaryStatus(state: GameState, def: LegendaryDef, now: number): LegendaryStatus {
  if (!legendaryRegionOpen(state, def.regionId)) return 'locked';
  if (missingAny(legendaryMissing(state, def.speciesId))) return 'needs';
  if ((state.legends.cooldowns[def.speciesId] ?? 0) > now) return 'cooldown';
  if (!legendaryInSeason(state, def.speciesId) && rumorOf(state, now) !== def.speciesId) return 'hidden';
  return 'ready';
}

export function legendaryDef(speciesId: number): LegendaryDef | undefined {
  return LEGENDARIES.find((l) => l.speciesId === speciesId);
}

/** Regras da batalha: lendários e quase lendários usam números diferentes. */
export function legendaryRules(speciesId: number) {
  return legendaryDef(speciesId)?.tier === 'pseudo' ? BALANCE.pseudo : BALANCE.legendary;
}

// --- Boato do dia ------------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const localDay = (now: number) => Math.floor((now - new Date(now).getTimezoneOffset() * 60_000) / DAY_MS);

/**
 * O lendário do boato de hoje: um dos que já dá para encontrar (região aberta e chave em mãos), sorteado pelo dia.
 * Hoje ele aparece a qualquer hora e fica mais fácil de capturar.
 */
export function rumorOf(state: GameState, now: number): number | undefined {
  // Depois de sorteado, o boato do dia não troca (ver updateLegends).
  if (state.legends.rumorId !== undefined && state.legends.rumorDay === localDay(now)) return state.legends.rumorId;
  return pickRumor(state, now);
}

/** Espera longa demais para o boato valer a pena (o lendário passaria o dia quase todo fora). */
const RUMOR_MAX_WAIT_MS = 6 * 3_600_000;

function pickRumor(state: GameState, now: number): number | undefined {
  const open = LEGENDARIES.filter(
    (l) =>
      l.tier !== 'pseudo' &&
      legendaryRegionOpen(state, l.regionId) &&
      !missingAny(legendaryMissing(state, l.speciesId)),
  );
  // Quem acabou de ser capturado (volta só amanhã) fica fora do sorteio, se houver outro.
  const free = open.filter((l) => (state.legends.cooldowns[l.speciesId] ?? 0) <= now + RUMOR_MAX_WAIT_MS);
  const pool = free.length ? free : open;
  if (!pool.length) return undefined;
  let h = Math.imul(localDay(now) ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  return pool[(h >>> 0) % pool.length].speciesId;
}

/** Quando o boato de hoje acaba (meia-noite local). */
export function rumorEndsAt(now: number): number {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

// --- Janelas de aparição (previsão) --------------------------------------------------------------

const SLOT_MS = BALANCE.weather.slotHours * 3_600_000;

/** A próxima virada de dia para noite (ou o contrário) depois de `t`. */
function nextPeriodTurn(t: number): number {
  const d = new Date(t);
  const hour = d.getHours();
  d.setMinutes(0, 0, 0);
  d.setHours(hour < 6 ? 6 : hour < 18 ? 18 : 30);
  return d.getTime();
}

/**
 * O lendário é avistado em algum momento entre `from` e `to`? Vale para um intervalo dentro de um mesmo bloco de
 * clima: conta o clima do bloco e o período nas duas pontas (o dia pode virar noite no meio do bloco).
 */
export function legendaryWindowOpen(speciesId: number, from: number, to: number): boolean {
  const when = LEGEND_WHEN[speciesId];
  if (!when) return true;
  if (when.weather?.includes(weatherAt(from))) return true;
  return !!when.period && (when.period.includes(periodAt(from)) || when.period.includes(periodAt(to - 1)));
}

/** Quando o lendário volta a ser avistado (procura até uma semana à frente; `now` se já está por aí). */
export function legendaryNextWindow(speciesId: number, now: number): number | undefined {
  const when = LEGEND_WHEN[speciesId];
  if (!when) return now;
  const start = Math.floor(now / SLOT_MS) * SLOT_MS;
  for (let i = 0; i < 84; i++) {
    const from = i === 0 ? now : start + i * SLOT_MS;
    const to = start + (i + 1) * SLOT_MS;
    if (!legendaryWindowOpen(speciesId, from, to)) continue;
    if (when.weather?.includes(weatherAt(from)) || when.period?.includes(periodAt(from))) return from;
    return nextPeriodTurn(from);
  }
  return undefined;
}

/** Multiplicador de shiny pela caça: +10% por encontro, até 5×. */
export function legendaryShinyBoost(state: GameState, speciesId: number): number {
  return 1 + Math.min(40, state.legends.encounters?.[speciesId] ?? 0) * 0.1;
}

/**
 * Bônus de captura só dos lendários: status no alvo (dormindo ou congelado 2,5×, os outros 1,5×, como nos jogos),
 * a bola com afinidade com ele e o boato do dia (1,5×).
 */
export function legendaryCaptureBonus(
  state: GameState,
  speciesId: number,
  ball: string,
  status: string | undefined,
  now: number,
): number {
  const st = status === 'sleep' || status === 'freeze' ? 2.5 : status ? 1.5 : 1;
  const affinity = LEGEND_BALLS[speciesId]?.[ball] ?? 1;
  const rumor = rumorOf(state, now) === speciesId ? 1.5 : 1;
  return st * affinity * rumor;
}

export function countEncounter(state: GameState, speciesId: number): void {
  const enc = (state.legends.encounters ??= {});
  enc[speciesId] = (enc[speciesId] ?? 0) + 1;
}

/** Capturado: entra na lista (uma vez) e volta a aparecer depois da espera de recaptura. */
export function legendaryCaught(state: GameState, speciesId: number, now: number): void {
  if (!state.legends.caught.includes(speciesId)) state.legends.caught.push(speciesId);
  state.legends.cooldowns[speciesId] = now + legendaryRules(speciesId).recaptureMinutes * 60_000;
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

/** A cada segundo: avisa quando um lendário volta e anuncia o boato do dia (uma vez por dia). */
export function updateLegends(state: GameState, now: number, events: GameEvent[]): void {
  for (const [id, until] of Object.entries(state.legends.cooldowns)) {
    if (until > now) continue;
    delete state.legends.cooldowns[Number(id)];
    // Só as voltas recentes avisam (ao abrir um save antigo, não chega uma pilha de avisos).
    if (now - until < 10 * 60_000) events.push({ type: 'legendaryReturned', speciesId: Number(id) });
  }
  const day = localDay(now);
  const newDay = state.legends.rumorDay !== day;
  // Sorteia uma vez por dia e guarda. Sem boato ainda (nenhuma região aberta), tenta de novo até haver um.
  if (newDay || state.legends.rumorId === undefined) {
    const rumor = pickRumor(state, now);
    // Quem acabou de abrir o save não recebe o aviso do dia de uma vez com o resto.
    const first = state.legends.rumorDay === undefined;
    state.legends.rumorDay = day;
    state.legends.rumorId = rumor;
    if (rumor !== undefined && newDay && !first) events.push({ type: 'legendRumor', speciesId: rumor });
  }
}
