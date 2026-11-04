import type { Section } from '../types';

export const ACTIVITIES: Section = {
  id: 'atividades',
  title: 'Atividades',
  icon: 'mystery-egg',
  blurb: 'Tudo o que dá para fazer em paralelo enquanto a batalha roda sozinha.',
  items: [
    {
      id: 'atividades-geral',
      q: 'O que é a aba ATIVIDADES? Por que tem tanta coisa?',
      keywords: 'atividades paralelo extras desafios criacao explorar',
      a: [
        {
          p: 'A aba **ATIVIDADES** reúne coisas que **andam em paralelo** à batalha principal. Você **não precisa fazer nada disso**, mas elas dão itens, Pokémon e dinheiro extra. Estão agrupadas em:',
        },
        {
          ul: [
            '**Criação:** Creche (ovos), Jardim, Fósseis e Campo de Treino.',
            '**Desafios:** Raides, Lendários, Torre de Batalha e Torneio.',
            '**Explorar:** Expedições, Safari, Caça ao shiny e Game Corner.',
            '**Cabo Link:** Troca e Duelo com amigos.',
          ],
        },
        {
          p: 'Cada uma vai **liberando uma de cada vez** ao longo do jogo, e aparece com o selo **NOVO** e uma **dica** na primeira visita. As que ainda estão trancadas dizem o que falta para liberar.',
        },
        {
          img: 'atividades.webp',
          alt: 'Tela da aba ATIVIDADES com os grupos de atividades',
          caption: 'A aba ATIVIDADES. Toque numa atividade para abrir.',
        },
        { p: '[[go:activities|Abrir ATIVIDADES]]' },
      ],
    },
    {
      id: 'creche',
      q: 'Creche e ovos: como consigo ovos?',
      keywords: 'daycare ovo egg chocar criar bebe',
      a: [
        {
          p: 'Disponível depois de vencer **Lt. Surge** (Vermilion). Deixe **dois Pokémon compatíveis** na creche e, conforme você vence lutas, eles geram **ovos**. Os ovos chocam com **vitórias e com o tempo**, até com o jogo fechado.',
        },
        {
          ul: [
            'O Pokémon que sai do ovo nasce no **nível 5** e **herda IVs dos pais** (3 deles), então pode nascer melhor que os pais.',
            'Ovos têm **4 vezes mais chance de sair shiny**.',
            'Quem fica na creche também **ganha níveis** com suas vitórias.',
            'Cabem até **3 ovos** ao mesmo tempo.',
          ],
        },
      ],
    },
    {
      id: 'expedicoes',
      q: 'O que são expedições?',
      keywords: 'expedition explorar enviar horas recompensa',
      a: [
        {
          p: 'Você **manda Pokémon que não estão lutando** explorar por **1, 4 ou 8 horas**. Quando voltam, trazem **itens, moedas e EXP**. Quem tem o **tipo indicado** para a expedição traz bem mais. Podem ir até **3 Pokémon** de cada vez, e novas vagas de expedição são liberadas conforme você vence ginásios.',
        },
        {
          tip: 'Ótimo para Pokémon "de reserva" que ficam parados no PC: eles passam a render mesmo fora da equipe.',
        },
      ],
    },
    {
      id: 'jardim',
      q: 'Jardim: como planto e colho berries?',
      keywords: 'garden planta berry colher cultivar',
      a: [
        {
          p: 'No **Jardim** você **planta berries** em canteiros e colhe quando estiverem **maduras** (o jogo avisa). Há 4 canteiros no total, liberados aos poucos. Berries servem para **curar em batalha**, de **presente** ao acompanhante, ou para **vender**. Um bônus temporário do jardim acumula até 3 horas.',
        },
        {
          p: 'Na **Automação** (aba TREINADOR) você pode deixar o jogo **colher e replantar sozinho**.',
        },
      ],
    },
    {
      id: 'fosseis',
      q: 'Fósseis: como revivo um Pokémon antigo?',
      keywords: 'fossil revive kabuto omanyte aerodactyl',
      a: [
        {
          p: 'Disponível depois de vencer o chefe de **Mt. Moon**. Fósseis são encontrados em expedições e dados por chefes. Coloque um fóssil no laboratório e, depois de **algumas horas**, ele vira um **Pokémon antigo** (nível 15).',
        },
      ],
    },
    {
      id: 'treino',
      q: 'O que é o Campo de Treino?',
      keywords: 'training ev treinar atributo esforço',
      a: [
        {
          p: 'Deixe um Pokémon **treinando um atributo** (por exemplo, Ataque) e ele ganha **EVs** aos poucos, mesmo com o jogo fechado (até 24 horas de cada vez, cerca de 20 EVs por hora). EVs deixam aquele atributo **mais alto**. O máximo é 252 por atributo e 510 no total.',
        },
        { p: 'Para a explicação de EV, veja "O que são IVs e EVs?" em Equipe e Pokémon.' },
      ],
    },
    {
      id: 'raides',
      q: 'Raides: o que são?',
      keywords: 'raid chefe gigante dinamax tempo limite',
      a: [
        {
          p: 'De tempos em tempos (a cada 2 a 4 horas) aparece um **chefe gigante** por cerca de 40 minutos. Para vencê-lo você tem **3 minutos**. Ele tem **4 vezes mais vida** e **fica furioso** quando perde vida (ataca mais forte e mais rápido).',
        },
        {
          ul: [
            'Vencendo, você ganha **muitas moedas e itens raros**.',
            'E ainda tem uma **boa chance de capturá-lo** (70%), já com IVs altos.',
          ],
        },
        {
          p: 'Liberada depois de vencer **Erika** (Celadon). O painel Próximos passos avisa quando uma raide aparece.',
        },
      ],
    },
    {
      id: 'torre',
      q: 'Torre de Batalha e Torre semanal',
      keywords: 'tower battle tower andares bp semanal regra',
      a: [
        {
          p: 'Liberada depois de vencer o **Campeão de Kanto**. Você **sobe andares** enfrentando treinadores cada vez mais fortes e ganha **pontos BP**, que podem ser trocados por prêmios. A cada 10 andares há um chefe.',
        },
        {
          p: 'Toda **segunda-feira** a **Torre semanal** muda: uma regra nova (por exemplo, só Pokémon de um tipo) e andares **iguais para todos os jogadores**, o que permite comparar resultados.',
        },
      ],
    },
    {
      id: 'torneio',
      q: 'Torneio semanal',
      keywords: 'tournament chave quartas semifinal final',
      a: [
        {
          p: 'Liberado depois de vencer **Koga** (Fuchsia). Uma vez por semana, acontece um **torneio com 8 treinadores** em chave (quartas, semifinal e final). Cada partida é **melhor de 3**. Quanto mais longe você for, mais moedas ganha (de 3.000 até 12.000 por fase).',
        },
      ],
    },
    {
      id: 'safari',
      q: 'Safari: como funciona?',
      keywords: 'safari zone bola isca pedra chansey scyther',
      a: [
        {
          p: 'No **Safari** você **não luta**. Paga uma entrada (3.000 moedas), recebe **30 Safari Balls** e a cada Pokémon escolhe uma ação:',
        },
        {
          ul: [
            '**Bola:** tenta capturar.',
            '**Isca:** o Pokémon fica mais fácil de capturar, mas também **foge mais fácil**.',
            '**Pedra:** o contrário (mais difícil de capturar, foge menos).',
          ],
        },
        {
          p: 'Algumas espécies **só aparecem no Safari** (como Chansey, Scyther, Pinsir, Tauros, Heracross e Dratini). Libera quando você chega na **Zona Safari**.',
        },
      ],
    },
    {
      id: 'gamecorner',
      q: 'Game Corner: para que serve?',
      keywords: 'caça niquel slot ficha cassino premios',
      a: [
        {
          p: 'Disponível depois do ginásio de **Celadon**. Você compra **fichas** (50 fichas por 2.500 moedas), gira o **caça-níquel de três rolos** e troca as fichas por **Pokémon, TMs e itens raros** no balcão de prêmios.',
        },
      ],
    },
    {
      id: 'cabo-link',
      q: 'Cabo Link: trocar e duelar com amigos',
      keywords: 'link troca trade duelo duel amigo codigo multiplayer',
      a: [
        {
          p: 'Você pode **trocar Pokémon** e **duelar** com amigos **sem internet nem conta**, só trocando **códigos de texto** (por mensagem, por exemplo).',
        },
        {
          ul: [
            '**Troca:** quem envia gera um código e o Pokémon sai do jogo dele; quem cola o código recebe o Pokémon (com IVs, natureza, golpes e item). Alguns Pokémon **evoluem ao chegar por troca**.',
            '**Duelo fantasma:** o código leva a **equipe** do amigo; você a enfrenta numa batalha em que os dois lados têm a mesma força. A primeira vitória contra cada equipe paga um prêmio.',
          ],
        },
        { p: 'Fica liberado depois do primeiro ginásio (Brock).' },
      ],
    },
  ],
};
