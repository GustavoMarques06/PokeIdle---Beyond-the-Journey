import { BALANCE, getSpecies, type Evolution, type TimeOfDay } from '../game-data';
import { genderOf } from './gender';
import { friendshipOf, heldOf, knownMoves, statsOf, type PokemonInstance } from './pokemon';
import { expForLevel, levelFromExp } from './stats';

export interface ExpResult {
  levelsGained: number;
  learnedMoves: string[];
  evolvedFrom?: number;
  evolvedTo?: number;
}

/**
 * EXP concedida ao derrotar um Pokémon: baseExp × nível ÷ 7, escalada pela diferença
 * de nível como na 5ª geração — farmar inimigos fracos rende cada vez menos e
 * enfrentar inimigos mais fortes rende um bônus.
 */
export function expYield(speciesId: number, level: number, isBoss: boolean, receiverLevel: number): number {
  const r = BALANCE.rewards;
  const base = (getSpecies(speciesId).baseExp * level) / 7;
  const scale = ((2 * level + 10) / (level + receiverLevel + 10)) ** 2.5;
  return Math.max(1, Math.floor(base * scale * r.expMultiplier * (isBoss ? r.bossExpMultiplier : 1)));
}

/** Moedas por vitória; também caem (de forma mais suave) contra inimigos muito mais fracos. */
export function coinYield(level: number, isBoss: boolean, receiverLevel: number): number {
  const r = BALANCE.rewards;
  const scale = Math.min(1, (2 * level + 10) / (level + receiverLevel + 10));
  return Math.max(
    1,
    Math.floor((r.coinsBase + level * r.coinsPerLevel) * scale * (isBoss ? r.bossCoinMultiplier : 1)),
  );
}

const timeMatches = (e: Evolution, period: TimeOfDay) => !e.time || e.time === period;

/** Evolução de um gênero só (Gallade, Froslass, Vespiquen). */
const genderMatches = (e: Evolution, p: PokemonInstance) => !e.gender || genderOf(p) === e.gender;

/** Pedra Eterna (na Mochila, travando) ou segurada impede evoluir. */
export const evolutionBlocked = (p: PokemonInstance) => !!p.evolutionLocked || !!heldOf(p)?.everstone;

/** Condição extra de uma evolução por nível (Hitmon*, Wurmple). */
function conditionMet(e: Extract<Evolution, { trigger: 'level' }>, p: PokemonInstance): boolean {
  if (!e.cond) return true;
  if (e.cond === 'uid-even') return p.uid % 2 === 0;
  if (e.cond === 'uid-odd') return p.uid % 2 === 1;
  const { atk, def } = statsOf(p);
  return e.cond === 'atk>def' ? atk > def : e.cond === 'def>atk' ? def > atk : atk === def;
}

export function levelEvolution(
  p: PokemonInstance,
  period: TimeOfDay = 'day',
): Extract<Evolution, { trigger: 'level' }> | undefined {
  if (evolutionBlocked(p)) return undefined;
  return getSpecies(p.speciesId).evolutions.find(
    (e): e is Extract<Evolution, { trigger: 'level' }> =>
      e.trigger === 'level' &&
      p.level >= e.minLevel &&
      timeMatches(e, period) &&
      genderMatches(e, p) &&
      conditionMet(e, p),
  );
}

export function friendshipEvolution(
  p: PokemonInstance,
  period: TimeOfDay = 'day',
): Extract<Evolution, { trigger: 'friendship' }> | undefined {
  if (evolutionBlocked(p)) return undefined;
  const friendship = friendshipOf(p);
  return getSpecies(p.speciesId).evolutions.find(
    (e): e is Extract<Evolution, { trigger: 'friendship' }> =>
      e.trigger === 'friendship' &&
      friendship >= e.minFriendship &&
      timeMatches(e, period) &&
      genderMatches(e, p),
  );
}

