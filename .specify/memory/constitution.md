<!--
SYNC IMPACT REPORT
==================
Version change: (none) → 1.0.0
Bump rationale: MAJOR — primeira ratificação da constitution. Estabelece 8 princípios
  fundacionais derivados dos NFRs e restrições de ADR da PRD (docs/PRD.md).

Modified principles: N/A (ratificação inicial; nenhum princípio anterior)

Added principles:
  I.   Prévia ao Vivo Sub-150ms                              (← NFR-01)
  II.  Fidelidade de Round-Trip por Tipo                      (← NFR-02, ADR-002)
  III. Cobertura de 5 Tipos Ponta-a-Ponta                    (← NFR-03, ADR-001/ADR-002)
  IV.  Determinismo da Geração                                (← NFR-04, ADR-002)
  V.   Canvas é Grafo Editável, Layout é da Aplicação         (← R1 / ADR-001)
  VI.  Camada Anticorrupção da API Interna do Mermaid         (← R2 / ADR-002)
  VII. Texto Mermaid é a Única Fonte da Verdade               (← R3 / ADR-003)
  VIII.Viewport Nunca Serializa no Código                     (← R3 / ADR-003, RN-02)

Added sections:
  - Restrições de Escopo e Fidelidade Declarada
  - Fluxo de Desenvolvimento e Portões de Qualidade

Removed sections: N/A

Templates requiring updates:
  ✅ .specify/templates/plan-template.md — "Constitution Check" é placeholder genérico que
     deriva os gates da constitution em tempo de plan; já alinhado, sem edição necessária.
  ✅ .specify/templates/spec-template.md — sem referências a princípios; nenhuma seção
     obrigatória adicionada/removida que exija edição.
  ✅ .specify/templates/tasks-template.md — categorização de tarefas neutra; princípios
     mapeiam para tarefas de teste (round-trip/determinismo/latência) já cobertas.

Follow-up TODOs:
  - ⚠ ADR-004 (host Vite + React SPA; proibição de artefatos Next.js/App Router) NÃO foi
    incluído: não constava do material de origem fornecido para esta derivação. Seus dois
    princípios candidatos são decidíveis e rastreáveis (lint/grep no CI). Adicionar como
    Princípios IX e X mediante confirmação (seria bump MINOR → 1.1.0).
-->

# Editor Visual de Diagramas Mermaid — Constitution

Esta constitution define os invariantes não-negociáveis do produto. Cada princípio enuncia
um comportamento invariável, um critério objetivo de verificação (métrica ou teste
automatizável) e a origem que o sustenta (NFR-xx da PRD ou restrição/ADR). Nenhum princípio
é genérico: todos são decidíveis e rastreáveis. Fonte: `docs/PRD.md` (§7 NFRs, §8 Restrições)
e `docs/adr/`.

## Core Principles

### I. Prévia ao Vivo Sub-150ms

A prévia do diagrama MUST refletir a digitação ou edição em, no máximo, **150 ms**. A
sincronização código ↔ canvas é o coração do produto e sua responsividade é um invariante,
não um alvo aspiracional.

- **Critério de verificação:** teste de performance automatizado mede a latência
  input → render; o **p95 da latência de prévia MUST ser ≤ 150 ms**. Regressão acima do
  limiar bloqueia o merge. Se houver limite de tamanho de diagrama para sustentar o alvo,
  ele MUST ser declarado explicitamente na spec/plan da fatia.
- **Origem:** NFR-01.

### II. Fidelidade de Round-Trip por Tipo

O ciclo canvas → Mermaid → canvas MUST preservar **100% do conteúdo estrutural** (nós,
arestas, rótulos, shapes, subgraphs e estilos serializáveis) para **Flowchart, Class, State
e ER**. As únicas perdas permitidas são as declaradas: **ordem de declaração** e comentários
**`%%`** (ADR-002). Perda silenciosa fora dessa lista é violação.

