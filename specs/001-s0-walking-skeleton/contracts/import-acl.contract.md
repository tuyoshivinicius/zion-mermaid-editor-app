# Contrato — Camada Anticorrupção de Import (`src/core/mermaid-acl/`)

**Única** fronteira autorizada a tocar a API interna/depreciada do Mermaid (Princípio VI / ADR-002).

## Interface

```ts
// ÚNICO módulo do repo que pode importar mermaid internal API (getDiagramFromText / diagram.db).
export function importFlowchart(text: string): ImportResult;

export type ImportResult =
  | { ok: true;  model: GraphModel }
  | { ok: false; reason: 'invalid' | 'unsupported-type' };
```

## Garantias (verificáveis)

- **G1 — Isolamento (Princípio VI):** nenhum arquivo fora deste módulo referencia `getDiagramFromText`,
  `mermaidAPI`, `diagram.db`, `getVertices`, `getEdges`, `getSubGraphs`, `getClasses`. Portão: ESLint
  `no-restricted-imports` + grep de CI (`tests/contract/`).
- **G2 — Saída neutra:** o retorno só contém `GraphModel` (tipos próprios). Nenhum tipo do Mermaid vaza.
- **G3 — Só Flowchart (FR-006):** entrada de outro tipo → `{ ok:false, reason:'unsupported-type' }`; nunca
  tenta renderizar como Flowchart.
- **G4 — Best-effort (FR-012):** texto inválido/incompleto → `{ ok:false, reason:'invalid' }`; nunca lança para
  a UI, nunca quebra a tela.
- **G5 — Estilos opacos (FR-007):** captura `style`/`classDef`/`class`/`:::`/`linkStyle` como `StyleBlock` com
  `refIds` corretos (via pré-scan textual, já que o DB não os expõe integralmente).
- **G6 — Sem posição (Princípio V):** não lê coordenadas do SVG; posição é responsabilidade do `core/layout/`.
- **G7 — Substituível:** trocar a implementação interna não altera assinatura nem o núcleo (a fragilidade da API
  depreciada fica contida aqui).
