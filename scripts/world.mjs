// Conteúdo do mundo: regiões, rotas, ginásios, Ligas, rivais, errantes, fósseis,
// expedições e prêmios do Game Corner. Espécies são referenciadas pelo nome da
// PokéAPI; `npm run data:fetch` valida cada nome, baixa só o que é usado e gera
// src/game-data/generated/world.json com os ids numéricos.
//
// Formato das rotas:
//   r(id, nome, descrição, vitórias, cena, [x, y] no mapa da região, encontros, opções)
//   encontros: [espécie, peso, nívelMín, nívelMáx, 'day' | 'night' (opcional)]
//   chefe: { name, title, trainer, badge, team: [[espécie | '$rival:N', nível]], reward }
// Rotas de desafio (Liga) usam kind: 'trial' e `farm` (rota onde o jogador treina enquanto isso).

const r = (id, name, description, kills, scene, map, encounters, opts = {}) => ({
  id,
  name,
  description,
  kills,
  scene,
  map,
  encounters,
  ...opts,
});

const boss = (name, title, trainer, team, coins, extra = {}) => ({ name, title, trainer, team, reward: { coins, ...(extra.reward ?? {}) }, ...extra });

/** Desafio da Liga: sem encontros selvagens, o jogador treina em `farm`. */
const trial = (id, name, farm, map, b) => ({
  id,
  name,
  description: 'Sala da Liga Pokémon. Só há o desafiante e o seu oponente.',
  kills: 0,
  scene: 'city',
  map,
  encounters: [],
  kind: 'trial',
  farm,
  boss: b,
});

export const STARTERS = [
  { generation: 1, region: 'Kanto', starters: ['bulbasaur', 'charmander', 'squirtle'] },
  { generation: 2, region: 'Johto', starters: ['chikorita', 'cyndaquil', 'totodile'] },
  { generation: 3, region: 'Hoenn', starters: ['treecko', 'torchic', 'mudkip'] },
  { generation: 4, region: 'Sinnoh', starters: ['turtwig', 'chimchar', 'piplup'] },
  { generation: 5, region: 'Unova', starters: ['snivy', 'tepig', 'oshawott'] },
];

const RARE_STARTERS = STARTERS.flatMap((g) => g.starters).map((s) => [s, 0.25, 15, 18]);

// ---------------------------------------------------------------------------------
// KANTO (Nv. 2 → 65)

