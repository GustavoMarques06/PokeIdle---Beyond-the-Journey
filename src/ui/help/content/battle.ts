import type { Section } from '../types';

export const BATTLE: Section = {
  id: 'batalha',
  title: 'Batalha',
  icon: 'choice-band',
  blurb: 'Como as lutas funcionam, tipos, fraquezas, status e clima.',
  items: [
    {
      id: 'como-luta',
      q: 'Como funciona uma luta?',
      keywords: 'combate dano ataque velocidade hp vida turno intervalo',
      a: [
        {
          p: 'Diferente dos jogos de console, aqui **não existem turnos**. Cada Pokémon ataca sozinho de tempos em tempos, e quem é **mais rápido** ataca com mais frequência. O intervalo normal é de uns 2 a 3 segundos.',
        },
        {
          ul: [
            'A **velocidade** do Pokémon define de quanto em quanto tempo ele ataca.',
            'O **dano** depende do nível, dos atributos (ataque e defesa), da **força do golpe** e do **tipo** (veja a pergunta sobre tipos).',
            'Há **chance de golpe crítico** (mais dano) e de **errar** o golpe, como nos jogos.',
            'Se o golpe é do **mesmo tipo** do Pokémon, ele causa 50% a mais (os jogos chamam de STAB).',
            'Quando o inimigo fica sem vida, você **vence**: ganha EXP, moedas e talvez um item, e seu Pokémon recupera **35% da vida** na hora.',
          ],
        },
        {
          p: 'A **vida** (HP) aparece na barra verde de cada Pokémon. Verde = tranquilo, amarelo = atenção, vermelho = perigo.',
        },
      ],
    },
    {
      id: 'tipos',
      q: 'O que são tipos, fraquezas e "super efetivo"?',
      keywords: 'vantagem desvantagem fogo agua planta resistencia imune efetivo tabela',
      a: [
        {
          p: 'Todo Pokémon e todo golpe têm um **tipo**: [[type:fire]] Fogo, [[type:water]] Água, [[type:grass]] Planta, [[type:electric]] Elétrico, [[type:psychic]] Psíquico e vários outros. Os tipos formam um "pedra, papel e tesoura" gigante:',
        },
        {
          ul: [
            '**Super efetivo:** o golpe causa **o dobro** de dano (ou até o quádruplo, quando o alvo tem dois tipos fracos àquele golpe). Exemplo: [[type:water]] contra [[type:fire]].',
            '**Pouco efetivo:** o golpe causa **metade** do dano. Exemplo: [[type:fire]] contra [[type:water]].',
            '**Sem efeito:** não causa dano nenhum. Exemplo: [[type:normal]] contra [[type:ghost]].',
          ],
        },
        {
          table: {
            head: ['Tipo do golpe', 'Forte contra', 'Fraco contra'],
            rows: [
              ['[[type:fire]]', 'Planta, Gelo, Inseto, Aço', 'Água, Pedra, Fogo, Dragão'],
              ['[[type:water]]', 'Fogo, Terra, Pedra', 'Planta, Água, Dragão'],
              ['[[type:grass]]', 'Água, Terra, Pedra', 'Fogo, Planta, Voador, Inseto…'],
              ['[[type:electric]]', 'Água, Voador', 'Terra (sem efeito), Planta'],
              ['[[type:ground]]', 'Fogo, Elétrico, Pedra, Aço', 'Voador (sem efeito), Planta'],
              ['[[type:psychic]]', 'Lutador, Veneno', 'Sombrio (sem efeito), Aço'],
            ],
          },
        },
        {
          p: 'Você **não precisa decorar nada**. Na caixa do inimigo (canto de cima) aparecem os **tipos dele** e uma linha **FRACO** com os tipos de golpe que mais o machucam. Passando o mouse sobre ela, aparece a lista completa. No modo manual, cada golpe mostra "SUPER EFETIVO" ou "POUCO EFETIVO".',
        },
        {
          tip: 'Uma boa equipe tem Pokémon de tipos variados. O jogo troca sozinho o seu Pokémon por um reserva quando o reserva leva muita vantagem de tipo contra o inimigo.',
        },
      ],
    },
    {
      id: 'desmaiar',
      q: 'O que acontece se meu Pokémon desmaiar? Perco alguma coisa?',
      keywords: 'derrota perder morrer faint morte consequencia',
      a: [
        { p: '**Não perde nada**: nem Pokémon, nem itens, nem dinheiro. As consequências são leves:' },
        {
          ul: [
            'Se você tem um **reserva** de pé na equipe, ele entra no lugar.',
            'Se **toda a equipe** cair, ela é **curada por completo** e uma luta nova começa depois de alguns segundos.',
            'Em **lutas de chefe ou desafio**, você volta para a área normal e pode tentar de novo quando quiser. Quem desmaia é um sinal de que precisa de mais nível, equipe melhor ou tipos mais vantajosos.',
          ],
        },
        {
          warn: 'Existe um desafio opcional chamado **Nuzlocke**, em que desmaiar tem consequências de verdade. Só vale se você ligar de propósito em NOVA JORNADA (veja a seção Melhorias e prestígio).',
        },
      ],
    },
    {
      id: 'golpes',
      q: 'Como meu Pokémon escolhe os golpes? Posso mudar?',
      keywords: 'moves movimentos ataques tm aprender editar',
      a: [
        {
          p: 'Cada Pokémon aprende golpes **subindo de nível**, e usa até **4** ao mesmo tempo. No modo AUTO ele sempre escolhe o golpe que causa mais dano contra o inimigo da vez, levando em conta os tipos.',
        },
        { p: 'Para escolher você mesmo os 4 golpes:' },
        {
          ol: [
            'Abra a aba **POKéMON** e toque no Pokémon.',
            'Na ficha, ao lado de "GOLPES", toque em **Editar**.',
            'Escolha até 4 golpes da lista. Aparecem os que ele aprende por nível, os de **TM** que você tem, golpes de **ovo** e os "lembrados" no Relembrador (custa moedas).',
          ],
        },
        {
          p: 'Os **TMs** são "discos" que ensinam golpes. Veja "Como ensino um golpe com TM?" em Itens.',
        },
      ],
    },
    {
      id: 'status',
      q: 'O que são queimadura, veneno, paralisia, sono e congelamento?',
      keywords: 'status condicao burn poison paralysis sleep freeze',
      a: [
        {
          p: 'Alguns golpes deixam o alvo com uma **condição**, que aparece como uma etiqueta ao lado do nome do Pokémon:',
        },
        {
          table: {
            head: ['Condição', 'O que faz'],
            rows: [
              [
                '**Queimadura**',
                'Perde um pouco de vida a cada ação, e o ataque **físico** cai pela metade.',
              ],
              ['**Veneno**', 'Perde vida a cada ação (mais que a queimadura).'],
              ['**Paralisia**', 'Às vezes perde a vez, e fica mais **lento**.'],
              ['**Sono**', 'Fica algumas ações sem agir.'],
              ['**Congelamento**', 'Não age, mas tem chance de descongelar a cada tentativa.'],
            ],
          },
        },
        {
          p: 'A condição **acaba sozinha** quando a luta termina ou o Pokémon é trocado. Algumas habilidades e itens evitam ou curam condições. Pokémon de certos tipos são imunes (por exemplo, os de [[type:fire]] Fogo não se queimam).',
        },
      ],
    },
    {
      id: 'clima',
      q: 'O que é o clima e o dia/noite?',
      keywords: 'chuva sol neve granizo noite dia tempo relogio',
      a: [
        {
          p: 'O jogo usa o **relógio real** do seu aparelho. De dia e de noite aparecem Pokémon diferentes, e à noite os golpes de [[type:ghost]] Fantasma e [[type:dark]] Sombrio ficam mais fortes. A tela também escurece à noite e ganha tons de amanhecer e entardecer.',
        },
        {
          p: 'O **clima** (sol, chuva, tempestade de areia, neblina e granizo) muda a cada 2 horas e afeta os golpes:',
        },
        {
          ul: [
            '**Sol:** golpes de [[type:fire]] Fogo mais fortes e os de [[type:water]] Água mais fracos.',
            '**Chuva:** o contrário.',
            '**Granizo:** golpes de [[type:ice]] Gelo mais fortes.',
            '**Neblina:** golpes de [[type:ghost]] Fantasma mais fortes.',
            '**Tempestade de areia:** ajuda os Pokémon de Pedra, Terra e Aço.',
          ],
        },
        {
          p: 'Dentro de cavernas e salas fechadas (como a Liga Pokémon) **não há clima**. Algumas espécies só aparecem em certo clima ou horário.',
        },
      ],
    },
    {
      id: 'habilidades-itens-batalha',
      q: 'O que são habilidades e itens segurados na batalha?',
      keywords: 'ability habilidade item segurar held',
      a: [
        {
          ul: [
            '**Habilidade:** um poder passivo da espécie, que funciona sozinho. Por exemplo, **Intimidação** diminui o ataque do inimigo, **Levitação** faz o Pokémon ser imune a golpes de [[type:ground]] Terra.',
            '**Item segurado:** cada Pokémon pode segurar **1 item** que ajuda na luta (por exemplo, **Leftovers** recupera um pouco de vida a cada ação).',
          ],
        },
        {
          p: 'Os dois aparecem na ficha do Pokémon, na parte **Habilidade e item**. Veja mais em Itens e em "Equipe e Pokémon".',
        },
      ],
    },
  ],
};
