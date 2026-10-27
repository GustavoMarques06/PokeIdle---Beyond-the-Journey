// Simulação do combate em passos fixos: encontros, dano, recompensas, chefes e captura.
// As funções mutam o `GameState` recebido e devolvem eventos para a UI animar.

import {
  BALANCE,
  ROUTES,
  getRoute,
  getSpecies,
  lineRoot,
  routeIndex,
  type BuffKind,
  type Route,
  type TypeName,
} from '../game-data';
import { combatScales, computeModifiers, masteryLevel, type Modifiers } from './bonuses';
import { captureChance, rollCapture } from './capture';
import { addToCollection, dexEntry, giveItems, markCaught, unlockTm } from './collection';
import { attackInterval, calcDamage, chooseMove, combatantOf } from './combat';
import { daycareKills } from './daycare';
import { routeWeather } from './env';
import { relocateRoamer, roamerCaught } from './events';
import { breakChain, huntShinyMultiplier, huntWeight, recordEncounter } from './hunt';
import { endLegendary, legendaryDef, legendaryRules } from './legendary';
import { progressMission } from './missions';
import { beforeAction, rollAilment, statusDamage, statusInterval } from './status';
import { bestMatchup, healTeam, nextHealthyReserve, reservePokemon, switchIn } from './team';
import { isPerfect, legendaryIvs, randomIvs, rollShiny, statsOf, type PokemonInstance } from './pokemon';
import { coinYield, expYield, grantExp, type ExpResult } from './progression';
import { pickWeighted, randInt, rngFrom, type Rng } from './rng';
import type { Ivs } from './stats';
import { endTowerRun, floorTeam, isBossFloor, towerFloorCleared } from './tower';
import {
  type EnemyState,
  type StatusState,
  type BattleState,
  type GameState,
  type GameEvent,
  freshBattle,
  activePokemon,
  encounterRoute,
} from './state';

// ---------------------------------------------------------------------------
// Simulação

/** Avança o jogo `ms` milissegundos em passos fixos. */
export function advance(state: GameState, ms: number, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  const rng = rngFrom(state);
  const steps = Math.floor(ms / BALANCE.tickMs);
  // Os modificadores quase só mudam por ações do jogador; recalcula a cada 10 s simulados.
  let mods = computeModifiers(state);
  for (let i = 0; i < steps; i++) {
    if (i > 0 && i % 100 === 0) mods = computeModifiers(state);
    step(state, BALANCE.tickMs, rng, now, events, mods);
  }
  state.stats.playTimeMs += steps * BALANCE.tickMs;
  for (const [kind, b] of Object.entries(state.buffs)) {
    if (!b) continue;
    b.ms -= steps * BALANCE.tickMs;
    if (b.ms <= 0) delete state.buffs[kind as BuffKind];
  }
  return events;
}

export function step(
  state: GameState,
  dt: number,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers = computeModifiers(state),
): void {
  const b = state.battle;
  const c = BALANCE.combat;

  if (b.phase !== 'fighting') {
    b.phaseMs -= dt;
    if (b.phaseMs > 0) return;
    if (b.phase === 'defeat') {
      const p = activePokemon(state);
      healTeam(state);
      if (b.kind === 'tower') {
        events.push({ type: 'towerEnded', floor: endTowerRun(state, now, p.speciesId) });
      }
      if (b.kind !== 'wild') state.battle = freshBattle(b.routeId);
    }
    spawnEnemy(state, rng, now, events, mods);
    return;
  }

  const enemy = b.enemy!;
  if (enemy.roamer && enemy.fleeMs !== undefined) {
    enemy.fleeMs -= dt;
    if (enemy.fleeMs <= 0) {
      events.push({ type: 'roamerFled', speciesId: enemy.speciesId });
      relocateRoamer(state, rng);
      b.enemy = null;
      b.phase = 'victory';
      b.phaseMs = c.victoryDelayMs;
      return;
    }
  }

  b.playerTimerMs -= dt;
  b.enemyTimerMs -= dt;

  // Quem tiver o cronômetro mais adiantado age primeiro.
  const order: Side[] = b.playerTimerMs <= b.enemyTimerMs ? ['player', 'enemy'] : ['enemy', 'player'];
  for (const side of order) {
    const timer = side === 'player' ? b.playerTimerMs : b.enemyTimerMs;
    if (timer <= 0 && takeTurn(state, side, rng, now, events, mods)) return;
  }

  maybeAutoCapture(state, rng, now, events, mods);
}

