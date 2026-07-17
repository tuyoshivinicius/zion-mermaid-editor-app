# Feature Specification: Fatia S2 — Rótulo de Conexão e Formato de Nó no Flowchart

**Feature Branch**: `003-flowchart-edge-label-node-shape`
**Created**: 2026-07-15
**Status**: Draft
**Input**: User description: "Fatia S2 — edição de rótulo de conexão e de formato de nó no Flowchart. Hoje o canvas é cego a duas coisas que o código já carrega: o rótulo de uma conexão e o formato de um nó existem no texto Mermaid e sobrevivem ao ciclo, mas o usuário não consegue criá-los nem alterá-los pelo canvas — todo nó é desenhado como retângulo e toda conexão nasce sem texto, de modo que quem quer um losango de decisão ou um 'Sim'/'Não' numa aresta precisa descer ao painel de código e escrever Mermaid à mão. Esta fatia fecha essa lacuna para o Flowchart."

## Clarifications

### Session 2026-07-15

- Q: Quais formatos de nó o seletor do canvas oferece — todos os 14 da tabela entregue, um subconjunto curado, ou ambos limitados a ~6? → A: **Todos os 14** — seletor = código = canvas, uma regra só e sem cauda. A verificação contra o código mostrou que os 14 formatos de `SHAPE_DELIMITERS` (`src/core/model/shapes.ts`) sobrevivem ao ciclo sem perda (probe executado sobre `generate` + `importFlowchart`: 14/14 OK), de modo que nenhum deles é risco de fidelidade. O argumento decisivo é que o canvas **precisa desenhar os 14 de qualquer modo**: código colado pelo usuário já pode conter qualquer um deles hoje (`normalizeImportedShape` os aceita), e deixar oito renderizando como retângulo manteria, na cauda, exatamente a divergência canvas ↔ código que esta fatia existe para fechar. Dado que os 14 precisam ser desenhados, restringir o **seletor** a seis não economiza a renderização — economiza apenas seis ícones num grid — e cria uma segunda regra a especificar e testar ("quais formatos o canvas mostra mas não deixa escolher"). Ver FR-005 e FR-006.

- Q: Onde vive a superfície de edição — painel de propriedades contextual, edição inline no canvas, ou controles na toolbar existente? → A: **Painel de propriedades contextual**: selecionar um nó ou uma conexão revela um painel que reflete a seleção — campo de texto para o rótulo da conexão, seletor de formato para o nó. A verificação contra o código pesou a favor: o rename inline de S0 **não** usa um `<input>` real, e sim um handler de teclado centralizado em `CanvasPanel`, porque "React Flow repeatedly re-asserts DOM focus on its own node wrapper, so a child input can never reliably win or keep focus after the initial keystroke" (comentário em `src/components/FlowNode.tsx`, Decisão E de S0). Editar rótulo de aresta inline replicaria essa mesma briga por foco — um mecanismo que S0 só adotou por não ter alternativa, e que custa reimplementar Backspace/Escape/Enter à mão. O painel é operável por teclado nativamente, mantém o controle perto do elemento sem disputar o foco do canvas, e é onde RF-06 (aparência da conexão) e RF-08 (estilo) aterrissam nas fatias seguintes. Ver FR-003.

### Session 2026-07-16

- Q: Como o usuário **desfaz** a seleção deliberadamente (devolvendo o painel de propriedades ao estado neutro)? → A: **Ambos** — `Escape` limpa a seleção **e** clicar no fundo vazio do canvas também. O caminho por teclado é exigido por SC-011 (os fluxos MUST ser completáveis inteiramente por teclado), e clicar no vazio é a convenção de mouse já esperada num canvas. `Escape` está livre quando não há rename em curso — o rename de S0 é estado local do `CanvasPanel` que captura o teclado só enquanto ativo (Edge Case "Trocar o formato de um nó em rename") —, de modo que não há conflito com o cancelamento de rename de S0. A spec já enumerava toda limpeza de seleção **dirigida pelo sistema** (rename, limpeza, alternância do modo conectar, destruição do elemento — FR-002a, FR-013), mas nenhuma **iniciada pelo usuário**; esta fecha a lacuna. Ver FR-002b.

- Q: Como o canvas indica **qual** elemento está selecionado, para o usuário saber o que o painel de propriedades reflete? → A: **Destaque visível no próprio elemento** — o nó ou a conexão selecionada recebe um estado visual distinto no canvas, **separado** do anel de foco de DOM que S0 já expõe. Reaproveitar apenas o anel de foco acoplaria seleção a foco e não daria pista nenhuma quando a seleção fosse feita por mouse sem foco; deixar só o conteúdo do painel falar seria ambíguo quando há várias arestas/nós semelhantes. O destaque próprio é a afordância mais clara, é testável, e dá o estado "selecionado" **programaticamente determinável** que FR-012 exige (par do formato atual). Ver FR-002c.

- Q: Por teclado, que ação **estabelece** a seleção (fazendo o painel refletir o elemento)? → A: **Focar o elemento seleciona-o** — mover o foco de DOM para um nó ou aresta (Tab/setas) já o seleciona e atualiza o painel ao vivo, espelhando o modelo de S0 em que o teclado do canvas é dirigido por foco (o `Delete` de S0 já age sobre o elemento focado). É o menor número de teclas e não introduz nem um segundo passo (Enter/Space) nem um atalho novo a documentar e a proteger de conflito com rename/conectar de S0. A seleção assim estabelecida MUST **persistir** quando o foco depois entra no painel para editar — é exatamente por isso que o destaque de FR-002c é distinto do anel de foco. Ver FR-002d.

## User Scenarios & Testing *(mandatory)*

Esta fatia fecha uma **cegueira do canvas**, não uma lacuna do modelo. O rótulo de conexão e o
formato de nó já existem no texto Mermaid, já entram no modelo e já sobrevivem ao ciclo de ida e
volta desde S0 — o que falta é o usuário poder **criá-los e alterá-los pelo canvas**, sem descer ao
painel de código para escrever Mermaid à mão. S1 registrou essa dívida explicitamente (FR-002a de
S1: "a renderização de formato no canvas pertence a uma fatia posterior"); esta é essa fatia.

