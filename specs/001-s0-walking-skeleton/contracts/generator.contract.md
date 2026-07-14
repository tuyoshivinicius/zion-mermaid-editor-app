# Contrato — Gerador Determinístico de Export (`src/core/generator/`)

Função **pura**, **sem dependência do Mermaid** — o valor central sob nosso controle (Princípios IV/II, ADR-002).

## Interface

```ts
export function generate(model: GraphModel): string;   // modelo → texto Mermaid Flowchart
```

## Garantias (verificáveis)

- **G1 — Determinismo byte-a-byte (Princípio IV / FR-009):** `generate(m)` chamado N vezes sobre o mesmo `m`
  produz string idêntica. Proibido `Date`, `Math.random`, iteração instável de `Map`/`Set`. Ordenação por índice
  de inserção canônico do modelo. Portão: `tests/unit/` determinismo.
- **G2 — Invariância de viewport (Princípio VIII / FR-013):** a saída não depende de zoom/pan/colapso (esses nem
  entram no modelo). Portão: `tests/e2e/` gera antes/depois e exige igualdade byte-a-byte.
- **G3 — Sem coordenadas (Princípio V / FR-010):** nenhuma coordenada de nó aparece no texto. Emite
  `flowchart <DIR>` com a direção do modelo (`TD` padrão). Portão: grep em `tests/contract/`.
- **G4 — Rótulos sempre válidos (FR-003):** aplica aspas/escape quando o rótulo contém `[]{}()`, `|`, `#`, `;`,
  aspas ou quebras de linha; a saída é sempre Mermaid válido.
- **G5 — Conector preservado (FR-007):** cada aresta emite sua `connector` exata (`-->`,`---`,`-.->`,`==>`,
  `--o`,`--x`); arestas criadas no canvas usam `-->`.
- **G6 — Estilos e refs (FR-003/FR-007):** reemite `StyleBlock`s em ordem estável; sem referências de ID pendentes
  (rename reescreve, remove descarta).
- **G7 — Compatibilidade GitHub (FR-005):** alvo Mermaid estável atual; a saída **renderiza no GitHub**. Portão:
  sanity em `tests/e2e/`.
- **G8 — Round-trip 100% (Princípio II / FR-007/FR-008):** `generate(importFlowchart(t).model)` preserva 100% do
  conteúdo estrutural; únicas perdas admissíveis e **declaradas**: ordem de declaração e comentários `%%`. Portão:
  `tests/roundtrip/` order-insensitive.
