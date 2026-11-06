# Pendências

Anotações para retomar mais tarde. Atualize ao resolver.

## Cenários de batalha (resolvido em 5/11)

As 19 imagens corrigidas (`art/maps/correcao/`) entraram com os ovais trocados por manchas de luz suaves; as caixas
cinza de interface do `summit` e do `league-hall` foram retiradas. Nos que ainda tinham vidro duro (`league-psychic`,
`tower`, `ruins`, `lab`, `jungle`) o oval foi suavizado por script. `league-fight`, `league-ice`, `league-ghost` e
`powerplant` não vieram na correção: ficam as versões antigas, só com o contorno do oval apagado.

**Ainda vale:** as folhas da correção têm resolução baixa (1024 ou 1376 px para 4 cenários) e algumas são quadradas,
então foram cortadas e esticadas para 3:2. Gerar cada cenário individual em 1506×1000 melhoraria a nitidez.
As manchas de luz não ficam exatamente nas posições dos Pokémon (inimigo à direita, o seu à esquerda).
Backup das versões com ovais: `art/maps/_backup-com-ovais/`. `USE_OVAL_SPOTS` em `scene.ts` segue desligado.

## Outros

- **Ícone e logo em baixa resolução:** gerar de novo o ícone C-1 (1024 × 1024) e o logo 4 (2000 × 800) como
  arquivos individuais e trocar em `public/icons/`, `public/brand/logo.png` e `src-tauri/icons/`.
- **Build do Windows (Tauri):** os ícones novos entraram, mas o build ainda não foi rodado para conferir.
- **Combate:** golpes de apoio (status, atributos e cura) entraram como um 5º golpe, uma vez por luta (`supportMoves.ts`). Não são 4 golpes escolhíveis como nos jogos e ficam de fora do progresso offline, que é uma estimativa. Em 7.200 lutas simuladas, as vitórias mudaram até 1,4 ponto e cada luta durou ~1 s a mais.
- **Modo Desempenho:** sprites parados (primeiro quadro do GIF num canvas), sem efeitos, animações e números de dano, batalha redesenhada ~3x por segundo. Com CPU simulada 8x mais lenta: de 16 para 49 FPS. Falta testar em um PC fraco de verdade (a simulação não inclui a placa de vídeo).
- **Save na nuvem:** não feito, por decisão. O save fica só no aparelho; há lembrete semanal de backup e aviso para instalar no iPhone.
- **Molduras do cartão de treinador:** dependem de arte nova.
- **Shinies e 6ª geração:** conferido em 5/11: os 668 Pokémon têm sprite shiny (frente e costas). Nada a fazer.

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

**Falta (opcional):**
- Mega Rayquaza (aprende Dragon Ascent, sem pedra): o golpe não existe nos dados do jogo.
- Equilibrar preço e força (120.000 por pedra foi um palpite; jogar um pouco e ajustar `MEGA_STONE_PRICE`).
- Se rodar `npm run data:fetch --fresh`, rode `node scripts/fetch-megas.mjs` e `python scripts/sprite-feet.py` depois.
- Se rodar `npm run data:fetch`, os times de chefe com Mega já saem certos (o script lê o terceiro item).

## Modo Qualidade (3D): descartado em 5/11

Foi feito (sprites 3D do Showdown e do HOME, efeitos do pixelfx, interface de vidro) e **removido a pedido**: não ficou bom ao
lado da pixel art. O jogo voltou ao pixel art. Ficaram só o modo **Desempenho** (Opções > Gráficos) e o tamanho real dos
Pokémon. Quem tinha salvo em Qualidade volta para Normal (`save.ts`).

**Tamanho real dos Pokémon:** a batalha usa a altura real de cada espécie (`heights.json`, `scripts/fetch-heights.mjs`)
com raiz quadrada e teto/piso, então Rattata e Magikarp aparecem pequenos e Onix e Wailord, grandes.

**Efeitos em pixel art (5/11):** 14 tipos de golpe (todos menos aço, veneno, inseto e dragão, que seguem com as partículas
de CSS) e 5 status em loop (sono, paralisia, queimadura, congelamento, veneno) usam folhas de PVFX Foundry e Foozle (CC0).
`scripts/build-fx.py` monta tudo de `art/fx-packs`; ajuste `k` (tamanho) e `at` (ancoragem) em `IMPACTS`/`STATUS` se algum
ficar torto. Falta achar efeitos bons para aço, veneno, inseto e dragão (PVFX tem mais de 100, só escolhi os melhores).

**Climas novos (5/11):** chuva, neve (para o granizo) e tempestade (chuva à noite) são WebP animados do pixelfx
(`scripts/build-weather.py`); areia, névoa e sol são desenhados em CSS (`WeatherLayer` em `effects.tsx`). Os antigos saíram.
Sobram do pixelfx, ainda não usados: folhas de outono, pétalas, vaga-lumes, aurora, estrelas cadentes, nevasca e raios de sol
(alguns escurecem a cena inteira). O clima segue o relógio do jogo; ligar neve às rotas frias seria uma melhoria separada.