const kanto = {
  id: 'kanto',
  name: 'Kanto',
  trainerSuffix: ['-gen3', ''],
  routes: [
    r('rota-1', 'Rota 1', 'Um caminho tranquilo saindo de Pallet.', 20, 'meadow', [22, 78], [
      ['pidgey', 50, 2, 3, 'day'],
      ['rattata', 50, 2, 3],
      ['hoothoot', 30, 2, 3, 'night'],
    ]),
    r('rota-2', 'Rota 2', 'Gramado alto ao norte de Viridian.', 30, 'route', [22, 60], [
      ['pidgey', 35, 3, 5, 'day'],
      ['rattata', 35, 3, 5],
      ['caterpie', 15, 3, 5, 'day'],
      ['weedle', 15, 3, 5, 'day'],
      ['hoothoot', 20, 3, 5, 'night'],
      ['spinarak', 15, 3, 5, 'night'],
    ]),
    r('floresta-viridian', 'Floresta de Viridian', 'Mata fechada cheia de insetos. Brock espera em Pewter.', 45, 'forest', [22, 44], [
      ['caterpie', 25, 4, 6],
      ['metapod', 15, 5, 7],
      ['weedle', 25, 4, 6],
      ['kakuna', 15, 5, 7],
      ['pidgey', 15, 5, 7, 'day'],
      ['pikachu', 5, 5, 7],
      ['oddish', 10, 5, 7, 'night'],
    ], {
      boss: boss('Brock', 'Líder do Ginásio de Pewter', 'brock', [['geodude', 10], ['onix', 12]], 300, {
        badge: { id: 'boulder', name: 'Insígnia da Rocha', sprite: 1 },
        reward: { items: { 'great-ball': 3 }, tm: 'rock-tomb' },
      }),
    }),
    r('rota-3', 'Rota 3', 'Trilha pedregosa rumo ao Mt. Moon.', 55, 'mountain', [32, 40], [
      ['spearow', 30, 8, 11],
      ['jigglypuff', 15, 8, 11],
      ['ekans', 20, 8, 11, 'day'],
      ['sandshrew', 20, 8, 11],
      ['nidoran-f', 7, 8, 11],
      ['nidoran-m', 8, 8, 11],
      ['zubat', 15, 8, 11, 'night'],
    ]),
    r('mt-moon', 'Mt. Moon', 'Cavernas escuras onde a Equipe Rocket procura fósseis.', 65, 'cave', [44, 30], [
      ['zubat', 50, 9, 13],
      ['geodude', 30, 9, 13],
      ['paras', 12, 10, 13],
      ['clefairy', 8, 10, 13],
      ['clefairy', 12, 10, 13, 'night'],
    ], {
      boss: boss('Recruta Rocket', 'Equipe Rocket', 'rocketgrunt', [['zubat', 13], ['ekans', 14], ['raticate', 15]], 450, {
        reward: { items: { 'moon-stone': 1, 'helix-fossil': 1 } },
      }),
    }),
    r('rota-4', 'Rota 4 e Cerulean', 'Saída do Mt. Moon em direção a Cerulean.', 75, 'route', [58, 28], [
      ['rattata', 20, 12, 16],
      ['spearow', 25, 12, 16],
      ['ekans', 15, 12, 16],
      ['sandshrew', 15, 12, 16],
      ['mankey', 25, 12, 16],
    ], {
      boss: boss('Misty', 'Líder do Ginásio de Cerulean', 'misty', [['staryu', 18], ['starmie', 21]], 700, {
        badge: { id: 'cascade', name: 'Insígnia da Cascata', sprite: 2 },
        reward: { items: { 'great-ball': 5 }, tm: 'scald' },
      }),
    }),
    r('rota-24-25', 'Ponte Pepita e Rota 25', 'Dizem que Pokémon iniciais raros aparecem por aqui.', 100, 'river', [64, 14], [
      ['oddish', 25, 14, 19],
      ['bellsprout', 20, 14, 19],
      ['pidgey', 20, 14, 19, 'day'],
      ['abra', 8, 14, 18],
      ['venonat', 15, 14, 19, 'night'],
      ['metapod', 10, 14, 18],
      ['kakuna', 10, 14, 18],
      ['pidgeotto', 8, 17, 20],
      ...RARE_STARTERS,
    ], {
      boss: boss('Blue', 'Seu rival', 'blue', [['pidgeotto', 18], ['abra', 16], ['rattata', 16], ['$rival:2', 20]], 800, { rival: true }),
    }),
    r('rota-5-6', 'Rotas 5–6 e Vermilion', 'O porto de Vermilion e o ginásio elétrico do Lt. Surge.', 60, 'route', [60, 52], [
      ['oddish', 20, 16, 22],
      ['bellsprout', 20, 16, 22],
      ['meowth', 20, 16, 22, 'night'],
      ['pidgey', 20, 16, 22, 'day'],
      ['mankey', 15, 16, 22],
      ['psyduck', 10, 16, 22],
      ['abra', 5, 16, 20],
    ], {
      boss: boss('Lt. Surge', 'Líder do Ginásio de Vermilion', 'ltsurge', [['voltorb', 24], ['pikachu', 23], ['raichu', 27]], 900, {
        badge: { id: 'thunder', name: 'Insígnia do Trovão', sprite: 3 },
        reward: { tm: 'wild-charge' },
      }),
    }),
    r('tunel-de-pedra', 'Túnel de Pedra', 'Um túnel escuro e sem iluminação até Lavender.', 70, 'cave', [76, 30], [
      ['zubat', 35, 22, 27],
      ['geodude', 30, 22, 27],
      ['machop', 20, 22, 27],
      ['onix', 10, 22, 27],
      ['cubone', 5, 22, 27],
    ]),
    r('torre-pokemon', 'Torre Pokémon', 'O cemitério de Lavender. Fantasmas aparecem à noite.', 70, 'dampcave', [78, 46], [
      ['gastly', 50, 24, 30],
      ['gastly', 40, 24, 30, 'night'],
      ['haunter', 10, 26, 30],
      ['haunter', 15, 26, 30, 'night'],
      ['cubone', 15, 24, 28],
    ], {
      boss: boss('Blue', 'Seu rival', 'blue', [['pidgeotto', 26], ['kadabra', 25], ['exeggcute', 24], ['$rival:2', 28]], 1100, { rival: true }),
    }),
    r('rota-7-8-celadon', 'Rotas 7–8 e Celadon', 'A maior cidade de Kanto, com a loja de departamentos e o Game Corner.', 80, 'meadow', [44, 50], [
      ['growlithe', 15, 26, 32],
      ['vulpix', 15, 26, 32],
      ['oddish', 20, 26, 32],
      ['bellsprout', 20, 26, 32],
      ['meowth', 15, 26, 32, 'night'],
      ['jigglypuff', 10, 26, 32],
      ['pidgeotto', 15, 26, 32, 'day'],
    ], {
      boss: boss('Erika', 'Líder do Ginásio de Celadon', 'erika', [['tangela', 31], ['victreebel', 33], ['vileplume', 35]], 1300, {
        badge: { id: 'rainbow', name: 'Insígnia do Arco-Íris', sprite: 4 },
        reward: { tm: 'giga-drain' },
      }),
    }),
    r('esconderijo-rocket', 'Esconderijo Rocket', 'Embaixo do Game Corner, o chefe da Equipe Rocket comanda tudo.', 80, 'city', [40, 46], [
      ['koffing', 25, 28, 34],
      ['grimer', 20, 28, 34],
      ['raticate', 20, 28, 34],
      ['zubat', 15, 28, 34],
      ['drowzee', 15, 28, 34],
      ['ekans', 10, 28, 34],
    ], {
      boss: boss('Giovanni', 'Chefe da Equipe Rocket', 'giovanni', [['onix', 33], ['rhyhorn', 33], ['kangaskhan', 36]], 1500, {
        reward: { items: { 'ultra-ball': 5 } },
      }),
    }),
    r('rota-12-15', 'Rotas 12–15 e Fuchsia', 'Pescadores, a ponte de Silence e o ginásio ninja de Koga.', 85, 'river', [70, 76], [
      ['psyduck', 15, 30, 36],
      ['slowpoke', 15, 30, 36],
      ['krabby', 15, 30, 36],
      ['magikarp', 15, 30, 36],
      ['poliwag', 15, 30, 36],
      ['venonat', 15, 30, 36, 'night'],
      ['gloom', 10, 30, 36],
      ['snorlax', 1, 30, 30],
    ], {
      boss: boss('Koga', 'Líder do Ginásio de Fuchsia', 'koga', [['koffing', 38], ['muk', 38], ['koffing', 38], ['weezing', 43]], 1600, {
        badge: { id: 'soul', name: 'Insígnia da Alma', sprite: 5 },
        reward: { tm: 'sludge-bomb' },
      }),
    }),
    r('zona-safari', 'Zona Safari', 'Espécies raras e captura facilitada (+50%).', 70, 'meadow', [58, 84], [
      ['nidorino', 15, 30, 38],
      ['nidorina', 15, 30, 38],
      ['rhyhorn', 15, 30, 38],
      ['exeggcute', 15, 30, 38],
      ['venomoth', 10, 30, 38, 'night'],
      ['kangaskhan', 6, 30, 38],
      ['scyther', 5, 30, 38],
      ['pinsir', 5, 30, 38],
      ['tauros', 6, 30, 38],
      ['chansey', 3, 30, 38],
      ['dratini', 3, 30, 36],
    ], { safari: true }),
    r('rota-16-18', 'Ciclovia e Saffron', 'Descida da Ciclovia até a cidade de Saffron e a Silph Co.', 85, 'city', [52, 50], [
      ['doduo', 20, 33, 39],
      ['spearow', 15, 33, 39],
      ['fearow', 10, 35, 39],
      ['ponyta', 15, 33, 39],
      ['grimer', 15, 33, 39, 'night'],
      ['raticate', 15, 33, 39],
      ['porygon', 2, 33, 36],
    ], {
      boss: boss('Sabrina', 'Líder do Ginásio de Saffron', 'sabrina', [['kadabra', 40], ['mr-mime', 39], ['venomoth', 40], ['alakazam', 45]], 1800, {
        badge: { id: 'marsh', name: 'Insígnia do Pântano', sprite: 6 },
        reward: { tm: 'psychic' },
      }),
    }),
    r('ilhas-seafoam', 'Ilhas Seafoam', 'Cavernas geladas cercadas pelo mar.', 90, 'icecave', [48, 90], [
      ['seel', 20, 36, 44],
      ['shellder', 15, 36, 44],
      ['horsea', 15, 36, 44],
      ['staryu', 10, 36, 44, 'night'],
      ['psyduck', 10, 36, 44],
      ['golduck', 5, 40, 44],
      ['slowpoke', 10, 36, 44],
      ['jynx', 5, 36, 44],
      ['dewgong', 3, 42, 44],
    ]),
    r('mansao-cinnabar', 'Mansão de Cinnabar', 'Ruínas de um laboratório na ilha vulcânica.', 90, 'volcano', [28, 90], [
      ['growlithe', 15, 38, 46],
      ['ponyta', 15, 38, 46],
      ['koffing', 15, 38, 46],
      ['grimer', 15, 38, 46],
      ['magmar', 8, 38, 46],
      ['vulpix', 12, 38, 46],
      ['ditto', 10, 38, 46],
      ['raticate', 10, 38, 46, 'night'],
    ], {
      boss: boss('Blaine', 'Líder do Ginásio de Cinnabar', 'blaine', [['growlithe', 42], ['ponyta', 40], ['rapidash', 42], ['arcanine', 47]], 2000, {
        badge: { id: 'volcano', name: 'Insígnia do Vulcão', sprite: 7 },
        reward: { tm: 'fire-blast' },
      }),
    }),
    r('rota-22-23', 'Rotas 22–23 e Viridian', 'O ginásio de Viridian finalmente abriu as portas.', 95, 'route', [12, 66], [
      ['nidorino', 15, 42, 48],
      ['nidorina', 15, 42, 48],
      ['mankey', 15, 42, 48],
      ['primeape', 10, 44, 48],
      ['fearow', 15, 42, 48],
      ['arbok', 10, 42, 48],
      ['sandslash', 10, 42, 48],
      ['tentacool', 10, 42, 48],
    ], {
      boss: boss('Giovanni', 'Líder do Ginásio de Viridian', 'giovanni', [['rhyhorn', 45], ['dugtrio', 42], ['nidoqueen', 44], ['nidoking', 45], ['rhydon', 50]], 2400, {
        badge: { id: 'earth', name: 'Insígnia da Terra', sprite: 8 },
        reward: { tm: 'earthquake' },
      }),
    }),
    r('estrada-vitoria', 'Estrada da Vitória', 'A caverna final antes do Platô Índigo.', 100, 'cave', [6, 40], [
      ['machoke', 20, 44, 50],
      ['graveler', 20, 44, 50],
      ['onix', 15, 44, 50],
      ['marowak', 15, 44, 50],
      ['golbat', 15, 44, 50],
      ['venomoth', 10, 44, 50, 'night'],
      ['moltres', 0.2, 50, 50],
    ], {
      boss: boss('Blue', 'Seu rival', 'blue', [['pidgeot', 48], ['alakazam', 47], ['rhyhorn', 46], ['exeggcute', 46], ['$rival:3', 53]], 2600, { rival: true }),
    }),
    trial('liga-lorelei', 'Liga — Lorelei', 'estrada-vitoria', [6, 24], boss('Lorelei', 'Elite dos Quatro', 'lorelei', [['dewgong', 54], ['cloyster', 53], ['slowbro', 54], ['jynx', 56], ['lapras', 56]], 3000)),
    trial('liga-bruno', 'Liga — Bruno', 'estrada-vitoria', [6, 20], boss('Bruno', 'Elite dos Quatro', 'bruno', [['onix', 53], ['hitmonchan', 55], ['hitmonlee', 55], ['onix', 56], ['machamp', 58]], 3200)),
    trial('liga-agatha', 'Liga — Agatha', 'estrada-vitoria', [6, 16], boss('Agatha', 'Elite dos Quatro', 'agatha', [['gengar', 56], ['golbat', 56], ['haunter', 55], ['arbok', 58], ['gengar', 60]], 3400)),
    trial('liga-lance', 'Liga — Lance', 'estrada-vitoria', [6, 12], boss('Lance', 'Elite dos Quatro', 'lance', [['gyarados', 58], ['dragonair', 56], ['dragonair', 56], ['aerodactyl', 60], ['dragonite', 62]], 3600)),
    trial('liga-campeao', 'Liga — Campeão', 'estrada-vitoria', [6, 6], boss('Blue', 'Campeão da Liga Pokémon', 'blue', [['pidgeot', 61], ['alakazam', 59], ['rhydon', 61], ['arcanine', 61], ['exeggutor', 63], ['$rival:3', 65]], 6000, { rival: true, champion: true })),
  ],
};

// ---------------------------------------------------------------------------------
// JOHTO (Nv. 56 → 78)

