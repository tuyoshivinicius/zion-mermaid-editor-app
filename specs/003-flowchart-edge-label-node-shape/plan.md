# Implementation Plan: Fatia S2 — Rótulo de Conexão e Formato de Nó no Flowchart

**Branch**: `003-flowchart-edge-label-node-shape` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-flowchart-edge-label-node-shape/spec.md`

## Summary

S2 fecha uma **cegueira do canvas**: o rótulo de conexão (`Edge.label`) e o formato de nó
(`Node.shape`) já existem no modelo de S0, já são emitidos pelo gerador e já sobrevivem ao ciclo,
mas o usuário não consegue **criá-los nem alterá-los pelo canvas** — todo nó é desenhado como
retângulo e nenhuma mutação escreve esses dois campos. Esta fatia abre os dois caminhos de escrita
pelo canvas e passa a **desenhar** os 14 formatos. O `spec.md` é a fonte da verdade dos
**requisitos** (FR-001..FR-016, SC-001..SC-015); este plano descreve **a stack, a arquitetura e as
restrições técnicas** que os realizam dentro de ADR-001..ADR-004 — que **não são re-decididos
aqui** — e fixa as decisões que S2 encontra em aberto (Decisões **M–R**).

**Abordagem técnica (uma frase):** a **seleção** nasce como estado só-de-UI no store Zustand, da
mesma família de `connectMode`/`connectSourceId` e reconciliada contra o modelo por um efeito
derivado (o análogo, em estado de store, da Decisão K de S1); **duas mutações puras novas**
(`setEdgeLabel`, `setNodeShape`) em `src/core/model/mutations.ts` escrevem `Edge.label` e
`Node.shape` de forma aditiva e plugam no laço **mutação → geração → reescrita** já provado em S0
(Decisão B), sem tocar gerador nem ACL; os **14 formatos** são desenhados no `FlowNode` como
construtos visuais do React Flow, com uma **caixa de layout determinística sensível ao formato**
que resolve a tensão geométrica de FR-006a sem que nenhuma dimensão alcance o texto; e a cobertura
de round-trip é **estendida aos 14 formatos e ao rótulo de conexão**, tornando SC-006 um portão
real em vez de herdado.

**Nenhuma capacidade de geração, parse, layout-como-texto, cópia ou persistência é redefinida.**
S2 acrescenta **duas mutações, um campo de estado (seleção), dois controles (painel + seletor) e o
desenho dos formatos**. Diferentemente de S1, **`src/core/**` É tocado** — porque não existe caminho
aditivo para escrever `Edge.label`/`Node.shape` sem mutação nova (FR-010); as adições são
estritamente aditivas e enumeradas exaustivamente na Decisão M.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), ES2022; Node 20 LTS — inalterado (S0/S1)
**Primary Dependencies**: as de S0/S1 (React 18 · `@xyflow/react` ADR-001 · Vite 5 ADR-004 ·
  shadcn/ui + Tailwind ADR-004 · `mermaid` 11.x só na ACL ADR-002 · `dagre` · `zustand` ·
  `@radix-ui/react-alert-dialog` de S1) **+ uma única adição**: `@radix-ui/react-select` (primitivo
  shadcn/ui do seletor de formato — Decisão O). Nenhuma dependência nova de runtime de diagrama,
  layout ou estado.
**Storage**: N/A — a sessão permanece **efêmera** (ADR-003 / FR-011). Seleção e estado do painel de
  propriedades são estado **só-de-UI**, nunca serializados (RN-02). Nenhum `localStorage`/
  `sessionStorage`/IndexedDB/cookie é introduzido.
**Testing**: Vitest + React Testing Library (mutações novas, normalização de rótulo, reconciliação
  da seleção, painel de propriedades, nomes acessíveis de formato) · Playwright (US1–US3, seleção
  por teclado/mouse, destaque, fluxos keyboard-only) · round-trip estendido aos 14 formatos e ao
  rótulo (SC-006).
**Target Platform**: navegador desktop moderno, mouse + teclado — inalterado (S0/S1).
**Project Type**: Single-project SPA (Vite) — sem `backend/`, sem `app/`/`pages/`, sem
  `'use client'`, sem `next/*` (ADR-004), inalterado.
**Performance Goals**: o **p95 ≤ 150 ms** input→render de S0 (Princípio I) governa as duas edições
  novas; ambas usam o laço **síncrono** `applyMutation` de S0 (sem debounce próprio) → geração →
  reescrita da textarea, dentro do mesmo orçamento. O teto de 60/90 de S0 (Decisão C) segue
  governando o tamanho do diagrama. O portão de boot de 1 s de S1 (SC-012) é inalterado.
**Constraints**: (a) **imutabilidade comportamental de S0/S1** (FR-010) — nenhum comportamento
  entregue é redefinido; as mudanças em arquivos existentes são **estritamente aditivas** e
  enumeradas na Decisão M; (b) **nenhuma dimensão/coordenada de nó no texto** (V/FR-006a/SC-009),
  inclusive a caixa sensível ao formato, que é efêmera; (c) geração **determinística byte-a-byte**
  (IV/NFR-04); (d) round-trip **100%** incluindo formato e rótulo (II/NFR-02), com a única exceção
  **conhecida e registrada** do defeito de aspas (FR-015); (e) seleção e painel **efêmeros**, fora
  do texto (RN-02); (f) os 8 portões da constitution v1.0.0 permanecem verdes.
**Scale/Scope**: 14 formatos (tabela `SHAPE_DELIMITERS` já entregue), seleção de **um** elemento por
  vez (seleção múltipla fora de escopo), somente **Flowchart** (FR-001/RN-03).

## Constitution Check

*GATE: deve passar antes da Fase 0 e ser reavaliado após a Fase 1.*

S2 **toca `src/core/**`** (duas mutações novas + caixa de layout sensível ao formato), diferentemente
de S1. Por isso a satisfação por herança do núcleo é **menor** e o plano declara, em cada portão, o
que é herdado e o que é **estendido**:

| # | Princípio | Como S2 satisfaz | Portão nesta fatia |
|---|-----------|------------------|--------------------|
| I | Prévia ao vivo ≤ 150 ms | As duas edições são **mutações de origem canvas** pelo `applyMutation` síncrono de S0 (Decisão B) — sem parse, sem debounce próprio. A caixa sensível ao formato (Decisão P) roda no dagre, custo trivial no teto de 60/90 | `tests/perf/` de S0 **inalterado** (mesmo caminho de mutação); nenhum caminho de input novo com orçamento próprio é criado |
| II | Round-trip por tipo (Flowchart pleno) | Gerador e ACL **intocados**; os 14 formatos e o rótulo já sobrevivem (verificado 14/14). S2 **estende a cobertura** de 2 para 14 formatos + rótulo | **SC-006**: round-trip novo exercita os 14 formatos e o rótulo de conexão (Decisão R). A exceção de aspas (FR-015) é asserção **explícita**, nunca silenciosa |
| III | Cobertura de 5 tipos E2E | Escopo segue **só Flowchart** (FR-001/RN-03); nenhum tipo novo. O seletor de formato **não** é seletor de template (FR-012) | E2E de Flowchart + os novos de S2; `no-template-selector.test.ts` **inalterado** (padrões exigem a palavra *template*, verificado em FR-010a) |
| IV | Determinismo da geração | Gerador **não é tocado**; as mutações novas são puras. A caixa sensível ao formato é **determinística** e **nunca** entra no texto | `tests/unit/` determinismo de S0 inalterado; teste novo afirma que `setEdgeLabel`/`setNodeShape` geram texto byte-idêntico (SC-007) |
| V | Canvas é grafo editável; layout é da aplicação | Os 14 formatos são desenhados pelo **React Flow** (custom nodes, ADR-001); a caixa sensível ao formato alimenta o **dagre** e o render, **nunca** o texto (FR-006a) | `tests/contract/no-coordinates.test.ts` **inalterado e verde** — nenhuma dimensão/coordenada alcança `generate`. É o portão-chave desta fatia |
| VI | ACL da API interna do Mermaid | S2 **não importa** `mermaid` em lugar novo; as edições não percorrem o parse (FR-007) | `tests/contract/acl-isolation.test.ts` **inalterado** e continua verde |
| VII | Texto Mermaid é a única fonte da verdade | Seleção e estado do painel são **só-de-UI e efêmeros** (RN-02/FR-011); nenhum export de imagem, nenhuma persistência | `tests/contract/no-image-export.test.ts` inalterado; `ephemeral.spec.ts` segue exigindo `storageLength === 0` |
| VIII | Viewport nunca serializa | A seleção é da **mesma família** do viewport e do modo conectar: selecionar elementos diferentes produz **texto idêntico** | **SC-009**: teste afirma texto byte-idêntico sob seleções diferentes (análogo de `viewport-invariance.spec.ts`) |

**Resultado do gate (inicial):** PASS — nenhuma violação. O ponto de atenção é o **Princípio V**: a
caixa de layout sensível ao formato (Decisão P) introduz dimensões **efêmeras** que o plano MUST
manter fora do texto; o portão `no-coordinates` já existente é a garantia, e a Decisão P o trata
como invariante de projeto. Redução de escopo (Princípio III só Flowchart) segue a de S0/S1 e está
em Complexity Tracking.

**Reavaliação pós-Fase 1:** PASS — o desenho (seleção como estado de store reconciliado por efeito
derivado + duas mutações puras aditivas + caixa determinística sensível ao formato confinada a
`layout`/render + painel shadcn) não introduz acoplamento à API interna fora da ACL, coordenada/
dimensão no texto, viewport serializado, caminho de export de imagem, persistência nem artefato
Next.js. O gerador e a ACL permanecem **byte-idênticos** ao de S0.

## Decisões técnicas abertas (fixadas nesta fatia)

Os ADRs fecharam: engine = React Flow (**ADR-001**); round-trip assimétrico — gerador próprio
determinístico como caminho de saída, import best-effort atrás da ACL (**ADR-002**); Postura A —
texto é a única fonte persistida/copiável, modelo efêmero, posição por auto-layout, seleção/painel
como estado só-de-UI efêmero (**ADR-003**); host Vite + React SPA com shadcn/ui + Tailwind, sem
Next.js (**ADR-004**). S0 fixou **A–E**; S1 fixou **F–L**. **Nada disso é re-decidido aqui.** S2 fixa
o que encontra em aberto:

### Decisão M — Fronteira do "não redefinir S0/S1": **imutabilidade comportamental + lista aditiva exaustiva, agora tocando `src/core/**`**

**A regra (FR-010).** Como em S1 (Decisão F / FR-014a de S1), a promessa é **imutabilidade
comportamental**, não ausência de diff: nenhum comportamento entregue em S0/S1 pode ser
**redefinido**; mudanças **estritamente aditivas** — uma mutação nova, um campo de estado novo, um
componente novo, um ponto de montagem, um handler novo para uma tecla/evento antes não tratado — são
o mecanismo legítimo da fatia.

**A diferença desta fatia (FR-010).** A proibição de tocar `src/core/**` era regra **de S1** (motivada
por S1 não precisar de capacidade nova de modelo) e **MUST NOT** ser lida como restrição permanente.
S2 **precisa** tocar `src/core/**`: verificou-se que as cinco mutações entregues (`addNode`,
`renameNode`, `connect`, `removeNode`, `removeEdge`) **não escrevem** `Edge.label` nem `Node.shape`,
de modo que não há caminho aditivo sem mutação nova.

**A lista é exaustiva.** Os arquivos **existentes** (S0/S1) que recebem mudança — cada uma aditiva e
comportamentalmente neutra sobre os caminhos existentes:

| Arquivo | Mudança aditiva | Requisito | Por que não redefine S0/S1 |
|---|---|---|---|
| `src/core/model/mutations.ts` | +2 funções: `setEdgeLabel`, `setNodeShape` | FR-004/004a/004b, FR-005/005a | As 5 mutações existentes ficam **byte-idênticas**; as novas só acrescentam (Decisão N) |
| `src/core/layout/index.ts` | dimensiona o nó por `shapeSize(shape)` em vez de constante fixa | FR-006/006a | Posições seguem **efêmeras** e nunca serializadas (V); a assinatura `layout(model)` não muda (Decisão P) |
| `src/state/editorStore.ts` | +estado `selection` + ações `selectNode`/`selectEdge`/`clearSelection`/`setEdgeLabel`/`setNodeShape`; `toggleConnectMode` zera `selection` no mesmo `set` | FR-002/002b, FR-004, FR-005, FR-013 | Novos campos/ações; `setEditorText`, `applyParsedText`, `applyMutation` e as 5 mutações existentes ficam intactos (Decisão M-store) |
| `src/components/CanvasPanel.tsx` | passa `shape`+`isSelected` no `data`; estiliza aresta selecionada; `onEdgeClick`/`onPaneClick`/`onFocusCapture`; ramo `Escape`→`clearSelection` fora de rename | FR-002b/002c/002d, FR-006 | Novos campos de `data` e handlers; `onKeyDown` (rename/Delete/connect), `onConnect` e o mapeamento modelo→React Flow ficam intactos (Decisão Q) |
| `src/components/FlowNode.tsx` | desenha o formato; destaque de seleção; nome acessível do formato | FR-006, FR-002c, FR-012 | Ramo de formato **aditivo**; o caminho de rename inline (`isEditing`) e o de connect-source ficam intactos |
| `src/App.tsx` | monta `<PropertiesPanel />`; `useEffect` reconciliador de seleção | FR-003, FR-002a | Acrescenta um ponto de montagem e um efeito derivado; nada de S0/S1 muda |
| `src/strings.ts` | +nomes pt-BR dos 14 formatos e strings do painel | FR-012 | Módulo de strings é aditivo por natureza; nenhuma string existente muda |
| `package.json` | +`@radix-ui/react-select`; nenhum script de teste removido | Decisão O | Dependência nova estende a camada shadcn do ADR-004 |

**Emendas de teste (FR-010a — tratada como exaustiva, são exatamente duas, ambas em
`tests/e2e/starter.spec.ts`):**
- **"FR-002a — the decision node is a diamond in code but rendered identically…"** afirma o
  **oposto** desta fatia (classe de `Aprovado?` idêntica à de `Início`; nenhum `clip-path`/
  `<polygon>`/`rotate(`). MUST ser **reapontada e renomeada** para afirmar que o nó de decisão é
  **desenhado como losango** e distinguível dos retângulos (SC-012).
- **"SC-011 — no template-choice surface is presented at first contact"** afirma
  `page.locator('[role="listbox"], [role="combobox"], [role="menu"]')).toHaveCount(0)` para a
  **página inteira**. Como o seletor de formato adota `role` de combobox/listbox (Radix Select,
  Decisão O), a asserção MUST ser **estreitada** para afirmar a ausência de escolha **de template**
  (preservando FR-012/SC-011 de S1), não a ausência de uma classe de widget. A asserção do conjunto
  exato de controles da **toolbar** permanece válida (o seletor vive no painel de propriedades, não
  na toolbar).

**Verificado (FR-010a):** o portão de contrato `tests/contract/no-template-selector.test.ts` **não**
é afetado — seus padrões exigem a palavra *template* adjacente, de modo que um seletor de **formato**
não o dispara. Se um **terceiro** teste quebrar na implementação, isso é sinal de que esta premissa
falhou: o caso vira **decisão explícita**, nunca emenda até o verde.

**Portão:** o diff da fatia sob `src/` MUST estar contido nesses arquivos + os arquivos **novos** de
S2. Qualquer outro arquivo de S0/S1 tocado é violação de FR-010 e bloqueia o merge.

### Decisão N — Duas mutações puras novas, aditivas, que plugam no laço de S0

**Escolha:** em `src/core/model/mutations.ts`, duas funções puras com a mesma forma imutável das
cinco existentes:

- `setEdgeLabel(model, edgeId, label): GraphModel` — normaliza **na origem** (FR-004a/FR-004b):
  `const trimmed = label.trim(); const next = trimmed === '' ? null : trimmed;` e grava
  `edge.label = next`. Assim o modelo tem **uma única** representação canônica de "sem rótulo"
  (`null`, o mesmo valor com que `connect()` nasce), fechando o falso-negativo de round-trip que
  `''` ≠ `null` criaria (o gerador de S0 já emite os dois como ausentes: `edge.label ? … : ''`).
- `setNodeShape(model, nodeId, shape): GraphModel` — grava **somente** `node.shape`; `id`, `label`
  e **todas** as arestas ficam intocados (FR-005a). Consequência observável: trocar o formato toca
  **exatamente uma** linha do código (SC-005), por construção do gerador determinístico.

**Por que plugam sem tocar o gerador:** o gerador de S0 **já** emite `|label|` quando `edge.label`
é verdadeiro (`index.ts:62`) e **já** escolhe delimitadores por `SHAPE_DELIMITERS[node.shape]`
(`wrapNodeLabel`). Escrever os campos é tudo o que falta; a emissão é código entregue. Por isso
`src/core/generator/` e `src/core/mermaid-acl/` ficam **byte-idênticos** — o que sozinho mantém os
portões II, IV e VI verdes por construção.

**Por que seguem FR-007 de graça:** as ações de store correspondentes (Decisão M-store) chamam o
`applyMutation` de S0 (Decisão B): **mutação pura → `generate` → reescrita da textarea**, sem
reentrar no parse e sem caminho de reescrita próprio. Nada novo de sincronização é inventado.

### Decisão M-store — Seleção: estado só-de-UI no store, reconciliado por **efeito derivado**

**Escolha:** `selection: { kind: 'node' | 'edge'; id: string } | null` no `editorStore`, da mesma
família de `connectMode`/`connectSourceId` (FR-002, RN-02) — **nunca** serializado. Ações novas:
`selectNode(id)`, `selectEdge(id)`, `clearSelection()`, além de `setEdgeLabel`/`setNodeShape`
(Decisão N). `toggleConnectMode` passa a zerar `selection` **no mesmo `set`** em que já zera
`connectSourceId` (FR-013) — mudança **aditiva** (um campo a mais no payload de reset), sem redefinir
o toggle.

**Reconciliação derivada, não comandada (FR-002a).** Quando o elemento selecionado deixa de existir
no modelo, a seleção MUST ser descartada. Os caminhos de destruição são **reais e verificados** —
rename (regenera o id), `removeNode`/`removeEdge`, limpeza de S1, e reinterpretação do texto (o ACL
emite `e0-a-b`, as mutações emitem `e0`). Todos passam por um `set({ model })` no store. Em vez de
blindar cada caminho de escrita de modelo (o que **redefiniria** `applyParsedText`/`clearSession` —
proibido por FR-010), um **`useEffect` reconciliador** em `App.tsx`, keyed em `model`, limpa a
seleção quando seu `id` some — o **análogo, em estado de store, da Decisão K de S1** (que S1 escolheu
justamente por "derivado do modelo" em vez de "comandado"). É puramente aditivo e não toca nenhum
caminho de S0/S1.

**Por que no store e não no React Flow.** A seleção nativa do React Flow acopla-se a foco/interação
do próprio engine e não sobrevive naturalmente à reescrita do modelo nem persiste quando o foco entra
no **painel** (FR-002d). Mantendo-a como estado de store: (a) o `CanvasPanel` (destaque) e o
`PropertiesPanel` (edição) leem o **mesmo** alvo; (b) ela **persiste** quando o foco sai do canvas e
entra no painel — nenhum elemento do canvas focado, seleção intacta —, que é exatamente por que o
destaque de FR-002c é **distinto** do anel de foco de DOM (Decisão Q).

### Decisão O — Painel de propriedades contextual: componente shadcn novo, montado no `App`

**Escolha:** `src/components/PropertiesPanel.tsx` (componente **novo**), montado no `App` ao lado das
superfícies existentes. Reflete `selection`:

- **Sem seleção** → estado **neutro** (FR-003). **Não** é superfície de escolha de *template*
  (FR-012/SC-011 de S1 seguem valendo) — não oferece diagramas iniciais.
- **Conexão selecionada** → um `<input>` de texto (shadcn) com o **rótulo atual** (FR-004; parte do
  que existe quando já há rótulo). A cada mudança, chama `setEdgeLabel` → laço de S0 → a linha da
  aresta é reescrita **no mesmo instante** (≤ 150 ms). O `<input>` é um input **real** e retém foco
  porque **vive fora do wrapper de nó do React Flow** — é precisamente a briga por foco que S0
  documentou (`FlowNode.tsx`, Decisão E) e que FR-003 evita ao recusar a edição inline. O rascunho é
  estado local do painel, ressemeado do rótulo do modelo quando a seleção muda; a normalização
  (trim, vazio→ausência) mora na **mutação** (Decisão N), não numa segunda convenção de UI (FR-004b).
- **Nó selecionado** → um seletor de formato com os **14** valores (FR-005), indicando o formato
  **atual** (FR-005a). A cada escolha, chama `setNodeShape` → laço de S0. Cada formato tem **nome
  acessível em pt-BR** de `src/strings.ts` (FR-012).

**Widget do seletor: shadcn/ui `Select` (Radix)** — a única dependência nova (`@radix-ui/react-select`),
que **estende a camada shadcn já fixada pelo ADR-004** (como S1 fez com `AlertDialog`). Radix entrega
navegação por teclado, `role`/nome acessíveis e valor atual programaticamente determinável (FR-012)
como comportamento nativo do primitivo. **Consequência assumida (FR-010a):** ele adota `role` de
combobox/listbox, de modo que a asserção página-inteira de SC-011 é **estreitada** para "sem escolha
de template" (Decisão M). O gate de contrato `no-template-selector.test.ts` não é afetado.

**O painel MUST expor, nesta fatia, exatamente o rótulo e o formato** (FR-003a): **nada** de aparência
de conexão (RF-06), estilo (RF-08), agrupamento (RF-09) ou layout (RF-10). O **rename de nó permanece
inline** onde S0 o entregou e **não** é duplicado no painel (FR-003a). A criação de nó continua
produzindo retângulo e **não** ganha escolha de formato (FR-014).

### Decisão P — Desenho dos 14 formatos e a **caixa determinística sensível ao formato**

**O desenho (FR-006).** O `FlowNode` passa a receber `shape` no `data` (hoje `CanvasPanel` **não**
o passa) e desenha cada um dos 14 formatos como construto visual do React Flow — bordas/`clip-path`
CSS para os poligonais (losango, hexágono, trapézios, paralelogramos), `border-radius` para
round/stadium/circle, e SVG/CSS para cilindro e círculo duplo. Formatos diferentes são
**visualmente distintos** (SC-004). Formato importado fora dos 14 continua normalizado para retângulo
pela regra de S0 (`normalizeImportedShape`) — sem caminho especial novo (FR-006).

**A tensão geométrica (FR-006a).** O layout de S0 dimensiona **todo** nó numa caixa fixa de 172×40
(`NODE_WIDTH`/`NODE_HEIGHT`), independentemente do formato — e um losango/círculo **legível** não
cabe nessa razão. **Resolução:** uma tabela pura e determinística `shapeSize(shape) → {width, height}`
(`src/core/layout/shape-geometry.ts`, arquivo **novo**) dá a cada formato uma caixa legível
(o retângulo mantém 172×40; losango/círculo/hexágono ganham altura determinística, etc.). Ela é
consumida em **dois** lugares que MUST concordar: (a) `layout/index.ts` alimenta o dagre com essa
largura/altura, para as arestas conectarem certo; (b) `CanvasPanel` fixa o `style`/tamanho do nó do
React Flow com o **mesmo** valor, e o `FlowNode` preenche a caixa (`w-full h-full`) desenhando o
formato dentro dela.

**A restrição que a torna aceitável (FR-006a, Princípio V).** Essa dimensão é **determinística**
(NFR-04) e **efêmera** (RN-02): entra no dagre e no render, **nunca** no modelo nem no `generate`.
O portão `tests/contract/no-coordinates.test.ts` — que já afirma ausência de coordenada/dimensão no
texto — é a garantia executável, e permanece verde por construção porque o gerador não é tocado. É
o **ponto de atenção do Princípio V** desta fatia, e o plano o trata como invariante inegociável:
nenhuma dimensão alcança o texto (S0, SC-006).

### Decisão Q — Seleção: estabelecimento, destaque e limpeza, sem redefinir S0

**Estabelecer (FR-002d, FR-002b).** Aditivo ao `CanvasPanel`:
- **Foco por teclado seleciona** — um `onFocusCapture` no wrapper do canvas lê o `[data-id]` que
  recebeu foco (nós e arestas já são focáveis; arestas já recebem foco de DOM e respondem a `Delete`
  no handler de S0) e chama `selectNode`/`selectEdge`. Nenhum segundo passo (Enter/Space) nem atalho
  novo — evita conflito com rename/conectar (FR-002d/FR-010).
- **Mouse** — `onNodeClick` fora do modo conectar chama `selectNode` (dentro do modo conectar, o
  clique segue escolhendo origem/destino — FR-013 intocado); `onEdgeClick` chama `selectEdge`;
  `onPaneClick` (clique no fundo vazio) chama `clearSelection` (FR-002b).
- **`Escape`** — um ramo novo no `onKeyDown`, **fora** do bloco de rename, chama `clearSelection`.
  Dentro de rename, o bloco de edição de S0 já consome `Escape` como cancelamento e retorna antes;
  logo `Escape` durante rename **não** limpa a seleção (FR-002b/FR-010).

**Destacar (FR-002c/SC-014).** Distinto do anel de foco de DOM e do anel de connect-source:
`CanvasPanel` passa `isSelected` no `data` do nó → `FlowNode` aplica um destaque próprio e um
atributo programaticamente determinável (`data-selected`); a aresta selecionada recebe classe/estilo
próprio via o mapeamento `model.edges → RFEdge`. O destaque some ao desfazer a seleção (FR-002b).

**Persistir no foco do painel (FR-002d).** Como a seleção é estado de store (Decisão M-store), ela
**persiste** quando o foco entra no painel: nada no blur do canvas a limpa — só `Escape`, clique no
vazio e a reconciliação por destruição (Decisão M-store) a removem.

### Decisão R — Cobertura de round-trip estendida aos 14 formatos e ao rótulo

**O que existe.** `tests/roundtrip/flowchart.test.ts` já compara `shape` e `label` no snapshot
canônico (`canonicalize`), mas exercita apenas `rect` e `diamond` e um rótulo.

**O que S2 acrescenta (SC-006/FR-008).** Um caso que constrói um modelo cobrindo os **14** formatos
(via `setNodeShape`) e conexões **rotuladas** (via `setEdgeLabel`), roda `generate → importFlowchart`
e afirma igualdade canônica insensível à ordem — 14/14 + rótulo. As únicas perdas admissíveis seguem
sendo ordem de declaração e `%%` (NFR-02). A **exceção conhecida** do defeito de aspas (FR-015) é
asserção **explícita e nomeada** (rótulo com `"` **não** sobrevive — `#quot;`/mangling), não um caso
silenciosamente omitido: S2 **não** conserta, contorna nem agrava o defeito de S0, apenas o registra
como exceção conhecida a NFR-02. Complementam: um teste de determinismo (SC-007) das duas mutações e
um teste de invariância de seleção (SC-009 — seleções diferentes ⇒ texto byte-idêntico).

## Project Structure

### Documentation (this feature)

```text
specs/003-flowchart-edge-label-node-shape/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Fase 0 — Decisões M–R consolidadas
├── data-model.md        # Fase 1 — Selection, mutações novas, tabela de tamanho por formato
├── quickstart.md        # Fase 1 — como rodar, testar e verificar os portões de S2
├── contracts/           # Fase 1 — contratos internos de S2
│   ├── selection.contract.md            # SE1–SE6: estado só-de-UI, reconciliação, destaque
│   ├── mutations-label-shape.contract.md# MU1–MU5: setEdgeLabel/setNodeShape (aditivas, puras)
│   ├── properties-panel.contract.md     # PP1–PP5: reflexo da seleção, neutro, a11y, exatidão de escopo
│   └── shape-rendering.contract.md       # SH1–SH5: 14 formatos, caixa efêmera, nada no texto
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

Single-project SPA (Vite, ADR-004) — inalterado. **`+`** = arquivo novo de S2; **`~`** = arquivo de
S0/S1 com mudança **aditiva** (Decisão M); o resto é intocado.

```text
  package.json                         ~ + @radix-ui/react-select (Decisão O)

src/
~ ├── App.tsx                          # + monta <PropertiesPanel /> + useEffect reconciliador de seleção (Decisão M-store)
~ ├── strings.ts                       # + nomes pt-BR dos 14 formatos + strings do painel (FR-012)
  ├── components/
+ │   ├── PropertiesPanel.tsx          # reflete a seleção: input de rótulo | seletor de formato | neutro (Decisão O)
~ │   ├── CanvasPanel.tsx              # + shape/isSelected no data · aresta selecionada · onEdgeClick/onPaneClick/onFocusCapture · Escape→clearSelection (Decisão Q)
~ │   ├── FlowNode.tsx                 # + desenho dos 14 formatos · destaque de seleção · nome acessível do formato (Decisão P/Q)
+ │   └── ui/select.tsx               # primitivo shadcn/ui novo (Decisão O)
  │   └── (CodePanel · Toolbar · ClearAction · StarterAnnouncer · StatusRegion · ui/*)   INALTERADOS
~ ├── state/editorStore.ts            # + selection + selectNode/selectEdge/clearSelection + setEdgeLabel/setNodeShape · toggleConnectMode zera selection (Decisão M-store)
  └── core/
~     ├── model/mutations.ts          # + setEdgeLabel + setNodeShape (Decisão N); as 5 existentes INALTERADAS
~     ├── layout/index.ts             # + dimensiona por shapeSize(shape) (Decisão P); assinatura layout(model) INALTERADA
+     ├── layout/shape-geometry.ts    # tabela pura/determinística shapeSize(shape) → {width,height} (Decisão P)
      ├── generator/ · mermaid-acl/ · model/shapes.ts · model/types.ts · slug/   INALTERADOS (byte-idênticos)

tests/
+ ├── unit/mutations-label-shape.test.ts   # FR-004a/004b/005a · normalização · exatidão de escopo (Decisão N)
+ ├── unit/selection.test.ts               # FR-002a reconciliação · FR-013 toggle zera seleção (Decisão M-store)
+ ├── unit/properties-panel.test.tsx       # FR-003/003a/004/005/012 · neutro · nomes acessíveis (RTL)
+ ├── unit/shape-geometry.test.ts           # SH3 — shapeSize(shape) pura/determinística · rect 172×40 · default (Decisão P)
+ ├── roundtrip/shapes-labels.test.ts       # SC-006 — 14 formatos + rótulo · exceção de aspas explícita (Decisão R)
+ ├── unit/shape-generation.test.ts         # SC-007 determinismo das 2 mutações · SC-009 invariância de seleção
+ ├── e2e/edge-label.spec.ts                # US1 · SC-001/002/003/005/011 (keyboard-only)
+ ├── e2e/node-shape.spec.ts                # US2/US3 · SC-004/005/008/012 · seleção/destaque (FR-002c/d)
~ ├── e2e/starter.spec.ts                   # EMENDA autorizada por FR-010a (2 casos: losango + SC-011 estreitada)
  └── (roundtrip/flowchart.test.ts · contract/* · perf/* · demais e2e de S0/S1)   INALTERADOS
```

**Structure Decision**: a arquitetura hexagonal leve de S0 é preservada — núcleo puro em
`src/core/`, superfícies em `src/components/`, store Zustand como fonte de verdade em memória. S2
acrescenta **duas mutações puras** ao núcleo (única forma de escrever `Edge.label`/`Node.shape`), uma
**tabela de tamanho por formato** confinada à camada de layout/render (dimensão efêmera, nunca texto),
um **campo de estado só-de-UI** (seleção) reconciliado por efeito derivado, e **um componente de
painel** que reflete a seleção. O gerador e a ACL — os portões II/IV/VI — permanecem **byte-idênticos**
ao de S0, o que é, sozinho, a garantia mais forte de que a fidelidade e o determinismo continuam
verdes por construção.

## Complexity Tracking

| Item | Por que | Alternativa mais simples rejeitada porque |
|------|---------|-------------------------------------------|
| **S2 toca `src/core/**`** (mutações + layout), ao contrário de S1 (Decisão M/N) | Não existe caminho aditivo para escrever `Edge.label`/`Node.shape` sem mutação nova; a proibição era **de S1** (FR-014a de S1), não permanente (FR-010) | Manter `src/core` intocado tornaria a fatia **impossível**. Mitigação: as adições são estritamente aditivas (5 mutações existentes byte-idênticas; gerador/ACL intocados), a lista de arquivos é exaustiva e o diff fora dela é portão de merge |
| **Caixa de layout sensível ao formato** (Decisão P), introduzindo dimensão nova | Um losango/círculo **legível** (palavra de FR-006a) não cabe na caixa 172×40 do retângulo; FR-006a pré-autoriza dimensionamento sensível ao formato desde que determinístico e efêmero | Desenhar todos os 14 formatos clipados na caixa fixa produz losangos/círculos achatados — "distintos", mas não **legíveis**. Mitigação: a dimensão é determinística (NFR-04), efêmera (RN-02) e **nunca** alcança o texto — garantido pelo portão `no-coordinates` já existente |
| **Seleção como estado de store** reconciliado por efeito derivado (Decisão M-store) | O painel (fora do canvas) e o destaque (no canvas) leem o mesmo alvo, e a seleção **persiste** quando o foco entra no painel (FR-002d) — o que a seleção nativa do React Flow não garante | Reconciliar em cada caminho de escrita de modelo **redefiniria** `applyParsedText`/`clearSession` (proibido por FR-010); o efeito derivado é o análogo aditivo da Decisão K de S1 |
| Uma dependência nova (`@radix-ui/react-select`) | FR-012 exige seletor operável por teclado, com `role`/nome acessíveis e valor atual programaticamente determinável; Radix é a base do shadcn/ui **já fixado pelo ADR-004** | Seletor com gestão de teclado/foco escrita à mão é onde esse requisito apodrece; a consequência (estreitar SC-011) é explicitamente autorizada por FR-010a |
| Princípio III coberto só para Flowchart | Herdado de S0/S1 (FR-001/RN-03): a release tem 1 tipo. FR-012 proíbe até seletor de template | Cobrir os 5 tipos contradiz o fatiamento vertical da PRD; S2 **não anuncia** tipo novo, logo não é fidelidade presumida |
