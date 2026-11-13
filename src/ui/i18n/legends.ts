// Textos dos lendários: a história de cada um (Santuário e ligação do Professor), os títulos do treinador pela
// coleção de lendas e como descrever quando cada um aparece.

import { LEGEND_WHEN, getSpecies } from '../../game-data';

/** Uma ou duas frases de lore, no tom da Pokédex. */
export const LEGEND_LORE: Record<number, string> = {
  144: 'Dizem que Articuno surge para viajantes perdidos nas montanhas geladas. Suas asas fazem nevar no ar seco.',
  145: 'Zapdos vive dentro das nuvens de tempestade e fica mais forte a cada raio que o atinge.',
  146: 'Cada bater de asas de Moltres solta faíscas. Sua chegada anuncia o fim do inverno.',
  150: 'Criado a partir dos genes de Mew, Mewtwo tem o coração mais selvagem de todos os Pokémon.',
  151: 'Dizem que Mew carrega o código genético de todos os Pokémon. Só quem tem um coração puro consegue vê-lo.',
  243: 'Raikou carrega a velocidade do raio. Seu rugido ecoa como um trovão que cai do céu.',
  244: 'Entei nasceu das chamas de um vulcão. Quando ele ruge, um vulcão entra em erupção em algum lugar.',
  245: 'Suicune corre pelo mundo purificando águas sujas. Dizem que é a encarnação do vento do norte.',
  249: 'Lugia dorme no fundo do mar. Dizem que um bater de asas dele dura quarenta dias de tempestade.',
  250: 'Ho-Oh voa pelos céus com asas de sete cores. Quem o vê ganha felicidade eterna.',
  251: 'Celebi viaja pelo tempo. Onde ele aparece, as florestas ficam verdes e cheias de vida.',
  377: 'Regirock é feito de rochas de todas as eras. Foi selado numa caverna por quem o temia.',
  378: 'Regice nasceu na era do gelo. Seu corpo é de um gelo que nem o magma derrete.',
  379: 'Registeel é de um metal mais duro que qualquer outro. Mesmo depois de mil anos, nada o arranha.',
  380: 'Latias entende o coração das pessoas e fica invisível dobrando a luz em volta das penas.',
  381: 'Latios só abre o coração para quem tem compaixão. Ele protege a irmã, Latias, a qualquer custo.',
  382: 'Kyogre expandiu os mares do mundo. Quando ele desperta, a chuva cai sem parar.',
  383: 'Groudon ergueu os continentes. Seu poder seca a água e faz o sol queimar.',
  384: 'Rayquaza vive na camada de ozônio. Ele desce para acalmar a briga entre Kyogre e Groudon.',
  385: 'Jirachi acorda só uma semana a cada mil anos e realiza qualquer desejo escrito nos papéis da cabeça.',
  386: 'Deoxys nasceu de um vírus que veio do espaço num meteoro, e muda de forma à vontade.',
  480: 'Uxie é o ser do conhecimento. Dizem que apaga a memória de quem olha nos olhos dele.',
  481: 'Mesprit é o ser da emoção. Ensinou às pessoas a tristeza e a alegria.',
  482: 'Azelf é o ser da força de vontade. Dorme no fundo do lago e mantém o mundo em equilíbrio.',
  483: 'Dialga controla o tempo. Quando ele nasceu, o tempo começou a correr.',
  484: 'Palkia controla o espaço. Vive numa dimensão paralela e distorce o espaço à sua volta.',
  485: 'Heatran vive nas cavernas dos vulcões. Seu sangue ferve como magma.',
  486: 'Regigigas puxou os continentes com cordas. Dizem que dorme até os três Regis o acordarem.',
  487: 'Giratina foi banido para o Mundo Distorcido por sua violência. Vê o nosso mundo do outro lado.',
  488: 'Cresselia traz sonhos bons. Suas penas afastam os pesadelos.',
  489: 'Phione nasce de um ovo de Manaphy e vaga pelos mares quentes em bandos.',
  490: 'Manaphy nasce nas águas frias do fundo do mar e consegue trocar de coração com qualquer Pokémon.',
  491: 'Darkrai aparece nas noites de lua nova e prende as pessoas em pesadelos sem fim.',
  492: 'Shaymin vive em campos de flores e transforma o ar poluído em ar puro.',
  493: 'Dizem que Arceus nasceu de um ovo no vazio e criou o universo com mil braços.',
  494: 'Victini traz a vitória. Quem compartilha a energia dele vence qualquer batalha.',
  638: 'Cobalion tem um corpo e um coração de aço. Protegeu os Pokémon das guerras dos humanos.',
  639: 'Terrakion derruba muralhas de pedra com uma investida para salvar Pokémon em perigo.',
  640: 'Virizion se move como o vento e confunde os inimigos com chifres afiados como lâminas.',
  641: 'Tornadus voa sem parar e leva ventos que derrubam casas por onde passa.',
  642: 'Thundurus dispara raios da cauda e espalha incêndios pelos campos.',
  645: 'Landorus deixa as terras férteis por onde passa. Por isso é chamado de guardião das colheitas.',
  643: 'Reshiram queima o mundo com as chamas da cauda. Ajuda quem busca a verdade.',
  644: 'Zekrom esconde o corpo em nuvens de tempestade. Ajuda quem busca os ideais.',
  646: 'Kyurem é a casca vazia que sobrou quando Reshiram e Zekrom se separaram.',
  647: 'Keldeo cruza os mares com a força dos cascos e enfrenta qualquer desafio.',
  648: 'Meloetta canta melodias que mudam as emoções de quem as ouve.',
  649: 'Genesect é um Pokémon de 300 milhões de anos, revivido e modificado por uma equipe malvada.',
  716: 'Xerneas compartilha a vida eterna. Quando os chifres brilham em sete cores, dá vida a quem o rodeia.',
  717: 'Yveltal suga a vida ao redor com as asas. Quando a vida dele acaba, vira um casulo.',
  718: 'Zygarde vigia o ecossistema de dentro das cavernas e protege o equilíbrio do mundo.',
  719: 'Diancie cria diamantes do nada, juntando o carbono do ar entre as mãos.',
  720: 'Hoopa tira tudo o que quer dos anéis: pessoas, Pokémon e até ilhas inteiras.',
  721: 'Volcanion solta vapor dos braços com tanta força que derruba montanhas.',
  772: 'Type: Null foi criado para enfrentar as Ultra Bestas. A máscara pesada segura o seu poder.',
  785: 'Tapu Koko, guardião de Melemele, é curioso e briguento. Chama raios só para ver o que acontece.',
  786: 'Tapu Lele, guardiã de Akala, espalha um pó brilhante que cura… e que, demais, faz mal.',
  787: 'Tapu Bulu, guardião de Ula\'ula, é preguiçoso, mas faz o mato crescer só com o balançar da cauda.',
  788: 'Tapu Fini, guardiã de Poni, cria uma névoa que limpa o coração de quem entra nela.',
  789: 'Cosmog é feito de gás e poeira de estrelas. Dizem que veio de outro mundo por uma fenda no céu.',
  791: 'Solgaleo é chamado de "a fera que devora o sol". Abre caminhos entre os mundos com a própria luz.',
  792: 'Lunala é chamado de "a fera que chama a lua". As asas apagam a luz do dia como se fosse noite.',
  793: 'Nihilego é uma Ultra Besta que parece uma água-viva de vidro. Ninguém sabe o que ela pensa.',
  794: 'Buzzwole é uma Ultra Besta de músculos enormes, que exibe a força para quem estiver por perto.',
  795: 'Pheromosa é uma Ultra Besta elegante e veloz, que se recusa a tocar em qualquer coisa suja.',
  796: 'Xurkitree é uma Ultra Besta de fios elétricos que se planta no chão como uma árvore.',
  797: 'Celesteela é uma Ultra Besta que voa soltando gás pelos braços, como um foguete.',
  798: 'Kartana é uma Ultra Besta de papel, tão afiada que corta aço com um movimento só.',
  799: 'Guzzlord é uma Ultra Besta que come de tudo: montanhas, prédios… e nunca fica satisfeita.',
  800: 'Necrozma vive de luz. Quando não acha mais nenhuma, toma a luz dos outros à força.',
  801: 'Magearna é um Pokémon artificial feito há 500 anos. O coração dela é a Alma-Coração.',
  802: 'Marshadow se esconde na sombra dos outros e copia cada movimento de quem segue.',
  803: 'Poipole é uma Ultra Besta pequena e brincalhona, que cospe veneno quando fica feliz.',
  805: 'Stakataka é uma Ultra Besta feita de vários seres empilhados, que parecem um muro de pedra.',
  806: 'Blacephalon é uma Ultra Besta palhaça que explode a própria cabeça para assustar.',
  807: 'Zeraora corre como um raio e solta faíscas das garras. É o Pokémon mais rápido de Alola.',
  808: 'Meltan é feito de metal líquido. Ele derrete parafusos e porcas e os junta ao próprio corpo.',
};

