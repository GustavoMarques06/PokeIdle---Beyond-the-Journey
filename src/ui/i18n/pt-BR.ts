// Textos da interface em um só lugar, prontos para localização futura.

import {
  ACHIEVEMENTS,
  SUPPORT_MOVES,
  getHeldItem,
  getItem,
  getTrainingItem,
  getMove,
  getRoute,
  getSpecies,
  type Ailment,
  type BonusKind,
} from '../../game-data';
import type { GameEvent } from '../../core/game';

export const TYPE_NAMES: Record<string, string> = {
  normal: 'Normal',
  fire: 'Fogo',
  water: 'Água',
  grass: 'Planta',
  electric: 'Elétrico',
  ice: 'Gelo',
  fighting: 'Lutador',
  poison: 'Venenoso',
  ground: 'Terra',
  flying: 'Voador',
  psychic: 'Psíquico',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  dragon: 'Dragão',
  dark: 'Sombrio',
  steel: 'Aço',
  fairy: 'Fada',
};

export const STAT_NAMES = {
  hp: 'HP',
  atk: 'Ataque',
  def: 'Defesa',
  spAtk: 'At. Esp.',
  spDef: 'Def. Esp.',
  spe: 'Velocidade',
} as const;

export const BONUS_NAMES: Record<BonusKind, string> = {
  damage: 'Dano',
  defense: 'Redução de dano',
  speed: 'Velocidade de ataque',
  exp: 'EXP',
  coins: 'Moedas',
  capture: 'Captura',
  heal: 'Cura pós-vitória',
};

export const formatPercent = (v: number) => `${Math.round(v * 100)}%`;

export const achievementName = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id;

export const UPGRADE_TEXT: Record<string, { name: string; description: string }> = {
  'auto-capture': {
    name: 'Captura automática',
    description:
      'Lança bolas sozinho em espécies ainda não capturadas (e shinies) quando o HP do alvo cai pela metade.',
  },
  'old-rod': {
    name: 'Old Rod',
    description:
      'Pesque em rotas com água (botão PESCA na batalha). Fisga Pokémon mais fracos que os da grama.',
  },
  'good-rod': {
    name: 'Good Rod',
    description: 'Vara melhor: fisga mais espécies, em níveis próximos aos da grama.',
  },
  'super-rod': {
    name: 'Super Rod',
    description: 'A melhor vara: espécies raras (Dratini, Feebas, Relicanth…) e níveis acima dos da grama.',
  },
  surf: {
    name: 'HM Surf',
    description:
      'Surfe em rotas com água (botão SURF na batalha) e encontre Pokémon que não aparecem na grama.',
  },
};

/** Onde o jogador procura Pokémon. */
export const ENCOUNTER_MODE_NAMES: Record<string, string> = {
  land: 'Grama',
  fish: 'Pesca',
  surf: 'Surf',
};

