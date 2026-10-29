// Abas de ATIVIDADES sem os ícones (o menu principal importa isto sem carregar a tela) e o
// onboarding: cada atividade aparece como NOVA ao ser liberada e mostra uma dica na primeira vez.

import { activityUnlocked, type Activity } from '../../../core/collection';
import type { GameState } from '../../../core/game';
import { legendaryRegionOpen } from '../../../core/legendary';
import { linkUnlocked } from '../../../core/link';

export type Tab =
  | 'daycare'
  | 'expeditions'
  | 'garden'
  | 'fossils'
  | 'training'
  | 'raids'
  | 'hunt'
  | 'legendary'
  | 'tower'
  | 'tournament'
  | 'safari'
  | 'gamecorner'
  | 'trade'
  | 'duel';

export const TAB_UNLOCK: Record<Tab, Activity | null> = {
  daycare: 'daycare',
  expeditions: 'expeditions',
  garden: 'garden',
  fossils: 'fossils',
  training: 'training',
  raids: 'raids',
  hunt: null,
  legendary: null,
  tower: 'tower',
  tournament: 'tournament',
  safari: 'safari',
  gamecorner: 'gamecorner',
  trade: null,
  duel: null,
};

export function tabOpen(state: GameState, tab: Tab): boolean {
  if (tab === 'legendary') return legendaryRegionOpen(state, 'kanto');
  if (tab === 'trade' || tab === 'duel') return linkUnlocked(state);
  const unlock = TAB_UNLOCK[tab];
  return !unlock || activityUnlocked(state, unlock);
}

/** Flag gravada quando o jogador abre a aba pela primeira vez (some o selo NOVO). */
export const seenFlag = (tab: Tab) => `seen:${tab}`;
/** Flag gravada quando o jogador fecha a dica da aba. */
export const tipFlag = (tab: Tab) => `tip:${tab}`;

/** Atividades liberadas que o jogador ainda não abriu. */
export function unseenTabs(state: GameState): Tab[] {
  return (Object.keys(TAB_UNLOCK) as Tab[]).filter(
    (tab) => tabOpen(state, tab) && !state.flags.includes(seenFlag(tab)),
  );
}

/** Dica de primeira visita de cada atividade: o que é e o primeiro passo. */
export const TAB_TIPS: Record<Tab, string> = {
  daycare:
    'Deixe dois Pokémon compatíveis na creche para gerar ovos. Os ovos chocam com o tempo, até com o jogo fechado, e podem sair com IVs melhores que os dos pais.',
  expeditions:
    'Mande Pokémon que não estão lutando explorar por 1, 4 ou 8 horas. Pokémon dos tipos indicados trazem mais recompensas.',
  garden:
    'Plante berries e colha quando estiverem maduras. Berries curam em batalha, viram presente para o acompanhante e podem ser vendidas.',
  fossils:
    'Fósseis achados em expedições e com chefes viram Pokémon antigos aqui. Cada um leva algumas horas para reviver.',
  training:
    'Deixe um Pokémon treinando um atributo para ganhar EVs aos poucos, mesmo offline. EVs deixam o atributo mais alto no nível 100.',
  raids:
    'De tempos em tempos um chefe gigante aparece. Vença-o dentro do tempo com a sua equipe para ganhar itens raros e uma chance de capturá-lo.',
  hunt: 'Escolha uma espécie para caçar: quanto mais vezes você a derrotar em sequência, maior a chance de aparecer shiny. Trocar de rota quebra a sequência.',
  legendary:
    'Depois de vencer o Campeão de uma região, os lendários dela podem ser enfrentados aqui numa batalha manual. Leve bolas boas: o número de tentativas é limitado.',
  tower:
    'Suba andares contra treinadores cada vez mais fortes e troque os BP por prêmios. Toda semana há também a Torre semanal, com uma regra nova e andares iguais para todos.',
  tournament:
    'Um torneio por semana, em chave de 8. Cada partida é melhor de 3; quanto mais longe você for, mais moedas ganha.',
  safari:
    'No Safari você não luta: escolha entre jogar bola, isca ou pedra. Algumas espécies só aparecem aqui.',
  gamecorner: 'Gire o caça-níquel com fichas e troque-as por Pokémon, TMs e itens raros.',
  trade:
    'Troque Pokémon com amigos por código, sem internet nem conta. Quem envia gera um código e o Pokémon sai do jogo dele; quem cola o código recebe. Alguns Pokémon evoluem ao chegar por troca.',
  duel: 'Gere o código da sua equipe e mande para um amigo; cole o código da equipe dele para enfrentá-la. No duelo os dois lados lutam com a mesma força, sem bônus da equipe.',
};
