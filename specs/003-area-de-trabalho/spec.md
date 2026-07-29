# Feature Specification: Área de trabalho

**Feature Branch**: `area-de-trabalho`

**Created**: 2026-07-28

**Status**: Draft

**RF cobertos:** RF-24, RF-25, RF-26

**Input**: User description: "Especifique a spec vertical area-de-trabalho do editor visual de diagramas mermaid, usando area-de-trabalho como nome curto da feature e do branch, para que a spec nasça em specs/###-area-de-trabalho. Resultado observável: ao final, a pessoa arrasta a divisão entre o editor de código e a área do diagrama e passa a trabalhar na proporção que escolheu; navega por um diagrama maior que a tela, aproximando e afastando o zoom e arrastando a área visível com o cursor hand; e devolve o diagrama inteiro ao enquadramento da tela, ou o zoom ao tamanho natural, com um gesto — tudo sem perder o que já construiu e sem que nada disso apareça no código mermaid copiado. Contexto, como referência e não como requisito a copiar: RF-24 (redimensionar o editor de código e a área do diagrama), RF-25 (navegar na área do diagrama com zoom e movimentação por cursor hand) e RF-26 (ajustar o diagrama à tela e resetar o zoom), do épico E6 — Área de trabalho e sessão. Emolduram esta spec três restrições de produto já decididas: R-03 (ADR-003) — diagrama e código são duas vistas do mesmo modelo e o que é efêmero não é projetado, então proporção dos painéis, enquadramento e nível de zoom são conforto de sessão e nunca viajam no código entregue, coerente com a RN-01; R-04 (ADR-004) — o envelope de densidade suportado é compromisso do produto (NFR-03: 400 nós e 500 conexões, com gesto contínuo em pelo menos 50fps), e zoom e movimentação são gestos contínuos que consomem desse orçamento; R-05 (ADR-005) — quem cria elemento por teclado tem o dever de trazê-lo para a área visível, de modo que é esta spec que estabelece o que área visível significa para as demais. Fora do escopo desta spec: recuperar o rascunho ao reabrir a aba e o aviso de rascunho perdido (RF-27 e RF-28), o aviso de envelope estourado (RF-29) e o gesto de organizar o diagrama (épico E4) são specs próprias — mover a área visível nunca move elemento, e mudar o enquadramento nunca é rearranjo. Não cite linguagem, framework nem bibliotecas em lugar algum da spec: a stack fica no plan, e também não entram contratos, esquema de dados nem estrutura de código. Inclua no spec.md uma linha rotulada exatamente assim: **RF cobertos:** RF-24, RF-25, RF-26."

## Por que esta spec existe

O walking skeleton (`specs/001-cano-modelo-codigo`, R0) provou que **diagrama e código são duas
vistas de um modelo só**, e `specs/002-elementos-grafo-dirigido` encheu esse cano com o vocabulário
do grafo dirigido — nós, conexões e agrupamentos, montados e corrigidos por gestos. Nas duas, a área
do diagrama foi um **plano rolável** e nada mais: rolar bastava para que nenhum nó ficasse
inalcançável (`001`, `FR-007`), e essa foi explicitamente a fronteira herdada — *"zoom, pan por
arraste e ajustar à tela continuam com `area-de-trabalho`"*.

Esta é a spec que cobra essa promessa. Ela não acrescenta **nenhum** vocabulário ao diagrama: não
cria elemento, não muda elemento, não mexe no código. O que ela entrega é o **lugar de trabalho** —
quanto da tela cabe a cada vista, de onde a pessoa está olhando o plano, e em que escala. Com 400 nós
no envelope declarado, um diagrama é rotineiramente maior que a tela, e sem zoom, sem arrastar o
enquadramento e sem um gesto que devolva o diagrama inteiro ao quadro, a sessão real de diagramação
da R1 não fecha.

Três fronteiras a emolduram, e nenhuma delas se move aqui:

- **Nada disso é do modelo** (`R-03`, `RN-01`). Proporção das áreas, enquadramento e nível de zoom são
  conforto de sessão exatamente como a posição de um elemento: vivem na sessão e **nunca** viajam no
  código entregue. Copiar o código depois de qualquer gesto desta spec devolve o mesmo texto byte a
  byte.
- **Nada disso é rearranjo** (`RN-03`, `R-07`). Mover a área visível nunca move elemento; mudar o
  enquadramento nunca é organizar o diagrama. Organizar é gesto explícito de `layout-automatico`
  (`RF-14`), e depois de ajustar à tela o diagrama continua arranjado exatamente como estava — só
  está sendo olhado de outro lugar.
- **Zoom e movimentação são gestos contínuos** (`R-04`, `NFR-03`). Eles consomem do orçamento de
  fluidez do produto — 400 nós e 500 conexões a **≥50fps** — como qualquer outro gesto contínuo.

E uma quarta fronteira, que é dívida que esta spec **paga para as outras**: o `R-05` diz que quem cria
elemento por teclado tem o dever de trazê-lo para a **área visível**. Até aqui, "área visível" era uma
palavra sem dono. É esta spec que a define e que oferece a capacidade de trazer um elemento para
dentro dela — **quando** e **por qual gesto** isso é acionado continua sendo de quem chama
(`RF-11`, de `ciclo-por-teclado`).

## Clarifications

### Session 2026-07-28

- Q: Em que enquadramento e em que zoom a área de trabalho abre quando o diagrama **não** está vazio
  (rascunho restaurado por `RF-27` ou documento inteiro colado no editor de código)? → A: Com
  conteúdo, abre **ajustada à tela**; vazia, abre no **padrão declarado** — uma regra só, e nunca se
  abre olhando para o vazio.
- Q: O que acontece quando a **janela** fica menor que a soma dos mínimos declarados das duas vistas,
  ponto em que o mínimo do arrasto da divisão não protege ninguém? → A: Os mínimos são invioláveis: a
  área de trabalho para de encolher na soma deles e a página passa a rolar horizontalmente — nenhuma
  das duas vistas cede à outra.
- Q: O que acontece quando um gesto desta spec (zoom por roda ou atalho, ajustar à tela, resetar,
  `FR-012`) chega com um **arrasto contínuo já em curso** — arrastar elemento, seleção retangular,
  arrastar a divisão? → A: Os dois convivem — o enquadramento muda por baixo do arrasto, que
  permanece ancorado no **ponto do plano** que pegou, não no ponto da tela.
- Q: Quais dos gestos desta spec têm caminho garantido **sem ponteiro**? → A: Zoom, ajustar à tela e
  resetar têm; mover o enquadramento livremente é gesto de ponteiro — por teclado se chega pelo
  `FR-012` e por ajustar à tela.
- Q: O modo hand é o **único** caminho de ponteiro para mover o enquadramento? → A: Não — ele governa
  o arrasto que também poderia ser seleção; o `plan` PODE oferecer um gesto auxiliar distinto que move
  o enquadramento sem entrar no modo, desde que explícito e sem alterar a seleção.
- Q: O piso da faixa de zoom é um número fixo, ou acompanha o conteúdo corrente — já que um arranjo
  livre pode exigir escala menor que a do envelope compacto? → A: A faixa é **estável** e governa o
  **gesto contínuo**; **ajustar à tela não se submete a ela** e desce abaixo do piso quando o arranjo
  corrente exigir — nunca é recortado, e nada reescala sozinho quando o conteúdo encolhe.
- Q: Que geometria conta como "o diagrama inteiro" (`FR-008`) e como "estar na área visível"
  (`FR-011`) — caixas dos nós, ou tudo o que é desenhado? → A: A **extensão desenhada inteira**:
  caixas dos nós, traçado das conexões (inclusive laços e arestas paralelas que arqueiam para fora),
  rótulos de conexão e molduras de agrupamento — a **mesma** extensão nos dois requisitos.
- Q: Ajustar à tela, resetar o zoom e trazer para a área visível **saltam** até o destino ou
  **transitam** até ele? → A: O **destino** é de produto e o **trânsito** é do `plan`, sob quatro
  invariantes: destino idêntico ao do salto, gesto novo no meio **interrompe e assume**, trânsito
  dentro do `≥50fps`, e a âncora do `FR-015` valendo a cada quadro. O `SC-012` mede o tempo até o
  gesto **responder**, não a duração do trânsito.
- Q: Com a janela abaixo da soma dos mínimos e a página rolando horizontalmente (`FR-006`), "área
  visível" é a área do diagrama inteira ou só o que a tela está de fato mostrando? → A: Só o que a
  tela está mostrando — a área visível **encolhe** para essa parte, de modo que o `FR-012` nunca
  deposite um elemento num pedaço fora dos olhos. Sem rolagem de página, as duas coisas coincidem.
