import { BALANCE, getMove, getSpecies, typeEffectiveness, type TypeName } from '../game-data';
import { movesOf } from './pokemon';
import type { Rng } from './rng';
import { calcStats, type Ivs, type Stats } from './stats';

export interface Combatant {
  speciesId: number;
  level: number;
  stats: Stats;
  types: TypeName[];
  moves: string[];
  /** Multiplicador de dano por tipo de golpe (clima, noite, medalhas da Pokédex). */
  moveBoost?: Record<TypeName, number>;
}

export interface CombatantSource {
  speciesId: number;
  level: number;
  ivs: Ivs;
  /** Golpes escolhidos pelo jogador (senão, os aprendidos por nível). */
  moveset?: string[];
  /** Multiplicador de atributos (chefes de nível 100, Torre de Batalha). */
  boost?: number;
}

export function combatantOf(p: CombatantSource, moveBoost?: Record<TypeName, number>): Combatant {
  const species = getSpecies(p.speciesId);
  const base = calcStats(species, p.level, p.ivs);
  const k = p.boost ?? 1;
  const stats =
    k === 1
      ? base
      : {
          hp: Math.round(base.hp * k),
          atk: Math.round(base.atk * k),
          def: Math.round(base.def * k),
          spAtk: Math.round(base.spAtk * k),
          spDef: Math.round(base.spDef * k),
          spe: Math.round(base.spe * k),
        };
  return {
    speciesId: p.speciesId,
    level: p.level,
    stats,
    types: species.types,
    moves: movesOf(p),
    moveBoost,
  };
}

export interface DamageResult {
  moveId: string;
  damage: number;
  missed: boolean;
  crit: boolean;
  effectiveness: number;
}

/** Dano sem aleatoriedade (antes de variação, crítico e precisão). */
function baseDamage(
  attacker: Combatant,
  defender: Combatant,
  moveId: string,
  scale: number,
): { damage: number; eff: number } {
  const move = getMove(moveId);
  const [atk, def] =
    move.category === 'physical'
      ? [attacker.stats.atk, defender.stats.def]
      : [attacker.stats.spAtk, defender.stats.spDef];
  const levelFactor = (2 * attacker.level) / 5 + 2;
  const raw = (levelFactor * move.power * (atk / Math.max(1, def))) / 50 + 2;
  const stab = attacker.types.includes(move.type) ? BALANCE.combat.stab : 1;
  const eff = typeEffectiveness(move.type, defender.types);
  const boost = attacker.moveBoost?.[move.type] ?? 1;
  return { damage: raw * stab * eff * boost * scale, eff };
}

export function calcDamage(
  attacker: Combatant,
  defender: Combatant,
  moveId: string,
  rng: Rng,
  scale = 1,
): DamageResult {
  const move = getMove(moveId);
  const { damage, eff } = baseDamage(attacker, defender, moveId, scale);
  if (rng.next() * 100 >= move.accuracy) {
    return { moveId, damage: 0, missed: true, crit: false, effectiveness: eff };
  }
  const c = BALANCE.combat;
  const crit = rng.next() < c.critChance;
  const variance = c.randomMin + rng.next() * (1 - c.randomMin);
  const final = damage * variance * (crit ? c.critMultiplier : 1);
  return {
    moveId,
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
  const accuracy = getMove(moveId).accuracy / 100;
  const avgVariance = (c.randomMin + 1) / 2;
  const critFactor = 1 + c.critChance * (c.critMultiplier - 1);
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

/** Estimativa determinística de um duelo, usada no progresso offline. */
export function estimateDuel(
  player: Combatant,
  playerHp: number,
  enemy: Combatant,
  scales: DuelScales = BASE_SCALES,
): DuelEstimate {
  const enemyHp = enemy.stats.hp;
  const pDmg = expectedDamage(player, enemy, chooseMove(player, enemy), scales.playerDamage);
  const eDmg = Math.max(0.01, expectedDamage(enemy, player, chooseMove(enemy, player), scales.enemyDamage));
  const pInterval = attackInterval(player.stats.spe, enemy.stats.spe) * scales.playerInterval;
  const eInterval = attackInterval(enemy.stats.spe, player.stats.spe);
  const killMs = pDmg > 0 ? Math.ceil(enemyHp / pDmg) * pInterval : Infinity;
  const dieMs = Math.ceil(playerHp / eDmg) * eInterval;
  if (killMs <= dieMs) {
    const hitsTaken = Math.floor(killMs / eInterval);
    return {
      win: true,
      durationMs: killMs,
      hpLostFraction: Math.min(1, (hitsTaken * eDmg) / player.stats.hp),
    };
  }
  return { win: false, durationMs: dieMs, hpLostFraction: 1 };
}
