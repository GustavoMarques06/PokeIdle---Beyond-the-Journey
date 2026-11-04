# Correção dos cenários (rodada 2)

Cole este arquivo na IA geradora junto com a folha que ela vai corrigir (anexe a imagem). O estilo, as cores e
os objetos dos cenários ficaram ótimos: **só preciso de ajustes de composição**.

## O problema

Os cenários vieram com **plataformas ovais de vidro** desenhadas no chão, no centro. No jogo, os Pokémon ficam
em posições fixas que não são o centro:

- o **inimigo** fica no **lado direito**, mais para cima (cerca de 72% da largura e 54% da altura);
- o **Pokémon do jogador** fica no **lado esquerdo**, bem embaixo (cerca de 26% da largura e 96% da altura).

Com os ovais no centro, os Pokémon ficam flutuando fora deles. Os cenários do jogo que já existem não têm
plataforma desenhada: só **manchas suaves de luz** no chão, nesses dois pontos.

Além disso, as folhas 5 e 6 trouxeram **caixas cinza de interface** nos cantos (superior esquerdo e inferior
direito). Elas eram só marcação de espaço e **não podem aparecer na imagem final**.

## O que mudar, em cada cenário

> Edit this image. Remove every glass oval platform from the floor, and continue the floor texture
> naturally where they were (same tiles, planks, sand, snow, water or stone pattern, same perspective).
> Remove the grey placeholder boxes in the top-left and bottom-right corners and continue the scenery
> there as well. Keep everything else exactly the same: style, palette, walls, objects, lighting, pixel
> look. Then add two very soft, low-contrast patches of lighter floor with no outline: a larger one in
> the lower-left area (centered at about 26% of the width, 90% of the height) and a smaller one in the
> upper-right area (centered at about 72% of the width, 56% of the height), like a gentle pool of light
> on the ground. No hard edges, no glass streaks, no lines.

## Entrega

| Item     | Valor                                                                               |
| -------- | ----------------------------------------------------------------------------------- |
| Imagens  | **Uma por arquivo**, sem faixas magenta e sem montagem de 4 cenários na mesma folha |
| Proporção | **3:2** (1506 × 1000 px, ou 1536 × 1024)                                           |
| Nome     | `<id>.png`, igual ao id do roteiro (ex.: `league-ice.png`)                          |
| Pasta    | `art/maps/`                                                                          |

Folhas quadradas (5 e 6): refaça cada cenário em **3:2**, ampliando um pouco as laterais com o mesmo tipo de
cenário, em vez de esticar a imagem.

## Detalhes por cenário

- **`league-hall`**: o oval único some. Se quiser, mantenha o tapete e a borda dourada. Só não pode haver
  plataforma desenhada.
- **`street`**: tire o letreiro "SHOP" (não pode haver texto legível; deixe a fachada lisa).
- **`ruins`**: saiu repetido nas folhas 5 e 6. Basta **uma** versão.
- **`seafloor`, `snowfield`, `summit`**: os ovais viram só a mancha de luz suave descrita acima.
- **`league-dragon`, `league-fire`, `league-steel`, `league-water`, `league-ground`, `rocket-base`, `lab`,
  `swamp`, `tower`, `powerplant`, `jungle`**: mesmo tratamento.

## Conferência final

- [ ] Nenhum oval, plataforma, caixa cinza ou linha de contorno no chão
- [ ] Duas manchas de luz suaves: grande embaixo à esquerda e pequena no alto à direita
- [ ] Imagem em 3:2, uma por arquivo, nome igual ao id
- [ ] Sem texto legível
- [ ] Mesmo estilo e mesma paleta da versão anterior

## O que eu faço depois

Reduzo para 753 × 500, coloco em `public/sprites/backgrounds/`, cadastro os 22 cenários novos, distribuo pelas
áreas (cada luta da Liga recebe a sala do tipo do líder, o mar escuro passa para `seafloor`) e testo no jogo.
