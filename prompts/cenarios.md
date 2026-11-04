# Roteiro de geração: cenários de batalha (PokéIdle)

Cole este arquivo inteiro na IA geradora de imagens. Ele é autossuficiente: contém o estilo, as regras de
composição, o formato de entrega e o prompt de cada cenário.

---

## 1. Tarefa e por que

Gerar **23 cenários de batalha 2D em pixel art**, em duas partes:

- **Parte 1 (15 cenários):** salas da **Liga Pokémon** e locais urbanos. Hoje **34 das 96 áreas** do jogo usam o
  mesmo cenário (um depósito de tijolos), e 30 delas são as lutas da Liga: o Elite Four e o Campeão de cada
  uma das 6 regiões. Queremos **salas temáticas por tipo** (gelo, fantasma, dragão…).
- **Parte 2 (8 cenários):** lugares que o jogo ainda não tem (mar claro, pântano, neve ao ar livre, ruínas…).

Todos devem parecer **da mesma família** dos cenários que o jogo já tem.

## 2. Estilo (vale para os 23)

Use esta descrição de estilo em **todas** as gerações:

> Pixel art battle background for a 2D monster-collecting RPG, in the style of Nintendo DS-era Pokémon
> Black and White battle scenes. Chunky visible pixels (about 2x2 screen pixels per art pixel), a limited
> palette with soft dithering instead of smooth gradients, subtle banding on the ground. Side-on view
> with a slightly elevated camera. Painterly but clean. No characters, no creatures, no text, no UI, no
> logos, no frame or border.

Evite explicitamente: render 3D, fotografia, aquarela, bordas arredondadas, vinheta escura nos cantos, brilho
estourado, qualquer personagem ou Pokémon.

## 3. Composição (importante: é uma tela de jogo)

Os cenários ficam **atrás** dos Pokémon e da interface. Respeite estas zonas:

```
+--------------------------------------------------+
| [caixa do inimigo]        horizonte / fundo      |  <- terço superior: fundo, detalhes
|  (canto sup. esquerdo,                  [inimigo]|     (o inimigo aparece à direita)
|   ~35% x 15% do quadro)                          |
|                                                  |  <- centro: calmo, pouco detalhe
| [seu Pokémon]                                    |
|  (inferior esquerdo)       [caixa do jogador]    |  <- terço inferior: chão
|                            (inf. direito, ~40%)  |
+--------------------------------------------------+
```

Regras:

1. **Horizonte ou linha do fundo no terço superior** do quadro.
2. **Chão com uma área clara, em formato de oval/elipse, no centro-inferior**, como uma plataforma de batalha
   (os cenários atuais fazem isso). Duas elipses claras (uma maior embaixo à esquerda, outra menor no meio
   à direita) são ideais.
3. **Zonas calmas:** o canto superior esquerdo e o canto inferior direito devem ter **pouco detalhe e pouco
   contraste**, porque caixas de interface ficam por cima.
4. **Detalhes e objetos grandes nas bordas** (esquerda, direita e topo), nunca no centro.
5. **Sem elementos que pareçam personagens** (estátuas humanas, silhuetas, rostos).
6. **Iluminação de dia/neutra.** O jogo escurece o cenário sozinho à noite; não gere versão noturna.
7. **Paleta média**: nem muito escura nem muito clara, para o sprite do Pokémon ter contraste por cima.

## 4. Formato de entrega

| Item        | Valor                                                                         |
| ----------- | ----------------------------------------------------------------------------- |
| Proporção   | **3:2** (os cenários atuais são 753 × 500)                                    |
| Tamanho     | **1506 × 1000 px** (exatamente 2× o atual). Eu reduzo para 753 × 500          |
| Formato     | PNG ou JPG de boa qualidade (sem transparência)                               |
| Nome        | `<id>.png`, em minúsculas, igual à coluna **id** abaixo (ex.: `league-ice.png`) |
| Quantidade  | 23 arquivos                                                                   |

