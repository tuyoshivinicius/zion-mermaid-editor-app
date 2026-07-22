# Feature Specification: Elementos do grafo dirigido

**Feature Branch**: `elementos-grafo-dirigido`

**Created**: 2026-07-22

**Status**: Draft

**RF cobertos:** RF-01, RF-02, RF-06

**Input**: User description: "Partindo de uma sessão de diagrama já aberta, a pessoa monta um fluxo inteiramente por gestos na área do diagrama: cria nós, conexões entre eles e agrupamentos que reúnem nós; escreve o rótulo de cada nó e o texto de cada conexão, inclusive colando dentro deles texto vindo de um documento externo — que entra como texto puro, sem a formatação da origem, e reaparece byte a byte no diagrama e no código, ou reaparece marcado quando o tipo corrente não o expressa fielmente; e corrige o que errou, selecionando um elemento ou vários de uma vez, movendo, duplicando e excluindo nós, conexões e agrupamentos. Cada ato se reflete no código, que é a projeção do modelo: o código acompanha a estrutura montada, enquanto a posição para onde o elemento foi arrastado permanece conforto de sessão e não aparece no código entregue. Ao final, a pessoa tem um fluxo montado só com gestos na área do diagrama, com o código correspondente do outro lado."

## Por que esta spec existe

O walking skeleton (`specs/001-cano-modelo-codigo`, R0) provou que **diagrama e código são duas vistas
de um modelo só**, mas com um vocabulário de um elemento só: o nó retangular, criado e movido por
gesto, tudo o mais editado pelo código. Esta é a primeira spec que **enche esse cano de vocabulário**:
ela abre a família do **grafo dirigido** — nós, conexões e agrupamentos — para serem montados,
rotulados e corrigidos **inteiramente por gestos na área do diagrama**, com o código acompanhando
cada ato como projeção do modelo (`R-02`, `R-03`).

É a release **R1** e o **ponto de troca de ferramenta**: com ela, uma sessão real de diagramação de
fluxo — montar, rotular, corrigir — acontece sem voltar para a ferramenta antiga no meio do trabalho.
O que ela **não** move é a fronteira do R0: a posição continua conforto de sessão e não viaja no
código (`RN-01`), o texto continua sendo da pessoa e volta byte a byte ou marcado (`RN-02`), e o
elemento novo continua nascendo neutro (`RN-06`).

O tipo de diagrama é o mesmo herdado da sessão aberta (o Flowchart do R0); **trocar o tipo não é
escopo desta spec** (`RF-18`, de `tipo-state` e das demais). Os exemplos de código abaixo são, por
isso, de Flowchart — a conexão é a aresta `a --> b`, o agrupamento é o bloco `subgraph … end` —, mas
o comportamento descrito é do **modelo** (nó, conexão, agrupamento), que as famílias seguintes repõem
no seu próprio vocabulário sem acrescentar atividade nova à jornada.

## Clarifications

### Session 2026-07-22

- Q: Ao excluir um agrupamento (a moldura), o que acontece com os nós que estavam dentro? → A: Os nós
  **permanecem soltos** — excluir a moldura não apaga os membros (confirma o default de `FR-011`/`SC-008`).
- Q: Agrupar uma seleção que já inclui nós agrupados ou um agrupamento inteiro — o que acontece? → A:
  **Aninha** — agrupamentos podem conter outros agrupamentos (bloco dentro de bloco).
- Q: Um agrupamento pode existir sem nenhum membro dentro? → A: **Não** — o agrupamento cujo último
  membro sai deixa de existir no modelo e no código.
- Q: Pode haver conexão de um nó para ele mesmo (laço) e/ou uma segunda conexão entre o mesmo par
  (arestas paralelas)? → A: **Ambas permitidas** — a identidade da conexão é independente das pontas.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Monto a estrutura do fluxo por gestos: nós, conexões e agrupamentos (Priority: P1)

Marina parte de uma sessão já aberta e monta a espinha do fluxo sem tocar no código: cria nós, puxa
conexões de um nó para outro e reúne alguns nós num agrupamento. A cada ato, a linha correspondente
nasce no código ao lado — ela não pediu para gerar nada. Ao final, a estrutura que ela desenhou está
inteira no código, do outro lado.

