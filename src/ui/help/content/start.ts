import type { Section } from '../types';

export const START: Section = {
  id: 'inicio',
  title: 'Comece por aqui',
  icon: 'poke-ball',
  blurb: 'O que é o jogo, o que você precisa fazer e o que pode ignorar.',
  items: [
    {
      id: 'o-que-e',
      q: 'O que é este jogo? Como ele funciona em 1 minuto?',
      keywords: 'idle incremental ocioso automatico explicar basico',
      a: [
        {
          p: 'PokéIdle é um jogo de Pokémon que **joga sozinho**. Quem faz isso é o próprio Pokémon: ele luta, ganha experiência e moedas, e você acompanha. Por isso se chama jogo **idle** (em português, "ocioso": ele continua andando mesmo sem você mexer).',
        },
        { p: 'Em resumo, o que acontece o tempo todo:' },
        {
          ol: [
            'Seu Pokémon luta contra Pokémon selvagens da **área** (rota) onde você está, um depois do outro.',
            'Cada vitória dá **EXP** (ele sobe de nível), **moedas** e, às vezes, itens.',
            'Cada vitória também enche a **barra verde** lá em cima. Quando ela completa, você pode desafiar o **líder do ginásio** daquela área.',
            'Ganhando do líder, você recebe uma **insígnia** e a próxima área é liberada. E assim por diante, por 7 regiões.',
            'No meio do caminho você **captura** Pokémon novos, monta uma equipe, evolui e compra coisas.',
          ],
        },
        {
          p: 'Você não precisa apertar nada o tempo todo. Dá para abrir o jogo de vez em quando, mexer na equipe, gastar o dinheiro e fechar. E tem mais: **com o jogo fechado ele também anda** (veja "Posso fechar o jogo?" mais abaixo).',
        },
        {
          img: 'tela-principal.webp',
          alt: 'Tela principal do jogo com os números das partes',
          caption:
            'A tela principal. Cada número está explicado em "O que é cada parte da tela?", no assunto A tela principal.',
        },
      ],
    },
    {
      id: 'o-que-fazer',
      q: 'O que eu preciso fazer? Existe um objetivo?',
      keywords: 'objetivo meta finalidade como ganhar zerar terminar',
      a: [
        {
          p: 'O objetivo principal é o mesmo dos jogos de Pokémon: **vencer os ginásios, derrotar a Liga Pokémon e virar Campeão**, região após região (Kanto, Johto, Hoenn, Sinnoh, Unova e Kalos).',
        },
        { p: 'Ao longo do caminho você pode, se quiser:' },
        {
          ul: [
            'Completar a **Pokédex** (capturar todas as espécies).',
            'Caçar **shinies** (versões de outra cor, bem raras).',
            'Montar a **melhor equipe** possível e deixar os Pokémon fortes.',
            'Fazer **atividades paralelas**: ovos, jardim, expedições, torneio, Torre de Batalha...',
            'Juntar **medalhas** (conquistas) e subir de nível como treinador.',
          ],
        },
        {
          tip: 'Não existe pressa nem "jeito errado". O jogo foi feito para ser relaxante: se um chefe estiver difícil, é só deixar seus Pokémon lutarem mais um pouco nas áreas anteriores e voltar mais forte.',
        },
      ],
    },
    {
      id: 'primeiros-passos',
      q: 'Passo a passo dos primeiros 10 minutos',
      keywords: 'tutorial comecar iniciante primeira vez',
      a: [
        {
          ol: [
            '**Escolha seu inicial** no laboratório (Bulbasaur, Charmander ou Squirtle, por exemplo). A escolha é um gosto pessoal, qualquer um serve.',
            '**Deixe lutar.** Na Rota 1, seu Pokémon já enfrenta bichinhos selvagens sozinho. Olhe a barra verde no topo: ela mostra quantas vitórias faltam.',
            '**Capture seu primeiro Pokémon.** Toque em **MOCHILA** (embaixo da cena) e depois em uma Poké Ball enquanto o selvagem está com pouca vida. Você começa com 5 bolas.',
            '**Monte a equipe.** Abra a aba **POKéMON**: o primeiro da lista luta, os outros esperam a vez e dão bônus. Veja "Como funciona a equipe?".',
            '**Compre bolas** quando elas acabarem, na aba **LOJA** (ela aparece depois de algumas vitórias).',
            '**Desafie o primeiro líder.** Quando a barra completar, aparece o botão vermelho **DESAFIAR**. Brock espera na Floresta de Viridian.',
            '**Explore as outras abas** conforme elas aparecerem com o selo **NOVO**.',
          ],
        },
        {
          tip: 'O professor (Prof. Carvalho) aparece nos primeiros minutos com uma dica de cada vez. Dá para fechar com o botão OK.',
        },
      ],
    },
    {
      id: 'fechar-jogo',
      q: 'Posso fechar o jogo? Ele continua funcionando?',
      keywords: 'offline fora do jogo fechado ausente voltar relatorio',
      a: [
        {
          p: 'Pode. Quando você volta, o jogo calcula o que a sua equipe teria feito durante o tempo fora e mostra um **relatório** com tudo: vitórias, EXP, moedas, capturas e itens.',
        },
        {
          ul: [
            'O limite é de **8 horas** por vez (aumenta com a melhoria "Diário de viagem").',
            'Fora do jogo, o ritmo é de cerca de **70%** do ritmo normal (também melhora com uma melhoria).',
            'Tudo continua andando: ovos chocam, expedições terminam, plantas crescem.',
            'O jogo também pode **avisar no celular ou no computador** (notificação) quando algo ficar pronto. Você escolhe o que quer receber na aba TREINADOR, em OPÇÕES.',
          ],
        },
        {
          warn: 'Fechar o jogo **não** perde nada: ele salva sozinho a cada poucos segundos. Mas se você limpar os dados do navegador, o save vai junto. Veja "Como salvo meu jogo?" no assunto Salvar e celular.',
        },
      ],
    },
    {
      id: 'precisa-jogar-sempre',
      q: 'Preciso ficar apertando botões?',
      keywords: 'clicar spam cliques automatico',
      a: [
        {
          p: 'Não. A batalha é automática por padrão (botão **AUTO**). Os botões servem para você **ajudar**: lançar uma Poké Ball, trocar de Pokémon, desafiar um chefe, fugir de uma luta.',
        },
        {
          p: 'Se preferir mandar nos golpes, existe o modo **MANUAL**, em que o jogo espera você escolher o golpe de cada vez. Mas ele respeita o tempo de cada Pokémon: não dá para ficar "apertando mais rápido" para atacar mais vezes.',
        },
      ],
    },
  ],
};
