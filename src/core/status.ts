// Efeitos de status: queimadura, veneno, paralisia, sono e congelamento. Funções puras
// usadas pelo combate (battle.ts); o status fica em `EnemyState.status` e `BattleState.playerStatus`.

import { BALANCE, getMove, type Ailment, type TypeName } from '../game-data';
import { randInt, type Rng } from './rng';
import type { StatusState } from './state';

/** Tipos imunes a cada status, como nos jogos. */
const IMMUNE: Record<Ailment, TypeName[]> = {
  burn: ['fire'],
  poison: ['poison', 'steel'],
  paralysis: ['electric'],
  freeze: ['ice'],
  sleep: [],
};

export function canInflict(ailment: Ailment, types: TypeName[], current?: StatusState | null): boolean {
  return !current && !IMMUNE[ailment].some((t) => types.includes(t));
}

/** Sorteia o status causado por um golpe que acertou (null se nenhum). */
export function rollAilment(
  moveId: string,
  targetTypes: TypeName[],
  current: StatusState | null | undefined,
  rng: Rng,
): StatusState | null {
  const move = getMove(moveId);
  if (!move.ailment || !move.ailmentChance || !canInflict(move.ailment, targetTypes, current)) return null;
  if (rng.next() * 100 >= move.ailmentChance * BALANCE.status.chanceScale) return null;
  if (move.ailment === 'sleep') {
    const [min, max] = BALANCE.status.sleepTurns;
    return { kind: 'sleep', turns: randInt(rng, min, max) };
  }
  return { kind: move.ailment };
}

/**
 * Antes de agir: 'skip' perde a vez, 'cured' acordou/descongelou (e age), 'act' age normalmente.
 * Muta o contador de sono.
 */
export function beforeAction(status: StatusState | null | undefined, rng: Rng): 'act' | 'skip' | 'cured' {
  if (!status) return 'act';
  const s = BALANCE.status;
  switch (status.kind) {
    case 'sleep':
      if ((status.turns ?? 0) <= 0) return 'cured';
      status.turns = (status.turns ?? 1) - 1;
      return 'skip';
    case 'freeze':
      return rng.next() < s.thawChance ? 'cured' : 'skip';
    case 'paralysis':
      return rng.next() < s.paralysisSkipChance ? 'skip' : 'act';
    default:
      return 'act';
  }
}

/** Dano de queimadura/veneno depois de cada ação (0 nos demais). */
export function statusDamage(status: StatusState | null | undefined, maxHp: number): number {
  if (status?.kind === 'burn') return Math.max(1, Math.floor(maxHp * BALANCE.status.burnDamage));
  if (status?.kind === 'poison') return Math.max(1, Math.floor(maxHp * BALANCE.status.poisonDamage));
  return 0;
}

/** Multiplicador do intervalo entre ataques (paralisia deixa mais lento). */
export function statusInterval(status: StatusState | null | undefined): number {
  return status?.kind === 'paralysis' ? BALANCE.status.paralysisIntervalMultiplier : 1;
}