- Q: Arrastar a divisão (`FR-006`) tem caminho **sem ponteiro**, ou o silêncio do `FR-018` era um
  "não"? → A: Era um "não", e o `FR-018` passa a dizê-lo: a enumeração é **exaustiva** — mover o
  enquadramento livremente e mudar a proporção são gestos de ponteiro. Nenhum dos dois é beco sem
  saída, e teclas para eles seriam afordância de `ciclo-por-teclado`.
- Q: Quando a **janela** muda de tamanho, o que é preservado — a **razão** entre as duas vistas, ou a
  largura absoluta de uma delas? → A: A **razão**. A proporção é dela e não muda sozinha: as duas
  vistas crescem e encolhem juntas na mesma fração, recortadas pelos mínimos declarados. Mudar o
  tamanho da janela muda os **tamanhos**, não a **proporção**.
- Q: Qual é o **enquadramento resultante** de ajustar à tela (`FR-008`), já que "tudo dentro com
  folga" também é satisfeito por um diagrama parado no canto? → A: **Centralizado** — o centro da
  extensão desenhada termina no centro da área visível, inclusive quando é o teto do tamanho natural
  que dita a escala. O gesto passa a ter resultado único a partir de qualquer enquadramento de
  partida.
- Q: O piso da faixa de zoom é estável também sob mudança de **tamanho da área do diagrama** — já que
  "a escala necessária para o envelope caber" encolhe junto com a área visível? → A: Sim, a faixa é
  **fixa nos dois eixos**. O compromisso do `FR-001` é honrado contra um **tamanho de referência
  declarado** da área do diagrama; com a área menor que a referência, o gesto contínuo satura no piso
  e quem entrega o diagrama inteiro é o `FR-008`, pela válvula que ele já tem.
- Q: O que é "o **começo do elemento na ordem de leitura**" (`FR-012`), já que a ordem de leitura é
  relativa à orientação e a orientação é de outra spec? → A: É **geométrico e relativo à orientação
  corrente** — o canto da extensão desenhada em que a ordem de leitura do diagrama começa —, com o
  mesmo sentido que o termo tem na constitution (Princípio VI, medido nas 4 orientações). Uma regra
  só para nó, conexão e agrupamento.
- Q: A área visível desconta o que o **próprio produto sobrepõe** à área do diagrama — controles
  flutuantes, o indicador de zoom, painéis persistentes? → A: **Desconta**, pela mesma regra que já a
  faz encolher com a rolagem de página: ela é o que a pessoa **vê** do plano, não o que a proporção
  reservou. `FR-008`, `FR-011` e `FR-012` medem contra a região descontada.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navego num diagrama maior que a tela (Priority: P1)

Marina montou um fluxo que já não cabe na tela. Ela afasta o zoom para ver a espinha inteira, aproxima
de novo sobre o trecho que quer corrigir, e arrasta a área visível pelo plano com o cursor hand para
alcançar um canto distante. O diagrama não muda — nenhum nó se move, nenhuma linha do código muda —,
muda de onde ela o está olhando e em que escala.

**Why this priority**: é a razão de a spec existir e a fundação das outras duas histórias. É o zoom e
o arrasto do enquadramento que criam a noção de **área visível** sobre a qual a História 3 opera e da
qual o `R-05` depende; sem eles não há enquadramento a ajustar nem escala a resetar. É um MVP viável
sozinha: com a proporção fixa e sem gesto de ajustar à tela, um diagrama de 400 nós já se torna
trabalhável.

**Independent Test**: sobre um diagrama maior que a área do diagrama, afastar o zoom e conferir que
mais elementos aparecem sem que nenhum mude de posição no plano; entrar no modo hand, arrastar e
conferir que a área visível se deslocou, que nenhum elemento foi movido ou selecionado e que o código
permaneceu byte-idêntico.

**Acceptance Scenarios**:

1. **Given** um diagrama maior que a área do diagrama, **When** Marina aproxima e afasta o zoom por
   gesto de ponteiro, **Then** a escala do desenho muda, o ponto do plano que estava sob o ponteiro
   continua sob o ponteiro, e **nenhum** elemento muda de posição no plano.
2. **Given** o zoom em qualquer nível, **When** Marina o leva até o limite mínimo ou máximo, **Then**
   o zoom **para no limite** e continua respondendo aos gestos — não salta, não trava a área do
   diagrama e não falha em silêncio; o nível corrente permanece legível para ela.
3. **Given** a área do diagrama com o modo hand ativo, **When** Marina arrasta — sobre espaço vazio ou
   sobre um elemento —, **Then** a área visível se desloca pelo plano, **nenhum** elemento é movido,
   criado, selecionado ou desselecionado, e o código permanece byte-idêntico.
4. **Given** a área do diagrama **sem** o modo hand ativo, **When** Marina arrasta sobre o espaço
   vazio, **Then** o que nasce é a **seleção retangular** de `002` (`FR-008`) — não um deslocamento da
   área visível; qual dos dois o arrasto vai produzir estava legível no cursor **antes** de ela
   começar.
5. **Given** um elemento selecionado e um rótulo em edição, **When** Marina aproxima o zoom e arrasta a
   área visível, **Then** a seleção continua a mesma, a edição continua aberta e acompanha o elemento,
   e nada do que ela construiu se perde.
6. **Given** uma rajada de zoom e de arrasto da área visível, **When** Marina termina, **Then** o
   histórico da sessão está **como estava**: nenhum desses gestos virou entrada de histórico.
7. **Given** um arrasto de elemento em curso, **When** Marina dá zoom por roda ou atalho **sem soltar**
   o arrasto, **Then** o arrasto continua — não é cancelado, não é concluído à força e não fica
   inerte —, o ponto do plano que ele pegou continua sob o ponteiro, e o elemento não salta.

---

### User Story 2 - Trabalho na proporção que escolhi (Priority: P2)

Marina está escrevendo mermaid à mão e quer o editor de código maior; mais tarde, montando o fluxo por
gestos, quer a área do diagrama maior. Ela arrasta a divisão entre as duas e passa a trabalhar na
proporção que escolheu, que permanece até que ela mesma a mude.

**Why this priority**: é o eixo independente da área de trabalho — não depende do zoom nem do
enquadramento, e nenhum deles depende dela. Entrega valor sozinha (mais espaço para a vista em que se
está trabalhando agora) e é testável sozinha, mas o que destrava a sessão de 400 nós é a História 1.

**Independent Test**: arrastar a divisão para os dois lados e conferir que a proporção escolhida
permanece, que nenhuma das duas vistas desaparece, que nenhum elemento muda de posição e que o código
permanece byte-idêntico.

**Acceptance Scenarios**:

1. **Given** a área de trabalho na proporção padrão, **When** Marina arrasta a divisão entre o editor
   de código e a área do diagrama, **Then** as duas áreas passam a ocupar a proporção que ela deixou,
   e essa proporção **permanece** enquanto ela trabalha, até que ela mesma a mude.
2. **Given** a divisão sendo arrastada, **When** Marina a leva até o extremo, **Then** o arrasto
   **para no mínimo declarado** de cada área: nenhuma das duas vistas pode ser reduzida a nada.
3. **Given** um enquadramento e um nível de zoom escolhidos, **When** a área do diagrama muda de
   tamanho — Marina arrastando a divisão, ou a janela mudando de tamanho —, **Then** o **nível de
   zoom não muda**, o ponto do plano que estava no centro da área visível **continua no centro**, e
   **nenhum** elemento se move; o produto não reenquadra sozinho.
4. **Given** qualquer proporção, **When** Marina copia o código, **Then** o texto é byte-idêntico ao
   de antes de ela arrastar a divisão — nada da proporção aparece nele.
5. **Given** a proporção que Marina escolheu, **When** a **janela** muda de tamanho — alargando ou
   estreitando, com as duas vistas acima dos seus mínimos —, **Then** a **razão** entre as duas
   permanece a mesma: as duas crescem ou encolhem **juntas**, e o produto **não** muda a proporção
   que ela escolheu.
6. **Given** a janela sendo encolhida, **When** ela fica menor que a **soma** dos mínimos das duas
   vistas, **Then** a área de trabalho **para de encolher** e a página passa a rolar horizontalmente:
   nenhuma das duas vistas encolhe abaixo do próprio mínimo, e nenhuma delas some.

---

### User Story 3 - Devolvo o diagrama ao quadro, ou o zoom ao natural (Priority: P3)

Marina se perdeu: aproximou demais, arrastou para longe e não sabe mais onde está o diagrama. Com um
gesto, o diagrama inteiro volta a caber na área visível. Com outro, o zoom volta ao tamanho natural,
sem que o enquadramento se mexa. São dois gestos, com duas promessas diferentes.

