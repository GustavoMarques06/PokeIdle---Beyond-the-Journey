// Conteúdo da AJUDA: seções com perguntas, e cada resposta é uma lista de blocos.
//
// Nos textos vale uma marcação pequena:
//   **negrito**           [[item:poke-ball]]   ícone de item        [[type:fire]]   selo de tipo
//   [[mon:25]]            ícone de Pokémon     [[badge:boulder]]    insígnia       [[key:Q]]  tecla
//   [[go:shop|Abrir a LOJA]]   botão que abre uma aba do jogo (só se ela já estiver liberada)

import type { ScreenId } from '../battle/BattleDialog';

export type Block =
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { tip: string }
  | { warn: string }
  | { img: string; alt: string; caption?: string }
  | { table: { head: string[]; rows: string[][] } };

export interface Question {
  id: string;
  q: string;
  a: Block[];
  /** Palavras extras que levam a esta pergunta na busca (sinônimos, nomes em inglês). */
  keywords?: string;
}

export interface Section {
  id: string;
  title: string;
  /** Id de um item (ícone) ou `help`. */
  icon: string;
  /** Uma linha que diz do que a seção trata. */
  blurb: string;
  items: Question[];
}

export type Go = (screen: ScreenId) => void;
