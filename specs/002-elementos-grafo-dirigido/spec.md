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
- Q: Como um nó sai de um agrupamento? → A: Por **gesto explícito** de retirar/desagrupar
  (`FR-016`) — o pertencimento é explícito no modelo, não geométrico: arrastar um nó para fora da
  moldura é só arranjo e deixa o código byte-idêntico.
- Q: Ao duplicar uma seleção que contém um agrupamento, o que entra na cópia? → A: **Fecho
  transitivo** — o agrupamento traz seus membros junto (recursivamente, inclusive aninhados), e a
  regra "conexão só renasce com as duas pontas" aplica-se ao conjunto **já expandido**.
- Q: Onde vive a marca de inexpressividade (`FR-006`)? → A: **No modelo e no diagrama** — o elemento
  fica sinalizado; o código recebe a forma mais fiel que o tipo expressa, **sem artefato extra**, e
  continua válido para um mermaid de fora. A aparência definitiva da marca é de `RF-22`.
- Q: Clicar num nó membro de um agrupamento seleciona o quê? → A: **O nó** — o clique pega o elemento
  mais específico sob o ponteiro; o agrupamento seleciona-se pela sua **moldura ou título**.
- Q: Como os agrupamentos entram no envelope de densidade? → A: **Contam como nó** — consomem do
  orçamento de 400 do `NFR-03`, sem número novo de produto; o aninhamento é medido, não limitado.
- Q: Agrupar uma seleção que contém **parte** dos membros de um agrupamento existente — o que
  acontece? → A: Os membros selecionados **mudam de dono**: saem do agrupamento antigo e entram no
  novo; o antigo mantém os demais e deixa de existir se esvaziar (`FR-011`). Um nó pertence a **no
  máximo um** agrupamento — não há sobreposição parcial.
- Q: A seleção retangular pega por **contenção** ou por **toque**, e como a conexão entra? → A:
  **Contenção** para nós e agrupamentos (o elemento inteiro dentro do retângulo); a conexão entra
  **derivada** — quando as **duas pontas** entram.
- Q: O que acontece com as **quebras de linha** de um texto colado num rótulo? → A: Entram como
  **qualquer outro caractere** e seguem `FR-006` — byte a byte se o tipo corrente as expressa,
  **marcado** se não; a edição não termina ao colar multi-linha e nada é colapsado nem truncado.
- Q: Um agrupamento pode ser **ponta** de uma conexão? → A: **Não** — só nó em cada ponta; soltar a
  conexão sobre a moldura ou o título de um agrupamento não cria nada, como soltar no vazio. Ligar
  grupos é ligar os seus nós.
- Q: O que acontece quando a pessoa apaga **todo** o rótulo de um nó por gesto? → A: **Vazio é
  vazio** — a caixa fica sem rótulo e o código leva a forma que o tipo usa para rótulo vazio; se o
  tipo não a expressa, o elemento volta **marcado** (`FR-006`). O identificador NUNCA vaza para o
  desenho como rótulo, e o rótulo neutro do R0 não é restaurado.
- Q: Onde nasce, no texto, a linha de um elemento que é membro de um agrupamento? → A: A
  **declaração** nasce sempre no **fim do documento** (regra herdada do R0, sem exceção); o
  pertencimento é uma **menção do identificador** inserida dentro do bloco — duas inserções
  cirúrgicas, **nenhuma** realocação de linha preexistente (`FR-002`, `FR-014`, `SC-009`).
- Q: Como um nó entra num agrupamento que **já existe** (agrupar sempre cria um novo, e aninha)? → A:
  Por **gesto explícito de adicionar**, simétrico ao de retirar — o `FR-016` passa a ser o requisito
  de **mudar pertencimento** (entrar e sair). Criar um nó dentro da moldura o deixa **solto**: a
  criação é neutra e o pertencimento nunca é geométrico.
- Q: Seleção que abrange um agrupamento **e** seus membros — como o ato em bloco trata a
  sobreposição? → A: **Seleção normalizada no ato** — cada elemento é afetado **exatamente uma vez**;
  o membro já carregado pelo seu agrupamento não é processado de novo (nada de deslocamento em dobro
  nem cópia em dobro). A regra de contenção do `FR-008` fica intacta.
- Q: Duplicar um nó membro de um agrupamento, sem o agrupamento selecionado — a cópia entra no
  agrupamento ou nasce solta? → A: **Herda o agrupamento do original** — a cópia nasce membro do
  mesmo agrupamento; duplicar reproduz o elemento no contexto em que ele está.
- Q: Agrupar nós que já existiam mexe nas linhas em que eles foram declarados? → A: **Não** —
  agrupar é **inserção pura**: nasce só o bloco, que **menciona os identificadores** dos membros; as
  declarações originais ficam onde e como estavam (`FR-014`, `SC-009`).
- Q: Uma aresta escrita à mão **dentro** do bloco de agrupamento agrupa as suas pontas? → A: **Sim** —
  **qualquer menção** do identificador dentro do bloco cria pertencimento, inclusive como ponta de uma
  aresta escrita ali, seguindo a semântica do mermaid de fora (`SC-001`). O produto **escreve** só a
  menção isolada (`FR-017`), mas **lê** as duas formas.
- Q: Ao duplicar um agrupamento intitulado, a cópia leva o **título**? → A: **Sim** — o título é texto
  da pessoa e é copiado como rótulo de nó e texto de conexão; só o **identificador** é novo. O título
  neutro do `FR-002` é do agrupamento que nasce do gesto de **agrupar**, não da cópia.
- Q: Um bloco de agrupamento **vazio escrito à mão** no código — existe ou é ignorado? → A:
  **Existe e é exibido** enquanto o código o declara; a proibição de agrupamento vazio governa os
  **gestos** (nenhum gesto cria ou deixa moldura órfã), não o que a pessoa escreveu (`SC-001`).
- Q: Duplicar uma seleção que contém **só a conexão**, sem as pontas — o que nasce? → A: Uma
  **conexão paralela** entre os mesmos dois nós: a cópia **herda as pontas** do original, como a cópia
  de um membro herda o agrupamento (`FR-001` já admite arestas paralelas). Com **exatamente uma**
  ponta duplicada no mesmo ato, a conexão continua não renascendo.
- Q: E quando o código escrito à mão menciona o mesmo nó em **dois** blocos, o que o modelo não
  comporta? → A: A regra é **concordar com o mermaid de fora** — o produto adota o pertencimento que
  o mermaid desenha, seja qual for o desempate, que é medido e entra no corpus do `SC-001`; nada é
  reescrito no código da pessoa.
- Q: O texto integral de um elemento **marcado** vive só no modelo; o que acontece com ele quando a
  pessoa edita **outra** linha do código e o documento é relido? → A: **O modelo prevalece enquanto o
  texto daquele elemento não for tocado no código** — a análise casa a linha com o elemento já vivo
  (pelo identificador) e, se a forma degradada dele continua byte-idêntica, o texto integral e a marca
  **permanecem**. Só quando a pessoa **edita aquele texto** no código o modelo adota o que ela
  escreveu (e a marca cai ou se recalcula). Reanálise não é perda silenciosa (`RN-02`, `FR-006`).
