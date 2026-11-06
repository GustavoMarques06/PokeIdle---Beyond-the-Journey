import type { Section } from '../types';

export const SYSTEM: Section = {
  id: 'sistema',
  title: 'Salvar, celular e opções',
  icon: 'teachy-tv',
  blurb: 'Como o jogo salva, como levar para outro aparelho, atalhos e acessibilidade.',
  items: [
    {
      id: 'salvar',
      q: 'Como salvo meu jogo?',
      keywords: 'save salvar progresso perder backup autosave',
      a: [
        {
          p: 'O jogo **salva sozinho**, a cada poucos segundos e sempre que você fecha. Você não precisa fazer nada.',
        },
        {
          ul: [
            '**No navegador (celular ou computador):** o save fica **dentro do próprio navegador**, neste aparelho. Se você **limpar os dados do site**, apagar o histórico "completo" ou usar a navegação anônima, o save **se perde**.',
            '**No aplicativo de Windows:** o save fica em arquivos no seu computador, com um backup por dia (os 7 mais recentes).',
          ],
        },
        {
          warn: 'Para ficar tranquilo, faça um **backup de vez em quando**: aba **TREINADOR** → **SALVAR E TRANSFERIR** → gere o código (ou baixe o arquivo) e guarde num lugar seguro.',
        },
      ],
    },
    {
      id: 'transferir',
      q: 'Como levo meu jogo para outro aparelho?',
      keywords: 'transferir codigo pki1 exportar importar celular computador mudar nuvem',
      a: [
        {
          p: 'Não existe conta nem "nuvem". Em vez disso, o jogo gera um **código de transferência** (um texto que começa com **PKI1**):',
        },
        {
          ol: [
            'No aparelho **de origem**: aba **TREINADOR** → **SALVAR E TRANSFERIR** → **Gerar código de transferência**. Copie o texto (ou baixe o arquivo **.pkidle**).',
            'Envie o código para você mesmo (WhatsApp, e-mail...).',
            'No aparelho **de destino**: na tela inicial (ou na mesma seção) escolha **CARREGAR JOGO / Carregar código**, cole o texto e confirme.',
          ],
        },
        {
          warn: 'Carregar um código **substitui** a jornada que estiver no aparelho de destino. O jogo pergunta antes de confirmar.',
        },
      ],
    },
    {
      id: 'celular',
      q: 'Posso jogar no celular? Dá para instalar como aplicativo?',
      keywords: 'mobile android iphone pwa instalar app tela inicial',
      a: [
        {
          p: 'Pode. No celular, a tela vira **uma coluna só** (batalha em cima, menu de abas fixo embaixo; as telas abrem numa janela abaixo da batalha, que continua à vista) e funciona tanto **em pé** quanto **deitado**. Os botões têm tamanho bom para o toque.',
        },
        {
          ul: [
            '**Instalar:** no navegador do celular, use "Adicionar à tela inicial" (ou "Instalar app"). O jogo abre em tela cheia, como um aplicativo, e **funciona sem internet**.',
            'No **Windows**, existe também um instalador de aplicativo.',
          ],
        },
        {
          p: 'No celular, o jogo baixa sozinho só o essencial e os sprites conforme eles aparecem, para poupar seus dados. Para jogar **sem internet** com todos os Pokémon, vá em **TREINADOR** → **DADOS** → **Baixar tudo** (de preferência no Wi-Fi).',
        },
        {
          tip: 'Ao tocar numa aba do menu, a tela abre numa janela abaixo da batalha. O menu de ícones continua embaixo, para trocar de tela com um toque. **Segure** um botão ou ícone para ver a explicação dele.',
        },
      ],
    },
    {
      id: 'iphone-save',
      q: 'Como evito que o iPhone apague meu save?',
      keywords: 'iphone ipad safari apagou sumiu sete dias instalar tela de inicio backup proteger',
      a: [
        {
          p: 'No **Safari**, o iPhone pode apagar os dados de um site depois de **7 dias sem abri-lo**. Para o seu save não correr esse risco:',
        },
        {
          ol: [
            '**Instale o jogo:** no Safari, toque em **Compartilhar** e depois em **Adicionar à Tela de Início**. Jogue sempre pelo ícone: os dados do app instalado não têm esse limite de 7 dias.',
            '**Faça uma cópia de vez em quando:** **TREINADOR** → **DADOS** → **Baixar arquivo** (o jogo também lembra você disso). Guarde o arquivo em Arquivos ou no iCloud Drive.',
          ],
        },
        {
          tip: 'O app instalado e o Safari guardam saves separados. Se você já joga no Safari, baixe uma cópia lá e use **CARREGAR JOGO** no app. Só apague o Safari depois de conferir.',
        },
      ],
    },
    {
      id: 'atualizar',
      q: 'Como o jogo é atualizado?',
      keywords: 'update atualizar versao nova aviso',
      a: [
        {
          p: 'Quando sai uma versão nova, aparece o aviso **Nova versão do jogo!** no alto da tela. Toque em **Atualizar**: o jogo grava seu progresso e recarrega. Se escolher **Depois**, o aviso volta na próxima vez que abrir o jogo. É preciso estar com internet.',
        },
      ],
    },
    {
      id: 'opcoes',
      q: 'Onde mudo som, animações e outras opções?',
      keywords:
        'opcoes configuracoes volume musica som animacao contraste texto maior acessibilidade notificacoes',
      a: [
        {
          p: 'Na aba **TREINADOR**, no quadro **OPÇÕES**:',
        },
        {
          ul: [
            '**Evoluir automaticamente** e **Mostrar números de dano**.',
            '**Áudio:** volume, efeitos sonoros, gritos dos Pokémon e música.',
            '**Gráficos:** **Normal** (pixel art, o padrão) ou **Desempenho** (mais leve, para celulares simples: sem clima nem tons de dia e noite na cena e com menos efeitos).',
            '**Reduzir animações** e **velocidade das animações** (para quem se incomoda com movimento).',
            '**Contraste alto** e **Texto maior** (acessibilidade).',
            '**Avisar sobre:** escolha quais notificações quer receber (creche, expedições, visitantes, progresso, shiny).',
          ],
        },
      ],
    },
    {
      id: 'atalhos',
      q: 'Quais são os atalhos de teclado?',
      keywords: 'teclas atalho hotkey teclado',
      a: [
        {
          table: {
            head: ['Tecla', 'O que faz'],
            rows: [
              ['[[key:1]] a [[key:9]], [[key:0]]', 'Abrir as abas do menu na ordem (o 0 abre o PC).'],
              ['[[key:H]]', 'Abrir a AJUDA.'],
              ['[[key:Q]] / [[key:W]]', 'Lançar a Poké Ball / a melhor bola.'],
              ['[[key:D]]', 'Desafiar o chefe, a raide ou a Equipe Rocket, ou fazer a revanche.'],
              ['[[key:F]]', 'Fugir ou desistir.'],
              ['[[key:A]]', 'Alternar entre AUTO e MANUAL.'],
              ['[[key:M]]', 'Mega Evoluir (no modo manual).'],
              ['[[key:E]]', 'Alternar entre grama, pesca e surf (em áreas com água).'],
              ['[[key:B]]', 'Colher a árvore de berry da área.'],
              ['[[key:P]]', 'Tirar uma foto da batalha.'],
              ['[[key:Esc]]', 'Voltar ao menu da batalha ou fechar avisos.'],
            ],
          },
        },
        {
          p: 'A lista também aparece na aba TREINADOR, em **ATALHOS DE TECLADO**. No celular você usa só o toque.',
        },
      ],
    },
    {
      id: 'foto',
      q: 'Posso tirar foto da batalha?',
      keywords: 'foto print captura de tela screenshot',
      a: [
        {
          p: 'Pode. Toque no botão da **câmera** no canto da cena (ou aperte [[key:P]]). Uma imagem **PNG** da batalha, com legenda, é salva no seu aparelho.',
        },
      ],
    },
  ],
};