- **Critério de verificação:** suíte de round-trip **por tipo** compara conteúdo de forma
  insensível à ordem e **exige 100%** para Flowchart/Class/State/ER; qualquer resultado
  < 100% bloqueia o merge. As perdas conhecidas (`%%`, ordem) MUST ser asserções explícitas
  no teste — declaradas, nunca silenciosas. Nenhuma fatia de tipo fecha sem esse teste.
- **Origem:** NFR-02, ADR-002.

### III. Cobertura de 5 Tipos Ponta-a-Ponta

Os **5 tipos suportados** (Flowchart, Class, State, Sequence, ER) MUST ser editáveis
ponta-a-ponta pelo pipeline completo (import best-effort → modelo canônico → canvas → gerador
determinístico → saída copiável). **Sequence** tem fidelidade declarada à parte e PODE ter
escopo reduzido, desde que o escopo seja documentado — nunca presumido como pleno.

- **Critério de verificação:** existe um **teste ponta-a-ponta por tipo** provando o pipeline
  inteiro; nenhum tipo é anunciado como suportado sem esse teste. A **fidelidade de Sequence
  MUST ser declarada explicitamente** (pleno ou reduzido) na spec da fatia, não inferida.
- **Origem:** NFR-03, ADR-001, ADR-002.

### IV. Determinismo da Geração

A geração de Mermaid a partir do canvas MUST ser determinística: a mesma entrada de canvas
produz **exatamente a mesma saída**, byte a byte.

- **Critério de verificação:** teste de determinismo gera a saída de uma mesma entrada
  **N vezes** e exige **igualdade byte a byte**. O gerador MUST NOT depender de fontes
  não-determinísticas (timestamp, aleatoriedade, ordem de iteração instável de mapas/sets).
- **Origem:** NFR-04, ADR-002.

### V. Canvas é Grafo Editável, Layout é da Aplicação

O canvas de edição MUST ser um **grafo editável dedicado** (React Flow / `@xyflow/react`),
não o SVG de saída do Mermaid. A posição dos nós MUST ser calculada pela **aplicação**
(auto-layout via dagre/elkjs); coordenadas de nó **nunca** são escritas no texto Mermaid nem
lidas dele. O usuário controla orientação/algoritmo de layout, não coordenada manual fixada.

- **Critério de verificação:** o texto Mermaid gerado **não contém coordenadas de nó**
  (asserção/grep no teste de saída); nenhum código recupera posição raspando o SVG do
  Mermaid; teste confirma que o layout é **recalculado** pela aplicação, não lido do texto.
- **Origem:** R1 / ADR-001.

### VI. Camada Anticorrupção da API Interna do Mermaid

A dependência da **API interna e depreciada** do Mermaid usada na importação
(`getDiagramFromText` / `diagram.db`) MUST ficar confinada a um **único módulo adaptador**,
isolado e substituível. A importação é **best-effort**, com **fidelidade declarada por tipo**.

- **Critério de verificação:** **apenas o módulo adaptador** referencia a API interna do
  Mermaid — verificável por lint/grep no CI (nenhum outro arquivo importa
  `getDiagramFromText`/`diagram.db`); substituir o adaptador **não** altera o núcleo. A
  fidelidade de importação **por tipo** é declarada e coberta por teste de round-trip.
- **Origem:** R2 / ADR-002.

### VII. Texto Mermaid é a Única Fonte da Verdade

O **único artefato persistido/copiável** MUST ser o **texto Mermaid**; nenhum estado
necessário para reproduzir o diagrama vive fora dele. **Não** há documento nativo,
persistência entre sessões nem export de imagem. O **buffer de recuperação local** é
efêmero, protege apenas contra fechamento acidental dentro da sessão e **não** é formato de
persistência nem vira saída copiável.

- **Critério de verificação:** **não existe caminho de export PNG/SVG** — nenhuma
  rota/API/botão de exportação de imagem (verificável por teste/grep no CI); a **única saída
  copiável** produzida é texto Mermaid; o buffer de recuperação não gera artefato além do
  texto Mermaid.
