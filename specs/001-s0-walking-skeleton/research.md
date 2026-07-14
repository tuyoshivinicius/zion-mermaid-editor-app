# Fase 0 — Research: decisões técnicas abertas de S0

Os quatro ADRs (ADR-001..004) são decisões **fechadas por spike** e não são re-pesquisadas aqui. Esta fase
resolve apenas as decisões que os ADRs deixaram **abertas para a fatia**, no formato Decisão / Racional /
Alternativas. Não há `NEEDS CLARIFICATION` residual: todas as incógnitas do Technical Context foram fixadas.

## D-A · Biblioteca de layout: dagre

- **Decisão:** `dagre` como motor de auto-layout de S0, isolado atrás de `src/core/layout/` com assinatura
  `layout(model) → Map<nodeId, {x,y}>`.
- **Racional:** síncrono (sem worker), leve, integração canônica com React Flow, custo desprezível no teto de
  60/90 (< ~15 ms), suporta direção (`rankdir` TD/LR — FR-010) e grafos compostos para subgraphs importados
  (`setParent`). As posições são **efêmeras e nunca serializadas** (Princípio V/FR-010), então o layout não
  precisa ser determinístico para o Princípio IV — busca-se só estabilidade visual, obtida alimentando o dagre em
  ordem canônica.
- **Alternativas consideradas:** **elkjs** — roteamento e layout aninhado superiores, porém assíncrono e mais
  pesado; adotado como **rota de fuga** para fatias com subgraphs editáveis/roteamento ortogonal (troca sem tocar
  o núcleo, graças ao isolamento de `core/layout/`). **Layout manual/força-dirigida própria** — reinventa o que o
  dagre entrega. **Posições do SVG do Mermaid** — proibido por ADR-002/Princípio V (DOM-scraping).

## D-B · Sincronização sem laços: fluxo unidirecional por origem-de-edição

- **Decisão:** modelo canônico (`GraphModel`) como fonte de verdade única; superfícies derivadas; cada edição tem
  origem única e se propaga em um sentido; a superfície de origem não é reescrita no mesmo ciclo. `parse` só por
  input do usuário na textarea; `generate` só por mutação vinda do canvas; escrita programática não re-entra no
  parse. Guarda de idempotência (não reescrever se byte-idêntico) + filtragem de mudanças de posição/seleção/
  dimensão/viewport (não mutam o modelo).
- **Racional:** elimina o laço texto→canvas→texto por construção (origens separadas), sem heurística frágil de
  “quem mudou por último”. Alinha com FR-004 (fonte única, sem conflito) e com a clarificação de que texto inválido
  é overlay transitório sobre o último modelo válido. Filtrar viewport/posição satisfaz VIII e ADR-003 (drag nativo
  desabilitado) de graça.
- **Alternativas consideradas:** **two-way binding com diffing bidirecional** — propenso a laços e a corridas;
  exige detecção de origem por conteúdo. **Debounce simétrico nos dois lados** — não resolve o laço, só o atrasa.
  **Texto como fonte da verdade direta (sem modelo)** — inviável: o export precisa de um modelo estruturado
  determinístico (ADR-002) e o import é best-effort.

## D-C · Teto de tamanho para 150 ms p95: 60 nós / 90 arestas

- **Decisão:** envelope garantido de prévia ao vivo = **≤ 60 nós e ≤ 90 arestas** em desktop moderno. Orçamento
  input→render: *debounce* ≤ 80 ms + (parse + layout + render) ≤ 70 ms ⇒ **p95 ≤ 150 ms** (SC-002/Princípio I).
- **Racional:** margem confortável — parse via DB interno (~5–20 ms), dagre (< ~15 ms) e render React Flow de ~60
  nós (~10–30 ms) cabem folgadamente. Acima do teto, degradação é permitida pelos Edge Cases da spec, sem quebrar a
  tela. O teste de perf afirma o p95 exatamente neste teto (o número é o contrato verificável do Princípio I).
- **Alternativas consideradas:** **sem teto declarado** — proibido (Princípio I e a Assumption da spec exigem teto
  explícito). **Teto maior (ex.: 200 nós)** — arriscaria o p95 sem virtualização; adiado. **Virtualização de canvas**
  — otimização fora de escopo de S0.