const johto = {
  id: 'johto',
  name: 'Johto',
  trainerSuffix: ['-gen4', '-gen2', ''],
  routes: [
    r('johto-rotas-29-31', 'Rotas 29–31', 'De New Bark até Violet, a cidade da torre Sprout.', 60, 'meadow', [84, 70], [
      ['sentret', 25, 56, 59, 'day'],
      ['hoothoot', 25, 56, 59, 'night'],
      ['pidgey', 15, 56, 59, 'day'],
      ['rattata', 15, 56, 59, 'night'],
      ['ledyba', 15, 56, 59, 'day'],
      ['spinarak', 15, 56, 59, 'night'],
      ['hoppip', 15, 56, 59],
      ['furret', 5, 58, 60],
    ], {
      boss: boss('Falkner', 'Líder do Ginásio de Violet', 'falkner', [['pidgeotto', 60], ['noctowl', 60], ['pidgeot', 63]], 3000, {
        badge: { id: 'zephyr', name: 'Insígnia do Zéfiro', sprite: 9 },
        reward: { tm: 'aerial-ace' },
      }),
    }),
    r('poco-slowpoke-ilex', 'Poço Slowpoke e Floresta Ilex', 'O poço onde os Slowpoke são caçados e a floresta sagrada.', 65, 'forest', [62, 82], [
      ['slowpoke', 20, 58, 61],
      ['zubat', 15, 58, 61],
      ['caterpie', 10, 58, 61, 'day'],
      ['weedle', 10, 58, 61, 'day'],
      ['metapod', 10, 58, 61],
      ['paras', 10, 58, 61],
      ['oddish', 15, 58, 61, 'night'],
      ['psyduck', 10, 58, 61],
      ['pineco', 10, 58, 61],
    ], {
      boss: boss('Bugsy', 'Líder do Ginásio de Azalea', 'bugsy', [['beedrill', 62], ['butterfree', 62], ['scyther', 65]], 3200, {
        badge: { id: 'hive', name: 'Insígnia da Colmeia', sprite: 10 },
        reward: { tm: 'x-scissor' },
      }),
    }),
    r('rotas-34-35-goldenrod', 'Rotas 34–35 e Goldenrod', 'A metrópole de Johto, com a creche e a torre de rádio.', 70, 'city', [56, 62], [
      ['snubbull', 15, 60, 63],
      ['drowzee', 15, 60, 63],
      ['abra', 10, 60, 63],
      ['ditto', 10, 60, 63],
      ['jigglypuff', 15, 60, 63],
      ['yanma', 10, 60, 63],
      ['nidoran-f', 10, 60, 63],
      ['nidoran-m', 10, 60, 63],
      ['growlithe', 5, 60, 63],
    ], {
      boss: boss('Whitney', 'Líder do Ginásio de Goldenrod', 'whitney', [['clefable', 64], ['miltank', 67]], 3400, {
        badge: { id: 'plain', name: 'Insígnia da Planície', sprite: 11 },
        reward: { tm: 'hyper-voice' },
      }),
    }),
    r('torre-queimada', 'Torre Queimada e Ecruteak', 'A torre onde as três feras lendárias despertaram.', 70, 'dampcave', [56, 44], [
      ['rattata', 15, 62, 65],
      ['raticate', 10, 62, 65],
      ['koffing', 15, 62, 65],
      ['zubat', 15, 62, 65],
      ['magmar', 10, 62, 65],
      ['gastly', 20, 62, 65, 'night'],
      ['haunter', 10, 62, 65, 'night'],
      ['misdreavus', 5, 62, 65, 'night'],
    ], {
      boss: boss('Morty', 'Líder do Ginásio de Ecruteak', 'morty', [['haunter', 65], ['misdreavus', 66], ['haunter', 66], ['gengar', 69]], 3600, {
        badge: { id: 'fog', name: 'Insígnia da Névoa', sprite: 12 },
        reward: { tm: 'shadow-ball' },
      }),
    }),
    r('rotas-38-42-cianwood', 'Rotas 38–42 e Cianwood', 'Fazendas de Miltank e a ilha de Cianwood do outro lado do mar.', 75, 'beach', [34, 52], [
      ['miltank', 10, 64, 67],
      ['tauros', 10, 64, 67],
      ['farfetchd', 10, 64, 67],
      ['magnemite', 15, 64, 67],
      ['tentacool', 20, 64, 67],
      ['tentacruel', 5, 64, 67],
      ['krabby', 15, 64, 67],
      ['mankey', 15, 64, 67],
    ], {
      boss: boss('Chuck', 'Líder do Ginásio de Cianwood', 'chuck', [['primeape', 68], ['poliwrath', 71]], 3800, {
        badge: { id: 'storm', name: 'Insígnia da Tempestade', sprite: 13 },
        reward: { tm: 'focus-blast' },
      }),
    }),
    r('farol-olivine', 'Farol de Olivine', 'O farol cuja luz é mantida por uma Ampharos doente.', 75, 'beach', [40, 40], [
      ['magnemite', 20, 66, 69],
      ['magneton', 5, 67, 69],
      ['mareep', 15, 66, 69],
      ['flaaffy', 10, 67, 69],
      ['wooper', 15, 66, 69],
      ['quagsire', 10, 67, 69],
      ['skarmory', 5, 66, 69],
      ['gastly', 20, 66, 69, 'night'],
    ], {
      boss: boss('Jasmine', 'Líder do Ginásio de Olivine', 'jasmine', [['magneton', 70], ['magneton', 70], ['steelix', 73]], 4000, {
        badge: { id: 'mineral', name: 'Insígnia Mineral', sprite: 14 },
        reward: { tm: 'iron-tail' },
      }),
    }),
    r('lago-da-furia', 'Lago da Fúria e Mahogany', 'Um lago onde Gyarados furiosos são forçados a evoluir.', 80, 'river', [62, 26], [
      ['magikarp', 25, 68, 71],
      ['gyarados', 5, 69, 71],
      ['goldeen', 15, 68, 71],
      ['seaking', 10, 69, 71],
      ['delibird', 10, 68, 71],
      ['swinub', 15, 68, 71],
      ['sneasel', 10, 68, 71, 'night'],
      ['piloswine', 5, 70, 71],
    ], {
      boss: boss('Pryce', 'Líder do Ginásio de Mahogany', 'pryce', [['dewgong', 72], ['cloyster', 72], ['piloswine', 75]], 4200, {
        badge: { id: 'glacier', name: 'Insígnia da Geleira', sprite: 15 },
        reward: { tm: 'ice-beam' },
      }),
    }),
    r('caverna-gelada', 'Caverna Gelada e Blackthorn', 'Um caminho escorregadio até a cidade dos domadores de dragão.', 85, 'icecave', [76, 18], [
      ['swinub', 20, 70, 73],
      ['jynx', 15, 70, 73],
      ['delibird', 10, 70, 73],
      ['sneasel', 15, 70, 73],
      ['zubat', 15, 70, 73],
      ['golbat', 15, 70, 73],
      ['dratini', 3, 70, 72],
    ], {
      boss: boss('Clair', 'Líder do Ginásio de Blackthorn', 'clair', [['dragonair', 74], ['dragonair', 74], ['dragonair', 74], ['kingdra', 78]], 4600, {
        badge: { id: 'rising', name: 'Insígnia da Ascensão', sprite: 16 },
        reward: { tm: 'dragon-pulse' },
      }),
    }),
    r('johto-estrada-vitoria', 'Rotas 26–27 e Estrada da Vitória', 'O caminho de volta para o Platô Índigo, agora pelo lado de Johto.', 100, 'cave', [92, 40], [
      ['ponyta', 15, 72, 76],
      ['rapidash', 10, 73, 76],
      ['dodrio', 10, 72, 76],
      ['sandslash', 10, 72, 76],
      ['quagsire', 10, 72, 76],
      ['graveler', 15, 72, 76],
      ['golbat', 15, 72, 76, 'night'],
      ['ursaring', 10, 72, 76],
      ['donphan', 10, 72, 76],
    ], {
      boss: boss('Silver', 'Seu rival', 'silver', [['sneasel', 74], ['golbat', 75], ['magneton', 74], ['gengar', 75], ['alakazam', 75], ['$rival:3', 78]], 5000, { rival: true }),
    }),
    trial('johto-liga-will', 'Liga de Johto — Will', 'johto-estrada-vitoria', [96, 30], boss('Will', 'Elite dos Quatro', 'will', [['xatu', 76], ['jynx', 76], ['exeggutor', 77], ['slowbro', 77], ['xatu', 79]], 5200)),
    trial('johto-liga-koga', 'Liga de Johto — Koga', 'johto-estrada-vitoria', [96, 24], boss('Koga', 'Elite dos Quatro', 'koga', [['ariados', 76], ['forretress', 77], ['muk', 78], ['venomoth', 77], ['crobat', 80]], 5400)),
    trial('johto-liga-bruno', 'Liga de Johto — Bruno', 'johto-estrada-vitoria', [96, 18], boss('Bruno', 'Elite dos Quatro', 'bruno', [['hitmontop', 77], ['hitmonlee', 77], ['hitmonchan', 77], ['onix', 78], ['machamp', 81]], 5600)),
    trial('johto-liga-karen', 'Liga de Johto — Karen', 'johto-estrada-vitoria', [96, 12], boss('Karen', 'Elite dos Quatro', 'karen', [['umbreon', 78], ['vileplume', 77], ['gengar', 78], ['murkrow', 78], ['houndoom', 82]], 5800)),
    trial('johto-liga-campeao', 'Liga de Johto — Campeão', 'johto-estrada-vitoria', [96, 6], boss('Lance', 'Campeão da Liga de Johto', 'lance', [['gyarados', 80], ['dragonite', 80], ['dragonite', 80], ['aerodactyl', 80], ['charizard', 80], ['dragonite', 83]], 9000, { champion: true })),
  ],
};