export const TROUBLE: Section = {
  id: 'problemas',
  title: 'Problemas comuns',
  icon: 'escape-rope',
  blurb: 'Respostas rápidas para as dúvidas e travas mais frequentes.',
  items: [
    {
      id: 'preso-no-chefe',
      q: 'Não consigo vencer o chefe. O que faço?',
      keywords: 'travado dificil preso nao consigo ganhar lider derrota fraco',
      a: [
        { p: 'Tente nesta ordem:' },
        {
          ol: [
            '**Mais nível:** volte a lutar na área (ou em uma anterior) por um tempo. Os Pokémon sobem de nível sozinhos. Olhe a **chance estimada** no painel Próximos passos.',
            '**Tipos:** veja o tipo do chefe e leve Pokémon com **vantagem** (veja "O que são tipos...").',
            '**Equipe completa:** preencha todas as vagas liberadas. Cada Pokémon na equipe dá bônus e entra quando o anterior cai.',
            '**Evolua** quem puder, e dê **itens segurados** (Leftovers, Choice Band...).',
            '**Golpes:** edite os golpes na ficha para ter um de cada tipo importante.',
            '**Melhorias:** gaste pontos de pesquisa em **Estudo de treino** e **Primeiros socorros**.',
            '**Modo MANUAL:** você pode escolher o golpe certo contra o chefe (cuidado com o tempo).',
          ],
        },
        {
          tip: 'Perder **não custa nada**: sua equipe é curada e você pode tentar de novo na hora.',
        },
      ],
    },
    {
      id: 'sem-bolas',
      q: 'Não consigo capturar. O botão fica cinza.',
      keywords: 'captura bloqueada sem bola nao posso nuzlocke',
      a: [
        {
          ul: [
            '**Sem bolas:** compre mais na **LOJA** (Poké Mart).',
            '**Durante a troca de inimigo:** espere o próximo Pokémon aparecer.',
            '**Lutas de chefe:** não dá para capturar o Pokémon de um treinador.',
            '**Nuzlocke:** se você escolheu esse desafio, só a **primeira captura de cada área** vale.',
            '**Lendários:** só pela atividade Lendários, com bolas limitadas.',
          ],
        },
      ],
    },
    {
      id: 'nao-evolui',
      q: 'Meu Pokémon não evolui.',
      keywords: 'evolucao nao evolui travado pedra nivel',
      a: [
        {
          ul: [
            'Veja na **ficha** o texto que diz **o que falta** (nível, pedra, amizade ou troca).',
            'Se ele estiver segurando ou com **Travar evolução** ligado (Everstone), libere em **Mais ações**.',
            'Se for **pedra**, compre na LOJA e use na ficha (botão com o nome da pedra).',
            'Se for **troca**, precisa do **Cabo Link** com um amigo.',
            'Verifique se **Evoluir automaticamente** está desligado nas Opções: nesse caso, é você quem confirma no botão **Evoluir**.',
          ],
        },
      ],
    },
    {
      id: 'nao-acho-aba',
      q: 'Não encontro a LOJA, o MAPA, as ATIVIDADES...',
      keywords: 'aba sumiu desbloquear loja mapa atividades missoes melhorias pc',
      a: [
        {
          p: 'Elas aparecem **conforme você progride** (veja a tabela em "Por que algumas abas do menu não aparecem?"). A LOJA aparece depois de 10 vitórias; ATIVIDADES, depois do primeiro ginásio. Continue jogando e elas surgem com o selo **NOVO**.',
        },
      ],
    },
    {
      id: 'sem-mega',
      q: 'O botão MEGA não aparece.',
      keywords: 'mega evolucao botao nao aparece pedra',
      a: [
        {
          ul: [
            'O botão só existe no modo **MANUAL** (no AUTO a Mega Evolução é automática).',
            'O Pokémon que **está lutando** precisa estar **segurando a Mega Stone da espécie dele** (e já evoluído).',
            'Só dá para Mega Evoluir **uma vez por encontro**. No encontro seguinte, o botão volta.',
          ],
        },
      ],
    },
    {
      id: 'sem-som',
      q: 'Não ouço nenhum som.',
      keywords: 'audio mudo musica som volume',
      a: [
        {
          ul: [
            'Os navegadores só liberam o som **depois do primeiro toque ou clique**. Toque na tela uma vez.',
            'Confira em **TREINADOR → OPÇÕES → Áudio** se o volume, os efeitos e a música estão ligados.',
            'Veja também o volume do aparelho e se ele não está no silencioso.',
          ],
        },
      ],
    },
    {
      id: 'perdi-save',
      q: 'Meu progresso sumiu!',
      keywords: 'save sumiu perdi progresso apagou recuperar',
      a: [
        {
          p: 'No navegador, o save fica guardado **nele**. Ele some se você limpou os dados do site, trocou de navegador ou aparelho, ou abriu uma janela anônima. Verifique:',
        },
        {
          ul: [
            'Você está usando o **mesmo navegador e o mesmo endereço** de antes?',
            'Tem um **código de transferência** (PKI1...) ou um arquivo **.pkidle** guardado de um backup? Use **CARREGAR JOGO**.',
            'No aplicativo de Windows, existem backups diários dos últimos 7 dias na pasta de saves do jogo.',
          ],
        },
        {
          tip: 'Para nunca passar por isso, faça um backup de vez em quando (veja "Como salvo meu jogo?"). O jogo lembra você a cada 7 dias. No iPhone, veja também "Como evito que o iPhone apague meu save?".',
        },
      ],
    },
    {
      id: 'lento',
      q: 'O jogo ficou pesado ou lento no celular.',
      keywords: 'travando lag lento pesado desempenho bateria',
      a: [
        {
          ul: [
            'Ligue **Reduzir animações** nas Opções.',
            'Feche outras abas e aplicativos do navegador.',
            'Se o aparelho for bem simples, desligue os **números de dano** e a **música**.',
          ],
        },
      ],
    },
  ],
};

