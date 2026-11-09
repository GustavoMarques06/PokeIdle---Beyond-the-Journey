// Golpes de apoio: sem dano, causam status, aumentam atributos ou curam. Cada Pokémon leva no máximo um, fora dos 4
// golpes de ataque, e usa uma vez por luta: o mais recente que aprendeu por nível (de scripts/fetch-support-moves.mjs),
// ou outro que já aprendeu, escolhido pelo jogador na ficha (ou nenhum).

import supportJson from './generated/support-moves.json';
import type { Ailment, StatKey, TypeName } from './types';

export type SupportEffect =
  | { kind: 'ailment'; ailment: Ailment; accuracy: number; immune?: TypeName[] }
  | { kind: 'boost'; stats: Partial<Record<StatKey, number>> }
  | { kind: 'heal'; fraction: number };

export interface SupportMove {
  id: string;
  name: string;
  type: TypeName;
  effect: SupportEffect;
}

const S = (id: string, name: string, type: TypeName, effect: SupportEffect): SupportMove => ({
  id,
  name,
  type,
  effect,
});
const ail = (ailment: Ailment, accuracy: number, immune?: TypeName[]): SupportEffect => ({
  kind: 'ailment',
  ailment,
  accuracy,
  immune,
});
/** Pós não afetam Planta; Thunder Wave, como todo golpe Elétrico, não afeta Terra. */
const POWDER: TypeName[] = ['grass'];
const up = (stats: Partial<Record<StatKey, number>>): SupportEffect => ({ kind: 'boost', stats });
const HEAL: SupportEffect = { kind: 'heal', fraction: 0.5 };

export const SUPPORT_MOVES: Record<string, SupportMove> = Object.fromEntries(
  [
    S('spore', 'Spore', 'grass', ail('sleep', 100, POWDER)),
    S('sleep-powder', 'Sleep Powder', 'grass', ail('sleep', 75, POWDER)),
    S('hypnosis', 'Hypnosis', 'psychic', ail('sleep', 60)),
    S('sing', 'Sing', 'normal', ail('sleep', 55)),
    S('lovely-kiss', 'Lovely Kiss', 'normal', ail('sleep', 75)),
    S('dark-void', 'Dark Void', 'dark', ail('sleep', 50)),
    S('thunder-wave', 'Thunder Wave', 'electric', ail('paralysis', 90, ['ground'])),
    S('stun-spore', 'Stun Spore', 'grass', ail('paralysis', 75, POWDER)),
    S('glare', 'Glare', 'normal', ail('paralysis', 100)),
    S('will-o-wisp', 'Will-O-Wisp', 'fire', ail('burn', 85)),
    S('toxic', 'Toxic', 'poison', ail('poison', 90)),
    S('poison-powder', 'Poison Powder', 'poison', ail('poison', 75, POWDER)),
    S('poison-gas', 'Poison Gas', 'poison', ail('poison', 90)),
    S('swords-dance', 'Swords Dance', 'normal', up({ atk: 1.6 })),
    S('nasty-plot', 'Nasty Plot', 'dark', up({ spAtk: 1.6 })),
    S('dragon-dance', 'Dragon Dance', 'dragon', up({ atk: 1.3, spe: 1.3 })),
    S('calm-mind', 'Calm Mind', 'psychic', up({ spAtk: 1.3, spDef: 1.3 })),
    S('bulk-up', 'Bulk Up', 'fighting', up({ atk: 1.3, def: 1.3 })),
    S('agility', 'Agility', 'psychic', up({ spe: 1.6 })),
    S('rock-polish', 'Rock Polish', 'rock', up({ spe: 1.6 })),
    S('iron-defense', 'Iron Defense', 'steel', up({ def: 1.6 })),
    S('acid-armor', 'Acid Armor', 'poison', up({ def: 1.6 })),
    S('barrier', 'Barrier', 'psychic', up({ def: 1.6 })),
    S('amnesia', 'Amnesia', 'psychic', up({ spDef: 1.6 })),
    S('growth', 'Growth', 'normal', up({ atk: 1.25, spAtk: 1.25 })),
    S('quiver-dance', 'Quiver Dance', 'bug', up({ spAtk: 1.25, spDef: 1.25, spe: 1.25 })),
    S('hone-claws', 'Hone Claws', 'dark', up({ atk: 1.3 })),
    S('recover', 'Recover', 'normal', HEAL),
    S('soft-boiled', 'Soft-Boiled', 'normal', HEAL),
    S('roost', 'Roost', 'flying', HEAL),
    S('slack-off', 'Slack Off', 'normal', HEAL),
    S('synthesis', 'Synthesis', 'grass', HEAL),
    S('moonlight', 'Moonlight', 'fairy', HEAL),
    S('morning-sun', 'Morning Sun', 'normal', HEAL),
    S('milk-drink', 'Milk Drink', 'normal', HEAL),
  ].map((m) => [m.id, m]),
);