// ---------------------------------------------------------------------------------
// HOENN (Nv. 66 → 86)

const hoenn = {
  id: 'hoenn',
  name: 'Hoenn',
  trainerSuffix: ['-gen3', ''],
  routes: [
    r('hoenn-rotas-101-104', 'Rotas 101–104 e Floresta Petalburg', 'Do laboratório do Prof. Birch até a cidade de Rustboro.', 60, 'forest', [22, 72], [
      ['zigzagoon', 20, 66, 69],
      ['wurmple', 15, 66, 69, 'day'],
      ['poochyena', 15, 66, 69, 'night'],
      ['lotad', 10, 66, 69],
      ['seedot', 10, 66, 69],
      ['taillow', 10, 66, 69, 'day'],
      ['wingull', 10, 66, 69],
      ['shroomish', 10, 66, 69],
      ['slakoth', 5, 66, 69],
      ['ralts', 3, 66, 68],
    ], {
      boss: boss('Roxanne', 'Líder do Ginásio de Rustboro', 'roxanne', [['graveler', 70], ['nosepass', 71], ['golem', 74]], 4400, {
        badge: { id: 'stone', name: 'Insígnia da Pedra', sprite: 17 },
        reward: { tm: 'rock-slide' },
      }),
    }),
    r('caverna-granite', 'Caverna Granite e Dewford', 'Uma caverna com pinturas antigas numa ilha pequena.', 65, 'cave', [16, 84], [
      ['zubat', 20, 68, 71],
      ['makuhita', 20, 68, 71],
      ['geodude', 15, 68, 71],
      ['aron', 15, 68, 71],
      ['abra', 10, 68, 71],
      ['sableye', 10, 68, 71, 'night'],
      ['mawile', 10, 68, 71, 'day'],
    ], {
      boss: boss('Brawly', 'Líder do Ginásio de Dewford', 'brawly', [['machoke', 72], ['medicham', 73], ['hariyama', 75]], 4600, {
        badge: { id: 'knuckle', name: 'Insígnia do Punho', sprite: 18 },
        reward: { tm: 'brick-break' },
      }),
    }),
    r('rota-110-mauville', 'Rota 110 e Mauville', 'A ponte de ciclismo sobre o mar até a cidade coberta.', 70, 'plains', [40, 58], [
      ['electrike', 20, 70, 73],
      ['plusle', 10, 70, 73],
      ['minun', 10, 70, 73],
      ['magnemite', 15, 70, 73],
      ['oddish', 15, 70, 73, 'night'],
      ['wingull', 10, 70, 73],
      ['gulpin', 15, 70, 73],
      ['zigzagoon', 10, 70, 73],
    ], {
      boss: boss('Wattson', 'Líder do Ginásio de Mauville', 'wattson', [['magneton', 74], ['electrode', 74], ['manectric', 77]], 4800, {
        badge: { id: 'dynamo', name: 'Insígnia do Dínamo', sprite: 19 },
        reward: { tm: 'thunderbolt' },
      }),
    }),
    r('monte-chimney', 'Monte Chimney e Lavaridge', 'Cinzas caem sobre a rota 113 a caminho do vulcão.', 75, 'volcano', [40, 38], [
      ['numel', 20, 72, 75],
      ['slugma', 20, 72, 75],
      ['spinda', 15, 72, 75],
      ['skarmory', 10, 72, 75],
      ['torkoal', 10, 72, 75],
      ['machop', 15, 72, 75],
      ['camerupt', 5, 74, 75],
    ], {
      boss: boss('Flannery', 'Líder do Ginásio de Lavaridge', 'flannery', [['camerupt', 76], ['magcargo', 76], ['torkoal', 79]], 5000, {
        badge: { id: 'heat', name: 'Insígnia do Calor', sprite: 20 },
        reward: { tm: 'flamethrower' },
      }),
    }),
    r('deserto-rota-111', 'Deserto da Rota 111 e Petalburg', 'Uma tempestade de areia constante esconde ruínas antigas.', 80, 'desert', [48, 46], [
      ['sandshrew', 20, 74, 77],
      ['trapinch', 20, 74, 77],
      ['cacnea', 15, 74, 77],
      ['baltoy', 15, 74, 77],
      ['geodude', 15, 74, 77],
      ['vibrava', 5, 76, 77],
    ], {
      boss: boss('Norman', 'Líder do Ginásio de Petalburg', 'norman', [['spinda', 78], ['vigoroth', 78], ['linoone', 78], ['slaking', 81]], 5200, {
        badge: { id: 'balance', name: 'Insígnia do Equilíbrio', sprite: 21 },
        reward: { tm: 'facade' },
      }),
    }),
    r('rota-119-fortree', 'Rota 119 e Fortree', 'Uma floresta chuvosa e a cidade nas copas das árvores.', 85, 'forest', [66, 34], [
      ['tropius', 10, 76, 79],
      ['kecleon', 10, 76, 79],
      ['linoone', 15, 76, 79],
      ['oddish', 15, 76, 79],
      ['tentacool', 10, 76, 79],
      ['castform', 5, 76, 79],
      ['magikarp', 20, 76, 79],
      ['shuppet', 15, 76, 79, 'night'],
    ], {
      boss: boss('Winona', 'Líder do Ginásio de Fortree', 'winona', [['swellow', 80], ['pelipper', 80], ['skarmory', 80], ['altaria', 83]], 5400, {
        badge: { id: 'feather', name: 'Insígnia da Pena', sprite: 22 },
        reward: { tm: 'u-turn' },
      }),
    }),
    r('rotas-123-124-mossdeep', 'Rotas 123–124 e Mossdeep', 'Mar aberto até a ilha do centro espacial.', 85, 'beach', [82, 50], [
      ['wingull', 20, 78, 81],
      ['pelipper', 10, 78, 81],
      ['tentacool', 15, 78, 81],
      ['tentacruel', 10, 78, 81],
      ['chimecho', 5, 78, 81],
      ['shuppet', 15, 78, 81, 'night'],
      ['duskull', 15, 78, 81, 'night'],
      ['lunatone', 5, 78, 81, 'night'],
      ['solrock', 5, 78, 81, 'day'],
    ], {
      boss: boss('Tate e Liza', 'Líderes do Ginásio de Mossdeep', 'tateandliza', [['claydol', 82], ['xatu', 82], ['lunatone', 83], ['solrock', 83]], 5600, {
        badge: { id: 'mind', name: 'Insígnia da Mente', sprite: 23 },
        reward: { tm: 'psyshock' },
      }),
    }),
    r('caverna-seafloor', 'Caverna Seafloor e Sootopolis', 'Uma cratera submersa e a cidade escondida dentro dela.', 90, 'sea', [70, 66], [
      ['zubat', 15, 80, 83],
      ['golbat', 15, 80, 83],
      ['tentacruel', 10, 80, 83],
      ['wailmer', 15, 80, 83],
      ['sharpedo', 10, 80, 83],
      ['chinchou', 10, 80, 83, 'night'],
      ['lanturn', 5, 81, 83],
      ['corsola', 10, 80, 83],
      ['relicanth', 3, 80, 83],
    ], {
      boss: boss('Wallace', 'Líder do Ginásio de Sootopolis', 'wallace', [['whiscash', 84], ['sealeo', 84], ['seaking', 84], ['milotic', 87]], 6000, {
        badge: { id: 'rain', name: 'Insígnia da Chuva', sprite: 24 },
        reward: { tm: 'surf' },
      }),
    }),
    r('hoenn-estrada-vitoria', 'Estrada da Vitória (Hoenn)', 'A caverna mais longa de Hoenn, antes de Ever Grande.', 100, 'cave', [92, 70], [
      ['golbat', 15, 82, 85],
      ['hariyama', 15, 82, 85],
      ['loudred', 15, 82, 85],
      ['lairon', 15, 82, 85],
      ['medicham', 10, 82, 85],
      ['mawile', 10, 82, 85],
      ['whismur', 10, 82, 85],
      ['bagon', 2, 82, 84],
    ], {
      boss: boss('May', 'Sua rival', 'may', [['swellow', 84], ['pelipper', 84], ['shiftry', 84], ['breloom', 84], ['$rival:3', 87]], 6400, { rival: true }),
    }),
    trial('hoenn-liga-sidney', 'Liga de Hoenn — Sidney', 'hoenn-estrada-vitoria', [96, 62], boss('Sidney', 'Elite dos Quatro', 'sidney', [['mightyena', 84], ['shiftry', 84], ['cacturne', 84], ['crawdaunt', 85], ['absol', 86]], 6600)),
    trial('hoenn-liga-phoebe', 'Liga de Hoenn — Phoebe', 'hoenn-estrada-vitoria', [96, 54], boss('Phoebe', 'Elite dos Quatro', 'phoebe', [['dusclops', 85], ['banette', 85], ['sableye', 85], ['banette', 85], ['dusclops', 87]], 6800)),
    trial('hoenn-liga-glacia', 'Liga de Hoenn — Glacia', 'hoenn-estrada-vitoria', [96, 46], boss('Glacia', 'Elite dos Quatro', 'glacia', [['sealeo', 86], ['glalie', 86], ['sealeo', 86], ['glalie', 86], ['walrein', 88]], 7000)),
    trial('hoenn-liga-drake', 'Liga de Hoenn — Drake', 'hoenn-estrada-vitoria', [96, 38], boss('Drake', 'Elite dos Quatro', 'drake', [['shelgon', 87], ['altaria', 87], ['flygon', 87], ['flygon', 87], ['salamence', 89]], 7200)),
    trial('hoenn-liga-campeao', 'Liga de Hoenn — Campeão', 'hoenn-estrada-vitoria', [96, 30], boss('Steven', 'Campeão da Liga de Hoenn', 'steven', [['skarmory', 88], ['claydol', 88], ['aggron', 89], ['cradily', 89], ['armaldo', 89], ['metagross', 91]], 11000, { champion: true })),
  ],
};

