// Roteiro de "Além da Jornada". Quem fala: o diário do parceiro (o inicial, que narra o que vive com você), o
// Prof. Carvalho, o Viajante (um treinador encapuzado que parece conhecer você bem demais) e Vesper, comandante da
// Equipe Eclipse, que quer domar os lendários para controlar o céu. A virada: o Viajante é você, de uma jornada
// anterior; cada "nova jornada" (o prestígio) é uma volta do laço do tempo.

export type Speaker = 'diary' | 'partner' | 'oak' | 'ghost' | 'vesper' | 'narrator';

export interface StoryCtx {
  /** Nome do jogador, em maiúsculas. */
  n: string;
  /** Nome (ou apelido) do parceiro, em maiúsculas. */
  p: string;
  /** Quantas jornadas já recomeçaram. */
  loops: number;
}

export interface StoryLine {
  who: Speaker;
  text: (c: StoryCtx) => string;
}

export const SPEAKER_NAME: Record<Speaker, (c: StoryCtx) => string> = {
  diary: (c) => `DIÁRIO DE ${c.p}`,
  partner: (c) => c.p,
  oak: () => 'PROF. CARVALHO',
  ghost: () => 'O VIAJANTE',
  vesper: () => 'VESPER · EQUIPE ECLIPSE',
  narrator: () => '',
};

const L = (who: Speaker, text: (c: StoryCtx) => string): StoryLine => ({ who, text });

export const CHAPTER_TITLES: Record<string, string> = {
  start: 'O primeiro dia',
  'kanto-mid': 'Um bilhete na grama',
  'kanto-end': 'O céu reclama',
  'johto-mid': 'A torre que queimou duas vezes',
  'johto-end': 'Penas de sete cores',
  'hoenn-mid': 'Mar contra terra',
  'hoenn-end': 'Mais transparente a cada volta',
  'sinnoh-mid': 'Memória, emoção e vontade',
  'sinnoh-end': 'Quem tentou parar o tempo',
  'unova-mid': 'O mesmo boné',
  'unova-end': 'Eu sou você',
  'kalos-mid': 'Vida e destruição',
  finale: 'Além da jornada',
  'loop-1': 'Desta vez, eu lembro',
  'loop-2': 'O laço aperta',
};