/** Degraus dos títulos: quantos lendários cada um pede (o último pede todos). */
const TITLE_STEPS: [number, string][] = [
  [1, 'Viu uma Lenda'],
  [10, 'Caçador de Lendas'],
  [25, 'Domador de Lendas'],
];

const titleSteps = (total: number): [number, string][] => [
  ...TITLE_STEPS.filter(([n]) => n < total),
  [total, 'Mestre Lendário'],
];

/** Título do treinador pelo número de lendários capturados. */
export function legendTitle(count: number, total: number): string | undefined {
  return titleSteps(total)
    .filter(([n]) => count >= n)
    .pop()?.[1];
}

/** O próximo título e quantos lendários ele pede (nada depois do último). */
export function nextLegendTitle(count: number, total: number): { name: string; at: number; from: number } | undefined {
  const steps = titleSteps(total);
  const i = steps.findIndex(([n]) => count < n);
  if (i < 0) return undefined;
  return { name: steps[i][1], at: steps[i][0], from: i > 0 ? steps[i - 1][0] : 0 };
}

const WEATHER_TEXT: Record<string, string> = {
  clear: 'céu limpo',
  sun: 'sol forte',
  rain: 'chuva',
  sand: 'tempestade de areia',
  fog: 'névoa',
  hail: 'granizo',
};

