# Contrato — Mutações do Modelo (`src/core/model/`)

Funções **puras e imutáveis** que realizam as cinco ações centrais do canvas (FR-003). São a única forma de
mutar o `GraphModel`; a UI do canvas as chama, a textarea nunca (a textarea usa a ACL de import).

## Interface

```ts
export function addNode(m: GraphModel, label: string): GraphModel;
export function renameNode(m: GraphModel, id: string, newLabel: string): GraphModel;
export function connect(m: GraphModel, sourceId: string, targetId: string): GraphModel;
export function removeNode(m: GraphModel, id: string): GraphModel;
export function removeEdge(m: GraphModel, edgeId: string): GraphModel;
```

## Garantias (verificáveis — `tests/unit/`)

- **G1 — Pureza:** não muta a entrada; retorna novo `GraphModel`. Sem efeitos colaterais (base do determinismo).
- **G2 — Slug/unicidade (FR-003):** `addNode`/`renameNode` derivam `id` do rótulo por transliteração para conjunto
  seguro + sufixo determinístico (`slug`,`slug-2`,…); nunca fundem nós; rótulos iguais → IDs distintos.
- **G3 — Rename propaga (FR-003/FR-007):** `renameNode` reescreve o `id` em **todas as arestas** e nos `refIds`
  dos `StyleBlock`s (id antigo→novo); nenhuma referência pendente.
- **G4 — Remove limpa (FR-003/FR-007):** `removeNode` remove arestas incidentes e descarta refs de estilo
  exclusivas ao nó; `removeEdge` descarta refs (`linkStyle`) exclusivas à aresta. Sem refs pendentes.
- **G5 — Nível raiz (FR-007):** `addNode`/`connect` operam na raiz; não inserem em subgraphs importados.
- **G6 — Padrões do canvas (FR-003):** nós → `shape:'rect'`; arestas → `connector:'-->'`, `label:null`.
- **G7 — Ordem canônica estável:** preserva a ordem de inserção dos elementos não afetados (alimenta G1 do gerador).