**Why this priority**: é o que faz do R0 um grafo dirigido de verdade — a razão de a release R1
existir. Sem conexão e sem agrupamento, não há fluxo a montar; as duas outras histórias pressupõem
que haja estrutura para rotular e para corrigir. É um MVP viável sozinha: mesmo rotulando e excluindo
pelo código (como no R0), já se monta a estrutura de um fluxo só com gestos.

**Independent Test**: numa sessão com dois nós, puxar uma conexão de um para o outro e conferir que a
aresta correspondente apareceu no código; reunir os dois num agrupamento e conferir que o bloco de
agrupamento apareceu no código com os dois membros dentro — tudo sem gesto de sincronização.

**Acceptance Scenarios**:

1. **Given** uma sessão com dois nós na área do diagrama, **When** Marina puxa uma conexão de um nó
   (origem) até o outro (destino), **Then** uma conexão dirigida origem→destino aparece na área do
   diagrama e a aresta correspondente aparece no código, sem nenhum gesto adicional.
2. **Given** um nó de origem, **When** Marina tenta puxar uma conexão soltando-a **no espaço vazio**,
   e não sobre outro nó, **Then** nenhuma conexão nasce e nenhum nó nasce — a conexão exige nós
   existentes nas duas pontas; criar nó continua sendo o duplo-clique no vazio (R0).
3. **Given** três nós selecionados, **When** Marina aciona o gesto de agrupar, **Then** um agrupamento
   que reúne os três aparece na área do diagrama e o bloco de agrupamento correspondente aparece no
   código, listando os três nós como membros; o agrupamento nasce com um título neutro.
4. **Given** um código que Marina escreveu à mão, com espaçamento próprio e um trecho que o produto
   não lê, **When** ela cria uma conexão ou um agrupamento por gesto, **Then** as linhas novas
   aparecem e todo o resto do texto permanece exatamente como ela o escreveu (escrita cirúrgica).
5. **Given** a conexão e o agrupamento recém-criados, **When** Marina inspeciona o código, **Then**
   nenhuma posição, coordenada, seleção ou estado de sessão está lá — só a estrutura.
6. **Given** o código exibido, **When** Marina digita à mão uma aresta (`a --> b`) ou um bloco de
   agrupamento, **Then** a conexão ou o agrupamento correspondente nasce na área do diagrama conforme
   ela digita — as duas vistas continuam sendo do mesmo modelo, agora com o vocabulário do grafo
   dirigido.

---

### User Story 2 - Rotulo por gesto e colo texto de fora sem que ele mude (Priority: P2)

Marina escreve o rótulo de cada nó e o texto de cada conexão direto na área do diagrama, e às vezes
cola dentro deles um pedaço de texto que copiou de um documento. O texto colado chega limpo — sem a
formatação da origem — e reaparece exatamente como estava, tanto no desenho quanto no código; quando
o tipo corrente não consegue expressá-lo fielmente, ele reaparece **marcado**, nunca alterado às
escondidas para caber.

**Why this priority**: é o que torna o fluxo legível e é a terceira dor da persona (trazer texto de
fora). Depende de haver nós e conexões para rotular (História 1), mas é testável sozinha sobre um nó
único.

**Independent Test**: rotular um nó por gesto, digitando; depois colar dentro do rótulo um texto
copiado de um editor rico e conferir que ele entrou sem formatação e que reaparece caractere por
caractere no rótulo e no código; repetir com um texto hostil e conferir que ele volta idêntico ou
volta marcado, nunca silenciosamente alterado.

**Acceptance Scenarios**:

1. **Given** um nó na área do diagrama, **When** Marina aciona a edição do rótulo por gesto sobre o
   nó e digita um texto, **Then** o rótulo muda conforme ela digita e o texto correspondente aparece
   no código, sem gesto de confirmação.
2. **Given** uma conexão na área do diagrama, **When** Marina aciona a edição do texto da conexão por
   gesto e digita, **Then** o texto da conexão muda conforme ela digita e reaparece no código na
   linha daquela conexão.
3. **Given** o campo de rótulo de um nó em edição, **When** Marina cola dentro dele um texto copiado
   de um documento com negrito, cor e links, **Then** entra apenas o texto puro — nenhuma formatação
   da origem sobrevive — e ele aparece igual no rótulo e no código.
