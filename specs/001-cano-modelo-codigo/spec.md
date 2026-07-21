# Feature Specification: Cano modelo ⇄ código

**Feature Branch**: `cano-modelo-codigo`

**Created**: 2026-07-21

**Status**: Draft

**RF cobertos:** RF-19, RF-23

**Input**: User description: "Especifique a spec vertical cano-modelo-codigo, o walking skeleton (R0) do produto: a pessoa cria um nó na área do diagrama e vê a linha correspondente nascer no código mermaid; edita esse mesmo código e vê o nó mudar na área do diagrama conforme digita, sem perder o que já estava construído; arrasta o nó para outro lugar e copia o código com um gesto — e a posição para onde arrastou não está no código copiado."

## Por que esta spec existe

Esta é a primeira fatia vertical do produto (release **R0** — *o cano*). Ela não entrega vocabulário:
entrega a **prova de que diagrama e código são duas vistas de um modelo só**, nos dois sentidos, com
o código saindo do outro lado como produto final. Toda spec seguinte do backlog acrescenta
vocabulário sobre este cano; se ele não fecha, nada do que vier depois fecha.

Por isso o recorte é mínimo por desenho: **um tipo de diagrama (Flowchart) e um só gesto de criação
e um de movimentação de nó** — o suficiente para provar a ida (diagrama → código), a volta (código →
diagrama) e a fronteira do que é durável (a posição não viaja).

## Clarifications

### Session 2026-07-21

- Q: O gesto de excluir nó na área do diagrama está no escopo do R0, dado que o backlog o atribui a `elementos-grafo-dirigido`? → A: Excluir só pelo código no R0 — apagar a linha no código remove o nó; o gesto de excluir na área do diagrama fica com `elementos-grafo-dirigido`.
- Q: Qual é o código de um diagrama com zero nós, do qual dependem o FR-011, o SC-001 e o gesto de copiar com o diagrama vazio? → A: A projeção sempre emite o cabeçalho do tipo, mesmo com zero nós — o código de um diagrama vazio é a declaração `flowchart` sozinha, válida e copiável.
- Q: Onde nasce, na área do diagrama, o nó materializado a partir do código, que não tem posição escolhida por ninguém? → A: Colocação local determinística — ancorado no elemento anterior na ordem do código, em espaço livre próximo, sem mover ninguém; o mesmo código produz sempre as mesmas posições.
- Q: O rótulo padrão do nó recém-criado é único, e dois nós podem colidir no código? → A: Rótulo padrão neutro numerado na sessão ("Nó 1", "Nó 2"…), e dois nós nunca compartilham identificador no código.
- Q: O que a área do diagrama mostra quando o código declara um tipo que não é Flowchart? → A: Sem caso especial — o cabeçalho desconhecido é trecho ilegível e é ignorado; o que restar no texto dentro do vocabulário de nó vira diagrama, podendo ser vazio.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - O nó nasce e a linha aparece no código (Priority: P1)

Marina abre o produto, cria um nó na área do diagrama e vê, no mesmo instante, a linha
correspondente aparecer no código mermaid ao lado. Ela não pediu para gerar código, não apertou nada
para sincronizar: o código é a outra vista do que ela acabou de fazer.

**Why this priority**: é a metade "ida" do cano e o primeiro sinal de vida do produto. Sem ela não
existe nada para editar nem para copiar; as duas outras histórias pressupõem que haja um nó.

**Independent Test**: criar um nó e conferir que o código exibido passou a conter a linha
correspondente, sem nenhum gesto adicional. Entrega valor sozinha: já é um gerador de mermaid por
gesto direto.

**Acceptance Scenarios**:

1. **Given** uma sessão recém-aberta com o diagrama vazio, **When** Marina cria um nó na área do
   diagrama, **Then** o nó aparece na área do diagrama e o código exibido passa a conter uma linha
   correspondente a esse nó, sem nenhum gesto adicional de sincronização.
2. **Given** um diagrama com um nó já criado, **When** Marina cria um segundo nó, **Then** o código
   passa a conter as duas linhas, e a linha do primeiro nó permanece como estava.

---

### User Story 2 - Escrevo no código e o diagrama acompanha conforme digito (Priority: P2)

Marina vai ao código, escreve mermaid à mão e vê o diagrama mudar enquanto digita — sem apertar nada
para aplicar. Enquanto ela digita, o que já estava construído continua na tela: uma palavra a meio
caminho não apaga o trabalho dela.

**Why this priority**: é a metade "volta" do cano — a que prova que existe *um* modelo, e não um
gerador de texto de mão única. É também a que carrega o risco maior do R0: código incompleto é
estado normal de digitação, não erro.

**Independent Test**: com um diagrama já construído, digitar no código caractere a caractere e
conferir, a cada tecla, que o diagrama reflete o texto e que nenhum elemento real desapareceu no
caminho.