/** O alvo é imune a este golpe por ser de certo tipo? */
export const blockedBy = (effect: { immune?: TypeName[] }, types: TypeName[]): boolean =>
  !!effect.immune?.some((t) => types.includes(t));

/** Regras de uso no automático e pelos inimigos. */
export const SUPPORT_RULES = {
  /** Só vale gastar a vez em lutas longas: o ataque mais forte precisa de pelo menos tantos golpes para derrubar. */
  minHitsToKo: 3,
  /** A cura só é usada abaixo desta fração do HP. */
  healBelow: 0.5,
  /** Chance por vez de um inimigo usar o golpe de apoio. */
  wildChance: 0.3,
  trainerChance: 0.7,
};

const LEARNED = supportJson as unknown as Record<string, [string, number][]>;

/** O golpe de apoio de uma espécie neste nível (o último que aprendeu), se tiver. */
export function supportMoveOf(speciesId: number, level: number): SupportMove | undefined {
  return learnedSupportMoves(speciesId, level).at(-1);
}

/** Todos os golpes de apoio que a espécie já aprendeu neste nível, do mais antigo ao mais recente. */
export function learnedSupportMoves(speciesId: number, level: number): SupportMove[] {
  const out: SupportMove[] = [];
  for (const [id, at] of LEARNED[speciesId] ?? []) {
    const move = SUPPORT_MOVES[id];
    if (at > level || !move) continue;
    const i = out.indexOf(move);
    if (i >= 0) out.splice(i, 1);
    out.push(move);
  }
  return out;
}

/** Escolha do jogador para o golpe de apoio: ausente = automático (o mais recente), 'none' = nenhum. */
export const NO_SUPPORT = 'none';

/**
 * O golpe de apoio de um Pokémon: o escolhido pelo jogador (continua valendo depois de evoluir, como os golpes de
 * ataque escolhidos), nenhum, ou o automático. Inimigos não escolhem: sempre o automático.
 */
export function supportMoveFor(p: { speciesId: number; level: number; support?: string }): SupportMove | undefined {
  if (p.support === NO_SUPPORT) return undefined;
  return (p.support && SUPPORT_MOVES[p.support]) || supportMoveOf(p.speciesId, p.level);
}

const STAT_LABEL: Record<StatKey, string> = {
  hp: 'HP',
  atk: 'Ataque',
  def: 'Defesa',
  spAtk: 'At. Esp.',
  spDef: 'Def. Esp.',
  spe: 'Velocidade',
};

const AILMENT_LABEL: Record<Ailment, string> = {
  burn: 'queima',
  poison: 'envenena',
  paralysis: 'paralisa',
  sleep: 'faz dormir',
  freeze: 'congela',
};

/** "Ataque +60%", "faz dormir (75%)", "cura 50% do HP". */
export function describeSupport(move: SupportMove): string {
  const e = move.effect;
  if (e.kind === 'heal') return `cura ${Math.round(e.fraction * 100)}% do HP`;
  if (e.kind === 'ailment') return `${AILMENT_LABEL[e.ailment]} o alvo (${e.accuracy}% de acerto)`;
  return Object.entries(e.stats)
    .map(([k, v]) => `${STAT_LABEL[k as StatKey]} +${Math.round((v - 1) * 100)}%`)
    .join(', ');
}