4. **Given** um texto colado que o tipo de diagrama corrente **expressa** fielmente, **When** ele
   entra no rótulo, **Then** ele reaparece **byte a byte** no diagrama e no código.
5. **Given** um texto colado que o tipo de diagrama corrente **não consegue** expressar fielmente em
   código, **When** ele entra no rótulo, **Then** ele reaparece **marcado** como tal — nunca é
   truncado, reescrito ou alterado em silêncio para caber.
6. **Given** uma rajada de digitação e colagem num mesmo rótulo, **When** Marina termina, **Then** o
   modelo registrou **um** ato, não um por tecla.
7. **Given** um rótulo em edição, **When** Marina troca o texto de um nó, **Then** a identidade do nó
   não muda: é o mesmo nó, renomeado — o texto é dela, a identidade é independente dele.

---

### User Story 3 - Corrijo o que errei: seleciono, movo, duplico e excluo (Priority: P3)

Marina montou o fluxo depressa e agora corrige: seleciona um elemento, ou vários de uma vez com uma
seleção retangular, arrasta-os para um arranjo melhor, duplica um trecho que se repete e exclui o que
sobrou. Cada correção se reflete no código — menos a posição, que é dela e fica na sessão. Um ato
sobre uma seleção inteira é um ato só.

**Why this priority**: é o que transforma "montei" em "montei certo" e completa a sessão real de
trabalho. Depende de haver estrutura (Histórias 1 e 2), mas cada gesto é testável sozinho.

**Independent Test**: selecionar três elementos com uma seleção retangular, arrastá-los juntos e
conferir que o código não mudou; duplicar dois nós ligados por uma conexão e conferir que nasceram
dois nós novos com identificadores próprios, o rótulo copiado e a conexão entre eles; excluir um nó e
conferir que ele e as conexões presas a ele saíram do código, e nada mais.

**Acceptance Scenarios**:

1. **Given** vários elementos na área do diagrama, **When** Marina traça uma seleção retangular sobre
   eles no espaço vazio, **Then** todos os que ela abrangeu ficam selecionados; a seleção é estado de
   sessão e não aparece no código.
2. **Given** uma seleção de N elementos, **When** Marina arrasta a seleção para outro lugar, **Then**
   todos se movem juntos, mantêm as posições relativas, e o código permanece byte-idêntico ao de
   antes do movimento.
3. **Given** um agrupamento com nós dentro, **When** Marina arrasta o agrupamento, **Then** os
   membros acompanham o movimento; nada disso aparece no código, que só carrega a estrutura, não o
   arranjo.
4. **Given** dois nós ligados por uma conexão, ambos selecionados, **When** Marina duplica a seleção,
   **Then** nascem dois nós novos com identificadores próprios e os rótulos copiados, ligados por uma
   conexão nova, colocados perto dos originais sem mover ninguém, e as linhas novas aparecem no
   código.
5. **Given** uma seleção em que só **uma** ponta de uma conexão está incluída, **When** Marina
   duplica, **Then** os nós incluídos são duplicados mas a conexão pendente **não** — ela não tem as
   duas pontas para renascer.
6. **Given** um nó com conexões presas a ele, **When** Marina exclui o nó, **Then** o nó **e** as
   conexões que o tinham como ponta somem da área do diagrama e do código — nenhuma conexão pendente
   sobra — e nenhum outro elemento é tocado.
7. **Given** uma conexão selecionada, **When** Marina a exclui, **Then** só a conexão some; os dois
   nós que ela ligava permanecem.
8. **Given** um agrupamento selecionado, **When** Marina o exclui, **Then** o agrupamento (a moldura)
   some e **os nós que estavam dentro permanecem**, agora sem agrupamento — excluir o agrupamento não
   apaga o trabalho que estava dentro dele.
9. **Given** uma seleção de N elementos, **When** Marina aplica um ato em bloco (mover, duplicar ou
   excluir a seleção inteira), **Then** o modelo registra **uma** entrada de histórico para o ato
   todo, qualquer que seja N — de 1 a 400 (o desfazer visível é de outra spec, mas a transação já
   nasce aqui).

---

### Edge Cases