type Side = 'player' | 'enemy';

/**
 * Uma ação de `side`: status que impede de agir, ataque, status causado no alvo e
 * dano de queimadura/veneno. Devolve true se a batalha mudou (alguém desmaiou).
 */
function takeTurn(
  state: GameState,
  side: Side,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers,
): boolean {
  const b = state.battle;
  const enemy = b.enemy!;
  const player = activePokemon(state);
  const pc = combatantOf(player, mods.playerMoveBoost);
  const ec = combatantOf(enemy, mods.enemyMoveBoost);
  pc.burned = b.playerStatus?.kind === 'burn';
  ec.burned = enemy.status?.kind === 'burn';
  const scales = combatScales(mods, ec.types);
  const isPlayer = side === 'player';
  const [self, foe] = isPlayer ? [pc, ec] : [ec, pc];
  const getStatus = (s: Side) => (s === 'player' ? b.playerStatus : enemy.status);
  const setStatus = (s: Side, st: StatusState | null) => {
    if (s === 'player') b.playerStatus = st;
    else enemy.status = st ?? undefined;
  };
  const other: Side = isPlayer ? 'enemy' : 'player';
  const status = getStatus(side);

  const interval =
    attackInterval(self.stats.spe, foe.stats.spe) *
    (isPlayer ? scales.playerInterval : 1) *
    statusInterval(status);
  if (isPlayer) b.playerTimerMs += interval;
  else b.enemyTimerMs += interval;

  const ready = beforeAction(status, rng);
  if (ready === 'skip') {
    events.push({ type: 'statusSkip', side, speciesId: self.speciesId, status: status!.kind });
    return false;
  }
  if (ready === 'cured') {
    events.push({ type: 'statusCured', side, speciesId: self.speciesId, status: status!.kind });
    setStatus(side, null);
  }

  const moveId = isPlayer ? chooseMove(pc, ec) : chooseMove(ec, pc, rng, 0.3);
  const result = calcDamage(self, foe, moveId, rng, isPlayer ? scales.playerDamage : scales.enemyDamage);
  if (!result.missed && result.damage > 0) {
    const inflicted = rollAilment(moveId, foe.types, getStatus(other), rng);
    if (inflicted) {
      setStatus(other, inflicted);
      result.status = inflicted.kind;
    }
  }
  if (isPlayer) enemy.hp = Math.max(0, enemy.hp - result.damage);
  else player.currentHp = Math.max(0, player.currentHp - result.damage);
  events.push({ type: 'attack', side, attacker: self.speciesId, target: foe.speciesId, result });
  if ((isPlayer ? enemy.hp : player.currentHp) <= 0) return onFaint(state, other, now, events, mods);

  // Queimadura e veneno ferem quem acabou de agir.
  const after = getStatus(side);
  const dot = statusDamage(after, isPlayer ? statsOf(player).hp : enemy.maxHp);
  if (dot > 0) {
    if (isPlayer) player.currentHp = Math.max(0, player.currentHp - dot);
    else enemy.hp = Math.max(0, enemy.hp - dot);
    events.push({ type: 'statusDamage', side, speciesId: self.speciesId, status: after!.kind, damage: dot });
    if ((isPlayer ? player.currentHp : enemy.hp) <= 0) return onFaint(state, side, now, events, mods);
  }
  return false;
}

/** Alguém chegou a 0 de HP. Devolve true se a batalha mudou. */
function onFaint(state: GameState, side: Side, now: number, events: GameEvent[], mods: Modifiers): boolean {
  const b = state.battle;
  if (side === 'enemy') {
    // O lendário não é derrotado: fica com 1 de HP, esperando a bola.
    if (b.kind === 'legendary') {
      b.enemy!.hp = 1;
      return false;
    }
    onEnemyFainted(state, events, mods, now);
    return true;
  }
  const player = activePokemon(state);
  const reserve = nextHealthyReserve(state);
  if (reserve) {
    switchIn(state, reserve.uid, 'fainted', events);
    resetPlayerTimer(state, mods, 0.5);
    return true;
  }
  b.phase = 'defeat';
  b.phaseMs = BALANCE.combat.defeatRecoveryMs;
  b.playerStatus = null;
  breakChain(state);
  if (b.kind === 'legendary') endLegendary(state, b.enemy!.speciesId, now, 'defeat', events);
  events.push({ type: 'playerFainted', speciesId: player.speciesId });
  return true;
}