- **Origem:** R3 / ADR-003.

### VIII. Viewport Nunca Serializa no Código

O **viewport** — zoom, pan e estado de colapso do painel de código — MUST ser efêmero e
**nunca** entrar no texto Mermaid. A saída MUST ser **invariante** a mudanças de
zoom/pan/colapso.

- **Critério de verificação:** teste gera o Mermaid **antes e depois** de alterar
  zoom, pan e o estado de colapso do painel e exige **saída idêntica byte a byte**; nenhum
  campo de viewport aparece no texto gerado.
- **Origem:** R3 / ADR-003 (RN-02).

## Restrições de Escopo e Fidelidade Declarada

Estas restrições delimitam o escopo e tornam explícitas as fronteiras que os princípios
verificam.

- **Perdas de round-trip declaradas (ADR-002):** ordem de declaração e comentários `%%` são
  as **únicas** perdas aceitas no round-trip dos tipos de alvo pleno. Qualquer nova perda
  candidata (ex.: `classDef`/`style`, subgraphs, fragmentos de Sequence) MUST virar critério
  de aceite explícito na `plan.md` da fatia — nunca promessa vaga.
- **Regra "para os tipos compatíveis" (RN-03):** todo recurso de edição vale **apenas** onde
  o tipo de diagrama o suporta; a matriz recurso × tipo MUST ser explícita na spec.
- **Sequence à parte (ADR-001/ADR-002):** Sequence é o pior encaixe no modelo nós+arestas;
  sua fidelidade é declarada por fatia e PODE ser reduzida por decisão documentada.
- **Sem conversão entre tipos (RN-07):** os 5 tipos não são convertíveis entre si; trocar de
  tipo manualmente com conteúdo no canvas recomeça o diagrama.

## Fluxo de Desenvolvimento e Portões de Qualidade

- **Portões no CI:** cada princípio decidível MUST ter um portão automatizado — latência de
  prévia (I), round-trip por tipo (II), E2E por tipo (III), determinismo (IV), ausência de
  coordenadas no texto (V), isolamento do adaptador (VI), ausência de export de imagem (VII)
  e invariância de viewport (VIII). Falha em qualquer portão bloqueia o merge.
- **Fatia não fecha sem teste do tipo:** nenhuma fatia que declare suportar um tipo é
  concluída sem o teste de round-trip/E2E correspondente (mitiga o risco de fidelidade
  presumida de Class/State/ER e Sequence).
- **Mudança estrutural exige ADR:** qualquer decisão que altere um invariante desta
  constitution MUST ser registrada em `docs/adr/` antes de ser implementada.

## Governance

Esta constitution **supersede** quaisquer outras práticas em caso de conflito. Ela
regula o desenvolvimento do Editor Visual de Diagramas Mermaid e é insumo direto do
`Constitution Check` de cada `plan.md`.

- **Decidibilidade e rastreabilidade obrigatórias:** todo princípio MUST ter um critério
  objetivo de verificação (métrica/limiar ou teste automatizável) **e** citar sua origem
  (NFR-xx ou R x / ADR-00x). É **proibido** adicionar princípio genérico ou não decidível
  (ex.: "código limpo", "boas práticas", "performático") que não traga validador/limiar/teste
  e não rastreie a um NFR ou ADR.
- **Emendas:** alterações a princípios exigem (a) um ADR em `docs/adr/` justificando a
  mudança, (b) atualização desta constitution e (c) incremento de versão. Propagam-se aos
  templates dependentes (`plan-template`, `spec-template`, `tasks-template`) na mesma emenda.
- **Versionamento semântico:** **MAJOR** para remoção/redefinição incompatível de princípio
  ou governança; **MINOR** para novo princípio/seção ou expansão material de guia; **PATCH**
  para clarificações e ajustes não semânticos.
- **Conformidade:** toda spec, plan e PR MUST verificar a conformidade com estes princípios;
  violações não justificadas por ADR bloqueiam o merge.

**Version**: 1.0.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
