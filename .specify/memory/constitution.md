<!--
Sync Impact Report — Constitution v1.0.0
=========================================
Version change: (template, unversioned) → 1.0.0
Bump rationale: MAJOR — first ratified constitution; all template placeholders
  replaced with 7 project-specific, testable principles derived from PRD NFRs and ADR restrictions.

Principles defined (7, one per NFR-01…04 and per restriction R1/R2/R3):
  - I.   Latência da Prévia Ao Vivo            (anchor: NFR-01)
  - II.  Fidelidade de Round-trip por Tipo     (anchor: NFR-02, R2)
  - III. Cobertura dos 5 Tipos — Sequence à Parte (anchor: NFR-03)
  - IV.  Determinismo Bit-a-Bit da Geração     (anchor: NFR-04, R2)
  - V.   Grafo Editável Separado do SVG        (anchor: R1)
  - VI.  Camada de Adaptação Isolada do Mermaid (anchor: R2)
  - VII. Texto Mermaid Única Fonte da Verdade  (anchor: R3)

Sections:
  - Added: "Perdas Aceitas & Fronteiras Declaradas" (SECTION_2)
  - Added: "Quality Gates (Portões de Verificação)" (SECTION_3)
  - Added: "Governance"

Templates requiring updates:
  - ✅ .specify/templates/plan-template.md — "Constitution Check" reads gates dynamically; compatible, no edit needed
  - ✅ .specify/templates/spec-template.md — no hardcoded principle references; compatible
  - ✅ .specify/templates/tasks-template.md — no hardcoded principle references; compatible
  - ✅ .specify/templates/checklist-template.md — generic; compatible

Follow-up TODOs:
  - None. RATIFICATION_DATE set to 2026-07-13 (first adoption).
  - Open PRD clarifications (Sequence fidelity target, diagram size limit for NFR-01,
    rich-style scope) resolve into per-slice plan.md thresholds, not constitution amendments.
-->

# Editor Visual de Diagramas Mermaid Constitution

## Core Principles

Todo princípio abaixo é **testável** (responde "cumpre / não cumpre" sem julgamento
subjetivo) e rastreia explicitamente ao menos um NFR ou uma restrição de ADR. A stack
(linguagem, framework, biblioteca) não é objeto desta constitution — vive no `plan.md`.

### I. Latência da Prévia Ao Vivo
A prévia do diagrama MUST atualizar em **≤ 150 ms** após a digitação/edição do código ou
da manipulação no canvas, para o tamanho-limite de diagrama declarado no `plan.md` da fatia.

- **Critério objetivo:** teste de performance mede o intervalo edição → prévia renderizada;
  o **p95 ≤ 150 ms** cumpre, qualquer valor acima **não cumpre**. O limite de nós usado na
  medição é fixado no `plan.md` (resolve a questão aberta de tamanho da PRD §11).
- **Âncora:** NFR-01.

### II. Fidelidade de Round-trip por Tipo
Para **Flowchart, Class, State e ER**, o ciclo canvas → Mermaid → canvas MUST preservar
**100% do conteúdo estrutural** — nós, arestas, rótulos, shapes, subgraphs e estilos
serializáveis —, medido por **conteúdo e insensível à ordem**.

- **Critério objetivo:** existe um teste de round-trip **por tipo** que compara o modelo
  estrutural antes/depois; igualdade de conteúdo = 100% cumpre, qualquer divergência não
  coberta pelas exceções abaixo não cumpre.
- **Perdas aceitas (exceções declaradas, NÃO violação):** **ordem de declaração** e
  **comentários `%%`** (ADR-002). Divergência restrita a estas duas dimensões cumpre.
- **Âncora:** NFR-02, R2.

### III. Cobertura dos 5 Tipos — Sequence à Parte
Os **5 tipos** (Flowchart, Class, State, Sequence, ER) MUST ser editáveis e sincronizáveis
ponta-a-ponta pela UI. **Sequence** tem alvo de fidelidade **declarado à parte** e MAY ter
escopo reduzido; NÃO é aferido pelo limiar de 100% do Princípio II.

- **Critério objetivo:** matriz de cobertura com um teste de edição+sincronização para cada
  tipo (**5/5** presentes cumpre; qualquer tipo sem teste não cumpre). Sequence tem seu
  próprio limiar de fidelidade declarado no `plan.md` da fatia e testado separadamente.
- **Âncora:** NFR-03 (ADR-001/ADR-002 para o tratamento à parte de Sequence).

### IV. Determinismo Bit-a-Bit da Geração
A geração de Mermaid a partir do modelo de grafo MUST ser **determinística**: a mesma
entrada produz **saída byte-idêntica**, independente de execução, ordem de iteração ou
ambiente.

- **Critério objetivo:** teste que gera a saída **N vezes** (N ≥ 2) a partir da mesma
  entrada e compara **byte a byte** (hash idêntico) cumpre; qualquer diferença de bytes não
  cumpre.
- **Âncora:** NFR-04, R2.

### V. Grafo Editável Separado do SVG
O canvas de edição MUST operar sobre um **modelo de grafo editável dedicado**, distinto do
**SVG de saída** do Mermaid; o **layout dos nós é calculado pela aplicação** e nenhuma
coordenada de nó é lida ou escrita no texto Mermaid.

