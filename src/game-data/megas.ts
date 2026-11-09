// Mega Evoluções: o Pokémon segura a Mega Stone da sua espécie e, em batalha, muda de forma (tipos,
// atributos e habilidade da Mega, sprite próprio) até o fim do encontro. Não é uma espécie nova: a forma só
// existe durante a luta e nunca é salva no Pokémon. Dados e sprites vêm de scripts/fetch-megas.mjs
// (Mega Evoluções da 6ª geração; a Mega Rayquaza usa o Meteorito, já que aqui toda Mega depende de um item).

import megasJson from './generated/megas.json';
import type { BaseStats, TypeName } from './types';

export interface MegaDef {
  /** Item segurado que libera a Mega Evolução (id da Mega Stone). */
  stone: string;
  stoneName: string;
  speciesId: number;
  /** Nome do arquivo do sprite: `<espécie>-<forma>.gif` (`mega`, `megax` ou `megay`). */
  form: string;
  name: string;
  types: TypeName[];
  baseStats: BaseStats;
  /** Id da habilidade da Mega (abilities.ts). */
  ability: string;
}

export const MEGAS = megasJson as MegaDef[];

/**
 * Preço da Mega Stone na Loja de Departamentos, pela força da Mega (soma dos atributos base). Sem bônus de moedas, o
 * jogador junta ~15 mil por hora no fim de Kanto e ~43 mil em Kalos: as Megas fracas (Beedrill, Sableye) saem em
 * algumas horas logo cedo, e as lendárias (Primais, Mewtwo, Rayquaza) ficam para o fim do jogo.
 */
export function megaStonePrice(mega: Pick<MegaDef, 'baseStats'>): number {
  const total = Object.values(mega.baseStats).reduce((a, b) => a + b, 0);
  if (total >= 770) return 300000;
  if (total >= 700) return 200000;
  if (total >= 600) return 120000;
  return 80000;
}

const byStone = new Map(MEGAS.map((m) => [m.stone, m]));

/** A Mega que este Pokémon pode assumir, se estiver segurando a pedra certa. */
export function megaFor(p: { speciesId: number; held?: string }): MegaDef | undefined {
  const mega = p.held ? byStone.get(p.held) : undefined;
  return mega && mega.speciesId === p.speciesId ? mega : undefined;
}

/** A forma é uma Mega desta espécie (tem sprite próprio)? */
export function isMegaForm(speciesId: number, form: string | undefined): boolean {
  return !!form && MEGAS.some((m) => m.speciesId === speciesId && m.form === form);
}

/** Regressão Primal (Kyogre e Groudon): mesma mecânica, com outro nome na tela. */
export const isPrimalForm = (form: string | undefined) => form === 'primal';

/** "MEGA" ou "PRIMAL", para os rótulos. */
export const megaLabel = (form: string | undefined) => (isPrimalForm(form) ? 'PRIMAL' : 'MEGA');

export const megaOfForm = (speciesId: number, form: string | undefined): MegaDef | undefined =>
  MEGAS.find((m) => m.speciesId === speciesId && m.form === form);
