// Simulação do combate em passos fixos: encontros, dano, recompensas, chefes e captura.
// As funções mutam o `GameState` recebido e devolvem eventos para a UI animar.

import {
  BALANCE,
  BALL_RULES,
  FOUND_ITEMS,
  LURE_RULES,
  RAID_LOOT,
  ROUTES,
  SPECIAL_BALLS,
  abilitiesOf,
  getMove,
  getRoute,
  getSpecies,
  lineRoot,
  routeIndex,
  type Ailment,
  type BuffKind,
  type Route,
  type TypeName,
} from '../game-data';
import { combatScales, computeModifiers, masteryLevel, type Modifiers } from './bonuses';
import { ballMultiplier, captureChance, rollCapture, type BallContext } from './capture';
import { rollGender } from './gender';
import { incenseType, repelActive, tickLures } from './lures';
import { addToCollection, dexEntry, giveItems, markCaught, unlockTm } from './collection';
import { absorbedBy, attackInterval, calcDamage, chooseMove, combatantOf } from './combat';
import { daycareKills } from './daycare';
import { routeWeather } from './env';
import { relocateRoamer, roamerCaught } from './events';
import { addFriendship, friendshipSteps } from './friendship';
import { breakChain, huntShinyMultiplier, huntWeight, recordEncounter } from './hunt';
import { endLegendary, legendaryDef, legendaryRules } from './legendary';
import { progressMission } from './missions';
import { beforeAction, canInflict, rollAilment, statusDamage, statusInterval } from './status';
import { bestMatchup, healTeam, nextHealthyReserve, reservePokemon, switchIn } from './team';
import { canCaptureHere, onNuzlockeFaint, recordNuzlockeCapture, replaceFallenActive } from './nuzlocke';
import {
  isPerfect,
  legendaryIvs,
  movesOf,
  type PokemonInstance,
  randomIvs,
  rollShiny,
  statsOf,
} from './pokemon';
import { checkEvolution, coinYield, expYield, grantExp, type ExpResult } from './progression';
import { pickWeighted, randInt, rngFrom, type Rng } from './rng';
import type { Ivs } from './stats';
import {
  endTowerRun,
  floorTeam,
  isBossFloor,
  towerFloorCleared,
  weeklyBlocker,
  weeklyFloorCleared,
  weeklyRng,
  weeklyRule,
} from './tower';
import { activeMode, modeEncounters } from './water';
import { addResearch, researchBonus } from './dexresearch';
import { battleForm, recordForm, rollForm } from './forms';
import { addMvpWin, addRecord } from './records';
import { tournamentLost, tournamentWon } from './tournament';
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
  tickLures(state, steps * BALANCE.tickMs);
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
      replaceFallenActive(state, events);
      if (b.kind === 'tower') {
        events.push({ type: 'towerEnded', floor: endTowerRun(state, now, p.speciesId) });
      }
      if (b.kind === 'tournament') tournamentLost(state, events);
      else if (b.kind !== 'wild') state.battle = freshBattle(b.routeId);
    }
    spawnEnemy(state, rng, now, events, mods);
    return;
  }
  // Modo manual: na vez do ativo, tudo para até o jogador escolher (como nos portáteis).
  if (awaitingCommand(state)) return;
  if (b.enemy) b.enemy.elapsedMs = (b.enemy.elapsedMs ?? 0) + dt;

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

  if (b.kind === 'raid') {
    b.raidMs = (b.raidMs ?? BALANCE.raid.timeLimitMs) - dt;
    if (b.raidMs <= 0) {
      events.push({ type: 'raidFailed', speciesId: enemy.speciesId });
      healTeam(state);
      state.battle = freshBattle(b.routeId);
      return;
    }
  }

  b.playerTimerMs -= dt;
  b.enemyTimerMs -= dt;

  // Quem tiver o cronômetro mais adiantado age primeiro.
  const order: Side[] = b.playerTimerMs <= b.enemyTimerMs ? ['player', 'enemy'] : ['enemy', 'player'];
  for (const side of order) {
    const timer = side === 'player' ? b.playerTimerMs : b.enemyTimerMs;
    if (side === 'player' && manualMode(state) && !b.pendingMove) continue;
    if (timer <= 0 && takeTurn(state, side, rng, now, events, mods)) return;
  }

  if (!manualMode(state)) maybeAutoCapture(state, rng, now, events, mods);
}