// ---------------------------------------------------------------------------------
// SINNOH (Nv. 74 → 93)

const sinnoh = {
  id: 'sinnoh',
  name: 'Sinnoh',
  trainerSuffix: ['-gen4', ''],
  routes: [
    r('sinnoh-rotas-201-203', 'Rotas 201–203 e Oreburgh', 'De Twinleaf até a cidade mineira de Oreburgh.', 60, 'meadow', [30, 78], [
      ['starly', 20, 74, 77],
      ['bidoof', 20, 74, 77],
      ['kricketot', 15, 74, 77, 'night'],
      ['shinx', 15, 74, 77],
      ['budew', 10, 74, 77, 'day'],
      ['zubat', 10, 74, 77],
      ['geodude', 15, 74, 77],
      ['abra', 5, 74, 77],
    ], {
      boss: boss('Roark', 'Líder do Ginásio de Oreburgh', 'roark', [['graveler', 78], ['onix', 78], ['rampardos', 81]], 6000, {
        badge: { id: 'coal', name: 'Insígnia do Carvão', sprite: 25 },
        reward: { tm: 'stone-edge' },
      }),
    }),
    r('floresta-eterna', 'Floresta Eterna', 'Uma floresta antiga com uma mansão abandonada.', 65, 'forest', [38, 54], [
      ['buneary', 10, 76, 79],
      ['wurmple', 10, 76, 79],
      ['beautifly', 10, 76, 79, 'day'],
      ['dustox', 10, 76, 79, 'night'],
      ['bidoof', 10, 76, 79],
      ['budew', 10, 76, 79],
      ['hoothoot', 10, 76, 79, 'night'],
      ['murkrow', 10, 76, 79, 'night'],
      ['gastly', 15, 76, 79, 'night'],
      ['cherubi', 15, 76, 79, 'day'],
    ], {
      boss: boss('Gardenia', 'Líder do Ginásio de Eterna', 'gardenia', [['cherrim', 80], ['grotle', 80], ['roserade', 83]], 6200, {
        badge: { id: 'forest', name: 'Insígnia da Floresta', sprite: 26 },
        reward: { tm: 'energy-ball' },
      }),
    }),
    r('rota-209-hearthome', 'Rota 209 e Hearthome', 'A cidade dos concursos e a torre perdida do cemitério.', 70, 'meadow', [56, 58], [
      ['ponyta', 15, 78, 81],
      ['staravia', 15, 78, 81],
      ['bibarel', 15, 78, 81],
      ['mime-jr', 10, 78, 81],
      ['roselia', 15, 78, 81, 'day'],
      ['gastly', 15, 78, 81, 'night'],
      ['duskull', 15, 78, 81, 'night'],
      ['chansey', 3, 78, 81],
    ], {
      boss: boss('Fantina', 'Líder do Ginásio de Hearthome', 'fantina', [['dusclops', 82], ['haunter', 82], ['mismagius', 85]], 6400, {
        badge: { id: 'relic', name: 'Insígnia da Relíquia', sprite: 29 },
        reward: { tm: 'shadow-claw' },
      }),
    }),
    r('rota-215-veilstone', 'Rota 215 e Veilstone', 'Chuva constante até a cidade esculpida na rocha.', 75, 'route', [72, 46], [
      ['kadabra', 10, 80, 83],
      ['ponyta', 15, 80, 83],
      ['rapidash', 5, 81, 83],
      ['geodude', 15, 80, 83],
      ['lickitung', 10, 80, 83],
      ['scyther', 5, 80, 83],
      ['glameow', 15, 80, 83],
      ['meditite', 15, 80, 83],
      ['marill', 10, 80, 83],
    ], {
      boss: boss('Maylene', 'Líder do Ginásio de Veilstone', 'maylene', [['medicham', 84], ['machoke', 84], ['lucario', 87]], 6600, {
        badge: { id: 'cobble', name: 'Insígnia do Calçamento', sprite: 27 },
        reward: { tm: 'drain-punch' },
      }),
    }),
    r('grande-pantano', 'Grande Pântano e Pastoria', 'Um pântano enorme com o safári de Sinnoh.', 80, 'river', [68, 72], [
      ['croagunk', 15, 82, 85],
      ['skorupi', 15, 82, 85],
      ['carnivine', 10, 82, 85],
      ['wooper', 15, 82, 85],
      ['quagsire', 10, 82, 85],
      ['tangela', 10, 82, 85],
      ['yanma', 10, 82, 85],
      ['bibarel', 10, 82, 85],
    ], {
      boss: boss('Crasher Wake', 'Líder do Ginásio de Pastoria', 'crasherwake', [['gyarados', 86], ['quagsire', 86], ['floatzel', 89]], 6800, {
        badge: { id: 'fen', name: 'Insígnia do Brejo', sprite: 28 },
        reward: { tm: 'waterfall' },
      }),
    }),
    r('mina-ferro-canalave', 'Ilha de Ferro e Canalave', 'Uma ilha de mineração e a cidade do canal.', 85, 'cave', [10, 50], [
      ['geodude', 15, 84, 87],
      ['graveler', 15, 84, 87],
      ['onix', 15, 84, 87],
      ['steelix', 3, 84, 87],
      ['zubat', 15, 84, 87],
      ['golbat', 15, 84, 87],
      ['bronzor', 15, 84, 87],
      ['riolu', 2, 84, 86],
    ], {
      boss: boss('Byron', 'Líder do Ginásio de Canalave', 'byron', [['magneton', 88], ['steelix', 88], ['bastiodon', 91]], 7000, {
        badge: { id: 'mine', name: 'Insígnia da Mina', sprite: 30 },
        reward: { tm: 'flash-cannon' },
      }),
    }),
    r('rota-216-217', 'Rotas 216–217 e Snowpoint', 'Uma nevasca permanente no norte de Sinnoh.', 85, 'icecave', [44, 16], [
      ['snover', 25, 86, 89],
      ['sneasel', 15, 86, 89, 'night'],
      ['swinub', 15, 86, 89],
      ['machoke', 10, 86, 89],
      ['zubat', 10, 86, 89],
      ['noctowl', 10, 86, 89, 'night'],
      ['abomasnow', 5, 88, 89],
    ], {
      boss: boss('Candice', 'Líder do Ginásio de Snowpoint', 'candice', [['sneasel', 90], ['piloswine', 90], ['abomasnow', 90], ['froslass', 92]], 7200, {
        badge: { id: 'icicle', name: 'Insígnia do Pingente', sprite: 31 },
        reward: { tm: 'blizzard' },
      }),
    }),
    r('rota-222-sunyshore', 'Rota 222 e Sunyshore', 'A cidade solar à beira-mar, cheia de painéis.', 90, 'beach', [86, 64], [
      ['luxio', 15, 88, 91],
      ['electabuzz', 10, 88, 91],
      ['chatot', 15, 88, 91],
      ['floatzel', 10, 88, 91],
      ['mr-mime', 10, 88, 91],
      ['glameow', 10, 88, 91],
      ['purugly', 10, 88, 91],
      ['wingull', 15, 88, 91],
    ], {
      boss: boss('Volkner', 'Líder do Ginásio de Sunyshore', 'volkner', [['jolteon', 91], ['raichu', 91], ['luxray', 91], ['electivire', 93]], 7600, {
        badge: { id: 'beacon', name: 'Insígnia do Farol', sprite: 32 },
        reward: { tm: 'charge-beam' },
      }),
    }),
    r('sinnoh-estrada-vitoria', 'Estrada da Vitória (Sinnoh)', 'Uma caverna enorme na base do Monte Coronet.', 100, 'cave', [86, 30], [
      ['golbat', 15, 89, 92],
      ['onix', 10, 89, 92],
      ['steelix', 5, 90, 92],
      ['machoke', 15, 89, 92],
      ['rhydon', 10, 89, 92],
      ['medicham', 15, 89, 92],
      ['graveler', 15, 89, 92],
      ['gible', 2, 89, 91],
    ], {
      boss: boss('Barry', 'Seu rival', 'barry', [['staraptor', 91], ['heracross', 91], ['floatzel', 91], ['snorlax', 92], ['$rival:3', 94]], 8000, { rival: true }),
    }),
    trial('sinnoh-liga-aaron', 'Liga de Sinnoh — Aaron', 'sinnoh-estrada-vitoria', [94, 22], boss('Aaron', 'Elite dos Quatro', 'aaron', [['dustox', 91], ['beautifly', 91], ['vespiquen', 91], ['heracross', 92], ['drapion', 93]], 8200)),
    trial('sinnoh-liga-bertha', 'Liga de Sinnoh — Bertha', 'sinnoh-estrada-vitoria', [94, 16], boss('Bertha', 'Elite dos Quatro', 'bertha', [['whiscash', 91], ['gliscor', 92], ['golem', 92], ['rhyperior', 92], ['hippowdon', 93]], 8400)),
    trial('sinnoh-liga-flint', 'Liga de Sinnoh — Flint', 'sinnoh-estrada-vitoria', [94, 10], boss('Flint', 'Elite dos Quatro', 'flint', [['houndoom', 92], ['flareon', 92], ['rapidash', 92], ['infernape', 93], ['magmortar', 94]], 8600)),
    trial('sinnoh-liga-lucian', 'Liga de Sinnoh — Lucian', 'sinnoh-estrada-vitoria', [94, 4], boss('Lucian', 'Elite dos Quatro', 'lucian', [['mr-mime', 93], ['girafarig', 93], ['medicham', 93], ['alakazam', 94], ['bronzong', 94]], 8800)),
    trial('sinnoh-liga-campeao', 'Liga de Sinnoh — Campeã', 'sinnoh-estrada-vitoria', [80, 4], boss('Cynthia', 'Campeã da Liga de Sinnoh', 'cynthia', [['spiritomb', 94], ['roserade', 94], ['togekiss', 94], ['lucario', 94], ['milotic', 94], ['garchomp', 96]], 13000, { champion: true })),
  ],
};

