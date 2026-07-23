---
description: "Task list — Elementos do grafo dirigido (R1)"
---

# Tasks: Elementos do grafo dirigido (R1)

**Input**: Design documents from `/specs/002-elementos-grafo-dirigido/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**RF cobertos:** RF-01, RF-02, RF-06

**Tests**: INCLUÍDOS. A spec pede teste explicitamente — as Success Criteria SC-001…SC-010 são
portões de CI (oráculo mermaid, latência, byte-idêntico, cascata) e o plano enumera Vitest+Playwright
como prova permanente. Segue a disciplina de TDD que o R0 já instalou (corpus, oráculo, fronteira).

**Organization**: Tarefas agrupadas por história de usuário (US1 P1, US2 P2, US3 P3), cada uma
entregável e testável de forma independente sobre a árvore herdada do R0.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivo diferente, sem dependência pendente)
- **[Story]**: US1 / US2 / US3 (Setup, Foundational e Polish não levam rótulo de história)
- Todo caminho de arquivo é relativo à raiz do repositório

## Path Conventions

- **Single project** (a mesma árvore do R0): `src/`, `tests/`, `corpus/` na raiz.
- O núcleo do codec cresce só na mecânica **agnóstica de família** (pilha de container); a gramática do
  grafo dirigido é isolada em `src/codec/flowchart/` (Princípio XII).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: infraestrutura de teste compartilhada por todas as histórias (corpus do oráculo + fixtures).
Nenhuma dependência de runtime nova (ADR-002/006: `@xyflow/react` e `mermaid` já presentes).

- [X] T001 [P] Estender o corpus do oráculo com documentos do grafo dirigido em `corpus/` (`corpus/1x-conexoes.mmd`, `corpus/1x-blocos.mmd`, `corpus/1x-aninhados.mmd`, `corpus/1x-aresta-no-bloco.mmd`, `corpus/1x-dupla-mencao.mmd`, `corpus/1x-bloco-vazio.mmd`), cobrindo as medições M1–M5 (data-model / research §0)
- [X] T002 [P] Estender as fixtures de texto hostil em `tests/fixtures/rotulos-hostis.ts` (texto de conexão + multi-linha + rótulo vazio) e indexar os novos `.mmd` em `tests/fixtures/corpus.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: o substrato comum às três famílias de objeto — tipos, helpers, contador e a superfície do
codec (Ctx + FamiliaCodec) + a mecânica agnóstica de pilha de container no núcleo. Sem isto nada compila.

**⚠️ CRITICAL**: nenhuma história pode começar até esta fase fechar.

- [X] T003 Estender o `Modelo` e o `Nó`, e adicionar os agregados `Conexao` e `Agrupamento` (com slots `conexoes[]`/`agrupamentos[]`) em `src/modelo/modelo.ts` — `Nó.rotulo: string|null` + alerta `expressividade`; `Conexao{id efêmero eN, origem, destino, texto, conectivo, alertas}`; `Agrupamento{id subN, titulo, membros[], alertas}` (data-model §Modelo/Nó/Conexão/Agrupamento)
- [X] T004 Adicionar os helpers de pertencimento/cascata `paiDe`, `membrosTransitivos`, `conexoesPresas`, `cascataEsvaziamento` (vínculo exclusivo, global) em `src/modelo/modelo.ts` (depende de T003, mesmo arquivo)
- [X] T005 [P] Generalizar o contador para **um por espécie** (`n`/`e`/`sub`), com `ocupados` cobrindo todos os ids do documento (nós + agrupamentos), em `src/modelo/contador.ts` (research §8; conexão não observa o código)
- [X] T006 [P] Estender o `Ctx` com a pilha de container (`containerStack`, `abrirContainer`, `fecharContainer`, `registrarMembro` com exclusivo-primeiro-vence) e o `FamiliaCodec` com `emitirConexao`/`emitirAgrupamentoAbre`/`emitirAgrupamentoFecha` em `src/codec/nucleo/reconhecedores.ts` (contracts/codec-grafo-dirigido.md)
- [X] T007 Ensinar ao núcleo a mecânica **agnóstica** de pilha de container (materializar com pilha ≠ ∅ → membro do topo; `subgraph` sem `end` mantém aberto até o fim, nunca devolve vazio) em `src/codec/nucleo/analisar.ts` — sem soletrar `subgraph`/`-->` (depende de T006)
- [X] T008 [P] Estender `serializar` (emitir conexões + blocos, doc inteiro só-teste) e `normalizar` (ordenar `conexoes` por (origem,destino,ordinal), `agrupamentos` por id, `membros` como conjunto) em `src/codec/nucleo/serializar.ts` (depende de T003/T006; research §1)
- [X] T009 [P] Confirmar que a transação carrega o modelo inteiro (nós + conexões + agrupamentos) e que a origem canvas|editor quebra o eco, em `src/modelo/transacao.ts` (ADR-009; quase inalterado)

