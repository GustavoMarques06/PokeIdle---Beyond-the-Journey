# Pendências

Anotações para retomar mais tarde. Atualize ao resolver.

## Atividades vivas (10/11)

Todas as atividades ganharam cena, animação e mecânicas novas. Cada uma tem seu CSS em `src/ui/styles/` e a lógica
nova em `src/core/`:
- **Grade de Atividades:** estado ao vivo em cada ícone (`activities/status.ts`).
- **Jardim:** plantas em 4 estágios (SVG em pixel art), regar (até 3; a chuva rega sozinha), insetos, ajudante de planta
  (+10% de velocidade), mutações e caderno (`core/garden.ts`, `garden.css`).
- **Fósseis:** máquina com tubo e cerimônia, Escavação (`core/dig.ts`: parede 12×8, picareta/martelo, 3 grátis por dia,
  depois ₽8.000) e Museu (`state.fossilsRevived`). As classes da máquina usam o prefixo `fl-` (`lab-` já existe na
  abertura do jogo).
- **Game Corner:** gabinete com alavanca, aposta ×1/×2/×5 (`SLOT_MULTS`), Voltorb Flip (`core/voltorb.ts`, níveis 1–8 como
  em HGSS, entrada de 10 fichas, teto de 5.000 por rodada), fichas no chão por dia e prêmio da semana −30%.
- **Torneio:** chave em árvore, narrador, patrocinador da semana (`SPONSORS` em `core/tournament.ts`, dá um item extra ao
  campeão) e sala de troféus. O outro jogo de cada lado da chave é só visual.
- **Troca Surpresa:** `surpriseTrade` em `core/link.ts` (5 por dia, um terço das vezes uma espécie que falta, shiny 8×).
- **Caça Shiny:** Poké Radar (`core/hunt.ts`: carrega com 25 encontros do alvo; moita forte +5 na sequência, brilhante
  garante o próximo shiny), contador, curva da chance e diário.
- **Raides:** estrelas pela soma dos atributos (`raidStars`), +25% de moedas por estrela e livro de raides (`state.raidLog`).
  Em 10/11: HP (3× a 6×), tempo (150 a 220 s), sorteios de item (2 a 4) e IVs perfeitos (3 a 6) pelas estrelas
  (`hpByStars` etc. em `balance.ts`), melhor tempo por chefe (`state.raidBest`) e animações: toca com runas, brasas,
  raios, cor por estrela, entrada e rugido do chefe; na batalha chefe gigante, aura, vinheta, fúria com tremor, tique
  nos últimos 10 s e cartão de vitória (`RaidVictory.tsx`). Compila; não conferido no navegador.
- **Treino:** estações animadas por atributo, hexágono de EVs e planos (`TRAINING_PLANS`, troca de atributo sozinho).
- **Expedições:** trilha, diário de viagem (só texto, sorteado pela semente) e cartão-postal.
- **Torre e Lendários:** prédio com os andares; previsão de 12 h com os lendários de cada faixa (clima de `weatherAt`).
  Em 10/11, aba de Lendários: boato fixo no dia (`legends.rumorId`) e fora de quem está em espera longa, previsão
  certa na virada dia/noite e sem os em espera (`legendaryWindowOpen`), "aparece em ~X" nos cartões
  (`legendaryNextWindow`), anel da espera, boato em manchete, Santuário como templo com barra do próximo título
  (`nextLegendTitle`), história com números e bola favorita, céu animado na previsão, progresso e portão por região,
  regras recolhidas e filtro dos cartões. Compila; não conferido no navegador.

**Mecânicas novas (10/11):** tudo compila (`tsc`) e os testes de `src/core` passam, mas nada foi visto no navegador
nem medido com jogo de verdade.
- **Raides:** escudo (`BALANCE.raid.shield`: os tipos super efetivos de `raidBreakers` quebram em 2 acertos e batem
  cheio; os outros batem 40% e levam 6), atordoamento ao quebrar, golpe gigante carregado a cada fúria (`charging`,
  2,5×, cancelado se o escudo cair) e regra da semana (`RAID_MODS`: Tempestade, Frenesi, Tesouro, Relâmpago; fica
  guardada em `raid.mod`).