// ---------------------------------------------------------------------------------
// UNOVA (Nv. 82 → 100)

const unova = {
  id: 'unova',
  name: 'Unova',
  trainerSuffix: [''],
  routes: [
    r('unova-rotas-1-3', 'Rotas 1–3 e Striaton', 'De Nuvema até o restaurante-ginásio dos trigêmeos.', 60, 'meadow', [72, 86], [
      ['patrat', 20, 82, 85],
      ['lillipup', 20, 82, 85],
      ['purrloin', 15, 82, 85, 'night'],
      ['pidove', 15, 82, 85, 'day'],
      ['sewaddle', 10, 82, 85],
      ['pansage', 5, 82, 85],
      ['pansear', 5, 82, 85],
      ['panpour', 5, 82, 85],
      ['audino', 3, 82, 85],
    ], {
      boss: boss('Cilan', 'Líder do Ginásio de Striaton', 'cilan', [['herdier', 86], ['simisage', 88]], 7600, {
        badge: { id: 'trio', name: 'Insígnia do Trio', sprite: 33 },
        reward: { tm: 'seed-bomb' },
      }),
    }),
    r('nacrene-resort', 'Resort do Deserto e Nacrene', 'Ruínas no deserto e a cidade do museu.', 65, 'desert', [62, 70], [
      ['sandile', 20, 84, 87],
      ['darumaka', 15, 84, 87],
      ['scraggy', 15, 84, 87],
      ['sigilyph', 10, 84, 87],
      ['dwebble', 15, 84, 87],
      ['minccino', 15, 84, 87],
      ['yamask', 10, 84, 87, 'night'],
    ], {
      boss: boss('Lenora', 'Líder do Ginásio de Nacrene', 'lenora', [['watchog', 88], ['stoutland', 90]], 7800, {
        badge: { id: 'basic', name: 'Insígnia Básica', sprite: 34 },
        reward: { tm: 'retaliate' },
      }),
    }),
    r('pinwheel-castelia', 'Floresta Pinwheel e Castelia', 'Uma floresta densa e a cidade dos arranha-céus.', 70, 'forest', [54, 80], [
      ['sewaddle', 15, 86, 89],
      ['swadloon', 10, 86, 89],
      ['venipede', 15, 86, 89],
      ['whirlipede', 5, 87, 89],
      ['cottonee', 15, 86, 89, 'day'],
      ['petilil', 15, 86, 89, 'day'],
      ['tympole', 10, 86, 89],
      ['timburr', 10, 86, 89],
      ['throh', 5, 86, 89],
      ['sawk', 5, 86, 89],
    ], {
      boss: boss('Burgh', 'Líder do Ginásio de Castelia', 'burgh', [['whirlipede', 90], ['crustle', 90], ['leavanny', 92]], 8000, {
        badge: { id: 'insect', name: 'Insígnia do Inseto', sprite: 35 },
        reward: { tm: 'struggle-bug' },
      }),
    }),
    r('rota-5-nimbasa', 'Rota 5 e Nimbasa', 'A cidade dos parques de diversão e das luzes.', 75, 'plains', [56, 54], [
      ['blitzle', 15, 88, 91],
      ['zebstrika', 5, 90, 91],
      ['minccino', 15, 88, 91],
      ['liepard', 10, 88, 91, 'night'],
      ['gothita', 15, 88, 91],
      ['solosis', 15, 88, 91],
      ['trubbish', 15, 88, 91],
    ], {
      boss: boss('Elesa', 'Líder do Ginásio de Nimbasa', 'elesa', [['emolga', 92], ['emolga', 92], ['zebstrika', 94]], 8200, {
        badge: { id: 'bolt', name: 'Insígnia do Raio', sprite: 36 },
        reward: { tm: 'volt-switch' },
      }),
    }),
    r('rota-6-driftveil', 'Rota 6 e Driftveil', 'O porto industrial e as estações que mudam a rota.', 80, 'route', [40, 50], [
      ['deerling', 15, 90, 93],
      ['karrablast', 10, 90, 93],
      ['shelmet', 10, 90, 93],
      ['foongus', 15, 90, 93],
      ['palpitoad', 10, 90, 93],
      ['swadloon', 10, 90, 93],
      ['roggenrola', 15, 90, 93],
      ['boldore', 5, 91, 93],
    ], {
      boss: boss('Clay', 'Líder do Ginásio de Driftveil', 'clay', [['krokorok', 94], ['palpitoad', 94], ['excadrill', 96]], 8400, {
        badge: { id: 'quake', name: 'Insígnia do Tremor', sprite: 37 },
        reward: { tm: 'bulldoze' },
      }),
    }),
    r('caverna-chargestone', 'Caverna Chargestone e Mistralton', 'Pedras flutuantes carregadas de eletricidade.', 85, 'cave', [32, 36], [
      ['joltik', 15, 92, 95],
      ['galvantula', 5, 93, 95],
      ['ferroseed', 15, 92, 95],
      ['ferrothorn', 5, 93, 95],
      ['klink', 15, 92, 95],
      ['klang', 5, 93, 95],
      ['tynamo', 15, 92, 95],
      ['boldore', 15, 92, 95],
      ['drilbur', 10, 92, 95],
    ], {
      boss: boss('Skyla', 'Líder do Ginásio de Mistralton', 'skyla', [['swoobat', 96], ['unfezant', 96], ['swanna', 98]], 8600, {
        badge: { id: 'jet', name: 'Insígnia do Jato', sprite: 38 },
        reward: { tm: 'acrobatics' },
      }),
    }),
    r('montanha-twist', 'Montanha Twist e Icirrus', 'Uma mina gelada no inverno e a cidade dos pântanos.', 85, 'icecave', [38, 16], [
      ['cubchoo', 15, 94, 97],
      ['beartic', 5, 96, 97],
      ['vanillite', 15, 94, 97],
      ['vanillish', 5, 95, 97],
      ['cryogonal', 10, 94, 97],
      ['gurdurr', 15, 94, 97],
      ['boldore', 15, 94, 97],
      ['woobat', 15, 94, 97, 'night'],
    ], {
      boss: boss('Brycen', 'Líder do Ginásio de Icirrus', 'brycen', [['vanillish', 98], ['cryogonal', 98], ['beartic', 99]], 8800, {
        badge: { id: 'freeze', name: 'Insígnia Congelada', sprite: 39 },
        reward: { tm: 'frost-breath' },
      }),
    }),
    r('dragonspiral', 'Torre Dragonspiral e Opelucid', 'A torre mais antiga de Unova, morada de um dragão lendário.', 90, 'mountain', [62, 18], [
      ['druddigon', 10, 96, 99],
      ['golett', 15, 96, 99],
      ['mienfoo', 15, 96, 99],
      ['axew', 10, 96, 99],
      ['fraxure', 5, 97, 99],
      ['tranquill', 15, 96, 99, 'day'],
      ['deino', 3, 96, 98],
      ['sawk', 10, 96, 99],
      ['throh', 10, 96, 99],
    ], {
      boss: boss('Drayden', 'Líder do Ginásio de Opelucid', 'drayden', [['fraxure', 99], ['druddigon', 99], ['haxorus', 100]], 9200, {
        badge: { id: 'legend', name: 'Insígnia da Lenda', sprite: 40 },
        reward: { tm: 'dragon-tail' },
        boost: 1.05,
      }),
    }),
    r('unova-estrada-vitoria', 'Estrada da Vitória (Unova)', 'A última subida antes da Liga Pokémon de Unova.', 100, 'cave', [80, 12], [
      ['boldore', 15, 97, 100],
      ['durant', 15, 97, 100],
      ['heatmor', 15, 97, 100],
      ['sawk', 10, 97, 100],
      ['throh', 10, 97, 100],
      ['golurk', 10, 98, 100],
      ['druddigon', 10, 97, 100],
      ['zweilous', 5, 98, 100],
      ['deino', 5, 97, 100],
    ], {
      boss: boss('Cheren', 'Seu rival', 'cheren', [['unfezant', 99], ['liepard', 99], ['gigalith', 99], ['$rival:3', 100]], 9600, { rival: true, boost: 1.08 }),
    }),
    trial('unova-liga-shauntal', 'Liga de Unova — Shauntal', 'unova-estrada-vitoria', [84, 6], boss('Shauntal', 'Elite dos Quatro', 'shauntal', [['cofagrigus', 99], ['jellicent', 99], ['golurk', 99], ['chandelure', 100]], 10000, { boost: 1.1 })),
    trial('unova-liga-marshal', 'Liga de Unova — Marshal', 'unova-estrada-vitoria', [90, 6], boss('Marshal', 'Elite dos Quatro', 'marshal', [['throh', 99], ['sawk', 99], ['mienshao', 99], ['conkeldurr', 100]], 10200, { boost: 1.12 })),
    trial('unova-liga-grimsley', 'Liga de Unova — Grimsley', 'unova-estrada-vitoria', [96, 6], boss('Grimsley', 'Elite dos Quatro', 'grimsley', [['scrafty', 99], ['liepard', 99], ['krookodile', 99], ['bisharp', 100]], 10400, { boost: 1.14 })),
    trial('unova-liga-caitlin', 'Liga de Unova — Caitlin', 'unova-estrada-vitoria', [96, 14], boss('Caitlin', 'Elite dos Quatro', 'caitlin', [['reuniclus', 99], ['musharna', 99], ['sigilyph', 99], ['gothitelle', 100]], 10600, { boost: 1.16 })),
    trial('unova-liga-campeao', 'Liga de Unova — Campeão', 'unova-estrada-vitoria', [96, 22], boss('Alder', 'Campeão da Liga de Unova', 'alder', [['accelgor', 100], ['bouffalant', 100], ['druddigon', 100], ['vanilluxe', 100], ['escavalier', 100], ['volcarona', 100]], 16000, { champion: true, boost: 1.2 })),
  ],
};

