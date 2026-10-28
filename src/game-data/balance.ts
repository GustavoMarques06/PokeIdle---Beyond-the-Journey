// Todos os números de balanceamento ficam aqui, fora da lógica.

export const BALANCE = {
  /** Passo fixo da simulação; independente de FPS e animações. */
  tickMs: 100,
  maxLevel: 100,
  maxMoves: 4,
  /** Relembrador: preço para lembrar um golpe da pré-evolução. */
  relearnCost: 2500,

  combat: {
    /**
     * Intervalo entre ataques quando as velocidades dos dois lados são iguais. Lento o
     * bastante para dar tempo de ler a caixa de diálogo e ver as animações de cada golpe.
     */
    baseAttackIntervalMs: 2500,
    minAttackIntervalMs: 1200,
    maxAttackIntervalMs: 5000,
    critChance: 1 / 16,
    critMultiplier: 1.5,
    stab: 1.5,
    /**
     * Escalas de dano: alongam as lutas sem mexer nas fórmulas clássicas. O lado do
     * jogador bate mais forte para o idle não depender de sorte contra inimigos do mesmo nível.
     */
    playerDamageScale: 0.45,
    enemyDamageScale: 0.3,
    randomMin: 0.85,
    spawnDelayMs: 1600,
    victoryDelayMs: 1500,
    defeatRecoveryMs: 4000,
    /** Fração do HP máximo recuperada após cada vitória em rota. */
    healOnVictory: 0.35,
  },

  /**
   * Progressão lenta de propósito: cada rota pede várias vezes as vitórias definidas no
   * mundo (scripts/world.mjs) e cada vitória rende pouca EXP e poucas moedas.
   */
  progression: {
    /** Multiplica as vitórias necessárias para liberar o chefe ou a próxima rota. */
    killsMultiplier: 5,
  },

  /** Recompensas por vitória. */
  rewards: {
    expMultiplier: 0.2,
    bossExpMultiplier: 1.5,
    coinsBase: 1.5,
    coinsPerLevel: 0.6,
    bossCoinMultiplier: 3,
  },

  capture: {
    shinyChance: 1 / 512,
    /** Chance de um Pokémon nascer perfeito (todos os IVs em 31); nos demais, cada IV é sorteado de 0 a 31. */
    perfectChance: 1 / 128,
    /** Bônus multiplicativo por tipo de bola (a Master Ball captura sempre). */
    balls: {
      'poke-ball': 1,
      'great-ball': 1.5,
      'ultra-ball': 2,
      'master-ball': 255,
      'safari-ball': 1.5,
      // Bolas especiais: 1× fora da situação delas (ver captureitems.ts e capture.ts).
    } as Record<string, number>,
    /** Zona Safari: chance de captura extra. */
    safariBonus: 1.5,
    /** Captura automática tenta quando o HP do alvo fica abaixo desta fração. */
    autoCaptureHpThreshold: 0.5,
  },

  offline: {
    maxHours: 8,
    minSeconds: 60,
    /** Fração da eficiência ativa aplicada offline. */
    efficiency: 0.7,
    /** Blocos de simulação: a cada bloco as estimativas são refeitas com o nível novo. */
    chunks: 24,
    /** Relógio pode voltar até este valor sem ser tratado como manipulação. */
    clockToleranceMs: 5 * 60_000,
    /** Pausas maiores que isso no loop ativo são tratadas como tempo offline. */
    gapThresholdMs: 30_000,
  },

  save: {
    autosaveMs: 15_000,
  },

  startingItems: { 'poke-ball': 5 } as Record<string, number>,
  starterLevel: 5,

  /** Clima global, sorteado a cada bloco de horas (cavernas e salas ficam sem clima). */
  weather: {
    slotHours: 2,
    weights: { clear: 44, sun: 16, rain: 18, sand: 10, fog: 7, hail: 5 },
    boost: 1.3,
    penalty: 0.7,
    sandBoost: 1.15,
    /** Granizo: golpes de Gelo mais fortes. Neblina: golpes Fantasma mais fortes. */
    hailBoost: 1.3,
    fogBoost: 1.2,
    /** À noite, golpes Fantasma e Sombrio ficam mais fortes. */
    nightBoost: 1.15,
    /** Espécies favorecidas pelo clima/período aparecem com mais frequência. */
    encounterBoost: 1.5,
  },

  /** Efeitos de status dos golpes (queimadura, veneno, paralisia, sono, congelamento). */
  status: {
    /** Fração da chance oficial do golpe (as lutas do idle têm muito mais ataques). */
    chanceScale: 1,
    /** Dano por ação de quem está queimado/envenenado (fração do HP máximo). */
    burnDamage: 1 / 16,
    poisonDamage: 1 / 8,
    /** Queimadura reduz o dano físico causado. */
    burnAttackMultiplier: 0.5,
    /** Paralisia: chance de perder a vez e intervalo entre ataques maior. */
    paralysisSkipChance: 0.25,
    paralysisIntervalMultiplier: 1.5,
    sleepTurns: [1, 3] as [number, number],
    thawChance: 0.25,
  },

  /** Equipe de batalha: reservas que entram quando o ativo desmaia ou têm vantagem. */
  team: {
    /** Fração da EXP de cada vitória que as reservas recebem. */
    reserveExpShare: 0.5,
    /** A troca por vantagem só acontece se a reserva for bem melhor (duelo estimado este tanto mais curto). */
    switchMargin: 0.75,
  },

  /** Histórico para o painel de estatísticas. */
  history: {
    sampleMinutes: 15,
    /** 24 h de amostras. */
    maxSamples: 96,
  },

  /** Desafio "Natureza feroz". */
  fierceEnemyDamage: 1.5,

  hunt: {
    /** A espécie-alvo aparece com mais frequência. */
    targetWeight: 3,
    /** Cada encontro seguido com a espécie-alvo aumenta a chance de shiny. */
    chainBonus: 0.1,
    chainCap: 40,
  },

  /** Batalhas manuais contra lendários: só se captura com bolas lançadas à mão. */
  legendary: {
    hpMultiplier: 2,
    /** Bolas que falham antes de o lendário fugir. */
    throwLimit: 10,
    /** Espera (em minutos reais) depois de ele fugir ou de você desmaiar/desistir. */
    cooldownMinutes: 60,
    /** IVs sorteados que já saem em 31 (os demais são sorteados de 0 a 31). */
    guaranteedPerfectIvs: 3,
  },

  /** Quase lendários (Dragonite, Tyranitar…): mesma batalha manual, mas capturáveis com um pouco de esforço. */
  pseudo: {
    hpMultiplier: 1.5,
    throwLimit: 15,
    cooldownMinutes: 30,
    guaranteedPerfectIvs: 2,
    /** Taxa de captura usada (a da espécie, como a do Metagross, seria injusta). */
    captureRate: 45,
  },

  rival: {
    /** Níveis extras do rival por ciclo de prestígio. */
    levelsPerPrestige: 3,
  },

  daycare: {
    unlock: 'rota-5-6',
    slots: 2,
    killsPerEgg: 60,
    maxEggs: 3,
    /** Vitórias (em qualquer rota) para cada nível ganho na creche. */
    killsPerLevel: 40,
    hatchLevel: 5,
    shinyMultiplier: 4,
    inheritedIvs: 3,
    /** Cada ciclo de ovo da espécie = N vitórias ou M minutos reais (o que vier antes). */
    killsPerCycle: 4,
    minutesPerCycle: 5,
  },

  expeditions: {
    durations: [1, 4, 8],
    maxParty: 3,
    /** Rotas cujo chefe/conclusão libera cada vaga de expedição. */
    slots: ['floresta-viridian', 'rota-4', 'liga-campeao'],
    rollsPerHour: 1.5,
    /** Bônus por Pokémon do tipo favorecido. */
    typeBonus: 0.5,
    /** Níveis ganhos por hora de expedição (divididos pelo nível atual/20). */
    levelsPerHour: 0.5,
  },

  garden: {
    plots: ['floresta-viridian', 'floresta-viridian', 'rota-4', 'rota-7-8-celadon'],
    gift: { 'oran-berry': 3, 'pecha-berry': 2 } as Record<string, number>,
    /** Um bônus do mesmo tipo acumula duração até este limite. */
    maxBuffMinutes: 180,
  },

  fossils: {
    unlock: 'mt-moon',
    slots: 1,
    reviveLevel: 15,
  },

  roamers: {
    minHours: 2,
    maxHours: 5,
    activeMinutes: 45,
    /** Chance de um encontro na rota do errante ser com ele. */
    encounterChance: 0.2,
    hpMultiplier: 3,
    fleeMs: 45_000,
  },

  rocket: {
    unlock: 'mt-moon',
    minHours: 3,
    maxHours: 6,
    activeMinutes: 30,
    levelBonus: 3,
    coins: 30,
  },

  tower: {
    unlock: 'liga-campeao',
    baseLevel: 40,
    levelsPerFloor: 0.6,
    /** Depois do nível 100, os atributos crescem por andar. */
    boostPerFloor: 0.02,
    pointsPerFloor: 1,
    bossEvery: 10,
    healPerFloor: 0.5,
  },

  gameCorner: {
    unlock: 'rota-7-8-celadon',
    tokensPerPack: 50,
    packPrice: 2500,
  },

  missions: {
    daily: 3,
    weekly: 3,
  },

  /** Amizade (0–255): evolução por afeto e mais um motivo para manter o parceiro na linha de frente. */
  friendship: {
    start: 70,
    hatch: 120,
    evolve: 220,
    max: 255,
    /** Vitórias para cada ponto: ativo, reservas e apoio. */
    killsPerPoint: 4,
    reserveKillsPerPoint: 12,
    passiveKillsPerPoint: 20,
    levelUp: 2,
    faint: 1,
    berry: 8,
    vitamin: 5,
  },

  /** Campo de Treino (EVs) e treino com itens. */
  training: {
    slots: ['floresta-viridian', 'mt-moon', 'liga-campeao'],
    evsPerHour: 20,
    maxPerStat: 252,
    maxTotal: 510,
    /** As vitaminas param de render neste total de EVs por atributo. */
    vitaminCap: 100,
    vitaminEvs: 10,
    /** EVs que uma duplicata da mesma espécie rende no atributo escolhido. */
    duplicateEvs: 24,
    bottleCapMinLevel: 50,
    maxOfflineHours: 24,
  },

  /** Raides: um chefe gigante aparece por tempo limitado. */
  raid: {
    unlock: 'rota-7-8-celadon',
    minHours: 2,
    maxHours: 4,
    activeMinutes: 40,
    timeLimitMs: 180_000,
    hpMultiplier: 4,
    boost: 1,
    levelBonus: 3,
    /** Frações de HP em que o chefe fica furioso (mais dano e mais rápido). */
    rageAt: [0.66, 0.33],
    rageDamage: 1.15,
    rageSpeed: 0.9,
    catchChance: 0.7,
    coinsPerLevel: 120,
    perfectIvs: 3,
  },

  /** Revanche contra chefes já vencidos. */
  rematch: {
    cooldownHours: 4,
    levelBonus: 8,
    boost: 1.1,
    coinMultiplier: 1.5,
  },

  /** Chance de um selvagem estar segurando um item (cai ao derrotá-lo). */
  heldDropChance: 0.03,

  /** Pesca e Surf: níveis em relação aos da grama da mesma rota. */
  water: {
    levelOffset: { 'old-rod': -10, 'good-rod': -4, 'super-rod': 2, surf: 1 } as Record<string, number>,
  },

  /** Venda de itens: fração do preço de loja que o jogador recebe. */
  market: { sellRate: 0.5 },

  /** Mercador viajante: aparece de tempos em tempos com itens raros com desconto e estoque limitado. */
  merchant: {
    unlock: 'rota-4',
    minHours: 3,
    maxHours: 6,
    activeMinutes: 45,
    offers: 4,
    /** Desconto sorteado por oferta (fração do preço da Loja de Departamentos). */
    discount: [0.25, 0.5] as [number, number],
    stock: [1, 3] as [number, number],
  },

  /** Jogo do Safari: sem batalha, só Safari Balls, isca e pedra, até as bolas acabarem. */
  safari: {
    /** Basta a área estar liberada. */
    unlock: 'zona-safari',
    fee: 3000,
    balls: 30,
    ballBonus: 1.5,
    /** Chance de fugir a cada ação: base + Velocidade-base × perSpeed. */
    fleeBase: 0.05,
    fleePerSpeed: 1 / 400,
    /** Isca: captura × e fuga × por uso (até maxStacks); pedra: o contrário. */
    bait: { catch: 0.6, flee: 0.5 },
    rock: { catch: 1.8, flee: 1.8 },
    maxStacks: 3,
    levels: [28, 40] as [number, number],
  },

  /** Árvores de berry nas rotas ao ar livre: colhe-se estando na rota. */
  wildBerries: { regrowHours: 4, yield: [1, 3] as [number, number] },

  /** Torneio semanal: 8 treinadores em chave, partidas em melhor de três. */
  tournament: {
    unlock: 'rota-12-15',
    /** Níveis a mais por fase (quartas, semi, final), além do bônus de revanche. */
    levelsPerRound: 4,
    coinsPerRound: [3000, 6000, 12_000],
    championLoot: 2,
  },

  /** Pokémon acompanhante: amizade com o tempo e, às vezes, um item achado. */
  companion: {
    friendshipEveryMinutes: 10,
    findMinutes: [45, 90] as [number, number],
    maxFindsAtOnce: 6,
  },

  /** Diário de pesquisa da Pokédex: tarefas por espécie. */
  dexResearch: {
    tasksToComplete: 5,
    /** Bônus contra espécies com pesquisa completa. */
    captureBonus: 0.25,
    expBonus: 0.1,
    /** Pontos do laboratório ao completar uma espécie. */
    labPoints: 3,
  },
};

