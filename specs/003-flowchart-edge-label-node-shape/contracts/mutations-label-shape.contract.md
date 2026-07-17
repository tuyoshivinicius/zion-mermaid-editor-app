# Contract: Mutações novas `setEdgeLabel` / `setNodeShape` (aditivas, puras)

Módulo: `src/core/model/mutations.ts` (aditivo). Consumidas pelo store via `applyMutation` (Decisão B
de S0). As **cinco** mutações existentes (`addNode`, `renameNode`, `connect`, `removeNode`,
`removeEdge`) ficam **byte-idênticas**.

## MU1 — Assinaturas e pureza
- `setEdgeLabel(model, edgeId, label) → GraphModel` e `setNodeShape(model, nodeId, shape) → GraphModel`
  são **puras** (sem `Date`/`Math.random`/mutação in-place); retornam um novo `GraphModel`.

## MU2 — `setEdgeLabel`: representação canônica única de "sem rótulo" (FR-004a/FR-004b)
- `label.trim() === ''` ⇒ grava `label: null` (não `''`). Rótulo só com espaços ⇒ `null`.
- `label` não-vazio ⇒ grava `label.trim()` (pontas removidas; espaços internos preservados).
- Só a aresta `edgeId` muda; demais arestas, nós, subgraphs, styles e `direction` intactos.
- edgeId inexistente ⇒ modelo inalterado (sem lançar).

## MU3 — `setNodeShape`: altera só o formato (FR-005a)
- Grava `node.shape = shape` no nó `nodeId`; **`id` e `label` inalterados**.
- **Nenhuma aresta** é reescrita; subgraphs/styles/direction intactos.
- Consequência observável (via gerador determinístico): **exatamente uma** linha do texto muda (SC-005).
- nodeId inexistente ⇒ modelo inalterado.

## MU4 — Compatibilidade com o gerador entregido (sem mudança no gerador)
- Para os 14 formatos de `SHAPE_DELIMITERS`, `generate(setNodeShape(m, id, shape))` emite o nó com os
  delimitadores daquele formato (o gerador já resolve `SHAPE_DELIMITERS[node.shape]`).
- `generate(setEdgeLabel(m, id, txt))` com `txt` não-vazio emite `... |txt| ...`; com ausência emite
  a aresta **sem** `|...|`.

## MU5 — As cinco mutações existentes não mudam
- Teste de regressão: snapshots de `addNode`/`renameNode`/`connect`/`removeNode`/`removeEdge` idênticos
  aos de S0 (`tests/unit/mutations.test.ts` permanece verde sem edição).
