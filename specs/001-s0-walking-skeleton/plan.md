# Implementation Plan: Fatia S0 — Walking Skeleton (Flowchart Bidirecional)

**Branch**: `001-s0-walking-skeleton` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-s0-walking-skeleton/spec.md`

## Summary

S0 é a travessia fina e completa do pipeline para **um único tipo** (Flowchart): texto Mermaid → prévia
no canvas (import best-effort), canvas → texto Mermaid (gerador determinístico), e cópia do texto final.
A sessão é efêmera. O `spec.md` é a fonte da verdade dos **requisitos** (FR-001..FR-014, SC-001..SC-010);
este plano descreve **a stack, a arquitetura e as restrições técnicas** que os realizam, honrando quatro
ADRs já fechados por spike (ADR-001..ADR-004) e fixando as decisões que eles deixaram abertas para a fatia.

**Abordagem técnica (uma frase):** um **modelo de grafo canônico efêmero** é a fonte de verdade única em
memória; o **import** (Mermaid→modelo) fica confinado a uma **camada anticorrupção** sobre a API interna do
Mermaid; o **export** (modelo→Mermaid) é um **gerador próprio determinístico**; o **layout** é recalculado
pela aplicação (dagre) e nunca serializado; a **sincronização** é unidirecional por origem-de-edição para
não formar laços.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), ES2022; Node 20 LTS (toolchain/tests)
**Primary Dependencies**: React 18 · `@xyflow/react` (React Flow, ADR-001) · Vite 5 (host SPA, ADR-004) ·
  shadcn/ui + Tailwind CSS 3 (ADR-004) · `mermaid` 11.x (usado **somente** dentro da camada anticorrupção
  de import — ADR-002) · `dagre` (auto-layout — ver Decisão A) · `zustand` (store da fonte de verdade)
**Storage**: N/A — sessão **efêmera**, sem persistência entre sessões, sem backend (ADR-003 / FR-011)
**Testing**: Vitest + React Testing Library (unidade/round-trip/determinismo) · Playwright (E2E: US1–US3,
  clipboard, teclado/a11y, invariância de viewport, sanity de render no GitHub)
**Target Platform**: Navegador desktop moderno (Chromium/Firefox/WebKit atuais), mouse + teclado (FR web
  desktop apenas; touch/mobile fora de S0)
**Project Type**: Single-project SPA (frontend only) — sem `backend/`; não é Next.js/App Router (ADR-004)
**Performance Goals**: prévia ao vivo com **p95 ≤ 150 ms** input→render dentro do teto de tamanho declarado
  (Decisão C); 60 fps de interação do canvas dentro do mesmo teto
**Constraints**: nenhuma coordenada de nó no texto (V/FR-010); saída **determinística byte-a-byte**
  (IV/FR-009); saída invariante ao viewport (VIII/FR-013); API interna do Mermaid confinada a 1 adaptador
  (VI/ADR-002); nenhum artefato Next.js/App Router (ADR-004); nenhum caminho de export de imagem (VII);
  UI pt-BR com strings fixas (sem i18n); sem undo/redo
**Scale/Scope**: uma tela (editor de código + canvas), 1 tipo de diagrama (Flowchart), teto declarado de
  **60 nós / 90 arestas** para a garantia de latência (Decisão C)

## Constitution Check

*GATE: Deve passar antes da Fase 0 e ser reavaliado após a Fase 1.* A constitution v1.0.0 tem 8 princípios,
todos decidíveis e com portão de CI. Mapeamento S0 (S0 cobre **apenas Flowchart** — FR-006):

| # | Princípio | Como S0 satisfaz | Portão automatizado nesta fatia |
|---|-----------|------------------|----------------------------------|
| I | Prévia ao vivo ≤ 150 ms | Pipeline enxuto texto→parse→layout→render dentro do teto (Decisão C) | Teste de perf `tests/perf/` afirma **p95 ≤ 150 ms** no teto de 60/90 |
| II | Fidelidade de round-trip por tipo (Flowchart alvo pleno) | Gerador determinístico + modelo canônico preservam 100% estrutural; únicas perdas: ordem de declaração e `%%` (FR-007/FR-008) | Suíte `tests/roundtrip/` compara conteúdo order-insensitive, **exige 100%** e afirma as 2 perdas conhecidas explicitamente |
| III | Cobertura de 5 tipos E2E | S0 declara escopo **só Flowchart**; demais tipos **fora de S0** (FR-006) — não anunciados como suportados | E2E de Flowchart em `tests/e2e/`; escopo reduzido documentado (não é violação — ver Complexity Tracking) |
| IV | Determinismo da geração | Gerador puro, ordenação estável, sem `Date`/random/iteração instável (FR-009) | Teste de determinismo gera N× e **exige igualdade byte-a-byte** |
| V | Canvas é grafo editável; layout é da aplicação | React Flow (não o SVG do Mermaid); posições via dagre, nunca no texto (FR-010) | Grep no texto gerado: **sem coordenadas**; teste confirma layout recalculado, não raspado do SVG |
| VI | Camada anticorrupção da API interna do Mermaid | `getDiagramFromText`/`diagram.db` só dentro de `src/core/mermaid-acl/` (Decisão D) | Lint `no-restricted-imports` + grep no CI: **só o adaptador** referencia a API interna |
| VII | Texto Mermaid é a única fonte da verdade | Modelo efêmero; única saída copiável é o texto; sem export PNG/SVG (ADR-003) | Grep no CI: **nenhuma** rota/botão/API de export de imagem; única saída é texto Mermaid |
| VIII | Viewport nunca serializa | Zoom/pan/colapso efêmeros; mudanças de posição/viewport não mutam o modelo (FR-013) | Teste gera Mermaid **antes/depois** de zoom/pan/colapso e **exige saída idêntica byte-a-byte** |

**Resultado do gate (inicial):** PASS — nenhuma violação. O único ponto de atenção (Princípio III) é uma
**redução de escopo por fatiamento**, não uma violação: S0 não declara suportar Class/State/Sequence/ER e os
sinaliza como não suportados (FR-006). Registrado em Complexity Tracking por transparência.

**Reavaliação pós-Fase 1:** PASS — o desenho (modelo canônico + ACL isolada + gerador puro + dagre) mantém
todos os 8 portões; nenhuma decisão de design introduziu acoplamento à API interna fora da ACL, coordenada
no texto, estado de viewport serializado ou caminho de export de imagem.

## Decisões técnicas abertas (fixadas nesta fatia)

Os ADRs fecharam: engine = React Flow (ADR-001); round-trip assimétrico com gerador próprio + import
best-effort via DB interno atrás de ACL, layout recalculado (ADR-002); Postura A — texto é a única fonte
persistida, modelo efêmero, posição por auto-layout, drag nativo desabilitado/reinterpretado, sem persistência
nem export de imagem (ADR-003); host Vite + React SPA + shadcn/Tailwind, sem Next.js (ADR-004). **Não
re-decididos aqui.** O que os ADRs deixaram em aberto e este plano fixa:

### Decisão A — Biblioteca de layout: **dagre** (elkjs como rota de fuga)

**Escolha:** `dagre` para S0. Síncrono, leve, integração canônica com React Flow, custo trivial no teto de
60/90 (layout < ~15 ms). Suporta direção (TD/LR via `rankdir`) e grafos compostos (subgraphs importados via
`setParent`), suficiente para Flowchart em S0.
**Rota de fuga:** `elkjs` (roteamento de arestas e layout aninhado superiores, porém assíncrono/worker e mais
pesado) fica para quando subgraphs editáveis ou roteamento ortogonal entrarem em fatia posterior. A fronteira
de layout é isolada em `src/core/layout/` com uma assinatura estável (`layout(model) → posições`), então trocar
dagre↔elk não toca o resto.
**Nota de determinismo:** as posições do dagre são **efêmeras e nunca serializadas** (FR-010/Princípio V), logo
o determinismo do layout **não** é requisito do Princípio IV (que rege o texto). Buscamos apenas **estabilidade
visual** (evitar “saltos”) alimentando o dagre com nós/arestas em ordem canônica estável.

### Decisão B — Sincronização sem laços: **fluxo unidirecional por origem-de-edição**

O **modelo de grafo canônico** (`GraphModel`, no store Zustand) é a **fonte de verdade única** (FR-004). As duas
superfícies — painel de texto e canvas — são **derivadas**, e cada edição tem **uma única origem** que se
propaga em **um só sentido** através do modelo, sem re-escrever a superfície de origem no mesmo ciclo:

- **Origem = texto** (usuário digita/cola): evento de input → *debounce* → `parse(text)` na ACL.
  - Sucesso → substitui o `GraphModel`, recalcula layout, atualiza o canvas. **A textarea NÃO é reescrita**
    (o usuário continua digitando). Limpa o indicador de “não interpretável”.
  - Falha (best-effort, FR-012) → **mantém o último modelo válido e o canvas**; a textarea guarda o texto do
    usuário como **overlay transitório**; liga o indicador de “texto não interpretável”.
- **Origem = canvas** (adicionar/renomear/conectar/remover): muta o `GraphModel` (mutações puras) → `generate(model)`
  → **grava a textarea** com o texto gerado (substituindo qualquer overlay inválido — clarificação da spec) e
  recalcula layout. **O canvas já reflete a mutação a partir do próprio modelo**; a geração **não dispara parse**.

**Regra anti-laço (invariante):** `parse` é acionado **exclusivamente** por eventos de input do usuário na
textarea; `generate` é acionado **exclusivamente** por mutações do modelo vindas do canvas. Escrita programática
na textarea (resultado de `generate`) **não** re-entra no `parse`. Reforços: (1) *guarda de idempotência* — se
`generate(model)` for byte-idêntico ao texto atual, não há re-set; (2) mudanças de **posição/seleção/dimensão/
viewport** do React Flow são **filtradas e ignoradas** (não mutam o modelo), o que honra ADR-003 (drag nativo
desabilitado) e o Princípio VIII (viewport não serializa). O `onConnect` do React Flow (arrastar handle→handle)
é **reinterpretado** como criação de aresta estrutural — o único “drag” que sobrevive, e vira mutação de modelo.

### Decisão C — Teto de tamanho para a atualização em 150 ms (p95): **60 nós / 90 arestas**

Envelope garantido de prévia ao vivo em S0: **≤ 60 nós e ≤ 90 arestas** em hardware desktop moderno. Nesse teto,
o orçamento input→render se decompõe em: *debounce* de entrada ≤ 80 ms + (parse na ACL + layout dagre + render
React Flow) ≤ 70 ms, somando **p95 ≤ 150 ms** (SC-002/Princípio I). Acima do teto a responsividade pode degradar
(permitido pelos Edge Cases da spec) — sem quebrar a tela. O teste de perf afirma o p95 exatamente neste teto.

### Decisão D — Forma da camada anticorrupção (ACL) e do gerador determinístico

**Camada anticorrupção — import (Mermaid → modelo), `src/core/mermaid-acl/`:** **único** módulo autorizado a
tocar a API interna/depreciada do Mermaid (`getDiagramFromText`, `diagram.db`: `getVertices`/`getEdges`/
`getSubGraphs`/`getClasses`/`getDirection`). Assinatura neutra: `importFlowchart(text: string): ImportResult`,
com `ImportResult = { ok: true; model: GraphModel } | { ok: false; reason: 'invalid' | 'unsupported-type' }`.
Nada tipado pelo Mermaid escapa do módulo — a saída é sempre o `GraphModel` neutro. Detecta o tipo do diagrama e
retorna `unsupported-type` para não-Flowchart (FR-006), `invalid` para texto não interpretável (FR-012). Um
pré-scan textual leve captura os **blocos de estilo opacos** (`style`/`classDef`/`class`/`:::`/`linkStyle`) que o
DB não expõe integralmente, associando-os aos IDs de nó que referenciam (para reescrita/descarte no rename/remove
— FR-003/FR-007). Portão VI: lint `no-restricted-imports` + grep de CI garantem que só este módulo importa a API
interna; substituir o adaptador não altera o núcleo.

**Gerador determinístico — export (modelo → Mermaid), `src/core/generator/`:** função **pura**
`generate(model: GraphModel): string`, **sem qualquer dependência do Mermaid** (100% sob nosso controle).
Garantias: (1) **ordenação estável** de nós/arestas/blocos por chave canônica (índice de inserção do modelo),
sem `Date`/`Math.random`/iteração instável de `Map`/`Set` (FR-009/Princípio IV); (2) **cabeçalho** `flowchart <DIR>`
com a direção lida do import ou `TD` por padrão (FR-010); (3) **rótulos** sempre emitidos como Mermaid válido, com
aspas/escape quando contêm caracteres especiais (`[]{}()`, `|`, `#`, `;`, aspas, quebras de linha) (FR-003); (4)
**variante de conector** preservada por aresta importada (`-->`,`---`,`-.->`,`==>`,`--o`,`--x`); arestas criadas
pelo canvas usam `-->` (FR-003/FR-007); (5) **blocos de estilo opacos** reemitidos em ordem estável, com
referências de ID reescritas no rename e descartadas na remoção (FR-003/FR-007); (6) saída **alvo Mermaid estável
atual, garantida de renderizar no GitHub** (FR-005). A **derivação de ID (slug)** vive em `src/core/slug/`:
transliteração/remoção para conjunto seguro + sufixo determinístico de unicidade (`slug`, `slug-2`, …) sem fundir
nós (FR-003).

