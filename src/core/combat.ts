import {
  BALANCE,
  getAbility,
  getHeldItem,
  getMove,
  getSpecies,
  hasAbility,
  megaOfForm,
  typeEffectiveness,
  type AbilityDef,
  type Ailment,
  type HeldItemDef,
  type StatKey,
  type TypeName,
} from '../game-data';
import { abilityInSlot, abilitySlotOf, movesOf } from './pokemon';
import type { Rng } from './rng';
import { calcStats, type Evs, type Ivs, type Stats } from './stats';

export interface Combatant {
  speciesId: number;
  level: number;
  stats: Stats;
  types: TypeName[];
  moves: string[];
  /** Multiplicador de dano por tipo de golpe (clima, noite, medalhas da Pokédex). */
  moveBoost?: Record<TypeName, number>;
  /** Queimado: golpes físicos causam menos dano. */
  burned?: boolean;
  /** Qualquer status em andamento (Brio, Escama Mágica). */
  statused?: boolean;
  ability?: AbilityDef;
  held?: HeldItemDef;
  /** HP atual ÷ HP máximo (habilidades de HP baixo/cheio). */
  hpRatio?: number;
}

export interface CombatantSource {
  speciesId: number;
  level: number;
  ivs: Ivs;
  /** Golpes escolhidos pelo jogador (senão, os aprendidos por nível). */
  moveset?: string[];
  /** Multiplicador de atributos (chefes de nível 100, Torre de Batalha). */
  boost?: number;
  nature?: string;
  evs?: Evs;
  /** Pokémon do jogador: a habilidade vem do uid; inimigos usam `abilitySlot` (padrão 0). */
  uid?: number;
  abilitySlot?: 0 | 1 | 2;
  held?: string;
  /** Forma Mega assumida em batalha (megas.ts): troca tipos e atributos base. */
  megaForm?: string;
  /** Forma do Pokémon (chefes já entram Mega Evoluídos: `form: 'mega'`). */
  form?: string;
}

export function combatantOf(p: CombatantSource, moveBoost?: Record<TypeName, number>): Combatant {
  const species = getSpecies(p.speciesId);
  const mega = megaOfForm(p.speciesId, p.megaForm ?? p.form);
  // A Mega traz a habilidade própria; fora dela vale a da espécie.
  const ability =
    mega && hasAbility(mega.ability)
      ? getAbility(mega.ability)
      : abilityInSlot(
          p.speciesId,
          p.uid !== undefined ? abilitySlotOf({ ...p, uid: p.uid }) : (p.abilitySlot ?? 0),
        );
  const held = getHeldItem(p.held);
  const base = calcStats(
    mega ? { ...species, baseStats: mega.baseStats } : species,
    p.level,
    p.ivs,
    p.nature,
    p.evs,
  );
  const k = p.boost ?? 1;
  const stats = { ...base };
  for (const key of Object.keys(stats) as StatKey[]) {
    let m = k;
    if (key !== 'hp') {
      m *= (ability.stat?.[key] ?? 1) * (held?.stat?.[key] ?? 1);
    }
    if (m !== 1) stats[key] = Math.round(base[key] * m);
  }
  return {
    speciesId: p.speciesId,
    level: p.level,
    stats,
    types: mega?.types ?? species.types,
    moves: movesOf(p),
    moveBoost,
    ability,
    held,
  };
}

export interface DamageResult {
  moveId: string;
  /** Tipo com que o golpe acertou (Pixilar e afins convertem golpes Normais). */
  moveType: TypeName;
  damage: number;
  missed: boolean;
  crit: boolean;
  effectiveness: number;
  /** Status causado no alvo por este golpe. */
  status?: Ailment;
}

/** Habilidade defensiva em vigor (o Quebra-Molde do atacante a ignora). */
const defensiveAbility = (attacker: Combatant, defender: Combatant) =>
  attacker.ability?.moldBreaker ? undefined : defender.ability;

/** Efetividade de tipo (`type`) e total, já com imunidades e resistências de habilidade. */
function effectiveness(
  attacker: Combatant,
  defender: Combatant,
  type: TypeName,
): { type: number; total: number } {
  const byType = typeEffectiveness(type, defender.types);
  const ability = defensiveAbility(attacker, defender);
  let total = byType;
  if (ability?.wonderGuard && byType <= 1) total = 0;
  if (ability?.absorb?.includes(type)) total = 0;
  const resist = ability?.resist?.[type];
  if (resist !== undefined) total *= resist;
  return { type: byType, total };
}

/** Tipo com que o golpe sai: Aerilar, Pixilar e Refrigerar convertem os golpes Normais. */
function moveTypeOf(attacker: Combatant, moveId: string): TypeName {
  const type = getMove(moveId).type;
  return (type === 'normal' ? attacker.ability?.convertNormal : undefined) ?? type;
}

/** Tipo real do golpe e efetividade contra o alvo (a mesma conta do dano). */
export function moveMatchup(
  attacker: Combatant,
  defender: Combatant,
  moveId: string,
): { type: TypeName; effectiveness: number } {
  const type = moveTypeOf(attacker, moveId);
  return { type, effectiveness: effectiveness(attacker, defender, type).total };
}

