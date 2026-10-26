# PokéIdle — Beyond the Journey

RPG idle de coleção em pixel art 2D, implementado a partir de [PokeIdle_Escopo.md](PokeIdle_Escopo.md).
Stack: **React + TypeScript + Vite**, empacotado para Windows com **Tauri 2**; sem backend, o save fica no
armazenamento local.

## Como rodar

```bash
npm install
npm run dev          # navegador, em http://localhost:5173
npm test             # testes unitários (fórmulas, save, offline, bônus, prestígio, ritmo da campanha)
npm run lint
npm run build        # gera dist/ (caminhos relativos)

npm run tauri:dev    # app desktop com recarga automática (precisa de Rust + cargo-tauri)
npm run tauri:build  # gera o executável e o instalador NSIS em src-tauri/target/release/
```

## Dados, sprites e áudio (PokéAPI)

Todo o conteúdo de espécies vem da [PokéAPI](https://pokeapi.co):

```bash
npm run data:fetch            # usa o cache em scripts/.cache
npm run data:fetch -- --fresh # baixa tudo de novo
```

O script [scripts/fetch-pokeapi.mjs](scripts/fetch-pokeapi.mjs) gera:

| Saída                                                              | Conteúdo                                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `src/game-data/generated/species.json`                             | atributos-base, tipos, EXP-base, taxa de captura, curva de EXP, evoluções e golpes aprendidos por nível (FireRed/LeafGreen) |
| `src/game-data/generated/moves.json`                               | golpes de dano (tipo, poder, precisão, categoria)                                                                           |
| `src/game-data/generated/type-chart.json`                          | tabela de efetividade de tipos                                                                                              |
| `src/game-data/generated/items.json`                               | Poké Balls e pedras de evolução                                                                                             |
| `public/sprites/pokemon/{front,back,front-shiny,back-shiny,icon}/` | sprites animados de Black/White, variantes shiny e ícones                                                                   |
| `public/sprites/items/`                                            | sprites de itens                                                                                                            |
| `public/audio/cries/`                                              | gritos dos Pokémon (versão "legacy", 8 bits)                                                                                |

O tamanho natural de cada sprite é gravado nos dados para que todos apareçam na mesma escala. Tudo é baixado
uma vez e servido localmente, então o jogo funciona offline. Para adicionar espécies, inclua o número em
`KANTO_IDS` ou `STARTER_BASES` no script e rode `data:fetch`.

Efeitos sonoros e a música de fundo são sintetizados em tempo real (Web Audio, estilo chiptune) em
[src/ui/audio.ts](src/ui/audio.ts) — não há arquivos de áudio de terceiros além dos gritos.

> Projeto privado: nomes, sprites e gritos de Pokémon pertencem à Nintendo/Game Freak/The Pokémon Company.

## Direção visual

Inspirada em FireRed/LeafGreen, Emerald e HeartGold/SoulSilver, adaptada para janela de PC (1280×720 a 1920×1080):

- **Campo de batalha** — cenário desenhado em pixel art numa tela virtual de 256×144 ampliada sem suavização
  ([src/ui/battle/scene.ts](src/ui/battle/scene.ts)): céu com dithering, nuvens, montanhas, árvores, trilha, grama alta
  e plataformas ovais. Cada área tem tema próprio (campo, floresta, trilha rochosa, caverna, rio). Sprites em escala
  real (tamanho natural × fator fixo), sombras, animação de espera, avanço no ataque, piscar ao levar dano, faíscas
  com a cor do tipo do golpe, números de dano, tremor em golpes super efetivos/críticos.
- **Caixas de status, diálogo e comandos** no estilo GBA, com texto clássico ("Pidgey selvagem usou Tackle!",
  "É super efetivo!") e menu de comandos POKé BALL / GREAT BALL / POKéMON / DESAFIAR-FUGIR com cursor ▶.
- **Molduras pixeladas** geradas como SVG 9-slice ([src/ui/theme/frames.ts](src/ui/theme/frames.ts)) e ícones originais
  em pixel art ([src/ui/theme/icons.ts](src/ui/theme/icons.ts)); nenhum emoji na interface.
- **Telas**: equipe estilo FRLG (slot do ativo, apoio, Caixa e ficha de resumo), Pokédex vermelha com filtros por
  região/tipo/estado, Mochila com Poké Mart, Mapa em papel, Cartão de Treinador com insígnias, conquistas e opções,
  Laboratório/Prestígio. Animação de captura (arremesso, absorção, balanço, estrelas) e cena de evolução.
- **Abertura (escolha do inicial)** — laboratório do Professor pintado em pixel art 256×160
  ([src/ui/intro/lab.ts](src/ui/intro/lab.ts)): piso em perspectiva, estantes, janelas, mesa em 3/4 com as Poké Balls
  e tapete oval, com uma única fonte de luz (janelas) e sombras coerentes. O inicial escolhido aparece em pé no tapete,
  em escala inteira (pixels nítidos); ao lado ficam o menu de regiões e uma janela de status (tipos, atributos-base,
  linha evolutiva, forte/fraco contra). Tudo é clicável; ←/→ trocam de inicial e ↑/↓ de região.
- **Tokens** de cor, tipografia e espaçamento no topo de [src/ui/styles.css](src/ui/styles.css). Fontes: Silkscreen
  (rótulos) e Pixelify Sans (textos), empacotadas localmente.

### Origem dos assets

| Asset                                                                   | Fonte                                                                        |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Pokémon Gen I–V (frente/costas/shiny, animados)                         | PokéAPI — Black/White animado                                                |
| Ícones                                                                  | PokéAPI (Gen VII); a folha de ícones do Showdown fica como reserva no script |
| Treinadores (Red, Leaf, Prof. Carvalho, Brock, Misty, Recruta Rocket)   | Pokémon Showdown (`sprites/trainers/*-gen3`, estilo FireRed/LeafGreen)       |
| Insígnias de Kanto                                                      | PokéAPI (`sprites/badges`)                                                   |
| Itens e gritos                                                          | PokéAPI                                                                      |
| Fundos de batalha ilustrados (padrão; desligável em Treinador → Opções) | Pokémon Showdown (`fx/bg-*.png`, pixel art)                                  |
| Cenários alternativos, molduras, ícones de interface, música e efeitos  | originais (gerados pelo jogo)                                                |

Tudo é baixado por `npm run data:fetch` e servido localmente.

### Ainda ausentes

Nenhum sprite pendente: todas as espécies do jogo têm sprites animados (frente, costas e shiny).

## Estrutura

```
src/
  game-data/   conteúdo orientado por dados
    routes.ts      regiões, rotas, chefes, errantes, fósseis, expedições, prêmios (de generated/world.json)
    balance.ts     números de balanceamento e loja
    meta.ts        bônus passivos, pesquisa, maestria, conquistas, prestígio
    activities.ts  berries, missões, marcos da Pokédex, Torre de Batalha, caça-níqueis
    generated/     JSON gerados da PokéAPI + scripts/world.mjs
  core/        regras puras e testáveis (sem React)
    rng.ts         PRNG determinístico com estado salvo
    stats.ts       atributos (fórmula da 3ª geração) e curvas de EXP
    combat.ts      dano, tipos, escolha de golpe, velocidade, estimativa de duelo
    progression.ts EXP com escala por nível, subida de nível, evolução
    capture.ts     chance de captura
    bonuses.ts     todos os modificadores (equipe passiva, pesquisa, maestria, prestígio)
    game.ts        estado do jogo, batalhas (selvagem, chefe, Rocket, Torre), rival, Hall da Fama, ações
    meta.ts        equipe passiva, laboratório, prestígio, conquistas, nível de treinador
    collection.ts  coleção, Pokédex, TMs e desbloqueio das atividades
    env.ts         dia/noite e clima (relógio real, determinístico por bloco de 2 h)
    moveset.ts     escolha de golpes (nível + TMs)
    daycare.ts     creche e ovos          expeditions.ts  expedições de 1/4/8 h
    garden.ts      jardim de berries      fossils.ts      laboratório de fósseis
    hunt.ts        caça ao shiny          events.ts       errantes e Equipe Rocket
    tower.ts       Torre de Batalha       gamecorner.ts   fichas, caça-níqueis e prêmios
    missions.ts    missões diárias/semanais  dex.ts       marcos e medalhas de tipo
    timers.ts      cronômetros de tempo real (chamado pelo motor a cada segundo)
    offline.ts     progresso offline (função pura, separada do loop visual)
    save.ts        save versionado, migrações, backup, exportar/importar
  engine/      GameEngine: loop de passo fixo (100 ms), autosave, conquistas, detecção de pausas longas
  ui/
    battle/        cenário (canvas), campo de batalha, caixa de diálogo/comandos, evolução
    components/    HUD, ficha do ativo, menu do jogo, abertura, componentes visuais comuns
    screens/       Pokémon, Pokédex, Mochila, Mapa (mapa visual por região), Atividades, Missões, Treinador, Melhorias
    theme/         molduras 9-slice e ícones em pixel art
    i18n/          textos em pt-BR e mensagens de batalha
src-tauri/     casca desktop (Tauri 2)
```

## O que está implementado

| Fase do escopo         | Estado                                                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Fundação           | ✅ TypeScript estrito, ESLint, Prettier, Vitest, módulos e modelo de save                                                                                                                                                              |
| 1 — Protótipo jogável  | ✅ escolha de inicial, combate automático, EXP/níveis/moedas, save/load                                                                                                                                                                |
| 2 — Loop idle          | ✅ 7 áreas com desbloqueio, progresso offline (limite configurável, proteção contra relógio voltando), relatório de retorno                                                                                                            |
| 3 — Coleção e evolução | ✅ captura com Poké/Great Ball, Pokédex, evolução por nível (automática ou manual) e por pedra, transferência de duplicatas para pesquisa                                                                                              |
| 4 — Equipe estratégica | ✅ 4 vagas passivas liberadas pela campanha; bônus por tipo (dano, defesa, velocidade, EXP, moedas, captura, cura) + dano contra tipos que o passivo vence; empilhamento decrescente, teto por bônus, espécie repetida não conta       |
| 5 — Campanha           | ✅ 5 regiões (Kanto, Johto, Hoenn, Sinnoh, Unova), 80 áreas, 40 ginásios, Elite Four e Campeão de cada região, rival que fica mais forte a cada jornada, Hall da Fama                                                                  |
| 6 — Endgame            | ✅ prestígio, maestria, conquistas, shinies, captura automática, áudio · creche e ovos, expedições, jardim de berries, fósseis, caça ao shiny, missões, marcos da Pokédex, errantes, Equipe Rocket, Torre de Batalha, Game Corner, TMs |

### Como os sistemas se conectam

- **Equipe passiva** — Pokémon em vagas passivas não lutam, mas dão bônus pelo tipo primário (ex.: Fogo → dano,
  Pedra → redução de dano, Elétrico → velocidade, Psíquico → EXP, Normal → moedas, Inseto/Venenoso → captura,
  Água/Planta → cura) e dano extra contra os tipos que seus tipos vencem. A aba Equipe mostra a contribuição de cada um.
- **Laboratório** — duplicatas (fora da equipe) viram pontos de pesquisa; registrar espécies novas e conquistas
  também rendem pontos. A pesquisa compra bônus permanentes de EXP, moedas, captura, cura e progresso offline.
- **Maestria** — vitórias com um Pokémon ativo somam para a linha evolutiva inteira; cada nível dá +2% de dano e
  −2% de dano recebido.
- **Prestígio** — depois de vencer Misty, recomece na Rota 1 mantendo coleção, Pokédex, pesquisa, maestria e conquistas,
  e ganhe pontos para melhorias de prestígio (dano, fortuna, nível inicial, suprimentos, chance de shiny). O rival
  ganha +3 níveis a cada jornada.
- **Campanha** — cada região tem 8 ginásios (cada líder dá insígnia e um TM), eventos da Equipe Rocket/rival e a Liga:
  4 salas da Elite Four e o Campeão. Nas salas da Liga não há Pokémon selvagens; você treina na rota anterior. Vencer
  o Campeão registra a equipe no Hall da Fama e libera a próxima região.
- **Dia/noite e clima** — o relógio do computador define dia (6h–18h) e noite; o clima muda a cada 2 h. Chuva
  fortalece golpes de Água (+30%) e enfraquece Fogo; sol faz o contrário; areia (e o deserto) fortalece
  Pedra/Terra/Aço; à noite, Fantasma/Sombrio +15%. Algumas espécies só aparecem de dia ou à noite, e o clima
  favorece os encontros de certos tipos. Cavernas e salas não têm clima.
- **Golpes e TMs** — cada Pokémon pode ter até 4 golpes escolhidos entre os aprendidos por nível e os TMs liberados
  que a espécie aceita (Black 2/White 2).
- **Creche** — dois Pokémon com um grupo de ovos em comum (ou um Ditto) geram um ovo a cada 60 vitórias; ovos chocam
  com vitórias ou com o tempo real, herdam 3 IVs e têm chance de shiny 4×. Os hóspedes ganham níveis.
- **Expedições** — até 3 Pokémon livres por 1, 4 ou 8 horas reais; tipos favorecidos rendem mais achados (moedas,
  itens, berries, fósseis, TMs, pesquisa ou um Pokémon). O resultado é sorteado na partida.
- **Jardim** — berries plantadas crescem em tempo real (30 min a 12 h) e rendem várias; comer uma dá um bônus
  temporário (dano, EXP, moedas, captura, cura, velocidade ou shiny).
- **Errantes e Equipe Rocket** — Pokémon raros (Eevee, Snorlax, Lapras…) aparecem por 45 min numa rota aleatória (HP
  triplo, fogem em 45 s se não forem capturados); a Equipe Rocket invade rotas e pode ser enfrentada por moedas e itens.
- **Lendários** — aba ATIVIDADES → LENDÁRIOS. Vencer o Campeão de uma região libera os lendários dela. É uma batalha
  de verdade (o lendário luta, tem HP dobrado e não morre: fica com 1 de HP) e só se captura com bolas lançadas à mão,
  com taxa baixíssima; depois de 10 bolas falhas ele foge, e se você desmaiar ou desistir ele só volta em 1 hora. Saem
  com 3 IVs em 31.
  Os quase lendários (Dragonite, Tyranitar, Salamence, Metagross, Garchomp, Hydreigon) seguem a mesma regra, mas com
  taxa de captura normal (45), 15 bolas, espera de 30 min e 2 IVs em 31.
- **Torre de Batalha, Game Corner e missões** — andares infinitos com ranking e loja de BP; fichas, caça-níqueis
  (retorno ~86%) e prêmios; 3 missões diárias e 3 semanais; marcos da Pokédex com bônus permanentes e medalhas por
  tipo completo.

## Decisões tomadas (seção 14 do escopo)

- **Assets:** nomes, sprites e gritos oficiais via PokéAPI (projeto privado).
- **Captura:** consumíveis (bolas) com chance calculada pela fórmula da 3ª geração.
- **Offline:** limite de 8 h (até 24 h com pesquisa), 70% da eficiência ativa (até 90%), mínimo de 60 s.
- **Pokémon ativo:** pode ser trocado a qualquer momento, inclusive durante a luta; promover um passivo troca os dois de lugar.
- **Evolução:** configurável (automática por padrão).
- **Iniciais:** os 15 iniciais das Gerações I–V (Kanto, Johto, Hoenn, Sinnoh, Unova), com as linhas evolutivas completas; os não escolhidos aparecem raramente na Ponte Pepita/Rota 25. As Gerações VI–IX ficaram de fora por não terem sprites animados no estilo Black/White.
- **Conteúdo:** 563 espécies das Gerações I–V em 80 áreas de 5 regiões, todas com sprites animados.

## Save

O save é versionado (formato atual: 4) e migra automaticamente saves antigos. O save anterior é mantido como
backup e restaurado se o principal estiver corrompido. Exportar/importar fica em Config.

## Balanceamento

O teste "ritmo da campanha" ([src/core/game.test.ts](src/core/game.test.ts)) simula um jogador ativo com cada inicial
até o Lt. Surge e falha se o trecho ficar trivial (menos de 20 min) ou impossível (mais de 10 h). Numa simulação
com só o inicial (sem apoio, pesquisa nem prestígio), Kanto inteiro leva de 3 a 15 h ativas; as regiões seguintes
foram pensadas para exigir equipe de apoio, golpes/TMs, pesquisa e novas jornadas. EXP e moedas usam a escala por
diferença de nível da 5ª geração, então farmar áreas fracas rende cada vez menos.