/** Recomeça o cronômetro do jogador (troca de Pokémon ou novo inimigo). */
function resetPlayerTimer(state: GameState, mods: Modifiers, fraction: number): void {
  const b = state.battle;
  if (!b.enemy) return;
  const pc = combatantOf(activePokemon(state));
  const ec = combatantOf(b.enemy);
  b.playerTimerMs = attackInterval(pc.stats.spe, ec.stats.spe) * mods.attackInterval * fraction;
}

/** Tipos favorecidos pelo clima e pelo período nos encontros selvagens. */
function encounterTypes(state: GameState, route: Route): TypeName[] {
  const out: TypeName[] = [];
  const weather = routeWeather(route, state.env);
  if (weather === 'rain') out.push('water');
  if (weather === 'sun') out.push('fire', 'grass');
  if (weather === 'sand') out.push('rock', 'ground');
  if (state.env.period === 'night') out.push('ghost', 'dark');
  return out;
}

/** Encontros possíveis agora, com pesos ajustados por período, clima e caça shiny. */
export function currentEncounters(state: GameState, routeId: string) {
  const route = encounterRoute(getRoute(routeId));
  const timed = route.encounters.filter((e) => !e.time || e.time === state.env.period);
  const list = timed.length ? timed : route.encounters;
  const favored = encounterTypes(state, route);
  return list.map((e) => {
    const types = getSpecies(e.speciesId).types;
    const boost = types.some((t) => favored.includes(t)) ? BALANCE.weather.encounterBoost : 1;
    return { ...e, weight: e.weight * boost * huntWeight(state, e.speciesId) };
  });
}

function spawnEnemy(state: GameState, rng: Rng, now: number, events: GameEvent[], mods: Modifiers): void {
  const b = state.battle;
  const route = getRoute(b.routeId);
  let speciesId: number;
  let level: number;
  let ivs: Ivs;
  let shiny = false;
  let boost: number | undefined;
  let roamer = false;
  if (b.kind === 'legendary') {
    const member = b.team[0];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    ivs = legendaryIvs(rng, legendaryRules(speciesId).guaranteedPerfectIvs);
    shiny = rollShiny(rng, mods.shiny);
  } else if (b.kind !== 'wild') {
    const member = b.team[b.bossIndex];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    ivs = { hp: 20, atk: 20, def: 20, spAtk: 20, spDef: 20, spe: 20 };
  } else if (
    state.roamer &&
    state.roamer.routeId === encounterRoute(route).id &&
    rng.next() < BALANCE.roamers.encounterChance
  ) {
    speciesId = state.roamer.speciesId;
    level = state.roamer.level;
    ivs = randomIvs(rng);
    shiny = rollShiny(rng, mods.shiny);
    roamer = true;
  } else {
    const enc = pickWeighted(rng, currentEncounters(state, b.routeId));
    speciesId = enc.speciesId;
    level = randInt(rng, enc.minLevel, enc.maxLevel);
    ivs = randomIvs(rng);
    shiny = rollShiny(rng, mods.shiny * huntShinyMultiplier(state, speciesId));
    recordEncounter(state, speciesId, shiny, now);
  }
  const base = statsOf({ speciesId, level, ivs }).hp;
  const hpScale = roamer
    ? BALANCE.roamers.hpMultiplier
    : b.kind === 'legendary'
      ? legendaryRules(speciesId).hpMultiplier
      : 1;
  const maxHp = Math.round(base * (boost ?? 1) * hpScale);
  b.enemy = { speciesId, level, ivs, shiny, hp: maxHp, maxHp, captureAttempted: false, boost };
  if (roamer) Object.assign(b.enemy, { roamer: true, fleeMs: BALANCE.roamers.fleeMs });
  b.phase = 'fighting';
  b.playerStatus = null;
  dexEntry(state, speciesId).seen = true;
  const spawnAt = events.length;
  if (state.settings.autoSwitch) {
    const uid = bestMatchup(state, b.enemy, mods);
    if (uid !== null) switchIn(state, uid, 'matchup', events);
  }
  const pc = combatantOf(activePokemon(state));
  const ec = combatantOf(b.enemy);
  resetPlayerTimer(state, mods, 0.5);
  b.enemyTimerMs = attackInterval(ec.stats.spe, pc.stats.spe) * 0.5;
  events.splice(spawnAt, 0, {
    type: 'spawn',
    speciesId,
    level,
    shiny,
    boss: b.kind !== 'wild' && b.kind !== 'legendary',
    legendary: b.kind === 'legendary',
    roamer,
    perfect: !roamer && b.kind === 'wild' && isPerfect(ivs),
  });
}

