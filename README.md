# PokéIdle — Beyond the Journey

RPG idle de coleção de Pokémon em pixel art, no estilo dos portáteis da Game Boy Advance e do Nintendo DS.
A batalha roda sozinha, inclusive com o jogo fechado; você decide a equipe, a rota, quando desafiar os
líderes e como gastar o que ganhou.

Feito com React, TypeScript e Vite. Roda no navegador ou como aplicativo para Windows (Tauri 2). Não há
servidor: o save fica no seu computador.

![Batalha](screenshots/batalha.png)

## Sobre o jogo

- **5 regiões** (Kanto, Johto, Hoenn, Sinnoh e Unova), **80 áreas**, **40 ginásios**, Elite Four e Campeão
  em cada uma.
- **589 espécies** das Gerações I a V, todas com sprites animados de Black/White (frente, costas e shiny).
- **Batalha automática** em tempo real, com tipos, habilidades, itens segurados, status, clima e dia/noite.
- **Progresso offline**: ao voltar, um relatório mostra o que a equipe fez enquanto você estava fora.
- **Muito para fazer em paralelo**: creche, expedições, jardim, raides, torneio semanal, Safari, Torre de
  Batalha, pesca e Surf, mercador viajante, caça ao shiny e mais.

## Capturas de tela

|                                               |                                             |
| --------------------------------------------- | ------------------------------------------- |
| ![Pesca e Surf](screenshots/pesca-e-surf.png) | ![Ficha do Pokémon](screenshots/equipe.png) |
| Surf: encontros de água com espécies próprias | Equipe, reservas e a ficha de cada Pokémon  |
| ![Mapa](screenshots/mapa.png)                 | ![Torneio](screenshots/torneio.png)         |
| Mapa oficial de cada região com marcadores    | Torneio semanal em chave de 8               |
| ![Safari](screenshots/safari.png)             | ![Loja](screenshots/loja.png)               |
| Jogo do Safari: bola, isca ou pedra           | Mercador viajante com estoque limitado      |
| ![Pokédex](screenshots/pokedex.png)           | ![Treinador](screenshots/treinador.png)     |
| Pokédex com diário de pesquisa por espécie    | Cartão de treinador com medalhas e moldura  |

## Funcionalidades

### Batalha e campanha

- Combate automático com fórmulas de dano, precisão e captura da 3ª geração, 25 naturezas, IVs e EVs.
- 69 habilidades (Intimidação, Robustez, Levitação...) e 42 itens seguráveis (Sobras, Faixa Escolha, Orbe da
  Vida, berries...).
- Status (queimadura, veneno, paralisia, sono, congelamento) com as imunidades de tipo dos jogos.
- Equipe de batalha com até duas reservas, que entram quando o ativo desmaia ou têm vantagem de tipo.
- Clima pelo relógio real (sol, chuva, tempestade de areia, neblina, granizo) e dia/noite; algumas espécies
  só aparecem em certos horários e climas.
- Líderes de ginásio dão insígnia e TM; o rival fica mais forte a cada nova jornada; o Campeão registra a
  equipe no Hall da Fama e libera a próxima região.

### Coleção

- Captura manual e automática, Pokédex com filtros e diário de pesquisa por espécie (completar dá bônus de
  captura e EXP contra ela).
- Evolução por nível, pedras e outros itens, amizade e condição (Tyrogue, Wurmple).
- Formas colecionáveis: as 28 letras do Unown, Deerling/Sawsbuck nas quatro estações, Castform pelo clima e
  os padrões de manchas do Spinda.
- 53 lendários e quase lendários, enfrentados numa batalha manual depois de vencer o Campeão da região.
- Pesca (Old, Good e Super Rod) e Surf em 21 áreas com água, com espécies que não aparecem na grama.
- Jogo do Safari com espécies exclusivas: Chansey, Scyther, Pinsir, Tauros, Heracross, Dratini...

### Atividades

| Grupo    | Atividades                                                                      |
| -------- | ------------------------------------------------------------------------------- |
| Criação  | Creche e ovos, jardim de berries, laboratório de fósseis, Campo de Treino (EVs) |
| Desafios | Raides com chefes gigantes, lendários, Torre de Batalha, torneio semanal        |
| Explorar | Expedições de 1, 4 ou 8 horas, Safari, caça ao shiny, Game Corner               |

Também há errantes, a Equipe Rocket, revanches contra líderes, árvores de berry nas rotas, missões diárias e
semanais, e um Pokémon acompanhante que ganha amizade com o tempo e às vezes acha itens.

### Progressão de longo prazo

- Equipe de apoio: Pokémon que não lutam, mas dão bônus pelo tipo (dano, EXP, moedas, captura...).
- Laboratório: duplicatas e espécies novas viram pontos de pesquisa para bônus permanentes.
- Maestria por linha evolutiva, prestígio (nova jornada com pontos para melhorias) e desafios opcionais.
- 46 medalhas em bronze, prata, ouro e platina, com vitrine e molduras para o cartão de treinador.
- Economia com Poké Mart, Loja de Departamentos de Celadon, venda de itens e mercador viajante. A loja mostra
  quanto tempo de jogo cada preço representa no seu ritmo atual.

### Qualidade de vida

- Relatório offline, notificações do sistema com o jogo em segundo plano e atalhos de teclado.
- Histórico de cada Pokémon e MVP da semana; fotos da batalha em PNG com legenda.
- Opções de acessibilidade: contraste alto, texto maior, velocidade das animações e "Reduzir animações".