**Why this priority**: é o gesto de recuperação — o que torna a navegação livre da História 1 segura,
porque nenhum enquadramento é um beco sem saída. Depende de haver zoom e enquadramento para ajustar,
então vem depois; mas cada gesto é testável sozinho.

**Independent Test**: a partir de um enquadramento arbitrário e um zoom arbitrário sobre um diagrama
do tamanho do envelope, acionar ajustar à tela e conferir que **todos** os elementos ficaram dentro da
área visível, com folga da borda, em **um** gesto e sem que nenhum se movesse; separadamente, acionar
resetar o zoom e conferir que a escala voltou ao tamanho natural e que o ponto central do
enquadramento não se deslocou.

**Acceptance Scenarios**:

1. **Given** um diagrama maior que a tela e um enquadramento qualquer, **When** Marina aciona ajustar
   à tela, **Then** **todos** os elementos do diagrama ficam dentro da área visível, com uma folga que
   os separa da borda e com o diagrama **centralizado** nela, num único gesto — e nenhum elemento
   muda de posição no plano.
2. **Given** um diagrama pequeno — um nó só —, **When** Marina aciona ajustar à tela, **Then** o
   diagrama fica visível e **centralizado**, mas **não é ampliado além do tamanho natural**: a
   promessa é "tudo visível", não "tudo grande".
3. **Given** um diagrama **vazio**, **When** Marina aciona ajustar à tela, **Then** o enquadramento vai
   para o padrão declarado da sessão e **nenhum erro** é acusado.
4. **Given** o zoom em qualquer nível e um enquadramento qualquer, **When** Marina aciona resetar o
   zoom, **Then** a escala volta ao **tamanho natural** e o ponto do plano que estava no centro da área
   visível **continua no centro** — este gesto muda só a escala.
5. **Given** o diagrama recém-ajustado à tela, **When** Marina inspeciona o diagrama e o código,
   **Then** o arranjo dos elementos é o mesmo de antes do gesto e o código é byte-idêntico: ajustar à
   tela não é organizar (`RN-03`).
6. **Given** um diagrama do tamanho do envelope (400 nós e 500 conexões), **When** Marina aciona
   ajustar à tela, **Then** o gesto **não** é recortado pelo limite mínimo e o diagrama inteiro fica
   realmente inteiro na tela — e isso vale também quando ela espalhou os nós à mão a ponto de exigir
   escala **abaixo** do piso declarado: aí o gesto desce abaixo dele, e afastar mais por gesto
   contínuo simplesmente satura ali.
7. **Given** a aba reaberta com o rascunho restaurado, ou um documento inteiro colado no editor de
   código, **When** a área de trabalho abre, **Then** ela já abre **ajustada à tela** — nenhum gesto
   dela é necessário para o diagrama estar à vista —, e com o diagrama vazio abre no padrão declarado.

---

### Edge Cases

- **Arrasto sobre espaço vazio: pan ou seleção retangular?** Os dois gestos nascem do mesmo lugar — o
  arrasto sobre o espaço vazio da área do diagrama — e o produto **nunca adivinha** qual deles a
  pessoa quis. Qual vai acontecer é **estado explícito e legível antes de o arrasto começar**, e é
  isso que o cursor hand declara. Adivinhar pela distância, pela velocidade ou pelo que há sob o
  ponteiro produziria seleções acidentais no meio de uma navegação, que é o pior desfecho possível
  numa sessão de 400 elementos. Um **gesto auxiliar distinto** — outro botão, outro dispositivo — não
  é adivinhação e continua aberto ao `plan` (`FR-004`): o que a regra proíbe é o **mesmo** arrasto ter
  dois destinos.
- **Zoom no limite.** A faixa de zoom tem mínimo e máximo declarados. Chegar num deles **satura**: o
  gesto continua sendo aceito e o zoom simplesmente não passa dali. Não há travamento da área do
  diagrama, não há salto e não há aviso modal — o nível corrente é legível, e isso basta para a pessoa
  saber onde está.
- **Ajustar à tela num diagrama do tamanho do envelope.** O limite mínimo de zoom é escolhido para que
  o diagrama inteiro do envelope declarado caiba numa área do diagrama de **tamanho de referência**:
  se ajustar à tela fosse recortado pelo limite, o gesto entregaria "quase tudo", que é justamente o
  que ele existe para não fazer.
- **A área do diagrama estreitada não move a faixa de zoom.** Arrastar a divisão a favor do editor de
  código, ou estreitar a janela, diminui a área visível — mas o piso do zoom **não desce junto**
  (`FR-001`). Afastar por gesto contínuo satura onde sempre saturou, e quem devolve o diagrama
  inteiro é o `FR-008`, abaixo do piso. Fazer o piso seguir o tamanho da área seria a mesma
  intromissão que fazê-lo seguir o conteúdo: a faixa mudaria debaixo dos pés dela toda vez que
  mexesse na divisão, e o mesmo gesto de roda daria escalas diferentes conforme a proporção do
  momento.
- **Ajustar à tela num arranjo mais espalhado que o envelope.** O arranjo é livre e o plano não tem
  paredes: 400 nós afastados à mão ocupam um retângulo arbitrariamente maior que 400 nós compactos, e
  nenhum piso fixo daria conta de todos. Por isso a faixa governa o **gesto contínuo** e ajustar à
  tela **não se submete a ela** (`FR-008`): ele desce abaixo do piso quando precisa. Tornar a faixa
  elástica em vez disso resolveria o mesmo caso ao custo de reescalar debaixo dos pés da pessoa toda
  vez que ela apagasse conteúdo — o produto não reescala sozinho, nem para cima nem para baixo.
- **Ajustar à tela num diagrama minúsculo.** Um nó só não passa a ocupar a tela inteira: ajustar à
  tela nunca amplia além do tamanho natural. Encher a tela com um elemento é ampliação que a pessoa
  não pediu, e o gesto para reescalar por vontade dela já existe (`FR-001`). Aqui é o teto que dita a
  escala, então quem responde "onde o diagrama fica" é o **centro**: ele vai para o meio da área
  visível, e a sobra se reparte em volta. Sem isso, o gesto teria resultado indeterminado justamente
  no caso em que a escala não decide nada.
- **Ajustar à tela com o diagrama vazio.** Não há o que enquadrar; o enquadramento vai para o padrão
  declarado e o gesto termina em silêncio. Acusar erro por acionar um gesto legítimo num diagrama que
  ainda não tem nada seria punir o começo da sessão.
- **Abrir com conteúdo que veio de fora.** Reabrir a aba com o rascunho restaurado (`RF-27`), ou colar
  um documento inteiro no editor de código, põe na tela um diagrama que a pessoa **não** enquadrou
  nesta sessão — e cujo arranjo feito à mão pode estar longe de onde a colocação determinística
  começa. Por isso a abertura **ajusta à tela** quando há conteúdo e só usa o padrão declarado quando
  não há (`FR-017`). Começar a sessão diante de uma área visível vazia, com o diagrama inteiro fora do
  quadro, é o pior primeiro instante possível — e o gesto de `FR-008` que resolveria isso a pessoa
  ainda não sabe que precisa dar.
- **Ajustar à tela não é organizar.** Um diagrama com os nós espalhados continua espalhado depois do
  gesto — só passa a caber na tela. Rearranjar é `RF-14`, gesto explícito de `layout-automatico`
  (`RN-03`); confundir os dois faria o gesto de enquadrar reescrever o trabalho da pessoa.
- **Resetar o zoom não é ajustar à tela.** Voltar ao tamanho natural pode deixar o diagrama maior que
  a tela de novo — e isso é o esperado: são dois gestos com duas promessas. Fazer o reset também
  recentrar tiraria da pessoa a possibilidade de voltar à escala 1:1 **sem** perder de vista o trecho
  em que estava trabalhando.
- **Redimensionar a área do diagrama muda o que cabe.** Estreitar a área do diagrama (arrastando a
  divisão ou encolhendo a janela) tira da área visível elementos que estavam nela. O produto **não**
  reenquadra por conta própria: preserva o zoom e o ponto central, e deixar tudo visível de novo é o
  gesto de `FR-008`, que é dela. Reenquadrar sozinho seria mexer no enquadramento que ela escolheu.
  Encolher a janela estreita as **duas** vistas juntas, na mesma razão (`FR-006`): mudar o tamanho da
  janela muda os tamanhos, nunca a proporção que ela escolheu. Preservar a largura absoluta de uma
  das vistas faria o produto reescrever essa escolha a cada mudança de janela — a mesma intromissão
  que ele recusa no enquadramento.
