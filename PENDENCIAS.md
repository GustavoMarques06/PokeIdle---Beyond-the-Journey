# Pendências

Anotações para retomar mais tarde. Atualize ao resolver.

## Cenários de batalha: ovais desenhados nas imagens

**Situação:** os 22 cenários novos (salas da Liga por tipo, `street`, `rocket-base`, `lab`, `seafloor`, `tower`,
`swamp`, `snowfield`, `ruins`, `summit`, `powerplant`, `jungle`) foram gerados com **plataformas ovais de vidro
desenhadas no chão**, no centro da imagem. Os Pokémon ficam nas posições padrão do jogo (inimigo à direita, o
seu à esquerda), então **não ficam sobre esses ovais**. Os cenários originais não têm oval, só manchas de luz
suaves nessas duas posições.

**Como resolver:**
1. A outra IA refaz cada cenário **sem os ovais** e com duas manchas de luz suaves (instruções em
   `prompts/cenarios-correcao.md`). Uma imagem por arquivo, 3:2, nome igual ao id (ex.: `league-ice.png`), em
   `art/maps/`. A tentativa já enviada (`art/maps/correcao.jpg`) não serviu: baixa resolução e cenas mudadas.
2. Reduzir para 753 × 500 e trocar os arquivos em `public/sprites/backgrounds/`.
3. Nada a mudar no código: `sceneBases` em `src/ui/battle/scene.ts` já usa as posições padrão.

**Plano B (já pronto, desligado):** `USE_OVAL_SPOTS = true` em `src/ui/battle/scene.ts` posiciona os
Pokémon sobre os ovais desenhados. Foi desligado porque o resultado ficava menos consistente com o resto do jogo.

**Itens menores nos mesmos cenários:**
- Conferir em batalha `tower`, `swamp`, `snowfield`, `ruins`, `summit`, `jungle`, `powerplant` e `league-water`.
- As imagens das folhas 5 e 6 (quadradas) foram esticadas para 3:2; ficam levemente mais suaves que os originais.
- Os originais antigos estão em `art/maps/_backup-antigos/`.

## Outros

- **Ícone e logo em baixa resolução:** gerar de novo o ícone C-1 (1024 × 1024) e o logo 4 (2000 × 800) como
  arquivos individuais e trocar em `public/icons/`, `public/brand/logo.png` e `src-tauri/icons/`.
- **Build do Windows (Tauri):** os ícones novos entraram, mas o build ainda não foi rodado para conferir.
- **Combate:** golpes de status (Sono, Dança da Espada etc.) não existem; é uma mudança grande nas regras.
- **Molduras do cartão de treinador:** dependem de arte nova.
- **Shinies e 6ª geração:** conferir sprites que faltam (ver PokeAPI/sprites).

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

**Falta (opcional):**
- Equilibrar preço e força (120.000 por pedra foi um palpite).
- Mega Rayquaza (aprende Dragon Ascent, sem pedra) e as Regressões Primais.
- Efeitos reais de algumas habilidades (Elo Parental bate duas vezes, Pixilar converte golpes Normal, etc.).
- Se rodar `npm run data:fetch --fresh`, rode `node scripts/fetch-megas.mjs` e `python scripts/sprite-feet.py` depois.
- Se rodar `npm run data:fetch`, os times de chefe com Mega já saem certos (o script lê o terceiro item).