/** Evolução por nível ou amizade: evolui na hora (automática) ou deixa pendente. */
export function checkEvolution(
  p: PokemonInstance,
  autoEvolve: boolean,
  period: TimeOfDay = 'day',
): Pick<ExpResult, 'evolvedFrom' | 'evolvedTo'> {
  const evo = levelEvolution(p, period) ?? friendshipEvolution(p, period);
  if (!evo) return {};
  if (!autoEvolve) {
    p.pendingEvolution = evo.to;
    return {};
  }
  const evolvedFrom = p.speciesId;
  evolve(p, evo.to);
  return { evolvedFrom, evolvedTo: evo.to };
}

export function itemEvolution(
  p: PokemonInstance,
  item: string,
  period: TimeOfDay = 'day',
): number | undefined {
  return getSpecies(p.speciesId).evolutions.find(
    (e) => e.trigger === 'item' && e.item === item && timeMatches(e, period) && genderMatches(e, p),
  )?.to;
}

/** Itens que fazem a espécie evoluir (em qualquer período), para a Mochila. */
export function evolutionItemsOf(speciesId: number): { item: string; time?: TimeOfDay }[] {
  return getSpecies(speciesId).evolutions.flatMap((e) =>
    e.trigger === 'item' ? [{ item: e.item, time: e.time }] : [],
  );
}

/** Troca a espécie mantendo nível, IVs e a proporção de HP. */
export function evolve(p: PokemonInstance, to: number): void {
  const before = statsOf(p).hp;
  const ratio = before > 0 ? p.currentHp / before : 1;
  p.speciesId = to;
  p.pendingEvolution = undefined;
  // Curvas de EXP podem mudar entre estágios; recalcula o mínimo do nível atual.
  p.exp = Math.max(p.exp, expForLevel(getSpecies(to).growthRate, p.level));
  p.currentHp = Math.max(1, Math.round(statsOf(p).hp * ratio));
}

/** Aplica EXP, sobe de nível e trata evolução por nível. Muta `p`. */
export function grantExp(
  p: PokemonInstance,
  amount: number,
  autoEvolve: boolean,
  period: TimeOfDay = 'day',
): ExpResult {
  const result: ExpResult = { levelsGained: 0, learnedMoves: [] };
  if (p.level >= BALANCE.maxLevel || amount <= 0) return result;
  const species = getSpecies(p.speciesId);
  const movesBefore = knownMoves(species, p.level);
  const hpBefore = statsOf(p).hp;

  p.exp += amount;
  const newLevel = levelFromExp(species.growthRate, p.exp);
  if (newLevel > p.level) {
    result.levelsGained = newLevel - p.level;
    p.level = newLevel;
    // O HP ganho no nível é somado ao HP atual, como nos jogos.
    p.currentHp += statsOf(p).hp - hpBefore;
    result.learnedMoves = knownMoves(species, p.level).filter((m) => !movesBefore.includes(m));
  }

  return { ...result, ...checkEvolution(p, autoEvolve, period) };
}

/** Sobe o Pokémon direto para o nível `level` (Rare Candy, creche, expedições). */
export function setLevel(
  p: PokemonInstance,
  level: number,
  autoEvolve = false,
  period: TimeOfDay = 'day',
): ExpResult {
  const target = Math.min(BALANCE.maxLevel, level);
  if (target <= p.level) return { levelsGained: 0, learnedMoves: [] };
  const needed = expForLevel(getSpecies(p.speciesId).growthRate, target) - p.exp;
  return grantExp(p, Math.max(1, needed), autoEvolve, period);
}

/** Progresso (0–1) dentro do nível atual. */
export function levelProgress(p: PokemonInstance): number {
  if (p.level >= BALANCE.maxLevel) return 1;
  const rate = getSpecies(p.speciesId).growthRate;
  const cur = expForLevel(rate, p.level);
  const next = expForLevel(rate, p.level + 1);
  return Math.min(1, Math.max(0, (p.exp - cur) / Math.max(1, next - cur)));
}
