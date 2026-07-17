# Phase 1 — Data Model: Fatia S2

S2 **não altera o schema do modelo de grafo**: `Edge.label` (`string | null`) e `Node.shape`
(`'rect' | (string & {})`) já existem em `src/core/model/types.ts` desde S0. S2 acrescenta o
**caminho de escrita** desses dois campos (mutações novas), um **estado só-de-UI** (seleção) fora do
modelo, e uma **tabela de dimensão efêmera** por formato fora do modelo. Nenhum campo novo entra no
`GraphModel` — logo nenhuma dimensão nova pode entrar no texto.

---

## 1. Campos já existentes exercitados (sem mudança de tipo)

| Campo | Tipo (S0) | Papel em S2 |
|-------|-----------|-------------|
| `Edge.label` | `string \| null \| undefined` | Alvo de escrita de `setEdgeLabel`. Canônico de "sem rótulo" = **`null`** (FR-004a) |
| `Node.shape` | `'rect' \| (string & {})` | Alvo de escrita de `setNodeShape`. Valores válidos = as **14** chaves de `SHAPE_DELIMITERS` |

**Os 14 formatos** (chaves de `SHAPE_DELIMITERS`, `src/core/model/shapes.ts` — compartilhadas por
gerador e ACL): `rect`, `round`, `stadium`, `subroutine`, `cylinder`, `circle`, `doublecircle`,
`diamond`, `hexagon`, `odd`, `trapezoid`, `inv_trapezoid`, `lean_right`, `lean_left`.

**Representação canônica de ausência de rótulo (FR-004a):** `null`. `setEdgeLabel` MUST gravar `null`
para entrada vazia ou só-espaços; o modelo MUST NOT conter `''` como rótulo. O gerador já trata
`null`/`undefined`/`''` como ausentes na emissão, mas só `null` é canônico no **modelo** — é isso que
mantém a igualdade de round-trip verdadeira.

## 2. Mutações novas (aditivas) — `src/core/model/mutations.ts`

Puras, imutáveis, mesma forma das cinco existentes. **As cinco existentes ficam byte-idênticas.**

```text
setEdgeLabel(model: GraphModel, edgeId: string, label: string): GraphModel
  regra:  trimmed = label.trim()
          next = trimmed === '' ? null : trimmed          # FR-004a/FR-004b
          mapeia edges: e.id === edgeId ? { ...e, label: next } : e
  invariante: só a aresta alvo muda; nós, subgraphs, styles, direction intactos

setNodeShape(model: GraphModel, nodeId: string, shape: string): GraphModel
  regra:  mapeia nodes: n.id === nodeId ? { ...n, shape } : n   # FR-005a
  invariante: id e label do nó intactos; NENHUMA aresta reescrita; consequência
              observável = exatamente 1 linha do texto muda (SC-005)
```

**Contratos de teste:** ver `contracts/mutations-label-shape.contract.md` (MU1–MU5).

## 3. Estado só-de-UI — `src/state/editorStore.ts`

Fora do `GraphModel`; **nunca** serializado (RN-02/FR-002/SC-009). Família de
`connectMode`/`connectSourceId`.

```text
Selection = { kind: 'node' | 'edge'; id: string } | null

editorStore (aditivo):
  selection: Selection                       # inicial: null
  selectNode(id): set selection = { kind:'node', id }
  selectEdge(id): set selection = { kind:'edge', id }
  clearSelection(): set selection = null
  setEdgeLabel(edgeId, label): applyMutation(m => mutations.setEdgeLabel(m, edgeId, label))
  setNodeShape(nodeId, shape): applyMutation(m => mutations.setNodeShape(m, nodeId, shape))
  toggleConnectMode(): set { connectMode: !, connectSourceId: null, selection: null }  # +selection (FR-013)
```

**Reconciliação (FR-002a)** — efeito derivado em `App.tsx`, keyed em `model` (análogo da Decisão K
de S1):

```text
useEffect(() => {
  if (!selection) return
  const exists = selection.kind === 'node'
    ? model.nodes.some(n => n.id === selection.id)
    : model.edges.some(e => e.id === selection.id)
  if (!exists) clearSelection()
}, [model, selection])
```

Cobre rename (id regenerado), `removeNode`/`removeEdge`, limpeza de S1 e reinterpretação do texto
(ACL emite `e0-a-b`; mutações emitem `e0`) — todos passam por `set({ model })`.

**Invariantes:** (SE) a seleção nunca aparece no texto gerado; selecionar elementos diferentes do
mesmo diagrama ⇒ texto **byte-idêntico** (SC-009). Ver `contracts/selection.contract.md` (SE1–SE6).

## 4. Dimensão efêmera por formato — `src/core/layout/shape-geometry.ts` (novo)

Fora do `GraphModel`. **Determinística** (NFR-04) e **efêmera** (RN-02): entra no dagre e no render,
**nunca** no texto (Princípio V / FR-006a).

```text
shapeSize(shape: string): { width: number; height: number }
  - determinística (tabela pura por chave de formato; sem Date/random/iteração instável)
  - rect (default): { 172, 40 }  — preserva o tamanho de S0
  - formatos que precisam de altura/razão para legibilidade (ex.: diamond, circle,
    doublecircle, hexagon): dimensões deterministicamente maiores
  - shape desconhecido → cai no default (coerente com normalizeImportedShape)
```

Consumidores (MUST concordar): `layout/index.ts` (largura/altura do `graph.setNode`) e `CanvasPanel`
(estilo/tamanho do nó React Flow). `FlowNode` preenche a caixa (`w-full h-full`).

**Invariante-chave:** `shapeSize` MUST NOT ser importada por `src/core/generator/` nem por
`src/core/mermaid-acl/`. Garantia executável: `tests/contract/no-coordinates.test.ts` (inalterado).
Ver `contracts/shape-rendering.contract.md` (SH1–SH5).

## 5. Estado local do painel — `PropertiesPanel.tsx`

Não é estado de store nem de modelo. `labelDraft: string` local, ressemeado do rótulo do modelo
quando a seleção muda (edge). A normalização vive na **mutação** (Decisão N), não aqui (FR-004b). O
seletor de formato lê `node.shape` diretamente do modelo (valor atual, FR-005a).

## 6. Fluxo de dados (origem canvas → texto), reuso do laço de S0

```text
UI (input de rótulo / Select de formato)
  → store.setEdgeLabel / store.setNodeShape
    → applyMutation(mutate)                 # Decisão B de S0, SÍNCRONO, sem debounce
      → mutations.setEdgeLabel / setNodeShape (pura)
      → generate(model)                     # gerador de S0, INTOCADO
      → set({ model, lastValidModel, editorText })   # reescreve a textarea; NÃO reentra no parse
```

`generate` e `importFlowchart` permanecem **byte-idênticos** ao de S0 — a base dos portões II/IV/VI.
