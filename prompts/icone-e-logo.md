# Roteiro de geração: ícone do app e logo (PokéIdle — Beyond the Journey)

Cole este arquivo inteiro na IA geradora de imagens. Ele é autossuficiente.

---

## 1. Contexto do jogo (para a IA entender o tom)

**PokéIdle — Beyond the Journey** é um RPG idle de coleção de monstrinhos no estilo Pokémon, em pixel art, com
visual de portátil GBA/DS. A batalha roda sozinha, **inclusive com o jogo fechado**: o jogador monta a equipe,
escolhe a rota e volta depois para ver o que aconteceu. O tom é **aconchegante, aventureiro e nostálgico**.

Duas ideias que a marca pode sugerir (use uma por conceito, nunca todas juntas):

- **Jornada:** estrada, horizonte, amanhecer, ir além.
- **Idle / tempo:** o jogo continua enquanto você está fora (lua, relógio, brilho, "zzz").

## 2. Paleta e estilo (vale para tudo)

Cores da interface do jogo, para a marca combinar com ela:

| Uso               | Cor        |
| ----------------- | ---------- |
| Azul principal    | `#284888`  |
| Azul claro        | `#A8C8F0`  |
| Verde (fundo)     | `#A8D880`  |
| Contorno escuro   | `#202030`  |
| Destaque (ouro)   | `#F8C830`  |
| Vermelho da bola  | `#E04838`  |

Estilo, igual ao das medalhas novas do jogo, para formarem uma família:

> Flat vector-style game art, bold dark outline (near-black, constant thickness), plus a thin white outer
> stroke like a glossy sticker. Simple cel shading with 2 to 3 tones per color and one small white
> specular highlight at the top-left. Light always comes from the top-left. Saturated, clean colors,
> slightly beveled enamel-pin look.

**Regras de propriedade intelectual (importante):**

- Pode usar uma **Poké Ball genérica** (esfera vermelha em cima, branca embaixo, faixa preta e botão central).
- **Não** copiar o logotipo oficial "Pokémon", sua tipografia amarela com contorno azul, nem o Pikachu ou
  qualquer personagem. O nome do jogo deve ter **letras próprias**, diferentes das oficiais.
- Sem texto além do pedido, sem marca d'água, sem pessoas.

---

## 3. PARTE A: Ícone do app

### O que é

O ícone quadrado que aparece no celular (tela inicial), na barra de tarefas do Windows e na aba do navegador.
Ele é visto de **16 px até 512 px**, então precisa ser **simples e legível pela silhueta**.

### 3 conceitos (gere cada um em **2 variações**, total de 6 imagens)

**Conceito A: Jornada.** Poké Ball grande e centralizada. Atrás dela, um horizonte com sol nascendo e uma
estrada curta que sobe até a bola, como se ela estivesse no começo de um caminho. Fundo em gradiente de
amanhecer (azul `#284888` embaixo, laranja/dourado no alto).

**Conceito B: Tempo (idle).** Poké Ball grande e centralizada, com um **anel dourado fino** em volta, como o
aro de um relógio ou uma órbita, e **um pequeno ponteiro/pontinho brilhante** marcando o anel. Fundo azul
`#284888` liso, com poucas estrelas minúsculas.

**Conceito C: Descanso.** Poké Ball grande e centralizada, com uma **meia-lua** amarela pequena no canto
superior direito e **três "z" estilizados** subindo, sugerindo que o jogo continua enquanto o jogador dorme.
Fundo azul-noite com um brilho suave atrás da bola.

### Regras comuns a todos

1. **Um único elemento dominante** (a Poké Ball) ocupando **cerca de 60% do quadro**.
2. Fundo **opaco, sem transparência, sem cantos arredondados** (o sistema arredonda sozinho).
3. Tudo importante dentro dos **80% centrais** do quadro ("zona segura"), porque o Android recorta os bordos
   em círculo.
4. Sem texto no ícone.
5. Contorno escuro grosso o bastante para continuar visível em 32 px.

### Entrega do ícone

