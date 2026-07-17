# Specification Quality Checklist: Fatia S2 — Rótulo de Conexão e Formato de Nó no Flowchart

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-15
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain
- [X] Requirements are testable and unambiguous
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic (no implementation details)
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

### Sobre o critério "no implementation details"

Esta spec cita nomes de arquivo, símbolos e valores do código entregue (`SHAPE_DELIMITERS`,
`Edge.label`, `Node.shape`, `CanvasPanel`, `172×40`). Isso é **deliberado e segue o estilo já
praticado em S0 e S1**, cujas specs fazem o mesmo (ver FR-014a e a seção Assumptions de S1, que
enumera arquivos e cita comentários do código). A razão: esta fatia edita construtos que **já
existem no código entregue**, e uma afirmação como "o canvas não desenha o formato" só é verificável
se disser onde foi verificada. Nenhuma dessas citações **escolhe** stack, biblioteca ou desenho de
solução — a stack permanece fixada pelos planos de S0/S1, e as decisões de *como* (geometria do
losango, mecanismo de seleção, forma do seletor) são explicitamente delegadas ao plano (FR-006a).

O prompt de origem pedia "não cite linguagem, framework nem bibliotecas". A spec não cita nenhuma
linguagem nem escolhe biblioteca alguma; menciona React Flow **uma vez** (FR-003/Assumptions) como
citação do comentário de S0 que justifica a decisão de superfície — é o registro de uma restrição
descoberta, não uma escolha de stack.

### Verificações executadas contra o código (não presumidas)

- Os **14** formatos de `SHAPE_DELIMITERS` sobrevivem ao ciclo `generate` → `importFlowchart`:
  14/14 OK (probe executado nesta sessão).
- Rótulos de aresta com `|`, `[`, `{`, `(`, `;`, `#` sobrevivem ao ciclo; `a|b` sai como `-->|"a|b"|`.
- Rótulos contendo `"` **não** sobrevivem (`a"b` → `aﬂ°quot¶ßb`) — defeito **pré-existente de S0**,
  já alcançável pelo rename de nó, declarado fora de escopo (FR-015).
- `CanvasPanel` já exibe rótulo de aresta; `FlowNode` nunca recebe `shape`.
- As 5 mutações de S0 não escrevem `Edge.label` nem `Node.shape` — daí FR-010 admitir tocar
  `src/core/`.
- `tests/contract/no-template-selector.test.ts` **não** é afetado por um seletor de formato (seus
  padrões exigem a palavra *template* adjacente).
- Duas asserções de `tests/e2e/starter.spec.ts` colidem com esta fatia (FR-010a) — uma certamente
  ("FR-002a … rendered identically"), outra condicionalmente ("SC-011", que proíbe
  listbox/combobox/menu na página inteira).

### Itens para o plano confrontar

- **Geometria × layout fixo**: o layout de S0 usa caixa fixa de 172×40 para todo nó. Desenhar 14
  formatos legíveis nessa caixa é uma tensão real; a spec delega a decisão ao plano exigindo apenas
  determinismo (NFR-04) e efemeridade (RN-02) — FR-006a.
- **Papel do seletor de formato**: se ele adotar `listbox`/`combobox`/`menu`, a asserção SC-011 de
  S1 precisa ser estreitada (FR-010a). A condição deve ser **verificada**, não presumida.