O escopo é o **Flowchart**. A mesma edição nos outros quatro tipos é fatia posterior (RN-03: cada
recurso de edição vale apenas onde o tipo de diagrama o suporta).

### User Story 1 - Escrever o texto de uma conexão pelo canvas (Priority: P1)

O usuário seleciona uma conexão no canvas e escreve o texto dela — `Sim`, `Não`, `em caso de erro`.
O texto aparece sobre a conexão no canvas e a linha correspondente no código Mermaid é reescrita no
mesmo instante. Ele pode voltar depois, corrigir o texto, ou apagá-lo por completo e deixar a
conexão sem rótulo de novo.

**Why this priority**: É a metade da fatia que entrega valor sozinha e sem depender de nada novo
ser desenhado. Verificou-se contra o código que o canvas **já exibe** o rótulo de uma aresta
(`CanvasPanel` mapeia `label: edge.label ?? undefined` para a aresta do React Flow): o rótulo de uma
conexão vinda de código colado já aparece hoje. O que não existe é qualquer caminho para **criar ou
alterar** esse texto pelo canvas — `connect()` nasce com `label: null` e nenhuma mutação de S0
escreve `Edge.label`. Portanto US1 é puramente a abertura de um caminho de edição sobre uma
capacidade de exibição já entregue, e é a única das três histórias que não depende de renderização
nova.

**Independent Test**: Selecionar uma conexão sem rótulo do starter (`Início` → `Revisar`), escrever
um texto, e confirmar que o canvas passa a mostrá-lo sobre a conexão e que a linha da aresta no
código passa a trazer `-->|texto|`; em seguida apagar o texto e confirmar que o canvas e o código
voltam à conexão sem rótulo. Nada de formato de nó é exercitado.

**Acceptance Scenarios**:

1. **Given** uma conexão sem rótulo selecionada no canvas, **When** o usuário escreve um texto para
   ela, **Then** o canvas passa a exibir esse texto sobre a conexão e a linha correspondente do
   código é reescrita trazendo o texto entre `|`, dentro do teto de prévia ao vivo de S0 (NFR-01,
   ≤ 150 ms) — sem nenhum passo preparatório e sem que o usuário digite Mermaid.
2. **Given** uma conexão que **já tem** rótulo (`Aprovado?` → `Publicar`, rotulada `Sim` no
   starter), **When** o usuário a seleciona, **Then** a superfície de edição mostra o texto atual
   (`Sim`), e não um campo vazio: editar um rótulo existente parte do que existe.
3. **Given** uma conexão rotulada, **When** o usuário substitui o texto, **Then** canvas e código
   passam a mostrar o texto novo, e **nenhuma outra linha** do código é reescrita ou reordenada.
4. **Given** uma conexão rotulada, **When** o usuário apaga todo o texto do rótulo, **Then** a
   conexão volta a não ter rótulo: o canvas deixa de exibir texto sobre ela e a linha no código
   volta à forma sem `|...|` — apagar é uma operação de primeira classe, não um rótulo vazio.
5. **Given** o rótulo escrito pelo canvas, **When** o usuário aciona a cópia e cola o resultado num
   destino externo, **Then** o texto colado é um Flowchart válido que reproduz o rótulo.
6. **Given** um rótulo escrito pelo canvas, **When** o texto passa pelo ciclo código → canvas →
   código, **Then** o rótulo sobrevive sem perda (NFR-02).

---

### User Story 2 - Ver no canvas o formato que o código já carrega (Priority: P2)

O usuário cola (ou já tem no starter) um Flowchart em que um nó é um losango de decisão, outro é um
círculo, outro um cilindro. O canvas passa a desenhar cada um com o seu formato, em vez de desenhar
tudo como retângulo. O que o código diz e o que o canvas mostra deixam de divergir.

**Why this priority**: É a dívida que S1 registrou por escrito (FR-002a de S1) e o pré-requisito
de US3 — escolher um formato só é significativo se o usuário **vê** o que escolheu. Entregue
sozinha, já fecha a divergência para todo conteúdo colado e para o próprio starter, sem que
nenhuma superfície de escolha exista ainda: quem escreve `{Aprovado?}` no painel de código passa a
ver um losango no canvas. Verificou-se contra o código que a lacuna é exclusivamente de
renderização — `FlowNode` desenha todo nó com a mesma `<div>` arredondada e nunca recebe `shape`
de `CanvasPanel` —, enquanto o modelo (`Node.shape`) e o gerador (`SHAPE_DELIMITERS`) já carregam
e emitem o formato desde S0.

**Independent Test**: Abrir a ferramenta e confirmar que o nó `Aprovado?` do starter é desenhado
como losango no canvas (e não como retângulo); em seguida colar, pelo painel de código, um
Flowchart contendo cada um dos 14 formatos suportados e confirmar que o canvas desenha os 14 de
forma visualmente distinta entre si. Nenhuma superfície de escolha é exercitada.

**Acceptance Scenarios**:

1. **Given** a ferramenta recém-aberta com o starter, **When** o usuário olha o canvas, **Then** o
   nó `Aprovado?` é desenhado como **losango**, coerente com o `aprovado{Aprovado?}` que o painel
   de código já exibia — encerrando a divergência que S1 declarou aceitável (FR-002a de S1) e
   estendendo a paridade canvas ↔ código, que em S1 cobria nós/arestas/rótulos, para **formato**.
2. **Given** o painel de código, **When** o usuário escreve um nó em qualquer um dos 14 formatos
   suportados, **Then** o canvas desenha aquele formato, e formatos diferentes são desenhados de
   maneira visualmente distinta entre si.
3. **Given** um Flowchart colado cujo nó usa um formato que o Mermaid aceita mas que não está entre
   os 14 suportados, **When** o canvas o desenha, **Then** vale a regra de S0 já entregue
   (`normalizeImportedShape`): o formato é normalizado para retângulo, e o canvas desenha o
   retângulo que o modelo de fato carrega — canvas e código continuam concordando sobre o modelo,
   sem caminho especial novo.
4. **Given** um diagrama com formatos variados, **When** o usuário compara canvas e código, **Then**
   os dois representam o mesmo diagrama em **nós, arestas, rótulos e formato** — a paridade desta
   release passa a incluir formato.

---