- **Conexão para um nó que não existe.** Puxar uma conexão e soltá-la no vazio não cria nó nem
  conexão pela metade — a conexão exige origem e destino existentes. Meia conexão materializada
  confunde mais que nenhuma.
- **Excluir um nó no meio de conexões.** Uma conexão sem uma das pontas não é expressável no código
  sem ressuscitar a ponta que sumiu; por isso, excluir o nó leva junto as conexões presas a ele. É a
  única exclusão desta spec que remove mais de um elemento por gesto — e continua sendo **um** ato.
- **Excluir um agrupamento não é excluir os membros.** O agrupamento só reúne; tirar a moldura
  devolve os nós soltos, não destrói o que a pessoa montou dentro. Para apagar os membros, ela os
  seleciona e exclui — dois atos distintos e conscientes.
- **Duplicar uma seleção parcial de conexão.** A conexão só renasce se as **duas** pontas estiverem
  na seleção; com uma ponta só, os nós duplicam e a conexão não. O produto nunca inventa uma ponta.
- **Texto de fora que o tipo não expressa.** Colar um texto com um caractere que o tipo de diagrama
  corrente não carrega fielmente em código faz o rótulo voltar **marcado** (`RN-02`, `ADR-006`) — a
  sinalização visível completa e o tratamento de erro de sintaxe são de `codigo-de-entrada`
  (`RF-22`); aqui a regra invariável é só: byte a byte, ou marcado, **nunca** alterado em silêncio.
- **Rajada de digitação e colagem no rótulo.** Digitar rápido e colar dentro do mesmo rótulo é um ato
  só do modelo, não um ato por tecla (`R-09`).
- **Mover não é reconectar.** Arrastar uma conexão inteira é reposicionar (arranjo de sessão, não vai
  ao código). Levar a **ponta** de uma conexão para outro nó — reconectar — é `RF-07`, de
  `reconectar-conexao`; nesta spec, mudar as pontas de uma conexão é excluí-la e criar outra, ou
  editar o código.
- **Ato em bloco no envelope.** Excluir, duplicar ou mover uma seleção do tamanho do envelope (até
  400 elementos) é um ato só e não pode nascer estourando as barras de fluidez das specs seguintes
  (`R-04`, `NFR-03`/`NFR-04`).
- **Duplicar preservando estilo.** Duplicar copia o rótulo/texto (que é da pessoa), mas estilo e
  shape são de `estilo-de-elementos`/`trocar-em-bloco` (R4) — não há estilo a preservar nesta spec, e
  o elemento duplicado nasce tão neutro quanto o original.
- **Colar via área de transferência entre elementos.** Copiar um trecho do diagrama e colá-lo como
  elementos (preservando estilos) é `RF-08`, de `copiar-e-colar` (R4). O que esta spec entrega é
  **duplicar no lugar** (`RF-06`), não copiar-colar por área de transferência.
- **Agrupar sobre grupos existentes é aninhar.** Se a seleção que a pessoa agrupa já inclui nós
  agrupados ou um agrupamento inteiro, o novo agrupamento **envolve** os existentes: agrupamentos
  podem conter outros agrupamentos (bloco dentro de bloco). O gesto nunca desfaz um agrupamento
  anterior para montar o novo.
- **Agrupamento esvaziado deixa de existir.** Um agrupamento vive dos seus membros; quando o último
  sai — excluído ou retirado do grupo — a moldura **some** do modelo e do código, no mesmo ato que a
  esvaziou. Não sobra bloco de agrupamento vazio.
- **Laço e arestas paralelas são válidos.** A pessoa pode ligar um nó a si mesmo (origem = destino) e
  criar mais de uma conexão entre o mesmo par de nós. Como a identidade da conexão independe das
  pontas, cada gesto cria uma conexão nova — o produto não funde nem recusa a repetida.

## Requirements *(mandatory)*

### Functional Requirements

**Criar (RF-01)**