**Acceptance Scenarios**:

1. **Given** um diagrama com um nó, **When** Marina edita no código o texto que identifica esse nó,
   **Then** o nó na área do diagrama muda conforme ela digita, sem gesto de confirmação.
2. **Given** um diagrama com nós criados, **When** Marina apaga no código a linha de um deles,
   **Then** esse nó desaparece da área do diagrama e os demais permanecem — é assim que se remove um
   nó no R0.
3. **Given** um diagrama com nós, **When** Marina digita uma linha nova no código, letra por letra,
   **Then** em nenhum momento intermediário um nó que já existia some da área do diagrama.
4. **Given** um código em estado intermediário de digitação, sintaticamente incompleto, **When**
   Marina para de digitar, **Then** a área do diagrama continua exibindo um diagrama — nunca uma
   tela vazia, nunca uma prévia quebrada.
5. **Given** um diagrama cujos nós Marina já arrastou para posições escolhidas por ela, **When** ela
   edita o código, **Then** os nós preexistentes permanecem exatamente onde estavam.
6. **Given** o código totalmente apagado, **When** Marina para de digitar, **Then** a área do
   diagrama mostra um diagrama vazio, e o produto continua utilizável.

---

### User Story 3 - Arrasto o nó e levo embora o código, sem a minha bagunça dentro (Priority: P3)

Marina arrasta o nó para onde ela quer enxergá-lo e copia o código com um gesto só. O que ela cola no
documento de arquitetura é o diagrama que ela desenhou — mas sem nenhum vestígio de onde ela
arrastou as coisas: a posição foi conforto da sessão dela, não conteúdo.

**Why this priority**: fecha o cano entregando o produto final e prova a fronteira do que é durável.
Depende de haver nó, mas o nó pode vir tanto da História 1 quanto da História 2.

**Independent Test**: mover todos os nós de um diagrama, copiar o código, e conferir que o texto
copiado é idêntico ao de antes do movimento e que ele desenha o mesmo diagrama quando renderizado
por um mermaid de fora.

**Acceptance Scenarios**:

1. **Given** um diagrama com nós, **When** Marina arrasta um nó para outro lugar, **Then** o nó fica
   onde ela soltou e o código permanece byte-idêntico ao de antes do arraste.
2. **Given** um diagrama pronto, **When** Marina aciona o gesto de copiar o código, **Then** o código
   inteiro vai para a área de transferência com esse único gesto, sem ela precisar selecionar texto à
   mão.
3. **Given** um código copiado do produto, **When** ele é colado numa ferramenta mermaid qualquer,
   **Then** é aceito sem erro e desenha o mesmo diagrama que estava visível.
4. **Given** um código copiado do produto, **When** ele é inspecionado, **Then** não há nele nenhuma
   posição, coordenada, nível de zoom, seleção ou foco — nada da sessão de Marina.
5. **Given** o gesto de copiar acionado, **When** a cópia se completa, **Then** Marina recebe
   confirmação visível de que o código foi copiado; se a cópia não puder acontecer, ela é avisada
   disso em vez de acreditar que copiou.

---

### Edge Cases

- **Digitar uma palavra-chave passa por prefixos que parecem outra coisa.** Enquanto Marina digita, o
  produto pode desenhar caixas espúrias que somem na tecla seguinte. É efeito visual conhecido e
  aceito no R0; o que não pode acontecer é um elemento **real** desaparecer.
- **Código que o produto não consegue ler inteiro.** A parte que ele entende vira diagrama; o resto é
  ignorado sem derrubar o que já estava. Sinalizar *onde* está o erro é de outra spec — aqui a regra é
  apenas: sempre sobra um diagrama.
- **Código de um tipo que não é Flowchart.** Não há caso especial: o cabeçalho desconhecido é apenas
  um trecho que o produto não lê e é ignorado como qualquer outro; o que restar no texto dentro do
  vocabulário de nó vira diagrama — podendo ser vazio, se a pessoa apagou as linhas dos nós. O
  produto não quebra e segue utilizável. Escolher e trocar o tipo é de outra spec.
- **Rajada de digitação.** Marina digita rápido; o produto trata a rajada como um ato só do modelo,
  não como um ato por tecla.
- **Arrastar e digitar quase ao mesmo tempo.** Uma edição no código durante ou logo após um arraste
  não reposiciona os nós preexistentes nem descarta o arraste.
- **Copiar com o diagrama vazio.** O gesto funciona e copia a declaração do tipo sozinha (FR-014),
  em vez de falhar em silêncio ou copiar texto vazio.
- **Documento grande.** Com um documento no tamanho do envelope declarado do produto (400 nós), a
  digitação no código continua respondendo dentro da barra; o cano não pode nascer já estourando o
  orçamento das specs seguintes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A pessoa DEVE conseguir criar um nó diretamente na área do diagrama, por um gesto
  direto, sem passar pelo código.