- **O que passa da caixa do nó.** Um laço, um par de arestas paralelas, um rótulo de conexão e uma
  moldura de agrupamento desenham para **fora** das caixas dos nós que os originam. Enquadrar pelas
  caixas deixaria qualquer um deles cortado na borda com o gesto se dizendo concluído — por isso
  `FR-008` e `FR-011` medem pela **extensão desenhada**, e pela mesma nos dois. Duas geometrias
  diferentes fariam "está visível" responder sim para um elemento que ajustar à tela acabara de
  cortar.
- **O que o próprio produto tapa não conta como visível.** O `FR-001` pede que o nível de zoom seja
  observável e o `FR-018` pede comandos alcançáveis; onde esses controles ficam é do `plan`. Se algum
  deles flutuar sobre a área do diagrama, o pedaço que ele cobre sai da área visível (`FR-011`). Do
  contrário, trazer um elemento "para a área visível" (`FR-012`) poderia depositá-lo **atrás** de um
  controle, e o dever do `R-05` — que o rótulo nunca seja digitado às cegas — cairia por uma porta
  que a spec já fechou pela outra, a da borda da tela. Proibir sobreposição resolveria o mesmo caso
  amarrando a afordância, que é do `plan`.
- **"Está na área visível" é resposta sobre o agora.** Um elemento pode entrar e sair da área visível
  a cada zoom, arrasto ou mudança de proporção. Nada nesta spec promete que um elemento **fique**
  visível: o que ela oferece é a definição e a capacidade de **trazer** um elemento para dentro
  (`FR-012`) quando alguém precisar disso.
- **Elemento maior que a área visível.** Trazer para a área visível um elemento que não cabe no zoom
  corrente não pode virar "não faz nada" nem "reescala sem avisar": o enquadramento traz o que cabe,
  ancorado no começo do elemento na ordem de leitura — o canto por onde a leitura do diagrama começa
  na orientação corrente, e não um canto fixo. Um diagrama lido de baixo para cima ancorado no topo
  mostraria justamente a ponta que a pessoa lê por último. Reescalar debaixo dos pés da pessoa
  surpreende mais do que mostrar o elemento parcialmente.
- **Gesto novo no meio do trânsito.** Se o `plan` levar o enquadramento ao destino por um trânsito em
  vez de um salto, acionar ajustar à tela outra vez — ou dar zoom, ou arrastar — antes de ele terminar
  **interrompe e assume**. Enfileirar levaria a pessoa a um destino que ela já abandonou; ignorar
  faria o gesto parecer engolido. Nas duas leituras a promessa de "**um** gesto" morre, e é por isso
  que o que a spec fixa é o **destino**, não o caminho até ele.
- **Navegar não interrompe o trabalho em curso.** Aproximar o zoom com um rótulo em edição não fecha
  o editor, não descarta o que foi digitado e não muda a seleção: o editor acompanha o elemento.
  Enquadrar é olhar de outro lugar, não mexer no trabalho.
- **Zoom e enquadramento no meio de um arrasto.** Arrastar um nó até um canto distante de um diagrama
  maior que a tela exige mexer no enquadramento **sem soltar** o arrasto. Por isso os dois convivem: o
  enquadramento muda por baixo do arrasto em curso, que continua ancorado no ponto do **plano** que
  pegou (`FR-015`). Deixar o zoom inerte durante o arrasto obrigaria a inventar um auto-pan de borda
  só para o gesto de mover ser possível; cancelar ou concluir o arrasto à força seria interromper
  exatamente o que o `FR-015` promete não interromper.
- **Desfazer não desfaz enquadramento.** Zoom, arrasto da área visível e arrasto da divisão não são
  atos do modelo e não entram no histórico. Depois de uma rajada deles, um desfazer reverte o último
  ato **do modelo** — o que a pessoa realmente construiu —, não a última coisa que ela olhou. O
  contrário obrigaria a desfazer dez zooms para desfazer uma exclusão.
- **A rolagem do R0 continua.** Zoom e arrasto do enquadramento **acrescentam-se** ao plano rolável
  herdado (`001`, `FR-007`); não o substituem. Nenhum elemento nascido da colocação determinística
  fica inalcançável por causa desta spec.
- **Perder-se no plano.** Arrastar a área visível para longe de todo conteúdo é permitido e não é
  limitado: o plano não ganha paredes. O que garante que isso nunca é um beco sem saída é o gesto de
  ajustar à tela (`FR-008`) — é exatamente para isso que ele existe.
- **Trabalhar sem ponteiro.** Zoom, ajustar à tela e resetar são alcançáveis por comando ou atalho;
  mover o enquadramento livremente e mudar a proporção, não (`FR-018`). Isso não prende ninguém: o
  elemento criado por teclado vem até a área visível (`FR-012`), ajustar à tela devolve o diagrama
  inteiro, e a abertura já entrega as duas vistas com o diagrama enquadrado (`FR-017`) — a proporção é
  conforto, e nenhum elemento fica inalcançável sem ela. Prometer pan livre por teclado, ou um comando
  de proporção, **aqui** seria disputar teclas com o repertório de edição, que é de
  `ciclo-por-teclado`.
- **A proporção é da sessão, não do documento.** Ela não pertence a um diagrama nem a um tipo: é a
  janela de trabalho da pessoa. Trocar o conteúdo não mexe nela, e ela não aparece em lugar nenhum do
  código.
- **Esconder uma das vistas.** A divisão satura no mínimo de cada área; colapsar, ocultar ou alternar
  as duas vistas em abas não é escopo. Elas são duas vistas do mesmo modelo (`R-03`), e ter uma delas
  invisível é capacidade nova, com consequência própria — não um caso extremo do arrasto da divisão.
- **Janela menor que a soma dos mínimos.** Aí o mínimo do arrasto não protege ninguém: quem está
  encolhendo não é a divisão. Nenhuma das duas vistas cede — a área de trabalho para de encolher e a
  página rola horizontalmente (`FR-006`). Espremer as duas abaixo do mínimo, ou eleger uma que cede
  primeiro, seria esconder uma vista pela porta dos fundos, que o `FR-006` recusa pela porta da
  frente. Nesse estado a **área visível encolhe junto** (`FR-011`): ela é o que a tela mostra, não o
  que a proporção reservou. Do contrário, trazer um elemento "para a área visível" (`FR-012`) poderia
  depositá-lo atrás da borda da tela — e o dever do `R-05` é exatamente que o rótulo nunca seja
  digitado às cegas.
- **Gestos contínuos no envelope.** Zoom, arrasto do enquadramento e arrasto da divisão são gestos
  contínuos e medem-se pela mesma barra do `NFR-03` (**≥50fps** dentro de 400 nós e 500 conexões).
  Nenhum deles pode nascer estourando o orçamento que `R-04` declara compartilhado.

## Requirements *(mandatory)*

### Functional Requirements

**Navegar na área do diagrama (RF-25)**

- **FR-001** (zoom): A pessoa DEVE conseguir **aproximar e afastar o zoom** da área do diagrama por
  gesto direto, sem sair dela. A escala tem **limite mínimo e máximo declarados**, e o gesto
  **satura** neles: o zoom para no limite, continua respondendo e NÃO PODE saltar, travar a área do
  diagrama ou falhar em silêncio. A faixa é **estável** — NÃO PODE mover-se com o conteúdo **nem com
  o tamanho da área do diagrama** — e DEVE conter (a) o **tamanho natural** (a escala 1:1 do desenho)
  e (b) a escala necessária para o **diagrama inteiro do envelope** — 400 nós e 500 conexões — caber
  numa área do diagrama de **tamanho de referência declarado** (qual é a referência é do `plan`).
  Estando a área do diagrama **menor** que essa referência — porque ela arrastou a divisão ou
  estreitou a janela —, o piso NÃO acompanha: o gesto contínuo satura nele e quem devolve o diagrama
  inteiro é o `FR-008`, descendo abaixo do piso. Ela governa o
  **gesto contínuo de zoom**, e NÃO ajustar à tela: como o arranjo é livre e o plano não tem paredes,
  o `FR-008` PODE terminar **abaixo** do piso quando o arranjo corrente exigir. O **nível de zoom
  corrente DEVE ser observável** pela pessoa: sem isso, "voltar ao tamanho natural" (`FR-009`) seria
  um destino invisível.
- **FR-002** (âncora do zoom): O zoom acionado por **gesto de ponteiro** DEVE ancorar-se **no ponto
  sob o ponteiro** — o ponto do plano que estava sob ele continua sob ele depois do gesto. O zoom
  acionado por um controle sem ponteiro (comando ou atalho) ancora-se no **centro da área visível**.
  Em nenhum dos dois casos algum elemento muda de posição no plano: o que muda é a escala com que a
  área do diagrama mostra o plano.
