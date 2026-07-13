# ADR-002 — Estratégia de reserialização Mermaid ↔ React Flow

- **Status:** Aceito
- **Data:** 2026-07-13
- **Decisores:** Tuyoshi (product owner)

## Contexto

Round-trip é o maior risco estrutural do produto (`docs/discovery.md`, Notas de spike:
*"Reserialização fiel do Mermaid a partir de edições no canvas. Maior risco estrutural."*).
É preciso: (a) **entrada** — digitar/colar texto Mermaid atualiza o canvas; (b) **saída** —
editar no canvas reescreve o texto Mermaid fiel; para os 5 tipos (Flowchart, Class, State,
Sequence, ER). ADR-001 fixou React Flow como engine, o que cria dois modelos a conciliar.

**Spike / evidência (deep-research, 2026-07-13, verificação adversarial 3-0):**

- **Sem AST público.** O Mermaid não expõe parser/AST estável para os 5 tipos. O
  `@mermaid-js/parser` (Langium, v1.2.0) só cobre tipos novos (pie, packet, gitGraph…);
  os 5 alvos seguem no **Jison depreciado**. Fonte: npm `@mermaid-js/parser@1.2.0` (grep
  no `index.d.ts`: nenhuma sobrecarga `parse()` para flowchart/class/state/sequence/er);
  issue mermaid #4401.
- **Único caminho de extração é interno e depreciado.** Ferramentas reais
  (mermaid-to-excalidraw) chamam `mermaidAPI.getDiagramFromText()` e leem `diagram.db`
  (`getVertices`/`getEdges`/`getSubGraphs`/`getClasses`). Comentário no próprio código:
  *"getDiagramFromText is deprecated but no public alternative provides access to
  diagram.db"* — pode quebrar em qualquer minor release. Fonte: docs/código excalidraw.
- **Parse não traz posição.** O DB interno não tem coordenadas/dimensões; projetos
  recuperam posição **renderizando o SVG e raspando o DOM** (`getBBox`, `transform`).
  Fonte: docs mermaid-to-excalidraw, blog de engenharia tldraw, issue mermaid #2483.
- **Nenhum round-trip OSS resolvido.** Não há editor bidirecional React Flow↔Mermaid
  cobrindo os 5 tipos: prior art é one-way (`mermaid-reactflow-editor` — só Mermaid→canvas,
  "sequence/class não garantidos") ou draw-first/export-only (`saketkattu/mermaid-visual-
  editor` — *"canvas é canônico; Mermaid é sempre derivado, nunca parseado de volta"*;
  import fica no roadmap). Sequence carrega o maior risco de fidelidade.

### Spike de código executado (2026-07-13)

Código em `docs/adr/spikes/adr-002-roundtrip/` (Node 20.17, mermaid 11.16.0, jsdom 22.1.0).
Provou o ciclo `texto Mermaid → modelo estruturado → editar → gerar Mermaid → re-parsear`,
medindo fidelidade estrutural (conteúdo, order-insensitive) por tipo:

```
[FLOW] shapes+subgraph+labels+dotted: content 100% | ordem de declaração: NÃO preservada
[FLOW] LR + hexagon + open edge:      content 100% | ordem de declaração: preservada
[EDIT] edição no canvas -> Mermaid sobreviveu ao re-parse: SIM
[SEQ]  loop+alt + aliases:            fidelity 100%
[SEQ]  opt + nested:                  fidelity 100%
```

- **Flowchart:** nós, shapes, rótulos, arestas, rótulos de aresta, tipo de traço, direção e
  subgraphs fazem round-trip a **100%**. A **ordem de declaração** não sobrevive quando o nó
  pertence a um subgraph — cosmético (não muda o diagrama renderizado).
- **Sequence (texto):** **100%**, incluindo fragmentos loop/alt/opt (voltam como marcadores
  `type` ordenados no `getMessages()`) e aliases de participante (`getActors()` é um `Map`).
- **Confirmado o risco da pesquisa:** a extração depende do `getDiagramFromText`/`diagram.db`
  interno e depreciado (funciona em 11.16.0) → reforça a camada anticorrupção abaixo.