export const STORY: Record<string, StoryLine[]> = {
  start: [
    L('diary', (c) => `Hoje ${c.n} me escolheu. Eu fingi que não estava nervoso, mas estava. A primeira batalha passou rápido, e a gente venceu!`),
    L('diary', () => 'Uma coisa estranha: à tarde caiu granizo. Em pleno verão. O Professor ficou olhando para o céu por um tempão.'),
    L('oak', (c) => `${c.n}, o clima anda esquisito em todo lugar. Chuva que não para, sol que não se põe… Os mais velhos dizem que é o humor dos Pokémon lendários. Fique de olho, está bem?`),
    L('diary', () => 'Vou escrever tudo aqui. Quando você sair para descansar, eu continuo treinando e conto depois.'),
  ],
  'kanto-mid': [
    L('narrator', () => 'Depois da batalha, um papel dobrado aparece preso na grama, como se alguém tivesse deixado ali de propósito.'),
    L('ghost', (c) => `"${c.n}. Você não se lembra de mim, mas eu me lembro de você. Cuide bem do ${c.p}. Ele vai precisar de você mais do que imagina."`),
    L('diary', () => 'Eu conheço essa letra. Não sei de onde. Fiquei com frio na barriga o resto do dia.'),
  ],
  'kanto-end': [
    L('vesper', (c) => `Então você é o tal ${c.n}, campeão de Kanto. Parabéns. Eu sou Vesper, da Equipe Eclipse.`),
    L('vesper', () => 'Articuno, Zapdos, Moltres… cada um traz o seu clima e o mundo vira um caos. Nós vamos domar os lendários e dar ao céu um dono. Um céu sem surpresas.'),
    L('oak', (c) => `${c.n}, se a Eclipse capturar os lendários antes de você, não sei o que acontece com o clima. Os pássaros só aparecem no tempo deles: granizo, chuva, sol. Esteja lá primeiro.`),
    L('oak', () => 'A oeste fica Johto, terra de tradições antigas. Dizem que lá duas aves lendárias guardam as torres da cidade.'),
    L('diary', () => 'Vesper sorriu como quem já sabe o fim da história. Eu não gostei.'),
  ],
  'johto-mid': [
    L('narrator', () => 'Na Torre Queimada, o vento traz cinzas antigas. Uma figura de capuz observa do alto das vigas.'),
    L('ghost', () => 'Já vi esta torre queimar duas vezes. Na primeira, eu era jovem demais para entender. Na segunda… eu já sabia o que ia acontecer.'),
    L('ghost', (c) => `As três feras correm pelo mundo. Quando as três confiarem em você, a ave de sete cores desce. Junte as asas, ${c.n}.`),
    L('diary', () => 'Ele falou "duas vezes" como se o tempo andasse em círculo. Será que o Celebi tem algo a ver? Dizem que ele viaja no tempo…'),
  ],
  'johto-end': [
    L('vesper', () => 'Raikou, Entei, Suicune. Corredores bonitos. Pena que não param quietos. A Eclipse já preparou jaulas para o vento do norte.'),
    L('ghost', (c) => `Não deixe ela pegar o Suicune. Da outra vez, eu deixei, e choveu por um ano inteiro. Lugia e Ho-Oh só aparecem para quem tem a pena certa. Eu também juntei as asas, ${c.n}. Da outra vez.`),
    L('oak', () => 'Hoenn é feita de mar e vulcões. Se a Eclipse está certa, lá dormem os dois que fizeram os mares e os continentes. Tenho um mau pressentimento.'),
    L('diary', () => 'Hoje o Viajante tirou a luva por um segundo. Na mão dele tinha uma cicatriz igual à que você ganhou na Floresta de Viridian. Igualzinha.'),
  ],
  'hoenn-mid': [
    L('narrator', () => 'O mar de Hoenn ferve num ponto e congela no outro. Chuva e sol brigam no mesmo céu.'),
    L('vesper', () => 'Kyogre e Groudon acordaram. Que espetáculo! Quando eles terminarem de brigar, sobra um céu cansado, fácil de domar.'),
    L('oak', (c) => `${c.n}! Kyogre traz a chuva, Groudon traz o sol. Só um terceiro, lá do alto, consegue acalmar os dois. Mas ele só desce depois que os dois estiverem em boas mãos.`),
    L('diary', () => 'Nunca vi você tão concentrado. Eu também não vou recuar.'),
  ],
  'hoenn-end': [
    L('ghost', () => 'Sabe por que eu uso capuz? Porque a cada vez que a jornada recomeça, eu fico um pouco mais transparente. Daqui a pouco, nem o capuz vai segurar.'),
    L('ghost', (c) => `Rayquaza desce quando os dois oceanos de força estão em paz. Você está fazendo melhor do que eu fiz, ${c.n}.`),
    L('diary', () => 'Ele disse "a jornada recomeça". Recomeça como? Eu pensei que a gente ia só… seguir.'),
    L('oak', () => 'Sinnoh, ao norte, guarda as lendas da origem do mundo: tempo, espaço e um terceiro, banido para o outro lado. Leve agasalho.'),
  ],
  'sinnoh-mid': [
    L('narrator', () => 'Três lagos. Em cada um, um ser dorme: o conhecimento, a emoção e a força de vontade.'),
    L('diary', () => 'Sonhei que já tínhamos estado aqui. Você usava outro boné, eu era menor, e a gente perdia para a Eclipse. Acordei chorando, mas não contei para ninguém.'),
    L('ghost', (c) => `O Uxie apaga memórias. O Mesprit as faz doer. O Azelf dá força para seguir mesmo assim. ${c.p} está começando a lembrar, ${c.n}. Os parceiros sempre lembram primeiro.`),
  ],
  'sinnoh-end': [
    L('vesper', () => 'Dialga controla o tempo. Com ele, a Eclipse congela o mundo no dia perfeito: sol na medida, nenhuma tempestade, para sempre.'),
    L('ghost', () => 'Fui eu que tentei parar o tempo, da outra vez. Para não perder ninguém. E foi assim que tudo começou a dar voltas.'),
    L('ghost', (c) => `Não repita o meu erro, ${c.n}. O tempo parado não salva ninguém. Só faz a gente perder do mesmo jeito, de novo e de novo.`),
    L('oak', () => 'Unova fica longe daqui. Cidades enormes, pontes gigantes… e dois dragões que dividiram uma verdade e um ideal.'),
  ],
  'unova-mid': [
    L('narrator', () => 'No alto da Torre Dragonspiral, o vento arranca o capuz do Viajante por um instante.'),
    L('diary', (c) => `Era o mesmo boné. O mesmo jeito de coçar a nuca. O mesmo sorriso torto quando ganha. ${c.n}… era você. Mais velho, cansado, quase transparente. Mas era você.`),
    L('ghost', () => 'Agora você viu. Não precisa dizer nada. Reshiram busca a verdade; Zekrom, os ideais. A verdade é esta. O ideal… ainda dá tempo.'),
  ],
  'unova-end': [
    L('ghost', (c) => `Eu sou você, ${c.n}. De uma jornada que acabou. Quando a gente recomeça uma jornada, o mundo volta ao começo, mas um pedaço de quem fomos fica para trás. Eu sou o pedaço que ficou.`),
    L('vesper', () => 'Então é isso! Um treinador que volta no tempo… A energia de cada recomeço é o que deixa os lendários inquietos. A Eclipse vai usá-la. Com ela, o céu será nosso.'),
    L('ghost', () => 'Vesper sempre chega a esta conclusão. Em todas as voltas. Mas desta vez, você chegou mais longe do que eu.'),
    L('oak', () => 'Kalos é o último desafio. Vida e destruição, um cervo e uma ave. E um guardião que vigia o equilíbrio de tudo. Eu acredito em você.'),
  ],
  'kalos-mid': [
    L('narrator', () => 'Em Kalos, as flores murcham e voltam a abrir no mesmo dia. O mundo parece respirar com dificuldade.'),
    L('ghost', (c) => `Xerneas dá vida, Yveltal tira. Zygarde só aparece quando os dois estão em paz. Estou quase sumindo, ${c.n}. Termine o que eu não consegui.`),
    L('diary', () => 'Hoje ele mal tinha sombra. Eu fiquei na frente dele no sol, para ele não sumir de vez. Acho que ele entendeu.'),
  ],
  finale: [
    L('vesper', () => 'Impossível… A Liga inteira, de todas as regiões. A Eclipse não tem mais céu para domar. Os lendários escolheram você.'),
    L('ghost', (c) => `Conseguimos, ${c.n}. Eu, você, ${c.p}. Agora vem a parte difícil: escolher.`),
    L('ghost', () => 'Se você quebrar o laço, eu descanso, e as jornadas param de dar voltas. Se seguir viajando, eu fico. Cada nova jornada deixa a gente mais forte, mas sempre um pouco mais longe de casa.'),
    L('diary', () => 'Seja qual for a escolha, eu vou estar com você. Na primeira jornada, nesta, e em todas as outras.'),
  ],
  'loop-1': [
    L('narrator', () => 'O mundo voltou ao começo. Mas alguma coisa ficou.'),
    L('diary', (c) => `${c.n}, eu lembro. Lembro da Torre Queimada, do mar fervendo, de você sem capuz no alto do dragão. Desta vez, a gente sabe o caminho.`),
    L('ghost', () => 'Desta vez, eu sou um pouco mais você. E você é um pouco mais eu. Vamos ver até onde a gente chega juntos.'),
  ],
  'loop-2': [
    L('ghost', (c) => `Mais uma volta, ${c.n}. O laço aperta, mas a gente também fica mais forte. ${c.p} já nem estranha o granizo de verão.`),
    L('diary', () => 'Escrevi esta página antes, em outra jornada. Mas a letra está mais firme agora.'),
  ],
};

