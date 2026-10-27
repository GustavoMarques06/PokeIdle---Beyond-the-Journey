# PokéIdle --- Beyond the Journey

## Escopo do projeto (Game Design + arquitetura técnica)

**Status:** Documento inicial de escopo (histórico — ver "Estado atual" abaixo)\
**Plataforma-alvo:** PC\
**Formato:** RPG Idle single-player\
**Direção visual:** Pixel art 2D\
**Combate:** Um Pokémon ativo; os demais concedem bônus passivos\
**Nome:** PokéIdle --- Beyond the Journey _(nome provisório; validar
marca e propriedade intelectual antes de qualquer publicação)_

---

## Estado atual (versão 0.4, outubro de 2026)

Este documento descreve o plano original. **Todas as fases da seção 8 foram concluídas** e as decisões
da seção 14 já foram tomadas — estão registradas no [README](README.md#decisões-tomadas-seção-14-do-escopo).
As seções 13 ("Próximo passo concreto") e 14 ficam como registro histórico.

O que mudou em relação ao plano:

- **Conteúdo:** 5 regiões (Kanto a Unova), 80 áreas e as espécies das Gerações I–V, em vez de um conjunto reduzido.
- **Combate:** além do ativo e dos bônus passivos (seção 4.6), há até duas **reservas** que entram quando o
  ativo desmaia ou têm vantagem de tipo; golpes causam **status** e os Pokémon têm **naturezas**.
- **Longo prazo:** prestígio com **desafios** opcionais, Torre de Batalha, lendários, creche, expedições,
  jardim, fósseis, missões e um painel de **estatísticas** (EXP/moedas por hora) para acompanhar as métricas
  da seção 11.
- **Plataforma:** no app desktop o save fica em arquivos na pasta de dados do usuário, com backups diários; há
  notificações do sistema e atalhos de teclado (requisito "controles acessíveis por mouse e teclado").

Itens da seção 9 ("Fora do escopo inicial") continuam fora: multiplayer, servidor/nuvem, microtransações e
exploração livre.

---

## 1. Visão do produto

PokéIdle é um RPG idle de coleção e progressão no qual o jogador escolhe
um Pokémon inicial, enfrenta criaturas em batalhas automáticas, ganha
experiência e recursos, captura novas espécies, evolui sua equipe e
desbloqueia regiões. O progresso deve continuar parcialmente enquanto o
jogo estiver fechado.

A experiência deve atender a dois perfis: - **Casual/idle:** entra,
coleta recompensas, melhora a equipe e deixa o jogo progredir. -
**Otimizador:** escolhe o Pokémon ativo, combina bônus passivos,
configura movimentos, explora vantagens de tipo e otimiza a eficiência
de farm.

### Pilares de design

1.  **Progressão constante:** sempre existe uma melhoria ou objetivo
    alcançável.
2.  **Coleção significativa:** novas capturas e duplicatas têm
    utilidade.
3.  **Decisões simples, com profundidade gradual:** o jogo começa fácil
    e revela sistemas aos poucos.
4.  **Automação conquistada:** captura, treinamento e outras rotinas
    podem ser automatizados por desbloqueios.
5.  **Progresso offline justo:** recompensas calculadas de forma
    previsível e resistente a manipulação básica do relógio.
6.  **Conteúdo expansível:** espécies, regiões, itens e eventos devem
    ser adicionáveis sem reescrever os sistemas centrais.

## 2. Público e plataforma

- **Público-alvo:** fãs de monster-collectors, jogos incrementais,
  RPGs leves e jogos de coleção.
- **Plataforma inicial:** PC.
- **Modo:** single-player e prioritariamente offline.
- **Controles:** mouse e teclado; interface adaptável a diferentes
  resoluções de janela.
- **Sessão esperada:** sessões curtas para coletar e melhorar, com
  possibilidade de deixar o jogo aberto por períodos maiores.

## 3. Loop principal

1.  Selecionar uma região e rota.
2.  Lutar automaticamente com o Pokémon ativo.
3.  Derrotar inimigos e receber EXP, moedas e possíveis itens.
4.  Capturar espécies encontradas quando as condições permitirem.
5.  Subir de nível, evoluir, melhorar movimentos e ajustar bônus
    passivos.
6.  Vencer o chefe da área ou cumprir o requisito de progressão.
7.  Desbloquear a próxima rota/região.
8.  Fechar o jogo e receber um resumo de progresso ao retornar.

O jogador deve conseguir entender rapidamente por que está bloqueado e
qual melhoria concreta pode ajudá-lo a avançar.

## 4. Sistemas de jogo

### 4.1 Seleção inicial

- Permitir selecionar um inicial dentre os iniciais incluídos no
  conteúdo do jogo.
- A escolha inicial é uma preferência de estilo, não uma escolha
  permanentemente superior.
- Os outros iniciais devem poder ser obtidos posteriormente por meios
  definidos pelo jogo.
- A lista completa de espécies e gerações será definida como conteúdo,
  sem ficar codificada diretamente na lógica do combate.

### 4.2 Pokémon e atributos

Cada instância de Pokémon deve conter, no mínimo: - espécie e
identificador; - nível e experiência atual; - HP, ataque físico, ataque
especial, defesa, defesa especial e velocidade; - tipo(s), habilidade
passiva e movimentos disponíveis; - estado de evolução e requisitos; -
potencial/IVs ou sistema equivalente de variação individual; - natureza
ou modificadores equivalentes, caso façam parte do balanceamento; -
raridade visual, incluindo variante shiny quando aplicável; - nível de
maestria e dados de captura.

Separar **dados-base da espécie** de **dados da instância capturada**.
Isso evita duplicação e facilita balanceamento.

### 4.3 Combate automático

- Apenas um Pokémon é o combatente ativo.
- Os demais Pokémon equipados concedem bônus passivos conforme suas
  habilidades, tipos ou funções.
- O combate calcula turnos/intervalos de ataque de forma
  determinística ou pseudoaleatória controlada.
- Considerar dano, defesa, velocidade, vantagens e resistências de
  tipo, efeitos de status e habilidades.
- Mostrar HP, dano, progresso de combate e recompensas de forma
  legível.
- Derrotas devem ter consequência leve: por exemplo, retorno à rota ou
  pausa temporária, sem perda destrutiva de coleção.
- Os detalhes numéricos de dano e frequência de ataque serão ajustados
  durante o protótipo.

### 4.4 Experiência, níveis e evolução

- Inimigos concedem EXP e recursos.
- Subir de nível aumenta atributos e pode desbloquear movimentos.
- Evoluções usam requisitos configuráveis: nível, item, amizade,
  condição ou outro gatilho suportado.
- A evolução pode ser automática ou solicitar confirmação, conforme
  configuração do jogador.
- Evoluir deve produzir uma mudança relevante de atributos, aparência
  e/ou habilidade.
- Curvas de EXP devem ser configuráveis por espécie ou grupo, se
  necessário.

### 4.5 Captura e coleção

- Espécies aparecem conforme região, rota, condições e tabelas de
  encontro.
- Capturas usam uma chance calculada com base em regras configuráveis.
- Espécies raras e variantes shiny têm probabilidades definidas em
  dados, não espalhadas no código.
- A Pokédex registra descobertas, capturas, formas e marcos de
  coleção.
- Duplicatas podem ser usadas em pesquisa, treinamento ou melhorias;
  não devem ser inúteis.
- A captura automática será uma melhoria desbloqueável, não
  obrigatória desde o início.

### 4.6 Equipe e bônus passivos

- Uma vaga ativa no começo; vagas passivas adicionais são
  desbloqueadas por progressão.
- O Pokémon ativo participa diretamente do combate.
- Pokémon passivos contribuem com bônus, como EXP, moedas, captura,
  HP, dano, defesa ou eficiência contra certos tipos.
- Definir limites e regras de empilhamento para evitar combinações
  dominantes.
- A tela da equipe deve explicar claramente a contribuição de cada
  Pokémon.

### 4.7 Regiões, rotas e chefes

- O mundo é dividido em regiões; cada região contém rotas e encontros
  próprios.
- Cada rota tem faixa de poder, tabela de inimigos, recompensas e
  requisitos de desbloqueio.
- Chefes e líderes funcionam como testes de progressão.
- Vencer chefes desbloqueia novas rotas, recursos ou sistemas.
- O conteúdo deve ser orientado por dados para permitir adicionar
  regiões sem alterar o motor principal.

### 4.8 Progresso offline

- Salvar o instante da última sessão válida.
- Ao iniciar, calcular o tempo transcorrido e aplicar um limite máximo
  configurável.
- Simular progresso com base na eficiência estimada da última rota e
  da equipe salva.
- Conceder EXP, moedas e recompensas elegíveis; capturas offline podem
  ser limitadas ou desbloqueadas posteriormente.
- Mostrar um relatório de retorno com tempo contabilizado e
  recompensas.
- Tratar horários inválidos, intervalos negativos e mudanças grandes
  no relógio com regras previsíveis.
- O progresso offline deve usar uma função de cálculo separada do loop
  visual do combate.

### 4.9 Economia e recursos

Recursos iniciais sugeridos: - **Moedas:** melhorias comuns e itens
básicos. - **Itens de captura:** tentativas de captura, se o jogo adotar
consumíveis. - **Materiais de evolução:** evoluções específicas. -
**Pontos de pesquisa:** gerados por descobertas ou duplicatas. - **Moeda
de prestígio:** progressão de longo prazo após reinício parcial.

Cada recurso precisa de fontes, usos, limites e ritmo de aquisição
definidos. Evitar recursos que não tenham utilidade clara.

### 4.10 Progressão de longo prazo

Sistemas previstos para o jogo completo: - Pokédex e conquistas; -
maestria por espécie; - laboratório/pesquisa; - ginásios e Liga; -
desafios e eventos; - prestígio com bônus permanentes; - áreas avançadas
e encontros raros.

A implementação deve ser incremental. Esses sistemas não precisam estar
presentes no primeiro protótipo.

## 5. Estrutura de interface

### Tela principal

- área central para batalha e sprite do Pokémon ativo;
- barras de HP e progresso;
- inimigo atual, nível e recompensas;
- região/rota atual e avanço até o chefe;
- recursos e nível do treinador;
- atalhos para equipe, Pokédex, melhorias, missões e configurações.

### Telas secundárias

- **Equipe:** Pokémon ativo, passivos, bônus e formação.
- **Pokédex:** espécies vistas, capturadas, variantes e filtros.
- **Detalhes do Pokémon:** atributos, movimentos, evolução, potencial
  e maestria.
- **Mapa:** regiões, rotas, requisitos e chefes.
- **Melhorias:** automações, bônus permanentes e pesquisa.
- **Relatório offline:** recompensas acumuladas desde a última sessão.
- **Configurações:** volume, velocidade de animação, números de dano,
  acessibilidade, salvamento e idioma.

A interface deve priorizar clareza e leitura. Animações não podem
bloquear cliques nem atrasar cálculos de progressão.

## 6. Direção artística e áudio

- Pixel art 2D consistente, com escala de sprites e paleta
  controladas.
- Animações curtas para ataque, dano, captura, evolução e vitória.
- Interface com fontes legíveis e contraste adequado.
- Efeitos sonoros distintos para ações importantes, com controle de
  volume.
- Música ambiente opcional e sem interferir no uso prolongado.
- Usar placeholders durante o desenvolvimento; substituir por assets
  finais quando a direção visual estiver validada.

**Propriedade intelectual:** Pokémon, nomes, sprites, artes, sons e
outros elementos oficiais pertencem aos respectivos titulares. Para uma
distribuição pública ou comercial, avaliar autorização/licenciamento.
Uma alternativa é criar espécies, nomes, mundo e artes originais
inspirados no gênero, sem copiar elementos protegidos.

## 7. Arquitetura técnica recomendada

### Stack sugerida

**React + TypeScript + Vite** para a interface e os sistemas de jogo,
empacotados para PC com **Tauri** quando o protótipo web estiver
estável.

Motivos: - interface com menus, inventário, tabelas e telas de
gerenciamento; - lógica tipada e modular; - prototipagem rápida no
navegador; - possibilidade de distribuir como aplicativo desktop; -
persistência local sem exigir servidor para a primeira versão.

Alternativa: Godot, caso a prioridade passe a ser mapa explorável, cenas
animadas e fluxo de jogo tradicional. Para o formato idle baseado em
interface, React + TypeScript é uma opção inicial eficiente.

### Princípios de arquitetura

- Separar regras de jogo da interface e da renderização.
- Manter dados de espécies, itens, encontros e regiões em arquivos de
  dados versionados.
- Evitar dependência de componentes visuais para calcular EXP, dano ou
  recompensas.
- Usar identificadores estáveis para espécies e instâncias.
- Centralizar balanceamento em configurações.
- Criar testes unitários para fórmulas e salvamento.
- Não exigir backend na primeira versão; avaliar sincronização em
  nuvem apenas depois.

### Módulos sugeridos

- `game-data`: espécies, movimentos, tipos, itens, regiões e tabelas
  de encontro.
- `combat`: ordem de ações, dano, status, vitória e derrota.
- `progression`: EXP, níveis, evolução, maestria e prestígio.
- `capture`: encontros, probabilidades, captura e shiny.
- `team`: Pokémon ativo, vagas passivas e cálculo de bônus.
- `offline`: cálculo de tempo e recompensas offline.
- `economy`: recursos, custos, recompensas e melhorias.
- `pokedex`: registros e conquistas de coleção.
- `save`: serialização, migração de versões e recuperação de dados.
- `ui`: telas, componentes, feedback e acessibilidade.
- `audio-art`: carregamento e configuração de assets.

### Modelo de dados inicial

Entidades principais: - `Species`: dados-base da espécie. -
`PokemonInstance`: espécie, nível, EXP, modificadores e progresso
individual. - `Move`: tipo, potência, categoria, efeitos e parâmetros. -
`Area` / `Route`: requisitos, encontros, inimigos e recompensas. -
`PlayerState`: equipe, coleção, recursos, desbloqueios e progresso. -
`SaveMetadata`: versão do formato, horário de salvamento e versão do
jogo.

Os nomes acima são contratos conceituais; os tipos definitivos devem ser
escritos em TypeScript durante a implementação.

### Salvamento

- Salvamento local automático em momentos seguros e após mudanças
  importantes.
- Um formato versionado com migrações explícitas.
- Proteção contra dados incompletos e recuperação de um backup
  anterior.
- Exportação/importação manual de save pode ser adicionada cedo para
  testes.
- Não armazenar segredos ou dados pessoais desnecessários.

## 8. Escopo por fases

### Fase 0 --- Fundação

- Criar repositório e projeto.
- Configurar TypeScript, lint, formatação e testes.
- Definir estrutura de módulos e modelo de save.
- Criar a tela inicial e layout principal com assets temporários.

**Critério de conclusão:** o projeto inicia localmente, compila e tem
estrutura testável.

### Fase 1 --- Protótipo jogável

- Seleção de inicial.
- Um Pokémon ativo e um inimigo.
- Combate automático.
- EXP, níveis e moedas.
- Uma rota com progressão simples.
- Salvamento e carregamento local.

**Critério de conclusão:** o jogador consegue iniciar, lutar, subir de
nível, fechar o jogo e continuar do mesmo ponto.

### Fase 2 --- Loop idle

- Múltiplas rotas e desbloqueios.
- Cálculo de progresso offline.
- Relatório de retorno.
- Curvas de EXP e recompensas configuráveis.
- Tratamento básico de relógio inválido.

**Critério de conclusão:** o retorno após fechar o jogo concede
recompensas coerentes e limitadas.

### Fase 3 --- Coleção e evolução

- Captura manual.
- Pokédex.
- Evoluções e requisitos.
- Pokémon duplicados e uso em pesquisa.
- Primeiras espécies e encontros configurados por dados.

**Critério de conclusão:** capturas são salvas, registradas e têm
utilidade de progressão.

### Fase 4 --- Equipe estratégica

- Vagas passivas desbloqueáveis.
- Bônus passivos e regras de empilhamento.
- Tela de equipe e explicação dos efeitos.
- Balanceamento de sinergias.

**Critério de conclusão:** mudar os Pokémon passivos produz diferenças
mensuráveis e compreensíveis.

### Fase 5 --- Conteúdo de campanha

- Regiões e rotas adicionais.
- Chefes e ginásios.
- Itens, habilidades e desafios.
- Progressão e economia balanceadas.

**Critério de conclusão:** o jogador tem uma sequência de objetivos de
curto e médio prazo.

### Fase 6 --- Endgame e acabamento

- Prestígio.
- Maestria e conquistas.
- Shinies e encontros raros.
- Polimento de pixel art, animações, áudio e acessibilidade.
- Testes de desempenho, saves e casos extremos.

**Critério de conclusão:** sistemas de longo prazo funcionam e o jogo
pode ser empacotado para distribuição de teste.

## 9. Fora do escopo inicial

Para reduzir risco e complexidade, não incluir no primeiro ciclo: -
multiplayer, PvP ou trocas online; - servidor, contas e sincronização em
nuvem; - economia com microtransações; - exploração livre em mapas
grandes; - reprodução completa de todas as mecânicas dos jogos
oficiais; - suporte a todas as espécies antes de validar o loop
principal.

Esses itens podem ser avaliados depois do protótipo e do teste de
retenção.

## 10. Requisitos não funcionais

- Interface responsiva às resoluções de janela suportadas.
- Cálculos de progressão desacoplados de FPS e animações.
- Salvamento resiliente a encerramento inesperado.
- Fórmulas determinísticas sempre que possível e testáveis.
- Carregamento rápido e consumo moderado de memória.
- Controles acessíveis por mouse e teclado.
- Textos preparados para localização futura.
- Logs úteis durante desenvolvimento, sem expor dados pessoais.

## 11. Métricas de qualidade e balanceamento

Durante os testes, acompanhar: - tempo até a primeira evolução; - tempo
até desbloquear a segunda rota; - duração média para derrotar um
inimigo; - frequência de bloqueios de progressão; - valor relativo dos
bônus passivos; - proporção entre ganhos e gastos de recursos; -
coerência entre progresso ativo e offline; - quantidade de decisões
relevantes por sessão.

Os valores-alvo devem ser definidos após testar o protótipo, em vez de
fixar números arbitrários antes de observar o ritmo real.

## 12. Riscos principais

---

Risco Mitigação

---

Escopo excessivo por quantidade de Começar com um conjunto reduzido e
espécies usar dados expansíveis.

Progressão trivial ou lenta demais Testar curvas e custos com
telemetria local de
desenvolvimento.

Bônus passivos sem escolhas reais Limitar empilhamento e criar
funções diferentes para cada bônus.

Manipulação do tempo offline Limitar horas contabilizadas e
validar intervalos
negativos/anormais.

Saves corrompidos Versionamento, validação, backup e
testes de migração.

Dependência de assets protegidos Usar placeholders e avaliar assets
originais/licenciamento antes de
distribuir.

Muitas telas antes de validar Priorizar o loop de combate e
diversão progressão no protótipo.
-----------------------------------------------------------------------

## 13. Próximo passo concreto

**Construir a Fase 1: um protótipo jogável mínimo.** Não começar
implementando todas as regiões, espécies ou sistemas avançados.

Ordem de execução: 1. Criar o projeto React + TypeScript + Vite. 2.
Montar a tela principal com o Pokémon ativo, inimigo, HP, EXP e moedas. 3. Criar dados de teste para três iniciais e alguns inimigos. 4.
Implementar combate automático com fórmula de dano isolada. 5.
Implementar EXP, subida de nível e recompensas. 6. Persistir o estado
localmente e testar recarga. 7. Validar o ritmo e só então adicionar o
progresso offline.

### Critério de aceite do primeiro protótipo

- O jogador escolhe um inicial.
- O Pokémon luta automaticamente contra inimigos de uma rota.
- Vitória concede EXP e moedas.
- A subida de nível atualiza atributos.
- O estado permanece após fechar e reabrir o jogo.
- Fórmulas principais têm testes unitários.
- A interface permite acompanhar o progresso sem consultar logs.

## 14. Decisões ainda abertas

- O jogo usará nomes e assets oficiais em protótipo privado ou
  criaturas originais?
- A captura será baseada em itens consumíveis, chance direta ou ambos?
- Qual será o limite de horas de progresso offline?
- O jogador poderá trocar livremente o Pokémon ativo durante o
  combate?
- A evolução será automática, manual ou configurável?
- Qual será o conjunto inicial de espécies e regiões para a primeira
  versão?

Essas decisões devem ser tomadas conforme forem necessárias para
implementar a próxima fase, evitando bloquear o protótipo com
planejamento excessivo.

---

## Resumo executivo

PokéIdle será um RPG idle 2D para PC, com pixel art, combate automático
de um Pokémon ativo, bônus passivos de equipe, captura, evolução,
regiões, chefes e progressão offline. A arquitetura proposta separa
regras de jogo, dados, interface e salvamento, permitindo ampliar
conteúdo sem reescrever o núcleo.

A prioridade é validar um loop pequeno e completo --- **escolher inicial
→ combater → ganhar EXP → subir de nível → salvar → continuar** ---
antes de investir no volume de conteúdo do jogo completo.