export const ITEM_DESCRIPTIONS: Record<string, string> = {
  'net-ball': 'Captura 3,5× melhor contra Pokémon de Água e Inseto.',
  'dusk-ball': 'Captura 3× melhor à noite e em cavernas.',
  'quick-ball': 'Captura 5× melhor nos primeiros 5 segundos do encontro.',
  'timer-ball': 'Quanto mais longa a luta, melhor: +1× a cada 10 s, até 4×. Ótima contra lendários.',
  'repeat-ball': 'Captura 3,5× melhor contra espécies que você já capturou.',
  'nest-ball': 'Melhor contra Pokémon de nível baixo: até 4× (nível 1), 1× a partir do 31.',
  'luxury-ball': 'O Pokémon capturado já chega com bastante amizade.',
  'heal-ball': 'O Pokémon capturado chega com o HP cheio.',
  repel: 'Por 10 min, os selvagens aparecem sempre no nível máximo da rota: mais EXP e moedas por vitória.',
  'super-repel': 'Como o Repelente, por 20 min.',
  'max-repel': 'Como o Repelente, por 30 min.',
  'sea-incense': 'Por 20 min, Pokémon de Água aparecem 4× mais.',
  'rose-incense': 'Por 20 min, Pokémon de Planta aparecem 4× mais.',
  'rock-incense': 'Por 20 min, Pokémon de Pedra aparecem 4× mais.',
  'odd-incense': 'Por 20 min, Pokémon Psíquicos aparecem 4× mais.',
  'poke-ball': 'Bola básica para capturar Pokémon selvagens.',
  'great-ball': 'Taxa de captura 1,5× maior que a Poké Ball.',
  'moon-stone': 'Evolui Nidorina, Nidorino, Clefairy e Jigglypuff.',
  'thunder-stone': 'Evolui Pikachu.',
  'water-stone': 'Evolui Staryu.',
  'leaf-stone': 'Evolui Gloom.',
  'fire-stone': 'Pedra de evolução de fogo.',
  'ultra-ball': 'Taxa de captura 2× maior. A captura automática só a usa em shinies e errantes.',
  'master-ball': 'Captura qualquer Pokémon sem falhar.',
  'rare-candy': 'Sobe o Pokémon 1 nível na hora (use na tela POKéMON).',
  'soothe-bell': 'Segurada, dobra a amizade que o Pokémon ganha (e ele evolui por afeto mais cedo).',
  everstone: 'Segurada, impede a evolução. Na Mochila, também permite travar a evolução (tela POKéMON).',
  nugget: 'Uma pepita de ouro puro. Vale muito para colecionadores.',
  'oran-berry': 'Planta no Jardim. Comer: +15% de cura por vitória por 20 min.',
  'pecha-berry': 'Planta no Jardim. Comer: +25% de moedas por 30 min.',
  'cheri-berry': 'Planta no Jardim. Comer: +15% de dano por 30 min.',
  'leppa-berry': 'Planta no Jardim. Comer: +25% de EXP por 30 min.',
  'razz-berry': 'Planta no Jardim. Comer: +30% de captura por 30 min.',
  'persim-berry': 'Planta no Jardim. Comer: +15% de velocidade por 45 min.',
  'sitrus-berry': 'Planta no Jardim. Comer: +30% de cura por vitória por 1 h.',
  'lum-berry': 'Rara. Comer: chance de shiny dobrada por 30 min.',
  'helix-fossil': 'Fóssil de concha. Leve ao Laboratório (ATIVIDADES → FÓSSEIS).',
  'dome-fossil': 'Fóssil de carapaça. Leve ao Laboratório (ATIVIDADES → FÓSSEIS).',
  'old-amber': 'Âmbar com DNA antigo. Leve ao Laboratório (ATIVIDADES → FÓSSEIS).',
};

/** Descrição de um item: textos próprios, itens seguráveis ou de treino. */
export const itemDescription = (id: string): string =>
  ITEM_DESCRIPTIONS[id] ?? getHeldItem(id)?.description ?? getTrainingItem(id)?.description ?? '';