const manualMode = (state: GameState) => state.settings.battleMode === 'manual';

/** Modo manual: chegou a vez do ativo e a batalha espera um comando. */
export function awaitingCommand(state: GameState): boolean {
  const b = state.battle;
  return manualMode(state) && b.phase === 'fighting' && !!b.enemy && b.playerTimerMs <= 0 && !b.pendingMove;
}

/** LUTAR: o golpe que o ativo usa na próxima vez (no automático, vale só para essa vez). */
export function selectMove(state: GameState, move: string): boolean {
  const b = state.battle;
  if (b.phase !== 'fighting' || !b.enemy || !movesOf(activePokemon(state)).includes(move)) return false;
  b.pendingMove = move;
  return true;
}

/** No modo manual, lançar uma bola ou trocar de Pokémon gasta a vez do ativo. */
function spendPlayerTurn(state: GameState, mods: Modifiers): void {
  if (!manualMode(state) || state.battle.phase !== 'fighting' || !state.battle.enemy) return;
  state.battle.pendingMove = undefined;
  resetPlayerTimer(state, mods, 1);
}

/** POKéMON: põe uma reserva de pé em campo (gasta a vez). */
export function switchActive(state: GameState, uid: number): GameEvent[] {
  const b = state.battle;
  const events: GameEvent[] = [];
  const target = reservePokemon(state).find((p) => p.uid === uid);
  if (b.phase !== 'fighting' || !b.enemy || !target || target.currentHp <= 0) return events;
  const mods = computeModifiers(state);
  switchIn(state, uid, 'manual', events);
  b.pendingMove = undefined;
  resetPlayerTimer(state, mods, 1);
  return events;
}

type Side = 'player' | 'enemy';

const makeStatus = (kind: Ailment, rng: Rng): StatusState =>
  kind === 'sleep'
    ? { kind, turns: randInt(rng, BALANCE.status.sleepTurns[0], BALANCE.status.sleepTurns[1]) }
    : { kind };