### User Story 3 - Escolher o formato de um nó pelo canvas (Priority: P3)

O usuário seleciona um nó no canvas e escolhe entre os formatos que o Flowchart suporta. O canvas
redesenha o nó com o formato escolhido e a linha correspondente do código é reescrita no mesmo
instante — sem que ele precise saber que um losango se escreve `{}` e um cilindro `[( )]`.

**Why this priority**: É a razão de ser declarada de RF-07, mas se apoia inteiramente em US2: sem
o canvas desenhar formatos, escolher um formato produziria mudança visível apenas no painel de
código — que é exatamente o estado de hoje, e a lacuna que esta fatia existe para fechar. Por isso
vem depois, e não porque valha menos.

**Independent Test**: Selecionar o nó `Início` do starter (retângulo), escolher `losango`, e
confirmar que o canvas o redesenha como losango e que a linha `inicio[Início]` do código passa a
`inicio{Início}`; repetir para cada um dos 14 formatos e confirmar que o código sai com os
delimitadores corretos a cada escolha.

**Acceptance Scenarios**:

1. **Given** um nó retangular selecionado no canvas, **When** o usuário escolhe outro formato,
   **Then** o canvas redesenha o nó com o formato escolhido e a linha do nó no código é reescrita
   com os delimitadores daquele formato, dentro do teto de prévia ao vivo de S0 (NFR-01).
2. **Given** um nó selecionado, **When** o usuário abre a superfície de escolha, **Then** ela indica
   qual é o formato **atual** do nó, de modo que escolher parte do que existe.
3. **Given** um nó com rótulo e conexões, **When** o usuário troca o formato dele, **Then** o
   **rótulo e o identificador do nó permanecem os mesmos** e **nenhuma linha de aresta é
   reescrita** — trocar formato não é renomear. (Contraste deliberado com o rename de S0, que
   regenera o id a partir do rótulo e reescreve toda aresta que o referencia — S0, FR-003.)
4. **Given** um formato escolhido pelo canvas, **When** o conteúdo passa pelo ciclo código → canvas
   → código, **Then** o formato sobrevive sem perda (NFR-02), para qualquer um dos 14.
5. **Given** um formato escolhido pelo canvas, **When** o usuário copia o código e cola num destino
   externo, **Then** o texto colado é um Flowchart válido que reproduz o formato.
6. **Given** um usuário que navega só pelo teclado, **When** ele seleciona um nó e escolhe um
   formato, **Then** o fluxo inteiro é completável sem mouse, honrando o piso de acessibilidade de
   S0 (FR-014 de S0).

---

### Edge Cases

- **Apagar o rótulo × rótulo vazio**: apagar todo o texto de um rótulo MUST ser indistinguível, no
  código e no modelo, de uma conexão que nunca teve rótulo (FR-004a). Sem essa regra o modelo
  passaria a ter **duas** representações de "sem rótulo" (`null` e `''`) que produzem texto
  idêntico — o gerador de S0 já trata as duas como ausentes (`edge.label ? … : ''`) —, de modo que
  um round-trip devolveria `null` onde o modelo tinha `''` e a igualdade de modelo quebraria sem
  que uma linha de texto mudasse.
- **Rótulo só com espaços**: equivale a apagar (FR-004a), coerente com o rename de S0, que já
  aplica `trim()` e recusa rótulo vazio (`CanvasPanel`).
- **Rótulo com caracteres especiais** (`|`, `[`, `{`, `;`, `#`): o gerador de S0 já os cita e escapa
  (`formatLabelText`). Verificou-se contra o código, executando o ciclo real, que rótulos de aresta
  contendo `|`, `[`, `{`, `(`, `;` e `#` sobrevivem sem perda — inclusive `a|b`, emitido como
  `-->|"a|b"|`. Nenhum caminho novo é necessário.
- **Rótulo com aspas (`"`) — defeito pré-existente de S0, fora do escopo**: verificou-se que um
  rótulo contendo `"` **não** sobrevive ao ciclo: o gerador o escapa como `#quot;` e o Mermaid o
  devolve mangled (`a"b` → `aﬂ°quot¶ßb`). O defeito é **de S0 e já alcançável hoje** pelo rename de
  nó no canvas (o handler de teclado aceita `"` como qualquer caractere), não é introduzido por
  esta fatia, e vale igualmente para rótulo de nó e de aresta. Esta fatia MUST NOT agravá-lo nem
  contorná-lo com um caminho especial para aresta: consertá-lo é mexer na tabela de escape do
  gerador — `src/core/**`, que afeta a saída de **todo** diagrama — e pertence a uma fatia que
  tenha esse defeito como objeto. Ver FR-015.
- **Trocar o formato de um nó em rename**: o rename de S0 é estado local do `CanvasPanel` e captura
  o teclado enquanto ativo. Um formato escolhido durante um rename em curso não pode corromper o
  rename nem vice-versa: as duas edições tocam campos distintos do mesmo nó (`shape` × `label`/`id`).
  Como o rename regenera o **id** ao concluir (S0, FR-003), a seleção MUST acompanhar a regra de
  FR-002a.
- **Renomear um nó selecionado**: o rename de S0 **regenera o id** a partir do novo rótulo, de modo
  que o nó selecionado deixa de existir sob o id que a seleção aponta. A seleção MUST ser descartada
  (FR-002a) — nenhum ponteiro para conteúdo sobrevive à destruição do conteúdo que ele referencia
  (princípio de FR-006a/FR-006c de S1). O mesmo vale quando o texto do painel é reinterpretado e os
  ids das arestas mudam (o ACL de S0 gera ids de aresta na forma `e0-a-b`, enquanto as mutações
  geram `e0`).
- **Limpar com algo selecionado**: a limpeza de S1 destrói o conteúdo; a seleção MUST NOT sobreviver
  a ela (FR-002a), pelo mesmo princípio que S1 aplicou a `connectSourceId` (FR-006a de S1) e ao
  rename em curso (FR-006c de S1).
- **Selecionar durante o modo conectar**: o modo conectar de S0 consome o clique no nó para escolher
  origem/destino. Esta fatia MUST NOT redefinir esse fluxo (FR-013); alternar o modo conectar
  descarta a seleção, espelhando o `toggleConnectMode` já entregue, que zera `connectSourceId`.
