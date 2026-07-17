# Phase 0 — Research: Fatia S2 (Rótulo de Conexão e Formato de Nó)

Consolida as decisões **M–R** fixadas pelo plano. Nenhuma NEEDS CLARIFICATION restou: o `spec.md`
já resolveu, por Clarification, as três perguntas abertas (conjunto de 14 formatos; painel
contextual vs. inline; desfazer seleção por `Escape` + clique no vazio) e os quatro ADRs fixaram a
stack. As decisões abaixo são **de plano** (como realizar), não de escopo.

Todas as afirmações "verificado" foram checadas contra o código entregue (S0/S1), citado por
arquivo.

---

## Decisão M — Fronteira aditiva, agora tocando `src/core/**`

- **Decisão:** honrar FR-010 como **imutabilidade comportamental**; mudanças estritamente aditivas.
  Diferentemente de S1, `src/core/**` **é** tocado (2 mutações + layout sensível ao formato).
- **Rationale:** verificou-se que as cinco mutações de S0 (`addNode`, `renameNode`, `connect`,
  `removeNode`, `removeEdge` em `src/core/model/mutations.ts`) **não escrevem** `Edge.label` nem
  `Node.shape`. Sem mutação nova não há caminho para as duas edições. A proibição de tocar
  `src/core` era regra **de S1** (FR-014a de S1), motivada por S1 não precisar de capacidade de
  modelo — não é permanente (FR-010 explicita).
- **Alternativas rejeitadas:** (a) escrever os campos por um caminho fora das mutações — violaria o
  laço único de Decisão B de S0 e a pureza do núcleo; (b) manter `src/core` intocado — tornaria a
  fatia impossível.

## Decisão N — `setEdgeLabel` / `setNodeShape` puras e aditivas

- **Decisão:** duas funções puras novas em `mutations.ts`, mesma forma imutável das cinco existentes.
  `setEdgeLabel` normaliza na origem (`trim`; vazio→`null`) para uma **única** representação canônica
  de "sem rótulo" (FR-004a/FR-004b). `setNodeShape` altera só `shape`, preservando `id`/`label` e
  **todas** as arestas (FR-005a).
- **Rationale:** verificou-se que o gerador de S0 **já** emite `|label|` (`generator/index.ts:62`,
  `edge.label ? … : ''`) e **já** resolve delimitadores por `SHAPE_DELIMITERS[node.shape]`
  (`wrapNodeLabel`, `generator/index.ts:13`). Portanto `generator/` e `mermaid-acl/` ficam
  **byte-idênticos**; escrever os campos é tudo o que falta. As ações plugam no `applyMutation` de S0
  (`editorStore.ts:62`), que já faz mutação pura → `generate` → reescrita da textarea sem reentrar no
  parse (FR-007). Como o gerador é determinístico e de ordem estável, `setNodeShape` toca **exatamente
  uma** linha (SC-005) por construção — nenhum diffing especial é necessário.
- **Alternativas rejeitadas:** (a) gravar `''` em vez de `null` para rótulo vazio — criaria duas
  representações de "sem rótulo" que geram texto idêntico mas modelos distintos, quebrando a igualdade
  de round-trip sem que uma linha de texto mude (Edge Case/FR-004a); (b) normalizar o texto na UI —
  introduziria uma segunda convenção de normalização (FR-004b proíbe).

## Decisão M-store — Seleção como estado só-de-UI, reconciliada por efeito derivado

- **Decisão:** `selection: { kind: 'node' | 'edge'; id } | null` no store, família de
  `connectMode`/`connectSourceId`. Ações `selectNode`/`selectEdge`/`clearSelection`. Um `useEffect`
  em `App.tsx`, keyed em `model`, descarta a seleção quando o `id` some do modelo (FR-002a).
  `toggleConnectMode` zera `selection` no mesmo `set` que já zera `connectSourceId` (FR-013).
- **Rationale:** verificou-se que S0/S1 **não têm** estado de seleção — o teclado do canvas é dirigido
  por foco de DOM (`CanvasPanel.tsx:117`, `target.closest('[data-id]')`) e o modo conectar por
  cliques. Verificou-se que as arestas **já são focáveis e respondem a `Delete`** no handler de S0.
  A reconciliação derivada é o **análogo, em estado de store, da Decisão K de S1** (o abort de rename
  por `useEffect` keyed no modelo, `CanvasPanel.tsx:26`), que S1 escolheu por "derivado do modelo" em
  vez de "comandado". Todos os caminhos de destruição (rename regenera id; `removeNode`/`removeEdge`;
  limpeza de S1; reinterpretação do texto — ACL emite `e0-a-b`, mutações emitem `e0`) passam por um
  `set({ model })`, de modo que um único reconciliador os cobre.
- **Alternativas rejeitadas:** (a) usar a seleção nativa do React Flow — acopla a foco/interação do
  engine, não sobrevive à reescrita do modelo e não persiste quando o foco entra no painel (FR-002d);
  (b) reconciliar dentro de cada caminho de escrita de modelo — **redefiniria** `applyParsedText`/
  `clearSession`, proibido por FR-010.

## Decisão O — Painel de propriedades: componente shadcn novo, `@radix-ui/react-select`

- **Decisão:** `PropertiesPanel.tsx` montado no `App`. Conexão → `<input>` de rótulo; nó → `Select`
  (Radix) com 14 formatos e nomes pt-BR, indicando o atual; sem seleção → neutro. Uma dependência
  nova: `@radix-ui/react-select` + `src/components/ui/select.tsx`.
