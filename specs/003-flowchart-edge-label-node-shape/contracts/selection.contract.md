# Contract: Seleção (estado só-de-UI, efêmero)

Módulo: `src/state/editorStore.ts` (aditivo) + reconciliador em `src/App.tsx`. Família de
`connectMode`/`connectSourceId`.

## SE1 — Forma e unicidade (FR-002)
- `selection: { kind: 'node' | 'edge'; id: string } | null`; inicial `null`.
- **Um** elemento por vez (seleção múltipla fora de escopo). `selectNode`/`selectEdge` substituem;
  `clearSelection` volta a `null`.

## SE2 — Estabelecimento (FR-002d)
- **Teclado:** focar um nó/aresta (Tab/setas) estabelece a seleção (via `onFocusCapture` lendo
  `[data-id]`). Nenhum segundo passo (Enter/Space) nem atalho dedicado.
- **Mouse:** clique no nó (fora do modo conectar) ⇒ `selectNode`; clique na aresta ⇒ `selectEdge`.

## SE3 — Persistência ao editar (FR-002d)
- A seleção **persiste** quando o foco entra no painel de propriedades — nenhum elemento do canvas
  focado, `selection` intacta. Nada no blur do canvas a limpa.

## SE4 — Desfazer pelo usuário (FR-002b)
- `Escape` **fora de rename** ⇒ `clearSelection`. `Escape` **durante rename** pertence ao rename (S0
  o consome como cancelamento e retorna antes) e **não** limpa a seleção.
- Clique no fundo vazio do canvas (`onPaneClick`) ⇒ `clearSelection`.

## SE5 — Reconciliação com o modelo (FR-002a / SC-010)
- Quando o elemento selecionado deixa de existir no modelo, a seleção é descartada por um `useEffect`
  keyed em `model`. Cobre: rename (id regenerado), `removeNode`/`removeEdge`, limpeza de S1,
  reinterpretação do texto (ACL emite `e0-a-b`; mutações emitem `e0`).
- `toggleConnectMode` zera `selection` no mesmo `set` que zera `connectSourceId` (FR-013).
- Pós-destruição: **zero** ponteiros obsoletos; o painel nunca edita um elemento inexistente.

## SE6 — Efemeridade (RN-02 / SC-009)
- A seleção **nunca** é serializada nem alcança o texto gerado. Para um mesmo diagrama, selecionar
  elementos diferentes produz texto **byte-idêntico** (portão análogo ao de invariância de viewport).
- Destaque visível (FR-002c) é programaticamente determinável (`data-selected` no nó; classe/estilo na
  aresta), **distinto** do anel de foco de DOM e do de connect-source; some ao desfazer a seleção.