- **Editar rótulo/formato enquanto o texto do painel é inválido**: vale a regra de S0 já entregue
  (FR-004/FR-012 de S0) — a edição pelo canvas muta o último modelo válido e regenera código
  válido, substituindo o texto inválido. Esta fatia não redefine esse comportamento e não cria caso
  novo.
- **Nada selecionado**: a superfície de propriedades MUST exibir um estado neutro. Ela MUST NOT ser
  uma superfície de escolha de **template** (FR-012/SC-011 de S1 seguem valendo) — escolher o
  formato de um nó existente não é escolher entre diagramas iniciais.
- **Desfazer a seleção pelo usuário**: o usuário chega ao estado neutro por `Escape` ou por clicar no
  fundo vazio do canvas (FR-002b). `Escape` durante um rename de S0 em curso pertence ao rename (que
  o consome como cancelamento — S0, Decisão E) e MUST NOT também limpar a seleção no mesmo evento;
  fora de rename, `Escape` limpa a seleção. Clicar num nó ou numa aresta **seleciona** aquele
  elemento em vez de limpar; só o clique no fundo vazio limpa.
- **Formato e layout**: os 14 formatos têm geometrias distintas, mas a posição dos nós continua sendo
  do auto-layout (RN-04) e MUST NOT entrar no texto (S0, SC-006). Verificou-se que o layout de S0
  dimensiona **todo** nó numa caixa fixa de 172×40 (`src/core/layout/index.ts`),
  independentemente do formato — de modo que desenhar um losango ou um círculo legível dentro dessa
  caixa é uma tensão real que o plano precisa resolver (FR-006a).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Esta fatia MUST cobrir somente o tipo **Flowchart**, honrando RN-03 (cada recurso de
  edição vale apenas onde o tipo o suporta). A mesma edição nos outros quatro tipos é fatia
  posterior e MUST NOT ser antecipada aqui.
- **FR-002**: O sistema MUST introduzir uma **seleção** no canvas: o usuário MUST conseguir
  selecionar **um** elemento — um nó **ou** uma conexão — por vez, por mouse e por teclado. A
  seleção é **estado só-de-UI, efêmero**: ela MUST NOT ser serializada no código nem influenciar o
  texto gerado, exatamente como o viewport (RN-02) e o modo conectar de S0. Seleção múltipla está
  fora do escopo desta fatia.
- **FR-002a**: A seleção MUST ser **derivada do modelo**: quando o elemento selecionado deixa de
  existir no modelo, a seleção MUST ser descartada. Isto não é higiene — é o princípio que S1 já
  estabeleceu duas vezes (FR-006a e FR-006c de S1): *nenhum ponteiro para conteúdo sobrevive à
  destruição do conteúdo que ele referencia*. Os caminhos que o exigem são reais e verificados: o
  rename de S0 **regenera o id** do nó a partir do novo rótulo (FR-003 de S0), a limpeza de S1
  destrói tudo, a remoção de nó/aresta de S0 destrói o elemento, e a reinterpretação do texto do
  painel troca os ids das arestas (o ACL emite `e0-a-b`; as mutações emitem `e0`). Em todos, um
  ponteiro de seleção sobrevivente faria a superfície de propriedades editar um elemento que não
  existe mais.
- **FR-002b**: O usuário MUST conseguir **desfazer a seleção** deliberadamente, devolvendo o painel
  de propriedades ao estado neutro (FR-003), por **duas** vias: pressionar `Escape` **e** clicar no
  fundo vazio do canvas. A via por teclado é obrigatória para que os fluxos permaneçam completáveis
  inteiramente por teclado (FR-012, SC-011). `Escape` só limpa a seleção quando **não** há rename de
  S0 em curso — o rename é estado local do `CanvasPanel` que captura o teclado enquanto ativo e já
  consome `Escape` como cancelamento (S0, Decisão E) —, de modo que esta fatia MUST NOT redefinir
  esse cancelamento (FR-010). Esta é a única limpeza de seleção **iniciada pelo usuário**; as demais
  seguem sendo dirigidas pelo sistema (FR-002a, FR-013).
- **FR-002c**: O canvas MUST **indicar visualmente** qual elemento está selecionado, com um destaque
  próprio no nó ou na conexão selecionada, **distinto** do anel de foco de DOM que S0 já expõe (as
  arestas já recebem foco de DOM). Reaproveitar apenas o foco acoplaria seleção a foco e não daria
  pista quando a seleção viesse de um clique de mouse sem foco; por isso o destaque é construto
  próprio. O estado "selecionado" MUST ser **programaticamente determinável** (par do formato atual
  em FR-012), de modo que quem usa leitor de teclado/tela saiba qual elemento o painel edita. O
  destaque é estado só-de-UI e efêmero (FR-002, RN-02): MUST NOT ser serializado nem alcançar o
  texto gerado.
- **FR-002d**: Por teclado, **focar** um elemento (mover o foco de DOM para o nó ou a aresta, por
  Tab ou setas) MUST estabelecer a seleção e atualizar o painel de propriedades ao vivo — espelhando
  o modelo de S0, em que o teclado do canvas é dirigido por foco de DOM e o `Delete` já age sobre o
  elemento focado. A seleção assim estabelecida MUST **persistir** quando o foco em seguida entra no
  painel para editar o rótulo ou o formato: enquanto o foco está no painel, nenhum elemento do canvas
  está focado, mas a seleção (e o destaque de FR-002c) MUST permanecer, para que o painel edite um
  alvo estável. Esta fatia MUST NOT introduzir um segundo passo de confirmação (Enter/Space) nem um
  atalho dedicado para selecionar — o que evita novo binding em conflito com o rename/conectar de S0
  (FR-010). Por mouse, clicar no elemento seleciona-o e clicar no fundo vazio limpa (FR-002b).
- **FR-003**: A superfície de edição MUST ser um **painel de propriedades contextual** que reflete a
  seleção: com uma conexão selecionada, ele MUST expor o **rótulo** dela; com um nó selecionado, ele
  MUST expor o **formato** dele; sem seleção, ele MUST exibir um estado neutro. Ele MUST NOT ser
  uma edição inline no canvas: o rename de S0 provou que um `<input>` real não retém foco dentro de
  um nó do React Flow (Decisão E de S0, comentada em `src/components/FlowNode.tsx`), e replicar o
  handler de teclado centralizado que S0 adotou por falta de alternativa seria reimplementar
  Backspace/Escape/Enter à mão numa fatia que não precisa disso.