- Q: Um agrupamento externo cujo único membro é um agrupamento interno; a pessoa exclui o último nó
  de dentro do interno — o externo, que ficou vazio, some? → A: **Cascata até o fim, no mesmo ato** —
  o esvaziamento sobe pelos níveis aninhados até o primeiro que ainda tenha membro, e a cascata
  inteira é **uma** entrada de histórico (`FR-011`, `FR-012`). Título editado não salva a moldura:
  título é texto, não membro.
- Q: Há teto de tamanho para o texto colado num rótulo, dado o envelope do `NFR-03` e a barra de
  ≤100ms? → A: **Não** — o texto entra **inteiro**, sem recusa nem truncamento; o envelope conta
  **elementos**, não caracteres, e o custo do texto muito grande é **medido, não limitado** (mesma
  linhagem do aninhamento), virando insumo de `/zion-prd-evolve` se doer (`FR-005`, `RN-02`).
- Q: O que o gesto de agrupar faz com uma seleção **vazia**, ou que só tem **conexões**? E com **um**
  elemento só? → A: **Nada nasce se não há membro possível; um membro basta** — sem nó nem
  agrupamento na seleção, o gesto não faz nada (nenhuma moldura, nenhuma entrada de histórico); com
  **1 ou mais**, o agrupamento nasce normalmente e as conexões da seleção são ignoradas, por não serem
  membros (`FR-002`, `FR-011`).
- Q: Com o editor de rótulo **aberto** sobre um nó, a pessoa exclui aquele nó **pelo código** — o que
  acontece com a edição em curso? → A: **A edição é encerrada e descartada com o elemento** — o nó
  saiu do modelo, então não há o que editar: o editor fecha, o que ela já digitou (que já propagara
  conforme digitava) some junto com o nó, e nada de fantasma sobrevive. É **um** ato, o da exclusão
  pelo código (`FR-004`, `FR-012`, `FR-013`).

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
   código, **When** ele entra no rótulo, **Then** o elemento aparece **marcado** no diagrama e o
   texto integral fica no modelo, enquanto o código leva a forma mais fiel que o tipo expressa, sem
   nenhum artefato acrescentado — nunca é truncado, reescrito ou alterado em silêncio para caber.
6. **Given** uma rajada de digitação e colagem num mesmo rótulo, **When** Marina termina, **Then** o
   modelo registrou **um** ato, não um por tecla.
7. **Given** um rótulo em edição, **When** Marina troca o texto de um nó, **Then** a identidade do nó
   não muda: é o mesmo nó, renomeado — o texto é dela, a identidade é independente dele.
8. **Given** um nó rotulado, **When** Marina apaga **todo** o rótulo, **Then** a caixa fica **sem
   rótulo** — o produto não repõe o rótulo neutro nem exibe o identificador do nó — e o código leva a
   forma de rótulo vazio do tipo corrente, ou o elemento volta marcado se o tipo não a expressa.

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
   eles no espaço vazio, **Then** todos os que ela abrangeu **por inteiro** ficam selecionados — os
   apenas encostados pela borda do retângulo, não —, e as conexões cujas duas pontas entraram vêm
   junto; a seleção é estado de sessão e não aparece no código.
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
10. **Given** um nó membro de um agrupamento, **When** Marina o arrasta para fora da moldura (ou
    arrasta um nó solto para dentro dela), **Then** ele apenas muda de lugar: continua com o mesmo
    pertencimento e o código permanece byte-idêntico — arrastar não agrupa nem desagrupa.
11. **Given** um agrupamento com três nós ligados entre si, com **só a moldura** selecionada,
    **When** Marina duplica, **Then** nascem um agrupamento novo — com identificador próprio e **o
    título do original copiado** — **e** cópias dos três nós (com identificadores próprios) e das
    conexões entre eles; nenhum nó original passa a pertencer a dois agrupamentos.
12. **Given** um agrupamento com três nós, **When** Marina aciona o gesto de retirar um dos membros
    (ou o de desagrupar o agrupamento inteiro), **Then** o membro sai do bloco no código e fica
    solto na área do diagrama — e, se era o último membro, o bloco de agrupamento some do código no
    mesmo ato.
13. **Given** um agrupamento já existente e um nó solto criado depois, **When** Marina aciona o gesto
    de adicionar o nó àquele agrupamento, **Then** o nó passa a ser membro e o seu identificador
    passa a ser mencionado dentro do bloco no código — a declaração dele fica onde estava, o
    agrupamento não perde identidade nem título e nenhuma outra linha muda; criar o nó **dentro da
    moldura** não teria bastado: ele nasceu solto.
14. **Given** uma conexão selecionada **sozinha**, sem nenhuma das suas pontas na seleção, **When**
    Marina duplica, **Then** nasce uma **segunda conexão entre os mesmos dois nós** (aresta paralela,
    com identificador próprio e o texto copiado), a linha nova aparece no código e nenhum nó é criado.

---

### Edge Cases

- **Conexão para um nó que não existe.** Puxar uma conexão e soltá-la no vazio não cria nó nem
  conexão pela metade — a conexão exige origem e destino existentes. Meia conexão materializada
  confunde mais que nenhuma.
- **Conexão solta sobre um agrupamento.** A ponta de uma conexão é sempre um **nó**: soltar o gesto
  sobre a moldura ou o título de um agrupamento não cria conexão nem escolhe um membro por
  proximidade — é o mesmo desfecho de soltar no vazio. Ligar dois grupos é ligar os nós deles;
  agrupamento como ponta seria vocabulário novo, com consequência em excluir, aninhar e duplicar,
  e não é da R1.
- **Excluir um nó no meio de conexões.** Uma conexão sem uma das pontas não é expressável no código
  sem ressuscitar a ponta que sumiu; por isso, excluir o nó leva junto as conexões presas a ele. É a
  única exclusão desta spec que remove mais de um elemento por gesto — e continua sendo **um** ato.
- **Excluir um agrupamento não é excluir os membros.** O agrupamento só reúne; tirar a moldura
  devolve os nós soltos, não destrói o que a pessoa montou dentro. Para apagar os membros, ela os
  seleciona e exclui — dois atos distintos e conscientes.
- **Duplicar uma seleção parcial de conexão.** Com **uma ponta só** duplicada, os nós duplicam e a
  conexão não: ela teria de escolher entre a cópia e o original, e o produto nunca inventa nem elege
  uma ponta. Com **as duas** pontas duplicadas (seleção já expandida pelos membros dos agrupamentos),
  a conexão nova liga as **cópias**.