**Checkpoint**: substrato pronto — o codec do grafo dirigido e as histórias podem começar.

---

## Phase 3: User Story 1 - Monto a estrutura do fluxo por gestos: nós, conexões e agrupamentos (Priority: P1) 🎯 MVP

**Goal**: criar **conexão** (nó→nó) e **agrupamento** (reunir nós) por gesto na área do diagrama, com a
linha correspondente nascendo no código como projeção do modelo, e a volta código→diagrama reconhecendo o
vocabulário do grafo dirigido. É o que faz do R0 um grafo dirigido de verdade.

**Independent Test**: com dois nós, puxar uma conexão e conferir a aresta no código; agrupar os dois e
conferir o bloco `subgraph … end` com os dois como menções — tudo sem gesto de sincronização.

### Tests for User Story 1 ⚠️ (escrever primeiro, ver falhar)

- [X] T010 [P] [US1] Teste de unidade do codec de conexão (reconhecedor + emissor; arestas paralelas e laço; conectivo preservado byte-fiel) em `tests/unit/conexao.test.ts`
- [X] T011 [P] [US1] Teste de unidade do codec de agrupamento (`subgraph` abre/fecha; membro por menção M1; aresta-no-bloco M2; aninhar por menção M3; dupla-menção primeiro-vence M4; bloco vazio M5) em `tests/unit/agrupamento.test.ts`
- [X] T012 [P] [US1] Teste de integração de round-trip/ponto-fixo + prefixos do grafo dirigido: **nunca devolve vazio**, e a **classificação erro-que-derruba × aviso** é asserida para o vocabulário novo — `subgraph` sem `end` e aresta incompleta **avisam** (não derrubam elemento já materializado), em duas listas separadas — em `tests/integration/round-trip-grafo.test.ts` (Princípio IX, FR-013, FR-019)
- [X] T013 [P] [US1] Teste de integração byte-idêntico da escrita cirúrgica (append de conexão, append de bloco + menções, **0 realocações**) em `tests/integration/byte-identico-grafo.test.ts` (SC-009)
- [X] T014 [P] [US1] Teste de unidade do reuso da projeção com **3 famílias** (identidade referencial de nó, aresta e agrupamento ao mudar 1 elemento) em `tests/unit/projetar-grafo.test.ts` (Princípio III)
- [X] T048 [P] [US1] Teste do **nascer-neutro**: conexão nasce sem texto, agrupamento nasce com título neutro, e nó/conexão/agrupamento não herdam nada de um elemento anterior; **nó criado dentro da moldura nasce solto** (pertencimento é do modelo, nunca derivado da geometria) em `tests/unit/nascer-neutro.test.ts` (FR-002, FR-003, Princípio XIV)
- [X] T015 [P] [US1] Teste e2e da US1 + oráculo `mermaid.parse()` sobre o corpus dirigido (**0 divergências de pertencimento**, inclusive M2/M4) em `tests/e2e/us1-grafo.spec.ts` (SC-001)

