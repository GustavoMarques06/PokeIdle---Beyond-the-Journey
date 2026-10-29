// Ações do jogador: trocar de rota, desafiar treinadores, trocar o ativo, comprar e evoluir.

import {
  BALANCE,
  DEPT_STORE,
  DEPT_STORE_CATALOG,
  cleanOutfit,
  getRoute,
  type DeptEntry,
  type OutfitPart,
  type PlayerAvatar,
} from '../game-data';
import { computeModifiers } from './bonuses';
import { attackInterval, combatantOf } from './combat';
import { relocateRoamer, rocketTeam } from './events';
import { breakChain } from './hunt';
import { eliteItemOf } from './loadout';
import { endLegendary, legendaryDef, legendaryStatus } from './legendary';
import { evolve, itemEvolution, setLevel } from './progression';
import { raidTeam } from './raids';
import { canRematch } from './rematch';
import { rngFrom } from './rng';
import { isFallen } from './nuzlocke';
import { healTeam, reservePokemon, reserveSlotsUnlocked } from './team';
import { endTowerRun, syncWeekly, towerUnlocked, weeklyBlocker, weeklyRule } from './tower';
import { tournamentLost } from './tournament';
import { ghostLost } from './link';
import { applyChallengePreset, undoChallengePreset } from './presets';
import {
  type BattleKind,
  type TeamMember,
  type TrainerInfo,
  type GameState,
  type GameEvent,
  freshBattle,
  activePokemon,
  canChallengeBoss,
  shopEntries,
  resolveBossTeam,
  BALLS,
} from './state';
import { pushExpEvents, recordEvolution, towerBattle } from './battle';

// ---------------------------------------------------------------------------
// Ações do jogador

export function selectRoute(state: GameState, routeId: string, now = Date.now()): void {
  if (!state.routes[routeId]?.unlocked) return;
  if (state.battle.kind === 'tower') endTowerRun(state, now, activePokemon(state).speciesId);
  if (state.battle.kind === 'legendary' && state.battle.enemy) {
    endLegendary(state, state.battle.enemy.speciesId, now, 'retreat', []);
  }
  if (routeId !== state.currentRouteId) breakChain(state);
  state.currentRouteId = routeId;
  state.battle = freshBattle(routeId);
}

function startTrainerBattle(
  state: GameState,
  routeId: string,
  kind: BattleKind,
  team: TeamMember[],
  trainer: TrainerInfo,
): void {
  state.currentRouteId = routeId;
  applyChallengePreset(state, 'boss');
  healTeam(state);
  state.battle = { ...freshBattle(routeId), kind, team, trainer };
}

export function challengeBoss(state: GameState, routeId: string): boolean {
  if (!canChallengeBoss(state, routeId)) return false;
  const boss = getRoute(routeId).boss!;
  startTrainerBattle(state, routeId, 'boss', resolveBossTeam(state, boss), {
    sprite: boss.trainer,
    name: boss.name,
    title: boss.title,
  });
  return true;
}

/** Revanche contra o chefe da rota (já vencido e com a espera cumprida). */
export function challengeRematch(state: GameState, routeId: string, now = Date.now()): boolean {
  if (state.battle.kind !== 'wild' || !canRematch(state, routeId, now)) return false;
  const boss = getRoute(routeId).boss!;
  startTrainerBattle(state, routeId, 'boss', resolveBossTeam(state, boss, true), {
    sprite: boss.trainer,
    name: boss.name,
    title: `Revanche · ${boss.title}`,
  });
  state.battle.rematch = true;
  return true;
}

export function canChallengeRaid(state: GameState): boolean {
  return !!state.raid && state.battle.kind === 'wild';
}

export function challengeRaid(state: GameState): boolean {
  if (!canChallengeRaid(state)) return false;
  const raid = state.raid!;
  applyChallengePreset(state, 'raid');
  healTeam(state);
  state.currentRouteId = raid.routeId;
  state.battle = {
    ...freshBattle(raid.routeId),
    kind: 'raid',
    team: raidTeam(raid, rngFrom(state)),
    raidMs: BALANCE.raid.timeLimitMs,
  };
  return true;
}

export function canChallengeRocket(state: GameState): boolean {
  return !!state.rocket && state.battle.kind === 'wild';
}