- **FR-001**: A pessoa DEVE conseguir criar uma **conexão dirigida** entre nós existentes, por
  um gesto de ponteiro que começa no nó de origem e termina no nó de destino, direto na área do
  diagrama. A conexão nasce origem→destino e reflete-se no código imediatamente, sem gesto de
  confirmação. Soltar o gesto **fora de um nó** não cria conexão nem nó: a conexão exige um nó
  existente em cada ponta. Origem e destino PODEM ser o **mesmo nó** (laço), e PODE haver **mais de
  uma conexão** entre o mesmo par (arestas paralelas): a identidade da conexão é independente das
  pontas, então cada gesto cria uma conexão nova — o produto não funde nem recusa a repetida.
- **FR-002**: A pessoa DEVE conseguir reunir uma **seleção de nós num agrupamento**, por um gesto de
  agrupar direto na área do diagrama. O agrupamento reflete-se no código como um bloco que o nomeia e
  lista os nós membros. Se a seleção já inclui nós agrupados ou um agrupamento inteiro, o novo
  agrupamento **aninha** os existentes — agrupamentos podem conter outros agrupamentos (bloco dentro
  de bloco), e essa composição aninhada é estrutura projetada no código; o gesto nunca desfaz um
  agrupamento anterior para montar o novo. O agrupamento nasce **neutro** (`RN-06`), com um título padrão neutro;
  editar o título do agrupamento por gesto NÃO é escopo desta spec (`RF-02` cobre rótulo de nó e
  texto de conexão) — o título edita-se pelo código, como no R0.
- **FR-003**: A criação de nó por gesto do R0 (duplo-clique no espaço vazio) CONTINUA valendo e
  satisfaz a parte "criar nós" do `RF-01`. Todo nó, conexão e agrupamento criado nesta spec nasce
  **neutro**, sem herdar tipo ou estilo de um elemento anterior (`RN-06`).

**Rotular e trazer texto de fora (RF-02)**

- **FR-004**: A pessoa DEVE conseguir editar o **rótulo de um nó** e o **texto de uma conexão** por
  gesto direto na área do diagrama, e a outra vista DEVE acompanhar conforme ela digita, sem gesto de
  confirmação.
- **FR-005**: Ao colar dentro de um rótulo ou de um texto de conexão, o conteúdo DEVE entrar como
  **texto puro**, sem a formatação da origem (negrito, cor, fonte, links, estrutura): nenhuma
  formatação de origem sobrevive à colagem.
- **FR-006**: O texto de um rótulo ou de uma conexão — digitado ou colado — DEVE reaparecer **byte a
  byte** no diagrama e no código, **ou** reaparecer **marcado** quando o tipo de diagrama corrente
  não o expressa fielmente em código. O texto NUNCA PODE ser alterado, truncado ou reescrito em
  silêncio para caber (`RN-02`, `ADR-006`). *(A sinalização visível completa da marca de
  expressividade e o aviso de erro de sintaxe são de `codigo-de-entrada`, `RF-22`; esta spec responde
  apenas pela invariante "byte a byte ou marcado, nunca em silêncio".)*
- **FR-007**: Uma rajada de digitação e colagem num mesmo rótulo ou texto DEVE contar como **um** ato
  do modelo, não como um ato por tecla (`R-09`). A identidade do nó ou da conexão é **independente**
  do texto: reescrever o rótulo não transforma o elemento em outro.

**Selecionar, mover, duplicar, excluir (RF-06)**

- **FR-008**: A pessoa DEVE conseguir **selecionar** um elemento (nó, conexão ou agrupamento) por um
  gesto de ponteiro, e **selecionar vários de uma vez** por uma seleção retangular traçada sobre o
  espaço vazio; DEVE conseguir acrescentar ou remover um elemento da seleção corrente. A seleção é
  **estado de sessão** e NUNCA aparece no código (`RN-01`).
- **FR-009**: A pessoa DEVE conseguir **mover** um elemento e mover **uma seleção inteira** de uma
  vez; os elementos da seleção movem-se juntos, mantendo as posições relativas. Mover um agrupamento
  move os nós membros junto. Uma conexão não tem posição própria: ela acompanha as pontas. A posição
  é conforto de sessão: mover DEVE deixar o código **byte-idêntico** (`RN-01`, `R-03`).