- **Rationale:** o `<input>` de rótulo é um input **real** que retém foco porque **vive fora do
  wrapper de nó do React Flow** — exatamente a briga por foco que S0 documentou
  (`FlowNode.tsx:11-16`) e que FR-003 evita ao recusar o inline. Radix entrega teclado, `role`/nome
  acessíveis e valor atual determinável (FR-012) como comportamento nativo — como S1 fez com
  `AlertDialog` (Decisão I de S1), estende a camada shadcn do ADR-004 em vez de introduzir outra.
- **Consequência (FR-010a):** o `Select` adota `role` combobox/listbox → a asserção página-inteira de
  SC-011 em `starter.spec.ts` é **estreitada** para "sem escolha de template". Verificou-se que o gate
  `no-template-selector.test.ts` **não** é afetado (seus padrões exigem a palavra *template*
  adjacente).
- **Alternativas rejeitadas:** (a) edição inline no canvas — o rename de S0 provou que um `<input>`
  não retém foco dentro de um nó do React Flow (FR-003); (b) gerir teclado/foco do seletor à mão — é
  onde esse requisito apodrece (mesma razão de S1 para Radix); (c) expor no painel mais do que rótulo
  e formato — trocaria a fatia fina por um inspetor genérico (FR-003a).

## Decisão P — Desenho dos 14 formatos + caixa determinística sensível ao formato

- **Decisão:** `FlowNode` recebe `shape` no `data` e desenha os 14 formatos (clip-path/borda CSS para
  poligonais; border-radius para round/stadium/circle; SVG/CSS para cilindro/círculo duplo). Uma
  tabela pura `shapeSize(shape) → {width,height}` (`src/core/layout/shape-geometry.ts`, nova) dá caixa
  legível por formato, consumida por `layout/index.ts` (entrada do dagre) **e** por `CanvasPanel` (o
  `style`/tamanho do nó do React Flow); `FlowNode` preenche a caixa.
- **Rationale:** verificou-se que `layout/index.ts` dimensiona todo nó em 172×40 fixos
  (`NODE_WIDTH`/`NODE_HEIGHT`, linhas 9-10), independentemente do formato — e a razão 4,3:1 achata
  losango/círculo. FR-006a pré-autoriza dimensionamento sensível ao formato **desde que
  determinístico (NFR-04) e efêmero (RN-02)**. A dimensão entra no dagre e no render, **nunca** no
  modelo nem no `generate` — garantido pelo portão `no-coordinates` já existente, que permanece verde
  porque o gerador não é tocado. É o **ponto de atenção do Princípio V** desta fatia.
- **Alternativas rejeitadas:** (a) clipar os 14 na caixa fixa 172×40 — produz losangos/círculos
  achatados: "distintos" (SC-004) mas não **legíveis** (palavra de FR-006a); (b) deixar o usuário
  controlar o tamanho — violaria RN-04/ADR-003 (posição/dimensão são do auto-layout, nunca manuais).

## Decisão Q — Estabelecer, destacar e limpar a seleção sem redefinir S0

- **Decisão:** aditivo ao `CanvasPanel`: `onFocusCapture` (foco→seleciona, FR-002d), `onNodeClick`
  fora do modo conectar → `selectNode`, `onEdgeClick` → `selectEdge`, `onPaneClick` → `clearSelection`
  (FR-002b), e um ramo `Escape`→`clearSelection` **fora** do bloco de rename. Destaque próprio via
  `isSelected` no `data` do nó (`data-selected`) e classe/estilo na aresta selecionada — **distinto**
  do anel de foco de DOM e do de connect-source.
- **Rationale:** o bloco de rename de S0 (`CanvasPanel.tsx:88-114`) já consome `Escape` como
  cancelamento e **retorna antes**, de modo que o ramo novo só roda fora de rename (FR-002b/FR-010).
  As arestas já recebem foco de DOM em S0, então a seleção por teclado não parte do zero. Como a
  seleção é estado de store (Decisão M-store), ela **persiste** quando o foco entra no painel — nada
  no blur do canvas a limpa —, que é por que o destaque é distinto do foco (FR-002c/FR-002d).
- **Alternativas rejeitadas:** (a) reusar o anel de foco de DOM como destaque — acoplaria seleção a
  foco e não daria pista quando a seleção viesse de clique sem foco (FR-002c); (b) exigir Enter/Space
  para confirmar a seleção — introduziria binding em conflito com rename/conectar (FR-002d).

## Decisão R — Round-trip estendido aos 14 formatos e ao rótulo

- **Decisão:** um caso novo de round-trip constrói um modelo com os 14 formatos (via `setNodeShape`)
  e conexões rotuladas (via `setEdgeLabel`), roda `generate → importFlowchart` e afirma igualdade
  canônica insensível à ordem (14/14 + rótulo). A exceção de aspas (FR-015) é asserção **explícita**.
  Somam-se testes de determinismo (SC-007) e de invariância de seleção (SC-009).
- **Rationale:** verificou-se que `tests/roundtrip/flowchart.test.ts` já compara `shape` e `label` no
  snapshot canônico (`canonicalize`, linhas 12-22) mas exercita só `rect`/`diamond`. As Assumptions do
  spec registram que os 14 sobrevivem sem perda (14/14, ciclo real executado). Registrar a exceção de
  aspas explicitamente (em vez de omitir o caso) mantém a exceção **encontrável** — FR-015 exige.
- **Alternativas rejeitadas:** (a) omitir o caso de aspas — esconderia uma exceção conhecida a NFR-02
  (FR-015 proíbe); (b) consertar o defeito de aspas de passagem — mexeria na tabela de escape do
  gerador e mudaria a saída de **todo** diagrama, exatamente a reescrita que FR-010 recusa; pertence a
  uma fatia própria.