- **FR-003a**: O painel MUST expor, nesta fatia, **exatamente** o rótulo da conexão e o formato do
  nó. Ele MUST NOT expor aparência da conexão (tipo de seta/linha/cor — RF-06), estilo de elemento
  (RF-08), agrupamento (RF-09) ou configuração de layout (RF-10): são fatias posteriores dos épicos
  E3/E4, e antecipá-las aqui trocaria uma fatia vertical fina por um inspetor genérico. O rename de
  nó MUST permanecer onde S0 o entregou (inline, pelo teclado do canvas) e MUST NOT ser duplicado
  no painel.
- **FR-004**: O usuário MUST conseguir, pelo canvas e sem escrever Mermaid, **criar**, **editar** e
  **remover** o texto de uma conexão. A superfície MUST partir do texto atual da conexão quando ela
  já tiver rótulo. Cada mudança MUST reescrever a linha correspondente do código no mesmo instante,
  dentro do teto de prévia ao vivo de S0 (NFR-01, ≤ 150 ms).
- **FR-004a**: Um rótulo **vazio ou só com espaços** MUST ser gravado no modelo como **ausência de
  rótulo** (o mesmo valor com que uma conexão nasce em S0 — `connect()` grava `label: null`), e não
  como texto vazio. O modelo MUST ter uma **única** representação canônica de "sem rótulo". Sem esta
  regra, `''` e `null` gerariam texto idêntico (o gerador de S0 já trata os dois como ausentes:
  `edge.label ? … : ''`) mas seriam modelos distintos, de modo que o ciclo de ida e volta devolveria
  `null` onde havia `''` e a igualdade de modelo quebraria sem que nenhuma linha de texto mudasse —
  um falso negativo de round-trip criado por esta fatia.
- **FR-004b**: O rótulo gravado MUST ter espaços das pontas removidos, coerente com o rename de S0
  já entregue (`CanvasPanel` aplica `trim()` e recusa rótulo vazio). Esta fatia MUST NOT introduzir
  uma segunda convenção de normalização de texto.
- **FR-005**: O usuário MUST conseguir, pelo canvas e sem escrever Mermaid, escolher o **formato** de
  um nó entre os **14 formatos suportados** — os da tabela `SHAPE_DELIMITERS` já entregue em S0 e
  compartilhada pelo gerador e pelo ACL de importação: `rect`, `round`, `stadium`, `subroutine`,
  `cylinder`, `circle`, `doublecircle`, `diamond`, `hexagon`, `odd`, `trapezoid`, `inv_trapezoid`,
  `lean_right`, `lean_left`. A superfície MUST indicar o formato **atual** do nó. O conjunto
  oferecido MUST ser exatamente o conjunto que o código suporta e que o canvas desenha (FR-006):
  uma regra só, sem cauda de formatos que o canvas mostra mas não deixa escolher.
- **FR-005a**: Trocar o formato de um nó MUST alterar **somente** o formato: o **rótulo** e o
  **identificador** do nó MUST permanecer inalterados e **nenhuma linha de aresta** MUST ser
  reescrita. É o contraste deliberado com o rename de S0, que regenera o id a partir do rótulo e
  reescreve toda aresta que o referencia (FR-003 de S0). Consequência observável: trocar o formato
  toca exatamente **uma** linha do código.
- **FR-006**: O canvas MUST desenhar cada um dos 14 formatos de FR-005, e formatos diferentes MUST
  ser desenhados de maneira visualmente distinta entre si. Isto **supera** FR-002a de S1, que fixou
  o formato como construto do painel de código e declarou que "a renderização de formato no canvas
  pertence a uma fatia posterior" — esta. A paridade canvas ↔ código, que S1 declarou cobrir nós,
  arestas e rótulos **mas não formato**, MUST passar a cobrir **formato** também. Formato importado
  fora dos 14 continua normalizado para retângulo pela regra de S0 já entregue
  (`normalizeImportedShape`), e o canvas desenha o retângulo que o modelo de fato carrega — sem
  caminho especial novo.
- **FR-006a**: A renderização de formato MUST NOT introduzir coordenada de nó no texto gerado nem
  transferir ao usuário o controle da posição: a posição segue sendo do auto-layout (RN-04; S0,
  FR-010 e SC-006). O layout de S0 dimensiona todo nó numa caixa fixa (172×40 em
  `src/core/layout/index.ts`), o que o plano MUST confrontar — desenhar losango, círculo ou
  cilindro legível dentro da caixa do retângulo é uma tensão geométrica real. Se o plano concluir
  que o dimensionamento precisa ser sensível ao formato, essa mudança MUST permanecer
  **determinística** (NFR-04) e **efêmera** (RN-02): nenhuma dimensão MUST alcançar o texto.
- **FR-007**: As duas edições desta fatia MUST ser **mutações de origem canvas** e MUST seguir o
  laço já provado em S0 (FR-004 de S0, Decisão B): mutação pura do modelo → geração → reescrita do
  texto do painel. Elas MUST NOT reescrever o texto por caminho próprio nem reentrar no caminho de
  parse. A geração MUST permanecer determinística (NFR-04): o mesmo modelo produz 100% o mesmo
  texto.
- **FR-008**: O ciclo canvas → código → canvas MUST preservar 100% do conteúdo estrutural do
  Flowchart **incluindo formato e rótulo de conexão** (NFR-02; S0, FR-007), para os 14 formatos de
  FR-005 e para conexões rotuladas. As únicas perdas admissíveis continuam sendo ordem de declaração
  e comentários `%%` (NFR-02; S0, FR-008). Isto MUST ser garantido por teste automatizado que
  exercite os 14 formatos e o rótulo de conexão — o teste de round-trip entregue em S0 já compara
  `shape` e `label` no snapshot canônico, mas exercita apenas `rect` e `diamond`.
- **FR-009**: O resultado MUST continuar copiável em uma única ação, e o texto copiado MUST ser um
  Flowchart válido que renderiza no GitHub — o mesmo alvo de compatibilidade de S0 (FR-005 de S0) —
  com os formatos e rótulos escolhidos pelo canvas.