- **FR-010**: A pessoa DEVE conseguir **duplicar** um elemento ou uma seleção inteira **no lugar**. Os
  elementos duplicados nascem com **identificadores próprios** (opacos, estáveis, sequenciais da
  sessão, nunca reusados — como no R0), com os **rótulos/textos copiados** (que são dela), colocados
  por colocação local determinística perto dos originais **sem mover** nenhum elemento preexistente, e
  as linhas novas refletem-se no código. Uma conexão só é duplicada quando **as duas pontas** estão na
  seleção; um agrupamento é duplicado com a sua composição de membros. Duplicar NÃO é copiar-colar por
  área de transferência (`RF-08`, de `copiar-e-colar`).
- **FR-011**: A pessoa DEVE conseguir **excluir** um elemento ou uma seleção inteira. Excluir um nó
  remove **também as conexões presas a ele** — uma conexão sem uma das pontas não é expressável no
  código; excluir uma conexão remove só a conexão; excluir um agrupamento remove **a moldura** e
  **mantém os nós que estavam dentro**, agora sem agrupamento (excluir o agrupamento não apaga o
  trabalho contido nele). Um agrupamento que fica **sem nenhum membro** — porque seus nós foram
  excluídos ou retirados dele — **deixa de existir** no modelo e no código, no mesmo ato que o
  esvaziou: não sobra bloco de agrupamento vazio. A exclusão é cirúrgica no código: remove exatamente as linhas dos elementos
  removidos e deixa o resto byte-idêntico.

**Invariantes carregadas (do R0 e das restrições transversais)**

- **FR-012**: Cada ato desta spec — criar, rotular/colar, mover, duplicar, excluir — DEVE ser uma
  **transação** única e íntegra do modelo, e um ato aplicado a uma seleção de N elementos DEVE ser
  **uma** entrada de histórico, qualquer que seja N (`R-09`, `RN-04`). O desfazer e o refazer visíveis
  são de `desfazer-e-refazer` — aqui a transação nasce, o gesto de desfazer não.
- **FR-013**: Diagrama e código DEVEM permanecer duas vistas do **mesmo modelo**, agora incluindo
  conexões e agrupamentos: não existe estado em que as duas discordem e precisem ser reconciliadas por
  um gesto da pessoa. A leitura do código passa a reconhecer o vocabulário do grafo dirigido —
  conexões e agrupamentos — que no R0 era trecho ilegível; a entrada de um código pronto colado de
  fora, com aviso de erro de sintaxe, continua sendo de `codigo-de-entrada`.
- **FR-014**: A escrita no código feita por qualquer gesto desta spec DEVE ser **cirúrgica**: só as
  linhas do elemento afetado mudam, e todo o resto do texto — ordem, espaçamento, trechos que o
  produto não lê — permanece byte-idêntico ao que a pessoa escreveu. Nenhum gesto reescreve o
  documento inteiro numa forma canônica.
- **FR-015**: A posição de qualquer elemento e todo estado de sessão (seleção, foco, zoom, rolagem)
  NUNCA PODEM aparecer no código (`RN-01`, `R-03`). O código carrega a **estrutura** montada — nós,
  rótulos, conexões, textos de conexão, agrupamentos e sua composição —, nunca o **arranjo**.

### Key Entities

- **Modelo** — a única verdade do diagrama: quais nós, conexões e agrupamentos existem e como se
  relacionam. O diagrama visível e o código são vistas dele, nunca duas verdades a reconciliar.
- **Nó** — o elemento do R0, agora rotulável por gesto. Tem identidade estável e independente do
  rótulo; o rótulo é texto dela.
- **Conexão** — a aresta **dirigida** entre dois nós (origem→destino), que podem ser o **mesmo nó**
  (laço). Tem identidade estável na
  sessão, independente das pontas e do próprio texto; carrega um texto opcional (rótulo da conexão),
  que nasce vazio (neutro). Como a identidade independe das pontas, podem coexistir **várias
  conexões** entre o mesmo par (arestas paralelas). No código é a linha de aresta entre os identificadores das pontas. Não
  tem posição própria: acompanha as pontas.
- **Agrupamento** — o elemento que **reúne nós e outros agrupamentos** (aninhamento). Tem identidade estável e um título neutro; no código
  é o bloco que o nomeia e lista os membros. Sua moldura na área do diagrama é arranjo de sessão (não
  projetado); sua **composição de membros** é estrutura (projetada). Excluí-lo devolve os membros
  soltos. Não sobrevive sem membros: esvaziado, deixa de existir.
