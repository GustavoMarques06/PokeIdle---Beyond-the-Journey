import type { Section } from '../types';

export const WORLD: Section = {
  id: 'mundo',
  title: 'Mapa, ginásios e Liga',
  icon: 'town-map',
  blurb: 'Como avançar de área, ganhar insígnias e chegar ao Campeão.',
  items: [
    {
      id: 'avancar',
      q: 'Como avanço de uma área para a próxima?',
      keywords: 'rota area desbloquear liberar proxima progredir chefe lider',
      a: [
        {
          p: 'O mundo é dividido em **regiões**, e cada região em **áreas** (rotas, florestas, cavernas, cidades). Você começa na primeira e vai liberando as seguintes:',
        },
        {
          ol: [
            'Lute na área até a **barra verde** completar (as vitórias necessárias).',
            'Desafie o **chefe** dela (um líder de ginásio ou outro treinador forte).',
            'Ganhando, a **próxima área** é liberada e você recebe prêmios.',
          ],
        },
        {
          p: 'Você **pode voltar** para áreas anteriores quando quiser (pelo **MAPA**). Isso é útil para treinar um Pokémon mais fraco onde os inimigos são mais fáceis, ou para procurar espécies que só aparecem lá.',
        },
        {
          img: 'mapa.webp',
          alt: 'Mapa de Kanto com marcadores das áreas',
          caption:
            'O MAPA mostra a região inteira. Toque numa área liberada para ir lutar lá. Há uma aba para cada região.',
        },
        { p: '[[go:map|Abrir o MAPA]]' },
      ],
    },
    {
      id: 'ginasios',
      q: 'O que são ginásios e insígnias?',
      keywords: 'ginasio lider insignia badge medalha brock misty oito',
      a: [
        {
          p: 'Em cada região há **8 ginásios**, cada um com um **líder** (como Brock, Misty e Lt. Surge em Kanto). Vencendo o líder, você ganha:',
        },
        {
          ul: [
            'uma **insígnia** ([[badge:boulder]] [[badge:cascade]] [[badge:thunder]]...), que aparece no topo (por exemplo "8/8") e no cartão de treinador;',
            'um **TM** (golpe novo);',
            'uma boa quantia de **moedas**;',
            'a **próxima área** liberada, e às vezes novas atividades e itens nas lojas.',
          ],
        },
        {
          tip: 'Cada líder usa um tipo de Pokémon (Brock usa [[type:rock]] Pedra; Misty, [[type:water]] Água). Leve Pokémon com vantagem de tipo, e a luta fica muito mais fácil.',
        },
      ],
    },
    {
      id: 'liga',
      q: 'O que é a Liga Pokémon? E o Campeão?',
      keywords: 'elite four elite dos quatro campeao hall da fama liga lorelei bruno agatha lance',
      a: [
        {
          p: 'Depois das **8 insígnias** de uma região, abre-se a **Liga Pokémon**: uma série de **4 treinadores da Elite dos Quatro** e, no fim, o **Campeão**. Cada um é uma luta separada, em ordem, com os melhores Pokémon da região (as lutas acontecem em salas especiais, cada uma com o tema do tipo do treinador).',
        },
        {
          ul: [
            'Nessas lutas **só há o desafiante e o seu oponente** (sem Pokémon selvagens): enquanto isso, seus Pokémon treinam numa rota próxima, a "área de treino".',
            'Ganhando do **Campeão**, sua **equipe entra no Hall da Fama** e a **próxima região é liberada**. Um professor (o Prof. Carvalho) aparece para comentar.',
            'A Liga é bem mais difícil que os ginásios: treine, evolua e leve uma equipe variada.',
          ],
        },
      ],
    },
    {
      id: 'regioes',
      q: 'Quantas regiões existem? O que muda em cada uma?',
      keywords: 'kanto johto hoenn sinnoh unova kalos alola regiao fim pos jogo ilhas provas',
      a: [
        {
          p: 'São **7 regiões**, na ordem: **Kanto**, **Johto**, **Hoenn**, **Sinnoh**, **Unova**, **Kalos** e **Alola**. Cada uma tem as suas espécies, os seus 8 ginásios, a sua Liga e o seu Campeão. **Kalos e Alola são o pós-jogo**: tudo lá tem nível 100 e os chefes são reforçados. Alola não tem ginásios: são **provas** dos capitães e dos kahunas, e cada kahuna ou capitã de prova dá um **selo** no lugar da insígnia.',
        },
        {
          p: 'Ao liberar uma região nova, o Prof. Carvalho aparece falando sobre ela, com o Pokémon lendário daquela região em silhueta.',
        },
      ],
    },
    {
      id: 'revanche',
      q: 'Posso enfrentar um chefe de novo?',
      keywords: 'revanche rematch repetir lider rival',
      a: [
        {
          p: 'Pode. Depois de vencer um chefe, ele oferece **revanche** a cada 4 horas: o chefe vem **8 níveis mais forte** e **dá mais moedas** (50% a mais), mas sem insígnia nem TM. É uma boa fonte de dinheiro quando você já está forte.',
        },
        {
          p: 'O **rival** (aquele treinador que escolheu o Pokémon com vantagem sobre o seu no começo) volta **mais forte a cada nova jornada**.',
        },
      ],
    },
    {
      id: 'rocket',
      q: 'O que é a Equipe Rocket? E os Pokémon errantes?',
      keywords: 'rocket errante roamer visitante evento raro',
      a: [
        {
          ul: [
            '**Equipe Rocket:** de vez em quando, um recruta da Equipe Rocket **aparece numa rota** para te desafiar. Se aparecer, o botão **DESAFIAR** fica disponível. Vencer dá moedas.',
            '**Pokémon errante:** um Pokémon raro **aparece por um tempo limitado** (cerca de 45 minutos) numa rota aleatória. Se você estiver lá, tem uma chance de encontrá-lo. Ele **foge** depois de pouco tempo na luta, então seja rápido.',
          ],
        },
        {
          tip: 'Esses visitantes são avisados no painel Próximos passos e, se você ligar as notificações, também fora do jogo.',
        },
      ],
    },
  ],
};