/** O golpe é anulado pela habilidade do alvo e a recuperaria (Absorção de Água etc.)? */
export function absorbedBy(attacker: Combatant, defender: Combatant, moveId: string): boolean {
  const type = getMove(moveId).type;
  return !!defensiveAbility(attacker, defender)?.absorb?.includes(type);
}

/** Dano sem aleatoriedade (antes de variação, crítico e precisão). */
function baseDamage(
  attacker: Combatant,
  defender: Combatant,
  moveId: string,
  scale: number,
): { damage: number; eff: number } {
  const move = getMove(moveId);
  const physical = move.category === 'physical';
  const ab = attacker.ability;
  const held = attacker.held;
  const defAb = defensiveAbility(attacker, defender);

  let atk = physical ? attacker.stats.atk : attacker.stats.spAtk;
  let def = physical ? defender.stats.def : defender.stats.spDef;
  if (physical && attacker.statused && ab?.guts) atk *= 1.5;
  if (physical && defender.ability?.intimidate) atk *= defender.ability.intimidate;
  if (physical && defender.statused && defender.ability?.marvelScale) def *= 1.5;

  const levelFactor = (2 * attacker.level) / 5 + 2;
  const raw = (levelFactor * move.power * (atk / Math.max(1, def))) / 50 + 2;
  // Aerilar, Pixilar e Refrigerar: golpe Normal vira de outro tipo (com bônus de mesmo tipo e +20%).
  const type = moveTypeOf(attacker, moveId);
  const converted = type !== move.type;
  const stab = attacker.types.includes(type) ? (ab?.stab ?? BALANCE.combat.stab) : 1;
  const { type: byType, total: eff } = effectiveness(attacker, defender, type);
  const boost = attacker.moveBoost?.[type] ?? 1;
  const burn = attacker.burned && physical && !ab?.guts ? BALANCE.status.burnAttackMultiplier : 1;

  let mods = converted ? 1.2 : 1;
  if (ab?.secondHit) mods *= 1 + ab.secondHit;
  if (ab?.lowHp && ab.lowHp.type === type && (attacker.hpRatio ?? 1) <= 1 / 3) mods *= ab.lowHp.mult;
  if (ab?.typeBoost?.type === type) mods *= ab.typeBoost.mult;
  if (ab?.technician && move.power <= 60) mods *= ab.technician;
  if (ab?.tintedLens && byType < 1) mods *= 2;
  if (held) {
    mods *= (held.damage ?? 1) * (physical ? (held.physical ?? 1) : (held.special ?? 1));
    if (held.type?.type === type) mods *= held.type.mult;
    if (byType > 1) mods *= held.superEffective ?? 1;
  }
  if (defAb) {
    if (byType > 1) mods *= defAb.superTaken ?? 1;
    if ((defender.hpRatio ?? 0) >= 1) mods *= defAb.fullHpTaken ?? 1;
    mods *= defAb.taken ?? 1;
  }
  return { damage: raw * stab * eff * boost * burn * mods * scale, eff };
}

/** Chance de acertar (0–100): precisão do golpe, habilidades e itens. */
function hitChance(attacker: Combatant, defender: Combatant, moveId: string): number {
  const evasion = defensiveAbility(attacker, defender)?.evasion ?? 1;
  return (
    getMove(moveId).accuracy * (attacker.ability?.accuracy ?? 1) * (attacker.held?.accuracy ?? 1) * evasion
  );
}

const critChanceOf = (attacker: Combatant) =>
  BALANCE.combat.critChance + (attacker.ability?.crit ?? 0) + (attacker.held?.crit ?? 0);

export function calcDamage(
  attacker: Combatant,
  defender: Combatant,
  moveId: string,
  rng: Rng,
  scale = 1,
): DamageResult {
  const { damage, eff } = baseDamage(attacker, defender, moveId, scale);
  const moveType = moveTypeOf(attacker, moveId);
  if (rng.next() * 100 >= hitChance(attacker, defender, moveId)) {
    return { moveId, moveType, damage: 0, missed: true, crit: false, effectiveness: eff };
  }
  const c = BALANCE.combat;
  const crit = rng.next() < critChanceOf(attacker);
  const variance = c.randomMin + rng.next() * (1 - c.randomMin);
  const final = damage * variance * (crit ? c.critMultiplier : 1);
  return {
    moveId,
    moveType,
    damage: eff === 0 ? 0 : Math.max(1, Math.floor(final)),
    missed: false,
    crit,
    effectiveness: eff,
  };
}

/** Dano médio esperado por ataque, considerando precisão, variação e crítico. */
export function expectedDamage(attacker: Combatant, defender: Combatant, moveId: string, scale = 1): number {
  const c = BALANCE.combat;
  const { damage, eff } = baseDamage(attacker, defender, moveId, scale);
  if (eff === 0) return 0;
  const accuracy = Math.min(1, hitChance(attacker, defender, moveId) / 100);
  const avgVariance = (c.randomMin + 1) / 2;
  const critFactor = 1 + critChanceOf(attacker) * (c.critMultiplier - 1);
  return Math.max(1, damage * avgVariance) * accuracy * critFactor;
}