- **Limite do spike:** prova **serialização**, não a **renderização no canvas React Flow**.
  A representação de Sequence (lifelines/tempo vertical) no React Flow segue como risco de
  UI aberto — de render, não de round-trip textual. Não preservados: comentários (`%%`) e
  ordem de declaração. Cobertura amostral (Class/State/ER não exercidos; mesmo mecanismo).

## Decisão

Adotar um **modelo de grafo interno canônico** e uma arquitetura de round-trip
**assimétrica**:

- **Saída (canvas → Mermaid): gerador próprio, determinístico**, a partir do modelo de
  grafo interno. É o caminho de fidelidade primário e sob nosso controle. A **única saída
  salva/copiada é o texto Mermaid** (coerente com o discovery e o ADR-003).
- **Entrada (Mermaid → canvas): parse best-effort** usando o DB interno do Mermaid
  (`getDiagramFromText`/`diagram.db`) como adaptador **isolado atrás de uma camada
  anticorrupção**, para não acoplar o app a uma API depreciada. Estrutura vem do DB;
  **layout é recalculado pela aplicação com dagre/elkjs** (não se raspa o SVG do Mermaid).
- **Escopo de fidelidade por tipo é explícito**: Flowchart/Class/State/ER como alvo pleno;
  **Sequence tratado à parte** (modelo dedicado para lifelines + fragmentos loop/alt/opt),
  candidato a fatiar por último ou reduzir escopo se o spike mostrar custo proibitivo.

Descartado: (a) depender do renderizador SVG do Mermaid como fonte de posição (frágil,
DOM-scraping); (b) esperar o parser Langium cobrir os 5 tipos (migração aberta desde 2023,
sem prazo); (c) prometer round-trip 100% fiel para os 5 tipos sem spike (prior art não o fez).

## Consequências

**Fica mais fácil:** a saída (o valor central — copiar Mermaid limpo) fica sob nosso
controle total e testável; o acoplamento à API interna do Mermaid fica confinado a um único
adaptador substituível.

**Fica mais difícil / trade-offs aceitos:**
- **Dívida de fragilidade** na entrada: `getDiagramFromText`/`diagram.db` é interno e
  depreciado → risco de quebra em upgrades do Mermaid; mitigado pela camada anticorrupção e
  por testes de round-trip por tipo.
- **Perdas de fidelidade conhecidas a decidir explicitamente**: comentários (`%%`), ordem de
  declaração, `classDef`/`style`, subgraphs e fragmentos de Sequence podem não sobreviver ao
  round-trip. Cada um vira critério de aceite (no `plan.md`), não promessa vaga.
- **Sequence é risco aberto** — pode virar limitação declarada de escopo.

**Impacto na PRD (restrição, seção 8):** "A geração de Mermaid a partir do canvas é
determinística e é a fonte da saída; a importação de Mermaid é best-effort com fidelidade
declarada por tipo de diagrama; o layout é recalculado pela aplicação."

**Impacto na constitution:** princípio candidato — "existe um teste de round-trip por tipo de
diagrama com um limiar de fidelidade declarado; nenhuma dependência de API interna do Mermaid
fora da camada de adaptação".

## Status

**Aceito** (2026-07-13), sustentado pelo spike em `docs/adr/spikes/adr-002-roundtrip/`: o
round-trip **textual** (Mermaid ↔ modelo) é fiel a 100% em conteúdo para Flowchart e para os
fragmentos de Sequence, e a edição no canvas sobrevive à regeneração.

O risco de **mapear Sequence ao modelo nós+arestas do React Flow** — antes aberto — foi
fechado por um segundo spike (`docs/adr/spikes/adr-002-sequence-render/`, 2026-07-13):
lifelines → colunas, mensagens → edges temporalmente ordenadas, ativações → barras e
fragmentos `loop/alt/opt` **aninhados** → **group-nodes com `parentNode` e posição relativa**;
9 invariantes geométricas/estruturais passaram (aninhamento, contenção, ordem, contrato
pai/filho do React Flow). **Risco residual, agora baixo e restrito à fatia de canvas:** o
render em DOM do próprio React Flow não foi exercido em browser (só a geometria/modelo, mais
um SVG de sanity) — verificação de pixel fica para a implementação da fatia. Segue registrada
a **estratégia de estabilidade** contra quebras da API interna depreciada do Mermaid
(`getDiagramFromText`/`diagram.db`), mitigada pela camada anticorrupção.