- **FR-003** (movimentação por cursor hand): A pessoa DEVE conseguir **arrastar a área visível** pelo
  plano do diagrama, num modo cujo **cursor hand declara** que o arrasto move o enquadramento e não o
  conteúdo — é gesto de ponteiro, e o alcance sem ponteiro é o do `FR-018`. Nesse modo o arrasto pega o **plano**, esteja o ponteiro sobre espaço vazio ou sobre um
  elemento: **nenhum** elemento é movido, criado, selecionado ou desselecionado pelo gesto, e o
  código fica byte-idêntico.
- **FR-004** (a fronteira com a seleção retangular): Mover a área visível e traçar a **seleção
  retangular** (`002`, `FR-008`) nascem os dois do arrasto sobre o espaço vazio e NUNCA PODEM ser
  adivinhados um pelo outro. Qual deles o arrasto vai produzir DEVE ser **estado explícito e legível
  antes de o arrasto começar** — é o que o cursor hand declara —, e o produto NÃO PODE inferi-lo da
  distância, da velocidade ou do que estiver sob o ponteiro. O modo DEVE ser alcançável de forma
  **persistente** (a pessoa entra e permanece) e **temporária** (a pessoa segura e volta ao soltar);
  a afordância exata de cada uma é do `plan`. Entrar ou sair do modo NÃO PODE alterar a seleção
  corrente. O modo governa **o arrasto que também poderia ser seleção**, e NÃO é o único caminho de
  ponteiro possível: o `plan` PODE oferecer um **gesto auxiliar distinto** — outro botão, outro
  dispositivo — que move o enquadramento sem entrar no modo, desde que seja **explícito por
  construção** (nunca inferido de distância, velocidade ou do que está sob o ponteiro) e NÃO altere a
  seleção corrente. O que NUNCA PODE existir é um caminho em que o **mesmo** arrasto produza ora um
  destino, ora outro.
- **FR-005** (o alcance herdado continua): O **plano rolável** do R0 (`001`, `FR-007`) CONTINUA
  valendo: todo elemento permanece alcançável, inclusive o que nasce da colocação determinística num
  documento do tamanho do envelope. Esta spec **acrescenta** zoom e arrasto do enquadramento sobre
  esse plano — não os substitui, e não introduz enquadramento a partir do qual um elemento se torne
  inalcançável.

**Proporção entre o editor de código e a área do diagrama (RF-24)**

- **FR-006** (arrastar a divisão): A pessoa DEVE conseguir **arrastar a divisão** entre o editor de
  código e a área do diagrama e trabalhar na proporção que escolheu; a proporção **permanece** até que
  ela mesma a mude. Ela é da **sessão de trabalho**, não do documento nem do tipo de diagrama: trocar
  o conteúdo não a altera. Ela é uma **razão**, não uma largura: mudar o tamanho da **janela** NÃO
  PODE alterá-la — as duas vistas crescem e encolhem **juntas**, mantendo a mesma fração da área de
  trabalho, e os mínimos declarados apenas recortam essa razão por baixo. Cada uma das duas áreas tem um **mínimo declarado** em que o arrasto
  **satura** — nenhuma das duas vistas pode ser reduzida a nada. Esses mínimos valem **também quando
  quem encolhe é a janela**: quando ela fica menor que a **soma** dos dois, a área de trabalho **para
  de encolher** e quem cede é a **página**, que passa a rolar horizontalmente. NÃO existe prioridade
  declarada entre as duas — nenhuma cede primeiro, nenhuma encolhe abaixo do próprio mínimo.
  Colapsar, ocultar ou alternar as duas vistas NÃO é escopo desta spec: elas são duas vistas do mesmo
  modelo (`R-03`).
- **FR-007** (o que redimensionar não faz): **Redimensionar** — a pessoa arrastando a divisão, ou a
  janela mudando de tamanho — NÃO PODE mudar o **nível de zoom** nem mover elemento algum. (A janela
  mudando de tamanho muda os **tamanhos** das duas vistas, não a **proporção** entre elas, que é dela
  e só ela muda — `FR-006`.) O
  enquadramento é preservado **pelo centro**: o ponto do plano que estava no centro da área visível
  continua no centro. O produto NÃO PODE reenquadrar por conta própria — devolver tudo à vista é
  gesto dela (`FR-008`) — e redimensionar DEVE deixar o código **byte-idêntico**.

**Ajustar o diagrama à tela e resetar o zoom (RF-26)**

- **FR-008** (ajustar à tela): Por **um** gesto, a pessoa DEVE conseguir devolver **o diagrama
  inteiro** ao enquadramento da área visível: ao final, **todos** os elementos estão dentro dela, com
  uma **folga** que os separa da borda. O gesto altera **enquadramento e escala juntos** e nada mais.
  O resultado é **determinístico**: seja qual for o enquadramento de partida, o **centro da extensão
  desenhada** do diagrama termina no **centro da área visível** — inclusive quando é o teto do
  tamanho natural que dita a escala e sobra área visível em volta. "Tudo dentro com folga" é o piso
  do gesto, não o seu resultado: um diagrama parado num canto satisfaria a letra e frustraria a
  promessa.
  Ele considera o diagrama **inteiro** — não a seleção, não o que já estava visível — e pela
  **extensão desenhada** dele: caixas dos nós, traçado das conexões (inclusive o arco de um laço ou de
  arestas paralelas), rótulos de conexão e molduras de agrupamento (`FR-011`). Ajustar à tela
  NUNCA PODE **ampliar além do tamanho natural**: a promessa é "tudo visível", não "tudo grande".
  Ele também NUNCA PODE ser **recortado pelo piso** da faixa (`FR-001`): quando o arranjo corrente
  exige escala menor que o piso declarado, o gesto **desce abaixo dele** — a faixa governa o gesto
  contínuo, não este. O nível resultante permanece **observável** e o zoom continua respondendo:
  aproximar traz de volta para dentro da faixa, e afastar por gesto contínuo **satura no nível
  corrente**, sem saltar para o piso. Estando o zoom abaixo do piso, encolher ou apagar conteúdo NÃO
  PODE reescalar por conta própria — o nível só muda por gesto dela. Com o diagrama **vazio**, o
  gesto leva o enquadramento ao **padrão declarado** da sessão (`FR-017`) e NÃO acusa erro.
  O gesto é **um só** e o **estado final** é o mesmo com ou sem **trânsito** até ele: esta spec fixa o
  destino, e transitar ou saltar é do `plan`. Havendo trânsito, um gesto novo que chegue no meio dele
  **interrompe e assume** — NUNCA PODE enfileirar nem ser ignorado —, o destino alcançado é idêntico
  ao do salto, e o trânsito é gesto contínuo para todos os efeitos (`FR-015`, `FR-016`).
- **FR-009** (resetar o zoom): Por **um** gesto, a pessoa DEVE conseguir devolver a escala ao
  **tamanho natural**, de qualquer nível em que esteja. Este gesto muda **só a escala**: o ponto do
  plano que estava no centro da área visível continua no centro. São **dois gestos distintos com
  promessas distintas** — ajustar à tela reenquadra e reescala; resetar o zoom só reescala —, e
  nenhum dos dois PODE ser o outro. Vale para ele a mesma regra de trânsito do `FR-008`: destino de
  produto, trânsito do `plan`, e gesto novo no meio interrompe e assume.
- **FR-010** (nenhum dos dois é rearranjo): Ajustar à tela e resetar o zoom NÃO PODEM mover, reordenar
  ou reposicionar elemento algum, nem disparar rearranjo do diagrama (`RN-03`). Depois de qualquer um
  deles, o arranjo é idêntico ao de antes e o código é **byte-idêntico**. Organizar o diagrama é gesto
  explícito de outra spec (`RF-14`, `layout-automatico`).

**A área visível como definição para as demais specs (R-05)**

- **FR-011** (o que "área visível" significa): A **área visível** é a região do plano do diagrama que
  a área do diagrama está mostrando **agora**, determinada por três coisas juntas: o **enquadramento**
  (para onde a área visível foi levada sobre o plano), o **nível de zoom** e o **tamanho corrente da
  área do diagrama**, que a proporção (`FR-006`) governa. Esse terceiro fator é a parte da área do
  diagrama que a **tela está de fato mostrando**: quando a janela cai abaixo da soma dos mínimos e a
  página passa a rolar horizontalmente (`FR-006`), a área visível **encolhe** para o pedaço que
  permanece na tela. Pelo mesmo princípio, ela **desconta** o que o **próprio produto sobrepõe** à
  área do diagrama: controle, indicador ou painel **persistente** que o `plan` coloque por cima dela
  sai da conta. A área visível é o que a pessoa **vê** do plano, não o que a proporção reservou — sem
  rolagem de página e sem sobreposição, as duas coisas coincidem. O `FR-008` e o `FR-012` medem
  contra essa mesma região descontada. Um elemento **está na área
  visível** quando
  está **inteiro** dentro dela, com a mesma **folga** da borda que o `FR-008` garante: encostar na
  borda, ou aparecer pela metade, NÃO conta. "Inteiro" é medido pela **extensão desenhada** do
  elemento, a mesma que o `FR-008` enquadra: a de um **nó** é a sua caixa; a de uma **conexão** é o
  traçado inteiro — inclusive o arco de um laço ou de arestas paralelas — mais o seu rótulo; a de um
  **agrupamento** é a moldura. Nenhum dos dois requisitos PODE medir por um recorte menor que o outro.
  A resposta é sempre sobre o agora — mudar o zoom,
  arrastar o enquadramento ou mexer na divisão PODE tirar da área visível um elemento que estava nela,
  e esta spec NÃO promete que um elemento fique visível indefinidamente.