export function challengeRocket(state: GameState): boolean {
  if (!canChallengeRocket(state)) return false;
  const routeId = state.rocket!.routeId;
  const rng = rngFrom(state);
  const sprite = rng.next() < 0.5 ? 'rocket' : 'rocketf';
  startTrainerBattle(state, routeId, 'rocket', rocketTeam(routeId, rng), {
    sprite,
    name: 'Recruta',
    title: 'Equipe Rocket',
  });
  return true;
}

export function challengeTower(state: GameState): boolean {
  if (!towerUnlocked(state) || state.battle.kind !== 'wild') return false;
  applyChallengePreset(state, 'tower');
  healTeam(state);
  state.tower.floor = 1;
  state.battle = towerBattle(state, state.currentRouteId, 1);
  return true;
}

/** Sobe a Torre semanal: equipe do tipo da semana, andares iguais para todos. */
export function challengeWeeklyTower(state: GameState, now: number): boolean {
  if (state.battle.kind !== 'wild') return false;
  // A equipe ligada à Torre entra antes da checagem do tipo da semana; se não servir, sai de novo.
  applyChallengePreset(state, 'tower');
  if (weeklyBlocker(state, now)) {
    undoChallengePreset(state);
    return false;
  }
  syncWeekly(state, now);
  healTeam(state);
  const start = weeklyRule(now).mod.startFloor ?? 1;
  state.tower.floor = start;
  state.battle = towerBattle(state, state.currentRouteId, start, now);
  return true;
}

export function setTrainerName(state: GameState, name: string): void {
  const clean = name.trim().slice(0, 12);
  if (clean) state.trainerName = clean;
}

export function setTrainerAvatar(state: GameState, avatar: PlayerAvatar): void {
  state.trainerAvatar = avatar;
  // As cores das peças que o novo avatar também tem continuam.
  state.trainerOutfit = cleanOutfit(avatar, state.trainerOutfit);
}

/** Pinta uma peça de roupa (null = cor original). */
export function setOutfitColor(state: GameState, part: OutfitPart, color: number | null): void {
  const next = { ...state.trainerOutfit };
  if (color === null) delete next[part];
  else next[part] = color;
  state.trainerOutfit = cleanOutfit(state.trainerAvatar, next);
}

/** Desiste do desafio atual (chefe, Rocket ou Torre) e volta para a rota. */
export function retreatFromBoss(state: GameState, now = Date.now()): GameEvent[] {
  const b = state.battle;
  if (b.kind === 'wild') return [];
  const events: GameEvent[] = [];
  if (b.kind === 'tournament') {
    tournamentLost(state, events, true);
    return events;
  }
  if (b.kind === 'ghost') ghostLost(state, events);
  if (b.kind === 'tower') {
    events.push({ type: 'towerEnded', floor: endTowerRun(state, now, activePokemon(state).speciesId) });
  }
  if (b.kind === 'legendary' && b.enemy) endLegendary(state, b.enemy.speciesId, now, 'retreat', events);
  state.battle = freshBattle(b.routeId);
  return events;
}

/** FUGIR: de um selvagem, sai sem recompensa e o próximo encontro começa; de treinadores, desiste. */
export function runAway(state: GameState, now = Date.now()): GameEvent[] {
  const b = state.battle;
  if (b.kind !== 'wild') return retreatFromBoss(state, now);
  if (b.phase !== 'fighting' || !b.enemy) return [];
  const events: GameEvent[] = [{ type: 'ranAway', speciesId: b.enemy.speciesId }];
  if (b.enemy.roamer) relocateRoamer(state, rngFrom(state));
  state.battle = freshBattle(b.routeId);
  return events;
}

/** Enfrenta um lendário liberado: batalha manual, sem captura automática. */
export function challengeLegendary(state: GameState, speciesId: number, now: number): boolean {
  const def = legendaryDef(speciesId);
  if (!def || legendaryStatus(state, def, now) !== 'ready' || state.battle.kind !== 'wild') return false;
  applyChallengePreset(state, 'legendary');
  healTeam(state);
  state.battle = {
    ...freshBattle(state.currentRouteId),
    kind: 'legendary',
    team: [{ speciesId, level: def.level, boost: def.boost, held: eliteItemOf(speciesId), abilitySlot: 0 }],
  };
  return true;
}

