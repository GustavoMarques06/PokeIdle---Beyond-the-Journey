# Roteiro de geração: 48 medalhas de ginásio (PokéIdle)

Cole este arquivo inteiro na IA geradora de imagens. Ele é autossuficiente: contém o estilo, o formato de
entrega e o prompt de cada medalha.

---

## 1. Tarefa

Gerar **48 ícones de medalhas (insígnias) de ginásio Pokémon**, 8 por região (Kanto, Johto, Hoenn, Sinnoh,
Unova e Kalos), todos com **o mesmo estilo, o mesmo tamanho aparente e a mesma margem**, para um jogo 2D.

O problema que estamos resolvendo: as medalhas atuais têm bom estilo, mas tamanhos desiguais (de 66 a
120 px) e peso visual diferente entre si. Esta nova leva deve parecer uma **única família**.

## 2. Estilo (vale para as 48)

Use exatamente esta descrição de estilo em **todas** as gerações:

> Flat vector-style game badge icon, single object, centered. Bold dark outline (near-black, ~4% of the
> canvas width), plus a thin white inner highlight stroke just inside the outline, like a glossy sticker.
> Simple cel shading with 2 to 3 tones per color and one small white specular highlight at the top-left.
> Light always comes from the top-left. Saturated, clean colors. Slightly beveled, enamel-pin look. No
> text, no letters, no numbers, no background, no frame, no shadow on the ground, no hands, no ribbon, no
> person, no Pokémon.

Regras de consistência (importantes):

1. **Mesma espessura de contorno** em todas as medalhas.
2. **Mesma direção de luz** (cima-esquerda) e **mesmo tipo de brilho**.
3. **Mesmo tamanho aparente:** a forma deve ocupar entre **80% e 88%** da maior dimensão do canvas. Formas
   altas e estreitas (lâmina, gota, pena) e formas largas (leque, asas) devem ser ajustadas para chegar a
   essa mesma proporção, sem deformar o desenho.
4. **Centralizada** horizontal e verticalmente (pelo centro visual da forma).
5. **Fundo 100% transparente** (PNG com canal alfa). Nada de sombra projetada fora do objeto.
6. Cada medalha precisa ser **reconhecível pela silhueta**, mesmo em 48 px.
7. Cores principais próprias de cada medalha (ver tabela), sem repetir a mesma paleta em medalhas vizinhas.

## 3. Formato de entrega

| Item        | Valor                                                                          |
| ----------- | ------------------------------------------------------------------------------ |
| Canvas      | **512 × 512 px**, quadrado                                                     |
| Formato     | **PNG com transparência** (RGBA)                                               |
| Nome        | `<id>.png`, em minúsculas, igual à coluna **id** abaixo (ex.: `boulder.png`)   |
| Quantidade  | 48 arquivos, 8 por região                                                      |
| Depois      | Eu reduzo para 120 × 120 px; por isso o contorno deve ser grosso e as formas simples |