/** Evolução concluída: Pokédex, estatísticas e missões. */
export function recordEvolution(state: GameState, to: number, shiny: boolean, events?: GameEvent[]): void {
  markCaught(state, to, shiny);
  state.stats.evolutions++;
  progressMission(state, 'evolutions', 1, events);
}

export function pushExpEvents(
  state: GameState,
  p: PokemonInstance,
  before: number,
  res: ExpResult,
  events: GameEvent[],
): void {
  if (res.levelsGained > 0) events.push({ type: 'levelUp', uid: p.uid, speciesId: before, level: p.level });
  for (const move of res.learnedMoves)
    events.push({ type: 'learnedMove', uid: p.uid, speciesId: before, move });
  if (res.evolvedTo) {
    recordEvolution(state, res.evolvedTo, p.shiny, events);
    events.push({ type: 'evolved', uid: p.uid, from: before, to: res.evolvedTo });
  }
  if (p.pendingEvolution && !res.evolvedTo) {
    events.push({ type: 'evolutionReady', uid: p.uid, speciesId: p.speciesId, to: p.pendingEvolution });
  }
}

/** Recompensas por derrotar (ou capturar) o inimigo atual. */
function onEnemyFainted(state: GameState, events: GameEvent[], mods: Modifiers, now: number): void {
  const b = state.battle;
  const enemy = b.enemy!;
  const isTrainer = b.kind !== 'wild';
  const route = getRoute(b.routeId);
  const player = activePokemon(state);

  const exp = Math.floor(expYield(enemy.speciesId, enemy.level, isTrainer, player.level) * mods.exp);
  const coins = Math.floor(coinYield(enemy.level, isTrainer, player.level) * mods.coins);
  state.coins += coins;
  state.stats.totalKills++;
  state.stats.expEarned += exp;
  state.stats.coinsEarned += coins;
  events.push({ type: 'enemyFainted', speciesId: enemy.speciesId, exp, coins });
  addMastery(state, player.speciesId, 1, events);
  const before = player.speciesId;
  pushExpEvents(
    state,
    player,
    before,
    grantExp(player, exp, state.settings.autoEvolve, state.env.period),
    events,
  );
  shareExp(state, exp, events);

  b.phase = 'victory';
  b.phaseMs = BALANCE.combat.victoryDelayMs;
  b.enemy = null;

  if (enemy.roamer) {
    // Derrotado, o errante foge para outra rota; só capturado ele sai de vez.
    if (state.roamer?.speciesId === enemy.speciesId) relocateRoamer(state, rngFrom(state));
  }

  if (isTrainer) {
    if (b.bossIndex + 1 < b.team.length) {
      b.bossIndex++;
      return;
    }
    if (b.kind === 'boss' && route.boss) return onBossDefeated(state, route, events, now);
    if (b.kind === 'rocket') return onRocketDefeated(state, events);
    if (b.kind === 'tower') return onTowerFloor(state, events);
  }

  healTeam(state, mods.heal);
  registerKills(state, route.id, 1, events);
}

/** As reservas ganham parte da EXP de cada vitória. Também usado pelo progresso offline. */
export function shareExp(state: GameState, exp: number, events: GameEvent[]): void {
  const share = Math.ceil(exp * BALANCE.team.reserveExpShare);
  if (share <= 0) return;
  for (const r of reservePokemon(state)) {
    if (r.level >= BALANCE.maxLevel) continue;
    const before = r.speciesId;
    pushExpEvents(state, r, before, grantExp(r, share, state.settings.autoEvolve, state.env.period), events);
  }
}