- **FR-010**: Esta fatia MUST NOT redefinir o comportamento entregue em S0 e S1. Vale aqui a mesma
  fronteira que S1 fixou (FR-014a de S1): a promessa é **imutabilidade comportamental**, não
  ausência de diff. Mudanças **aditivas** — uma mutação nova, um campo de estado novo, um
  componente novo, um ponto de montagem — são o mecanismo legítimo da fatia; **redefinir** um
  caminho existente não é. Em particular, o laço bidirecional, a tolerância a texto inválido, o
  determinismo, a cópia, a semeadura do starter e a limpeza permanecem exatamente como
  especificados. Diferentemente de S1, esta fatia **MUST tocar `src/core/**`**: não existe caminho
  aditivo para escrever `Edge.label` e `Node.shape` sem uma mutação nova em
  `src/core/model/mutations.ts` (verificou-se que as cinco entregues não escrevem nenhum dos dois
  campos). A proibição de tocar `src/core/**` era regra **de S1** (FR-014a de S1), motivada por S1
  não precisar de capacidade nova de modelo; ela MUST NOT ser lida como restrição permanente. As
  mutações novas MUST ser aditivas: nenhuma das cinco existentes muda de comportamento.
- **FR-010a**: Esta fatia MUST emendar as asserções de teste de S1 cuja premissa é o comportamento
  que ela abole, e a lista MUST ser tratada como exaustiva. Verificou-se contra o código que são
  duas, ambas em `tests/e2e/starter.spec.ts`:
  - O caso **"FR-002a — the decision node is a diamond in code but rendered identically to every
    other node on the canvas"** afirma literalmente o oposto desta fatia: que a classe CSS do nó
    `Aprovado?` é idêntica à do nó `Início`, e que o canvas não contém `clip-path`, `<polygon>` nem
    `rotate(`. Ele MUST ser reapontado para afirmar o que passa a ser verdade — o nó de decisão é
    desenhado como losango e distinguível dos retângulos — e renomeado de acordo. Mantê-lo seria
    manter verde uma asserção que esta fatia existe para tornar falsa.
  - O caso **"SC-011 — no template-choice surface is presented at first contact"** afirma
    `page.locator('[role="listbox"], [role="combobox"], [role="menu"]')).toHaveCount(0)` para a
    **página inteira**, e um conjunto exato de controles na toolbar. A asserção proíbe uma **classe
    de widget** em vez da **superfície de escolha de template** que o teste existe para provar. Se o
    seletor de formato adotar um desses papéis, o teste MUST ser estreitado para afirmar a ausência
    de escolha **de template**, preservando a garantia real de FR-012/SC-011 de S1 — que continua
    valendo integralmente. Se o seletor não adotar nenhum desses papéis, nenhuma emenda é devida: a
    condição MUST ser verificada na implementação, não presumida.

  Verificou-se que o portão de contrato `tests/contract/no-template-selector.test.ts` **não** é
  afetado: seus padrões exigem a palavra *template* adjacente (`/template\s*(selector|picker|…)/i`,
  `/role=…[^>]*template/i`), de modo que um seletor de **formato** não o dispara. Se um terceiro
  teste quebrar na implementação, isso é sinal de que esta premissa falhou e o caso merece decisão
  explícita — não emenda silenciosa até o verde.
- **FR-011**: Esta fatia MUST NOT introduzir persistência, documento nativo ou qualquer estado
  salvo. A sessão permanece efêmera (RN-05, ADR-003) e a única saída copiável continua sendo o texto
  Mermaid (RN-01). A seleção e o estado do painel de propriedades são efêmeros e MUST NOT entrar no
  código (RN-02).
- **FR-012**: Esta fatia MUST cumprir o piso de acessibilidade de S0 (FR-014 de S0) nas superfícies
  que introduz: selecionar um nó ou uma conexão e completar as duas edições MUST ser possível
  **inteiramente por teclado**; o painel e seus controles MUST ter nome e papel acessíveis; cada um
  dos 14 formatos MUST ter um **nome acessível em pt-BR** (o formato é informação puramente visual e,
  sem nome, é indisponível a quem usa leitor de tela); e o formato **atual** do nó selecionado MUST
  ser programaticamente determinável. Como em S0 e S1, esta fatia MUST NOT alegar conformidade WCAG
  completa: contraste e auditoria formal seguem fora de escopo.
- **FR-013**: O fluxo do **modo conectar** de S0 MUST permanecer exatamente como entregue: com o
  modo ativo, o clique num nó escolhe origem/destino. Alternar o modo conectar MUST descartar a
  seleção, espelhando o `toggleConnectMode` já entregue, que zera `connectSourceId` — de modo que
  os dois construtos só-de-UI não fiquem apontando para coisas diferentes ao mesmo tempo.
- **FR-014**: A criação de nó MUST continuar produzindo um **retângulo** (`addNode` grava
  `shape: 'rect'` — S0), e esta fatia MUST NOT acrescentar escolha de formato ao momento da
  criação. O escopo é **editar o formato de um nó existente**; oferecer a escolha na criação
  duplicaria a superfície e ampliaria a fatia sem fechar nenhuma lacuna que ela declara fechar.
- **FR-015**: Esta fatia MUST NOT consertar, contornar nem agravar o defeito **pré-existente de S0**
  de rótulos contendo aspas (`"`): o gerador os escapa como `#quot;` e o ciclo os devolve mangled
  (verificado: `a"b` → `aﬂ°quot¶ßb`). O defeito já é alcançável hoje pelo rename de nó no canvas e
  vale igualmente para rótulo de nó e de aresta, de modo que esta fatia **não o introduz** e não
  abre caso novo. Consertá-lo exige mexer na tabela de escape do gerador — que reescreveria a saída
  de **todo** diagrama — e pertence a uma fatia que tenha esse defeito como objeto. Esta fatia MUST
  registrar o defeito (aqui e nos Edge Cases) em vez de tratá-lo silenciosamente: é uma exceção
  conhecida a NFR-02, e escondê-la num rótulo de aresta a tornaria mais difícil de encontrar.