- **Duplicar uma conexão sozinha.** Selecionar só a aresta e duplicar faz nascer uma **conexão
  paralela** entre os mesmos dois nós: sem nenhuma ponta duplicada no ato, a cópia **herda as pontas**
  do original — a mesma leitura que faz a cópia de um nó membro nascer no agrupamento do original.
  Arestas paralelas são válidas (`FR-001`), então o gesto tem efeito legítimo em vez de morrer em
  silêncio.
- **Duplicar só a moldura de um agrupamento.** Selecionar apenas o agrupamento e duplicar traz os
  membros junto — a cópia é do agrupamento *e do que ele reúne*, recursivamente. Duplicar a moldura
  sozinha produziria um agrupamento vazio, que não existe (`FR-011`); e a cópia nunca compartilha os
  nós originais: cada membro copiado é um elemento novo, com identificador próprio.
- **Agrupamento e membros na mesma seleção.** Traçar um retângulo sobre um agrupamento abrange, por
  contenção, a moldura **e** os nós de dentro. O ato em bloco não pode contar cada membro duas vezes
  — uma por si, outra pelo agrupamento que o carrega: a seleção é **normalizada** antes de agir, e
  cada elemento é movido, duplicado ou excluído uma vez só. Um arrasto nunca desloca o membro o
  dobro do que deslocou a moldura.
- **Duplicar um membro sem o agrupamento.** A cópia de um nó agrupado nasce **no mesmo agrupamento**
  do original — duplicar reproduz o elemento no contexto em que ele está, e um nó desenhado dentro da
  moldura sem pertencer a ela contradiria a leitura do diagrama. No código isso são duas inserções: a
  declaração da cópia no fim do documento e a menção do seu identificador dentro do bloco (`FR-017`).
  Tirar a cópia do grupo, se for o caso, é o gesto de `FR-016`.
- **Texto de fora que o tipo não expressa.** Colar um texto com um caractere que o tipo de diagrama
  corrente não carrega fielmente em código faz o rótulo voltar **marcado** (`RN-02`, `ADR-006`): o
  elemento fica sinalizado no diagrama, o texto integral fica no modelo e o código leva a forma mais
  fiel possível — sem comentário nem artefato, para continuar valendo lá fora. Mexer noutra linha do
  documento depois disso **não** cobra o texto de volta: enquanto a forma degradada daquele elemento
  continuar byte-idêntica, a releitura preserva o texto integral e a marca; a degradação só se torna
  definitiva quando a pessoa **edita aquele texto** no código, que é uma escolha dela. A aparência
  definitiva da sinalização e o tratamento de erro de sintaxe são de `codigo-de-entrada` (`RF-22`);
  aqui a regra invariável é: byte a byte, ou marcado, **nunca** alterado em silêncio.
- **Rótulo esvaziado.** Apagar tudo é uma escolha, não um engano a corrigir: o nó fica sem rótulo e
  assim permanece. O produto não repõe o "Nó 3" do R0 nem passa a exibir o identificador `n3` — o
  identificador é chave, não texto dela. Se o tipo corrente não expressa rótulo vazio em código, vale
  a regra geral: volta **marcado** (`FR-006`), nunca preenchido em silêncio.
- **Texto colado muito grande.** Colar um documento inteiro dentro de um rótulo não é recusado nem
  cortado: não há teto de tamanho de produto, e o texto entra inteiro (`FR-005`). O envelope do
  `NFR-03` conta elementos, não caracteres — a barra de fluidez é medida com textos de tamanho
  realista, e o custo do texto gigante é **medido**, virando insumo de `/zion-prd-evolve` se doer.
  Truncar para caber na barra seria a alteração em silêncio que `RN-02` proíbe.
- **Texto colado com quebras de linha.** Colar um parágrafo de várias linhas dentro de um rótulo não
  colapsa as quebras em espaço nem trunca na primeira linha, e não encerra a edição: a quebra é
  conteúdo da pessoa e cai na mesma regra dos demais caracteres — volta byte a byte se o tipo
  corrente a expressa em código, volta **marcada** se não. É por isso que o corpus hostil do
  `SC-002` inclui texto multi-linha.
- **Elemento em edição removido pela outra vista.** Rotular por gesto não cria estado pendente: o
  texto já propagou conforme foi digitado. Se, com o editor aberto, a pessoa apaga aquele nó (ou o
  bloco que o contém) **no código**, o elemento sai do modelo e a edição vai junto — o editor fecha,
  nada é ressuscitado e nada fica pela metade. Adiar a exclusão ou ressuscitar o elemento criaria
  justamente o estado em que as duas vistas discordam, que o `FR-013` proíbe.
- **Rajada de digitação e colagem no rótulo.** Digitar rápido e colar dentro do mesmo rótulo é um ato
  só do modelo, não um ato por tecla (`R-09`).
- **Mover não é reconectar.** Arrastar uma conexão inteira é reposicionar (arranjo de sessão, não vai
  ao código). Levar a **ponta** de uma conexão para outro nó — reconectar — é `RF-07`, de
  `reconectar-conexao`; nesta spec, mudar as pontas de uma conexão é excluí-la e criar outra, ou
  editar o código.
- **Ato em bloco no envelope.** Excluir, duplicar ou mover uma seleção do tamanho do envelope (até
  400 elementos-nó, agrupamentos inclusos, e as conexões que o ato arrastar) é um ato só e não pode
  nascer estourando as barras de fluidez das specs seguintes (`R-04`, `NFR-03`/`NFR-04`). Um
  agrupamento ocupa uma vaga de nó no envelope: encher o diagrama de molduras não amplia o orçamento.
- **Duplicar preservando estilo.** Duplicar copia o rótulo/texto (que é da pessoa), mas estilo e
  shape são de `estilo-de-elementos`/`trocar-em-bloco` (R4) — não há estilo a preservar nesta spec, e
  o elemento duplicado nasce tão neutro quanto o original.
- **Colar via área de transferência entre elementos.** Copiar um trecho do diagrama e colá-lo como
  elementos (preservando estilos) é `RF-08`, de `copiar-e-colar` (R4). O que esta spec entrega é
  **duplicar no lugar** (`RF-06`), não copiar-colar por área de transferência.
- **Agrupar sem nada para agrupar.** Acionar o gesto com a seleção vazia — ou com uma seleção que só
  tem conexões, que não são membros — não faz nada: nenhuma moldura, nenhuma escrita no código,
  nenhuma entrada de histórico. Nascer uma moldura vazia contradiria o `FR-011`, e agrupar o diagrama
  inteiro seria inventar uma intenção que a pessoa não expressou. Já **um** elemento basta: agrupar um
  nó só é escolha legítima — ela acrescenta os demais depois, pelo gesto de `FR-016`.
- **Agrupar sobre grupos existentes é aninhar.** Se a seleção que a pessoa agrupa já inclui nós
  agrupados ou um agrupamento inteiro, o novo agrupamento **envolve** os existentes: agrupamentos
  podem conter outros agrupamentos (bloco dentro de bloco). O gesto nunca desfaz um agrupamento
  anterior para montar o novo.
