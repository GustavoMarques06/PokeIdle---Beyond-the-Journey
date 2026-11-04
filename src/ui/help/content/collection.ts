import type { Section } from '../types';

export const COLLECTION: Section = {
  id: 'colecao',
  title: 'Capturar e Pokédex',
  icon: 'poke-ball',
  blurb: 'Como capturar, os tipos de bola, shiny e a Pokédex.',
  items: [
    {
      id: 'capturar',
      q: 'Como capturo um Pokémon?',
      keywords: 'captura pegar bola pokeball lancar chance',
      a: [
        {
          p: 'Enquanto você luta, aparece um Pokémon selvagem de cada vez. Para capturar um, use uma **bola**:',
        },
        {
          ol: [
            'Toque em **MOCHILA** embaixo da cena (ou use as teclas [[key:Q]] para Poké Ball e [[key:W]] para a melhor bola).',
            'Escolha a bola. O jogo mostra a **chance** de captura de cada uma em porcentagem.',
            'A bola é lançada. Ela pode **capturar**, ou o Pokémon pode **escapar** (aí você tenta de novo, se ainda tiver bola).',
          ],
        },
        {
          ul: [
            'Quanto **menos vida** o Pokémon tiver, **maior** a chance. O ideal é capturar quando a barra dele está amarela ou vermelha.',
            'Cada espécie tem sua dificuldade: Pokémon comuns são fáceis, os raros e fortes são mais difíceis.',
            'Bolas melhores capturam mais: [[item:poke-ball]] Poké Ball < [[item:great-ball]] Great Ball < [[item:ultra-ball]] Ultra Ball. A [[item:master-ball]] Master Ball **sempre** captura.',
            'Você começa com 5 Poké Balls. Compre mais na **LOJA**.',
          ],
        },
        {
          img: 'mochila.webp',
          alt: 'Mochila com as bolas e seus números',
          caption: 'A aba MOCHILA mostra tudo o que você tem, inclusive as bolas.',
        },
      ],
    },
    {
      id: 'captura-auto',
      q: 'Dá para capturar sozinho, sem eu fazer nada?',
      keywords: 'automatica automatico captura auto melhoria',
      a: [
        {
          p: 'Dá, mas é uma **melhoria que você compra** (não vem de graça): **Captura automática**, no Poké Mart da aba LOJA, depois de vencer o primeiro ginásio (Brock). Depois de comprar, o jogo lança bolas sozinho quando a vida do Pokémon selvagem fica **abaixo da metade**.',
        },
        {
          p: 'Você controla **o que** capturar na **Automação** (aba TREINADOR): só Pokémon bons (potencial mínimo, habilidade oculta, naturezas que você procura), só formas que ainda faltam, ou tudo.',
        },
        {
          tip: 'Sem bolas, a captura automática não funciona. Fique de olho na Mochila (o jogo avisa "Sem bolas — compre na Loja").',
        },
      ],
    },
    {
      id: 'bolas-especiais',
      q: 'Para que servem as bolas diferentes (Net, Nest, Quick, Dusk...)?',
      keywords: 'net ball nest quick timer dusk heal luxury repeat bolas especiais',
      a: [
        {
          p: 'As bolas **especiais** funcionam melhor em **situações específicas**, como nos jogos. Por exemplo, a **Net Ball** é melhor contra Pokémon de água e inseto; a **Dusk Ball**, à noite e em cavernas; a **Quick Ball**, logo no começo da luta; a **Repeat Ball**, contra uma espécie que você já tem.',
        },
        {
          p: 'Fora da situação delas, valem como uma Poké Ball comum. A **descrição** de cada uma aparece na Mochila e na Loja.',
        },
      ],
    },
    {
      id: 'shiny',
      q: 'O que é um Pokémon shiny? Como acho?',
      keywords: 'shiny brilhante cor diferente caça cacar raro',
      a: [
        {
          p: 'Um **shiny** é uma versão **de outra cor** de um Pokémon, muito rara: a chance é de **1 em 512** em cada encontro. Aparece uma estrelinha ✦ perto do nome dele.',
        },
        { p: 'Para aumentar suas chances existe a **Caça ao shiny** (aba ATIVIDADES):' },
        {
          ul: [
            'Você **escolhe uma espécie** para caçar. Ela passa a aparecer com mais frequência.',
            'Cada vez seguida que você derrota essa espécie, a chance de shiny **aumenta um pouco**.',
            'Trocar de rota **quebra a sequência**.',
          ],
        },
        {
          tip: 'Ovos da Creche também têm uma chance maior de sair shiny (4 vezes maior).',
        },
      ],
    },
    {
      id: 'pokedex',
      q: 'Como funciona a Pokédex?',
      keywords: 'dex vistos capturados completar recompensa diario pesquisa',
      a: [
        {
          img: 'pokedex.webp',
          alt: 'Tela da Pokédex com um Pokémon aberto',
          caption: 'A Pokédex lista todas as espécies. As que você ainda não viu aparecem como ???.',
        },
        {
          ul: [
            '**Visto:** você já encontrou a espécie numa luta.',
            '**Capturado:** você já tem um exemplar. O ícone de bolinha na caixa do inimigo avisa quando você já tem aquela espécie.',
            '**Marcos:** ao completar certa quantidade de espécies, aparecem **recompensas** para resgatar (a aba POKéDEX ganha um aviso).',
            '**Diário de pesquisa:** cada espécie tem **5 tarefas** (por exemplo, derrotar vários, capturar...). Completando, você ganha pontos para o laboratório e um **bônus permanente contra aquela espécie** (mais chance de captura e mais EXP).',
            '**Formas especiais:** algumas espécies têm versões colecionáveis (as letras do Unown, as estações do Deerling, o clima do Castform).',
          ],
        },
        { p: '[[go:dex|Abrir a POKéDEX]]' },
      ],
    },
    {
      id: 'lendarios',
      q: 'Como capturo um Pokémon lendário?',
      keywords: 'legendary lendario mewtwo articuno raro quase lendario',
      a: [
        {
          p: 'Depois de **vencer o Campeão de uma região**, os lendários dela passam a poder ser enfrentados na aba **ATIVIDADES → Lendários**. Essa luta é **manual**: você mesmo lança as bolas.',
        },
        {
          ul: [
            'O lendário tem **o dobro de vida** e você tem um **número limitado de bolas** que podem falhar antes de ele fugir (10 tentativas para lendários e 15 para os "quase lendários", como Dragonite e Tyranitar).',
            'Se ele fugir, ou você desmaiar, existe uma **espera** (cerca de 1 hora) antes de tentar de novo.',
            'Depois de capturado, ele volta a aparecer depois de um tempo (1 dia; 6 horas para os quase lendários), caso você queira outro exemplar.',
            'Os lendários capturados já saem com **IVs altos**.',
          ],
        },
        {
          tip: 'Leve bolas boas (Ultra Ball ou melhores) e enfraqueça o lendário antes de jogar. Se tiver, uma Quick Ball ou Timer Ball ajuda dependendo do momento.',
        },
      ],
    },
  ],
};