export interface ShopEntry {
  id: string;
  kind: 'item' | 'upgrade';
  price: number;
  /** Rota cujo chefe precisa ter sido vencido para a oferta aparecer. */
  requiresBoss?: string;
}

/**
 * Itens fixos do Poké Mart. Berries e itens de evolução raros são acrescentados em index.ts.
 * Referência de renda (npm run balance, só batalha, sem bônus): ~600/h na Rota 1, ~4 mil/h no
 * Mt. Moon, ~10 mil/h em Celadon, ~20 mil/h no fim de Kanto; ~180 mil até o Campeão.
 */
export const SHOP: ShopEntry[] = [
  { id: 'poke-ball', kind: 'item', price: 40 },
  { id: 'great-ball', kind: 'item', price: 150, requiresBoss: 'floresta-viridian' },
  { id: 'auto-capture', kind: 'upgrade', price: 3500, requiresBoss: 'floresta-viridian' },
  { id: 'moon-stone', kind: 'item', price: 2500, requiresBoss: 'mt-moon' },
  { id: 'thunder-stone', kind: 'item', price: 2500, requiresBoss: 'rota-4' },
  { id: 'water-stone', kind: 'item', price: 2500, requiresBoss: 'rota-4' },
  { id: 'leaf-stone', kind: 'item', price: 2500, requiresBoss: 'rota-4' },
  { id: 'fire-stone', kind: 'item', price: 2500, requiresBoss: 'rota-4' },
  { id: 'ultra-ball', kind: 'item', price: 400, requiresBoss: 'esconderijo-rocket' },
  // Bolas especiais, repelentes e incensos (captureitems.ts).
  { id: 'nest-ball', kind: 'item', price: 250, requiresBoss: 'floresta-viridian' },
  { id: 'heal-ball', kind: 'item', price: 100, requiresBoss: 'floresta-viridian' },
  { id: 'repel', kind: 'item', price: 300, requiresBoss: 'mt-moon' },
  { id: 'net-ball', kind: 'item', price: 300, requiresBoss: 'mt-moon' },
  { id: 'repeat-ball', kind: 'item', price: 300, requiresBoss: 'rota-4' },
  { id: 'quick-ball', kind: 'item', price: 350, requiresBoss: 'rota-24-25' },
  { id: 'dusk-ball', kind: 'item', price: 300, requiresBoss: 'rota-24-25' },
  { id: 'super-repel', kind: 'item', price: 500, requiresBoss: 'rota-5-6' },
  { id: 'luxury-ball', kind: 'item', price: 300, requiresBoss: 'rota-5-6' },
  { id: 'timer-ball', kind: 'item', price: 350, requiresBoss: 'torre-pokemon' },
  { id: 'sea-incense', kind: 'item', price: 1200, requiresBoss: 'torre-pokemon' },
  { id: 'rose-incense', kind: 'item', price: 1200, requiresBoss: 'torre-pokemon' },
  { id: 'rock-incense', kind: 'item', price: 1200, requiresBoss: 'torre-pokemon' },
  { id: 'odd-incense', kind: 'item', price: 1200, requiresBoss: 'torre-pokemon' },
  { id: 'max-repel', kind: 'item', price: 700, requiresBoss: 'esconderijo-rocket' },
  { id: 'soothe-bell', kind: 'item', price: 6000, requiresBoss: 'rota-24-25' },
  { id: 'everstone', kind: 'item', price: 2000, requiresBoss: 'rota-5-6' },
  // Pesca e Surf (ver water.ts): melhorias permanentes, como a captura automática.
  { id: 'old-rod', kind: 'upgrade', price: 2500, requiresBoss: 'rota-4' },
  { id: 'good-rod', kind: 'upgrade', price: 15_000, requiresBoss: 'torre-pokemon' },
  { id: 'surf', kind: 'upgrade', price: 20_000, requiresBoss: 'rota-12-15' },
  { id: 'super-rod', kind: 'upgrade', price: 45_000, requiresBoss: 'mansao-cinnabar' },
];