export function setActive(state: GameState, uid: number): void {
  if (!state.collection.some((p) => p.uid === uid) || uid === state.activeUid) return;
  if (isFallen(state, uid)) return;
  if (state.daycare.uids.includes(uid) || state.expeditions.some((e) => e.uids.includes(uid))) return;
  if (state.training.slots.some((s) => s.uid === uid)) return;
  // Se o novo ativo já estava na equipe, o antigo assume a vaga dele; se veio do PC e há vaga,
  // o antigo vira o 2º da equipe (sem vaga, volta para o PC).
  const reserve = state.battleTeam.indexOf(uid);
  if (reserve >= 0) state.battleTeam[reserve] = state.activeUid;
  else if (reservePokemon(state).length < reserveSlotsUnlocked(state)) {
    state.battleTeam = [state.activeUid, ...reservePokemon(state).map((p) => p.uid)];
  }
  state.activeUid = uid;
  const b = state.battle;
  b.playerStatus = null;
  if (b.phase === 'fighting' && b.enemy) {
    const pc = combatantOf(activePokemon(state));
    b.playerTimerMs =
      attackInterval(pc.stats.spe, combatantOf(b.enemy).stats.spe) * computeModifiers(state).attackInterval;
  }
}

export function buy(state: GameState, entryId: string, qty = 1): boolean {
  const entry = shopEntries(state).find((e) => e.id === entryId);
  if (!entry) return false;
  if (entry.kind === 'upgrade') {
    if (state.upgrades.includes(entry.id) || state.coins < entry.price) return false;
    state.coins -= entry.price;
    state.upgrades.push(entry.id);
    return true;
  }
  const cost = entry.price * qty;
  if (qty <= 0 || state.coins < cost) return false;
  state.coins -= cost;
  state.items[entry.id] = (state.items[entry.id] ?? 0) + qty;
  return true;
}

// --- Loja de Departamentos ------------------------------------------------------

/** A loja aparece quando a área dela é liberada. */
export function deptStoreUnlocked(state: GameState): boolean {
  return !!state.routes[DEPT_STORE.routeId]?.unlocked;
}

/** Só se compra estando lá (na área da loja). */
export function atDeptStore(state: GameState): boolean {
  return deptStoreUnlocked(state) && state.currentRouteId === DEPT_STORE.routeId;
}

export function deptStoreEntries(state: GameState): DeptEntry[] {
  return DEPT_STORE_CATALOG.filter((e) => !(state.challenge === 'frugal' && BALLS.has(e.id)));
}

export function buyAtDeptStore(state: GameState, itemId: string, qty = 1): boolean {
  if (!atDeptStore(state) || qty <= 0) return false;
  const entry = deptStoreEntries(state).find((e) => e.id === itemId);
  if (!entry || state.coins < entry.price * qty) return false;
  state.coins -= entry.price * qty;
  state.items[itemId] = (state.items[itemId] ?? 0) + qty;
  return true;
}

export function applyEvolutionItem(state: GameState, uid: number, item: string): GameEvent[] {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || (state.items[item] ?? 0) <= 0) return [];
  const to = itemEvolution(p, item, state.env.period);
  if (!to) return [];
  state.items[item]--;
  const from = p.speciesId;
  evolve(p, to);
  const events: GameEvent[] = [];
  recordEvolution(state, to, p.shiny, events);
  events.push({ type: 'evolved', uid, from, to });
  return events;
}

export function confirmEvolution(state: GameState, uid: number): GameEvent[] {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p?.pendingEvolution) return [];
  const from = p.speciesId;
  const to = p.pendingEvolution;
  evolve(p, to);
  const events: GameEvent[] = [];
  recordEvolution(state, to, p.shiny, events);
  events.push({ type: 'evolved', uid, from, to });
  return events;
}

/** Rare Candy: +1 nível na hora. */
export function giveRareCandy(state: GameState, uid: number): GameEvent[] {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || p.level >= BALANCE.maxLevel || (state.items['rare-candy'] ?? 0) <= 0) return [];
  state.items['rare-candy']--;
  const events: GameEvent[] = [];
  const before = p.speciesId;
  pushExpEvents(
    state,
    p,
    before,
    setLevel(p, p.level + 1, state.settings.autoEvolve, state.env.period),
    events,
  );
  return events;
}

/** Pedra Eterna: trava/destrava a evolução por nível (precisa ter uma na Mochila). */
export function toggleEvolutionLock(state: GameState, uid: number): boolean {
  const p = state.collection.find((x) => x.uid === uid);
  if (!p || (!p.evolutionLocked && (state.items.everstone ?? 0) <= 0)) return false;
  p.evolutionLocked = !p.evolutionLocked;
  if (p.evolutionLocked) p.pendingEvolution = undefined;
  return true;
}