export const EVOLUTION: Section = {
  id: 'evolucao',
  title: 'Evolução',
  icon: 'rare-candy',
  blurb: 'Como e quando os Pokémon evoluem.',
  items: [
    {
      id: 'evoluir',
      q: 'Como meu Pokémon evolui?',
      keywords: 'evolucao evoluir nivel pedra amizade troca',
      a: [
        { p: 'Cada espécie evolui de um jeito. Os mais comuns:' },
        {
          table: {
            head: ['Jeito', 'Como é', 'Exemplo'],
            rows: [
              ['**Por nível**', 'Ao chegar em certo nível, sozinho.', 'Charmander → Charmeleon (nível 16)'],
              [
                '**Por pedra**',
                'Use uma pedra de evolução (compre na LOJA).',
                'Pikachu + Thunder Stone → Raichu',
              ],
              ['**Por amizade**', 'Quando a amizade chega em 220 (sobe lutando).', 'Golbat → Crobat'],
              ['**Por troca**', 'Trocando com um amigo pelo Cabo Link.', 'Kadabra → Alakazam'],
              ['**Especiais**', 'Dependem de condições do próprio Pokémon.', 'Tyrogue, Wurmple'],
            ],
          },
        },
        {
          p: 'Quando um Pokémon está pronto, a aba **POKéMON** ganha um **aviso** e na ficha aparece o botão **Evoluir → nome**. Em OPÇÕES (aba TREINADOR) você pode ligar **Evoluir automaticamente**, para ele evoluir sozinho assim que puder.',
        },
        {
          p: 'Na ficha de cada Pokémon aparece, em texto, **o que falta** para ele evoluir. A **Pokédex** também mostra a cadeia de evolução inteira.',
        },
      ],
    },
    {
      id: 'evitar-evolucao',
      q: 'Posso impedir a evolução? Por que faria isso?',
      keywords: 'everstone pedra eterna travar nao evoluir',
      a: [
        {
          p: 'Pode. Alguns Pokémon são melhores sem evoluir, ou você pode querer um Pokémon bonitinho do jeito que está. Compre uma [[item:everstone]] **Everstone** (Pedra Eterna) e, na ficha, use **Travar evolução** (fica em **Mais ações**). Para liberar de novo, o botão vira **Liberar evolução**.',
        },
      ],
    },
    {
      id: 'amizade',
      q: 'O que é amizade?',
      keywords: 'friendship carinho afeto berries acompanhante',
      a: [
        {
          p: 'A **amizade** é um número de 0 a 255 que mede o quanto o Pokémon gosta de você. Ela sobe com **vitórias**, **níveis** e **berries**, e desce um pouquinho quando ele desmaia. Quem evolui por afeto precisa chegar em **220**.',
        },
        {
          p: 'Um **acompanhante** (escolhido na ficha, em **Mais ações**) ganha amizade com o tempo mesmo sem lutar.',
        },
      ],
    },
  ],
};