export const MONEY: Section = {
  id: 'dinheiro',
  title: 'Dinheiro e lojas',
  icon: 'coin-case',
  blurb: 'Quais moedas e pontos existem, onde comprar e como ganhar mais.',
  items: [
    {
      id: 'moedas',
      q: 'Que tipos de moeda e pontos existem?',
      keywords: 'dinheiro moedas pontos pesquisa prestigio fichas bp',
      a: [
        {
          table: {
            head: ['O quê', 'Para que serve', 'De onde vem'],
            rows: [
              [
                '**Moedas** (₽, o dinheiro que fica no topo)',
                'Comprar bolas, itens e melhorias nas lojas.',
                'Vitórias, chefes, revanches, vendas, raides.',
              ],
              [
                '**Pontos de pesquisa**',
                'Comprar **melhorias permanentes** na aba MELHORIAS.',
                'Transferir repetidos, registrar espécies novas, diário da Pokédex.',
              ],
              [
                '**Pontos de prestígio**',
                'Melhorias ainda mais fortes, depois de recomeçar a jornada.',
                'Recomeçar a jornada (NOVA JORNADA).',
              ],
              [
                '**Fichas**',
                'Jogar no caça-níquel do Game Corner e trocar por prêmios.',
                'Comprar pacotes no Game Corner.',
              ],
              [
                '**Pontos BP da Torre**',
                'Trocar por prêmios da Torre de Batalha.',
                'Subir andares na Torre.',
              ],
            ],
          },
        },
      ],
    },
    {
      id: 'lojas',
      q: 'Onde compro coisas? Qual a diferença entre as lojas?',
      keywords: 'poke mart loja departamentos celadon mercador comprar vender preco',
      a: [
        {
          img: 'loja.webp',
          alt: 'Tela da LOJA com a Loja de Departamentos',
          caption: 'A LOJA tem três lugares: Poké Mart, Loja de Depto. e Mercador.',
        },
        {
          ul: [
            '**Poké Mart:** a loja do dia a dia. Bolas, pedras de evolução e melhorias como a **Captura automática**, a **Vara de pesca** e o **Surf**. Novos itens aparecem conforme você vence chefes.',
            '**Loja de Departamentos de Celadon:** vende **quase tudo** do jogo (itens para segurar, TMs, Rare Candy, Mega Stones, fósseis...). Só dá para comprar **estando na área de Celadon** (Rotas 7–8 e Celadon). Vá para lá pelo MAPA e depois volte.',
            '**Mercador viajante:** aparece de tempos em tempos (depois do ginásio de Cerulean) com **4 ofertas raras com desconto** e estoque limitado. Vale olhar sempre que o painel avisar.',
          ],
        },
        {
          p: 'A loja mostra também **quanto tempo de jogo** cada preço representa no seu ritmo de ganho atual, para você saber se vale a pena esperar.',
        },
        { p: '[[go:shop|Abrir a LOJA]]' },
      ],
    },
    {
      id: 'vender',
      q: 'Posso vender itens?',
      keywords: 'venda vender itens sobra',
      a: [
        {
          p: 'Pode. Na LOJA você vende itens que sobram por **metade do preço** de loja. Bom para berries em excesso e itens que você não usa.',
        },
      ],
    },
    {
      id: 'ganhar-mais',
      q: 'Como ganho mais dinheiro?',
      keywords: 'moedas rapido renda farm lucro',
      a: [
        {
          ul: [
            '**Lute em áreas mais avançadas:** inimigos de nível maior dão mais moedas.',
            '**Chefes e revanches** pagam bastante.',
            '**Raides, torneio e Torre** (ATIVIDADES) dão prêmios grandes.',
            '**Melhoria "Economia"** (aba MELHORIAS): +5% de moedas por nível.',
            '**Itens segurados** que dão moedas, e bônus de **tipo** na equipe.',
            '**Vender** o que sobrar.',
          ],
        },
      ],
    },
  ],
};