- **Agrupar sem reescrever o que já estava escrito.** Reunir nós que a pessoa já declarou não move
  as declarações dela para dentro do bloco: o gesto **insere** o bloco, que menciona os
  identificadores dos membros, e cada declaração fica onde e como estava — com o rótulo e o
  espaçamento originais. Assim agrupar continua sendo escrita cirúrgica (`FR-014`) mesmo mexendo na
  estrutura de vários elementos de uma vez.
- **Agrupar cortando um grupo pela metade.** Se a seleção pega só **parte** dos membros de um
  agrupamento existente, esses membros **mudam de dono** — entram no agrupamento novo e saem do
  antigo, que segue vivo com os que sobraram (ou some, se não sobrou nenhum). O gesto nunca leva
  junto um nó que a pessoa não selecionou, e um nó nunca fica em dois agrupamentos ao mesmo tempo:
  molduras aninham-se inteiras ou não se tocam, nunca se sobrepõem pela metade.
- **Agrupamento esvaziado deixa de existir.** Um agrupamento vive dos seus membros; quando o último
  sai — excluído, ou retirado pelo gesto explícito de `FR-016` — a moldura **some** do modelo e do
  código, no mesmo ato que a esvaziou. Nenhum gesto deixa para trás bloco de agrupamento vazio.
- **Esvaziamento em cascata pelos níveis aninhados.** "Vive dos seus membros" é regra do modelo, não
  de um nível: excluir o último nó de dentro de um agrupamento interno faz o interno sumir e, se ele
  era o único membro do de cima, o de cima some junto — subindo até o primeiro nível que ainda tenha
  membro. Parar no primeiro nível deixaria para trás exatamente a moldura órfã que nenhum gesto pode
  deixar. Um agrupamento com título editado pela pessoa não é exceção: o título é texto, não membro.
  A cascata inteira é **um** ato e **uma** entrada de histórico (`FR-012`), qualquer que seja a
  profundidade.
- **Bloco de agrupamento vazio escrito à mão.** O que vale para o gesto não vale para a escrita da
  pessoa: um `subgraph … end` sem membros que ela digitou **existe e aparece** como moldura vazia,
  porque é isso que o mermaid de fora desenha (`SC-001`) e porque a análise não apaga o que ela
  escreveu (`FR-019`). O produto não o dissolve nem remove o bloco do texto; a moldura passa a receber
  membros como qualquer outra.
- **Clique sobre elementos sobrepostos.** Dentro de um agrupamento, o clique pega o membro; a área da
  moldura que não é de nenhum membro — borda, título e o vazio interno — é do agrupamento. Só o vazio
  **fora** de qualquer moldura é espaço vazio do plano, e clicar nele limpa a seleção. Assim, corrigir
  um nó agrupado não exige nenhum gesto para "entrar" no grupo.
- **Arrastar para fora da moldura não desagrupa.** O pertencimento é explícito, não geométrico: um nó
  arrastado para fora (ou para dentro) da moldura de um agrupamento continua exatamente com o
  pertencimento que tinha, e o código fica byte-idêntico. Entrar e sair de um grupo são gestos
  próprios (`FR-016`) — assim um arranjo desajeitado nunca reescreve a estrutura em silêncio, e mover
  continua sendo só mover (`RN-01`). Pela mesma razão, um nó **criado** dentro da moldura nasce
  solto: nem o arrasto nem a criação derivam pertencimento da geometria.
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
  existente em cada ponta. Um **agrupamento não é ponta** de conexão — soltar o gesto sobre a
  moldura ou o título de um agrupamento tem o mesmo desfecho de soltar no vazio (nada nasce), e
  ligar dois grupos é ligar os seus nós. Origem e destino PODEM ser o **mesmo nó** (laço), e PODE haver **mais de
  uma conexão** entre o mesmo par (arestas paralelas): a identidade da conexão é independente das
  pontas, então cada gesto cria uma conexão nova — o produto não funde nem recusa a repetida.
- **FR-002**: A pessoa DEVE conseguir reunir uma **seleção de nós num agrupamento**, por um gesto de
  agrupar direto na área do diagrama. Só **nó e agrupamento** são membros: as conexões que estiverem na
  seleção são **ignoradas** pelo gesto (permanecem como estão, ligando as suas pontas). **1** membro
  basta para o agrupamento nascer; com a seleção **vazia** — ou com uma seleção que só tem conexões —
  o gesto **não faz nada**: nenhuma moldura nasce, nenhuma linha é escrita no código e **nenhuma**
  entrada de histórico é registrada (`FR-011`, `FR-012`). O agrupamento reflete-se no código como um bloco que o nomeia e
  lista os nós membros. Agrupar é **inserção pura** no código: nasce o bloco, que **menciona os
  identificadores** dos membros, e nenhuma linha preexistente — inclusive a declaração de cada
  membro, com o rótulo e o espaçamento que a pessoa escreveu — muda de conteúdo ou de lugar
  (`FR-014`, `SC-009`). Se a seleção já inclui nós agrupados ou um agrupamento inteiro, o novo
  agrupamento **aninha** os existentes — agrupamentos podem conter outros agrupamentos (bloco dentro
  de bloco), e essa composição aninhada é estrutura projetada no código; o gesto nunca desfaz um
  agrupamento anterior para montar o novo. Um nó pertence a **no máximo um** agrupamento: não há
  sobreposição parcial de molduras. Quando a seleção contém **parte** dos membros de um agrupamento
  existente, o gesto honra a seleção literal — os membros selecionados **mudam de dono** (saem do
  agrupamento antigo e entram no novo), o antigo mantém os demais e deixa de existir se ficar sem
  nenhum (`FR-011`); nenhum nó não-selecionado é arrastado junto.
  O agrupamento nasce **neutro** (`RN-06`), com um título padrão neutro;
  editar o título do agrupamento por gesto NÃO é escopo desta spec (`RF-02` cobre rótulo de nó e
  texto de conexão) — o título edita-se pelo código, como no R0.
- **FR-003**: A criação de nó por gesto do R0 (duplo-clique no espaço vazio) CONTINUA valendo e
  satisfaz a parte "criar nós" do `RF-01`. Todo nó, conexão e agrupamento criado nesta spec nasce
  **neutro**, sem herdar tipo ou estilo de um elemento anterior (`RN-06`) — e um nó criado **dentro
  da moldura** de um agrupamento nasce **solto**, sem pertencimento: a criação não deriva
  pertencimento da geometria; entrar num agrupamento é gesto explícito (`FR-016`).

**Rotular e trazer texto de fora (RF-02)**

