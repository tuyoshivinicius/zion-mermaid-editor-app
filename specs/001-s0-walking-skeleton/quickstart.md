# Quickstart — S0 Walking Skeleton

Bootstrap do host **Vite + React (SPA) + shadcn/ui + Tailwind** (ADR-004). **Não** usar Next.js: nenhum
`'use client'`, `next/*`, roteamento por arquivo ou server component pode aparecer no código.

## Pré-requisitos

- Node 20 LTS + pnpm (ou npm)
- Navegador desktop moderno (Chromium/Firefox/WebKit)

## Scaffolding (custo único — ADR-004)

```bash
# 1. Projeto Vite + React + TypeScript
pnpm create vite@latest . --template react-ts

# 2. Tailwind (instalação à parte é o custo único documentado do host Vite)
pnpm add -D tailwindcss postcss autoprefixer && pnpm dlx tailwindcss init -p

# 3. shadcn/ui (guia oficial Vite; configura components.json)
pnpm dlx shadcn@latest init      # escolher preset Vite

# 4. Dependências de runtime da fatia
pnpm add @xyflow/react mermaid dagre zustand

# 5. Alias @ em tsconfig.json, tsconfig.app.json e vite.config.ts (3 arquivos — custo único ADR-004)
```

> Após o `init`, confirmar que **não** há `next`, `next.config.*`, `app/` nem `'use client'` no projeto.

## Estrutura de núcleo a criar

```
src/core/model/        # GraphModel + mutações puras (contracts/model-mutations)
src/core/mermaid-acl/  # importFlowchart — ÚNICO a tocar a API interna do Mermaid (contracts/import-acl)
src/core/generator/    # generate(model) determinístico (contracts/generator)
src/core/layout/       # dagre → posições efêmeras
src/core/slug/         # slug + unicidade determinística
src/state/editorStore.ts  # Zustand: model (SoT) + editorText overlay + status (Decisão B)
```

## Rodar

```bash
pnpm dev        # SPA em http://localhost:5173
pnpm build      # build de produção (Vite)
```

## Testes e portões de constitution

```bash
pnpm test           # Vitest: unit (determinismo/slug/mutações) + roundtrip
pnpm test:e2e       # Playwright: US1/US2/US3, clipboard, teclado/a11y, invariância viewport, sanity GitHub
pnpm lint           # ESLint incl. no-restricted-imports (portão VI + proibição Next.js)
pnpm test:perf      # p95 input→render ≤150 ms no teto 60 nós / 90 arestas (Princípio I)
```

Portões que **bloqueiam merge** (um por princípio decidível):

| Princípio | Portão | Local |
|-----------|--------|-------|
| I  · prévia ≤150 ms | perf p95 no teto 60/90 | `tests/perf/` |
| II · round-trip 100% Flowchart | conteúdo order-insensitive; perdas só ordem+`%%` | `tests/roundtrip/` |
| III · E2E por tipo (só Flowchart em S0) | E2E do pipeline completo | `tests/e2e/` |
| IV · determinismo | N gerações byte-idênticas | `tests/unit/` |
| V  · sem coordenadas / layout da app | grep no texto gerado | `tests/contract/` |
| VI · ACL isolada | lint/grep: só o adaptador toca a API interna | `tests/contract/` + ESLint |
| VII · sem export de imagem | grep: nenhuma rota/botão PNG/SVG | `tests/contract/` |
| VIII · viewport não serializa | gerar antes/depois de zoom/pan/colapso: idêntico | `tests/e2e/` |
| ADR-004 · sem Next.js | grep: nenhum `'use client'`/`next/*`/rota por arquivo | `tests/contract/` + ESLint |

## Fluxo de validação manual (US1→US2→US3)

1. Colar um Flowchart Mermaid válido → canvas exibe nós/arestas (US1).
2. Digitar nova aresta no texto → prévia atualiza sem botão (US1).
3. Adicionar nó + conectar **pelo canvas** (só teclado também) → texto reescrito, determinístico (US2/FR-014).
4. Renomear nó pelo canvas → texto e refs de estilo acompanham o novo ID (US2).
5. Alterar zoom/pan/colapso → texto idêntico (VIII).
6. Copiar em uma ação → confirmação anunciada; colar no GitHub renderiza (US3/FR-005).
7. Digitar texto inválido → última prévia válida mantida + indicador “não interpretável” (FR-012).