- **Critério objetivo:** (a) o caminho de edição não usa o SVG do Mermaid como modelo (sem
  DOM-scraping de posição para editar); (b) teste que verifica que a saída Mermaid **não
  contém coordenadas de nó**; (c) as posições provêm do layout da aplicação. Todas cumprem
  ou não cumpre.
- **Âncora:** R1 (ADR-001).

### VI. Camada de Adaptação Isolada do Mermaid
Toda dependência da **API interna/depreciada** do Mermaid (ex.: `getDiagramFromText` /
`diagram.db`) MUST ficar confinada a uma **única camada de adaptação (anticorrupção)**,
isolada e substituível; nenhum outro módulo importa essa API.

- **Critério objetivo:** verificação de fronteira de dependência (lint/teste de imports) que
  falha se qualquer import da API interna do Mermaid ocorrer **fora** do módulo adaptador
  designado; contagem de imports externos = **0** cumpre, ≥ 1 não cumpre.
- **Âncora:** R2 (ADR-002).

### VII. Texto Mermaid Única Fonte da Verdade
Nenhum estado necessário para reproduzir o diagrama MUST viver fora do **texto Mermaid
exportável**. Viewport (zoom, pan, colapso de painel) e posição de nó são **efêmeros** e
NUNCA entram na saída. O buffer de recuperação local é efêmero e **não** é formato de
persistência.

- **Critério objetivo:** (a) teste que a saída copiada é **100% texto Mermaid válido** e
  **0** artefatos/formatos proprietários; (b) nenhum campo de viewport ou coordenada aparece
  na saída; (c) a única saída persistida/copiável é o texto Mermaid. Todas cumprem ou não
  cumpre.
- **Âncora:** R3 (ADR-003).

## Perdas Aceitas & Fronteiras Declaradas

Estas são exceções e limites **declarados**, não violações. Divergência restrita a este
escopo não reprova um gate:

- **Ordem de declaração** do Mermaid pode não sobreviver ao round-trip (cosmético, não muda
  o diagrama renderizado) — exceção do Princípio II (ADR-002).
- **Comentários `%%`** podem ser perdidos na normalização; a postura é **preservar-e-avisar**
  (reancorar quando possível, sinalizar ao usuário), nunca sobrescrever em silêncio — exceção
  do Princípio II (ADR-002; RF-16).
- **Estilos ricos** (`classDef`/`style`) só sobrevivem se **serializáveis no Mermaid**; o que
  não couber no texto é efêmero por definição (ADR-003) — o escopo serializável exato é
  fixado no `plan.md` da fatia (questão aberta da PRD §11).
- **Layout pode "saltar"** entre edições por ser recalculado — limite aceito (ADR-003);
  mitigável com layout estável, não é reprovação de gate.
- **Sequence** pode ter fidelidade reduzida e escopo fatiado por último — Princípio III.

## Quality Gates (Portões de Verificação)

Todo `plan.md` MUST declarar, no "Constitution Check", quais gates a fatia exerce e como.
Cada princípio é coberto por um gate objetivo:

| Princípio | Âncora | Gate que o cobra |
|-----------|--------|------------------|
| I. Latência da Prévia | NFR-01 | Performance gate: p95 edição→prévia ≤ 150 ms no tamanho-limite |
| II. Round-trip por Tipo | NFR-02, R2 | Suíte de round-trip por tipo (Flowchart/Class/State/ER), com exceções declaradas |
| III. Cobertura dos 5 Tipos | NFR-03 | Matriz de cobertura 5/5; teste de fidelidade separado para Sequence |
| IV. Determinismo | NFR-04, R2 | Teste de geração N× com comparação byte a byte (hash) |
| V. Grafo × SVG / Layout | R1 | Arch boundary check: sem coordenada de nó na saída; layout pela app |
| VI. Camada de Adaptação | R2 | Import-boundary lint: 0 imports da API interna do Mermaid fora do adaptador |
| VII. Fonte da Verdade | R3 | Output-purity test: saída 100% Mermaid válido, 0 estado efêmero/proprietário |

Um gate reprovado bloqueia a conclusão da fatia. Perdas aceitas listadas na seção anterior
não contam como reprovação.

## Governance

Esta constitution **supera** outras práticas quando houver conflito; instruções explícitas
do usuário (CLAUDE.md, pedidos diretos) têm precedência sobre esta constitution.

- **Rastreabilidade obrigatória:** todo princípio MUST ancorar em pelo menos um `NFR-xx` ou
  uma restrição `Rn` da PRD/ADR. Princípio sem âncora é inválido e não pode ser adicionado.
- **Sem princípio genérico:** enunciados vagos ("código limpo", "boas práticas",
  "performático") são proibidos; todo princípio carrega validador, limiar numérico ou teste.
- **Emendas:** exigem (a) atualização deste arquivo com Sync Impact Report, (b) incremento de
  versão semântica, e (c) âncora em NFR/ADR novo ou revisado. Mudança de restrição estrutural
  exige ADR correspondente antes da emenda.
- **Versionamento:** MAJOR = remoção/redefinição incompatível de princípio ou governança;
  MINOR = novo princípio/seção ou expansão material; PATCH = clarificação/redação sem efeito
  semântico.
- **Conformidade:** todo PR/revisão e todo `plan.md` MUST verificar os Quality Gates acima;
  violações sem exceção declarada bloqueiam merge. Complexidade adicional deve ser justificada
  contra o princípio que tensiona.

**Version**: 1.0.0 | **Ratified**: 2026-07-13 | **Last Amended**: 2026-07-13