### Decisão E — Piso de acessibilidade por teclado (FR-014)

Baseline S0 (sem alegar WCAG completo):
- **Ações centrais 100% por teclado.** Como *drag-to-connect* não é acessível por teclado, as cinco ações têm
  caminho por teclado explícito: **adicionar nó** e **modo conectar** via *toolbar* shadcn (botões operáveis por
  Tab/Enter); **renomear** via Enter sobre o nó focado (editor inline) ; **conectar** via modo “selecionar origem →
  selecionar destino → confirmar”; **remover** via tecla Delete sobre nó/aresta focado. Nós e arestas do React
  Flow ficam focáveis (`tabIndex`).
- **Nomes e papéis acessíveis** em todos os elementos interativos (botões rotulados em pt-BR; cada nó expõe
  `aria-label` = rótulo; role apropriado).
- **Feedback de status anunciado** via região ARIA `role="status"`/`aria-live="polite"`: resultado da cópia
  (sucesso/falha — FR-005) e indicação de “texto não interpretável” (FR-012).
- **Posição/viewport permanecem do mouse/teclado padrão do React Flow** (zoom/pan), sem exigência de acessibilidade
  avançada de foco em S0. Verificação: E2E Playwright *keyboard-only* + asserções na região de status.

## Project Structure

### Documentation (this feature)