- **FR-012** (trazer para a área visível): O produto DEVE oferecer, como capacidade da área de
  trabalho, **trazer um elemento indicado para dentro da área visível** — a operação de que dependem
  os deveres de quem cria elemento por teclado (`R-05`; `RF-11`, de `ciclo-por-teclado`). Ela move o
  **enquadramento e só ele**: o **nível de zoom NÃO muda**, **nenhum** elemento é movido e o código
  fica **byte-idêntico**. O deslocamento é o **mínimo** que satisfaz o `FR-011`, e é **nulo** quando o
  elemento já está na área visível. Quando o elemento **não cabe** na área visível no zoom corrente, o
  enquadramento traz o que cabe, ancorado no **começo** do elemento — o canto da sua **extensão
  desenhada** (`FR-011`) em que a **ordem de leitura** do diagrama começa, relativa à **orientação
  corrente**: o canto superior-esquerdo na orientação de cima para baixo, e o canto correspondente nas
  demais. Qual é a orientação é de `layout-automatico` (`RF-16`); o termo tem aqui o mesmo sentido que
  na constitution, medido nas 4 orientações. A regra é **uma só** para nó, conexão e agrupamento — não
  há geometria por tipo de elemento. Vale para ela a regra de trânsito do `FR-008`. **Quando** essa capacidade é acionada, e
  por qual gesto, é de quem a chama — não desta spec.

**Invariantes carregadas (do R0, da PRD e das restrições transversais)**

- **FR-013** (nada disso viaja no código): A proporção das áreas, o enquadramento e o nível de zoom
  são **conforto de sessão** e NUNCA PODEM aparecer no código (`RN-01`, `R-03`). Qualquer sequência de
  gestos desta spec DEVE deixar o código **byte-idêntico**, e o código copiado — o produto final — não
  carrega vestígio nenhum deles.
- **FR-014** (nada disso é ato do modelo): Nenhum gesto desta spec muta o modelo, e nenhum deles
  produz **entrada de histórico**: desfazer NUNCA desfaz um zoom, um arrasto de enquadramento ou um
  arrasto da divisão, e uma rajada desses gestos deixa o histórico **como estava** (`R-09`, `RN-04`).
  O gesto de desfazer visível é de `desfazer-e-refazer`; o que esta spec fixa é que ela **não**
  alimenta o histórico.
- **FR-015** (não interrompe o que está em curso): Mudar a proporção, o zoom ou o enquadramento NÃO
  PODE encerrar, descartar ou interromper o que está em curso: um rótulo em edição **continua em
  edição** e acompanha o elemento, a **seleção permanece a mesma**, e nada do que a pessoa já
  construiu se perde. Isso vale também para um **arrasto contínuo em curso** — arrastar um elemento,
  traçar a seleção retangular ou arrastar a divisão — quando o gesto desta spec chega por outro
  caminho (roda, atalho, controle, ou o `FR-012` acionado por quem cria elemento por teclado): o
  enquadramento muda **por baixo** do arrasto, que NÃO PODE ser cancelado, concluído à força, nem
  ficar inerte. O arrasto permanece ancorado no **ponto do plano** que pegou, e não no ponto da tela:
  dar zoom no meio de um arrasto NÃO PODE deslocar o elemento arrastado além do que o ponteiro pediu.
  Havendo **trânsito** até o destino (`FR-008`), essa âncora vale **a cada quadro** dele.
- **FR-016** (o orçamento do envelope): Zoom, arrasto do enquadramento e arrasto da divisão são
  **gestos contínuos** e consomem do envelope de densidade (`R-04`): dentro de **400 nós e 500
  conexões** eles mantêm **≥50fps** (`NFR-03`). Um **trânsito** até o destino de `FR-008`, `FR-009` ou
  `FR-012`, se o `plan` optar por um, é gesto contínuo para todos os efeitos e mede-se pela mesma
  barra. Esta spec mede o próprio consumo e NÃO PODE nascer estourando-a.

**O estado em que a área de trabalho abre**

- **FR-017** (o padrão declarado da sessão): Ao abrir a área de trabalho — sessão nova, aba reaberta
  com o rascunho restaurado (`RF-27`) ou documento inteiro colado no editor de código —, o
  enquadramento e o nível de zoom são **derivados do conteúdo**, não fixos: **com conteúdo**, a área
  de trabalho abre **ajustada à tela**, pela mesma regra do `FR-008` (todos os elementos dentro da
  área visível, com folga da borda, centralizados, sem ampliar além do tamanho natural); **vazia**, abre no **padrão
  declarado** — tamanho natural, no ponto do plano em que a colocação determinística do R0 faz nascer
  o primeiro elemento. Abrir NUNCA PODE deixar a pessoa olhando para uma área visível vazia com o
  conteúdo fora do quadro. Isto NÃO é o produto reenquadrando por conta própria (`FR-007`): na
  abertura não existe enquadramento escolhido por ela a preservar, e depois dela o produto não
  enquadra mais sozinho. Enquadramento e zoom de abertura são **conforto de sessão** como a proporção
  (`FR-006`): eles são derivados do conteúdo presente, e NÃO são recuperados da sessão anterior — o
  que o `RF-27` devolve é o diagrama.

**O alcance sem ponteiro**

- **FR-018** (o que se alcança sem ponteiro): **Aproximar e afastar o zoom** (`FR-001`), **ajustar à
  tela** (`FR-008`) e **resetar o zoom** (`FR-009`) DEVEM ter caminho **sem ponteiro** — cada um
  alcançável por comando ou atalho, ancorando-se no centro da área visível quando não há ponteiro
  (`FR-002`). Essa enumeração é **exaustiva**: **mover o enquadramento livremente** (`FR-003`) e
  **mudar a proporção** (`FR-006`) são gestos de ponteiro e NÃO têm caminho sem ponteiro garantido por
  esta spec. Isso NÃO PODE prender ninguém: quem trabalha por teclado chega ao que precisa porque o
  elemento criado vem até a área visível (`FR-012`, o dever do `R-05`), porque ajustar à tela devolve
  o diagrama inteiro, e porque a abertura já entrega as **duas vistas** com o diagrama enquadrado
  (`FR-017`) — mudar a proporção é conforto, não saída. Trabalhar sem ponteiro NUNCA termina num beco
  sem saída. Quais teclas e quais controles é do `plan`; um pan livre por teclado — ou um comando que
  ajuste a proporção —, se um dia existir, é afordância de `ciclo-por-teclado`, dona das teclas, e não
  capacidade nova desta spec.

### Key Entities

- **Plano do diagrama** — a superfície em que os elementos têm posição, herdada do R0 e rolável. Nada
  dele é projetado no código.
- **Área visível** — a região do plano que a área do diagrama está mostrando agora, medida sobre a
  parte dela que a tela de fato mostra e descontado o que o produto sobrepõe. Não é elemento, não é
  modelo, não é projetada; é a definição de que o `R-05` depende (`FR-011`).
- **Enquadramento** — para onde a área visível foi levada sobre o plano. Conforto de sessão; na
  abertura é derivado do conteúdo presente (`FR-017`), nunca recuperado da sessão anterior.
- **Nível de zoom** — a escala com que a área do diagrama mostra o plano. A **faixa declarada** é
  estável — não se move nem com o conteúdo nem com o tamanho da área do diagrama —, contém o
  **tamanho natural** e limita o gesto contínuo; ajustar à tela pode levar o nível abaixo do piso
  dela (`FR-008`). Conforto de sessão, e observável pela pessoa.
- **Proporção da área de trabalho** — quanto da tela cabe ao editor de código e quanto à área do
  diagrama, entre os mínimos declarados de cada um. É uma **razão**, estável sob mudança de tamanho
  da janela; só a pessoa a muda. Conforto de sessão.
