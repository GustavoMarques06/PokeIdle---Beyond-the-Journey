import type { Section } from '../types';

export const TEAM: Section = {
  id: 'equipe',
  title: 'Equipe e Pokémon',
  icon: 'exp-share',
  blurb: 'Montar a equipe, entender a ficha de cada Pokémon e o que significam nível, IV, natureza...',
  items: [
    {
      id: 'equipe',
      q: 'Como funciona a equipe?',
      keywords: 'time reserva ativo trocar ordem vagas bonus passivo',
      a: [
        {
          p: 'Você leva até **6 Pokémon** na equipe, mas as vagas começam trancadas e vão **liberando uma de cada vez** conforme você avança (vencendo líderes, por exemplo). Só a próxima vaga a liberar aparece na lista.',
        },
        {
          ul: [
            'O **primeiro** da lista é quem **luta**.',
            'Os outros ficam **esperando a vez**. Eles entram em campo quando o primeiro desmaia, ou quando têm uma **vantagem grande de tipo** contra o inimigo.',
            'Todos dão **bônus** para a equipe pelo seu tipo (mais dano, mais EXP, mais moedas, mais chance de captura...). O bônus aparece embaixo do nome de cada um e o total fica no botão **BÔNUS E EQUIPES SALVAS**, abaixo da equipe.',
            'Quem espera a vez também ganha **metade da EXP** de cada vitória.',
          ],
        },
        {
          img: 'equipe.webp',
          alt: 'Lista da equipe com setas para subir e descer',
          caption:
            'Use as setas ▲ ▼ para mudar a ordem e o ✕ para tirar alguém da equipe. Toque num Pokémon para abrir a ficha dele numa janela.',
        },
        {
          p: 'Para pôr alguém na equipe: **POKéMON** → botão **+ Adicionar Pokémon** (ou abra a ficha de um Pokémon e toque em **Pôr na equipe**). Para fazê-lo lutar na hora: **Pôr para lutar**.',
        },
        { p: '[[go:party|Abrir a aba POKéMON]]' },
      ],
    },
    {
      id: 'ficha',
      q: 'O que significa cada item da ficha do Pokémon?',
      keywords: 'resumo potencial natureza origem ficha status atributos sumario',
      a: [
        {
          img: 'ficha-pokemon.webp',
          alt: 'Ficha de um Pokémon com tipo, potencial, natureza e golpes',
          caption: 'A ficha aparece ao tocar num Pokémon da aba POKéMON.',
        },
        {
          ul: [
            '**Tipo:** os tipos do Pokémon (um ou dois).',
            '**Potencial:** uma nota de 0% a 100% que resume os seus **IVs** (a "genética" dele). Quanto maior, melhor. **PERFEITO** é 100%.',
            '**Natureza:** a "personalidade". Aumenta um atributo em 10% e diminui outro em 10%.',
            '**Origem:** onde ele veio (inicial, captura, ovo, troca...).',
            '**Maestria:** um nível extra que sobe ao lutar com a mesma espécie (veja abaixo).',
            '**HP e EXP:** as duas barras: vida e experiência para o próximo nível.',
            '**Tabela de atributos:** HP, Ataque, Defesa, Ataque Esp., Defesa Esp. e Velocidade, com os números de IV e EV de cada um.',
            '**Golpes:** os que ele usa em batalha. O botão **Editar** deixa você escolher.',
            '**Habilidade e item:** o poder passivo e o item segurado.',
            '**Histórico:** vitórias, críticos, dano causado e desmaios deste Pokémon.',
          ],
        },
      ],
    },
    {
      id: 'iv-ev',
      q: 'O que são IVs e EVs? Preciso me preocupar?',
      keywords: 'iv ev genes genetica treino potencial perfeito',
      a: [
        {
          p: 'Não precisa se preocupar no começo. São duas coisas que fazem um Pokémon ser um pouco mais forte que outro **da mesma espécie e do mesmo nível**:',
        },
        {
          ul: [
            '**IV** (do inglês "valores individuais"): a **genética**. Cada atributo recebe um número de 0 a 31 **na hora em que o Pokémon nasce ou é capturado** e nunca muda. A soma vira o **Potencial** que aparece na ficha. Dois Pokémon iguais podem ter potenciais bem diferentes: por isso vale capturar vários.',
            '**EV** (do inglês "valores de esforço"): o **treino**. Vai de 0 a 252 por atributo (máximo de 510 no total) e aumenta com o **Campo de Treino** (aba ATIVIDADES), vitaminas e duplicatas.',
          ],
        },
        {
          tip: 'Regra simples: se capturou um Pokémon com **potencial alto** (80% ou mais) de uma espécie que você gosta, vale a pena investir nele. Os outros podem virar pontos de pesquisa (veja "O que faço com os repetidos?").',
        },
      ],
    },
    {
      id: 'natureza',
      q: 'O que é a natureza de um Pokémon?',
      keywords: 'nature hasty timid adamant jolly personalidade',
      a: [
        {
          p: 'Existem **25 naturezas** (Hasty, Timid, Adamant...). Cada uma, com exceção das neutras, faz um atributo **subir 10%** e outro **descer 10%**. Na ficha aparece assim: "Hasty +Velocidade · −Defesa".',
        },
        {
          p: 'O atributo que sobe fica **verde** e o que desce fica **vermelho** na tabela. Uma natureza boa para a função do Pokémon (por exemplo +Ataque num Pokémon que ataca) é sempre melhor, mas a diferença é pequena. Não é motivo para trocar de Pokémon.',
        },
      ],
    },
    {
      id: 'habilidade',
      q: 'O que é a habilidade? E a "habilidade oculta"?',
      keywords: 'ability patch capsula oculta hidden',
      a: [
        {
          p: 'A **habilidade** é um poder passivo que funciona sozinho durante a luta (veja a lista de exemplos em Batalha). Ela também dá um **bônus pequeno para a equipe** quando o Pokémon está esperando a vez.',
        },
        {
          p: 'Muitas espécies têm uma **habilidade oculta**, mais rara. Para trocar por ela existem itens: a **Cápsula** (Ability Capsule) e o **Patch** (Ability Patch), que aparecem na ficha, em **Habilidade e item**. Eles são vendidos na Loja de Departamentos.',
        },
      ],
    },
    {
      id: 'maestria',
      q: 'O que é Maestria?',
      keywords: 'mastery nivel familia evolucao',
      a: [
        {
          p: 'A **Maestria** é um nível especial que **sobe sozinho conforme você vence lutas com uma espécie** (e com as evoluções dela: Charmander, Charmeleon e Charizard dividem a mesma maestria). Cada nível dá **+2% de dano** e **−2% de dano recebido** ao Pokémon que está lutando.',
        },
        {
          p: 'Ou seja: ao evoluir, você **não perde** esse trabalho. E vale a pena ter alguns Pokémon favoritos que você sempre usa.',
        },
      ],
    },
    {
      id: 'apelido',
      q: 'Como dou apelido, favorito ou etiqueta a um Pokémon?',
      keywords: 'nome renomear favoritar etiqueta tag organizar',
      a: [
        {
          ul: [
            '**Apelido:** na ficha, toque em "dar apelido", digite e confirme. Deixar vazio volta ao nome da espécie.',
            '**Favorito** (botão **Favoritar**): protege o Pokémon. Favoritos **nunca** são transferidos, nem pela limpeza de repetidos.',
            '**Etiqueta:** uma cor para organizar (por exemplo "para evoluir", "para trocar"). Você pode renomear as 6 etiquetas na tela TREINADOR. Aparece em **Mais ações** na ficha.',
            '**Acompanhante:** um Pokémon que anda com você no cartão de treinador, ganha **amizade** com o tempo e às vezes **acha itens**.',
          ],
        },
      ],
    },
    {
      id: 'pc',
      q: 'Onde ficam os Pokémon que não estão na equipe? O que é o PC?',
      keywords: 'caixa box guardar organizar filtro transferir',
      a: [
        {
          p: 'Todo Pokémon capturado vai para o **PC**: a aba com as **caixas** onde ficam todos os seus Pokémon. Ela aparece depois da sua primeira captura.',
        },
        {
          ul: [
            'Tem **busca** por nome, **filtros** (tipo, etiqueta, shiny, perfeitos, repetidos) e ordenação.',
            'Dá para **selecionar vários** de uma vez para etiquetar ou transferir.',
            'Para pôr alguém na equipe: **arraste** da caixa para a equipe (solte numa vaga livre ou em cima de quem vai sair). No celular, toque em **Mover** e depois na equipe. Também dá pela ficha, em **Pôr na equipe**.',
          ],
        },
        {
          img: 'pc.webp',
          alt: 'Tela do PC com as caixas de Pokémon',
          caption: 'As caixas do PC. A equipe aparece em cima; ao lado, a ficha do Pokémon selecionado.',
        },
        { p: '[[go:pc|Abrir o PC]]' },
      ],
    },
    {
      id: 'repetidos',
      q: 'O que faço com os Pokémon repetidos? O que é "transferir"?',
      keywords: 'duplicata duplicatas pesquisa transferir soltar vender automacao',
      a: [
        {
          p: '**Transferir** significa enviar o Pokémon para o laboratório do professor. Ele sai da sua coleção e em troca você ganha **pontos de pesquisa**, que compram **melhorias permanentes** na aba MELHORIAS. Ou seja: repetidos **não são lixo**, são moeda.',
        },
        {
          ul: [
            'Só dá para transferir **repetidos** (uma segunda cópia de uma espécie que você já tem) e nunca quem está na equipe. A primeira cópia de cada espécie fica sempre.',
            'Valem mais pontos os Pokémon de **nível mais alto**, os **shiny** e os de **potencial alto**.',
            'Para limpar vários de uma vez: no PC, **selecione** e toque em **Transferir**. Ou deixe a **Automação** (aba TREINADOR) transferir os repetidos sozinha.',
            '**Favoritos** nunca são transferidos.',
          ],
        },
      ],
    },
  ],
};