### Implementation for User Story 1

- [X] T016 [P] [US1] NOVO reconhecedor + emissor da aresta dirigida (garante pontas; lê família de conectivos `-->`/`==>`/`-.->`/…; preserva o lexema; ponta-no-bloco chama `registrarMembro`) em `src/codec/flowchart/conexao.ts`
- [X] T017 [P] [US1] NOVO reconhecedores de `subgraph …` (abre) e `end` (fecha) + emissor do bloco (menção isolada) em `src/codec/flowchart/agrupamento.ts`
- [X] T018 [US1] Registrar os reconhecedores na ordem (cabeçalho → abre-subgraph → end → conexão → nó) e ligar os emissores em `src/codec/flowchart/index.ts` (depende de T016, T017)
- [X] T019 [US1] Escrita cirúrgica ciente de bloco: **append** de conexão e de bloco `subgraph…end` + menções no fim; pareamento `subgraph`/`end` por profundidade em `src/codec/cirurgica.ts` (FR-014, FR-017)
- [X] T020 [US1] Projeção estendida a **arestas** e **nós-container** com reuso por família e ordenação pai-antes-de-filho (`parentId`/`extent`) em `src/projecao/projetar.ts` (contracts/projection.md)
- [X] T021 [US1] Ações do store `conectar` e `agrupar` (uma transação cada) + passagem de **reconciliação** que reassocia arestas relidas às conexões vivas por (origem, destino, ordinal) transferindo o id `eN`, em `src/modelo/store.ts` (research §4)
- [X] T022 [P] [US1] Adicionar handles de origem/destino conectáveis à caixa do nó (`nodesConnectable`) em `src/canvas/CaixaNo.tsx`
- [X] T023 [P] [US1] NOVO componente de aresta customizada (renderiza texto da conexão + marca; edição inline diferida à US2) em `src/canvas/Conexao.tsx`
- [X] T024 [P] [US1] NOVO componente de moldura (nó-container com título + marca) em `src/canvas/Agrupamento.tsx`
- [X] T025 [US1] Fiar no canvas: `onConnect` (soltar no vazio/sobre moldura → nada nasce), comando `agrupar`, alvo mais específico (membro > agrupamento) e registro dos node/edge types em `src/canvas/Canvas.tsx` (depende de T022, T023, T024; FR-001, FR-002, FR-008)

**Checkpoint**: monta-se a estrutura de um fluxo (nós + conexões + agrupamentos) só com gestos, com o
código do outro lado — MVP entregável mesmo rotulando/excluindo pelo código (como no R0).

---

## Phase 4: User Story 2 - Rotulo por gesto e colo texto de fora sem que ele mude (Priority: P2)

**Goal**: editar rótulo de nó e texto de conexão por gesto, colar texto puro de fora, e reaparecer **byte
a byte ou marcado** — nunca alterado em silêncio —, com a marca **durável** através da releitura do código.

**Independent Test**: rotular um nó digitando; colar texto de editor rico e conferir 0 vestígios de
formatação + byte-a-byte no código; colar texto hostil/multi-linha e conferir que volta idêntico ou
marcado; editar outra linha do código e conferir que o texto integral e a marca permanecem.

### Tests for User Story 2 ⚠️ (escrever primeiro, ver falhar)

- [X] T026 [P] [US2] Teste de unidade do checker de expressividade sobre **texto de conexão**, **rótulo vazio** (0 repovoados, 0 id como rótulo) e **multi-linha** em `tests/unit/rotulo-grafo.test.ts` (FR-006, FR-018)
- [X] T027 [P] [US2] Teste de integração da **marca durável**: editar outra linha e reler preserva texto integral + marca enquanto a forma degradada não muda em `tests/integration/marca-duravel.test.ts` (SC-002)
- [X] T028 [P] [US2] Teste e2e da US2 (colar texto puro SC-003; byte-a-byte ou marcado SC-002; rajada = 1 ato) em `tests/e2e/us2-grafo.spec.ts`