- **FR-016**: O **modelo do starter** (S1, FR-002) MUST permanecer inalterado: ele já declara
  `Aprovado?` como `diamond` e as arestas `Sim`/`Não` com rótulo. A única mudança observável no
  starter é **visual** e é consequência de FR-006 — o nó de decisão passa a ser desenhado como
  losango. Nenhuma linha do texto canônico do starter muda, de modo que o teto de linhas de S1
  (FR-013 de S1), a forma canônica (FR-003 de S1) e o predicado de confirmação da limpeza (FR-007 de
  S1, que compara o texto do painel com a forma canônica) permanecem válidos sem ajuste.

### Key Entities

- **Seleção**: o elemento — um nó **ou** uma conexão — que o painel de propriedades reflete. É
  estado **só-de-UI e efêmero**, da mesma família do modo conectar e do viewport: nunca serializa
  (RN-02) e nunca sobrevive à destruição do elemento que aponta (FR-002a). Não faz parte do modelo
  de diagrama. É indicada no canvas por um **destaque visível** próprio, distinto do foco de DOM, e
  programaticamente determinável (FR-002c).
- **Rótulo de conexão**: o texto que viaja no código entre `|` na linha da aresta
  (`a -->|Sim| b`). Já existe no modelo de S0 (`Edge.label`) e já é exibido pelo canvas; esta fatia
  abre o caminho de **escrita** pelo canvas. Tem uma única representação canônica de ausência
  (FR-004a).
- **Formato de nó**: o construto que decide os delimitadores do nó no código (`{}` para losango,
  `[( )]` para cilindro, …). Já existe no modelo de S0 (`Node.shape`), já é emitido pelo gerador e
  já é reconhecido pelo ACL de importação; esta fatia abre o caminho de **escrita** pelo canvas
  (FR-005) e o de **desenho** no canvas (FR-006). Os 14 valores suportados são os da tabela
  compartilhada por gerador e ACL.
- **Painel de propriedades**: a superfície contextual que reflete a seleção e expõe, nesta fatia,
  exatamente o rótulo da conexão e o formato do nó (FR-003a). É superfície de edição do elemento
  selecionado — **não** é uma superfície de escolha de template (FR-012/SC-011 de S1 seguem
  valendo).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O número de vezes que o usuário precisa escrever Mermaid à mão para rotular uma
  conexão ou trocar o formato de um nó passa a ser **zero** — contra "descer ao painel de código e
  escrever `|Sim|` ou `{}` à mão" hoje.
- **SC-002**: Escrever, alterar ou apagar o rótulo de uma conexão pelo canvas reescreve a linha
  correspondente do código em **100%** das tentativas, dentro do teto de prévia ao vivo de S0
  (NFR-01, ≤ 150 ms), e o canvas passa a exibir (ou deixa de exibir) o texto sobre a conexão.
- **SC-003**: Apagar o rótulo de uma conexão produz, em **100%** das execuções, uma linha de aresta
  **sem** `|...|` e um modelo cujo rótulo é indistinguível do de uma conexão que nunca teve rótulo
  (FR-004a) — zero representações duplicadas de "sem rótulo".
- **SC-004**: Cada um dos **14** formatos suportados, escolhido pelo canvas, produz no código os
  delimitadores daquele formato e é desenhado no canvas de forma visualmente distinta dos demais,
  em **100%** das escolhas — 14/14, sem cauda não escolhível nem cauda não desenhável.
- **SC-005**: Trocar o formato de um nó reescreve **exatamente uma** linha do código (a do nó), em
  100% das trocas: o identificador e o rótulo não mudam e **zero** linhas de aresta são reescritas
  (FR-005a). Escrever ou apagar o rótulo de uma conexão reescreve exatamente a linha daquela aresta.
  As demais linhas mantêm texto e ordem exatos — o critério é a ausência de reescrita gratuita, como
  em SC-003 de S1.
- **SC-006**: O ciclo código → canvas → código preserva **100%** do formato e do rótulo de conexão,
  para os 14 formatos e para conexões rotuladas (NFR-02), aferido por teste automatizado — contra a
  cobertura de hoje, que exercita 2 dos 14 formatos.
- **SC-007**: Gerar o código a partir de um mesmo canvas com formatos e rótulos escolhidos,
  repetidamente, produz texto **byte a byte idêntico** (NFR-04), em 100% das repetições.
- **SC-008**: O código produzido com formatos e rótulos escolhidos pelo canvas, copiado e colado no
  GitHub, renderiza corretamente e sem erro de sintaxe, em **100%** das tentativas.
- **SC-009**: Em **zero** saídas de texto aparece qualquer vestígio de seleção, de estado do painel
  de propriedades ou de dimensão/coordenada de nó — para um mesmo diagrama, selecionar elementos
  diferentes produz texto idêntico (RN-02; S0, SC-006 e SC-009).
- **SC-010**: Após qualquer destruição do elemento selecionado — rename (que regenera o id), remoção,
  limpeza ou reinterpretação do texto —, restam **zero** ponteiros de seleção obsoletos: o painel de
  propriedades nunca oferece edição de um elemento que não existe mais, em 100% dos casos
  (FR-002a).
- **SC-011**: Os dois fluxos (rotular uma conexão, escolher o formato de um nó) são completáveis
  **inteiramente por teclado**, em 100% das tentativas, e cada um dos 14 formatos tem nome acessível
  em pt-BR (FR-012).
- **SC-012**: O nó `Aprovado?` do starter é desenhado como **losango** em 100% das aberturas, e o
  texto canônico do starter permanece **idêntico** ao de S1 — **zero** linhas mudam (FR-016), de
  modo que os tetos e predicados de S1 que dependem dele seguem válidos sem ajuste.
- **SC-013**: Nenhuma superfície de escolha de **template** é apresentada em 100% dos fluxos desta
  fatia (FR-012/SC-011 de S1 preservados) — o painel de propriedades edita o elemento selecionado e
  não oferece diagramas iniciais.
- **SC-014**: Ao selecionar um nó ou uma conexão, o canvas exibe um **destaque visível** naquele
  elemento — distinto do anel de foco de DOM — em 100% das seleções, e o estado "selecionado" é
  programaticamente determinável (FR-002c); ao desfazer a seleção (FR-002b), o destaque desaparece.