Se a ferramenta não gera fundo transparente, gere sobre **verde-chroma puro (#00FF00)** e avise, que eu
removo o fundo.

## 4. Prompt de cada medalha

Para cada linha, monte o prompt assim:

```
[ESTILO da seção 2]. Subject: [descrição da coluna "Desenho"]. Main colors: [coluna "Cores"].
512x512, transparent background, centered, fills about 84% of the canvas.
```

### Kanto

| id         | Nome (jogo)           | Desenho                                                              | Cores                       |
| ---------- | --------------------- | -------------------------------------------------------------------- | --------------------------- |
| `boulder`  | Insígnia da Rocha     | Octagonal faceted gem made of grey rock, bright bevel edges          | Light and dark grey         |
| `cascade`  | Insígnia da Cascata   | A single large water drop with a glossy highlight                    | Cyan and deep blue          |
| `thunder`  | Insígnia do Trovão    | Round sun-like orange medal with a zig-zag lightning bolt in the center | Orange, yellow           |
| `rainbow`  | Insígnia do Arco-Íris | Eight-petal flower, each petal a different color, grey center        | Red, orange, yellow, green, blue, purple |
| `soul`     | Insígnia da Alma      | Fat glossy heart                                                     | Magenta pink                |
| `marsh`    | Insígnia do Pântano   | Round disc with concentric rings (swamp ripple)                      | Orange and yellow           |
| `volcano`  | Insígnia do Vulcão    | Flame-shaped crest like an erupting volcano                          | Red and dark orange         |
| `earth`    | Insígnia da Terra     | Green bud or sprout shape with small round beads                     | Green, purple beads         |

### Johto

| id        | Nome (jogo)            | Desenho                                                            | Cores                  |
| --------- | ---------------------- | ------------------------------------------------------------------ | ---------------------- |
| `zephyr`  | Insígnia do Zéfiro     | Stylized silver-white wing or winged helmet                        | Silver, white, light grey |
| `hive`    | Insígnia da Colmeia    | Round ladybug-like shell with black dots and a red body            | Red, black             |
| `plain`   | Insígnia da Planície   | Flat diamond (rhombus) with a bright center                        | Yellow, pale yellow    |
| `fog`     | Insígnia da Névoa      | Dark round badge with curved white mist swirls                     | Dark blue, white       |
| `storm`   | Insígnia da Tempestade | Round brown-and-gold shield, like a fist guard                     | Brown, gold            |
| `mineral` | Insígnia Mineral       | Octagonal metallic plate with a reflective face                    | Blue-grey, steel       |
| `glacier` | Insígnia da Geleira    | Hexagon with a snowflake pattern inside                            | Ice blue, white        |
| `rising`  | Insígnia da Ascensão   | Dark shield or helmet shape with red markings (dragon)             | Black, red, grey       |

### Hoenn

| id        | Nome (jogo)          | Desenho                                                               | Cores                  |
| --------- | -------------------- | --------------------------------------------------------------------- | ---------------------- |
| `stone`   | Insígnia da Pedra    | Two arrow-like stone shapes pointing opposite directions              | Gold, brown, tan       |
| `knuckle` | Insígnia do Punho    | Blue cylinder like a cannon with an orange sphere at the front        | Blue, orange           |
| `dynamo`  | Insígnia do Dínamo   | Ring with a loop on top, like a charged coil                          | Yellow, blue           |
| `heat`    | Insígnia do Calor    | Orange-red flame wrapping around a red ball                           | Orange, red            |
| `balance` | Insígnia do Equilíbrio | Two linked rings, like a dumbbell or scales                         | Grey, purple           |
| `feather` | Insígnia da Pena     | A single white curved feather with a pale blue edge                   | White, light blue      |
| `mind`    | Insígnia da Mente    | Heart-shaped orb with a glowing core and a surrounding ring           | Pink, yellow           |
| `rain`    | Insígnia da Chuva    | Soft pastel triangle with a blue water drop at the bottom             | Pink, white, blue      |

### Sinnoh

| id        | Nome (jogo)           | Desenho                                                         | Cores                    |
| --------- | --------------------- | --------------------------------------------------------------- | ------------------------ |
| `coal`    | Insígnia do Carvão    | Silver ring with a hexagon in the center                        | Silver, grey             |
| `forest`  | Insígnia da Floresta  | Three stacked green leaf or arrow shapes                        | White, green             |
| `cobble`  | Insígnia do Calçamento| Square tilted into a diamond, made of pinkish brick tiles      | Terracotta, salmon, cream|
| `fen`     | Insígnia do Brejo     | Pale blue glass dome, like an eye or a lens                     | Pale blue, white         |
| `relic`   | Insígnia da Relíquia  | Three connected circles forming a trefoil                       | Lavender, white          |
| `mine`    | Insígnia da Mina      | Round ornate gear-like badge with a hollow center               | Silver, beige            |
| `icicle`  | Insígnia do Pingente  | Cluster of ice-blue crystal peaks                               | Ice blue, white          |
| `beacon`  | Insígnia do Farol     | Dome shape with an arched beam of light on top                  | White, pale yellow       |

### Unova

| id       | Nome (jogo)        | Desenho                                                          | Cores                   |
| -------- | ------------------ | ---------------------------------------------------------------- | ----------------------- |
| `trio`   | Insígnia do Trio   | Tall slim gold blade with three small gems (red, green, blue)    | Gold, red, green, blue  |
| `basic`  | Insígnia Básica    | Tall rectangular bar with a gold frame and a dark purple center  | Purple, gold            |
| `insect` | Insígnia do Inseto | Ornate gold-and-purple jewel with small beads, like an insect brooch | Gold, purple        |
| `bolt`   | Insígnia do Raio   | Leaf-shaped green lightning bolt                                 | Green, lime             |
| `quake`  | Insígnia do Tremor | Jagged yellow lightning or crack                                 | Yellow, orange          |
| `jet`    | Insígnia do Jato   | Tall thin pointed blade like a jet wing, with a green gem        | Gold, green             |
| `freeze` | Insígnia Congelada | Curved feather or leaf shape in ice blue with a gold edge        | Ice blue, gold          |
| `legend` | Insígnia da Lenda  | Spiky crown or flame, like a dragon crest                        | Silver, gold            |

### Kalos

| id        | Nome (jogo)           | Desenho                                                          | Cores                    |
| --------- | --------------------- | ---------------------------------------------------------------- | ------------------------ |
| `bug`     | Insígnia do Inseto    | Spiky golden star with a red gem in the center                   | Gold, brown, red         |
| `cliff`   | Insígnia do Penhasco  | Tall narrow teardrop-like crest with blue and gold stripes       | Gold, blue               |
| `rumble`  | Insígnia do Estrondo  | Olive-green scarab beetle with a red center                      | Olive, green, red        |
| `plant`   | Insígnia da Planta    | Square tiles in brown and white, like a garden plot              | Brown, white, tan        |
| `voltage` | Insígnia da Voltagem  | Red, white and grey panel with a lightning symbol                | Red, white, grey         |
| `fairy`   | Insígnia da Fada      | Leaf-shaped shield with a small tree-branch pattern              | Teal, green, gold        |
| `psychic` | Insígnia Psíquica     | Gold radiating starburst with small gems on the points           | Gold, purple, pink       |
| `iceberg` | Insígnia do Iceberg   | Wide golden fan or wing crest with blue-white ice crystals       | Gold, white, blue        |

## 5. Como entregar e revisar

1. Gere **uma região por vez** (8 medalhas) e envie as 8 juntas, para conferir a consistência.
2. Antes de seguir para a próxima região, mostre a **primeira medalha aprovada** como referência e
   **repita o estilo dela** nas seguintes.
3. Conferência final de cada arquivo:
   - [ ] PNG com fundo transparente, 512 × 512
   - [ ] Forma entre 80% e 88% do canvas, centralizada
   - [ ] Contorno escuro com a mesma espessura das outras
   - [ ] Sem texto, sem moldura, sem sombra no chão
   - [ ] Legível quando reduzida para 48 px
   - [ ] Nome do arquivo igual ao `id`

## 6. Observação para o time

Os nomes em português de `bug` (Kalos) e `insect` (Unova) eram iguais. A de Unova agora se chama "Insígnia do Besouro";
a de Kalos continua "Insígnia do Inseto".