### Implementation for User Story 2

- [X] T029 [US2] Ação do store `editarTexto` (grava `rotulo`/`texto`, recomputa a marca, rajada **coalesce** em 1 entrada) + reconciliação da **marca durável** (preserva o texto integral por id enquanto a linha degradada é byte-idêntica) em `src/modelo/store.ts` (FR-004, FR-007, FR-006)
- [X] T030 [US2] Escrita cirúrgica que reescreve **só a linha** do elemento editado, agora também a linha de conexão (`origem -->|texto| destino`) em `src/codec/cirurgica.ts`
- [X] T031 [P] [US2] Editor de rótulo inline sobre o nó (abre por gesto, propaga ao vivo, cola `text/plain` sem formatação, fecha-e-descarta se o elemento some pelo código) em `src/canvas/CaixaNo.tsx`
- [X] T032 [P] [US2] Editor de texto inline sobre a conexão (mesma semântica) em `src/canvas/Conexao.tsx`
- [X] T033 [US2] Fiar no canvas o descritor `editarTexto` + a colagem via área de transferência (`text/plain`; aviso sem falha silenciosa quando o navegador nega) em `src/canvas/Canvas.tsx` (FR-005, SC-003)

**Checkpoint**: US1 **e** US2 funcionam de forma independente — o fluxo fica legível e traz texto de fora.

---

## Phase 5: User Story 3 - Corrijo o que errei: seleciono, movo, duplico e excluo (Priority: P3)

**Goal**: selecionar (clique + retângulo por contenção), mover, duplicar e excluir elementos e seleções
inteiras, mudar pertencimento (adicionar/retirar/desagrupar) — cada correção projetada no código **menos a
posição**, com o ato em bloco e a cascata de esvaziamento sendo **uma** entrada de histórico.

**Independent Test**: selecionar 3 elementos por retângulo, arrastar juntos e conferir código intocado;
duplicar dois nós ligados e conferir ids próprios + rótulos copiados + conexão nova; excluir um nó e
conferir que ele e as conexões presas saíram, e nada mais.

### Tests for User Story 3 ⚠️ (escrever primeiro, ver falhar)

- [X] T034 [P] [US3] Teste de unidade da seleção (contenção; conexão **derivada** pelas duas pontas; **normalização** por fecho transitivo + dedup — cada elemento 1×) em `tests/unit/selecao.test.ts` (FR-008, SC-006)
- [X] T035 [P] [US3] Teste de integração de **duplicar por fecho transitivo** (2 pontas → cópias; 0 pontas → paralela; 1 ponta → não renasce; membro herda agrupamento) e **excluir em cascata** (nó leva presas; agrupamento preserva membros; esvaziamento sobe em cascata) em `tests/integration/duplicar-excluir-grafo.test.ts` (FR-010, FR-011, SC-007, SC-008)
- [X] T036 [P] [US3] Teste de integração de **ato em bloco = 1 entrada** (mover/duplicar/excluir até 400 → 1; cascata em qualquer profundidade → 1; cada elemento 1×) em `tests/integration/ato-em-bloco.test.ts` (FR-012, SC-006, SC-008)
- [X] T037 [P] [US3] Teste e2e da US3 (seleção retângulo, mover byte-idêntico, duplicar, excluir, pertencimento, arrastar-p/-fora-não-desagrupa) em `tests/e2e/us3-grafo.spec.ts` (SC-004)

### Implementation for User Story 3