Se a ferramenta só gera quadrado, gere **1536 × 1024** (3:2). Se gerar folhas com vários cenários, deixe
**cada cenário separado por uma faixa magenta (#FF00FF)** e **sem rótulos escritos dentro da imagem**.

---

## 5. PARTE 1: Liga e locais urbanos (15)

Cada prompt é o estilo da seção 2 mais a coluna **Cena**. Mantenha as regras de composição da seção 3.

| id              | Onde é usado                                  | Cena                                                                                                                                                              |
| --------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `league-hall`   | Campeão de cada região                        | Grand ceremonial champion's hall: polished marble floor, tall columns, gold trim, deep blue banners with abstract emblems (no text), warm light from tall windows |
| `league-ice`    | Lorelei, Glacia                               | Frozen chamber: ice-block walls, frosted floor with a faint reflective sheen, hanging icicles, pale cyan and white palette                                        |
| `league-fight`  | Bruno, Marshal                                | Traditional training dojo: wooden plank floor, paper-screen walls, hanging scrolls (no text), rope-wrapped pillars, sandbags in the corners, warm brown palette   |
| `league-ghost`  | Agatha, Phoebe, Shauntal                      | Gloomy mansion hall: purple stone floor, candelabras with pale blue flames, tattered curtains, faint floating wisps (no faces), violet and grey palette          |
| `league-dragon` | Lance, Drake, Drasna                          | Cavernous draconic hall: dark red-and-blue stone, huge carved dragon-claw pillars, glowing amber braziers at the edges, deep floor with scale-pattern tiles     |
| `league-psychic`| Will, Lucian, Caitlin                         | Serene mystic room: floating glowing crystals at the edges, star-map patterned floor, soft pink and lavender light, smooth gradients of mist                    |
| `league-dark`   | Karen, Sidney, Grimsley                       | Elegant night-club-like lounge: dark charcoal and deep violet floor, sleek black pillars, a few bright moon-shaped lamps, red accent carpet                       |
| `league-poison` | Koga, Aaron                                   | Hidden ninja-style or toxic lab hall: green-tinted wooden floor, bubbling vats and vines at the edges, purple-green mist near the floor                            |
| `league-fire`   | Flint, Malva                                  | Volcanic forge hall: black basalt floor with glowing orange cracks, lava channels at the edges, hot orange and red light, stone pillars                          |
| `league-steel`  | Wikstrom, Byron                               | Industrial armory: riveted steel plates, gears and pipes on the walls, polished metal floor with reflections, cool grey and silver palette                       |
| `league-water`  | Siebold                                       | Elegant aquarium hall: glass walls with soft blue water and silhouetted fish (no detail), wet tile floor, white and teal palette                                 |
| `league-ground` | Bertha                                        | Earthen training cavern: packed sandy floor, carved stone pillars, rocky walls with pale fossil-like details, warm tan and ochre palette                         |
| `street`        | Saffron, Goldenrod (cidades)                  | Bright modern city street: paved road and sidewalk, a few shop fronts and trees at the edges, tall buildings in the background, clear daytime sky                |
| `rocket-base`   | Esconderijo Rocket                            | Underground criminal hideout: concrete floor with hazard stripes, metal doors, crates and monitors at the edges, dim red-orange lighting (no letters or logos)     |
| `lab`           | Laboratório de Lysandre                       | Futuristic research lab: white-and-teal floor panels, glowing consoles and glass tubes at the edges, clean cold light                                             |

## 6. PARTE 2: Lugares novos (8)

Mesma regra de estilo e composição.

| id            | Onde vai ser usado (a definir comigo)              | Cena                                                                                                                                     |
| ------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `seafloor`    | Mar e cavernas submarinas (hoje o cenário é quase preto) | Bright underwater scene: sandy seabed with ripples, coral and kelp at the edges, light rays from above, clear teal and blue water, small bubbles |
| `swamp`       | Pântanos                                           | Misty bog: dark muddy water patches, dead trees and hanging moss at the edges, green-brown palette, soft fog near the horizon           |
| `snowfield`   | Neve ao ar livre                                   | Open snowy plain: white-blue snow with soft shadows, a few snow-covered pines at the edges, pale winter sky                              |
| `ruins`       | Ruínas antigas                                     | Ancient stone ruins in a sandy clearing: broken columns, moss-covered blocks, worn carvings (abstract, no letters), warm afternoon light |
| `tower`       | Torres assombradas                                 | Interior of an old stone tower: dark wooden floor, rows of weathered gravestone-like pillars at the edges, dim lavender light, cobwebs   |
| `powerplant`  | Usinas elétricas                                   | Abandoned power plant: concrete floor, big generators and coils at the edges, exposed pipes, yellow and teal accents, sparks (no people) |
| `summit`      | Picos e céu                                        | High mountain summit: pale stone floor, thin air, drifting clouds below the horizon, distant peaks, crisp blue sky                      |
| `jungle`      | Selvas                                             | Dense tropical jungle clearing: broad leaves and vines framing the edges, damp earth floor, bright green and yellow light through the canopy |

---

## 7. Como entregar e revisar

1. Gere **em lotes de 4**. Mande cada lote antes de continuar.
2. Depois do primeiro lote aprovado, use uma imagem aprovada como **referência de estilo** nos seguintes.
3. Conferência final de cada arquivo:
   - [ ] Proporção 3:2 (1506 × 1000, ou 1536 × 1024)
   - [ ] Pixel art com pixels visíveis, sem aspecto de render 3D ou foto
   - [ ] Horizonte no terço superior e oval de chão claro no centro-inferior
   - [ ] Canto superior esquerdo e canto inferior direito calmos e sem detalhe forte
   - [ ] Nenhum personagem, criatura, texto, logotipo ou moldura
   - [ ] Iluminação diurna/neutra (sem versão noturna)
   - [ ] Nome do arquivo igual ao `id`

## 8. O que eu faço depois

Quando você me devolver os arquivos, eu:

1. Reduzo para **753 × 500** e ajusto a paleta para combinar com os cenários atuais.
2. Coloco em `public/sprites/backgrounds/` e cadastro os novos cenários no jogo.
3. **Distribuo pelas áreas:** cada luta da Liga recebe a sala do tipo do líder (por exemplo, Lorelei e Glacia
   em `league-ice`), as cidades recebem `street`, e os lugares novos da Parte 2 entram nas áreas que fizerem
   sentido (começando pelo mar, hoje quase preto).
4. Confiro tudo no jogo rodando e guardo um backup dos arquivos atuais.