/**
 * Uma ação de `side`: status que impede de agir, ataque, efeitos de habilidades e itens,
 * status causado no alvo e dano de queimadura/veneno. Devolve true se a batalha mudou
 * (alguém desmaiou).
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
  const playerMax = statsOf(player).hp;
  const pc = combatantOf(player, mods.playerMoveBoost);
  const ec = combatantOf(enemy, mods.enemyMoveBoost);
  pc.burned = b.playerStatus?.kind === 'burn';
  ec.burned = enemy.status?.kind === 'burn';
  pc.statused = !!b.playerStatus;
  ec.statused = !!enemy.status;
  pc.hpRatio = player.currentHp / playerMax;
  ec.hpRatio = enemy.hp / enemy.maxHp;
  const scales = combatScales(mods, ec.types);
  const isPlayer = side === 'player';
  const [self, foe] = isPlayer ? [pc, ec] : [ec, pc];
  const other: Side = isPlayer ? 'enemy' : 'player';

  const combatant = (s: Side) => (s === 'player' ? pc : ec);
  const getStatus = (s: Side) => (s === 'player' ? b.playerStatus : enemy.status);
  const setStatus = (s: Side, st: StatusState | null) => {
    if (s === 'player') b.playerStatus = st;
    else enemy.status = st ?? undefined;
  };
  const hp = (s: Side) => (s === 'player' ? player.currentHp : enemy.hp);
  const maxHp = (s: Side) => (s === 'player' ? playerMax : enemy.maxHp);
  const setHp = (s: Side, v: number) => {
    const clamped = Math.max(0, Math.min(maxHp(s), Math.floor(v)));
    if (s === 'player') player.currentHp = clamped;
    else enemy.hp = clamped;
  };
  const used = (s: Side): string[] => (s === 'player' ? (b.playerUsed ??= []) : (enemy.used ??= []));
  const effect = (
    s: Side,
    kind: Extract<GameEvent, { type: 'effect' }>['kind'],
    item?: string,
    amount?: number,
  ) => events.push({ type: 'effect', side: s, speciesId: combatant(s).speciesId, kind, item, amount });

  /** O item some; o do jogador é reposto da Mochila enquanto houver estoque. */
  const consumeHeld = (s: Side) => {
    if (s === 'enemy') {
      enemy.held = undefined;
      return;
    }
    const id = player.held;
    if (!id) return;
    if ((state.items[id] ?? 0) > 0) state.items[id]--;
    else player.held = undefined;
  };

  const canGetStatus = (kind: Ailment, s: Side, by: Side) =>
    canInflict(kind, combatant(s).types, getStatus(s)) &&
    (combatant(by).ability?.moldBreaker || !combatant(s).ability?.statusImmune?.includes(kind));

  const tryBerry = (s: Side, trigger: 'hp' | 'status') => {
    const item = combatant(s).held;
    const berry = item?.berry;
    let healed = 0;
    if (!item || !berry || used(s).includes('berry')) return;
    if (trigger === 'hp') {
      if (!berry.heal || hp(s) <= 0 || hp(s) / maxHp(s) > 0.5) return;
      healed = hp(s);
      setHp(s, hp(s) + Math.max(1, maxHp(s) * berry.heal));
      healed = hp(s) - healed;
    } else {
      const st = getStatus(s);
      if (!berry.cures || !st) return;
      if (berry.cures !== 'all' && !berry.cures.includes(st.kind)) return;
      setStatus(s, null);
    }
    used(s).push('berry');
    effect(s, trigger === 'hp' ? 'berry' : 'cure', item.id, healed || undefined);
    consumeHeld(s);
  };

  const inflict = (target: Side, st: StatusState, source: Side) => {
    setStatus(target, st);
    if (
      combatant(target).ability?.synchronize &&
      st.kind !== 'sleep' &&
      st.kind !== 'freeze' &&
      canGetStatus(st.kind, source, target)
    ) {
      setStatus(source, { kind: st.kind });
      effect(target, 'synchronize');
    }
    tryBerry(target, 'status');
  };

  /** Segura um golpe fatal com HP cheio (Robustez, Faixa Foco). Devolve o dano final. */
  const survive = (target: Side, damage: number, attacker: Side): number => {
    const tc = combatant(target);
    if (damage < hp(target) || hp(target) < maxHp(target)) return damage;
    if (tc.ability?.sturdy && !combatant(attacker).ability?.moldBreaker && !used(target).includes('sturdy')) {
      used(target).push('sturdy');
      effect(target, 'sturdy');
      return hp(target) - 1;
    }
    if (tc.held?.sash && !used(target).includes('sash')) {
      used(target).push('sash');
      effect(target, 'sash', tc.held.id);
      consumeHeld(target);
      return hp(target) - 1;
    }
    return damage;
  };

  // Troca de Pele: chance de curar o status antes de agir.
  if (getStatus(side) && self.ability?.shedSkin && rng.next() < self.ability.shedSkin) {
    events.push({ type: 'statusCured', side, speciesId: self.speciesId, status: getStatus(side)!.kind });
    setStatus(side, null);
  }
  const status = getStatus(side);

  const rage = isPlayer ? 0 : (enemy.rage ?? 0);
  let interval =
    attackInterval(self.stats.spe, foe.stats.spe) *
    (isPlayer ? scales.playerInterval : 1) *
    statusInterval(status) *
    (self.ability?.intervalMult ?? 1) *
    (foe.ability?.foeInterval ?? 1) *
    BALANCE.raid.rageSpeed ** rage;
  if (self.ability?.weatherSpeed && self.ability.weatherSpeed === mods.weather) interval *= 0.7;
  if (self.held?.quickClaw && rng.next() < self.held.quickClaw) interval *= 0.5;
  if (isPlayer) b.playerTimerMs += interval;
  else b.enemyTimerMs += interval;

  const ready = beforeAction(status, rng);
  if (ready === 'skip') {
    if (isPlayer) b.pendingMove = undefined;
    events.push({ type: 'statusSkip', side, speciesId: self.speciesId, status: status!.kind });
    return false;
  }
  if (ready === 'cured') {
    events.push({ type: 'statusCured', side, speciesId: self.speciesId, status: status!.kind });
    setStatus(side, null);
  }

  const picked = isPlayer ? b.pendingMove : undefined;
  if (isPlayer) b.pendingMove = undefined;
  const moveId =
    picked && pc.moves.includes(picked)
      ? picked
      : isPlayer
        ? chooseMove(pc, ec)
        : chooseMove(ec, pc, rng, 0.3);
  const move = getMove(moveId);
  const damageScale = isPlayer ? scales.playerDamage : scales.enemyDamage * BALANCE.raid.rageDamage ** rage;
  const result = calcDamage(self, foe, moveId, rng, damageScale);
  if (!result.missed && result.damage > 0) {
    result.damage = survive(other, result.damage, side);
    const inflicted = rollAilment(moveId, foe.types, getStatus(other), rng);
    if (inflicted && canGetStatus(inflicted.kind, other, side)) {
      inflict(other, inflicted, side);
      result.status = inflicted.kind;
    }
  }
  setHp(other, hp(other) - result.damage);
  events.push({ type: 'attack', side, attacker: self.speciesId, target: foe.speciesId, result });
  if (isPlayer) addRecord(player, { damage: result.damage, crits: result.crit && !result.missed ? 1 : 0 });
  if (!result.missed && result.effectiveness === 0 && absorbedBy(self, foe, moveId)) {
    const before = hp(other);
    setHp(other, before + maxHp(other) * 0.25);
    effect(other, 'absorb', undefined, hp(other) - before);
  }

  if (result.damage > 0) {
    if (self.held?.shellBell) setHp(side, hp(side) + Math.max(1, result.damage * self.held.shellBell));
    if (self.held?.recoil) setHp(side, Math.max(1, hp(side) - Math.max(1, maxHp(side) * self.held.recoil)));
  }
  if (hp(other) <= 0) return onFaint(state, other, now, events, mods);

  // O alvo sobreviveu: berry de cura, espinhos e status de contato.
  tryBerry(other, 'hp');
  if (result.damage > 0 && move.category === 'physical') {
    const reflect = (self.ability?.moldBreaker ? 0 : (foe.ability?.thorns ?? 0)) + (foe.held?.rocky ?? 0);
    if (reflect > 0) {
      setHp(side, hp(side) - Math.max(1, maxHp(side) * reflect));
      if (hp(side) <= 0) return onFaint(state, side, now, events, mods);
    }
    const contact = self.ability?.moldBreaker ? undefined : foe.ability?.contact;
    if (contact && rng.next() < contact.chance && canGetStatus(contact.ailment, side, other)) {
      inflict(side, makeStatus(contact.ailment, rng), other);
    }
  }
  if (isPlayer && b.kind === 'raid' && result.damage > 0) raidRage(enemy, events);

  // Queimadura e veneno ferem quem acabou de agir (Cura Venenosa transforma o veneno em cura).
  const after = getStatus(side);
  const dot = statusDamage(after, maxHp(side));
  if (dot > 0 && after?.kind === 'poison' && self.ability?.poisonHeal) {
    setHp(side, hp(side) + maxHp(side) * self.ability.poisonHeal);
  } else if (dot > 0) {
    setHp(side, hp(side) - dot);
    events.push({ type: 'statusDamage', side, speciesId: self.speciesId, status: after!.kind, damage: dot });
    if (hp(side) <= 0) return onFaint(state, side, now, events, mods);
  }
  const regen = (self.ability?.regen ?? 0) + (self.held?.leftovers ?? 0);
  if (regen > 0 && hp(side) > 0) setHp(side, hp(side) + Math.max(1, maxHp(side) * regen));
  return false;
}