- **FR-004**: A pessoa DEVE conseguir editar o **rótulo de um nó** e o **texto de uma conexão** por
  gesto direto na área do diagrama, e a outra vista DEVE acompanhar conforme ela digita, sem gesto de
  confirmação. Como não há estado pendente, a edição em curso NÃO PODE bloquear nem adiar o que vem da
  outra vista: se o elemento que está sendo editado **deixa de existir** porque a pessoa o removeu
  **pelo código**, a edição é **encerrada e descartada com ele** — o editor fecha, o que já foi
  digitado (já propagado) some junto com o elemento, e nenhum elemento fantasma é ressuscitado pela
  edição aberta. É **um** ato: o da exclusão pelo código (`FR-012`, `FR-013`).
- **FR-018**: O rótulo **vazio** é uma escrita legítima da pessoa: apagar todo o rótulo de um nó por
  gesto DEIXA o nó **sem rótulo** no diagrama, e o código leva a forma com que o tipo corrente
  expressa rótulo vazio (ou o elemento volta **marcado**, `FR-006`, se o tipo não a expressa). O
  produto NÃO PODE restaurar o rótulo neutro do R0 nem exibir o **identificador** no lugar do rótulo
  — o identificador é chave interna e nunca vaza para o desenho por o rótulo ter ficado vazio.
- **FR-005**: Ao colar dentro de um rótulo ou de um texto de conexão, o conteúdo DEVE entrar como
  **texto puro**, sem a formatação da origem (negrito, cor, fonte, links, estrutura): nenhuma
  formatação de origem sobrevive à colagem. As **quebras de linha** do texto colado são conteúdo,
  não formatação: entram como qualquer outro caractere e seguem o `FR-006` (byte a byte, ou
  marcado). Colar um texto multi-linha NÃO encerra a edição, NÃO colapsa as quebras em espaço e NÃO
  trunca o texto na primeira linha. Não há **teto de tamanho** de produto para o texto de um rótulo ou
  de uma conexão: o conteúdo entra **inteiro**, qualquer que seja o volume, porque recusar ou cortar
  seria alterar o texto dela (`RN-02`). O custo do texto muito grande é **medido, não limitado** — na
  mesma linhagem da profundidade de aninhamento; se a medição mostrar que ele precisa de teto próprio,
  isso é mudança de produto (`/zion-prd-evolve`), não desta spec.