export const REGIONS = [kanto, johto, hoenn, sinnoh, unova];

// ---------------------------------------------------------------------------------
// Pokémon errantes: aparecem por tempo limitado numa rota aleatória já liberada.

export const ROAMERS = [
  { species: 'eevee', requires: 'floresta-viridian', bonusLevel: 2 },
  { species: 'snorlax', requires: 'rota-12-15', bonusLevel: 4 },
  { species: 'lapras', requires: 'esconderijo-rocket', bonusLevel: 4 },
  { species: 'articuno', requires: 'liga-campeao', bonusLevel: 6 },
  { species: 'zapdos', requires: 'liga-campeao', bonusLevel: 6 },
  { species: 'moltres', requires: 'liga-campeao', bonusLevel: 6 },
  { species: 'raikou', requires: 'torre-queimada', bonusLevel: 6 },
  { species: 'entei', requires: 'torre-queimada', bonusLevel: 6 },
  { species: 'suicune', requires: 'torre-queimada', bonusLevel: 6 },
  { species: 'lugia', requires: 'johto-liga-campeao', bonusLevel: 8 },
  { species: 'ho-oh', requires: 'johto-liga-campeao', bonusLevel: 8 },
  { species: 'regirock', requires: 'deserto-rota-111', bonusLevel: 6 },
  { species: 'regice', requires: 'deserto-rota-111', bonusLevel: 6 },
  { species: 'registeel', requires: 'deserto-rota-111', bonusLevel: 6 },
  { species: 'latias', requires: 'hoenn-liga-campeao', bonusLevel: 8 },
  { species: 'latios', requires: 'hoenn-liga-campeao', bonusLevel: 8 },
  { species: 'uxie', requires: 'grande-pantano', bonusLevel: 6 },
  { species: 'mesprit', requires: 'grande-pantano', bonusLevel: 6 },
  { species: 'azelf', requires: 'grande-pantano', bonusLevel: 6 },
  { species: 'heatran', requires: 'sinnoh-liga-campeao', bonusLevel: 8 },
  { species: 'cobalion', requires: 'caverna-chargestone', bonusLevel: 6 },
  { species: 'terrakion', requires: 'caverna-chargestone', bonusLevel: 6 },
  { species: 'virizion', requires: 'caverna-chargestone', bonusLevel: 6 },
  { species: 'tornadus', requires: 'unova-liga-campeao', bonusLevel: 10 },
  { species: 'thundurus', requires: 'unova-liga-campeao', bonusLevel: 10 },
  { species: 'landorus', requires: 'unova-liga-campeao', bonusLevel: 10 },
  { species: 'mewtwo', requires: 'unova-liga-campeao', bonusLevel: 12 },
];

// ---------------------------------------------------------------------------------
// Fósseis: revividos no Laboratório.

export const FOSSILS = [
  { item: 'helix-fossil', species: 'omanyte', hours: 3 },
  { item: 'dome-fossil', species: 'kabuto', hours: 3 },
  { item: 'old-amber', species: 'aerodactyl', hours: 6 },
  { item: 'root-fossil', species: 'lileep', hours: 4 },
  { item: 'claw-fossil', species: 'anorith', hours: 4 },
  { item: 'skull-fossil', species: 'cranidos', hours: 4 },
  { item: 'armor-fossil', species: 'shieldon', hours: 4 },
  { item: 'cover-fossil', species: 'tirtouga', hours: 5 },
  { item: 'plume-fossil', species: 'archen', hours: 5 },
];

// ---------------------------------------------------------------------------------
// TMs: golpes que podem virar máquinas de ensino (recompensas e prêmios).

export const TM_POOL = [
  'thunderbolt', 'flamethrower', 'ice-beam', 'surf', 'psychic', 'earthquake', 'shadow-ball', 'energy-ball',
  'dark-pulse', 'x-scissor', 'iron-head', 'stone-edge', 'dragon-pulse', 'focus-blast', 'sludge-bomb',
  'brick-break', 'aerial-ace', 'rock-slide', 'bulldoze',
  'giga-drain', 'fire-blast', 'thunder', 'blizzard', 'rock-tomb', 'iron-tail', 'flash-cannon',
  'shadow-claw', 'drain-punch', 'waterfall', 'hyper-voice', 'charge-beam', 'seed-bomb', 'retaliate',
  'struggle-bug', 'volt-switch', 'acrobatics', 'frost-breath', 'dragon-tail', 'psyshock', 'facade',
  'poison-jab', 'u-turn', 'wild-charge', 'scald', 'flame-charge', 'heat-wave',
];

// ---------------------------------------------------------------------------------
// Expedições: Pokémon que não estão lutando saem por 1, 4 ou 8 horas.
// Recompensas: { w, item, qty } | { w, coins } | { w, species, level } | { w, tm: true } | { w, research }