- **Safari:** camadas da zona (`SAFARI_DEPTHS`: borda, mata, coração; entrar custa 60 e 100 passos e as caminhadas
  ficam mais caras, com mais raros, shiny e pontos) e rastros (`safariFollow`: 35% de chance depois de cada encontro,
  30 passos, de preferência uma espécie que falta na Pokédex da zona).
- **Unown (`core/unown.ts`):** tabuleta na Escavação (30% das paredes, vira um Unown de letra que falta) e palavra da
  semana nas Ruínas de Alph (aba Fósseis; 30 mil moedas e um Unown que falta, uma vez por semana).
- **Clima (`core/env.ts`):** frentes que cruzam cada região (bloco de 3 h, uma rota a cada 20 min, shiny 1,5× na rota;
  aparecem no mapa) e eventos do céu: aurora nos campos de neve e arco-íris depois da chuva (shiny 2×) e chuva de
  meteoros (10% dos selvagens com Star Piece).
- **Nível das raides:** o chefe vem no nível da rota mais avançada liberada + 3 (`raidLevel`), mesmo numa rota do
  começo. Antes valia o da própria rota e, no fim do jogo, saía chefe nível 10 na Rota 1.
- **Medido em 10/11** (simulação de 12 lutas por caso, time de 3; script fora do projeto):
  - 3★: qualquer time de nível parecido vence 92–100%; quem quebra o escudo vence mais rápido (~20 s contra ~26 s).
  - 5★: só vence quem tem vantagem de tipo (100%); time neutro perde 12/12 mesmo 2 níveis acima, **e já perdia sem o
    escudo**: é o dano do chefe 5★ (HP 6×), não as mecânicas novas. O escudo até ajuda quem tem os tipos certos (de
    2/12 para 10/12, pelo atordoamento). Se 5★ parecer cruel demais, baixar `hpByStars[4]` ou o dano do chefe.
  - Escudo ajustado para 5 pontos e 60% de dano fora dos tipos que quebram.
  - Safari (60 visitas, só bola): borda 61 pontos, mata 76, coração 84; no coração a visita acaba pelos passos em
    1 de 4 vezes (antes, 3 de 60). Entrada do coração em 120 passos e caminhadas 1,6×; a 150 e 1,75× o coração rendia
    menos que a borda.
- **Shiny:** frente (1,5×) e céu (2×) somam até 3× nas rotas; o coração do Safari dá 2,5× à parte. Somam com a Caça
  Shiny. Não medido em jogo.

**Voltorb Flip e Escavação (medido em 11/11, jogadores simulados que usam as pistas e miram no que aparece):**
- Voltorb Flip: com a entrada de 10 fichas em todo nível, o jogador ficava entre −4 e +1 ficha por rodada e não subia
  de nível (um tabuleiro inteiro do nível 1 paga 18 a 54). Agora `voltorbEntry`: grátis nos níveis 1–2, 10 do 3 ao 5,
  20 do 6 ao 8. Resultado: +6 a +10 fichas por rodada no começo (1 ficha = 50 moedas).
- Escavação: sem mudança. Mirando no tesouro que começa a aparecer, 2 tesouros por parede (de 3,2), fóssil em 60% das
  paredes, ~5.600 moedas em venda; a parede paga (8.000) só compensa pelo fóssil e pelas pedras. O martelo rende menos
  (1,3 tesouro) porque abala mais a parede.