export const T = {
  appTitle: 'PokéIdle',
  appSubtitle: 'Beyond the Journey',
  chooseStarter: 'Escolha seu primeiro parceiro',
  chooseStarterHint:
    'A escolha define seu estilo inicial — os outros iniciais podem ser encontrados mais tarde.',
  start: 'Começar jornada',
  tabs: {
    team: 'Equipe',
    dex: 'Pokédex',
    shop: 'Loja',
    upgrades: 'Melhorias',
    achievements: 'Conquistas',
    settings: 'Config.',
  },
  trainer: 'Treinador',
  researchPoints: 'Pontos de pesquisa',
  prestigePoints: 'Pontos de prestígio',
  lab: {
    title: 'Laboratório',
    hint: 'Transfira duplicatas e registre espécies novas para ganhar pontos de pesquisa.',
    transferAll: (n: number, pts: number) => `Transferir ${n} duplicatas (+${pts})`,
    noDuplicates: 'Nenhuma duplicata sobrando.',
    level: (l: number, max: number) => `Nv. ${l}/${max}`,
    maxed: 'Máximo',
  },
  prestige: {
    title: 'Nova jornada (prestígio)',
    locked: 'Vença Misty, Líder de Cerulean, para poder recomeçar a jornada com bônus permanentes.',
    explain:
      'Volta à Rota 1 com moedas, itens e níveis zerados. Mantém a coleção (espécies e evoluções), a Pokédex, a pesquisa, a maestria, as conquistas e as melhorias da loja.',
    gain: (n: number) => `Recomeçar e ganhar ${n} pontos de prestígio`,
    confirm: (n: number) => `Recomeçar a jornada e ganhar ${n} pontos de prestígio?`,
    count: (n: number) => `Jornadas concluídas: ${n}`,
  },
  achievementsDone: (n: number, total: number) => `${n}/${total} concluídas`,
  coins: 'Moedas',
  route: 'Rota',
  map: 'Mapa',
  locked: 'Bloqueada',
  cleared: 'Concluída',
  boss: 'Chefe',
  challenge: 'Desafiar',
  retreat: 'Recuar',
  bossReady: 'Chefe disponível!',
  victoriesNeeded: (n: number, total: number) => `${n}/${total} vitórias`,
  throwBall: 'Lançar',
  noBalls: 'Sem bolas — compre na Loja',
  active: 'Ativo',
  setActive: 'Usar',
  evolve: 'Evoluir',
  level: 'Nv.',
  potential: 'Potencial',
  moves: 'Golpes',
  caughtOn: 'Capturado em',
  seen: 'vistos',
  caught: 'capturados',
  buy: 'Comprar',
  owned: 'Adquirido',
  youHave: 'Você tem',
  settings: {
    autoEvolve: 'Evoluir automaticamente',
    damageNumbers: 'Mostrar números de dano',
    autoCapture: 'Captura automática ligada',
    reducedMotion: 'Reduzir animações',
    audio: 'Áudio',
    volume: 'Volume',
    sfx: 'Efeitos sonoros',
    cries: 'Gritos dos Pokémon',
    music: 'Música',
    export: 'Gerar código de transferência',
    import: 'Carregar código',
    importPlaceholder: 'Cole aqui o código de transferência (PKI1…) ou um save exportado antes…',
    copied: 'Código copiado para a área de transferência.',
    reset: 'Apagar save e recomeçar',
    resetConfirm: 'Tem certeza? Todo o progresso será perdido.',
    importOk: 'Save importado com sucesso.',
    stats: 'Estatísticas',
    totalKills: 'Vitórias',
    totalCaptures: 'Capturas',
    playTime: 'Tempo de jogo',
  },
  intro: {
    newGameConfirm: (name: string) =>
      `Já existe uma jornada salva neste aparelho (${name}). Ao escolher o inicial, ela será substituída. Continuar?`,
    loadConfirm: (incoming: string, current: string) =>
      `Carregar o jogo de ${incoming}? A jornada de ${current} neste aparelho será substituída.`,
    musicOn: 'Música da abertura: ligada',
    musicOff: 'Música da abertura: desligada',
  },
  /** Laboratório do professor: a escolha do inicial, fala a fala. */
  starterLab: {
    browse: (name: string, region: string) =>
      `Estas são as Poké Bolas de ${region}, ${name}. Cada uma guarda um Pokémon diferente. Qual delas você vai abrir?`,
    ask: (species: string, type: string) => `Quer ficar com ${species}, o Pokémon do tipo ${type}?`,
    received: (name: string, species: string) => `${name} recebeu ${species}!`,
    nickAsk: (species: string) => `Quer dar um apelido a ${species}?`,
    nickPrompt: (species: string) => `Qual vai ser o apelido de ${species}?`,
    rival: (species: string, rivalMon: string, rivalName: string) =>
      `Olha só quem chegou: ${rivalName}, que vai ser o seu rival! A escolha foi ${rivalMon}, que tem vantagem sobre ${species}. Vai ser uma bela disputa!`,
    hintKeys: '← → BOLA · ↑ ↓ REGIÃO · ENTER ABRIR',
    hintTouch: 'Toque numa Poké Bola · ◀ ▶ trocam a região',
  },
  /** Uma frase do professor sobre cada inicial, dita ao abrir a Poké Bola. */
  starterFlavor: {
    1: 'Bulbasaur é calmo e resistente; a semente nas costas cresce junto com ele.',
    4: 'Charmander é cheio de energia. Dizem que a chama da cauda mostra o humor dele!',
    7: 'Squirtle se esconde no casco quando está em perigo... e responde com jatos d’água.',
    152: 'Chikorita adora sol e solta um perfume suave que acalma quem está por perto.',
    155: 'Cyndaquil é tímido, mas as chamas das costas acendem quando ele se assusta.',
    158: 'Totodile morde tudo o que se mexe, e é por carinho! Cuidado com os dedos.',
    252: 'Treecko é frio e confiante; sobe em paredes lisas como se fosse chão.',
    255: 'Torchic guarda uma chama dentro do corpo. Um abraço dele é bem quentinho.',
    258: 'Mudkip sente o ambiente pela barbatana da cabeça, e é forte como uma rocha!',
    387: 'Turtwig faz fotossíntese pelo casco; quando tem sede, a folhinha da cabeça murcha.',
    390: 'Chimchar é ágil e travesso. Nem a chuva apaga o fogo da cauda dele!',
    393: 'Piplup é orgulhoso e não gosta de receber ordens... mas é leal até o fim.',
    495: 'Snivy é inteligente e sereno; quanto mais sol pega, mais rápido fica.',
    498: 'Tepig adora frutinhas tostadas pelo fogo do próprio focinho.',
    501: 'Oshawott luta com a concha da barriga como se fosse uma lâmina.',
    650: 'Chespin é curioso e corajoso; os espinhos da cabeça endurecem quando ele se defende.',
    653: 'Fennekin mastiga gravetos para ganhar energia, e as orelhas soltam um calor enorme.',
    656: 'Froakie se protege com bolhas que parecem espuma. Está sempre alerta!',
  } as Record<number, string>,
  /** Falas do Prof. Carvalho ao chegar a cada região (Kanto é o prólogo). */
  professor: {
    arrival: {
      johto: (n: string) =>
        `${n}! Fiquei sabendo que você venceu a Liga de Kanto. Parabéns! A oeste fica Johto, terra de tradições antigas e de Pokémon que você nunca viu. Os líderes de lá são orgulhosos… mostre a eles do que você é capaz!`,
      hoenn: (n: string) =>
        `${n}, agora são duas Ligas vencidas! Hoenn é feita de mar, vulcões e florestas tropicais. Leve Pokémon que saibam nadar e aguentar o calor!`,
      sinnoh: (n: string) =>
        `Sinnoh, ao norte, é cheia de montanhas nevadas e lendas sobre a origem do mundo. Dizem que o tempo e o espaço guardam segredos por lá. Fico curioso para saber o que você vai descobrir, ${n}.`,
      unova: (n: string) =>
        `${n}, Unova fica longe daqui: cidades enormes, pontes gigantes e espécies completamente diferentes. É quase como começar de novo, mas desta vez com toda a sua experiência.`,
      kalos: (n: string) =>
        `${n}… você foi mais longe do que qualquer treinador que conheci. Kalos é o maior desafio de todos: selvagens no nível 100 e líderes reforçados. Daqui para a frente, é além da jornada!`,
    } as Record<string, (name: string) => string>,
    finale: (n: string) =>
      `A Liga de Kalos é sua! ${n}, você viu o mundo inteiro ao lado dos seus Pokémon. Mas uma jornada assim não termina: há uma Pokédex para completar, shinies para encontrar e uma nova jornada esperando quando você quiser recomeçar.`,
  },
  offline: {
    title: 'Bem-vindo de volta!',
    away: (t: string) => `Você ficou fora por ${t}.`,
    counted: (t: string) => `Tempo contabilizado: ${t}`,
    capped: (h: number) => `(limite de ${h} h de progresso offline)`,
    clockBackwards:
      'O relógio do sistema parece ter voltado no tempo; nenhum progresso offline foi concedido.',
    clockInvalid: 'O horário do último save é inválido; nenhum progresso offline foi concedido.',
    nothing: 'Seu Pokémon não conseguiu vencer na rota atual enquanto você esteve fora.',
    victories: 'Vitórias',
    exp: 'EXP',
    coins: 'Moedas',
    continue: 'Continuar',
  },
  phase: {
    spawning: 'Procurando Pokémon…',
    victory: 'Vitória!',
    defeat: 'Seu Pokémon desmaiou — recuperando…',
  },
};