/** Escolhe o golpe de maior dano esperado; `randomness` dá chance de um golpe aleatório. */
export function chooseMove(attacker: Combatant, defender: Combatant, rng?: Rng, randomness = 0): string {
  const moves = attacker.moves.length ? attacker.moves : ['tackle'];
  if (rng && randomness > 0 && rng.next() < randomness) {
    return moves[Math.floor(rng.next() * moves.length)];
  }
  let best = moves[0];
  let bestDmg = -1;
  for (const id of moves) {
    const d = expectedDamage(attacker, defender, id);
    if (d > bestDmg) {
      best = id;
      bestDmg = d;
    }
  }
  return best;
}

/** Intervalo entre ataques: relativo à velocidade do oponente, para funcionar em qualquer nível. */
export function attackInterval(speed: number, opponentSpeed: number): number {
  const c = BALANCE.combat;
  const ratio = (speed + opponentSpeed) / 2 / Math.max(1, speed);
  const ms = c.baseAttackIntervalMs * Math.sqrt(ratio);
  return Math.round(Math.min(c.maxAttackIntervalMs, Math.max(c.minAttackIntervalMs, ms)));
}

export interface DuelEstimate {
  win: boolean;
  /** Tempo até o fim do duelo (vitória ou derrota). */
  durationMs: number;
  /** Fração do HP do atacante perdida em caso de vitória. */
  hpLostFraction: number;
}

/** Escalas de dano/velocidade do jogador e do inimigo (ver `combatScales` em bonuses.ts). */
export interface DuelScales {
  playerDamage: number;
  enemyDamage: number;
  playerInterval: number;
}

export const BASE_SCALES: DuelScales = {
  playerDamage: BALANCE.combat.playerDamageScale,
  enemyDamage: BALANCE.combat.enemyDamageScale,
  playerInterval: 1,
};

/**
 * Estimativa determinística de um duelo, usada no progresso offline e na troca por vantagem.
 * Considera as habilidades e itens do jogador: cura por ação (Sobras, Prato de Chuva, Sino Concha),
 * recuo (Orbe da Vida), espinhos (Pele Áspera, Capacete), berry de cura e Robustez/Faixa Foco.
 */
export function estimateDuel(
  player: Combatant,
  playerHp: number,
  enemy: Combatant,
  scales: DuelScales = BASE_SCALES,
): DuelEstimate {
  const enemyHp = enemy.stats.hp;
  const playerMove = chooseMove(player, enemy);
  const enemyMove = chooseMove(enemy, player);
  const pDmg = expectedDamage(player, enemy, playerMove, scales.playerDamage);
  const eDmg = Math.max(0.01, expectedDamage(enemy, player, enemyMove, scales.enemyDamage));
  const pInterval = attackInterval(player.stats.spe, enemy.stats.spe) * scales.playerInterval;
  const eInterval = attackInterval(enemy.stats.spe, player.stats.spe);

  const maxHp = player.stats.hp;
  const ab = player.ability;
  const held = player.held;
  // Cura e recuo por ação do jogador, em HP.
  const healPerAction = ((ab?.regen ?? 0) + (held?.leftovers ?? 0)) * maxHp + (held?.shellBell ?? 0) * pDmg;
  const recoilPerAction = (held?.recoil ?? 0) * maxHp;
  const healPerMs = (healPerAction - recoilPerAction) / pInterval;
  // Espinhos só pegam golpes físicos do inimigo.
  const reflect = getMove(enemyMove).category === 'physical' ? (ab?.thorns ?? 0) + (held?.rocky ?? 0) : 0;
  const reflectPerMs = (reflect * enemyHp) / eInterval;
  // HP extra: berry de cura (uma vez) e Robustez/Faixa Foco (aguenta mais um golpe com HP cheio).
  const berry = held?.berry?.heal ? held.berry.heal * maxHp : 0;
  const survive = (ab?.sturdy || held?.sash) && playerHp >= maxHp ? eDmg : 0;
  const effectiveHp = playerHp + berry + survive;

  const simple = healPerMs === 0 && reflectPerMs === 0;
  const killMs = simple
    ? pDmg > 0
      ? Math.ceil(enemyHp / pDmg) * pInterval
      : Infinity
    : pDmg + reflectPerMs * pInterval > 0
      ? enemyHp / (pDmg / pInterval + reflectPerMs)
      : Infinity;
  const lossPerMs = eDmg / eInterval - healPerMs;
  const dieMs = simple
    ? Math.ceil(effectiveHp / eDmg) * eInterval
    : lossPerMs > 0
      ? effectiveHp / lossPerMs
      : Infinity;
  if (killMs <= dieMs) {
    const lost = simple ? Math.floor(killMs / eInterval) * eDmg : Math.max(0, killMs * lossPerMs);
    return { win: true, durationMs: killMs, hpLostFraction: Math.min(1, lost / maxHp) };
  }
  return { win: false, durationMs: dieMs, hpLostFraction: 1 };
}