/** "com chuva ou névoa, ou de noite" (vazio = a qualquer hora). */
export function whenText(speciesId: number): string {
  const w = LEGEND_WHEN[speciesId];
  if (!w) return '';
  const parts = [
    ...(w.weather?.length ? [`com ${w.weather.map((x) => WEATHER_TEXT[x] ?? x).join(' ou ')}`] : []),
    ...(w.period?.length ? [w.period.map((p) => (p === 'night' ? 'de noite' : 'de dia')).join(' ou ')] : []),
  ];
  return parts.join(', ou ');
}

/** Cor de cada tipo (aura de lendário, energia dos golpes especiais). */
export const TYPE_GLOW: Record<string, string> = {
  fire: '#f08030',
  water: '#6890f0',
  grass: '#78c850',
  electric: '#f8d030',
  ice: '#98d8d8',
  fighting: '#c03028',
  poison: '#a040a0',
  ground: '#e0c068',
  flying: '#a890f0',
  psychic: '#f85888',
  bug: '#a8b820',
  rock: '#b8a038',
  ghost: '#705898',
  dragon: '#7038f8',
  dark: '#705848',
  steel: '#b8b8d0',
  fairy: '#ee99ac',
  normal: '#c8c8a0',
};

export const legendGlow = (speciesId: number) => TYPE_GLOW[getSpecies(speciesId).types[0]] ?? '#f8d870';