| Item    | Valor                                                    |
| ------- | -------------------------------------------------------- |
| Tamanho | **1024 × 1024 px**, quadrado                             |
| Formato | PNG, sem transparência                                   |
| Nome    | `icone-A-1.png`, `icone-A-2.png`, `icone-B-1.png`… `icone-C-2.png` |

---

## 4. PARTE B: Logo (wordmark)

### O que é

O nome do jogo escrito com letras desenhadas, para a **tela de título** ("Pressione Start"), a tela de
carregamento e a divulgação.

### O texto, exatamente assim

- Linha principal: **`PokéIdle`**. Atenção: **P maiúsculo, "o", "k", "é" com acento agudo, "I" maiúsculo,
  "dle" minúsculo.** O acento no "é" é obrigatório.
- Linha secundária (menor): **`Beyond the Journey`**

Se a IA errar a grafia, **gere de novo**. Não aceite "Pokeidle", "PokeIdle" sem acento nem letras trocadas.

### Estilo das letras

- Letras **grossas, arredondadas e amigáveis**, com **contorno escuro grosso** e **traço branco externo**.
- Preenchimento com **degradê vertical** (por exemplo, dourado `#F8C830` em cima para laranja embaixo), com
  brilho branco no alto de cada letra.
- A palavra **`Idle`** pode ter um tratamento diferente de `Poké` (por exemplo, azul `#284888` com um pequeno
  "z" ou lua sobre o "I"), para reforçar a ideia de tempo/descanso. É opcional; escolha uma só ideia.
- Pode incluir **uma Poké Ball pequena** substituindo ou ao lado de uma letra (por exemplo, no "o" de
  `Poké`). Não coloque mais de um símbolo.
- Subtítulo em letras menores, brancas com contorno escuro, numa **faixa/fita** simples sob o nome (ou sem
  faixa, só com contorno).

### Gere 4 variações

1. Horizontal, só `PokéIdle` (sem subtítulo).
2. Horizontal, `PokéIdle` + `Beyond the Journey` abaixo.
3. Igual à 2, com a Poké Ball integrada ao "o" de `Poké`.
4. Igual à 2, com o tratamento especial em `Idle` (lua/"z").

### Entrega do logo

| Item    | Valor                                                              |
| ------- | ------------------------------------------------------------------ |
| Tamanho | **2000 × 800 px** (proporção 5:2), logo centralizado, margem de ~8% |
| Formato | PNG com **fundo transparente**                                     |
| Nome    | `logo-1.png`, `logo-2.png`, `logo-3.png`, `logo-4.png`             |

Se a ferramenta não gerar transparência, gere sobre **magenta puro (`#FF00FF`)** e avise, que eu removo o
fundo (já fiz isso com as medalhas).

---

## 5. Conferência antes de enviar

- [ ] Nenhuma imagem copia o logo, a fonte ou os personagens oficiais de Pokémon
- [ ] Ícones: 1024 × 1024, sem transparência, bola ocupando ~60%, tudo dentro dos 80% centrais
- [ ] Ícones: ainda reconhecíveis quando reduzidos para 48 px
- [ ] Logos: grafia exata `PokéIdle` (com acento) e `Beyond the Journey`
- [ ] Logos: contorno escuro grosso e letras legíveis quando reduzidas a 400 px de largura
- [ ] Cores combinando com a paleta da seção 2

## 6. O que eu faço depois (para você saber o que vem a seguir)

Quando você me devolver os arquivos, eu:

1. Escolho junto com você o ícone e o logo preferidos.
2. Gero os tamanhos do app: `icon-192`, `icon-512`, a versão _maskable_ (com a zona segura certa), o
   `favicon` e os ícones do aplicativo de Windows (`.ico`, `.icns` e os PNGs).
3. Troco o ícone da aba do navegador, que hoje é só a imagem de uma Poké Ball do jogo.
4. Coloco o logo novo na tela de título, no lugar do texto atual.
5. Confiro tudo no jogo rodando e guardo um backup dos arquivos antigos.