- [X] T038 [P] [US3] NOVO módulo de seleção de sessão: contenção (`SelectionMode.Full`), conexão derivada, `normalizar` (fecho transitivo de pertencimento + dedup) em `src/modelo/selecao.ts`
- [X] T039 [US3] Escrita cirúrgica: remover linhas exatas (nó + conexões presas), remover bloco + **cascata** de esvaziamento, inserir/remover só a **menção** do id no bloco em `src/codec/cirurgica.ts` (FR-011, FR-016, SC-009)
- [X] T040 [P] [US3] Estender o arranjo com posição/tamanho da **moldura** do agrupamento (derivados do arranjo dos membros; efêmeros) e o membro herda a âncora local em `src/modelo/arranjo.ts` (SC-004)
- [X] T041 [US3] Ações do store `moverSelecao`, `duplicarSelecao`, `excluirSelecao`, `mudarPertencimento` — cada uma **uma** transação sobre a seleção **normalizada** em `src/modelo/store.ts` (FR-009, FR-010, FR-011, FR-016, FR-012)
- [X] T042 [US3] Fiar no canvas: seleção retangular por contenção (`selectionOnDrag` + `SelectionMode.Full`), mover-seleção, e os comandos duplicar/excluir/adicionar/retirar/desagrupar em `src/canvas/Canvas.tsx` (research §7)

**Checkpoint**: as três histórias funcionam de forma independente — a sessão real (montar, rotular,
corrigir) acontece só com gestos.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: portões de arquitetura e de desempenho que valem para todo o repertório do R1.

- [X] T043 [P] Estender o teste de fronteira "núcleo sem nome de família" (`grep` de `subgraph`/`-->`/`flowchart` em `src/codec/nucleo/` reprova) em `tests/unit/nucleo-sem-familia.test.ts` (Princípio XII)
- [X] T044 [P] Estender o teste de fronteira de importação (nenhum módulo novo do caminho de edição importa `mermaid`; `oraculo.html` é a única exceção) em `tests/unit/fronteira-import.test.ts` (Princípio X)
- [X] T045 [P] Teste e2e de **latência no envelope cheio** (400 nós+grupos / 500 conexões): edição ≤100ms mediana, tecla ≤50ms, gesto contínuo ≥50fps em `tests/e2e/latencia-grafo.spec.ts` (SC-005, SC-010)
- [X] T046 Ligar o corpus dirigido + os hostis à mão na página-oráculo e no runner em `oraculo.html` / `tests/e2e/oraculo.spec.ts` (SC-001; garante que M2/M4/M5 entram no portão de CI)
- [X] T049 [P] Teste de latência e reversibilidade do **ato em bloco** no envelope cheio (mover/duplicar/excluir seleção de 400): assere (a) **p95 ≤110ms** em ≥100 repetições do commit da transação; (b) **reverter a transação** restaura estado **estruturalmente idêntico** ao anterior (igualdade estrutural do modelo, sem depender do gesto visível de desfazer) em `tests/e2e/ato-em-bloco-latencia.spec.ts` (Princípio IV / NFR-04; complementa SC-006/SC-008)
- [X] T050 [P] Teste de **invariância de posição por operação** (Princípio VII): para conectar, agrupar, mover-seleção, duplicar, excluir e adicionar/retirar membro, a posição (arranjo) de **todos** os elementos preexistentes é idêntica antes/depois — o elemento novo nasce por colocação local determinística **sem deslocar ninguém** — em `tests/integration/posicao-invariante.test.ts` (VII, FR-010)
- [X] T047 Rodar a validação de ponta a ponta do `quickstart.md` (Cenários 1–3 + hostis) e conferir os portões de arquitetura da tabela final

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa já.
- **Foundational (Phase 2)**: depende do Setup — **BLOQUEIA** todas as histórias.
- **US1 (Phase 3)**: depende do Foundational. É o MVP e a base estrutural das outras.
- **US2 (Phase 4)**: depende do Foundational; na prática pressupõe a estrutura da US1 (há nós/conexões
  para rotular), mas é testável sozinha sobre um nó.
