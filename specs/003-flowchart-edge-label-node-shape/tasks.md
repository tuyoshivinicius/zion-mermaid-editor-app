# Tasks: Fatia S2 — Rótulo de Conexão e Formato de Nó no Flowchart

**Input**: Design documents from `/specs/003-flowchart-edge-label-node-shape/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (selection, mutations-label-shape, properties-panel, shape-rendering)

**Tests**: INCLUÍDOS. O plano (seção Testing e Project Structure) enumera arquivos de teste
específicos como portões da fatia (Vitest + React Testing Library + Playwright), e SC-006/SC-007/
SC-009 são portões automatizados. Os testes são escritos **antes** da implementação em cada fase.

**Organization**: agrupado por user story (US1 P1 → US2 P2 → US3 P3) para implementação e teste
independentes. A fatia é **estritamente aditiva** (Decisão M): as 5 mutações de S0, o gerador e a ACL
permanecem **byte-idênticos**; o diff sob `src/` MUST ficar contido nos arquivos abaixo + os novos de
S2 (portão de merge de FR-010).

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]**: paralelizável (arquivo diferente, sem dependência de tarefa incompleta)
- **[Story]**: US1 / US2 / US3 — só nas fases de user story

## Path Conventions

Single-project SPA (Vite, ADR-004): `src/` e `tests/` na raiz. **`+`** = arquivo novo de S2;
**`~`** = arquivo de S0/S1 com mudança **aditiva** (Decisão M).

**Arquivos compartilhados (hotspots — tarefas que os tocam MUST ser sequenciadas, nunca `[P]` entre
si):** `src/state/editorStore.ts`, `src/App.tsx`, `src/components/CanvasPanel.tsx`,
`src/components/FlowNode.tsx`, `src/components/PropertiesPanel.tsx`, `src/core/model/mutations.ts`, e
os testes `tests/unit/properties-panel.test.tsx`, `tests/unit/mutations-label-shape.test.ts`,
`tests/roundtrip/shapes-labels.test.ts`, `tests/unit/shape-generation.test.ts`,
`tests/e2e/node-shape.spec.ts`, `tests/e2e/starter.spec.ts`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependência nova e strings, ambas aditivas.

- [ ] T001 Adicionar `@radix-ui/react-select` como dependência em `package.json` e rodar `npm install` (Decisão O); nenhum script de teste é removido
- [ ] T002 [P] Adicionar as strings pt-BR de S2 em `src/strings.ts` — os **14** nomes acessíveis de formato (FR-012) e as strings do painel (rótulo, estado neutro); nenhuma string existente muda

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: substrato de **seleção** + esqueleto do **painel de propriedades**, compartilhado por
US1 e US3. É o pré-requisito bloqueante das duas histórias de edição.

**⚠️ CRITICAL**: US1 e US3 não podem começar antes desta fase. **US2 (renderização) NÃO depende deste
substrato** e pode ser feita em paralelo — porém compartilha `CanvasPanel.tsx`/`FlowNode.tsx` com
T007/T008, de modo que as edições nesses arquivos MUST ser sequenciadas para evitar conflito.

### Tests (escrever antes da implementação)

- [ ] T003 [P] Escrever `tests/unit/selection.test.ts` — reconciliação da seleção quando o `id` some do modelo (FR-002a/SE5), `toggleConnectMode` zera `selection` (FR-013), e invariância: seleções diferentes ⇒ texto byte-idêntico (SC-009/SE6)
- [ ] T004 [P] Escrever `tests/unit/properties-panel.test.tsx` — sem seleção ⇒ estado **neutro**, e o painel **não** é superfície de escolha de template (PP1/FR-003/SC-013)

### Implementation

- [ ] T005 Adicionar estado e ações de seleção em `src/state/editorStore.ts`: `selection: {kind,id}|null` (inicial `null`), `selectNode`/`selectEdge`/`clearSelection`; `toggleConnectMode` passa a zerar `selection` no mesmo `set` que já zera `connectSourceId` (SE1/FR-013, Decisão M-store) — as ações e mutações existentes ficam intactas
- [ ] T006 Adicionar o `useEffect` reconciliador em `src/App.tsx`, keyed em `model`, que chama `clearSelection` quando o elemento selecionado deixa de existir (SE5/FR-002a) — depende de T005
- [ ] T007 Adicionar estabelecimento/limpeza de seleção em `src/components/CanvasPanel.tsx`: `onFocusCapture` lê `[data-id]` e seleciona (FR-002d), `onNodeClick` fora do modo conectar → `selectNode`, `onEdgeClick` → `selectEdge`, `onPaneClick` → `clearSelection`, e ramo `Escape`→`clearSelection` **fora** do bloco de rename (SE2/SE4, Decisão Q) — o modo conectar (FR-013), o rename e o `Delete` de S0 ficam intactos; depende de T005
- [ ] T008 Adicionar o **destaque** de seleção em `src/components/FlowNode.tsx` (`isSelected` no `data` → `data-selected` + estilo próprio) e o estilo da **aresta** selecionada no mapeamento `model.edges → RFEdge` em `src/components/CanvasPanel.tsx`, **distinto** do anel de foco de DOM e do de connect-source (FR-002c/SE6) — depende de T005
- [ ] T009 Criar `src/components/PropertiesPanel.tsx` (esqueleto, estado neutro) e montá-lo em `src/App.tsx` ao lado das superfícies existentes (PP1, Decisão O) — depende de T005; toca `App.tsx` (sequenciar após T006)

**Checkpoint**: seleção estabelecível/desfazível/reconciliada e painel neutro montado — US1 e US3 podem começar.

---

## Phase 3: User Story 1 - Escrever o texto de uma conexão pelo canvas (Priority: P1) 🎯 MVP

**Goal**: selecionar uma conexão e criar/editar/remover seu rótulo pelo canvas; a linha da aresta é
reescrita no mesmo instante (≤ 150 ms) e o round-trip preserva o rótulo.

**Independent Test**: selecionar `Início` → `Revisar` (sem rótulo), escrever um texto, confirmar que o
canvas o exibe sobre a conexão e o código traz `-->|texto|`; apagar e confirmar retorno à conexão sem
rótulo. Nenhum formato de nó é exercitado.

### Tests (escrever antes da implementação)

- [ ] T010 [P] [US1] Escrever `tests/unit/mutations-label-shape.test.ts` — `setEdgeLabel`: `trim()`, vazio/só-espaços → `null` (FR-004a/004b), só a aresta alvo muda, `edgeId` inexistente = no-op, pureza (MU1/MU2)
- [ ] T011 [P] [US1] Estender `tests/unit/properties-panel.test.tsx` — conexão selecionada expõe o rótulo **atual** (campo vazio se não há), editar/apagar reescreve a linha; normalização mora na mutação (PP3/FR-004)
- [ ] T012 [P] [US1] Escrever `tests/roundtrip/shapes-labels.test.ts` — round-trip do **rótulo de conexão** (`generate → importFlowchart`) preserva o texto (SC-006, parte de rótulo)
- [ ] T013 [P] [US1] Escrever `tests/unit/shape-generation.test.ts` — `setEdgeLabel` gera texto **byte-idêntico** em repetições (SC-007, parte de rótulo)
- [ ] T014 [US1] Escrever `tests/e2e/edge-label.spec.ts` — US1 **keyboard-only**: criar/editar/apagar rótulo, exatamente a linha da aresta muda, sem escrever Mermaid (SC-001/002/003/005/011)

### Implementation

- [ ] T015 [US1] Adicionar `setEdgeLabel(model, edgeId, label)` puro em `src/core/model/mutations.ts` — `trim`, vazio→`null` (representação canônica única de "sem rótulo"), só a aresta alvo muda (Decisão N/MU2); as 5 mutações existentes ficam byte-idênticas
- [ ] T016 [US1] Adicionar a ação de store `setEdgeLabel(edgeId, label)` em `src/state/editorStore.ts` via `applyMutation` (laço mutação→`generate`→reescrita, sem reentrar no parse — FR-007) — depende de T015
- [ ] T017 [US1] Adicionar o ramo de **input de rótulo** em `src/components/PropertiesPanel.tsx` (conexão selecionada): `labelDraft` local ressemeado do modelo quando a seleção muda, chama `store.setEdgeLabel` a cada mudança (PP3) — depende de T009, T016

**Checkpoint**: US1 completa e testável isoladamente — MVP entregável.

---

## Phase 4: User Story 2 - Ver no canvas o formato que o código já carrega (Priority: P2)

**Goal**: o canvas desenha cada um dos 14 formatos (não mais tudo como retângulo); a paridade
canvas ↔ código passa a incluir formato. Pré-requisito visual de US3.

**Independent Test**: abrir a ferramenta e confirmar que `Aprovado?` do starter é desenhado como
**losango**; colar, pelo painel de código, um Flowchart com os 14 formatos e confirmar 14 desenhos
visualmente distintos. Nenhuma superfície de escolha é exercitada.

**Nota de acoplamento**: não depende do substrato de seleção (Fase 2), mas toca `CanvasPanel.tsx` e
`FlowNode.tsx` (compartilhados com T007/T008) — sequenciar as edições desses arquivos.

### Tests (escrever antes da implementação)

- [ ] T018 [P] [US2] Escrever `tests/unit/shape-geometry.test.ts` — `shapeSize(shape)` é **pura e determinística**, `rect` = 172×40, formatos com razão (diamond/circle/…) recebem dimensão maior determinística, shape desconhecido cai no default (SH3)
- [ ] T019 [US2] Escrever `tests/e2e/node-shape.spec.ts` (parte US2) — `Aprovado?` do starter é losango; colar os 14 formatos ⇒ 14 desenhos visualmente distintos, aferido pelo proxy estrutural de SH1 (14 valores de `data-shape` dois-a-dois distintos + geometria computada difere entre famílias) (SC-004/SC-012)
- [ ] T020 [US2] Emendar `tests/e2e/starter.spec.ts` (emenda autorizada #1, FR-010a) — reapontar/renomear o caso "the decision node… rendered identically" para afirmar que o nó de decisão é desenhado como **losango** e distinguível dos retângulos (SC-012)

### Implementation

- [ ] T021 [P] [US2] Criar `src/core/layout/shape-geometry.ts` — tabela pura/determinística `shapeSize(shape) → {width,height}`, `rect` preserva 172×40 (Decisão P/SH3); **MUST NOT** ser importada por `generator/` nem `mermaid-acl/`
- [ ] T022 [US2] Consumir `shapeSize` em `src/core/layout/index.ts` para a largura/altura do `graph.setNode` (dagre); a assinatura `layout(model)` **não muda** e as posições seguem efêmeras (SH3/SH5) — depende de T021
- [ ] T023 [US2] Em `src/components/CanvasPanel.tsx`: passar `shape` no `data` do nó e fixar o tamanho do nó React Flow (`style`) com o **mesmo** `shapeSize` (SH3) — depende de T021; sequenciar após T007/T008
- [ ] T024 [US2] Em `src/components/FlowNode.tsx`: desenhar os 14 formatos preenchendo a caixa (`w-full h-full`) — clip-path/borda para poligonais, border-radius para round/stadium/circle, SVG/CSS para cilindro/círculo duplo — visualmente distintos; emitir o atributo `data-shape={shape}` no elemento raiz do nó (proxy de distinção testável de SH1); formato fora dos 14 já vem normalizado para retângulo por S0 (SH1/SH2) — depende de T021; sequenciar após T008

**Checkpoint**: US1 e US2 funcionam independentemente; o canvas desenha os 14 formatos.

---

## Phase 5: User Story 3 - Escolher o formato de um nó pelo canvas (Priority: P3)

**Goal**: selecionar um nó e escolher entre os 14 formatos pelo painel; o canvas redesenha e **exatamente
uma** linha do código muda (id/label e arestas intactos). Apoia-se em US2 (desenho).

**Independent Test**: selecionar `Início` (retângulo), escolher `losango`, confirmar redesenho e
`inicio[Início]` → `inicio{Início}`; repetir para os 14 e confirmar delimitadores corretos, sem
reescrever nenhuma aresta.

**Depends on**: US2 (sem o desenho, escolher formato só mudaria o painel de código — o estado de hoje).

### Tests (escrever antes da implementação)

- [ ] T025 [P] [US3] Estender `tests/unit/mutations-label-shape.test.ts` — `setNodeShape`: altera só `shape`, `id`/`label` e **todas** as arestas intactos, `nodeId` inexistente = no-op, consequência = exatamente 1 linha muda (MU3/SC-005)
- [ ] T026 [P] [US3] Estender `tests/roundtrip/shapes-labels.test.ts` — modelo com os **14** formatos (via `setNodeShape`) + conexões rotuladas: `generate → importFlowchart` com igualdade canônica insensível à ordem (14/14), e a exceção de aspas (FR-015) como asserção **explícita e nomeada** — não consertada (SC-006/Decisão R)
- [ ] T027 [P] [US3] Estender `tests/unit/shape-generation.test.ts` — `setNodeShape` gera texto **byte-idêntico** em repetições (SC-007)
- [ ] T028 [P] [US3] Estender `tests/unit/properties-panel.test.tsx` — nó selecionado expõe os **14** formatos, indica o **atual**, cada formato tem **nome acessível pt-BR**, formato atual programaticamente determinável (PP4/PP5/FR-012)
- [ ] T029 [US3] Estender `tests/e2e/node-shape.spec.ts` (parte US3) — escolher cada um dos 14 ⇒ delimitadores corretos (validade sintática do Flowchart gerado como proxy de SC-008), o `data-shape` do nó passa a refletir o formato escolhido (proxy de SH1), exatamente 1 linha muda, fluxo **keyboard-only** (SC-004/005/008/011)
- [ ] T030 [US3] Emendar `tests/e2e/starter.spec.ts` (emenda autorizada #2, FR-010a) — **estreitar** a asserção de SC-011 de "página inteira sem `role` combobox/listbox/menu" para "sem escolha de **template**"; a verificação do conjunto exato de controles da **toolbar** permanece (o seletor vive no painel)

### Implementation

- [ ] T031 [P] [US3] Adicionar o primitivo shadcn/ui `src/components/ui/select.tsx` (Radix Select) (Decisão O)
- [ ] T032 [US3] Adicionar `setNodeShape(model, nodeId, shape)` puro em `src/core/model/mutations.ts` — grava só `node.shape`, preserva `id`/`label` e todas as arestas (Decisão N/MU3) — sequenciar após T015 (mesmo arquivo)
- [ ] T033 [US3] Adicionar a ação de store `setNodeShape(nodeId, shape)` em `src/state/editorStore.ts` via `applyMutation` (FR-007) — depende de T032; sequenciar após T016 (mesmo arquivo)
- [ ] T034 [US3] Adicionar o ramo de **seletor de formato** em `src/components/PropertiesPanel.tsx` (nó selecionado): `Select` com os 14 valores e nomes pt-BR, indicando o atual, chama `store.setNodeShape` (PP4/PP5) — depende de T002, T031, T033; sequenciar após T017 (mesmo arquivo)
- [ ] T035 [US3] Em `src/components/FlowNode.tsx`: expor o **nome acessível pt-BR** do formato do nó (FR-012) — depende de T002; sequenciar após T024 (mesmo arquivo)

**Checkpoint**: as três histórias funcionam independentemente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: confirmar os portões herdados verdes **por construção** e validar o quickstart.

- [ ] T036 [P] Confirmar verdes **sem edição** os portões de contrato: `tests/contract/no-coordinates.test.ts` (nenhuma dimensão sensível ao formato alcança o texto — portão-chave, SH4/Princípio V), `acl-isolation.test.ts` (VI), `no-image-export.test.ts` (VII), `no-nextjs.test.ts` (ADR-004), `no-template-selector.test.ts` (não afetado — padrões exigem a palavra *template*)
- [ ] T037 [P] Confirmar verdes **sem edição** as regressões: `tests/unit/mutations.test.ts` (5 mutações byte-idênticas — MU5), `tests/roundtrip/flowchart.test.ts`, `tests/perf/*` (teto de boot de 1 s de S1 e p95 ≤ 150 ms de S0)
- [ ] T038 Passo **keyboard-only** de ponta a ponta cobrindo US1 + US3 (selecionar por Tab/setas, editar no painel, seleção persiste ao entrar no painel — SC-011/SC-015)
- [ ] T039 Rodar a validação do `quickstart.md`: `npm run test`, `npm run test:e2e`, `npm run test:e2e:perf`, `npm run lint` — todos verdes; confirmar que o diff sob `src/` está contido nos arquivos enumerados (portão de merge de FR-010)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Fase 1)**: sem dependências.
- **Foundational (Fase 2)**: depende do Setup. **Bloqueia US1 e US3**. Não bloqueia US2.
- **US1 (Fase 3)**: depende da Fase 2. É o MVP.
- **US2 (Fase 4)**: depende só do Setup (não do substrato de seleção); compartilha `CanvasPanel.tsx`/`FlowNode.tsx` com T007/T008 → sequenciar edições nesses arquivos.
- **US3 (Fase 5)**: depende da Fase 2 **e** de US2 (o desenho torna a escolha significativa).
- **Polish (Fase 6)**: depende das histórias desejadas concluídas.

### Ordem crítica dentro das histórias

- Testes antes da implementação (escrever, ver falhar, então implementar).
- Mutação pura → ação de store → controle de UI (T015→T016→T017; T032→T033→T034).
- Hotspots sequenciados: `mutations.ts` (T015→T032), `editorStore.ts` (T005→T016→T033), `App.tsx` (T006→T009), `CanvasPanel.tsx` (T007→T008→T023), `FlowNode.tsx` (T008→T024→T035), `PropertiesPanel.tsx` (T009→T017→T034).

### Parallel Opportunities

- Setup: T002 `[P]`.
- Fase 2 testes: T003, T004 `[P]` juntos.
- US1 testes: T010, T011, T012, T013 `[P]` juntos (arquivos distintos); T014 (e2e) depois.
- US2: T018 e T021 `[P]`.
- US3 testes: T025, T026, T027, T028 `[P]` juntos; T031 `[P]` com eles.
- Polish: T036, T037 `[P]`.

---

## Parallel Example: User Story 1 (testes primeiro)

```bash
# Escrever os testes de unidade/round-trip de US1 em paralelo (arquivos distintos):
Task: "tests/unit/mutations-label-shape.test.ts — setEdgeLabel (MU2)"
Task: "estender tests/unit/properties-panel.test.tsx — rótulo (PP3)"
Task: "tests/roundtrip/shapes-labels.test.ts — round-trip do rótulo (SC-006)"
Task: "tests/unit/shape-generation.test.ts — determinismo de setEdgeLabel (SC-007)"
# Depois, implementação em cadeia:
#   setEdgeLabel (mutations.ts) → ação de store → input do painel
```

---

## Implementation Strategy

### MVP First (US1)

1. Fase 1 (Setup) → 2. Fase 2 (Foundational — seleção + painel neutro) → 3. Fase 3 (US1).
4. **PARAR e VALIDAR** US1 isoladamente (rotular/editar/apagar por teclado, round-trip do rótulo).
5. Entregar/demonstrar (MVP).

### Incremental Delivery

1. Setup + Foundational → base pronta.
2. US1 → testar → demo (MVP: rótulo de conexão).
3. US2 → testar → demo (canvas desenha os 14 formatos; starter vira losango).
4. US3 → testar → demo (escolha de formato pelo painel).
5. Cada história agrega valor sem quebrar a anterior; os portões II/IV/VI seguem verdes por construção (gerador/ACL byte-idênticos).

---

## Notes

- `[P]` = arquivos distintos, sem dependência incompleta. Hotspots nunca são `[P]` entre si.
- Diff sob `src/` MUST ficar contido nos arquivos marcados `+`/`~` no plano + os novos de S2; qualquer outro arquivo de S0/S1 tocado é violação de FR-010 e bloqueia o merge.
- Um **terceiro** teste de S0/S1 que quebre (além das duas emendas T020/T030) é sinal de premissa falha ⇒ decisão explícita, nunca emenda até o verde (FR-010a).
- Nenhuma dimensão da caixa sensível ao formato pode alcançar o texto (T036/`no-coordinates` é a garantia executável).
- Commit após cada tarefa ou grupo lógico.