- **Seleção** — o conjunto de elementos que a pessoa está manipulando agora. É estado de sessão puro:
  nunca projetado no código.
- **Arranjo (posição)** — onde cada elemento está na área do diagrama. Conforto de sessão: vive na
  sessão e nunca viaja no código entregue (`RN-01`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos códigos copiados são aceitos por um mermaid de fora do produto e desenham o
  mesmo diagrama que estava visível — sobre um corpus de referência do grafo dirigido que inclui
  **conexões** e **agrupamentos**, além de nós. *(NFR-05)*
- **SC-002**: **100%** dos textos de rótulo e de conexão — digitados ou colados — voltam **byte a
  byte** ou voltam **marcados**; **0** alterações em silêncio, sobre o corpus de textos hostis por
  família. *(NFR-07, `ADR-006`)*
- **SC-003**: Colar texto de fora dentro de um rótulo ou texto de conexão traz **0 vestígios** de
  formatação da origem — só texto puro. *(RF-02)*
- **SC-004**: Mover **qualquer** elemento ou seleção deixa o código **byte-idêntico** ao de antes do
  movimento — **0 diferenças** —, e **0 ocorrências** de posição, seleção, foco ou zoom aparecem em
  qualquer código gerado. *(RN-01, R-03)*
- **SC-005**: Em **100%** das criações, edições, duplicações e exclusões por gesto, a mudança
  correspondente aparece na outra vista sem gesto adicional, em **≤100ms na mediana** dentro do
  envelope (400 nós, 500 conexões). *(NFR-03)*
- **SC-006**: Um ato em bloco (mover, duplicar ou excluir) aplicado a uma seleção de **até 400
  elementos** é **1** entrada de histórico — não N — e reverteria com **1** só desfazer. *(RN-04,
  `R-09`)*
- **SC-007**: Excluir um nó com conexões presas deixa **0 conexões pendentes** no código e no diagrama
  — nenhuma aresta sobra apontando para uma ponta que sumiu. *(FR-011)*
- **SC-008**: Excluir um agrupamento preserva **100%** dos nós que estavam dentro — **0 membros
  perdidos** por tirar a moldura. *(FR-011)*
- **SC-009**: **0 caracteres** do texto fora das linhas do elemento afetado mudam quando um gesto
  escreve no código — inclusive espaçamento, ordem das linhas e trechos que o produto não lê.
  *(FR-014)*
- **SC-010**: O gesto contínuo — traçar uma conexão, arrastar uma seleção — mantém **≥50fps** dentro
  do envelope declarado. *(NFR-03)*

## Fora de escopo

Recortes conscientes, cada um dono de outra spec do backlog:

- **Trocar o tipo de diagrama** e os demais quatro tipos (`RF-18`: `tipo-state`, `tipo-class`,
  `tipo-er`, `tipo-sequence`) — esta spec opera no tipo já aberto na sessão (o Flowchart do R0).
- **Reconectar** a ponta de uma conexão para outro nó (`RF-07`, `reconectar-conexao`, R4) — aqui,
  mudar as pontas é excluir e recriar, ou editar o código.
- **Copiar e colar** elementos por área de transferência preservando estilos (`RF-08`,
  `copiar-e-colar`, R4) — esta spec entrega **duplicar no lugar** (`RF-06`).
- **Repetir a última alteração** em outro elemento (`RF-05`, `repetir-alteracao`, R4).
- **Escolher shape** e **estilo** de nós e conexões (`RF-03`, `RF-12`, `RF-13`:
  `estilo-de-elementos`, `trocar-em-bloco`) — o elemento nasce e permanece neutro (`RN-06`).
- **Desfazer e refazer visíveis** (`RF-09`, `desfazer-e-refazer`) — a transação existe aqui
  (`FR-012`), o gesto não.
- **Editar o título de um agrupamento por gesto** — o `RF-02` cobre rótulo de nó e texto de conexão;
  o título do agrupamento edita-se pelo código.
- **Sinalização visível de erro de sintaxe e a marca de expressividade completa** (`RF-21`, `RF-22`,
  `codigo-de-entrada`) — esta spec honra só a invariante `RN-02` (byte a byte ou marcado).
- **Colar um código pronto de fora** como fluxo próprio (`RF-20`, `codigo-de-entrada`).
- **Fluxo por teclado** do ciclo principal e atalhos (`RF-10`, `RF-11`, `ciclo-por-teclado`) — os
  gestos desta spec são de ponteiro.
- **Layout automático**, orientação e preservação de posição no rearranjo (`RF-14`–`RF-17`,
  `layout-automatico`) — inclusive a divergência de arranjo **dentro** de agrupamentos, que é
  declarada lá.
- **Redimensionar áreas, zoom, cursor hand, ajustar à tela** (`RF-24`–`RF-26`, `area-de-trabalho`) — a
  rolagem do plano do diagrama para manter os elementos alcançáveis continua herdada do R0.
- **Recuperar o rascunho** ao reabrir a aba (`RF-27`, `RF-28`, `rascunho-da-sessao`) — a sessão desta
  spec é volátil.
- **Aviso de envelope estourado** (`RF-29`, `aviso-de-envelope`).

## Assumptions

Palpites informados, ancorados no R0, na PRD e no ethos do produto; candidatos a revisão por
`/speckit-clarify`.

- **Tipo herdado, fixo**: a sessão já está aberta em Flowchart (o tipo do R0) e esta spec não o troca.
  Os exemplos de código são de Flowchart (aresta `a --> b`, bloco `subgraph`), mas o comportamento é
  do modelo, que as famílias seguintes repõem.
- **Gesto de conexão**: a conexão nasce de um gesto de ponteiro que começa no nó de origem e termina
  no nó de destino, distinto de arrastar o corpo do nó (que é mover). A afordância exata (borda, alça,
  modificador) é do `plan`. Soltar no vazio não cria nó conectado — criar nó é o duplo-clique do R0.
- **Gesto de seleção múltipla**: uma seleção retangular traçada sobre o espaço vazio; acrescentar ou
  remover um elemento da seleção é um gesto de ponteiro com modificador, cuja tecla exata é do `plan`.
  Um clique no espaço vazio limpa a seleção.
- **Excluir nó leva as conexões presas**: uma aresta sem uma das pontas ressuscitaria a ponta no
  mermaid de fora — divergência proibida (`FR-013`/R0 `FR-011`); por isso as conexões presas saem com
  o nó, num ato só.
- **Excluir agrupamento é desagrupar**: tirar a moldura devolve os nós soltos e não destrói o que a
  pessoa montou dentro — coerente com o ethos "um gesto nunca apaga em silêncio o trabalho da pessoa"
  (R0 `FR-017`). Apagar os membros é outro ato, consciente. *(Confirmado em `/speckit-clarify`,
  Session 2026-07-22.)*
- **Duplicar é no lugar**: cópia com identificadores próprios, rótulos/textos copiados e colocação
  local determinística deslocada dos originais; conexão só duplica com as duas pontas na seleção. Não
  usa área de transferência (isso é `RF-08`) e não preserva estilo (não há estilo nesta spec).
- **Identificadores de conexão e agrupamento**: opacos, estáveis e sequenciais na sessão, nunca
  reusados, na mesma linhagem do contador monotônico do R0 (`FR-016` do R0). Se são um contador só ou
  um por espécie é detalhe do `plan`.
- **Conexão nasce sem texto**: o texto (rótulo) da conexão é opcional e nasce vazio — neutro
  (`RN-06`); rotular é `RF-02`.
- **Marca de expressividade mínima**: quando o tipo corrente não expressa um texto fielmente, o
  produto o marca em vez de alterá-lo; a aparência e o tratamento completos da marca (e do erro de
  sintaxe) são de `codigo-de-entrada` (`RF-22`).
- **Envelope compartilhado**: o peso por elemento que conexões e agrupamentos introduzem consome do
  envelope de densidade do produto (`R-04`); esta spec mede o próprio consumo e não pode nascer
  estourando as barras do `NFR-03`/`NFR-04`.
- **Sessão volátil**: fechar a aba perde o trabalho; persistir o rascunho é `RF-27`/`RF-28`.
- **Área de transferência para colar texto**: quando o navegador negar ou não oferecer o recurso, a
  pessoa é avisada de que o texto não foi colado, em vez de a colagem falhar em silêncio.
