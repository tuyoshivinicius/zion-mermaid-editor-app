# Quickstart — Fatia S2 (Rótulo de Conexão e Formato de Nó)

Pré-requisitos: Node 20 LTS. A stack (Vite + React + shadcn/Tailwind + React Flow + Zustand) é a de
S0/S1 — **inalterada**. A única dependência nova é `@radix-ui/react-select` (Decisão O).

## Instalar e rodar

```bash
npm install          # instala também @radix-ui/react-select (Decisão O)
npm run dev          # SPA em http://localhost:5173
```

Ao abrir, o starter aparece com o nó `Aprovado?` **desenhado como losango** (novidade de S2, SC-012).

## Exercitar as duas edições

1. **Rótulo de conexão (US1):** clique (ou dê Tab até) uma conexão → o painel de propriedades mostra o
   campo de rótulo → escreva `Sim`; a linha da aresta no código vira `-->|Sim|` no mesmo instante.
   Apague o texto → a linha volta a não ter `|...|`.
2. **Formato de nó (US2/US3):** clique (ou Tab até) um nó → o painel mostra o seletor de formato com o
   formato **atual** → escolha `losango`; o canvas redesenha e a linha do nó vira `{...}`. Só a linha
   do nó muda; nenhuma aresta é reescrita.
3. **Seleção por teclado:** Tab move o foco entre nós/arestas — focar já seleciona e reflete no painel;
   a seleção **persiste** ao entrar no painel para editar. `Escape` (fora de rename) ou clique no vazio
   desfazem a seleção.

## Rodar os testes e portões

```bash
npm run test                 # Vitest: unidade, round-trip, contratos
npm run test:e2e             # Playwright: US1–US3, seleção, keyboard-only
npm run test:e2e:perf        # portão de boot de 1 s de S1 (inalterado)
npm run lint                 # no-restricted-imports (ACL/Next.js), etc.
```

### Portões que S2 estende ou adiciona
- **SC-006 (round-trip 14 formatos + rótulo)** — `tests/roundtrip/shapes-labels.test.ts` (novo). Inclui
  a asserção **explícita** da exceção de aspas (FR-015), que **não** é consertada aqui.
- **SC-007 / SC-009 (determinismo + invariância de seleção)** — `tests/unit/shape-generation.test.ts`.
- **FR-004a/004b/005a (normalização + escopo das mutações)** — `tests/unit/mutations-label-shape.test.ts`.
- **FR-002a/013 (reconciliação da seleção)** — `tests/unit/selection.test.ts`.
- **FR-003/012 (painel + nomes acessíveis)** — `tests/unit/properties-panel.test.tsx`.

### Portões herdados que MUST permanecer verdes por construção
- `tests/contract/no-coordinates.test.ts` — **nenhuma dimensão** da caixa sensível ao formato alcança
  o texto (Princípio V / FR-006a). É o portão-chave desta fatia.
- `tests/contract/acl-isolation.test.ts`, `no-image-export.test.ts`, `no-nextjs.test.ts` — inalterados.
- `tests/roundtrip/flowchart.test.ts`, `tests/perf/*`, `tests/unit/mutations.test.ts` — inalterados
  (gerador/ACL/5 mutações byte-idênticos).

### Emendas autorizadas (FR-010a — exatamente duas, em `tests/e2e/starter.spec.ts`)
- caso do nó de decisão: reapontado para afirmar **losango** (era "renderizado igual a todo nó").
- caso SC-011: asserção página-inteira **estreitada** para "sem escolha de *template*" (o seletor de
  formato adota `role` combobox/listbox). A verificação do conjunto de controles da toolbar permanece.

Um **terceiro** teste de S0/S1 que quebre é sinal de premissa falha ⇒ decisão explícita, nunca emenda
até o verde.