export const GLOSSARY: Section = {
  id: 'glossario',
  title: 'Glossário',
  icon: 'fame-checker',
  blurb: 'Palavras que aparecem no jogo, em ordem alfabética.',
  items: [
    {
      id: 'glossario-a-m',
      q: 'Glossário (A a M)',
      keywords: 'significado termos palavras vocabulario dicionario',
      a: [
        {
          table: {
            head: ['Palavra', 'Significado'],
            rows: [
              ['**Área / Rota**', 'Cada lugar do mapa onde você luta (Rota 1, Floresta de Viridian...).'],
              ['**Atividade**', 'Tarefa paralela da aba ATIVIDADES (creche, jardim, torneio...).'],
              ['**AUTO / MANUAL**', 'Os dois modos de batalha: automático ou com você escolhendo os golpes.'],
              ['**Berry**', 'Fruta que cura o Pokémon.'],
              ['**Campeão**', 'O último treinador da Liga de cada região.'],
              [
                '**Chefe**',
                'O treinador que protege o fim de uma área (líder de ginásio, Elite dos Quatro...).',
              ],
              ['**Crítico**', 'Golpe que causa mais dano por sorte.'],
              ['**EV**', '"Valor de esforço": o treino do Pokémon (até 252 por atributo).'],
              ['**EXP**', 'Experiência: o que faz o Pokémon subir de nível.'],
              ['**HP**', 'Pontos de vida.'],
              ['**Idle**', 'Tipo de jogo que continua andando sozinho, mesmo sem você mexer.'],
              ['**Insígnia**', 'Prêmio por vencer um líder de ginásio.'],
              ['**IV**', '"Valor individual": a genética do Pokémon (0 a 31 por atributo).'],
              ['**Hall da Fama**', 'Onde fica registrada a equipe que venceu o Campeão.'],
              ['**Maestria**', 'Nível extra que sobe lutando com uma espécie (e as evoluções dela).'],
              ['**Mega Stone**', 'Pedra que permite a Mega Evolução do Pokémon que a segura.'],
            ],
          },
        },
      ],
    },
    {
      id: 'glossario-n-z',
      q: 'Glossário (N a Z)',
      keywords: 'significado termos palavras vocabulario dicionario',
      a: [
        {
          table: {
            head: ['Palavra', 'Significado'],
            rows: [
              ['**Natureza**', 'A "personalidade": sobe um atributo em 10% e desce outro em 10%.'],
              ['**Nuzlocke**', 'Desafio com regras duras (uma captura por área; quem desmaia sai).'],
              ['**Offline**', 'Com o jogo fechado: ele continua calculando o progresso.'],
              [
                '**Pesquisa**',
                'Pontos para comprar melhorias permanentes, ganhos com repetidos e espécies novas.',
              ],
              ['**Potencial**', 'Nota de 0% a 100% da soma dos IVs de um Pokémon.'],
              ['**Prestígio**', 'Recomeçar a jornada em troca de pontos para melhorias mais fortes.'],
              ['**Raide**', 'Chefe gigante que aparece por pouco tempo.'],
              ['**Reserva**', 'Pokémon da equipe que espera a vez de lutar.'],
              ['**Shiny**', 'Versão rara de outra cor.'],
              ['**STAB**', 'Bônus de 50% quando o golpe é do mesmo tipo do Pokémon.'],
              ['**Super efetivo**', 'Golpe que causa o dobro de dano por vantagem de tipo.'],
              ['**TM**', 'Disco que ensina um golpe.'],
              ['**Transferir**', 'Enviar um repetido ao laboratório em troca de pontos de pesquisa.'],
              ['**Troca**', 'Dar um Pokémon a um amigo pelo Cabo Link.'],
            ],
          },
        },
      ],
    },
  ],
};