/** Raide: o chefe fica furioso ao passar de 2/3 e de 1/3 do HP. */
function raidRage(enemy: EnemyState, events: GameEvent[]): void {
  const stage = BALANCE.raid.rageAt.filter((t) => enemy.hp / enemy.maxHp <= t).length;
  if (stage <= (enemy.rage ?? 0) || enemy.hp <= 0) return;
  enemy.rage = stage;
  enemy.status = undefined;
  events.push({ type: 'raidRage', speciesId: enemy.speciesId, stage });
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
  addFriendship(player, -BALANCE.friendship.faint);
  addRecord(player, { faints: 1 });
  const fell = onNuzlockeFaint(state, player.uid);
  const reserve = nextHealthyReserve(state);
  if (reserve) {
    switchIn(state, reserve.uid, 'fainted', events);
    if (fell) state.battleTeam = state.battleTeam.filter((uid) => uid !== player.uid);
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
  if (weather === 'hail') out.push('ice');
  if (weather === 'fog') out.push('ghost', 'psychic');
  if (state.env.period === 'night') out.push('ghost', 'dark');
  return out;
}

/** Encontros possíveis agora, com pesos ajustados por período, clima e caça shiny. */
export function currentEncounters(state: GameState, routeId: string) {
  const route = encounterRoute(getRoute(routeId));
  const water = modeEncounters(state, route.id, activeMode(state, route.id));
  const all = water ?? route.encounters;
  const timed = all.filter((e) => !e.time || e.time === state.env.period);
  const list = timed.length ? timed : all;
  const favored = encounterTypes(state, route);
  const incense = incenseType(state);
  return list.map((e) => {
    const types = getSpecies(e.speciesId).types;
    const boost = types.some((t) => favored.includes(t)) ? BALANCE.weather.encounterBoost : 1;
    const lure = incense && types.includes(incense) ? LURE_RULES.incenseWeight : 1;
    return { ...e, weight: e.weight * boost * lure * huntWeight(state, e.speciesId) };
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
  let held: string | undefined;
  let abilitySlot: 0 | 1 | 2 = 0;
  let water: EnemyState['water'];
  let form: string | undefined;
  if (b.kind === 'legendary') {
    const member = b.team[0];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    held = member.held;
    abilitySlot = member.abilitySlot ?? 0;
    ivs = legendaryIvs(rng, legendaryRules(speciesId).guaranteedPerfectIvs);
    shiny = rollShiny(rng, mods.shiny);
  } else if (b.kind === 'raid') {
    const member = b.team[0];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    held = member.held;
    abilitySlot = member.abilitySlot ?? 0;
    ivs = legendaryIvs(rng, BALANCE.raid.perfectIvs);
    shiny = rollShiny(rng, mods.shiny);
  } else if (b.kind !== 'wild') {
    const member = b.team[b.bossIndex];
    speciesId = member.speciesId;
    level = member.level;
    boost = member.boost;
    held = member.held;
    abilitySlot = member.abilitySlot ?? 0;
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
    const mode = activeMode(state, encounterRoute(route).id);
    if (mode !== 'land') water = mode;
    speciesId = enc.speciesId;
    boost = encounterRoute(route).boost;
    form = rollForm(speciesId, rng, now);
    level = repelActive(state) ? enc.maxLevel : randInt(rng, enc.minLevel, enc.maxLevel);
    ivs = randomIvs(rng);
    shiny = rollShiny(rng, mods.shiny * huntShinyMultiplier(state, speciesId));
    recordEncounter(state, speciesId, shiny, now);
    if (abilitiesOf(speciesId)[1] && rng.next() < 0.25) abilitySlot = 1;
    if (rng.next() < BALANCE.heldDropChance) held = pickWeighted(rng, FOUND_ITEMS).id;
  }
  const base = statsOf({ speciesId, level, ivs }).hp;
  const hpScale = roamer
    ? BALANCE.roamers.hpMultiplier
    : b.kind === 'legendary'
      ? legendaryRules(speciesId).hpMultiplier
      : b.kind === 'raid'
        ? BALANCE.raid.hpMultiplier
        : 1;
  const maxHp = Math.round(base * (boost ?? 1) * hpScale);
  b.enemy = {
    speciesId,
    level,
    ivs,
    shiny,
    hp: maxHp,
    maxHp,
    captureAttempted: false,
    boost,
    held,
    abilitySlot,
    water,
    form,
    gender: rollGender(speciesId, rng),
  };
  b.playerUsed = [];
  if (roamer) Object.assign(b.enemy, { roamer: true, fleeMs: BALANCE.roamers.fleeMs });
  b.phase = 'fighting';
  b.playerStatus = null;
  dexEntry(state, speciesId).seen = true;
  const spawnAt = events.length;
  if (state.settings.autoSwitch && !manualMode(state)) {
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
    boss: b.kind !== 'wild' && b.kind !== 'legendary' && b.kind !== 'raid',
    legendary: b.kind === 'legendary',
    raid: b.kind === 'raid',
    roamer,
    perfect: !roamer && b.kind === 'wild' && isPerfect(ivs),
    water,
  });
}

/** Evolução concluída: Pokédex, estatísticas e missões. */
export function recordEvolution(state: GameState, to: number, shiny: boolean, events?: GameEvent[]): void {
  markCaught(state, to, shiny);
  addResearch(state, to, { evolved: 1 }, events);
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
  if (res.levelsGained > 0) {
    addFriendship(p, BALANCE.friendship.levelUp * res.levelsGained);
    events.push({ type: 'levelUp', uid: p.uid, speciesId: before, level: p.level });
  }
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

  const exp = Math.floor(
    expYield(enemy.speciesId, enemy.level, isTrainer, player.level) *
      mods.exp *
      researchBonus(state, enemy.speciesId).exp,
  );
  const coins = Math.floor(coinYield(enemy.level, isTrainer, player.level) * mods.coins);
  state.coins += coins;
  state.stats.totalKills++;
  if (enemy.water) state.stats.waterKills++;
  state.stats.expEarned += exp;
  state.stats.coinsEarned += coins;
  events.push({ type: 'enemyFainted', speciesId: enemy.speciesId, exp, coins });
  addRecord(player, { wins: 1 });
  addMvpWin(state, player.uid, now);
  addResearch(state, enemy.speciesId, { defeated: 1, night: state.env.period === 'night' ? 1 : 0 }, events);
  // Castform do jogador lutando num clima registra a forma daquele clima.
  recordForm(
    state,
    player.speciesId,
    battleForm(player.speciesId, player.form, routeWeather(route, state.env)),
  );
  if (b.kind === 'wild' && enemy.held) {
    giveItems(state, { [enemy.held]: 1 });
    events.push({ type: 'itemFound', item: enemy.held, qty: 1 });
  }
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
  friendshipTick(state, 1, events);

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
    if (b.kind === 'boss' && route.boss) {
      return b.rematch
        ? onRematchDefeated(state, route, events, now)
        : onBossDefeated(state, route, events, now);
    }
    if (b.kind === 'raid') return onRaidDefeated(state, enemy, events, now);
    if (b.kind === 'rocket') return onRocketDefeated(state, events);
    if (b.kind === 'tower') return onTowerFloor(state, events, now);
    if (b.kind === 'tournament') return tournamentWon(state, events);
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

/**
 * Amizade por vitórias: o ativo ganha mais, as reservas e o apoio menos. Chamado a cada
 * vitória e, em bloco, no progresso offline (`totalKills` já deve incluir as `kills`).
 */
export function friendshipTick(state: GameState, kills: number, events: GameEvent[]): void {
  const f = BALANCE.friendship;
  const total = state.stats.totalKills;
  const group: [PokemonInstance[], number][] = [
    [[activePokemon(state)], friendshipSteps(total, kills, f.killsPerPoint)],
    [reservePokemon(state), friendshipSteps(total, kills, f.reserveKillsPerPoint)],
    [
      state.passives
        .map((uid) => state.collection.find((p) => p.uid === uid))
        .filter((p): p is PokemonInstance => !!p && p.uid !== state.activeUid),
      friendshipSteps(total, kills, f.passiveKillsPerPoint),
    ],
  ];
  for (const [list, steps] of group) {
    if (steps <= 0) continue;
    for (const p of list) {
      addFriendship(p, steps);
      const before = p.speciesId;
      pushExpEvents(
        state,
        p,
        before,
        {
          levelsGained: 0,
          learnedMoves: [],
          ...checkEvolution(p, state.settings.autoEvolve, state.env.period),
        },
        events,
      );
    }
  }
}

/** Vitória na raide: moedas, itens raros e uma chance de capturar o chefe (com o item dele). */
function onRaidDefeated(state: GameState, enemy: EnemyState, events: GameEvent[], now: number): void {
  const b = state.battle;
  const rng = rngFrom(state);
  const cfg = BALANCE.raid;
  const coins = Math.round(enemy.level * cfg.coinsPerLevel);
  const loot: Record<string, number> = {};
  for (let i = 0; i < 2; i++) {
    for (const [id, n] of Object.entries(pickWeighted(rng, RAID_LOOT).items)) loot[id] = (loot[id] ?? 0) + n;
  }
  state.coins += coins;
  state.stats.coinsEarned += coins;
  giveItems(state, loot);
  let caught: { uid: number; shiny: boolean; isNew: boolean } | undefined;
  if (rng.next() < cfg.catchChance) {
    const isNew = !dexEntry(state, enemy.speciesId).caught;
    const p = addToCollection(
      state,
      enemy.speciesId,
      enemy.level,
      enemy.ivs,
      enemy.shiny,
      now,
      `Raide em ${getRoute(b.routeId).name}`,
    );
    p.held = enemy.held;
    state.stats.totalCaptures++;
    progressMission(state, 'captures', 1, events);
    caught = { uid: p.uid, shiny: p.shiny, isNew };
  }
  progressMission(state, 'bosses', 1, events);
  state.stats.raidWins++;
  events.push({ type: 'raidDefeated', speciesId: enemy.speciesId, coins, items: loot, caught });
  if (state.raid) state.raid = null;
  healTeam(state);
  state.battle = { ...freshBattle(b.routeId), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
}

/** Vitória numa revanche: sem insígnia nem desbloqueios, mas com moedas e itens raros. */
function onRematchDefeated(state: GameState, route: Route, events: GameEvent[], now: number): void {
  const boss = route.boss!;
  const coins = Math.round(boss.reward.coins * BALANCE.rematch.coinMultiplier);
  const loot = pickWeighted(rngFrom(state), RAID_LOOT).items;
  state.coins += coins;
  state.stats.coinsEarned += coins;
  giveItems(state, loot);
  state.rematchAt[route.id] = now + BALANCE.rematch.cooldownHours * 3_600_000;
  state.stats.rematchWins++;
  progressMission(state, 'bosses', 1, events);
  events.push({ type: 'rematchDefeated', routeId: route.id, coins, items: loot });
  healTeam(state);
  state.battle = { ...freshBattle(route.id), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
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

function onTowerFloor(state: GameState, events: GameEvent[], now: number): void {
  const b = state.battle;
  const floor = b.floor ?? 1;
  let points = towerFloorCleared(state, floor, !b.weekly);
  if (b.weekly) points += weeklyFloorCleared(state, floor, now);
  progressMission(state, 'tower-floors', 1, events);
  events.push({ type: 'towerFloor', floor, points });
  // A semana virou ou a equipe deixou de cumprir a regra: a subida semanal termina aqui.
  if (
    b.weekly &&
    (weeklyRule(now).week !== state.tower.weekly.week || weeklyBlocker(state, now) === 'type')
  ) {
    state.tower.floor = floor + 1;
    events.push({ type: 'towerEnded', floor: endTowerRun(state, now, activePokemon(state).speciesId) });
    healTeam(state);
    state.battle = { ...freshBattle(b.routeId), phase: 'victory', phaseMs: BALANCE.combat.victoryDelayMs };
    return;
  }
  const heal = b.weekly
    ? (weeklyRule(now).mod.heal ?? BALANCE.tower.healPerFloor)
    : BALANCE.tower.healPerFloor;
  if (heal > 0) healTeam(state, heal);
  state.battle = {
    ...towerBattle(state, b.routeId, floor + 1, b.weekly ? now : undefined),
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

/**
 * Bola usada pela captura automática: a de maior efeito no momento. A Ultra Ball fica para
 * shinies e errantes; as especiais só entram quando a situação delas vale ao menos 2×.
 */
function bestBall(state: GameState, enemy: EnemyState): string | undefined {
  const special = enemy.shiny || enemy.roamer;
  const owned = (ball: string) => (state.items[ball] ?? 0) > 0;
  const candidates = [
    ...(special ? ['ultra-ball'] : []),
    'great-ball',
    'poke-ball',
    ...SPECIAL_BALLS.filter((b) => ballMultiplierNow(state, b) >= 2),
  ].filter(owned);
  return candidates.sort((a, b) => ballMultiplierNow(state, b) - ballMultiplierNow(state, a))[0];
}

export function canThrowBall(state: GameState): boolean {
  const b = state.battle;
  return (
    (b.kind === 'wild' || b.kind === 'legendary') &&
    b.phase === 'fighting' &&
    !!b.enemy &&
    canCaptureHere(state)
  );
}

const DARK_SCENES = new Set(['cave', 'icecave', 'dampcave']);

/** O que as bolas especiais olham no encontro atual (null fora de batalha). */
export function ballContext(state: GameState): BallContext | null {
  const enemy = state.battle.enemy;
  if (!enemy) return null;
  return {
    types: getSpecies(enemy.speciesId).types,
    level: enemy.level,
    dark: state.env.period === 'night' || DARK_SCENES.has(getRoute(state.battle.routeId).scene),
    caught: !!state.pokedex[enemy.speciesId]?.caught,
    elapsedMs: enemy.elapsedMs ?? 0,
  };
}

/** Multiplicador de uma bola agora (para a interface e a captura automática). */
export function ballMultiplierNow(state: GameState, ball: string): number {
  return ballMultiplier(ball, ballContext(state) ?? undefined);
}

/** Chance de captura do inimigo atual, já com bônus. */
export function currentCaptureChance(state: GameState, ball: string, mods = computeModifiers(state)): number {
  const enemy = state.battle.enemy;
  if (!enemy) return 0;
  const rate =
    state.battle.kind === 'legendary' && legendaryDef(enemy.speciesId)?.tier === 'pseudo'
      ? BALANCE.pseudo.captureRate
      : getSpecies(enemy.speciesId).captureRate;
  const base = captureChance(rate, enemy.hp, enemy.maxHp, ball, ballContext(state) ?? undefined);
  return Math.min(1, base * mods.capture * researchBonus(state, enemy.speciesId).capture);
}

export function throwBall(state: GameState, ball: string, now: number): GameEvent[] {
  const events: GameEvent[] = [];
  if (!canThrowBall(state) || (state.items[ball] ?? 0) <= 0) return events;
  const mods = computeModifiers(state);
  attemptCapture(state, ball, rngFrom(state), now, events, mods);
  spendPlayerTurn(state, mods);
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
  if (state.battle.kind === 'wild') recordNuzlockeCapture(state, state.battle.routeId);
  const routeName = getRoute(state.battle.routeId).name;
  const p = addToCollection(state, enemy.speciesId, enemy.level, enemy.ivs, enemy.shiny, now, routeName);
  p.currentHp = enemy.hp > 0 ? Math.min(statsOf(p).hp, enemy.hp) : 1;
  if (enemy.held) {
    p.held = enemy.held;
    enemy.held = undefined;
  }
  if (enemy.form) p.form = enemy.form;
  if (enemy.gender) p.gender = enemy.gender;
  p.ball = ball;
  if (ball === 'luxury-ball') p.friendship = BALL_RULES.luxuryFriendship;
  if (ball === 'heal-ball') p.currentHp = statsOf(p).hp;
  recordForm(state, p.speciesId, enemy.form ?? battleForm(p.speciesId, undefined, 'clear'));
  if (state.env.period === 'night') addResearch(state, p.speciesId, { night: 1 }, events);
  addRecord(activePokemon(state), { captures: 1 });
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
  if (!canCaptureHere(state)) return;
  if (!canThrowBall(state) || enemy.captureAttempted || state.battle.kind === 'legendary') return;
  const dex = dexEntry(state, enemy.speciesId);
  if (dex.caught && !enemy.shiny && !enemy.roamer) return;
  if (enemy.hp / enemy.maxHp > BALANCE.capture.autoCaptureHpThreshold) return;
  const ball = bestBall(state, enemy);
  if (ball) attemptCapture(state, ball, rng, now, events, mods);
}

const TOWER_TRAINERS = ROUTES.flatMap((r) => (r.boss ? [{ sprite: r.boss.trainer, name: r.boss.name }] : []));

/** Batalha de um andar. Com `weeklyAt`, usa a regra e a semente da semana desse instante. */
export function towerBattle(
  state: GameState,
  routeId: string,
  floor: number,
  weeklyAt?: number,
): BattleState {
  const rule = weeklyAt === undefined ? null : weeklyRule(weeklyAt);
  const rng = rule ? weeklyRng(rule.week, floor) : rngFrom(state);
  const t = TOWER_TRAINERS[Math.floor(rng.next() * TOWER_TRAINERS.length)];
  return {
    ...freshBattle(routeId),
    kind: 'tower',
    floor,
    team: floorTeam(floor, rng, rule?.mod.boost ?? 1),
    trainer: { ...t, title: isBossFloor(floor) ? 'Cérebro da Torre' : `Andar ${floor}` },
    ...(rule ? { weekly: true } : {}),
  };
}
