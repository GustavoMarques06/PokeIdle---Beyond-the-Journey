import type { Section } from '../types';

export const ITEMS: Section = {
  id: 'itens',
  title: 'Itens, TMs e Mega Evolução',
  icon: 'explorer-kit',
  blurb: 'A Mochila, itens segurados, berries, TMs e as Mega Evoluções.',
  items: [
    {
      id: 'mochila',
      q: 'O que tem na Mochila?',
      keywords: 'bag inventario itens bolsa',
      a: [
        {
          p: 'A aba **MOCHILA** tem dois "bolsos": **ITENS** (bolas, pedras, berries, itens para segurar...) e **TMs** (os "discos" de golpes). Cada item mostra a quantidade e, ao tocar, a descrição de para que serve.',
        },
        { p: '[[go:bag|Abrir a MOCHILA]]' },
      ],
    },
    {
      id: 'item-segurado',
      q: 'Como faço um Pokémon segurar um item?',
      keywords: 'held equipar leftovers choice band orb item segurado',
      a: [
        {
          ol: [
            'Abra a aba **POKéMON** e toque no Pokémon para abrir a ficha.',
            'Na parte de baixo da ficha, procure **Habilidade e item**.',
            'Em **ITEM SEGURADO**, abra **Itens na Mochila** e toque no item desejado.',
          ],
        },
        {
          p: 'Cada Pokémon segura **1 item**. Para trocar, toque em **Remover** e escolha outro. Alguns exemplos:',
        },
        {
          ul: [
            '[[item:leftovers]] **Leftovers:** recupera um pouco de vida a cada ação.',
            '[[item:choice-band]] **Choice Band:** mais Ataque.',
            '[[item:life-orb]] **Life Orb:** mais dano, em troca de perder um pouco de vida.',
            '[[item:charcoal]] **Charcoal:** golpes de Fogo causam 20% a mais (cada tipo tem o seu item parecido).',
            '[[item:focus-sash]] **Focus Sash:** sobrevive a um golpe que derrubaria o Pokémon (uma vez por luta).',
          ],
        },
        {
          p: 'Itens para segurar são vendidos na **Loja de Departamentos**, caem de Pokémon selvagens e de raides.',
        },
      ],
    },
    {
      id: 'berries',
      q: 'Para que servem as berries?',
      keywords: 'berry oran sitrus cheri pecha lum jardim fruta',
      a: [
        {
          p: 'Berries são **frutas** que curam. Segurando uma, o Pokémon a come **sozinho** quando a vida cai para a metade (cura) ou quando recebe uma condição como veneno ou paralisia (cura a condição). Cada berry é gasta quando usada.',
        },
        {
          ul: [
            'Você planta no **Jardim** (aba ATIVIDADES) e colhe depois de um tempo.',
            'Também dá para **colher a árvore de berry** de algumas rotas ao ar livre, apertando [[key:B]] ou no botão da cena. Ela cresce de novo depois de umas 4 horas.',
            'Servem de **presente** para o acompanhante (sobe a amizade) e podem ser **vendidas**.',
          ],
        },
      ],
    },
    {
      id: 'tm',
      q: 'Como ensino um golpe com TM?',
      keywords: 'tm mt disco golpe ensinar aprender estojo',
      a: [
        {
          p: 'Um **TM** ensina um golpe a um Pokémon. Diferente dos jogos antigos, aqui **o TM não some**: depois de liberado, você pode ensinar **quantas vezes quiser**.',
        },
        {
          ol: [
            'Abra a **MOCHILA** e toque no bolso **TMs**.',
            'Escolha o TM e depois o Pokémon que vai aprender.',
            'Escolha qual dos 4 golpes dele será trocado.',
          ],
        },
        {
          p: 'O estojo mostra todos os TMs do jogo, inclusive **onde conseguir** os que faltam: os líderes de ginásio entregam TMs, e outros vêm da Torre de Batalha, do Game Corner, das expedições e da **prateleira de TMs** da Loja de Departamentos.',
        },
      ],
    },
    {
      id: 'rare-candy',
      q: 'O que é o Rare Candy?',
      keywords: 'doce raro nivel subir candy',
      a: [
        {
          p: 'O [[item:rare-candy]] **Rare Candy** faz o Pokémon **subir 1 nível na hora**. Fica na ficha do Pokémon (botão com o ícone do doce) quando você tem algum. Dá para comprar na Loja de Departamentos.',
        },
      ],
    },
    {
      id: 'mega',
      q: 'Como funciona a Mega Evolução?',
      keywords: 'mega stone pedra charizard mewtwo transformar transformacao',
      a: [
        {
          p: 'A **Mega Evolução** é uma transformação **temporária** que deixa certos Pokémon muito mais fortes durante a luta, como nos jogos. Existem **48 Megas** da 6ª geração, entre elas Mega Charizard X e Y, Mega Venusaur, Mega Blastoise, Mega Mewtwo X e Y, Mega Gengar, Mega Lucario e Mega Garchomp.',
        },
        {
          p: 'A **Mega Rayquaza** não usa Mega Stone nos jogos originais. Aqui, ela segue a mesma regra das outras: basta segurar o **Meteorite**, vendido na Loja de Departamentos.',
        },
        {
          img: 'mega.webp',
          alt: 'Blastoise antes e depois de Mega Evoluir',
          caption:
            'Blastoise antes e depois da Mega Evolução: o sprite muda, aparece MEGA na caixa de status e os atributos sobem.',
        },
        { p: 'Para usar:' },
        {
          ol: [
            '**Compre a Mega Stone** da espécie na Loja de Departamentos (aba LOJA, seção "ITENS SEGURÁVEIS", **de 80.000 a 300.000 moedas**, conforme a força da Mega). Por exemplo, a **Charizardite X** é do Charizard.',
            '**Faça o Pokémon segurar** a pedra (veja "Como faço um Pokémon segurar um item?"). Tem que ser a **espécie certa** e já evoluída: um Charmander não usa Charizardite, só o Charizard.',
            '**Lute!** No modo **AUTO** ele se transforma **sozinho** no começo de cada encontro. No modo **MANUAL** aparece um botão dourado **MEGA** (ou tecla [[key:M]]) na caixa de mensagens. Ele **não gasta a vez** do Pokémon.',
          ],
        },
        {
          ul: [
            'A Mega muda **tipos, atributos, habilidade e a aparência**. A vida máxima não muda.',
            'Dura **até o fim do encontro** e some se você trocar de Pokémon. Só dá para Mega Evoluir **uma vez por encontro**.',
            'Alguns chefes já entram Mega Evoluídos, como Steven, Cynthia, Diantha e Lysandre.',
          ],
        },
        {
          warn: 'A Mega Stone é cara de propósito. Compre quando já tiver dinheiro de sobra e um Pokémon que você realmente use.',
        },
      ],
    },
  ],
};
