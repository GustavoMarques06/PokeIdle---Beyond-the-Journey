import type { Section } from '../types';

export const SCREEN: Section = {
  id: 'tela',
  title: 'A tela principal',
  icon: 'town-map',
  blurb: 'Cada parte da tela e para que serve cada botão.',
  items: [
    {
      id: 'partes-da-tela',
      q: 'O que é cada parte da tela?',
      keywords: 'hud interface barra cena menu comandos mensagem',
      a: [
        {
          img: 'tela-principal.webp',
          alt: 'Tela principal com sete partes numeradas',
          caption: 'Os números da imagem correspondem à lista abaixo.',
        },
        {
          ol: [
            '**Barra de cima (HUD):** o nome da área em que você está e a barra verde de progresso, seu nome de treinador, quantas insígnias você tem (por exemplo 8/8) e seu dinheiro.',
            '**Cena de batalha:** onde os Pokémon lutam. O seu fica à esquerda, de costas; o inimigo, à direita. A caixa em cima mostra o inimigo (nome, nível, vida e fraquezas) e a de baixo mostra o seu.',
            '**Caixa de mensagens:** conta o que está acontecendo ("Charizard usou Flamethrower!"). Tem os botões **AUTO / MANUAL** e **REGISTRO** (o histórico das últimas mensagens).',
            '**Comandos:** **MOCHILA** (lançar bolas), **POKéMON** (trocar de Pokémon) e **FUGIR**. No modo manual aparece também **LUTAR**.',
            '**Próximos passos:** sugestões do que vale fazer agora (um chefe liberado, um ovo prontinho...). Dá para fechar no **×**.',
            '**Equipe:** a lista dos seus Pokémon em campo, com a vida de cada um.',
            '**Menu de abas:** POKéMON, POKéDEX, MOCHILA, LOJA, MAPA e outras. No celular ele fica fixo na parte de baixo da tela.',
          ],
        },
      ],
    },
    {
      id: 'barra-verde',
      q: 'O que é a barra verde de cima? Quando posso desafiar o chefe?',
      keywords: 'progresso rota vitorias chefe desafiar lider ginasio',
      a: [
        {
          p: 'A barra mostra **quantos Pokémon você já venceu nesta área** e quantos faltam para liberar o chefe (por exemplo "428/428" quer dizer completo). Cada vitória enche um pedacinho.',
        },
        {
          p: 'Quando completa, aparece um botão vermelho piscando na caixa de mensagens: **DESAFIAR** (ou use a tecla [[key:D]]). Ganhando, você recebe a **insígnia** e a próxima área é liberada.',
        },
        {
          tip: 'Você não é obrigado a desafiar na hora. Pode continuar lutando e ficando mais forte antes. O botão fica lá esperando.',
        },
        {
          p: 'O painel **Próximos passos** também mostra a **chance estimada** de vitória contra o chefe, para ajudar a decidir.',
        },
      ],
    },
    {
      id: 'auto-manual',
      q: 'O que são AUTO e MANUAL?',
      keywords: 'modo batalha lutar golpe escolher mega',
      a: [
        {
          ul: [
            '**AUTO** (padrão): o Pokémon escolhe os golpes sozinho, sempre o melhor contra o inimigo. É o modo para relaxar. O botão LUTAR **não aparece**.',
            '**MANUAL**: a batalha **para** quando chega a vez do seu Pokémon e espera você escolher. Cada golpe mostra o tipo, a força (**POD**) e se é **super efetivo** contra o inimigo.',
          ],
        },
        {
          p: 'No manual, o botão **LUTAR** fica cinza ("aguardando a vez…") e uma barrinha dourada enche até a vez do seu Pokémon. Só então ele libera. Isso é de propósito: cada Pokémon tem o seu ritmo, definido pela **velocidade**, e não dá para atacar mais rápido clicando mais.',
        },
        {
          img: 'modo-manual.webp',
          alt: 'Modo manual com os botões LUTAR, MOCHILA, POKéMON e FUGIR',
          caption:
            'No modo MANUAL aparece o botão LUTAR. O botão dourado MEGA só aparece para quem segura uma Mega Stone.',
        },
        { p: 'Troque de modo pelos botões ou com a tecla [[key:A]].' },
      ],
    },
    {
      id: 'comandos',
      q: 'Para que servem MOCHILA, POKéMON e FUGIR (embaixo da cena)?',
      keywords: 'botoes comandos lancar bola trocar fugir',
      a: [
        {
          ul: [
            '**MOCHILA:** abre a lista das suas bolas. Escolha uma para **tentar capturar** o Pokémon selvagem. Mostra a chance de captura de cada bola.',
            '**POKéMON:** mostra sua equipe. Dá para **trocar** o Pokémon que está lutando por um que está esperando.',
            '**FUGIR:** sai da luta. Em Pokémon selvagens não custa nada. Em lutas de chefe ou desafio, ela vira **DESISTIR**.',
          ],
        },
        {
          p: 'Se um botão estiver cinza, é porque não dá para usar agora (por exemplo, sem bolas na Mochila ou durante a troca de inimigo).',
        },
      ],
    },
    {
      id: 'abas-sumindo',
      q: 'Por que algumas abas do menu não aparecem?',
      keywords: 'abas menu bloqueada liberar novo selo desbloquear',
      a: [
        {
          p: 'O menu começa só com **POKéMON, POKéDEX, MOCHILA e TREINADOR**, para não assustar. As outras vão aparecendo com um selo **NOVO** quando fazem sentido:',
        },
        {
          table: {
            head: ['Aba', 'Aparece quando…'],
            rows: [
              ['PC', 'você faz a primeira captura.'],
              ['LOJA', 'você vence 10 Pokémon.'],
              ['MAPA', 'há pelo menos 2 áreas liberadas.'],
              ['MISSÕES', 'você vence 30 Pokémon.'],
              ['MELHORIAS', 'você junta pontos de pesquisa para a primeira melhoria.'],
              ['ATIVIDADES', 'você ganha a primeira insígnia (vence o primeiro líder).'],
            ],
          },
        },
        {
          p: 'Dentro de ATIVIDADES, cada atividade (ovos, jardim, torneio...) também libera numa hora diferente. Tudo isso está explicado no assunto **Atividades**.',
        },
      ],
    },
    {
      id: 'proximos-passos',
      q: 'O que é o painel "Próximos passos"?',
      keywords: 'sugestoes dicas agenda painel',
      a: [
        {
          p: 'É um **assistente**: ele olha o seu jogo e lista as 3 coisas mais úteis para fazer agora, como "Dragonite pode ser enfrentado", "O torneio da semana está aberto" ou "Colher o jardim". Clicando num item você vai direto para a aba certa, e alguns têm um botão de ação (**Desafiar**, **Colher**, **Resgatar**...).',
        },
        {
          p: 'O botão **Todos** mostra a lista completa. O **×** esconde o painel. Se quiser de volta, ele pode ser religado na aba TREINADOR, em OPÇÕES.',
        },
      ],
    },
  ],
};