- **FR-002**: Criar ou mover um nó DEVE refletir-se no código exibido imediatamente, sem nenhum
  gesto de confirmação, geração ou sincronização — exceto pela posição, que nunca aparece (FR-008).
  Remover um nó no R0 é apagar a linha dele no código (FR-003); o gesto de excluir na área do
  diagrama é de outra spec.
- **FR-003**: A pessoa DEVE conseguir escrever e editar o código mermaid diretamente, e o diagrama
  DEVE acompanhar conforme ela digita, sem gesto de confirmação.
- **FR-004**: Enquanto a pessoa digita no código, nenhum elemento já materializado PODE desaparecer
  da área do diagrama por causa de um estado intermediário da digitação. Só desaparece o que a pessoa
  de fato removeu do texto.
- **FR-005**: A leitura do código DEVE sempre produzir um diagrama — inclusive para texto vazio,
  incompleto, parcialmente ilegível ou com cabeçalho de outro tipo. "Nada" e "prévia quebrada" não
  são resultados aceitáveis. Trecho que o produto não lê é ignorado, nunca derruba o documento
  inteiro, e não recebe tratamento especial por ser um cabeçalho.
- **FR-006**: Diagrama e código DEVEM ser duas vistas do mesmo modelo: não existe estado em que os
  dois discordem e precisem ser reconciliados por um gesto da pessoa.
- **FR-007**: A pessoa DEVE conseguir mover um nó na área do diagrama, e a posição escolhida DEVE
  permanecer até que ela mesma a mude.
- **FR-008**: A posição de um nó — e qualquer outro estado de sessão, como zoom, seleção e foco — NÃO
  PODE aparecer no código. Mover elementos DEVE deixar o código byte-idêntico.
- **FR-009**: Nenhuma operação desta spec — criar, mover, digitar no código, inclusive apagar uma
  linha — PODE reposicionar os elementos preexistentes do diagrama.
- **FR-010**: A pessoa DEVE conseguir copiar o código inteiro com um único gesto, sem selecionar
  texto à mão, e DEVE receber retorno visível do resultado desse gesto — inclusive quando a cópia não
  puder ser concluída.
- **FR-011**: O código copiado DEVE ser aceito por um mermaid de fora do produto e DEVE desenhar o
  mesmo diagrama que estava visível na área do diagrama.
- **FR-012**: Toda mutação do modelo DEVE ser um ato único e íntegro; uma rajada de digitação DEVE
  contar como um ato só, não como um ato por tecla. *(Restrição transversal `R-09`, herdada por toda
  spec que muta o modelo. O desfazer visível é de outra spec.)*
- **FR-013**: O nó criado nesta spec DEVE nascer neutro, sem herdar nada de um nó anterior. O
  rótulo padrão DEVE ser neutro e **numerado na sessão** ("Nó 1", "Nó 2"…), de modo que dois nós
  recém-criados sejam distinguíveis nas duas vistas sem que ninguém precise renomeá-los.
- **FR-014**: A projeção do modelo em código DEVE sempre produzir texto sintaticamente válido,
  inclusive com zero nós — nesse caso o código é a declaração do tipo sozinha. "Código vazio" não é
  saída aceitável da projeção, do mesmo modo que "nada" não é saída aceitável da leitura (FR-005).
- **FR-015**: O nó materializado a partir do código, sem posição escolhida pela pessoa, DEVE nascer
  por **colocação local determinística** — ancorado no elemento anterior na ordem do código, em
  espaço livre próximo — sem mover nenhum elemento preexistente (FR-009). O mesmo código DEVE
  produzir sempre as mesmas posições. Rearranjar o diagrama inteiro nunca é efeito de uma edição.
- **FR-016**: Dois nós NUNCA PODEM compartilhar identificador no código. A identidade do nó é
  independente do texto do rótulo: reescrever o rótulo de um nó não o transforma em outro nó.

### Key Entities

- **Modelo** — a única verdade do diagrama: quais nós existem e como se identificam. O diagrama
  visível e o código são vistas dele, nunca duas verdades a acertar entre si.
- **Nó** — o elemento que esta spec materializa. Tem identidade — única, estável e independente do
  texto (FR-016) — e um rótulo, que nasce numerado na sessão (FR-013); tudo o mais (shape, estilo,
  conexões, agrupamento) é de outras specs.
- **Código mermaid** — a projeção do modelo em texto. É o produto final que se leva embora, e só
  carrega o que é durável.