/**
 * Loja de Departamentos de Celadon: mercado à parte, que vende todos os itens usáveis do
 * jogo, mas só para quem estiver na área dela. O catálogo é montado em index.ts.
 */
export const DEPT_STORE = {
  routeId: 'rota-7-8-celadon',
  name: 'Loja de Departamentos de Celadon',
  prices: {
    'poke-ball': 40,
    'great-ball': 150,
    'ultra-ball': 400,
    'master-ball': 300_000,
    'net-ball': 300,
    'dusk-ball': 300,
    'quick-ball': 350,
    'timer-ball': 350,
    'repeat-ball': 300,
    'nest-ball': 250,
    'luxury-ball': 300,
    'heal-ball': 100,
    repel: 300,
    'super-repel': 500,
    'max-repel': 700,
    'sea-incense': 1200,
    'rose-incense': 1200,
    'rock-incense': 1200,
    'odd-incense': 1200,
    'rare-candy': 12_000,
    everstone: 2000,
    'soothe-bell': 6000,
  } as Record<string, number>,
  /** Pedras e itens de evolução (as quatro pedras básicas custam o mesmo que no Poké Mart). */
  evolutionItem: 6000,
  basicStones: ['moon-stone', 'thunder-stone', 'water-stone', 'leaf-stone', 'fire-stone'],
  basicStone: 2500,
  /** Berries que não estão à venda no Poké Mart. */
  rareBerry: 1500,
  fossil: 10_000,
};

/** Pedras e itens de evolução que não estão no SHOP fixo: preço e chefe que os libera. */
export const EVOLUTION_ITEM_SHOP = { price: 8000, requiresBoss: 'liga-campeao' };
