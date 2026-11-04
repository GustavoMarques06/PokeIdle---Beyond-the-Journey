import type { Section } from '../types';

export const PROGRESS: Section = {
  id: 'progresso',
  title: 'Missões, melhorias e prestígio',
  icon: 'up-grade',
  blurb: 'Como ficar mais forte no longo prazo e o que é "recomeçar a jornada".',
  items: [
    {
      id: 'missoes',
      q: 'Para que servem as missões?',
      keywords: 'missao diaria semanal tarefa recompensa resgatar',
      a: [
        {
          p: 'Todo dia você recebe **3 missões do dia** e, toda semana, **3 missões da semana**, como "Vença 8 Pokémon" ou "Capture 3 Pokémon do tipo Água". Completando, você toca em **Resgatar** e ganha **moedas, pontos de pesquisa, fichas ou itens**. Cada lista mostra em quanto tempo as missões novas chegam.',
        },
        {
          img: 'missoes.webp',
          alt: 'Lista de missões do dia e da semana',
          caption: 'A aba MISSÕES. A estrelinha vira um ✔ quando você resgata.',
        },
        {
          p: 'Você também pode deixar a **Automação** (aba TREINADOR) resgatar as missões sozinha.',
        },
        { p: '[[go:missions|Abrir MISSÕES]]' },
      ],
    },
    {
      id: 'melhorias',
      q: 'O que é a aba MELHORIAS (o laboratório)?',
      keywords: 'laboratorio pesquisa melhorias upgrades permanente pontos',
      a: [
        {
          p: 'No **Laboratório** você gasta **pontos de pesquisa** em **melhorias permanentes**. Elas **não se perdem** nunca, nem quando você recomeça a jornada. Os pontos vêm de **transferir repetidos**, de **registrar espécies novas** e do diário da Pokédex.',
        },
        {
          img: 'melhorias.webp',
          alt: 'Laboratório com a lista de melhorias e seus níveis',
          caption: 'A aba MELHORIAS: o laboratório (em cima) e a Nova jornada (embaixo).',
        },
        {
          table: {
            head: ['Melhoria', 'O que dá (por nível)'],
            rows: [
              ['**Estudo de treino**', '+5% de EXP.'],
              ['**Economia**', '+5% de moedas.'],
              ['**Bolas aprimoradas**', '+4% de chance de captura.'],
              ['**Primeiros socorros**', '+3% de cura depois de cada vitória.'],
              ['**Diário de viagem**', '+1 hora no limite do progresso offline.'],
              ['**Treino autônomo**', '+2% de eficiência offline.'],
            ],
          },
        },
        { p: '[[go:upgrades|Abrir MELHORIAS]]' },
      ],
    },
    {
      id: 'prestigio',
      q: 'O que é "recomeçar a jornada" (prestígio)? Perco tudo?',
      keywords: 'prestigio nova jornada recomeçar reset resetar reiniciar rebirth',
      a: [
        {
          p: 'Depois de vencer **Misty** (Cerulean), a seção **NOVA JORNADA** da aba MELHORIAS deixa você **recomeçar do zero** em troca de **pontos de prestígio**, que compram melhorias ainda mais fortes. Ela é **totalmente opcional**.',
        },
        { p: 'O que **volta ao começo**: moedas, itens e os níveis dos Pokémon. O que você **mantém**:' },
        {
          ul: [
            'sua **coleção** inteira (espécies e evoluções) e a **Pokédex**;',
            'a **pesquisa** e as melhorias do laboratório;',
            'a **maestria** e as **conquistas**;',
            'as melhorias que você comprou na loja.',
          ],
        },
        {
          p: 'Cada nova jornada também deixa o **rival mais forte**. As melhorias de prestígio são: **Treinamento intenso** (+10% de dano por nível), **Fortuna** (+15% de EXP e moedas), **Veterano** (seus Pokémon recomeçam 5 níveis acima) e **Mochila cheia** (começa com mais bolas e moedas).',
        },
        {
          warn: 'Antes de recomeçar, o jogo mostra quantos pontos você vai ganhar e pede confirmação. Se estiver curtindo a campanha, **não precisa** recomeçar agora.',
        },
      ],
    },
    {
      id: 'desafios',
      q: 'O que são os desafios opcionais (Nuzlocke e outros)?',
      keywords: 'nuzlocke lobo solitario mochila vazia natureza feroz dificil desafio hardcore',
      a: [
        {
          p: 'Ao recomeçar a jornada você pode escolher **uma regra extra** para deixar o jogo mais difícil, em troca de **mais pontos de prestígio**:',
        },
        {
          table: {
            head: ['Desafio', 'Regra', 'Pontos extras'],
            rows: [
              ['**Lobo solitário**', 'Sem equipe de apoio: só o Pokémon que luta.', '+80%'],
              ['**Mochila vazia**', 'O Poké Mart não vende Poké Balls: só valem as que você ganhar.', '+30%'],
              ['**Natureza feroz**', 'Os inimigos causam 50% a mais de dano.', '+40%'],
              [
                '**Nuzlocke**',
                'Só a primeira captura de cada área vale, e quem desmaia contra treinadores fica fora da jornada.',
                '+80%',
              ],
            ],
          },
        },
        {
          p: 'Se você não escolher nenhum, o jogo é o normal ("Nenhum · regras normais").',
        },
      ],
    },
    {
      id: 'conquistas',
      q: 'O que são as medalhas e conquistas?',
      keywords: 'achievement conquista medalha bronze prata ouro platina cartao vitrine moldura',
      a: [
        {
          p: 'São **metas opcionais** (como vencer muitos Pokémon, capturar certas espécies ou chegar longe na campanha). Existem **47 medalhas**, cada uma em níveis **bronze, prata, ouro e platina**. Ganhar medalhas dá **pontos** e libera **molduras** para o seu cartão de treinador.',
        },
        {
          p: 'Na aba **TREINADOR** você vê o **cartão de treinador** (com suas estatísticas, seu MVP da semana e suas insígnias), escolhe 3 medalhas para deixar na **vitrine** e personaliza o **visual** do seu treinador (Red, Leaf, Brendan ou May, com cores de roupa à escolha).',
        },
        {
          img: 'treinador.webp',
          alt: 'Cartão de treinador com insígnias',
          caption: 'O cartão de treinador na aba TREINADOR.',
        },
        { p: '[[go:trainer|Abrir TREINADOR]]' },
      ],
    },
    {
      id: 'automacao',
      q: 'O que é a Automação?',
      keywords: 'automatico regras captura transferir colher resgatar',
      a: [
        {
          p: 'Na aba **TREINADOR** existe um painel **AUTOMAÇÃO** com regras para o jogo fazer tarefas chatas **sozinho**:',
        },
        {
          ul: [
            '**Capturar:** só Pokémon bons (potencial mínimo, habilidade oculta, naturezas procuradas), só formas que faltam, ou tudo.',
            '**Transferir** automaticamente os repetidos que sobram.',
            '**Colher e replantar** o jardim.',
            '**Resgatar missões** prontas.',
          ],
        },
        { p: 'Você escolhe o que ligar. Use só o que fizer sentido para o seu jeito de jogar.' },
      ],
    },
  ],
};