/** Status: nome, sigla (como nas caixas de status do GBA) e frases da batalha. */
export const STATUS_TEXT: Record<
  Ailment,
  { name: string; short: string; inflicted: string; skip: string; cured: string; damage: string }
> = {
  burn: {
    name: 'Queimadura',
    short: 'QMD',
    inflicted: 'foi queimado',
    skip: '',
    cured: 'não está mais queimado',
    damage: 'sofreu com a queimadura',
  },
  poison: {
    name: 'Veneno',
    short: 'ENV',
    inflicted: 'foi envenenado',
    skip: '',
    cured: 'não está mais envenenado',
    damage: 'sofreu com o veneno',
  },
  paralysis: {
    name: 'Paralisia',
    short: 'PAR',
    inflicted: 'ficou paralisado! Talvez não consiga se mover',
    skip: 'está paralisado! Não consegue se mover',
    cured: 'não está mais paralisado',
    damage: '',
  },
  sleep: {
    name: 'Sono',
    short: 'DRM',
    inflicted: 'caiu no sono',
    skip: 'está dormindo profundamente',
    cured: 'acordou',
    damage: '',
  },
  freeze: {
    name: 'Congelamento',
    short: 'CGL',
    inflicted: 'foi congelado',
    skip: 'está congelado',
    cured: 'descongelou',
    damage: '',
  },
};