**Mais vida em cada aba (11/11):** CSS novo em `styles/vida.css` (uma seção por aba); regras novas em
`core/lab.ts` (pedido do Blaine), `expeditions.ts` (bifurcação, histórias, `state.postcards`), `garden.ts` (estação,
Combee, guardião), `dig.ts` (lanterna), `training.ts` (desafio do dia, medalhas), `raids.ts`/`battle.ts` (aliados dos
amigos), `hunt.ts`/`bonuses.ts` (Amuleto Brilhante), `legendary.ts` (`sightings`, `captures`), `battle.ts`
(`TOWER_BRAINS`), `tournament.ts` (rivais), `safari.ts` (álbum, clima), `gamecorner.ts`/`voltorb.ts` (Maior ou
Menor, mural), `link.ts` (histórico, replay, `state.duelSeason`). Testes em `core/vida.test.ts`; prints conferidas.
- **Não deu para ver em print:** a entrada do Cérebro da Torre (o jogo reinicia a batalha ao carregar o save; a regra
  está no teste) e a animação de chegada da troca por código.
- **Falta medir:** Maior ou Menor (pote ×1,7 por acerto, até 8) e os aliados da raide (2,5% do HP do chefe a cada 7 s
  por amigo, metade com escudo).

**Arte nova (11/11):** 28 sprites de classe de treinador do Pokémon Showdown em `public/sprites/trainers/class-*.png`
(estilo da 3ª geração; nadador, ciclista, operário e veterana da 4ª), também listados em `UI_TRAINERS` de
`scripts/fetch-pokeapi.mjs` para o `data:fetch` mantê-los. Usados no Laboratório, na Creche, no Treino, no Game Corner
e nos andares comuns da Torre (`TOWER_CLASSES` em `battle.ts`; os nomes batem com o gênero do sprite). Os efeitos do
pixelfx que sobravam entraram: pétalas, folhas, neve e vaga-lumes no Jardim, chuva no Safari, aurora e estrelas
cadentes no céu da batalha. Cartas CC0 para o Maior ou Menor (jfredd, SpicyGame) só se baixam pela página do itch.io;
a carta em CSS ficou. Não achei plateia de estádio livre.

**Ainda dá para fazer:** a árvore genealógica dentro da cerimônia do ovo (hoje ela fica só na ficha do Pokémon).

## Safari (9/11 e 10/11)

Feito em 9/11: cena viva, humores, passos e caminhos, 5 zonas, surto da semana, berries/Lama/Pokébloco, câmera,
pedidos do Guarda, Pontos e loja, Pokédex das zonas, recordes e resumo da visita (`core/safari.ts`,
`SafariPanel.tsx`, `styles/safari.css`, zonas em `game-data/safari.ts`).

**Feito em 10/11 (toda a lista anterior):**
- Fuga com shiny e forma certos; a berry jogada aparece no arremesso (o evento `safariResult` traz `shiny`, `form` e
  `item`).
- Pedra e Lama em pixel art (`PixelArt` no `SafariPanel.tsx`), cadeado sobre as zonas fechadas, lago com água
  animada, vara e boia.
- Sons: obturador da câmera, mordidas (comendo), rosnado (irritado) e "plop" (Lama) em `audio.ts`.
- Pedidos sem spoiler (espécie não vista vira "Pokémon misteriosos"), dica semanal do Guarda com a berry favorita
  (`guardTip`; o ♥ aparece também para essa espécie) e cartões dos caminhos no saguão.
- Guia do Safari (`SAFARI_GUIDE`: 3.000 moedas, 4 h, 1 a 3 capturas, metade dos pontos), aviso nos Próximos Passos e
  no menu.
- Loja: Ovo raro (500 pts, precisa de vaga no ninho) e Mega Stone surpresa (2.500 pts, só as que faltam).
- Recorde de maior Pokémon: o tamanho sai dos IVs (0,8× a 1,2× da altura da espécie) e aparece no encontro.
- Zonas novas: Bosque Pinwheel (Unova, libera em `unova-rotas-1-3`) e Colinas de Flores (Kalos, `kalos-rotas-1-4`).
- Conferido no navegador: saguão (PC e 390 px), Guia, pedidos, recordes, lago, Lama e pedra.

