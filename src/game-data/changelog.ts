// Log de atualizações mostrado no jogo (janela NOVIDADES). A primeira entrada é a mais nova: ao publicar uma versão,
// acrescente uma entrada no topo com um `id` novo. Quem já jogava vê a janela uma vez depois de atualizar.

export type ChangeTag = 'novo' | 'melhoria' | 'correção';

export interface ChangelogEntry {
  /** Único e crescente: a janela abre sozinha quando o mais novo ainda não foi visto. */
  id: string;
  date: string;
  title: string;
  items: { tag: ChangeTag; text: string }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-11-10-creche-pc',
    date: '10/11/2026',
    title: 'Creche: escolha pelo PC',
    items: [
      { tag: 'novo', text: 'Toque numa vaga da Creche e o PC abre numa janela: suas caixas, busca por nome e "só os que combinam".' },
      { tag: 'novo', text: 'Pares sugeridos para o hóspede que já está lá, com coração nos que combinam e a ficha de cada um (grupos de ovo, IVs, item).' },
      { tag: 'correção', text: 'Textos legíveis nos cartões azuis (expedições, vagas da Creche e zonas do Safari) e abas do Treinador que não se sobrepõem no celular.' },
      { tag: 'correção', text: 'Safari: foto repetida ou item que acabou não gastam mais o humor do Pokémon.' },
    ],
  },
  {
    id: '2026-11-10-safari-2',
    date: '10/11/2026',
    title: 'Safari: Guia, Unova, Kalos e mais',
    items: [
      { tag: 'novo', text: 'Guia do Safari: ele passa 4 h numa zona e volta com 1 a 3 Pokémon, mesmo com o jogo fechado.' },
      { tag: 'novo', text: 'Duas zonas novas: Bosque Pinwheel (Unova) e Colinas de Flores (Kalos).' },
      { tag: 'novo', text: 'Loja do Safari: Ovo raro e Mega Stone surpresa (uma que você ainda não tem).' },
      { tag: 'novo', text: 'Recorde de maior Pokémon: cada um tem um tamanho, que aparece no encontro.' },
      { tag: 'novo', text: 'Dica do Guarda: toda semana ele conta a berry favorita de um Pokémon.' },
      { tag: 'melhoria', text: 'Lago com água e vara de pesca, pedra e Lama em pixel art, cadeado nas zonas fechadas e sons para cada humor e para a câmera.' },
      { tag: 'melhoria', text: 'O saguão mostra os caminhos em cartões, e os pedidos não revelam Pokémon que você ainda não viu.' },
      { tag: 'correção', text: 'Um shiny que foge sai correndo com as cores de shiny, e a berry jogada aparece no arremesso.' },
    ],
  },
  {
    id: '2026-11-09-safari',
    date: '09/11/2026',
    title: 'Safari novo',
    items: [
      { tag: 'novo', text: 'Cena viva: o Pokémon sai do mato, a isca cai, a pedra faz "tum", a bola sacode e ele foge correndo.' },
      { tag: 'novo', text: 'Humor como nos jogos de GBA: comendo, irritado ou de olho, e cada humor muda a captura e a fuga.' },
      { tag: 'novo', text: 'Passos e caminhos: grama baixa, grama alta com os raros e o lago para pescar.' },
      { tag: 'novo', text: '5 zonas que abrem com o progresso: Planície, Floresta, Montanha, Grande Pântano e o Lago dos Bebês.' },
      { tag: 'novo', text: 'Surto da semana, berries do Jardim como isca (a favorita funciona melhor), Lama, Pokébloco e câmera.' },
      { tag: 'novo', text: 'Pedidos do Guarda, Pontos de Safari e loja (bolas, botas, varas, Lama e Pokébloco).' },
      { tag: 'novo', text: 'Pokédex de cada zona com prêmio ao completar, recordes e um resumo no fim da visita.' },
    ],
  },
  {
    id: '2026-11-09-historia',
    date: '09/11/2026',
    title: 'Uma história nova: Além da Jornada',
    items: [
      { tag: 'novo', text: 'O clima do mundo enlouqueceu, a Equipe Eclipse quer domar os lendários e um Viajante de capuz parece conhecer você bem demais.' },
      { tag: 'novo', text: '15 capítulos que acontecem conforme você avança: no meio e no Campeão de cada região, no final em Kalos e a cada nova jornada.' },
      { tag: 'novo', text: 'Seu inicial narra tudo num diário, inclusive o que fez enquanto você estava fora.' },
      { tag: 'novo', text: 'Um final com escolha (e um título para o cartão de treinador).' },
      { tag: 'novo', text: 'Diário da Jornada em TREINADOR › JORNADA: o próximo capítulo e os já vistos para rever.' },
      { tag: 'melhoria', text: 'Quem já jogava começa do capítulo em que está, sem receber todos os anteriores de uma vez.' },
    ],
  },
  {
    id: '2026-11-09-lendas',
    date: '09/11/2026',
    title: 'Lendas vivas e uma Creche de verdade',
    items: [
      { tag: 'novo', text: 'Lendários com entrada de cinema, aura na cor do tipo, partículas e música de chefe.' },
      { tag: 'novo', text: 'Cada lendário aparece com um clima ou numa hora do dia (Articuno no granizo, Darkrai à noite…).' },
      { tag: 'novo', text: 'Boato do dia: um lendário aparece a qualquer hora e fica 1,5× mais fácil de capturar.' },
      { tag: 'novo', text: 'Chaves como nos jogos: Silver Wing (Lugia), Rainbow Wing (Ho-Oh), Relicanth e Wailord (Regis), e duplas e trios que se chamam (Rayquaza depois de Kyogre e Groudon, Arceus depois de Dialga, Palkia e Giratina…).' },
      { tag: 'novo', text: 'Abaixo de metade do HP o lendário se enfurece: fica mais forte, se livra do status e traz o clima dele.' },
      { tag: 'novo', text: 'Medidor de captura com dicas, bolas com afinidade (Dusk Ball no Darkrai, Dive Ball no Kyogre…) e status ajudando de verdade.' },
      { tag: 'novo', text: 'Caça ao shiny: cada encontro com um lendário aumenta a chance de ele vir shiny (até 5×).' },
      { tag: 'novo', text: 'Santuário com os lendários capturados nos pedestais, a história de cada um e títulos no cartão de treinador.' },
      { tag: 'novo', text: 'O Professor liga na primeira captura de cada lendário, e um aviso chega quando um deles volta.' },
      { tag: 'novo', text: 'Creche nova: chocadeiras, ovo levado na equipe, ovo misterioso com a cor do tipo e cerimônia de chocar com roleta de prêmios.' },
      { tag: 'novo', text: 'Herança como nos jogos: Destiny Knot, Power Items, Everstone, habilidade oculta e Método Masuda.' },
      { tag: 'novo', text: 'Ovos raros (mercador, raides, expedições e Game Corner), Aquecedor, Chocadeira extra e Diário da Chocadeira.' },
      { tag: 'novo', text: 'Chocar todos em sequência, apelido na hora, IVs herdados na cerimônia e Juiz de IVs na ficha.' },
      { tag: 'novo', text: 'Missões de chocar ovos de um tipo e este log de atualizações.' },
    ],
  },
  {
    id: '2026-11-09-mobile',
    date: '09/11/2026',
    title: 'Celular organizado, neve e golpes de apoio',
    items: [
      { tag: 'melhoria', text: 'Layout de celular reorganizado por inteiro, sem mudar nada do que você via.' },
      { tag: 'novo', text: 'Nos campos de neve quase sempre neva; a noite limpa mostra a aurora.' },
      { tag: 'melhoria', text: 'Mega Lançador fiel aos jogos: golpes de pulso ×1,5. O Blastoise aprende Water, Dark e Dragon Pulse.' },
      { tag: 'novo', text: 'Golpe de apoio escolhível na ficha (qualquer um que já aprendeu, automático ou nenhum).' },
    ],
  },
  {
    id: '2026-11-09-platina',
    date: '09/11/2026',
    title: 'Platina possível, offline corrigido e Megas',
    items: [
      { tag: 'correção', text: 'O progresso offline rendia bem menos que o esperado; agora fica perto da batalha real.' },
      { tag: 'correção', text: 'Unown, ovos e prêmios vinham sem forma: a conquista das 28 formas ficou possível.' },
      { tag: 'novo', text: 'Mais efeitos de golpe em pixel art e Mega Rayquaza com Dragon Ascent.' },
      { tag: 'melhoria', text: 'Sprites da rota baixados antes de aparecer.' },
    ],
  },
  {
    id: '2026-11-09-cenarios',
    date: '09/11/2026',
    title: '21 cenários novos',
    items: [
      { tag: 'novo', text: '21 cenários de batalha redesenhados, golpes mais fiéis e backup automático do save.' },
    ],
  },
  {
    id: '2026-11-06',
    date: '06/11/2026',
    title: 'Pokédex completa e modo Desempenho',
    items: [
      { tag: 'novo', text: 'Todas as espécies agora podem ser obtidas.' },
      { tag: 'novo', text: 'Modo Desempenho para aparelhos simples e menu com os nomes das abas.' },
      { tag: 'novo', text: 'Celular de verdade, aviso de versão nova, golpes de apoio e Mega Rayquaza.' },
      { tag: 'melhoria', text: 'Climas sem véu escuro sobre a cena.' },
    ],
  },
  {
    id: '2026-11-05',
    date: '05/11/2026',
    title: 'Jogo no navegador e no celular',
    items: [
      { tag: 'novo', text: 'O jogo passou a rodar no site, também sem internet, em celular e PC.' },
      { tag: 'correção', text: 'Menu inicial sempre do topo e texto da Pokédex sem corte.' },
    ],
  },
  {
    id: '2026-11-04',
    date: '04/11/2026',
    title: 'Mega Evolução',
    items: [
      { tag: 'novo', text: 'Mega Evolução, guia de ajuda, cenários da Liga e novos sprites.' },
    ],
  },
  {
    id: '2026-10-30',
    date: '30/10/2026',
    title: 'Desempenho e rival de Hoenn',
    items: [
      { tag: 'novo', text: 'Pré-carregamento, menu que aparece aos poucos, rival de Hoenn e 4 golpes por Pokémon.' },
    ],
  },
  {
    id: '2026-10-29',
    date: '29/10/2026',
    title: 'Versão 0.9.0',
    items: [
      { tag: 'novo', text: 'Equipe de 6, Cabo Link, automação, TMs, roupas do treinador e rebalanceamento.' },
    ],
  },
  {
    id: '2026-10-28',
    date: '28/10/2026',
    title: 'Versões 0.7 e 0.8',
    items: [
      { tag: 'novo', text: 'Abertura com história, laboratório, tutorial e apelidos.' },
      { tag: 'novo', text: 'Kalos, transferência de save, Caixa organizada, HUD novo, PC e batalha manual.' },
    ],
  },
];