export const speciesName = (id: number) => getSpecies(id).name;
export const moveName = (id: string) => SUPPORT_MOVES[id]?.name ?? getMove(id).name;
export const itemName = (id: string) => getItem(id)?.name ?? UPGRADE_TEXT[id]?.name ?? id;

export function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

// Um formatador só: toLocaleString cria um novo a cada chamada, e o HUD formata várias vezes por segundo.
const INTEGER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export function formatNumber(n: number): string {
  return INTEGER.format(Math.floor(n));
}

/** Mensagem do registro de batalha para um evento (ou null se não deve aparecer). */
export function describeEvent(e: GameEvent): string | null {
  switch (e.type) {
    case 'spawn':
      return e.boss
        ? `${speciesName(e.speciesId)} (Nv. ${e.level}) entrou na batalha!`
        : e.water === 'fish'
          ? `Fisgou um ${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''} (Nv. ${e.level})!`
          : `Um ${speciesName(e.speciesId)} selvagem${e.shiny ? ' brilhante' : ''} (Nv. ${e.level}) apareceu!`;
    case 'attack': {
      const r = e.result;
      const who = e.side === 'player' ? 'Você' : 'Inimigo';
      if (r.missed) return `${who}: ${moveName(r.moveId)} errou.`;
      let s = `${who}: ${moveName(r.moveId)} causou ${r.damage}`;
      if (r.crit) s += ' (crítico!)';
      if (r.effectiveness === 0) s = `${who}: ${moveName(r.moveId)} não teve efeito.`;
      else if (r.effectiveness > 1) s += ' — super efetivo!';
      else if (r.effectiveness < 1) s += ' — pouco efetivo.';
      if (r.status) s += ` ${speciesName(e.target)} ${STATUS_TEXT[r.status].inflicted}.`;
      return s;
    }
    case 'megaEvolved':
      return e.form === 'primal'
        ? `${speciesName(e.speciesId)} sofreu Regressão Primal!`
        : `${speciesName(e.speciesId)} sofreu Mega Evolução!`;
    case 'switched':
      return e.reason === 'fainted'
        ? `${speciesName(e.from)} desmaiou! ${speciesName(e.to)} entrou na batalha.`
        : e.reason === 'manual'
          ? `${speciesName(e.to)} entrou no lugar de ${speciesName(e.from)}.`
          : `${speciesName(e.to)} entrou no lugar de ${speciesName(e.from)} (vantagem de tipo).`;
    case 'ranAway':
      return `Fugiu do ${speciesName(e.speciesId)} selvagem.`;
    case 'supportMove':
      return `${speciesName(e.speciesId)} usou ${SUPPORT_MOVES[e.move]?.name ?? e.move}.`;
    case 'statusSkip':
      return `${speciesName(e.speciesId)} ${STATUS_TEXT[e.status].skip}.`;
    case 'statusCured':
      return `${speciesName(e.speciesId)} ${STATUS_TEXT[e.status].cured}.`;
    case 'statusDamage':
      return `${speciesName(e.speciesId)} ${STATUS_TEXT[e.status].damage} (−${e.damage}).`;
    case 'enemyFainted':
      return e.exp || e.coins
        ? `${speciesName(e.speciesId)} desmaiou. +${e.exp} EXP, +${e.coins} moedas.`
        : `${speciesName(e.speciesId)} desmaiou.`;
    case 'playerFainted':
      return `${speciesName(e.speciesId)} desmaiou!`;
    case 'levelUp':
      return `${speciesName(e.speciesId)} subiu para o nível ${e.level}!`;
    case 'learnedMove':
      return `${speciesName(e.speciesId)} aprendeu ${moveName(e.move)}!`;
    case 'evolved':
      return `${speciesName(e.from)} evoluiu para ${speciesName(e.to)}!`;
    case 'evolutionReady':
      return `${speciesName(e.speciesId)} está pronto para evoluir em ${speciesName(e.to)}.`;
    case 'captureAttempt':
      return e.success
        ? null
        : `${itemName(e.ball)}: ${speciesName(e.speciesId)} escapou! (${Math.round(e.chance * 100)}%)`;
    case 'captured':
      return `${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''}${e.perfect ? ' PERFEITO' : ''} foi capturado!${e.isNew ? ' Novo registro na Pokédex.' : ''}`;
    case 'bossAvailable':
      return `O chefe de ${getRoute(e.routeId).name} está disponível!`;
    case 'bossDefeated':
      return `Você venceu ${getRoute(e.routeId).boss?.name}! +${e.coins} moedas.`;
    case 'routeUnlocked':
      return `Nova área desbloqueada: ${getRoute(e.routeId).name}.`;
    case 'masteryUp':
      return `Maestria de ${speciesName(e.speciesId)} subiu para o nível ${e.level}!`;
    case 'achievement': {
      const a = ACHIEVEMENTS.find((x) => x.id === e.id);
      const reward = [
        a?.reward.coins ? `+${a.reward.coins} moedas` : '',
        a?.reward.research ? `+${a.reward.research} pesquisa` : '',
      ]
        .filter(Boolean)
        .join(', ');
      return `Conquista: ${a?.name ?? e.id}${reward ? ` (${reward})` : ''}`;
    }
    case 'hallOfFame':
      return `Hall da Fama: campeão de ${REGION_NAMES[e.regionId] ?? e.regionId}!`;
    case 'hatched':
      return `O ovo chocou: ${speciesName(e.speciesId)}${e.shiny ? ' brilhante' : ''}!`;
    case 'berryReady':
      return `Jardim: ${itemName(e.berry)} pronta para colher.`;
    case 'fossilReady':
      return `Laboratório: ${speciesName(e.speciesId)} foi revivido!`;
    case 'expeditionDone':
      return 'Uma expedição voltou! Veja as recompensas.';
    case 'roamerAppeared':
      return `${speciesName(e.speciesId)} foi visto em ${getRoute(e.routeId).name}!`;
    case 'roamerFled':
      return `${speciesName(e.speciesId)} fugiu para outra rota.`;
    case 'roamerLeft':
      return `${speciesName(e.speciesId)} deixou a região por enquanto.`;
    case 'rocketAppeared':
      return `Equipe Rocket em ${getRoute(e.routeId).name}! Vá até lá para enfrentá-los.`;
    case 'rocketLeft':
      return 'A Equipe Rocket foi embora.';
    case 'legendaryEnded':
      return e.reason === 'caught'
        ? `${speciesName(e.speciesId)} foi capturado! Uma lenda agora é sua.`
        : e.reason === 'fled'
          ? `${speciesName(e.speciesId)} fugiu! Ele só volta a aceitar um desafio depois de um tempo.`
          : `${speciesName(e.speciesId)} escapou. Tente de novo mais tarde.`;
    case 'rocketDefeated':
      return `Equipe Rocket derrotada! +${e.coins} moedas.`;
    case 'towerFloor':
      return `Torre de Batalha: andar ${e.floor} vencido (+${e.points} BP).`;
    case 'towerEnded':
      return `Torre de Batalha: subida encerrada no andar ${e.floor}.`;
    case 'missionDone':
      return 'Missão concluída! Resgate a recompensa em MISSÕES.';
    case 'missionsRefreshed':
      return e.scope === 'daily' ? 'Novas missões diárias!' : 'Novas missões semanais!';
    case 'weatherChanged':
      return `O tempo mudou: ${WEATHER_NAMES[e.weather] ?? e.weather}.`;
    case 'challengeFailed':
      return 'Nuzlocke encerrado: não sobrou ninguém para lutar. As regras normais voltaram.';
    case 'effect':
      return effectText(e);
    case 'itemFound':
      return `O Pokémon derrotado deixou cair ${itemName(e.item)}!`;
    case 'raidAppeared':
      return `RAIDE! ${speciesName(e.speciesId)} gigante apareceu. Vá até a rota dele para enfrentá-lo.`;
    case 'raidLeft':
      return `A raide de ${speciesName(e.speciesId)} terminou.`;
    case 'raidRage':
      return `${speciesName(e.speciesId)} está furioso! (fase ${e.stage})`;
    case 'raidFailed':
      return `Acabou o tempo! ${speciesName(e.speciesId)} escapou da raide.`;
    case 'raidDefeated': {
      const loot = Object.entries(e.items)
        .map(([id, n]) => `${itemName(id)} ×${n}`)
        .join(', ');
      return `Raide vencida! +${e.coins} moedas${loot ? `, ${loot}` : ''}.${e.caught ? ` ${speciesName(e.speciesId)} foi capturado!` : ' Ele escapou antes da captura.'}`;
    }
    case 'rematchDefeated': {
      const loot = Object.entries(e.items)
        .map(([id, n]) => `${itemName(id)} ×${n}`)
        .join(', ');
      return `Revanche vencida contra ${getRoute(e.routeId).boss?.name}! +${e.coins} moedas${loot ? `, ${loot}` : ''}.`;
    }
    case 'trainingFull':
      return 'Um Pokémon terminou o treino: não cabem mais EVs naquele atributo.';
    case 'merchantAppeared':
      return 'Um mercador viajante chegou com itens raros em promoção! Veja na LOJA.';
    case 'merchantLeft':
      return 'O mercador viajante foi embora.';
    case 'companionFound':
      return `${speciesName(e.speciesId)} achou ${itemName(e.item)} pelo caminho!`;
    case 'researchComplete':
      return `Pesquisa completa: ${speciesName(e.speciesId)}! Mais chance de captura e EXP contra ele.`;
    case 'safariResult':
      return SAFARI_TEXT[e.outcome](speciesName(e.speciesId));
    case 'safariEnded':
      return `Fim do Safari! Você capturou ${e.caught} Pokémon.`;
    case 'tournamentMatch':
      return e.won
        ? `Torneio: venceu ${e.opponent} por ${e.score[0]}–${e.score[1]} (+${e.coins} moedas).`
        : `Torneio: perdeu para ${e.opponent} por ${e.score[0]}–${e.score[1]}.`;
    case 'tournamentEnded':
      return `Torneio da semana encerrado: ${TOURNAMENT_PLACES[e.place]}.`;
    case 'autoTransferred':
      return `Automação: ${e.count} repetido${e.count > 1 ? 's' : ''} transferido${e.count > 1 ? 's' : ''} (+${e.points} pesquisa).`;
    case 'autoHarvested':
      return `Automação: colheu ${e.qty} ${itemName(e.berry)}${e.replanted ? ' e replantou' : ''}.`;
    case 'autoClaimed':
      return 'Automação: missão resgatada.';
    case 'tradeReceived':
      return e.evolvedTo
        ? `Troca: ${speciesName(e.speciesId)} chegou de ${e.from} e evoluiu!`
        : `Troca: ${speciesName(e.speciesId)} chegou de ${e.from}!`;
    case 'ghostDuelEnded':
      return e.won
        ? `Duelo fantasma: venceu a equipe de ${e.name}!${e.coins ? ` +${formatNumber(e.coins)} moedas.` : ''}`
        : `Duelo fantasma: a equipe de ${e.name} venceu.`;
  }
}

