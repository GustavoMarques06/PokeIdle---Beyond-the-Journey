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
};

/** Título do treinador pelo número de lendários capturados. */
export function legendTitle(count: number, total: number): string | undefined {
  if (count >= total) return 'Mestre Lendário';
  if (count >= 25) return 'Domador de Lendas';
  if (count >= 10) return 'Caçador de Lendas';
  if (count >= 1) return 'Viu uma Lenda';
  return undefined;
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

/** Cor da aura de um lendário: a do tipo principal. */
const TYPE_GLOW: Record<string, string> = {
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