**Equilíbrio medido (200 visitas simuladas por caso, só jogando bola):**
- As bolas sempre acabam antes dos passos: a visita usa ~130–220 dos 600 passos na grama baixa e ~275 na alta. Os
  passos (e as Botas de Caminhada) quase não pesam hoje.
- Capturas por visita: grama baixa 9–13, lago 7–12, grama alta 3–6 (Kanto 3, Pântano 6). Pontos por visita: 60–100
  em quase tudo; a grama alta vale pelos raros, não pelos pontos.
- As Colinas de Flores davam 214 pontos na grama alta (Kalos tem raros fáceis de pegar); os pesos foram ajustados e
  agora dão ~98, como a Montanha.

**Ainda vale decidir:**
- Se os passos devem limitar a visita: com ~350 passos a grama alta passaria a gastar os passos antes das bolas.
- Não conferido em print: Pokébloco em uso, resumo do fim da visita e o aviso de Pokédex de zona completa.

## Cenários de batalha (resolvido em 5/11)

As 19 imagens corrigidas (`art/maps/correcao/`) entraram com os ovais trocados por manchas de luz suaves; as caixas
cinza de interface do `summit` e do `league-hall` foram retiradas. Nos que ainda tinham vidro duro (`league-psychic`,
`tower`, `ruins`, `lab`, `jungle`) o oval foi suavizado por script. `league-fight`, `league-ice`, `league-ghost` e
`powerplant` não vieram na correção: ficam as versões antigas, só com o contorno do oval apagado.

**Ainda vale:** as folhas da correção têm resolução baixa (1024 ou 1376 px para 4 cenários) e algumas são quadradas,
então foram cortadas e esticadas para 3:2. Gerar cada cenário individual em 1506×1000 melhoraria a nitidez.
As manchas de luz não ficam exatamente nas posições dos Pokémon (inimigo à direita, o seu à esquerda).
Backup das versões com ovais: `art/maps/_backup-com-ovais/`. `USE_OVAL_SPOTS` em `scene.ts` segue desligado.

## Cenários novos (lotes de `PROMPTS-cenarios.md`, 9/11)

Os lotes vieram em `art/maps/novos/` com os nomes deslocados: `lotefalntado.jpg` é o lote 4 e `lote4`…`lote9` são os
lotes 5…10. Cortados em `art/maps/novos/cortes/` e comparados com os atuais numa batalha simulada.

- **Entraram (21):** meadow, route, plains, forest, jungle, swamp, river, mountain, beach, sea, seafloor, dampcave,
  cave, icecave, volcano, desert, snowfield, summit, ruins, tower, lab. Os Pokémon caem certinho na área livre.
- **Ficaram os atuais (16):** as 12 salas da Liga, rocket-base, powerplant, city e street. Os novos vieram com
  retângulos chapados no chão (até em cima da água no league-water), caixas de interface nos cantos (lotes 8 e 9) e
  menos detalhe; no powerplant o inimigo fica em cima das máquinas.
- Backup dos fundos de antes desta troca: `art/maps/_backup-v3-atual/`.
- **Resolução:** cada folha veio com 1264×848 (632×424 por cenário), abaixo dos 753×500 do jogo; foram ampliadas com
  Lanczos e reduzidas a 96 cores. Gerar de novo em 2048×1365 deixaria mais nítido.

## Outros

- **Ícone e logo em baixa resolução:** prompts prontos em `art/maps/PROMPTS-cenarios-v2.md` (logo 2000 × 800 e
  ícone 1024 × 1024). Depois de gerar, trocar em `public/icons/`, `public/brand/logo.png` e `src-tauri/icons/`.