export const SAFARI_TEXT: Record<string, (name: string) => string> = {
  caught: (n) => `Peguei! ${n} foi capturado!`,
  missed: (n) => `Ah! ${n} escapou da Safari Ball!`,
  fled: (n) => `${n} fugiu!`,
  stayed: (n) => `${n} está de olho em você…`,
  left: (n) => `Você deixou ${n} para trás.`,
};

export const TOURNAMENT_PLACES: Record<string, string> = {
  champion: 'CAMPEÃO',
  final: 'vice-campeão',
  semi: 'semifinalista',
  quarter: 'quartas de final',
};

/** Texto de habilidades e itens que entram em ação. */
export function effectText(e: Extract<GameEvent, { type: 'effect' }>): string {
  const who = speciesName(e.speciesId);
  const item = e.item ? itemName(e.item) : '';
  switch (e.kind) {
    case 'sturdy':
      return `${who} aguentou o golpe com Robustez!`;
    case 'sash':
      return `${who} aguentou o golpe com a ${item}!`;
    case 'berry':
      return `${who} comeu a ${item} e recuperou HP!`;
    case 'cure':
      return `${who} comeu a ${item} e se curou!`;
    case 'absorb':
      return `${who} absorveu o golpe e recuperou HP!`;
    case 'synchronize':
      return `Sincronismo! ${who} devolveu o status.`;
  }
}