- **US3 (Phase 5)**: depende do Foundational; pressupõe estrutura (US1/US2), mas cada gesto é testável
  sozinho.
- **Polish (Phase 6)**: depende das histórias desejadas concluídas.

### User Story Dependencies

- **US1 (P1)**: começa após o Foundational — sem dependência de outra história.
- **US2 (P2)**: começa após o Foundational — integra com a estrutura da US1, testável de forma isolada.
- **US3 (P3)**: começa após o Foundational — integra com US1/US2, testável de forma isolada.

### Within Each User Story

- Os testes vêm primeiro e devem **falhar** antes da implementação.
- Codec de família (conexao/agrupamento) → registro no `index` → cirúrgica → projeção → store → canvas.
- Modelos/tipos antes dos serviços (store); serviços antes do canvas.

### Arquivos com contenção (não paralelizar entre si)

- `src/modelo/modelo.ts`: T003 → T004 (sequencial).
- `src/modelo/store.ts`: T021 (US1) → T029 (US2) → T041 (US3) (sequencial, ordem de história).
- `src/codec/cirurgica.ts`: T019 (US1) → T030 (US2) → T039 (US3) (sequencial).
- `src/canvas/Canvas.tsx`: T025 (US1) → T033 (US2) → T042 (US3) (sequencial).
- `src/canvas/CaixaNo.tsx`: T022 (US1) → T031 (US2). `src/canvas/Conexao.tsx`: T023 (US1) → T032 (US2).

---

## Parallel Opportunities

### Foundational (após T003/T004)

```bash
# Substrato em arquivos distintos, em paralelo:
Task T005: "Contador por espécie em src/modelo/contador.ts"
Task T006: "Ctx + FamiliaCodec em src/codec/nucleo/reconhecedores.ts"
Task T008: "serializar + normalizar em src/codec/nucleo/serializar.ts"   # após T006
Task T009: "transação carrega modelo inteiro em src/modelo/transacao.ts"
```

### User Story 1

```bash
# Todos os testes da US1 juntos (arquivos distintos):
Task T010: "unit conexao em tests/unit/conexao.test.ts"
Task T011: "unit agrupamento em tests/unit/agrupamento.test.ts"
Task T012: "integration round-trip em tests/integration/round-trip-grafo.test.ts"
Task T013: "integration byte-idêntico em tests/integration/byte-identico-grafo.test.ts"
Task T014: "unit projeção-reuso em tests/unit/projetar-grafo.test.ts"
Task T015: "e2e us1 + oráculo em tests/e2e/us1-grafo.spec.ts"

# Codec de família + componentes de canvas em paralelo:
Task T016: "conexao.ts"   Task T017: "agrupamento.ts"
Task T022: "handles em CaixaNo.tsx"   Task T023: "Conexao.tsx"   Task T024: "Agrupamento.tsx"
```

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Setup (Phase 1) → 2. Foundational (Phase 2, **bloqueia tudo**) → 3. US1 (Phase 3).
4. **PARAR e VALIDAR**: montar conexão e agrupamento por gesto, conferir o código; oráculo SC-001 verde.
5. É o ponto de troca de ferramenta: já se monta a estrutura de um fluxo só com gestos.

### Incremental Delivery

1. Setup + Foundational → substrato pronto.
2. US1 → testar isolada → MVP (montar estrutura por gesto).
3. US2 → testar isolada → rotular + colar texto de fora.
4. US3 → testar isolada → selecionar/mover/duplicar/excluir/pertencimento.
5. Polish → portões de arquitetura + latência/fps no envelope + quickstart.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- O rótulo [Story] mapeia a tarefa à história para rastreabilidade.
- Verificar que os testes falham antes de implementar (o R0 já roda TDD).
- Ritual de fim de spec (CLAUDE.md): ao terminar, rodar `/zion-prd-trace`.
- Evitar: tarefas vagas, conflito no mesmo arquivo, dependência entre histórias que quebre a
  independência.