## Controles

| Tecla     | Ação                                                           |
| --------- | -------------------------------------------------------------- |
| `1` a `9` | Abrir as telas do menu                                         |
| `Q`       | Lançar Poké Ball                                               |
| `W`       | Lançar Great Ball ou Ultra Ball                                |
| `D`       | Desafiar o chefe, a raide, a Equipe Rocket ou fazer a revanche |
| `F`       | Fugir ou desistir do desafio                                   |
| `E`       | Alternar entre grama, pesca e Surf (em áreas com água)         |
| `B`       | Colher a árvore de berry da área                               |
| `P`       | Tirar uma foto da batalha                                      |
| `Esc`     | Fechar avisos e relatórios                                     |

A lista também aparece no jogo, na tela Treinador.

## Rodando localmente

**Requisitos:** Node.js 22 (ou 20.19+). Para o aplicativo desktop: Rust e `cargo-tauri`.

```bash
npm install
npm run dev           # abre em http://localhost:5173
```

| Comando               | O que faz                                                               |
| --------------------- | ----------------------------------------------------------------------- |
| `npm run dev`         | Servidor de desenvolvimento                                             |
| `npm test`            | Testes (regras do jogo, save, offline, motor e interface)               |
| `npm run lint`        | ESLint                                                                  |
| `npm run typecheck`   | Checagem de tipos                                                       |
| `npm run build`       | Gera `dist/` com caminhos relativos                                     |
| `npm run balance`     | Relatório de balanceamento (ritmo da campanha e dificuldade das raides) |
| `npm run tauri:dev`   | Aplicativo desktop com recarga automática                               |
| `npm run tauri:build` | Executável e instalador NSIS em `src-tauri/target/release/`             |

## Dados e assets

O conteúdo de espécies, golpes, tipos e itens vem da [PokéAPI](https://pokeapi.co) e já está no repositório.
Para gerar de novo:

```bash
npm run data:fetch            # usa o cache em scripts/.cache
npm run data:fetch -- --fresh # baixa tudo de novo
```

| Origem            | O quê                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| PokéAPI           | Dados das espécies e golpes, sprites animados de Black/White, ícones, itens, insígnias e gritos    |
| Pokémon Showdown  | Sprites de treinadores (estilo FireRed/LeafGreen) e fundos de batalha ilustrados                   |
| Bulbapedia        | Arte oficial dos mapas de cada região                                                              |
| Feito para o jogo | Cenários alternativos, molduras, ícones de interface, efeitos de batalha, música e efeitos sonoros |

As artes geradas para o jogo ficam em `art/` e passam por scripts antes de entrar em `public/`:

| Script                              | Uso                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------- |
| `python scripts/sprite-feet.py`     | Mede onde ficam os pés de cada sprite, para alinhar o Pokémon à sombra |
| `python scripts/weather-sprites.py` | Converte as artes de clima de `art/weather/` em folhas transparentes   |
| `python scripts/frame-corners.py`   | Converte os ornamentos das molduras de `art/frames/`                   |

Os scripts em Python precisam do [Pillow](https://pypi.org/project/pillow/).

## Arquitetura

```
src/
  game-data/   conteúdo orientado por dados: regiões, rotas, balanceamento, habilidades,
               itens, água, formas, Safari, conquistas (e os JSON gerados da PokéAPI)
  core/        regras do jogo, puras e testáveis, sem React
  engine/      loop de passo fixo (100 ms), autosave e armazenamento do save
  ui/          interface React: batalha, telas, componentes, textos, sons e estilos
src-tauri/     casca desktop (Tauri 2): save em arquivo e notificações
scripts/       geração de dados, balanceamento e conversão de artes
art/           artes de origem (não vão para o jogo sem passar pelos scripts)
```

- A simulação é determinística: um gerador de números aleatórios com estado salvo e passo fixo fazem a mesma
  semente dar sempre o mesmo resultado.
- As regras em `core/` não conhecem a interface; elas mudam o estado e devolvem eventos, que a interface
  transforma em animações, textos e sons.
- O progresso offline é uma função pura, separada do loop visual.
- Os números de balanceamento ficam em `src/game-data/balance.ts`; o conteúdo do mundo, em
  `scripts/world.mjs`.

## Save

- **Navegador:** `localStorage`.
- **Desktop:** arquivos JSON em `%APPDATA%\com.pokeidle.beyondthejourney\saves\`, gravados de forma atômica,
  com um backup por dia (os 7 mais recentes).

O save é versionado e saves antigos são migrados automaticamente. O save anterior fica como backup e é
restaurado se o principal estiver corrompido. Exportar e importar ficam em Treinador > Salvar.

## Testes e balanceamento

A suíte (Vitest) cobre combate, captura, evolução, todas as atividades, o progresso offline, migrações de save,
o motor e um teste de fumaça da interface. Um dos testes simula a campanha com cada inicial e falha se o
começo ficar trivial ou impossível. `npm run balance` mostra os minutos por área e a taxa de vitória nas raides.

## Estado do projeto

Em desenvolvimento. Ainda faltam:

- Seletor de idioma (hoje o jogo está só em português).
- Testar o instalador do aplicativo desktop.

## Aviso legal

Projeto de fã, sem fins lucrativos e sem relação com a Nintendo, a Game Freak, a Creatures ou a The Pokémon
Company. Pokémon e todos os nomes, sprites e sons relacionados são marcas e propriedade desses detentores.