- **Arranjo (posição)** — onde cada nó está na área do diagrama. É conforto de sessão: vive na
  sessão e nunca é projetado no código. Vem do gesto da pessoa quando ela cria ou arrasta o nó, e da
  colocação local determinística (FR-015) quando o nó nasce do código.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos códigos copiados são aceitos por um mermaid de fora do produto e desenham
  o mesmo diagrama que estava visível — sobre um corpus de referência de Flowchart que inclui o
  documento de **zero nós**, sem tolerância parcial. *(NFR-05)*
- **SC-002**: **0 perdas** de elemento real enquanto se digita: percorrendo **todos** os prefixos dos
  documentos de referência, nenhum elemento já materializado desaparece e a leitura do código nunca
  devolve vazio. *(NFR-08)*
- **SC-003**: Com um documento no tamanho do envelope declarado (**400 nós**), a resposta a uma tecla
  no editor de código fica em **≤50ms na mediana**. *(NFR-03)*
- **SC-004**: Mover **todos** os nós de um documento deixa o código **byte-idêntico** ao de antes do
  movimento — **0 diferenças** —, e **0 ocorrências** de posição, zoom, seleção ou foco aparecem em
  qualquer código gerado. *(RN-01, R-03)*
- **SC-005**: Em **100%** das criações, das edições e das remoções pelo código, a mudança
  correspondente aparece na outra vista sem gesto adicional, em **≤100ms na mediana** dentro do
  envelope. *(NFR-03)*
- **SC-006**: Copiar o código inteiro custa **1 gesto** e **0 seleções manuais de texto**, e o
  resultado do gesto — sucesso ou falha — é visível em **100%** das tentativas.
- **SC-007**: Uma rajada de digitação de **N teclas** num mesmo rótulo produz **1** ato no modelo,
  não N — para qualquer N. *(R-09)*
- **SC-008**: **0 reposicionamentos** de elemento preexistente após qualquer operação desta spec, e
  ler o mesmo código duas vezes produz posições **idênticas** para os nós nascidos dele — **0
  divergências**. *(RN-03)*

## Fora de escopo

Recortes conscientes, cada um dono de outra spec do backlog:

- Vocabulário completo de elementos: conexões, agrupamentos, seleção múltipla, duplicar, reconectar,
  copiar e colar elementos (`elementos-grafo-dirigido`, `reconectar-conexao`, `copiar-e-colar`).
- **Excluir nó pelo gesto na área do diagrama** (`elementos-grafo-dirigido`) — no R0 remove-se um nó
  apagando a linha dele no código.
- Shapes, estilo de nó e de conexão (`estilo-de-elementos`, `trocar-em-bloco`).
- Layout automático, orientação e preservação de posição no rearranjo (`layout-automatico`).
- Desfazer e refazer visíveis (`desfazer-e-refazer`) — a transação existe aqui (FR-012), o gesto não.
- Recuperação do rascunho ao reabrir a aba (`rascunho-da-sessao`).
- Sinalização de erro de sintaxe e marca de expressividade (`codigo-de-entrada`).
- Colar um código pronto de fora como fluxo próprio (`codigo-de-entrada`).
- Os demais quatro tipos de diagrama e a troca de tipo (`tipo-state`, `tipo-class`, `tipo-er`,
  `tipo-sequence`).
- Fluxo por teclado do ciclo principal (`ciclo-por-teclado`).
- Redimensionar as áreas, zoom, cursor hand e ajustar à tela (`area-de-trabalho`).
- Aviso de envelope estourado (`aviso-de-envelope`).

## Assumptions

- **Um tipo só, fixo**: o diagrama desta spec é Flowchart, e não há como trocá-lo — escolher o tipo é
  `RF-18`, de outra spec.
- **Rótulo do nó**: o nó nasce com um rótulo padrão neutro e numerado na sessão (FR-013) e é
  identificável no código por identidade própria, não pelo texto (FR-016). A edição rica
  de rótulo, inclusive com texto colado de fora, é `RF-02` e fica de fora; esta spec só precisa de
  rótulo o bastante para que a ida e a volta sejam observáveis.
- **Gestos de ponteiro**: criar e arrastar o nó são gestos de ponteiro. O ciclo por teclado é
  `RF-10`/`RF-11`, de outra spec.
- **Sessão única e volátil**: fechar a aba perde o trabalho. Persistir o rascunho é `RF-27`/`RF-28`.
- **Área de transferência**: quando o navegador negar ou não oferecer o recurso de cópia, a pessoa é
  avisada de que o código não foi copiado — falhar em silêncio não é opção.
- **Corpus de referência**: os documentos de Flowchart usados para medir SC-001 e SC-002 são os
  mesmos já empregados na evidência que sustenta o NFR-05 e o NFR-08, restritos ao vocabulário desta
  spec.
- **Envelope compartilhado**: o custo por elemento que esta spec introduz consome do envelope de
  densidade do produto (`R-04`); ela mede o próprio consumo, porque é a primeira a gastar dele.