## D-D · Camada anticorrupção (import) e gerador determinístico (export)

- **Decisão (ACL/import):** `src/core/mermaid-acl/` é o **único** módulo que toca `getDiagramFromText`/`diagram.db`;
  expõe `importFlowchart(text) → { ok:true, model } | { ok:false, reason:'invalid'|'unsupported-type' }`. Detecta
  tipo (não-Flowchart → `unsupported-type`, FR-006), é best-effort (texto ruim → `invalid`, FR-012), e faz pré-scan
  textual dos blocos de estilo opacos (`style`/`classDef`/`class`/`:::`/`linkStyle`) associando-os aos IDs que
  referenciam. Saída sempre neutra (`GraphModel`); nada tipado pelo Mermaid escapa.
- **Decisão (gerador/export):** `src/core/generator/` com `generate(model) → string` **pura, sem dependência do
  Mermaid**: ordenação estável por índice de inserção; cabeçalho `flowchart <DIR>`; rótulos sempre válidos
  (aspas/escape); variante de conector preservada por aresta importada e `-->` para arestas do canvas; blocos de
  estilo opacos reemitidos com referências de ID reescritas no rename e descartadas na remoção; alvo Mermaid estável
  que renderiza no GitHub. Slug de ID em `src/core/slug/` (transliteração + sufixo determinístico de unicidade).
- **Racional:** confina a fragilidade da API interna/depreciada (ADR-002) a um adaptador substituível (Princípio
  VI) e mantém o **valor central — export limpo e determinístico — 100% sob nosso controle** (Princípios IV/II).
  Round-trip assimétrico é exatamente o desenho provado no spike do ADR-002 (Flowchart 100% em conteúdo).
- **Alternativas consideradas:** **usar o Mermaid também para gerar texto** — o Mermaid não tem serializador
  público e a saída não seria determinística/controlável (viola IV). **Espalhar chamadas ao `diagram.db` pela UI** —
  viola VI e acopla o app à API depreciada. **Raspar o SVG para posição/estrutura** — proibido (V/ADR-002).

## D-E · Piso de acessibilidade por teclado

- **Decisão:** baseline FR-014 — cinco ações centrais alcançáveis por teclado (toolbar shadcn para adicionar nó e
  entrar em modo conectar; Enter para renomear o nó focado; modo origem→destino→confirmar para conectar; Delete para
  remover nó/aresta focado); nomes/papéis acessíveis; região `role="status"`/`aria-live="polite"` anunciando
  resultado da cópia e “texto não interpretável”. Sem alegar WCAG completo.
- **Racional:** *drag-to-connect* não é acessível por teclado, logo cada ação precisa de um caminho por teclado
  explícito; a toolbar e o modo-conectar suprem isso sem depender do mouse. A região de status cobre o feedback não
  visual (cópia/erro) exigido por SC-010.
- **Alternativas consideradas:** **só drag/mouse** — falha FR-014. **Conformidade WCAG completa em S0** — fora de
  escopo por decisão da spec (contraste/foco avançado/auditoria ficam para fatias posteriores).

## Restrições herdadas dos ADRs (não re-decididas — apenas honradas)

- **ADR-001:** canvas = React Flow (`@xyflow/react`), não o SVG do Mermaid ⇒ React obrigatório.
- **ADR-002:** modelo canônico único; export = gerador próprio determinístico; import = best-effort via DB interno
  atrás de ACL; layout recalculado (dagre/elk), sem raspar SVG.
- **ADR-003 (Postura A):** texto Mermaid é a única fonte persistida/copiável; modelo efêmero; posição por
  auto-layout (nunca coordenada no texto); drag nativo desabilitado/reinterpretado; sem documento nativo, sem
  persistência entre sessões, sem export de imagem.
- **ADR-004:** host Vite + React SPA + shadcn/ui + Tailwind; **nenhum** artefato Next.js/App Router (`'use client'`,
  `next/*`, roteamento por arquivo, server components) — verificável por lint/grep no CI.
