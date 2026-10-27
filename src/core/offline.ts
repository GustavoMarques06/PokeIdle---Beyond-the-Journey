// Progresso offline: cálculo puro e determinístico, separado do loop visual.

import { BALANCE } from '../game-data';
import { combatScales, computeModifiers } from './bonuses';
import { combatantOf, estimateDuel } from './combat';
import { markCaught } from './collection';
import {
  activePokemon,
  addMastery,
  currentEncounters,
  freshBattle,
  registerKills,
  shareExp,
  type GameEvent,
  type GameState,
} from './game';
import { progressMission } from './missions';
import { endTowerRun } from './tower';
import { healTeam, reservePokemon } from './team';
import { coinYield, expYield, grantExp } from './progression';

export type ClockIssue = 'none' | 'backwards' | 'invalid';

export interface OfflineWindow {
  /** Tempo real desde o último save (0 quando inválido). */
  elapsedMs: number;
  /** Tempo efetivamente contabilizado (após limite e validação). */
  countedMs: number;
  clockIssue: ClockIssue;
  capped: boolean;
}

export interface OfflineReport extends OfflineWindow {
  routeId: string;
  kills: number;
  exp: number;
  coins: number;
  levelUps: { uid: number; speciesId: number; from: number; to: number }[];
  /** EXP recebida por cada reserva (metade da do ativo). */
  reserveExp: number;
  evolutions: { uid: number; from: number; to: number }[];
}

export function offlineWindow(
  savedAt: number,
  now: number,
  maxHours: number = BALANCE.offline.maxHours,
): OfflineWindow {
  const o = BALANCE.offline;
  if (!Number.isFinite(savedAt) || !Number.isFinite(now) || savedAt <= 0) {
    return { elapsedMs: 0, countedMs: 0, clockIssue: 'invalid', capped: false };
  }
  const elapsed = now - savedAt;
  if (elapsed < 0) {
    // Pequenos recuos (sincronização de horário) são ignorados sem alarde.
    const issue = -elapsed > o.clockToleranceMs ? 'backwards' : 'none';
    return { elapsedMs: 0, countedMs: 0, clockIssue: issue, capped: false };
  }
  const maxMs = maxHours * 3_600_000;
  const counted = elapsed < o.minSeconds * 1000 ? 0 : Math.min(elapsed, maxMs);
  return { elapsedMs: elapsed, countedMs: counted, clockIssue: 'none', capped: elapsed > maxMs };
}

interface RouteEstimate {
  cycleMs: number;
  winRate: number;
  expPerWin: number;
  coinsPerWin: number;
}

/** Eficiência média do Pokémon ativo na rota, ponderada pela tabela de encontros. */
export function estimateRoute(state: GameState, routeId: string): RouteEstimate {
  const c = BALANCE.combat;
  const player = activePokemon(state);
  const mods = computeModifiers(state);
  const pc = combatantOf(player, mods.playerMoveBoost);
  const avgIvs = { hp: 15, atk: 15, def: 15, spAtk: 15, spDef: 15, spe: 15 };
  let totalW = 0;
  let cycle = 0;
  let winW = 0;
  let exp = 0;
  let coins = 0;
  for (const e of currentEncounters(state, routeId)) {
    const level = Math.round((e.minLevel + e.maxLevel) / 2);
    const ec = combatantOf({ speciesId: e.speciesId, level, ivs: avgIvs }, mods.enemyMoveBoost);
    const duel = estimateDuel(pc, pc.stats.hp, ec, combatScales(mods, ec.types));
    totalW += e.weight;
    cycle +=
      e.weight * (duel.durationMs + c.spawnDelayMs + (duel.win ? c.victoryDelayMs : c.defeatRecoveryMs));
    if (duel.win) {
      winW += e.weight;
      exp += e.weight * expYield(e.speciesId, level, false, player.level) * mods.exp;
      coins += e.weight * coinYield(level, false, player.level) * mods.coins;
    }
  }
  return {
    cycleMs: cycle / totalW,
    winRate: winW / totalW,
    expPerWin: winW ? exp / winW : 0,
    coinsPerWin: winW ? coins / winW : 0,
  };
}

/** Aplica o progresso offline ao estado e devolve o relatório. Muta `state`. */
export function applyOffline(state: GameState, window: OfflineWindow): OfflineReport {
  const routeId = state.currentRouteId;
  const report: OfflineReport = {
    ...window,
    routeId,
    kills: 0,
    exp: 0,
    coins: 0,
    levelUps: [],
    evolutions: [],
    reserveExp: 0,
  };
  if (window.countedMs <= 0) return report;
  // Uma subida na Torre não continua offline.
  if (state.battle.kind === 'tower') endTowerRun(state, state.lastTimerAt, activePokemon(state).speciesId);

  const o = BALANCE.offline;
  const player = activePokemon(state);
  const startLevel = player.level;
  const startSpecies = player.speciesId;
  const reserves = reservePokemon(state).map((p) => ({ p, level: p.level, speciesId: p.speciesId }));
  const events: GameEvent[] = [];
  const chunkMs = window.countedMs / o.chunks;
  const efficiency = computeModifiers(state).offlineEfficiency;
  let carry = 0;

  for (let i = 0; i < o.chunks; i++) {
    const est = estimateRoute(state, routeId);
    if (est.winRate <= 0) break;
    const kills = (chunkMs / est.cycleMs) * est.winRate * efficiency + carry;
    const whole = Math.floor(kills);
    carry = kills - whole;
    if (whole <= 0) continue;
    const exp = Math.floor(whole * est.expPerWin);
    const coins = Math.floor(whole * est.coinsPerWin);
    const before = player.speciesId;
    const res = grantExp(player, exp, state.settings.autoEvolve, state.env.period);
    if (res.evolvedTo) {
      report.evolutions.push({ uid: player.uid, from: before, to: res.evolvedTo });
      markCaught(state, res.evolvedTo, player.shiny);
      state.stats.evolutions++;
      progressMission(state, 'evolutions', 1);
    }
    addMastery(state, before, whole, events);
    const reserveEvents: GameEvent[] = [];
    shareExp(state, exp, reserveEvents);
    for (const e of reserveEvents) {
      if (e.type === 'evolved') report.evolutions.push({ uid: e.uid, from: e.from, to: e.to });
    }
    if (reserves.length) report.reserveExp += Math.ceil(exp * BALANCE.team.reserveExpShare);
    state.coins += coins;
    state.stats.totalKills += whole;
    state.stats.expEarned += exp;
    state.stats.coinsEarned += coins;
    registerKills(state, routeId, whole, events);
    report.kills += whole;
    report.exp += exp;
    report.coins += coins;
  }

  if (player.level > startLevel) {
    report.levelUps.push({ uid: player.uid, speciesId: startSpecies, from: startLevel, to: player.level });
  }
  for (const r of reserves) {
    if (r.p.level > r.level) {
      report.levelUps.push({ uid: r.p.uid, speciesId: r.speciesId, from: r.level, to: r.p.level });
    }
  }
  healTeam(state);
  for (const [kind, b] of Object.entries(state.buffs)) {
    if (!b) continue;
    b.ms -= window.countedMs;
    if (b.ms <= 0) delete state.buffs[kind as keyof typeof state.buffs];
  }
  // O combate recomeça limpo; um chefe em andamento é abandonado.
  state.battle = freshBattle(routeId);
  return report;
}