export const EXPEDITIONS = [
  {
    id: 'patrulha',
    name: 'Patrulhar as rotas',
    description: 'Andar pelas rotas conhecidas ajudando outros treinadores.',
    requires: 'rota-2',
    types: ['normal', 'flying'],
    rewards: [
      { w: 30, coins: [80, 200] },
      { w: 25, item: 'poke-ball', qty: [2, 5] },
      { w: 15, item: 'oran-berry', qty: [1, 3] },
      { w: 10, item: 'pecha-berry', qty: [1, 2] },
      { w: 8, species: 'pidgey', level: [8, 14] },
      { w: 8, species: 'rattata', level: [8, 14] },
      { w: 4, item: 'great-ball', qty: [1, 2] },
    ],
  },
  {
    id: 'floresta',
    name: 'Explorar a floresta',
    description: 'Procurar berries e insetos raros entre as árvores.',
    requires: 'floresta-viridian',
    types: ['bug', 'grass'],
    rewards: [
      { w: 25, item: 'oran-berry', qty: [2, 4] },
      { w: 15, item: 'cheri-berry', qty: [1, 3] },
      { w: 12, item: 'leppa-berry', qty: [1, 2] },
      { w: 10, item: 'razz-berry', qty: [1, 2] },
      { w: 10, species: 'caterpie', level: [10, 16] },
      { w: 8, species: 'pinsir', level: [18, 24] },
      { w: 5, species: 'scyther', level: [18, 24] },
      { w: 5, item: 'leaf-stone', qty: [1, 1] },
      { w: 10, coins: [150, 300] },
    ],
  },
  {
    id: 'mt-moon',
    name: 'Escavar no Mt. Moon',
    description: 'Cavar nas galerias em busca de pedras e fósseis.',
    requires: 'mt-moon',
    types: ['rock', 'ground', 'steel'],
    rewards: [
      { w: 25, coins: [200, 500] },
      { w: 15, item: 'nugget', qty: [1, 1] },
      { w: 12, item: 'moon-stone', qty: [1, 1] },
      { w: 8, item: 'helix-fossil', qty: [1, 1] },
      { w: 8, item: 'dome-fossil', qty: [1, 1] },
      { w: 4, item: 'old-amber', qty: [1, 1] },
      { w: 10, species: 'clefairy', level: [14, 20] },
      { w: 10, species: 'geodude', level: [14, 20] },
      { w: 8, item: 'everstone', qty: [1, 1] },
    ],
  },
  {
    id: 'pesca',
    name: 'Pescar no lago',
    description: 'Passar o dia com uma vara de pescar.',
    requires: 'rota-4',
    types: ['water'],
    rewards: [
      { w: 20, species: 'magikarp', level: [15, 25] },
      { w: 15, species: 'poliwag', level: [15, 25] },
      { w: 12, species: 'goldeen', level: [15, 25] },
      { w: 8, species: 'horsea', level: [15, 25] },
      { w: 5, species: 'dratini', level: [15, 20] },
      { w: 12, item: 'water-stone', qty: [1, 1] },
      { w: 15, coins: [200, 400] },
      { w: 10, item: 'pecha-berry', qty: [2, 3] },
    ],
  },
  {
    id: 'usina',
    name: 'Investigar a usina abandonada',
    description: 'Geradores velhos atraem Pokémon elétricos.',
    requires: 'rota-5-6',
    types: ['electric', 'steel'],
    rewards: [
      { w: 15, species: 'magnemite', level: [24, 32] },
      { w: 15, species: 'voltorb', level: [24, 32] },
      { w: 8, species: 'electabuzz', level: [26, 32] },
      { w: 12, item: 'thunder-stone', qty: [1, 1] },
      { w: 10, tm: true },
      { w: 20, coins: [300, 700] },
      { w: 10, item: 'ultra-ball', qty: [1, 2] },
    ],
  },
  {
    id: 'vulcao',
    name: 'Subir o vulcão de Cinnabar',
    description: 'Calor intenso, pedras de fogo e um âmbar antigo.',
    requires: 'mansao-cinnabar',
    types: ['fire', 'ground'],
    rewards: [
      { w: 15, item: 'fire-stone', qty: [1, 1] },
      { w: 8, item: 'old-amber', qty: [1, 1] },
      { w: 12, species: 'magmar', level: [36, 44] },
      { w: 12, species: 'ponyta', level: [36, 44] },
      { w: 10, tm: true },
      { w: 25, coins: [500, 1000] },
      { w: 10, item: 'rare-candy', qty: [1, 1] },
    ],
  },
  {
    id: 'ruinas',
    name: 'Estudar ruínas antigas',
    description: 'Inscrições em ruínas por todas as regiões.',
    requires: 'torre-queimada',
    types: ['psychic', 'ghost', 'dark'],
    rewards: [
      { w: 20, research: [2, 5] },
      { w: 15, tm: true },
      { w: 10, item: 'rare-candy', qty: [1, 2] },
      { w: 8, species: 'unown', level: [50, 60] },
      { w: 10, item: 'dusk-stone', qty: [1, 1] },
      { w: 10, item: 'dawn-stone', qty: [1, 1] },
      { w: 10, item: 'shiny-stone', qty: [1, 1] },
      { w: 17, coins: [800, 1500] },
    ],
  },
  {
    id: 'deserto',
    name: 'Atravessar o deserto',
    description: 'Tempestades de areia escondem fósseis de Hoenn.',
    requires: 'deserto-rota-111',
    types: ['ground', 'rock'],
    rewards: [
      { w: 12, item: 'root-fossil', qty: [1, 1] },
      { w: 12, item: 'claw-fossil', qty: [1, 1] },
      { w: 12, species: 'trapinch', level: [60, 70] },
      { w: 10, species: 'cacnea', level: [60, 70] },
      { w: 10, tm: true },
      { w: 24, coins: [1000, 2000] },
      { w: 10, item: 'sun-stone', qty: [1, 1] },
      { w: 10, item: 'ultra-ball', qty: [2, 4] },
    ],
  },
  {
    id: 'subterraneo',
    name: 'Escavar o Subterrâneo',
    description: 'Os túneis sob Sinnoh guardam fósseis e esferas.',
    requires: 'sinnoh-rotas-201-203',
    types: ['rock', 'steel', 'ground'],
    rewards: [
      { w: 12, item: 'skull-fossil', qty: [1, 1] },
      { w: 12, item: 'armor-fossil', qty: [1, 1] },
      { w: 15, item: 'nugget', qty: [1, 2] },
      { w: 12, item: 'ice-stone', qty: [1, 1] },
      { w: 10, tm: true },
      { w: 24, coins: [1500, 2500] },
      { w: 15, item: 'rare-candy', qty: [1, 2] },
    ],
  },
  {
    id: 'resort',
    name: 'Explorar as ruínas do resort',
    description: 'O Resort do Deserto esconde fósseis de Unova.',
    requires: 'nacrene-resort',
    types: ['ground', 'rock', 'psychic'],
    rewards: [
      { w: 12, item: 'cover-fossil', qty: [1, 1] },
      { w: 12, item: 'plume-fossil', qty: [1, 1] },
      { w: 12, species: 'sigilyph', level: [80, 88] },
      { w: 10, species: 'yamask', level: [80, 88] },
      { w: 10, tm: true },
      { w: 24, coins: [2000, 3500] },
      { w: 20, item: 'rare-candy', qty: [1, 3] },
    ],
  },
];

// ---------------------------------------------------------------------------------
// Game Corner: prêmios trocados por fichas.

export const GAME_CORNER_PRIZES = [
  { kind: 'pokemon', species: 'abra', level: 20, tokens: 180 },
  { kind: 'pokemon', species: 'clefairy', level: 22, tokens: 500 },
  { kind: 'pokemon', species: 'dratini', level: 25, tokens: 2800 },
  { kind: 'pokemon', species: 'scyther', level: 25, tokens: 5500 },
  { kind: 'pokemon', species: 'porygon', level: 26, tokens: 9999 },
  { kind: 'tm', move: 'thunderbolt', tokens: 4000 },
  { kind: 'tm', move: 'ice-beam', tokens: 4000 },
  { kind: 'tm', move: 'flamethrower', tokens: 4000 },
  { kind: 'item', item: 'rare-candy', qty: 1, tokens: 800 },
  { kind: 'item', item: 'ultra-ball', qty: 5, tokens: 600 },
  { kind: 'item', item: 'master-ball', qty: 1, tokens: 25000 },
];

// Itens usados em todo o jogo (além dos derivados das evoluções e recompensas).
export const EXTRA_ITEMS = [
  'poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'rare-candy', 'soothe-bell', 'nugget', 'everstone',
  'oran-berry', 'pecha-berry', 'cheri-berry', 'leppa-berry', 'razz-berry', 'persim-berry', 'sitrus-berry', 'lum-berry',
];

// Espécies que só aparecem por ovos/prêmios e precisam estar nos dados.
export const EXTRA_SPECIES = [
  'ditto',
  'unown',
  'larvitar',
  'mew',
  'celebi',
  'kyogre',
  'groudon',
  'rayquaza',
  'jirachi',
  'deoxys',
  'dialga',
  'palkia',
  'giratina',
  'cresselia',
  'manaphy',
  'darkrai',
  'shaymin',
  'arceus',
  'victini',
  'reshiram',
  'zekrom',
  'kyurem',
  'keldeo',
  'meloetta',
  'genesect',
];