export const REGION_NAMES: Record<string, string> = {
  kanto: 'Kanto',
  johto: 'Johto',
  hoenn: 'Hoenn',
  sinnoh: 'Sinnoh',
  unova: 'Unova',
  kalos: 'Kalos',
};

export const WEATHER_NAMES: Record<string, string> = {
  clear: 'céu limpo',
  sun: 'sol forte',
  rain: 'chuva',
  sand: 'tempestade de areia',
  fog: 'neblina',
  hail: 'granizo',
};

export const WEATHER_EFFECTS: Record<string, string> = {
  clear: 'Sem efeitos.',
  sun: 'Golpes de Fogo +30%, de Água −30%. Mais Pokémon de Fogo e Planta.',
  rain: 'Golpes de Água +30%, de Fogo −30%. Mais Pokémon de Água.',
  sand: 'Golpes de Pedra, Terra e Aço +15%. Mais Pokémon de Pedra e Terra.',
  fog: 'Golpes Fantasma +20%. Mais Pokémon Fantasma e Psíquico.',
  hail: 'Golpes de Gelo +30%. Mais Pokémon de Gelo.',
};

export const BUFF_NAMES: Record<string, string> = {
  damage: 'Dano',
  exp: 'EXP',
  coins: 'Moedas',
  capture: 'Captura',
  heal: 'Cura por vitória',
  speed: 'Velocidade',
  shiny: 'Chance de shiny',
};

