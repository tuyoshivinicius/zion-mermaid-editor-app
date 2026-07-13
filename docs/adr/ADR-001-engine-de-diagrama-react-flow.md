# ADR-001 — Engine de diagrama: React Flow (@xyflow/react)

- **Status:** Aceito
- **Data:** 2026-07-13
- **Decisores:** Tuyoshi (product owner)

## Contexto

O produto é um editor web com **edição visual bidirecional** (canvas ↔ código Mermaid
sempre sincronizados) para 5 tipos de diagrama: Flowchart, Class, State, Sequence, ER
(ver `docs/discovery.md`). A capacidade "canvas com round-trip" é o coração do valor,
e o discovery marca a **reserialização fiel do Mermaid a partir do canvas** como o
maior risco estrutural — decisão de arquitetura, não de discovery.

Duas famílias de abordagem existem para o canvas interativo:

- **Renderizador SVG próprio do Mermaid** como canvas (interceptar/estender o SVG que o
  Mermaid gera). Barato para exibir, mas o SVG do Mermaid não é um modelo editável: não
  há grafo manipulável, seleção, handles de conexão ou drag nativos — a interatividade
  teria de ser construída sobre um artefato de saída.
- **Engine de grafo dedicado (React Flow / @xyflow/react)**: um canvas de nós+arestas
  editável de primeira classe (seleção, drag, handles, custom nodes/edges, zoom/pan).

**Spike / evidência (deep-research, 2026-07-13, 24 fontes, 25 claims verificados 3-0):**

- React Flow **não embute engine de layout**; aplica posições calculadas externamente
  e não recalcula sozinho ("static layouting"). Fonte: reactflow.dev/learn/layouting.
- O Mermaid **não expõe AST/parser público** para os 5 tipos (o `@mermaid-js/parser`
  Langium v1.2.0 cobre só tipos novos; os 5 alvos seguem no Jison depreciado). O parse
  só é acessível via objeto interno `diagram.db` (via `getDiagramFromText`, depreciado).
  Fontes: npm `@mermaid-js/parser`, issue mermaid #4401, docs mermaid-to-excalidraw.
- React Flow foi construído "para editores, não para visualizações de sequence
  diagram" (mantenedor, xyflow discussions #3121); Sequence exige modelagem dedicada.

## Decisão

Adotar **React Flow (`@xyflow/react`)** como engine do canvas visual editável, em vez de
usar o renderizador SVG do Mermaid como superfície de edição. React em si fica implicado
por essa escolha (React Flow exige React); a stack de UI concreta (Vite, shadcn/ui,
Tailwind) **não** é objeto deste ADR e vive no `plan.md` de cada feature.

Descartado: (a) editar sobre o SVG do Mermaid — não oferece modelo editável; (b) canvas
próprio do zero — reimplementaria o que React Flow já entrega (seleção, handles, drag,
viewport).

## Consequências

**Fica mais fácil:** edição visual direta (drag, seleção, handles de conexão), zoom/pan e
resize de painéis (recursos "Faz" de UI efêmera do discovery), e um modelo de grafo
próprio que serve de fonte para regenerar Mermaid.

**Fica mais difícil / trade-offs aceitos:**
- **Dois modelos a reconciliar** (grafo React Flow ↔ texto Mermaid). Round-trip fiel não
  é resolvido pela escolha do engine — vira o ADR-002.
- **Layout é responsabilidade nossa**: React Flow não posiciona nós; será preciso rodar
  layout próprio (dagre/elkjs). Detalhe de `plan.md`, mas a restrição nasce aqui.
- **Sequence diagram é o pior encaixe** para o modelo genérico nós+arestas de React Flow
  (semântica temporal/lifeline + fragmentos loop/alt/opt). Maior custo de custom
  nodes/edges e maior risco de fidelidade dos 5 tipos.

**Impacto na PRD (restrição, seção 8):** "O canvas de edição visual é um grafo editável
dedicado (não o SVG de saída do Mermaid); o layout dos nós é calculado pela aplicação, não
por coordenadas escritas no texto Mermaid."

**Impacto na constitution:** princípio candidato — "toda feature de edição visual expõe um
modelo de grafo editável; a fidelidade do round-trip por tipo de diagrama é testável".

## Status

Aceito. O spike do ADR-002 (2026-07-13) confirmou que o round-trip **textual** Mermaid ↔
modelo é viável (100% de conteúdo em Flowchart e fragmentos de Sequence), removendo o
principal risco de inviabilizar esta escolha. O risco complementar de **mapear Sequence** ao
modelo nós+arestas de React Flow foi fechado por spike próprio
(`docs/adr/spikes/adr-002-sequence-render/`, 2026-07-13): lifelines, mensagens ordenadas,
ativações e fragmentos `loop/alt/opt` **aninhados** mapeiam para custom nodes + **group-nodes
via `parentNode`** + edges (9 invariantes geométricas/estruturais passaram). Risco residual
**baixo** e restrito à fatia de canvas: o render em DOM do próprio React Flow não foi
exercido em browser (verificação de pixel), mas o modelo produzido usa só primitivas padrão.