/** O final: as duas escolhas. */
export const FINALE_CHOICES = {
  break: {
    label: 'Quebrar o laço',
    after: (c: StoryCtx) =>
      `O Viajante sorri e some na luz do fim de tarde. "Obrigado, ${c.n}." O céu, pela primeira vez em muito tempo, fica só azul.`,
    title: 'Guardião do Tempo',
  },
  loop: {
    label: 'Seguir viajando',
    after: (c: StoryCtx) =>
      `O Viajante ajeita o capuz e ri. "Então a gente se vê na próxima volta, ${c.n}." Uma nova jornada já espera por vocês.`,
    title: 'Viajante Eterno',
  },
} as const;

/** Uma linha do diário do parceiro para o relatório de progresso offline. */
export function diaryLine(p: string, wins: number, hours: number): string {
  if (wins <= 0) return `Diário de ${p}: hoje foi difícil. Treinei sozinho, mas os selvagens daqui são fortes. Amanhã eu tento de novo.`;
  if (hours >= 8) return `Diário de ${p}: você dormiu bastante! Eu aproveitei e venci ${wins} batalhas. Estou ficando forte.`;
  if (wins >= 200) return `Diário de ${p}: ${wins} vitórias enquanto você esteve fora. Eu nem cansei. Bom, só um pouquinho.`;
  return `Diário de ${p}: enquanto você esteve fora, venci ${wins} batalha${wins > 1 ? 's' : ''}. Senti sua falta.`;
}
