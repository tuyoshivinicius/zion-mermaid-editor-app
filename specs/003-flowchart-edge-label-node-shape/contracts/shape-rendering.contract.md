# Contract: Desenho dos 14 formatos + caixa efêmera

Módulos: `src/components/FlowNode.tsx` (aditivo), `src/core/layout/index.ts` (aditivo),
`src/core/layout/shape-geometry.ts` (novo).

## SH1 — Os 14 formatos são desenhados e distintos (FR-006 / SC-004)
- `FlowNode` recebe `shape` no `data` e desenha cada um dos 14 formatos de `SHAPE_DELIMITERS`.
- Formatos diferentes são **visualmente distintos** entre si (clip-path/borda/SVG conforme a
  geometria). O nó `Aprovado?` do starter é desenhado como **losango** (SC-012).
- **Proxy de distinção testável (SC-004).** "Visualmente distinto" é aferido, não por julgamento
  visual, mas por marcador estrutural determinístico no DOM: `FlowNode` MUST emitir, no elemento
  raiz do nó, um atributo **`data-shape`** cujo valor é a chave do formato (uma das 14 de
  `SHAPE_DELIMITERS`), **par** do `data-selected` de FR-002c. O teste de distinção afirma que os
  **14** valores de `data-shape` são dois-a-dois distintos **e** que a forma geométrica de fato
  difere (o `clip-path`/`border-radius`/SVG computado não é idêntico entre formatos de família
  diferente — p. ex. `diamond` tem `clip-path` de polígono onde `rect` não tem). O atributo é
  estado só-de-UI e efêmero (RN-02): MUST NOT alcançar o texto gerado (SH4).

## SH2 — Paridade canvas ↔ código passa a incluir formato (FR-006)
- O que o modelo carrega em `Node.shape` é o que o canvas desenha. Formato importado fora dos 14 é
  normalizado para retângulo por `normalizeImportedShape` (regra de S0), e o canvas desenha o
  retângulo que o modelo de fato carrega — sem caminho especial novo.

## SH3 — Caixa determinística sensível ao formato (FR-006a)
- `shapeSize(shape) → {width,height}` é **pura e determinística** (sem `Date`/random/iteração
  instável). `rect` preserva 172×40; formatos que precisam de razão para legibilidade recebem
  dimensão deterministicamente maior; shape desconhecido cai no default.
- É consumida por `layout/index.ts` (entrada do dagre) **e** por `CanvasPanel` (tamanho do nó React
  Flow), que MUST usar o **mesmo** valor; `FlowNode` preenche a caixa.

## SH4 — Nenhuma dimensão/coordenada alcança o texto (Princípio V / SC-009)
- `shape-geometry.ts` MUST NOT ser importada por `src/core/generator/` nem `src/core/mermaid-acl/`.
- `generate` e `importFlowchart` ficam **byte-idênticos** ao de S0.
- Garantia executável: `tests/contract/no-coordinates.test.ts` permanece verde **sem edição**.

## SH5 — Posição continua do auto-layout (RN-04 / ADR-003)
- A dimensão sensível ao formato altera o tamanho da caixa, **não** transfere ao usuário o controle da
  posição. A assinatura `layout(model) → posições` não muda; posições seguem efêmeras.