```text
specs/001-s0-walking-skeleton/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 — decisões A–E consolidadas
├── data-model.md        # Fase 1 — GraphModel canônico e mutações
├── quickstart.md        # Fase 1 — bootstrap Vite+React+shadcn e como rodar/testar
├── contracts/           # Fase 1 — contratos internos (ACL import, gerador, mutações do modelo)
│   ├── import-acl.contract.md
│   ├── generator.contract.md
│   └── model-mutations.contract.md
└── tasks.md             # Fase 2 (/speckit.tasks — NÃO criado aqui)
```

### Source Code (repository root)

Single-project SPA (Vite). Sem `backend/`, sem `app/`/`pages/` (nada de Next.js — ADR-004).

```text
index.html
package.json
vite.config.ts
tsconfig.json · tsconfig.app.json · tsconfig.node.json     # alias @ nos 3 (custo único ADR-004)
tailwind.config.ts · postcss.config.js · components.json    # shadcn/ui
eslint.config.js                                            # no-restricted-imports (portão VI/ADR-004)

src/
├── main.tsx                 # bootstrap SPA (sem 'use client', sem next/*)
├── App.tsx                  # layout de tela única: CodePanel | CanvasPanel
├── components/
│   ├── ui/                  # primitivos shadcn/ui
│   ├── CodePanel.tsx        # textarea (overlay transitório) + botão Copiar + indicador "não interpretável"
│   ├── CanvasPanel.tsx      # wrapper React Flow (nodesDraggable=false, nodesConnectable, zoom/pan on)
│   ├── FlowNode.tsx         # nó custom (retângulo), focável, aria-label
│   ├── Toolbar.tsx          # ações por teclado: adicionar nó, modo conectar
│   └── StatusRegion.tsx     # role="status" aria-live (cópia / não interpretável)
├── core/
│   ├── model/               # GraphModel (tipos) + mutações puras (add/rename/connect/remove)
│   ├── mermaid-acl/         # ÚNICO ponto que toca getDiagramFromText/diagram.db (Decisão D / VI)
│   ├── generator/           # generate(model) determinístico, puro, sem dep. do Mermaid (Decisão D / IV)
│   ├── layout/              # auto-layout dagre → posições efêmeras (Decisão A / V)
│   └── slug/                # derivação de ID (slug) + unicidade determinística
├── state/
│   └── editorStore.ts       # Zustand: model (SoT) + editorText overlay + status; regras da Decisão B
└── styles/

tests/
├── unit/         # generator determinismo, slug/unicidade, mutações do modelo
├── roundtrip/    # texto→modelo→texto: 100% estrutural, perdas só ordem+%% (Princípio II)
├── contract/     # grep/lint: ACL isolada (VI), sem coordenadas (V), sem next/* (ADR-004), sem export imagem (VII)
├── perf/         # input→render p95 ≤150 ms no teto 60/90 (Princípio I)
└── e2e/          # Playwright: US1/US2/US3, clipboard, teclado/a11y, invariância viewport (VIII), sanity GitHub
```

**Structure Decision**: Single-project SPA em Vite (ADR-004). A arquitetura hexagonal leve — núcleo puro em
`src/core/` (modelo, gerador, layout, slug) isolado das superfícies de UI em `src/components/`, com a **ACL** como
única fronteira com a API interna do Mermaid — é o que torna cada princípio da constitution um portão verificável
(pureza → determinismo; isolamento da ACL → VI; ausência de coordenadas/viewport no texto → V/VIII).

## Complexity Tracking

Nenhuma violação de constitution a justificar. Registro único de transparência:

| Item | Por que | Alternativa mais simples rejeitada porque |
|------|---------|--------------------------------------------|
| Princípio III coberto só para Flowchart em S0 | S0 é walking skeleton de **1 tipo** (FR-006); os outros 4 tipos são fatias posteriores | Cobrir os 5 tipos agora contradiria o escopo da fatia e o fatiamento vertical da PRD; S0 **não** anuncia os demais como suportados, logo não é fidelidade presumida (a constitution proíbe presumir, não fatiar) |