- **16 cenários da 2ª rodada:** prompts em `art/maps/PROMPTS-cenarios-v2.md` (lotes A–D, salvar em `art/maps/novos2/`).
- **Build do Windows (Tauri):** os ícones novos entraram, mas o build ainda não foi rodado para conferir.
- **Combate:** golpes de apoio (status, atributos e cura) entraram como um 5º golpe, uma vez por luta (`supportMoves.ts`). Não são 4 golpes escolhíveis como nos jogos. O progresso offline conta com eles (`duelWithSupport`).
- **Progresso offline corrigido (9/11):** a estimativa contava a espera de entrada (1,6 s) em toda luta e o 1º golpe com o
  intervalo inteiro, e dava ~35% menos vitórias que a batalha real. Agora fica a menos de 15% (teste em `offline.test.ts`),
  então o offline rende de fato os 70% da eficiência pensada (antes rendia ~45%). Em 7.200 lutas simuladas, as vitórias mudaram até 1,4 ponto e cada luta durou ~1 s a mais.
- **Modo Desempenho:** sprites parados (primeiro quadro do GIF num canvas), sem efeitos, animações e números de dano, batalha redesenhada ~3x por segundo. Com CPU simulada 8x mais lenta: de 16 para 49 FPS. Falta testar em um PC fraco de verdade (a simulação não inclui a placa de vídeo).
- **Formas fora de batalha (9/11):** Unown da expedição das ruínas, ovos e prêmios do Game Corner vinham sem forma, e a
  conquista das 28 formas de Unown era impossível. Agora ganham forma (`giveForm`), e saves antigos são corrigidos ao
  carregar. Ainda pesa: na média são 44 expedições de 8 h (só uma de ruínas por vez), umas 3 semanas.
- **Pokédex completa:** as 721 espécies das Gerações I–VI estão no jogo e todas têm caminho (teste em
  `obtainable.test.ts`). Algumas evoluções especiais viraram regras simples do motor: Shedinja e Mothim pela Shiny Stone,
  Ambipom, Sudowoodo e Mantine no nível 30, Wormadam e Mothim sem exigir gênero.
- **CSS:** declarações sempre sobrescritas pela mesma regra saíram e blocos repetidos foram juntados onde isso não muda
  nada (conferido elemento por elemento em 8 tamanhos e 7 telas). O `mobile.css` ainda tem muitos blocos por ordem de
  chegada: reorganizar o resto exige reescrever à mão.
- **Cópia do save:** no celular, o menu de compartilhar do sistema; no Chrome/Edge do computador, cópia automática num
  arquivo escolhido (File System Access).
- **Save na nuvem:** não vai ser feito. O jogo não terá servidor de nenhum tipo (decisão confirmada em 10/11). O save fica só no aparelho; há lembrete semanal de backup e aviso para instalar no iPhone.
- **Molduras do cartão de treinador:** dependem de arte nova.
- **Shinies e 6ª geração:** conferido em 5/11: os 668 Pokémon de então tinham sprite shiny (frente e costas). Nada a fazer.

## Mega Evolução (pronta)

**Pronto:** as 47 Mega Evoluções da 6ª geração (todas as de pedra; a Mega Rayquaza, que não usa pedra, ficou de
fora). Dados da PokéAPI em `src/game-data/generated/megas.json`, gerados por `node scripts/fetch-megas.mjs`, que também
baixa sprites (frente, costas, shiny, ícone) e as pedras. Cada Mega Stone custa 120.000 na Loja de Departamentos.
- Em batalha o Pokémon que segura a pedra da espécie assume tipos, atributos, **habilidade** e sprite da Mega até o
  fim do encontro. No **automático** acontece sozinho (também com o jogo fechado); no **manual** aparece o botão
  dourado MEGA (tecla M), que não gasta a vez.
- Efeito de transformação (clarão e anel de energia), som próprio, rótulo "MEGA" na caixa de status e ícone na equipe.
- **Chefes já entram Mega:** Steven (Metagross), Cynthia (Garchomp), Lysandre (Gyarados), Diantha (Gardevoir) e
  Lance campeão de Johto (Charizard X). Em `world.mjs`, um terceiro item no time (`['metagross', 91, 'mega']`).
- Habilidades específicas das Megas (Garras Duras, Pixilar, Elo Parental...) são **aproximações** com o que o motor
  suporta (bônus de atributo ou de tipo); estão em `abilities.ts`.