- **Modo hand** — o estado, declarado pelo cursor, em que o arrasto move a área visível em vez de
  traçar a seleção retangular. Estado de sessão; entrar ou sair dele não altera a seleção.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depois de **qualquer** sequência de gestos desta spec — arrastar a divisão, aproximar e
  afastar o zoom, arrastar a área visível, ajustar à tela, resetar o zoom —, o código é
  **byte-idêntico** ao de antes: **0 diferenças**. Em **0** códigos gerados aparece proporção,
  enquadramento ou nível de zoom. *(RN-01, R-03, `FR-013`)*
- **SC-002**: **0 elementos** mudam de posição no plano por causa de qualquer gesto desta spec, e
  **0** rearranjos do diagrama são disparados por eles. *(RN-03, `FR-010`)*
- **SC-003**: Os gestos contínuos — zoom, arrasto da área visível e arrasto da divisão — mantêm
  **≥50fps** dentro do envelope declarado (**400 nós e 500 conexões**). *(NFR-03, R-04, `FR-016`)*
- **SC-004**: A partir de **qualquer** enquadramento e **qualquer** nível de zoom, ajustar à tela põe
  **100%** dos elementos do diagrama dentro da área visível em **1** gesto, com **0** elementos
  encostados na borda e **0** elementos fora — sobre um diagrama do tamanho do envelope, medido pela
  **extensão desenhada**: **0** arcos de laço ou de arestas paralelas, **0** rótulos de conexão e
  **0** molduras de agrupamento cortados pela borda. O enquadramento resultante é **único**: a partir
  de **N** enquadramentos e níveis de zoom iniciais distintos, o gesto produz **1** estado final, com
  o centro da extensão desenhada no centro da área visível — **0** desvios, inclusive no diagrama
  pequeno em que o tamanho natural dita a escala. *(`FR-008`, `FR-011`)*
- **SC-005**: Ajustar à tela produz **0** ajustes recortados pelo limite mínimo — inclusive sobre um
  arranjo espalhado à mão que exija escala **abaixo** do piso declarado, em que o gesto desce abaixo
  dele. Sobre um diagrama do tamanho do envelope em arranjo determinístico, **com a área do diagrama
  no tamanho de referência declarado ou maior**, a escala resultante está **dentro da faixa
  declarada**; com a área do diagrama menor que a referência, o gesto continua entregando o diagrama
  inteiro, abaixo do piso quando preciso. Sobre um diagrama que caberia ampliado, **0** ajustes ultrapassam o
  tamanho natural. Com o zoom abaixo do piso, apagar conteúdo produz **0** reescalonamentos
  automáticos. *(`FR-001`, `FR-008`)*
- **SC-006**: Resetar o zoom leva ao **tamanho natural exato** em **1** gesto, a partir de qualquer
  nível, com **0** deslocamento do ponto do plano que estava no centro da área visível. *(`FR-009`)*
- **SC-007**: **Redimensionar** — por arrasto da divisão ou por mudança de tamanho da janela — produz
  **0** mudanças do nível de zoom, **0** deslocamentos do ponto central do enquadramento e **0**
  reenquadramentos automáticos; o arrasto satura nos mínimos declarados, com **0** casos em que
  qualquer uma das duas vistas fica sem área. Mudar o tamanho da **janela** produz **0** mudanças da
  **razão** entre as duas vistas enquanto ambas estão acima dos seus mínimos: a fração que ela
  escolheu é a mesma antes e depois. Encolher a **janela** abaixo da soma dos mínimos produz
  **0** vistas abaixo do próprio mínimo e **0** vistas ocultas: o que cede é a página, por rolagem.
  *(`FR-006`, `FR-007`)*
- **SC-008**: "Está na área visível" responde sem ambiguidade para qualquer elemento — **nó, conexão
  ou agrupamento** — e qualquer enquadramento: **0 falsos positivos** para elementos que apenas
  encostam na borda ou aparecem pela metade, inclusive quando o que sai da área visível é só o arco de
  um laço, um rótulo de conexão ou a moldura de um agrupamento. Trazer um elemento para a área visível conclui em **1** mudança de enquadramento, com **0**
  mudanças do nível de zoom, **0** elementos movidos e **0** diferenças no código — de qualquer
  enquadramento inicial, sobre um diagrama do tamanho do envelope; e produz **0** deslocamento quando
  o elemento já está visível. Para um elemento **maior** que a área visível, **0** operações terminam
  sem mostrá-lo e **0** terminam com o **começo** dele (o canto de partida da ordem de leitura na
  orientação corrente) fora da área visível. Com a página rolada horizontalmente (janela abaixo da soma dos mínimos),
  **0** elementos são dados como visíveis fora do que a tela mostra e **0** operações de trazer para a
  área visível terminam com o elemento atrás da borda da tela. Com controle ou painel persistente
  sobreposto à área do diagrama, **0** elementos são dados como visíveis debaixo dele e **0**
  operações de trazer para a área visível terminam com o elemento atrás dele.
  *(R-05, `FR-011`, `FR-012`)*
- **SC-009**: Uma rajada de zoom, arrasto de enquadramento e arrasto da divisão produz **0** entradas
  de histórico; depois dela, **1** desfazer reverte o último ato **do modelo**, não o último
  enquadramento. *(R-09, RN-04, `FR-014`)*
- **SC-010**: Em **100%** dos casos, mudar o zoom, o enquadramento ou a proporção com um rótulo em
  edição e uma seleção ativa preserva os dois: **0** edições encerradas e **0** mudanças de seleção.
  Com um **arrasto em curso**, os mesmos gestos produzem **0** arrastos cancelados, **0** arrastos
  concluídos à força e **0** gestos inertes; o ponto do plano que o arrasto pegou continua sob o
  ponteiro, com **0** deslocamentos do elemento arrastado além do que o ponteiro pediu. *(`FR-015`)*
- **SC-011**: **0 elementos** ficam inalcançáveis num documento do tamanho do envelope: todo elemento
  é alcançável por arrasto do enquadramento e, de qualquer enquadramento, **1** gesto de ajustar à
  tela devolve o diagrama inteiro à vista. **Sem ponteiro** vale o mesmo, com **0** alternâncias para
  o mouse: zoom, ajustar à tela e resetar são alcançáveis por comando ou atalho, e **0** sessões por
  teclado terminam sem saída — e isso se mede **sem** que mover o enquadramento livremente ou mudar a
  proporção tenham caminho sem ponteiro. *(`FR-005`, `FR-008`, `FR-018`)*
- **SC-012**: Ajustar à tela e resetar o zoom **respondem** em **≤100ms na mediana** dentro do
  envelope, na mesma barra da edição pontual do `NFR-03` — o critério mede o tempo até o enquadramento
  começar a mudar, e a duração de um eventual trânsito até o destino não entra na conta. Um gesto novo
  durante um trânsito produz **0** enfileiramentos e **0** gestos ignorados, e o destino final é
  idêntico ao que o salto alcançaria. *(NFR-03, `FR-008`)*
- **SC-013**: Abrir a área de trabalho com conteúdo — rascunho restaurado ou documento colado,
  inclusive um do tamanho do envelope com arranjo feito à mão longe de onde a colocação determinística
  começa — põe **100%** dos elementos dentro da área visível em **0** gestos da pessoa: **0** aberturas
  sobre área visível vazia com conteúdo fora do quadro. Com o diagrama vazio, a abertura vai ao padrão
  declarado com **0** erros acusados. *(`FR-017`)*
- **SC-014**: Sobre o espaço vazio, **0** arrastos produzem destino diferente do que o estado declarava
  antes de começarem, e **0** seleções nascem acidentalmente de uma navegação: em **100%** dos arrastos
  o que ia acontecer estava legível antes do primeiro pixel de movimento. Entrar e sair do modo hand —
  e qualquer gesto auxiliar de ponteiro que mova o enquadramento — produz **0** mudanças da seleção
  corrente. *(`FR-004`)*

## Fora de escopo

Recortes conscientes, cada um dono de outra spec do backlog:

- **Recuperar o rascunho ao reabrir a aba** e **o aviso de rascunho perdido** (`RF-27`, `RF-28`,
  `rascunho-da-sessao`) — a proporção, o enquadramento e o nível de zoom desta spec são conforto de
  **sessão** e não estão entre o que o `RF-27` restaura (estrutura, estilo e o arranjo feito à mão);
  a abertura os **deriva** do conteúdo presente (`FR-017`) em vez de recuperá-los da sessão anterior.
- **Aviso de envelope estourado** (`RF-29`, `aviso-de-envelope`) — esta spec **respeita** o envelope e
  mede o próprio consumo; avisar quando ele é ultrapassado é de lá.