- **FR-006**: O texto de um rótulo ou de uma conexão — digitado ou colado — DEVE reaparecer **byte a
  byte** no diagrama e no código, **ou** reaparecer **marcado** quando o tipo de diagrama corrente
  não o expressa fielmente em código. O texto NUNCA PODE ser alterado, truncado ou reescrito em
  silêncio para caber (`RN-02`, `ADR-006`). A **marca** vive no **modelo** e é observável no
  **diagrama**: o elemento fica sinalizado como portador de texto que o tipo corrente não expressa
  fielmente, e o texto integral da pessoa continua no modelo. O **código** recebe a forma mais fiel
  que o tipo expressa e **nenhum artefato extra** — nada de comentário, escape improvisado ou aviso
  embutido —, permanecendo válido para um mermaid de fora (`SC-001`) e cirúrgico (`FR-014`). O texto
  integral e a marca **sobrevivem à releitura do código**: enquanto o elemento existe na sessão e a
  sua forma degradada no texto continua byte-idêntica, a análise casa a linha com o elemento já vivo
  (pelo identificador) e o modelo **preserva** o texto integral — editar outra linha do documento
  NUNCA PODE apagar o texto que a pessoa colou. O modelo cede apenas quando a pessoa **edita aquele
  texto** no código: aí o que ela escreveu passa a ser o texto do elemento, e a marca cai ou se
  recalcula. *(A aparência definitiva dessa sinalização e o aviso de erro de sintaxe são de
  `codigo-de-entrada`, `RF-22`; esta spec responde pela invariante "byte a byte ou marcado, nunca em
  silêncio" e por a marca existir, ser observável e ser durável.)*
- **FR-007**: Uma rajada de digitação e colagem num mesmo rótulo ou texto DEVE contar como **um** ato
  do modelo, não como um ato por tecla (`R-09`). A identidade do nó ou da conexão é **independente**
  do texto: reescrever o rótulo não transforma o elemento em outro.

**Selecionar, mover, duplicar, excluir (RF-06)**

- **FR-008**: A pessoa DEVE conseguir **selecionar** um elemento (nó, conexão ou agrupamento) por um
  gesto de ponteiro, e **selecionar vários de uma vez** por uma seleção retangular traçada sobre o
  espaço vazio; DEVE conseguir acrescentar ou remover um elemento da seleção corrente. A seleção
  retangular pega por **contenção**: um nó ou agrupamento entra quando está **inteiro** dentro do
  retângulo — encostar não basta. A conexão não é abrangida diretamente (não tem posição própria):
  ela entra **derivada**, quando as **duas pontas** entram, na mesma regra que já governa duplicar
  (`FR-010`) e excluir (`FR-011`). Quando
  elementos se sobrepõem — um nó dentro da moldura de um agrupamento, um agrupamento dentro de outro
  —, o gesto seleciona o elemento **mais específico** sob o ponteiro: clicar num membro seleciona o
  **membro**, nunca o agrupamento. O agrupamento seleciona-se clicando na sua **moldura ou título**,
  área que não pertence a nenhum membro. Uma seleção PODE conter, ao mesmo tempo, um agrupamento e
  membros dele — abranger a moldura inteira por contenção costuma abranger os membros também. Nesse
  caso, o ato em bloco (mover, duplicar, excluir) opera sobre a **seleção normalizada**: cada
  elemento é afetado **exatamente uma vez**, e o membro já carregado pelo seu agrupamento NÃO é
  processado de novo — **0** deslocamentos em dobro e **0** cópias em dobro. A seleção é
  **estado de sessão** e NUNCA aparece no código (`RN-01`).
- **FR-009**: A pessoa DEVE conseguir **mover** um elemento e mover **uma seleção inteira** de uma
  vez; os elementos da seleção movem-se juntos, mantendo as posições relativas. Mover um agrupamento
  move os nós membros junto. Uma conexão não tem posição própria: ela acompanha as pontas. A posição
  é conforto de sessão: mover DEVE deixar o código **byte-idêntico** (`RN-01`, `R-03`) — inclusive
  quando um nó é arrastado para fora ou para dentro da moldura de um agrupamento, que é arranjo e
  NÃO muda pertencimento (mudar pertencimento é `FR-016`).
- **FR-010**: A pessoa DEVE conseguir **duplicar** um elemento ou uma seleção inteira **no lugar**. Os
  elementos duplicados nascem com **identificadores próprios** (opacos, estáveis, sequenciais da
  sessão, nunca reusados — como no R0), com os **rótulos/textos copiados** (que são dela) — inclusive
  o **título do agrupamento** copiado, porque o texto é dela mesmo quando só se edita pelo código; o
  título neutro do `FR-002` é do agrupamento que nasce do gesto de agrupar, não da cópia —, colocados
  por colocação local determinística perto dos originais **sem mover** nenhum elemento preexistente, e
  as linhas novas refletem-se no código. Um agrupamento na seleção é duplicado com **os seus
  membros**, estejam eles selecionados ou não, recursivamente para os agrupamentos aninhados: a
  seleção é expandida pelo seu **fecho transitivo** de pertencimento antes de duplicar (um
  agrupamento não pode nascer vazio, `FR-011`). Cada ponta da conexão duplicada aponta para a
  **cópia** daquela ponta quando a ponta foi duplicada no mesmo ato, e para a **própria ponta
  original** quando **nenhuma** das duas foi: duplicar uma conexão sozinha — ela na seleção, as pontas
  fora — faz nascer uma **conexão paralela** entre os mesmos dois nós, herança de pontas simétrica à
  herança de agrupamento descrita abaixo (arestas paralelas são válidas, `FR-001`). Quando
  **exatamente uma** das pontas foi duplicada, a conexão **não** renasce: ela teria de escolher entre
  a cópia e o original, e o produto nunca inventa uma ponta. No sentido inverso, a cópia de um elemento que **é membro**
  de um agrupamento **herda o pertencimento do original**: ela nasce membro do mesmo agrupamento —
  mesmo que o agrupamento não esteja na seleção — com a **declaração no fim do documento** e o seu
  identificador **mencionado** dentro do bloco existente, por inserção cirúrgica (`FR-014`,
  `FR-017`). Duplicar NÃO é copiar-colar por
  área de transferência (`RF-08`, de `copiar-e-colar`).
- **FR-011**: A pessoa DEVE conseguir **excluir** um elemento ou uma seleção inteira. Excluir um nó
  remove **também as conexões presas a ele** — uma conexão sem uma das pontas não é expressável no
  código; excluir uma conexão remove só a conexão; excluir um agrupamento remove **a moldura** e
  **mantém os nós que estavam dentro** (excluir o agrupamento não apaga o
  trabalho contido nele), que passam a ser membros do agrupamento de cima quando havia um, ou ficam
  soltos quando não havia — o mesmo efeito de desagrupar, um nível por ato (`FR-016`). Um agrupamento que fica **sem nenhum membro** — porque seus nós foram
  excluídos ou retirados dele **por gesto** — **deixa de existir** no modelo e no código, no mesmo ato
  que o esvaziou: nenhum gesto deixa para trás bloco de agrupamento vazio. O esvaziamento **sobe em
  cascata**: se o agrupamento que sumiu era o único membro do agrupamento de cima, esse também deixa
  de existir, e assim por diante **até o primeiro nível que ainda tenha membro** — tudo no **mesmo
  ato** e numa **única** entrada de histórico (`FR-012`), qualquer que seja a profundidade. Essa proibição governa os
  **gestos**, não a escrita da pessoa: um bloco vazio que ela digitou no código **existe e é exibido**
  enquanto o código o declara (`FR-019`). A exclusão é cirúrgica no código: remove exatamente as linhas dos elementos
  removidos e deixa o resto byte-idêntico.
- **FR-016** (mudar pertencimento): A pessoa DEVE conseguir **adicionar** um nó (ou uma seleção) a um
  agrupamento **já existente**, **retirar** um nó (ou uma seleção de membros) de um agrupamento
  e **desagrupar** um agrupamento inteiro, por gestos explícitos na área do diagrama. Adicionar é o
  simétrico de retirar: o elemento passa a ser membro do agrupamento indicado, sem que o agrupamento
  perca a identidade nem o título, e sem que agrupar (`FR-002`, que sempre cria um agrupamento novo e
  aninha) seja necessário. Um elemento adicionado sai do agrupamento em que estava, se estava em
  algum — o vínculo continua **exclusivo** (no máximo um agrupamento por elemento). O
  pertencimento a um agrupamento é **explícito no modelo**, nunca derivado da geometria: arrastar um
  nó para fora ou para dentro da moldura NÃO muda pertencimento (é arranjo, `FR-009`). Retirar o
  **último** membro faz o agrupamento deixar de existir (`FR-011`), no mesmo ato — **em cascata** pelos
  níveis aninhados que ficarem sem nenhum membro. No código, adicionar
  e retirar inserem ou removem apenas a **menção do identificador** dentro do bloco: a declaração do
  elemento nunca sai do lugar em que está (`FR-017`). Desagrupar remove a
  moldura e mantém os membros soltos — é o mesmo efeito de excluir o agrupamento; num agrupamento
  aninhado, retirar/desagrupar afeta **um** nível, e os agrupamentos internos que sobram passam a ser
  membros do nível de cima (ou ficam soltos, se não havia nível de cima). A mudança reflete-se no
  código imediatamente e de forma cirúrgica.

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
- **FR-019** (leitura do bloco de agrupamento): Ao ler o código, **qualquer menção** do identificador
  de um elemento **dentro** do bloco de agrupamento DEVE criar pertencimento — inclusive quando a
  menção é a **ponta de uma conexão escrita dentro do bloco**, forma que o mermaid de fora entende
  como declaração de membro. O produto **escreve** sempre a forma isolada (`FR-017`), mas **lê** as
  duas: uma aresta que a pessoa digitou dentro do bloco cria a conexão **e** agrupa as suas pontas, e
  o diagrama exibido continua sendo o mesmo que o mermaid de fora desenha (`SC-001`). Reler o
  documento que a pessoa escreveu NÃO PODE reescrevê-lo na forma que o produto escreveria: a menção
  fica onde ela a escreveu (`FR-014`, `SC-009`).
  Quando o código menciona o **mesmo elemento em dois blocos** — o que o modelo não comporta, porque o
  vínculo é exclusivo —, a regra é **concordar com o mermaid de fora**: o produto adota o
  pertencimento que o mermaid desenha, e o desempate concreto é **medido**, não inventado (caso do
  corpus do `SC-001`). O produto NÃO reescreve nem "conserta" o código da pessoa para tirar a menção
  perdedora, e a análise nunca devolve vazio por causa dela.
  Pela mesma razão, um bloco de agrupamento **vazio escrito no código** DEVE existir no modelo e ser
  exibido enquanto o código o declarar: a regra "agrupamento esvaziado deixa de existir" (`FR-011`) é
  sobre o **ato que o esvaziou** — nenhum gesto cria nem deixa moldura órfã —, e não autoriza o
  produto a apagar do desenho, ou do texto, um bloco que a pessoa escreveu.
- **FR-014**: A escrita no código feita por qualquer gesto desta spec DEVE ser **cirúrgica**: só as
  linhas do elemento afetado mudam, e todo o resto do texto — ordem, espaçamento, trechos que o
  produto não lê — permanece byte-idêntico ao que a pessoa escreveu. Nenhum gesto reescreve o
  documento inteiro numa forma canônica, e nenhum gesto **realoca** uma linha preexistente: agrupar
  insere o bloco que menciona os membros em vez de mudar as declarações deles de lugar (`FR-002`).
- **FR-017**: A **declaração** de qualquer elemento nascido por gesto — nó, conexão, agrupamento,
  cópia — DEVE ser acrescentada ao **fim do documento**, seja lá o que houver lá (regra herdada do
  R0), **sem exceção para membros de agrupamento**. O pertencimento a um agrupamento é expresso pela
  **menção do identificador** dentro do bloco, nunca por mover a declaração para dentro dele: agrupar
  (`FR-002`), adicionar (`FR-016`) e duplicar um membro (`FR-010`) inserem a menção e deixam toda
  linha preexistente byte-idêntica, no lugar em que estava (`FR-014`, `SC-009`).
- **FR-015**: A posição de qualquer elemento e todo estado de sessão (seleção, foco, zoom, rolagem)
  NUNCA PODEM aparecer no código (`RN-01`, `R-03`). O código carrega a **estrutura** montada — nós,
  rótulos, conexões, textos de conexão, agrupamentos e sua composição —, nunca o **arranjo**.

### Key Entities

- **Modelo** — a única verdade do diagrama: quais nós, conexões e agrupamentos existem e como se
  relacionam. O diagrama visível e o código são vistas dele, nunca duas verdades a reconciliar.
- **Nó** — o elemento do R0, agora rotulável por gesto. Tem identidade estável e independente do
  rótulo; o rótulo é texto dela.
- **Conexão** — a aresta **dirigida** entre dois **nós** (origem→destino), que podem ser o **mesmo
  nó** (laço); só nó é ponta — agrupamento, não. Tem identidade estável na
  sessão, independente das pontas e do próprio texto; carrega um texto opcional (rótulo da conexão),
  que nasce vazio (neutro). Como a identidade independe das pontas, podem coexistir **várias
  conexões** entre o mesmo par (arestas paralelas). No código é a linha de aresta entre os identificadores das pontas. Não
  tem posição própria: acompanha as pontas.
- **Agrupamento** — o elemento que **reúne nós e outros agrupamentos** (aninhamento). Tem identidade estável e um título neutro; no código
  é o bloco que o nomeia e lista os membros. Sua moldura na área do diagrama é arranjo de sessão (não
  projetado); sua **composição de membros** é estrutura (projetada) e **explícita**: pertencer ao
  agrupamento é um vínculo do modelo, nunca uma consequência de o nó estar por dentro da moldura.
  Entra-se por gesto de agrupar (`FR-002`), por **adicionar a um agrupamento existente** (`FR-016`)
  ou por **menção do identificador dentro do bloco** no código — inclusive como ponta de uma conexão
  escrita ali (`FR-019`) —, sai-se por gesto de retirar/desagrupar (`FR-016`), e o
  vínculo é **exclusivo**: um nó (ou agrupamento) pertence a no máximo um agrupamento por vez, de
  modo que as molduras aninham-se inteiras ou são disjuntas, nunca parcialmente sobrepostas.
  Excluí-lo devolve os membros soltos. Não sobrevive sem membros quando é um **gesto** que o esvazia:
  esvaziado assim, deixa de existir — e o esvaziamento **sobe em cascata** pelos níveis aninhados que
  ficarem sem nenhum membro, no mesmo ato; já o bloco vazio que a pessoa **escreveu no código** existe
  e é exibido enquanto o texto o declarar (`FR-019`).
- **Seleção** — o conjunto de elementos que a pessoa está manipulando agora. É estado de sessão puro:
  nunca projetado no código.
- **Arranjo (posição)** — onde cada elemento está na área do diagrama. Conforto de sessão: vive na
  sessão e nunca viaja no código entregue (`RN-01`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: **100%** dos códigos copiados são aceitos por um mermaid de fora do produto e desenham o
  mesmo diagrama que estava visível — sobre um corpus de referência do grafo dirigido que inclui
  **conexões** e **agrupamentos**, além de nós. O corpus inclui os documentos **escritos à mão** que o
  produto não escreveria: conexão declarada **dentro** do bloco e o mesmo nó mencionado em **dois**
  blocos; nesses, **0 divergências** de pertencimento entre o diagrama exibido e o que o mermaid de
  fora desenha. *(NFR-05, `FR-019`)*
- **SC-002**: **100%** dos textos de rótulo e de conexão — digitados ou colados — voltam **byte a
  byte** ou voltam **marcados**; **0** alterações em silêncio, sobre o corpus de textos hostis por
  família, que inclui texto **multi-linha** e o **rótulo vazio** (**0** rótulos repovoados com o
  neutro e **0** identificadores exibidos como rótulo, `FR-018`) (**0** quebras colapsadas em espaço e **0** truncamentos
  na primeira linha). Em **100%** dos casos marcados, o elemento correspondente está sinalizado no diagrama e o
  texto integral segue no modelo — **0** casos de perda sem marca. Editar **outra** linha do código e
  reler o documento preserva o texto integral e a marca em **100%** dos elementos marcados cuja forma
  degradada não foi tocada — **0 perdas** por releitura. *(NFR-07, `ADR-006`, `FR-006`)*
- **SC-003**: Colar texto de fora dentro de um rótulo ou texto de conexão traz **0 vestígios** de
  formatação da origem — só texto puro. *(RF-02)*
- **SC-004**: Mover **qualquer** elemento ou seleção deixa o código **byte-idêntico** ao de antes do
  movimento — **0 diferenças** —, inclusive ao arrastar um nó para fora ou para dentro da moldura de
  um agrupamento (**0 mudanças de pertencimento** por arrasto), e **0 ocorrências** de posição,
  seleção, foco ou zoom aparecem em qualquer código gerado. *(RN-01, R-03, FR-016)*
- **SC-005**: Em **100%** das criações, edições, duplicações e exclusões por gesto, a mudança
  correspondente aparece na outra vista sem gesto adicional, em **≤100ms na mediana** dentro do
  envelope (**400 elementos-nó — nós e agrupamentos somados — e 500 conexões**), com textos de
  **tamanho realista** de rótulo. O envelope conta **elementos**, não caracteres: um texto colado
  muito grande entra **inteiro** (**0 recusas** e **0 truncamentos**, `FR-005`) e o seu custo é
  **medido e relatado**, não usado para cortar o texto. *(NFR-03, `RN-02`)*
- **SC-006**: Um ato em bloco (mover, duplicar ou excluir) aplicado a uma seleção de **até 400
  elementos** — nós e agrupamentos somados, mais as conexões que o ato arrastar consigo — é **1**
  entrada de histórico, não N, e reverteria com **1** só desfazer. Cada elemento abrangido é afetado
  **exatamente 1 vez**, mesmo quando a seleção contém um agrupamento **e** membros dele: **0**
  elementos processados duas vezes. *(RN-04, `R-09`, `FR-008`)*
- **SC-007**: Excluir um nó com conexões presas deixa **0 conexões pendentes** no código e no diagrama
  — nenhuma aresta sobra apontando para uma ponta que sumiu. *(FR-011)*
- **SC-008**: Excluir um agrupamento preserva **100%** dos nós que estavam dentro — **0 membros
  perdidos** por tirar a moldura. Depois de qualquer gesto, sobram **0 agrupamentos vazios** no modelo
  e no código em **qualquer** profundidade de aninhamento — o esvaziamento em cascata é **1** ato e
  **1** entrada de histórico, não um por nível. *(FR-011, FR-012, FR-016)*
- **SC-009**: **0 caracteres** do texto fora das linhas do elemento afetado mudam quando um gesto
  escreve no código — inclusive espaçamento, ordem das linhas e trechos que o produto não lê. Ao
  agrupar nós já declarados, adicionar um membro ou duplicar um membro, **0 linhas preexistentes são
  realocadas** e **0 declarações** mudam de lugar: o gesto só insere o bloco, a declaração nova (no
  fim do documento) e a menção do identificador dentro do bloco. *(FR-014, FR-002, FR-017)*
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
- **Sinalização visível de erro de sintaxe e a aparência completa da marca de expressividade**
  (`RF-21`, `RF-22`, `codigo-de-entrada`) — esta spec honra a invariante `RN-02` (byte a byte ou
  marcado) e exige que a marca **exista e seja observável** no diagrama (`FR-006`); como ela se
  apresenta em definitivo é de lá.
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
  modificador) é do `plan`. Soltar no vazio não cria nó conectado — criar nó é o duplo-clique do R0
  — e soltar sobre a moldura de um agrupamento também não cria nada: a ponta é sempre um nó.
  *(Confirmado em `/speckit-clarify`, Session 2026-07-22.)*
- **Gesto de seleção múltipla**: uma seleção retangular traçada sobre o espaço vazio, que pega por
  **contenção** (elemento inteiro dentro) e traz a conexão só quando traz as duas pontas;
  acrescentar ou remover um elemento da seleção é um gesto de ponteiro com modificador, cuja tecla
  exata é do `plan`. Um clique no espaço vazio limpa a seleção. *(Confirmado em `/speckit-clarify`,
  Session 2026-07-22.)*
- **Alvo do clique é o mais específico**: com agrupamentos aninhados, o clique pega o elemento mais
  interno sob o ponteiro e o agrupamento pega-se pela moldura/título; qual é exatamente a área
  sensível da moldura (borda, faixa do título, folga) é do `plan`. *(Confirmado em
  `/speckit-clarify`, Session 2026-07-22.)*
- **Excluir nó leva as conexões presas**: uma aresta sem uma das pontas ressuscitaria a ponta no
  mermaid de fora — divergência proibida (`FR-013`/R0 `FR-011`); por isso as conexões presas saem com
  o nó, num ato só.
- **Excluir agrupamento é desagrupar**: tirar a moldura devolve os nós soltos e não destrói o que a
  pessoa montou dentro — coerente com o ethos "um gesto nunca apaga em silêncio o trabalho da pessoa"
  (R0 `FR-017`). Apagar os membros é outro ato, consciente. *(Confirmado em `/speckit-clarify`,
  Session 2026-07-22.)*
- **Pertencimento explícito, não geométrico**: entra-se num agrupamento agrupando (`FR-002`) ou
  adicionando a um agrupamento existente (`FR-016`), e sai-se retirando/desagrupando (`FR-016`); a
  moldura é desenho do arranjo, não a fonte da verdade — inclusive na criação, em que um nó nascido
  dentro da moldura nasce solto (`FR-003`). A afordância exata dos gestos de adicionar, retirar e
  desagrupar é do `plan`. *(Confirmado em `/speckit-clarify`, Session 2026-07-22.)*
- **Duplicar é no lugar**: cópia com identificadores próprios, rótulos/textos copiados — inclusive o
  título do agrupamento — e colocação local determinística deslocada dos originais; a conexão liga as
  **cópias** quando as duas pontas foram duplicadas, liga as **pontas originais** (aresta paralela)
  quando nenhuma foi, e não renasce quando só uma foi (`FR-010`). Não
  usa área de transferência (isso é `RF-08`) e não preserva estilo (não há estilo nesta spec).
  *(Confirmado em `/speckit-clarify`, Session 2026-07-22.)*
- **Identificadores de conexão e agrupamento**: opacos, estáveis e sequenciais na sessão, nunca
  reusados, na mesma linhagem do contador monotônico do R0 (`FR-016` do R0). Se são um contador só ou
  um por espécie é detalhe do `plan`.
- **Conexão nasce sem texto**: o texto (rótulo) da conexão é opcional e nasce vazio — neutro
  (`RN-06`); rotular é `RF-02`.
- **Marca de expressividade mínima**: quando o tipo corrente não expressa um texto fielmente, o
  produto marca o elemento no modelo e no diagrama em vez de alterar o texto, e mantém o código livre
  de artefatos; a aparência e o tratamento completos da marca (e do erro de sintaxe) são de
  `codigo-de-entrada` (`RF-22`). A marca é **durável**: a releitura do código casa a linha com o
  elemento vivo pelo identificador e preserva o texto integral enquanto a forma degradada não for
  tocada — o modelo só cede o texto quando a pessoa edita aquele texto no código (`FR-006`). Como a
  correspondência linha↔elemento é mantida na análise é do `plan`. *(Confirmado em
  `/speckit-clarify`, Session 2026-07-22.)*
- **Envelope compartilhado, agrupamento conta como nó**: o peso por elemento que conexões e
  agrupamentos introduzem consome do envelope de densidade do produto (`R-04`), **sem número novo**:
  o `NFR-03` continua sendo 400 nós e 500 conexões, e cada agrupamento ocupa uma das 400 vagas de nó.
  A profundidade de aninhamento é **medida, não limitada** — se a medição mostrar que ela precisa de
  teto próprio, isso é mudança de produto (`/zion-prd-evolve`), não desta spec. O **tamanho do texto**
  de um rótulo segue a mesma linhagem: sem teto de produto, entra inteiro, e o seu custo é medido, não
  usado para cortar (`FR-005`). Esta spec mede o
  próprio consumo e não pode nascer estourando as barras do `NFR-03`/`NFR-04`. *(Confirmado em
  `/speckit-clarify`, Session 2026-07-22.)*
- **Leitura do bloco de agrupamento segue o mermaid**: qualquer menção do identificador dentro do
  bloco agrupa — inclusive a aresta escrita ali —, o bloco vazio que a pessoa digitou existe e é
  exibido, e o desempate de uma menção dupla é **o que o mermaid de fora desenha**, medido no corpus
  do `SC-001` e não inventado pelo produto (`FR-019`). O produto continua escrevendo só a forma
  isolada e nunca reescreve o texto dela. *(Confirmado em `/speckit-clarify`, Session 2026-07-22.)*
- **Sessão volátil**: fechar a aba perde o trabalho; persistir o rascunho é `RF-27`/`RF-28`.
- **Área de transferência para colar texto**: quando o navegador negar ou não oferecer o recurso, a
  pessoa é avisada de que o texto não foi colado, em vez de a colagem falhar em silêncio.