**Feito depois:**
- Pixilar, Aerilar e Refrigerar agora convertem golpes Normais (STAB e +20%); Elo Parental soma um segundo golpe de 25%.
- **Regressões Primais:** Kyogre (Blue Orb) e Groudon (Red Orb), mesma mecânica da Mega, com as habilidades Mar
  Primordial e Terra Desolada (aproximadas: +30% do tipo e imunidade ao tipo oposto). Total: 49 formas.

**Feito em 9/11:**
- Mega Rayquaza já existia (Meteorito). O Rayquaza agora aprende Dragon Ascent no Nv. 70 (`TUTOR_LEVEL_MOVES` em
  `fetch-pokeapi.mjs`; a queda de defesa de quem usa não entra, como no Close Combat).
- Preço por força da Mega (`megaStonePrice`): 80 mil (< 600), 120 mil (600–699), 200 mil (700), 300 mil (Primais,
  Mewtwo, Rayquaza). Sem bônus, o jogador junta ~15 mil moedas/h no fim de Kanto e ~43 mil em Kalos.
- Fiéis aos jogos: Mandíbula Forte (mordidas ×1,5), Força Bruta (golpes com status ×1,3, sem o status), Destemido
  (Normal e Lutador acertam Fantasma), Sem Guarda (ninguém erra). Mega Lançador, Elo de Habilidade e Garras Duras seguem
  aproximadas: o Blastoise não aprende golpes de pulso nos dados, os de vários acertos do Heracross são fracos e o jogo
  não sabe quais golpes são de contato.

**Falta (opcional):**
- Ensinar golpes de pulso ao Blastoise (ORAS) para o Mega Lançador poder ser fiel.
- Se rodar `npm run data:fetch --fresh`, rode `node scripts/fetch-megas.mjs` e `python scripts/sprite-feet.py` depois.
- Se rodar `npm run data:fetch`, os times de chefe com Mega já saem certos (o script lê o terceiro item).

## Modo Qualidade (3D): descartado em 5/11

Foi feito (sprites 3D do Showdown e do HOME, efeitos do pixelfx, interface de vidro) e **removido a pedido**: não ficou bom ao
lado da pixel art. O jogo voltou ao pixel art. Ficaram só o modo **Desempenho** (Opções > Gráficos) e o tamanho real dos
Pokémon. Quem tinha salvo em Qualidade volta para Normal (`save.ts`).

**Tamanho real dos Pokémon (desfeito em 9/11, a pedido: os pequenos ficavam pequenos demais; a batalha voltou ao tamanho normal):** a batalha usa a altura real de cada espécie (`heights.json`, `scripts/fetch-heights.mjs`)
com raiz quadrada e teto/piso, então Rattata e Magikarp aparecem pequenos e Onix e Wailord, grandes.

**Efeitos em pixel art (5/11):** 14 tipos de golpe (todos menos aço, veneno, inseto e dragão, que seguem com as partículas
de CSS) e 5 status em loop (sono, paralisia, queimadura, congelamento, veneno) usam folhas de PVFX Foundry e Foozle (CC0).
`scripts/build-fx.py` monta tudo de `art/fx-packs`; ajuste `k` (tamanho) e `at` (ancoragem) em `IMPACTS`/`STATUS` se algum
ficar torto. Aço, veneno, inseto e dragão (9/11) usam efeitos parecidos do PVFX recoloridos na cor do tipo (`tint` em `IMPACTS`).

**Climas novos (5/11):** chuva, neve (para o granizo) e tempestade (chuva à noite) são WebP animados do pixelfx
(`scripts/build-weather.py`); areia, névoa e sol são desenhados em CSS (`WeatherLayer` em `effects.tsx`). Os antigos saíram.
Sobram do pixelfx, ainda não usados: folhas de outono, pétalas, vaga-lumes, aurora, estrelas cadentes, nevasca e raios de sol
(alguns escurecem a cena inteira). O clima segue o relógio do jogo; ligar neve às rotas frias seria uma melhoria separada.