- **SC-015**: Focar um nó ou uma aresta por teclado (Tab/setas) estabelece a seleção e reflete o
  elemento no painel em 100% das vezes (FR-002d); e a seleção **persiste** quando o foco entra no
  painel para editar — em 100% dos casos o painel continua editando o mesmo elemento e o destaque
  permanece, mesmo com nenhum elemento do canvas focado.

## Assumptions

- **Conjunto de formatos**: assume-se que os 14 formatos da tabela `SHAPE_DELIMITERS` são o conjunto
  certo porque é o conjunto que o **código já suporta dos dois lados** — o gerador os emite e o ACL
  os reconhece, a partir da mesma tabela compartilhada. Verificou-se, executando o ciclo real
  (`generate` → `importFlowchart`) para cada um, que **os 14 sobrevivem sem perda** (14/14), de modo
  que nenhum deles é risco para NFR-02. O argumento decisivo contra um subconjunto curado é que o
  canvas **precisa desenhar os 14 de qualquer forma**: código colado já pode trazer qualquer um
  deles hoje, e deixar oito desenhados como retângulo preservaria, na cauda, a divergência canvas ↔
  código que a fatia existe para fechar — de modo que restringir o seletor economizaria ícones, não
  renderização, ao custo de uma segunda regra a especificar e testar.
- **Superfície de edição**: assume-se que um painel contextual é preferível à edição inline porque
  o código de S0 documenta a razão pela qual o inline é caro: "React Flow repeatedly re-asserts DOM
  focus on its own node wrapper, so a child input can never reliably win or keep focus after the
  initial keystroke" (`src/components/FlowNode.tsx`). S0 pagou esse preço no rename reimplementando
  o editor de texto à mão num handler de teclado; assume-se que repetir isso para rótulo de aresta
  seria escolher deliberadamente o mecanismo que S0 só adotou por não ter saída. Assume-se também que
  o painel é o lugar natural de RF-06 e RF-08 nas fatias seguintes, de modo que a superfície criada
  aqui é reaproveitada em vez de descartada.
- **Seleção como construto novo**: verificou-se que S0/S1 **não têm** estado de seleção — o canvas
  dirige o teclado por foco de DOM (`event.target.closest('[data-id]')`) e o modo conectar por
  cliques. Verificou-se também que as arestas **já recebem foco de DOM** e já respondem a `Delete`
  no handler de S0, de modo que a seleção de conexão por teclado não parte do zero. Assume-se que a
  seleção é estado só-de-UI da mesma família de `connectMode`/`connectSourceId`, e que o precedente
  de S1 sobre ponteiros pendurados (FR-006a/FR-006c de S1) se aplica a ela integralmente — foi o que
  motivou FR-002a.
- **Rótulo de aresta já é exibido**: verificou-se que `CanvasPanel` já mapeia
  `label: edge.label ?? undefined` para a aresta do React Flow, de modo que US1 **não precisa de
  renderização nova** — o rótulo de uma conexão colada já aparece hoje. Assume-se que a exibição
  entregue é suficiente e que esta fatia só abre o caminho de escrita.
- **Mutações novas em `src/core/`**: assume-se que a proibição de tocar `src/core/**` era regra
  **de S1** (FR-014a de S1), motivada por S1 não precisar de capacidade nova de modelo — e não uma
  restrição permanente. Verificou-se que as cinco mutações entregues (`addNode`, `renameNode`,
  `connect`, `removeNode`, `removeEdge`) **não escrevem** `Edge.label` nem `Node.shape`, de modo que
  não existe caminho aditivo para esta fatia sem mutação nova. Assume-se que acrescentar mutações,
  sem alterar as cinco existentes, é aditivo no sentido de FR-014a de S1 e não redefine S0.
- **Defeito de aspas**: assume-se que o mangling de `"` no ciclo é defeito **de S0**, fora do escopo
  desta fatia e não introduzido por ela — verificou-se que já é alcançável pelo rename de nó no
  canvas entregue em S0. Assume-se que registrá-lo explicitamente (FR-015) é melhor que corrigi-lo
  de passagem: a correção mexe na tabela de escape do gerador e muda a saída de todo diagrama do
  usuário, o que é exatamente o tipo de reescrita que FR-010 recusa. Se ele for julgado inaceitável,
  o alvo é uma fatia própria, não um remendo local para aresta.
- **Layout e geometria**: verificou-se que o layout de S0 dimensiona todo nó numa caixa fixa de
  172×40 (`NODE_WIDTH`/`NODE_HEIGHT` em `src/core/layout/index.ts`), independentemente do formato.
  Assume-se que desenhar os 14 formatos é primariamente trabalho de **renderização** e que a
  posição continua sendo do auto-layout (RN-04); assume-se que a tensão geométrica (um losango
  legível não cabe na caixa de um retângulo com o mesmo rótulo) é decisão de **plano**, não de spec,
  desde que o resultado permaneça determinístico (NFR-04) e efêmero (RN-02). Se o plano concluir que
  o dimensionamento precisa ser sensível ao formato, isso é mudança aditiva em `src/core/layout` — e
  nenhuma dimensão pode alcançar o texto (S0, SC-006).
- **Seleção única**: assume-se que seleção múltipla (trocar o formato de vários nós de uma vez) não
  pertence a esta fatia — ela ampliaria a superfície sem fechar nenhuma lacuna declarada, e a fatia
  se define por permitir o que hoje é impossível, não por otimizar o que passa a ser possível.
- **Escopo Flowchart**: assume-se que RN-03 governa — a mesma edição nos outros quatro tipos é fatia
  posterior, e nenhum dos outros tipos existe na ferramenta ainda (S0, FR-006: só Flowchart).
- **Idioma e fator de forma**: valem as premissas de S0/S1 — interface pt-BR com strings fixas
  centralizadas (`src/strings.ts`), sem i18n; web desktop (mouse + teclado); piso de acessibilidade
  baseline sem alegação de conformidade WCAG completa.
- **Dependência de S0/S1**: esta fatia assume o laço bidirecional, a tolerância a texto inválido, a
  fidelidade de round-trip, o determinismo, a cópia (S0), e a semeadura do starter e a limpeza (S1)
  como já entregues e inalterados por ela.