export const MISSION_TEXT: Record<string, (target: number, type?: string) => string> = {
  kills: (n) => `Vença ${n} batalhas`,
  captures: (n) => `Capture ${n} Pokémon`,
  'capture-type': (n, t) => `Capture ${n} Pokémon do tipo ${TYPE_NAMES[t ?? ''] ?? t}`,
  evolutions: (n) => `Evolua ${n} Pokémon`,
  bosses: (n) => `Vença ${n} treinador${n > 1 ? 'es' : ''} (chefes ou Rocket)`,
  hatch: (n) => `Choque ${n} ovo${n > 1 ? 's' : ''}`,
  harvest: (n) => `Colha ${n} berries`,
  expeditions: (n) => `Conclua ${n} expedição${n > 1 ? 'ões' : ''}`,
  'tower-floors': (n) => `Vença ${n} andares na Torre de Batalha`,
  slots: (n) => `Jogue ${n} vezes no caça-níqueis`,
};

/** Eventos importantes o bastante para virar notificação. */
export const TOAST_EVENTS = new Set<GameEvent['type']>([
  'challengeFailed',
  'levelUp',
  'learnedMove',
  'evolved',
  'evolutionReady',
  'captured',
  'bossAvailable',
  'bossDefeated',
  'routeUnlocked',
  'masteryUp',
  'achievement',
  'hallOfFame',
  'hatched',
  'berryReady',
  'fossilReady',
  'expeditionDone',
  'roamerAppeared',
  'roamerFled',
  'rocketAppeared',
  'rocketDefeated',
  'legendaryEnded',
  'towerEnded',
  'missionDone',
  'missionsRefreshed',
  'weatherChanged',
  'raidAppeared',
  'raidDefeated',
  'raidFailed',
  'rematchDefeated',
  'trainingFull',
  'merchantAppeared',
  'companionFound',
  'researchComplete',
  'safariEnded',
  'tournamentMatch',
  'tournamentEnded',
]);