- **Organizar o diagrama**, orientação, configuração de layout e preservação da posição feita à mão
  (`RF-14`–`RF-17`, `layout-automatico`, épico E4) — mudar o enquadramento **nunca é rearranjo**, e
  esta spec não move nenhum elemento.
- **O ciclo por teclado e os seus atalhos** (`RF-10`, `RF-11`, `ciclo-por-teclado`) — esta spec
  **oferece** a definição de área visível e a capacidade de trazer um elemento para dentro dela
  (`FR-011`, `FR-012`); **quando** e por qual gesto isso é acionado é de lá — inclusive um eventual
  pan livre por teclado, que seria afordância de lá e não capacidade nova daqui (`FR-018`).
- **Desfazer e refazer visíveis** (`RF-09`, `desfazer-e-refazer`) — aqui fica fixado apenas que
  nenhum gesto desta spec alimenta o histórico.
- **Criar, rotular, mover, duplicar e excluir elementos** (`RF-01`, `RF-02`, `RF-06`,
  `elementos-grafo-dirigido`) — inclusive a **seleção retangular**, cuja fronteira com o arrasto do
  enquadramento esta spec resolve (`FR-004`) sem redefinir o gesto de lá.
- **Trocar o tipo de diagrama** e os demais quatro tipos (`RF-18`) — a área de trabalho é a mesma
  seja qual for o tipo aberto.
- **Estilo, shape e ato em bloco** (`RF-03`–`RF-05`, `RF-12`, `RF-13`) — nada desta spec toca
  elemento.
- **Exportar imagem, imprimir ou compartilhar um enquadramento** — recusa consciente da PRD §4: o
  produto final é o código, e o enquadramento nem sequer viaja nele.

## Assumptions

Palpites informados, ancorados no R0, na spec 002, na PRD e no ethos do produto; candidatos a revisão
por `/speckit-clarify`.

- **Modo hand explícito, com duas formas de alcance**: o cursor hand é um **estado** — persistente
  (entra-se e permanece) e temporário (segura-se e volta ao soltar) —, e é ele que decide se o arrasto
  sobre o espaço vazio move a área visível ou traça a seleção retangular de `002`. Quais gestos, teclas
  ou botões dão acesso a cada uma das duas formas é do `plan`; o que é de produto é a fronteira: nunca
  adivinhado, sempre legível antes de o arrasto começar (`FR-004`). Era **o ponto mais afiado desta
  spec**, e o alcance do modo foi fechado em `/speckit-clarify` (ver Clarifications): ele governa o
  arrasto ambíguo, não é o único caminho de ponteiro, e um gesto auxiliar explícito continua aberto ao
  `plan`.
- **Faixa de zoom declarada por dois compromissos, não por dois números arbitrários**: o mínimo é
  baixo o bastante para o diagrama inteiro do envelope caber (senão ajustar à tela mentiria já no caso
  comum), e o máximo é alto o bastante para ler um rótulo de perto. Os valores numéricos das duas
  pontas são do `plan`; o que é de produto são os dois compromissos e o fato de o tamanho natural
  estar dentro da faixa. A faixa é **estável e limita o gesto contínuo**, não ajustar à tela: fechado
  em `/speckit-clarify` (ver Clarifications), porque nenhum piso fixo cobre todo arranjo livre, e
  fazer a faixa acompanhar o conteúdo custaria reescalar sozinho a cada exclusão. Pela mesma razão
  ela também não acompanha o **tamanho da área do diagrama** (fechado em `/speckit-clarify`): o
  compromisso do envelope é medido contra um **tamanho de referência** que o `plan` declara, e com a
  área menor que ele quem entrega o diagrama inteiro é o `FR-008`.
- **Zoom ancorado no ponteiro**: aproximar sobre o trecho que interessa deve manter esse trecho onde
  está — é a leitura menos surpreendente e a que evita que a pessoa precise arrastar de volta depois
  de cada zoom. Sem ponteiro (comando ou atalho), a âncora é o centro da área visível.
- **Redimensionar preserva o centro, e não reenquadra**: quando a área do diagrama muda de tamanho, o
  produto mantém a escala e o ponto central em vez de reajustar. Reenquadrar sozinho seria o produto
  desfazendo a escolha que a pessoa acabou de fazer; e devolver tudo à vista já é um gesto dela
  (`FR-008`).
- **Ajustar à tela nunca amplia, e centraliza**: a promessa do gesto é "tudo visível". Ampliar um
  diagrama pequeno até encher a tela é uma escolha estética que o produto não tem por que fazer por
  ela, e a escala natural continua a um gesto de distância (`FR-009`). **Onde** o diagrama fica
  depois do gesto foi fechado em `/speckit-clarify` (ver Clarifications): centralizado, para que o
  gesto tenha **um** resultado a partir de qualquer partida — "tudo dentro com folga" sozinho admite
  o diagrama parado num canto, que é a letra sem a promessa.
- **Reset de zoom não recentra**: são dois gestos com duas promessas, e juntá-los tiraria da pessoa a
  possibilidade de voltar à escala 1:1 sem perder de vista o trecho em que estava. Se a medição de uso
  mostrar que ninguém quer um sem o outro, isso é mudança de produto (`/zion-prd-evolve`), não desta
  spec.
- **Trazer para a área visível não mexe no zoom**: reescalar sem que a pessoa peça é mais intrusivo do
  que mostrar um elemento parcialmente. Por isso a operação do `FR-012` é pan puro, com deslocamento
  mínimo, e ancora no começo do elemento quando ele não cabe. **Qual** canto é esse foi fechado em
  `/speckit-clarify` (ver Clarifications): o de partida da ordem de leitura na orientação corrente,
  uma regra só para os três tipos de elemento.
- **Folga da borda é de produto; o valor é do `plan`**: "dentro da área visível" significa **não
  encostado na borda**, tanto no `FR-008` quanto no `FR-011`, para que as duas noções não divirjam.
  Quanto é a folga é decisão do `plan`. Pela mesma razão de não divergirem, as duas medem a **mesma
  geometria** — a extensão desenhada, e não a caixa do nó (fechado em `/speckit-clarify`); **como** a
  extensão de um traçado é obtida é do `plan`.
- **Enquadramento e proporção não entram no histórico**: eles não mutam o modelo, então não são atos
  (`R-09`). Um desfazer depois de dez zooms reverte a última coisa que a pessoa **construiu**, não a
  última coisa que ela **olhou**.
- **Sessão volátil, e abertura derivada do conteúdo**: a proporção, o enquadramento e o zoom vivem na
  sessão e não estão entre o que o rascunho restaura (`RF-27` enumera estrutura, estilo e arranjo).
  Uma sessão nova — ou uma aba reaberta — não **recupera** o enquadramento da anterior: ela o
  **deriva** do conteúdo que estiver lá, ajustado à tela quando há conteúdo e no padrão declarado
  quando não há (`FR-017`). Se o produto passar a guardar a proporção ou o enquadramento entre
  sessões, isso é decisão de `rascunho-da-sessao`, não desta spec.
- **A proporção é da área de trabalho, não do documento**: ela não é atributo de diagrama nem de tipo,
  e trocar o conteúdo não a altera. Ela é uma **razão**, e mudar o tamanho da janela não a move
  (fechado em `/speckit-clarify`, ver Clarifications): a promessa do `FR-006` — permanece até que ela
  mesma a mude — não sobreviveria se alargar a janela mudasse sozinho a fração escolhida.
- **Nenhuma das duas vistas desaparece**: os mínimos existem porque diagrama e código são duas vistas
  do mesmo modelo (`R-03`); esconder uma delas seria capacidade nova, com consequências próprias, e
  não um caso extremo do arrasto da divisão. Por isso eles não são um limite **do arrasto** apenas:
  são o **tamanho mínimo da área de trabalho**, e abaixo dele quem cede é a página, não uma das vistas
  (`FR-006`).
- **A afordância dos gestos é do `plan`**: qual gesto de ponteiro aproxima o zoom, onde ficam os
  controles de ajustar à tela e de resetar, e como o nível de zoom corrente é exibido. Ele PODE
  colocá-los sobre a área do diagrama; o que isso custa é que o pedaço coberto sai da área visível
  (`FR-011`, fechado em `/speckit-clarify`) — a spec prefere descontar a sobreposição a proibi-la. O que é de
  produto é que os três existam, que cada um seja **um** gesto, que o nível corrente seja legível e
  que os três sejam alcançáveis também **sem ponteiro** (`FR-018`). **Transitar ou saltar** até o
  destino é da mesma natureza e também é do `plan` (fechado em `/speckit-clarify`): de produto são o
  destino, a barra de resposta (`SC-012`) e o que um gesto novo faz no meio do trânsito — interrompe
  e assume.