function onBossDefeated(state: GameState, route: Route, events: GameEvent[], now: number): void {
  const boss = route.boss!;
  const player = activePokemon(state);
  state.routes[route.id].bossDefeated = true;
  state.stats.bossWins++;
  state.coins += boss.reward.coins;
  state.stats.coinsEarned += boss.reward.coins;
  giveItems(state, boss.reward.items);
  const tm = boss.reward.tm && unlockTm(state, boss.reward.tm) ? boss.reward.tm : undefined;
  progressMission(state, 'bosses', 1, events);
  events.push({
    type: 'bossDefeated',
    routeId: route.id,
    coins: boss.reward.coins,
    items: boss.reward.items ?? {},
    tm,
    badge: boss.badge?.id,
    champion: boss.champion,
  });
  if (boss.champion) {
    const team = [
      player,
      ...reservePokemon(state),
      ...state.passives.map((uid) => state.collection.find((p) => p.uid === uid)),
    ]
      .filter((p): p is PokemonInstance => !!p)
      .map((p) => ({ speciesId: p.speciesId, level: p.level, shiny: p.shiny }));
    state.hallOfFame.push({ regionId: route.regionId, at: now, prestige: state.prestige.count, team });
    events.push({ type: 'hallOfFame', regionId: route.regionId });
  }
  unlockNext(state, route.id, events);
  healTeam(state);
  state.battle = { ...freshBattle(route.id), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
}

const ROCKET_LOOT: { weight: number; items: Record<string, number> }[] = [
  { weight: 4, items: { 'ultra-ball': 2 } },
  { weight: 3, items: { 'great-ball': 5 } },
  { weight: 2, items: { 'rare-candy': 1 } },
  { weight: 1, items: { nugget: 1 } },
];

function onRocketDefeated(state: GameState, events: GameEvent[]): void {
  const b = state.battle;
  const avg = b.team.reduce((s, m) => s + m.level, 0) / Math.max(1, b.team.length);
  const coins = Math.round(BALANCE.rocket.coins * avg);
  const loot = pickWeighted(rngFrom(state), ROCKET_LOOT).items;
  state.coins += coins;
  state.stats.coinsEarned += coins;
  giveItems(state, loot);
  state.rocket = null;
  state.stats.rocketWins++;
  progressMission(state, 'bosses', 1, events);
  events.push({ type: 'rocketDefeated', coins, items: loot });
  healTeam(state);
  state.battle = { ...freshBattle(b.routeId), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
}

function onTowerFloor(state: GameState, events: GameEvent[]): void {
  const b = state.battle;
  const floor = b.floor ?? 1;
  const points = towerFloorCleared(state, floor);
  progressMission(state, 'tower-floors', 1, events);
  events.push({ type: 'towerFloor', floor, points });
  healTeam(state, BALANCE.tower.healPerFloor);
  state.battle = {
    ...towerBattle(state, b.routeId, floor + 1),
    phase: 'victory',
    phaseMs: BALANCE.combat.victoryDelayMs * 2,
  };
}

/** Soma vitórias à maestria da linha evolutiva. Também usado pelo progresso offline. */
export function addMastery(state: GameState, speciesId: number, wins: number, events: GameEvent[]): void {
  const root = lineRoot(speciesId);
  const before = state.mastery[root] ?? 0;
  state.mastery[root] = before + wins;
  const level = masteryLevel(before + wins);
  if (level > masteryLevel(before)) events.push({ type: 'masteryUp', speciesId, level });
}

/** Soma vitórias numa rota e trata desbloqueios. Também usado pelo progresso offline. */
export function registerKills(state: GameState, routeId: string, kills: number, events: GameEvent[]): void {
  const route = getRoute(routeId);
  const prog = state.routes[routeId];
  const before = prog.kills;
  prog.kills += kills;
  if (before < route.killsRequired && prog.kills >= route.killsRequired) {
    if (route.boss) events.push({ type: 'bossAvailable', routeId });
    else unlockNext(state, routeId, events);
  }
  daycareKills(state, kills);
  progressMission(state, 'kills', kills, events);
}

function unlockNext(state: GameState, routeId: string, events: GameEvent[]): void {
  const next = ROUTES[routeIndex(routeId) + 1];
  if (next && !state.routes[next.id].unlocked) {
    state.routes[next.id].unlocked = true;
    events.push({ type: 'routeUnlocked', routeId: next.id });
  }
}

// ---------------------------------------------------------------------------
// Captura

/** Bola usada pela captura automática: Ultra Ball só para shinies e errantes. */
function bestBall(state: GameState, enemy: EnemyState): string | undefined {
  const order =
    enemy.shiny || enemy.roamer ? ['ultra-ball', 'great-ball', 'poke-ball'] : ['great-ball', 'poke-ball'];
  return order.find((ball) => (state.items[ball] ?? 0) > 0);
}

export function canThrowBall(state: GameState): boolean {
  const b = state.battle;
  return (b.kind === 'wild' || b.kind === 'legendary') && b.phase === 'fighting' && !!b.enemy;
}

/** Chance de captura do inimigo atual, já com bônus. */
export function currentCaptureChance(state: GameState, ball: string, mods = computeModifiers(state)): number {
  const enemy = state.battle.enemy;
  if (!enemy) return 0;
  const rate =
    state.battle.kind === 'legendary' && legendaryDef(enemy.speciesId)?.tier === 'pseudo'
      ? BALANCE.pseudo.captureRate
      : getSpecies(enemy.speciesId).captureRate;
  const base = captureChance(rate, enemy.hp, enemy.maxHp, ball);
  return Math.min(1, base * mods.capture);
}

export function throwBall(state: GameState, ball: string, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (!canThrowBall(state) || (state.items[ball] ?? 0) <= 0) return events;
  attemptCapture(state, ball, rngFrom(state), now, events, computeModifiers(state));
  return events;
}

function attemptCapture(
  state: GameState,
  ball: string,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers,
): void {
  const enemy = state.battle.enemy!;
  const chance = currentCaptureChance(state, ball, mods);
  state.items[ball]--;
  enemy.captureAttempted = true;
  const success = rollCapture(rng, chance);
  events.push({ type: 'captureAttempt', ball, success, speciesId: enemy.speciesId, chance });
  if (!success) {
    if (state.battle.kind === 'legendary') {
      enemy.throws = (enemy.throws ?? 0) + 1;
      if (enemy.throws >= legendaryRules(enemy.speciesId).throwLimit) {
        endLegendary(state, enemy.speciesId, now, 'fled', events);
        state.battle = freshBattle(state.battle.routeId);
      }
    }
    return;
  }

  const isNew = !dexEntry(state, enemy.speciesId).caught;
  const routeName = getRoute(state.battle.routeId).name;
  const p = addToCollection(state, enemy.speciesId, enemy.level, enemy.ivs, enemy.shiny, now, routeName);
  p.currentHp = enemy.hp > 0 ? Math.min(statsOf(p).hp, enemy.hp) : 1;
  state.stats.totalCaptures++;
  progressMission(state, 'captures', 1, events);
  progressMission(state, 'capture-type', 1, events, getSpecies(p.speciesId).types);
  if (enemy.roamer) {
    roamerCaught(state, now, rng);
    enemy.roamer = false;
  }
  events.push({
    type: 'captured',
    uid: p.uid,
    speciesId: p.speciesId,
    shiny: p.shiny,
    isNew,
    perfect: isPerfect(p.ivs),
  });
  if (state.battle.kind === 'legendary') {
    state.legends.caught.push(p.speciesId);
    events.push({ type: 'legendaryEnded', speciesId: p.speciesId, reason: 'caught' });
    const player = activePokemon(state);
    player.currentHp = statsOf(player).hp;
    state.battle = freshBattle(state.battle.routeId);
    return;
  }
  onEnemyFainted(state, events, mods, now);
}

function maybeAutoCapture(
  state: GameState,
  rng: Rng,
  now: number,
  events: GameEvent[],
  mods: Modifiers,
): void {
  const enemy = state.battle.enemy;
  if (!enemy || !state.upgrades.includes('auto-capture') || !state.settings.autoCapture) return;
  if (!canThrowBall(state) || enemy.captureAttempted || state.battle.kind === 'legendary') return;
  const dex = dexEntry(state, enemy.speciesId);
  if (dex.caught && !enemy.shiny && !enemy.roamer) return;
  if (enemy.hp / enemy.maxHp > BALANCE.capture.autoCaptureHpThreshold) return;
  const ball = bestBall(state, enemy);
  if (ball) attemptCapture(state, ball, rng, now, events, mods);
}

const TOWER_TRAINERS = ROUTES.flatMap((r) => (r.boss ? [{ sprite: r.boss.trainer, name: r.boss.name }] : []));

export function towerBattle(state: GameState, routeId: string, floor: number): BattleState {
  const rng = rngFrom(state);
  const t = TOWER_TRAINERS[Math.floor(rng.next() * TOWER_TRAINERS.length)];
  return {
    ...freshBattle(routeId),
    kind: 'tower',
    floor,
    team: floorTeam(floor, rng),
    trainer: { ...t, title: isBossFloor(floor) ? 'Cérebro da Torre' : `Andar ${floor}` },
  };
}
