# Zion Mermaid Editor — S0 Walking Skeleton

A two-pane editor for **Mermaid Flowchart** diagrams: paste or type Mermaid text and see it live
on an editable canvas; edit the canvas and get deterministic Mermaid text back. Copy the result in
one action for use elsewhere (GitHub, PRs, issues, docs).

## Scope of this slice (S0)

This is a **walking skeleton** — a thin, complete pipeline for **one diagram type only**:

- **Supported**: Mermaid **Flowchart** (`flowchart`/`graph`), both directions the parser
  understands, node shapes, edge connector variants, subgraphs (import-only), and opaque
  `style`/`classDef`/`class`/`:::`/`linkStyle` blocks.
- **Not supported in S0**: Class, State, Sequence, and ER diagrams — pasting one shows a distinct
  "apenas Flowchart é suportado nesta fatia" message rather than attempting to render it.
- **No image export.** The only output is Mermaid text (copy to clipboard); there is no PNG/SVG
  export path.
- **No persistence.** The session is fully ephemeral — see [Ephemeral session](#ephemeral-session)
  below.

## Architecture (one sentence)

An in-memory canonical `GraphModel` is the single source of truth; **import** (Mermaid text →
model) is confined to an anticorruption layer around Mermaid's internal parser API
(`src/core/mermaid-acl/`); **export** (model → Mermaid text) is our own deterministic generator
(`src/core/generator/`) with no Mermaid dependency; **layout** is recomputed by the app (dagre) and
never serialized; sync between the text and canvas panels is unidirectional by edit origin, so it
can't form a loop (see `src/state/editorStore.ts`).

## Requirements

- Node 20 LTS
- A modern desktop browser (Chromium, Firefox, or WebKit) — mouse + keyboard; touch/mobile is out
  of scope for S0.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
npm run preview  # preview the production build
```

## Test

```bash
npm test              # Vitest: unit, contract, round-trip, perf
npm run test:e2e      # Playwright: US1-US3, clipboard, keyboard-only, viewport invariance
npm run test:perf     # Vitest: p95 input->render latency at the 60-node/90-edge ceiling
npm run lint           # ESLint, incl. the Mermaid-internal-API isolation gate
```

The first `npm run test:e2e` run needs browser binaries once: `npx playwright install chromium`
(add `firefox webkit` too to run the full cross-browser matrix).

### Constitution gates (merge-blocking)

| Gate | What it checks | Where |
|------|-----------------|-------|
| I — live preview ≤150ms | p95 input→model+layout at 60 nodes/90 edges | `tests/perf/` |
| II — round-trip fidelity | Flowchart content survives text→model→text and model→text→model | `tests/roundtrip/` |
| III — E2E per type (Flowchart only in S0) | Full pipeline, incl. rendering with the real Mermaid engine | `tests/e2e/` |
| IV — deterministic generation | `generate()` is byte-identical across N calls | `tests/unit/generator.test.ts` |
| V — no coordinates / app-owned layout | Generated text has no node coordinates | `tests/contract/no-coordinates.test.ts` |
| VI — Mermaid internal API isolation | Only `src/core/mermaid-acl/` touches Mermaid's internal API | `tests/contract/acl-isolation.test.ts` + ESLint |
| VII — no image export | No PNG/SVG export route/button/dependency | `tests/contract/no-image-export.test.ts` |
| VIII — viewport never serializes | Generated text is identical before/after zoom/pan | `tests/e2e/viewport-invariance.spec.ts` |
| ADR-004 — no Next.js | No `next/*`/`'use client'`/file-based routes | `tests/contract/no-nextjs.test.ts` + ESLint |

## Ephemeral session

There is **no backend and no persistence** (ADR-003). Everything lives in memory for the
lifetime of the browser tab:

- Reloading or closing the page **loses any uncopied work** — there is no autosave, no
  `localStorage`/`sessionStorage`/IndexedDB use, and no "saved" indicator anywhere in the UI.
- The only way to keep your work is the **Copiar** button, which puts the current Mermaid text on
  the clipboard for you to paste elsewhere.

## Project layout

```
src/
├── core/
│   ├── model/          # GraphModel types + pure mutations (add/rename/connect/remove)
│   ├── mermaid-acl/     # ONLY module that touches Mermaid's internal parser API
│   ├── generator/       # generate(model) — deterministic, no Mermaid dependency
│   ├── layout/          # dagre auto-layout -> ephemeral positions
│   └── slug/            # node id derivation + uniqueness
├── state/editorStore.ts # Zustand store: model (source of truth) + editorText overlay + status
└── components/          # CodePanel, CanvasPanel, FlowNode, Toolbar, StatusRegion

tests/
├── unit/        # generator determinism, slug/uniqueness, mutations
├── roundtrip/   # text<->model<->text structural fidelity
├── contract/    # grep/lint gates (ACL isolation, no coordinates, no Next.js, no image export)
├── perf/        # p95 latency at the declared node/edge ceiling
└── e2e/         # Playwright: US1-US3, keyboard-only, viewport invariance, GitHub render sanity
```

See `specs/001-s0-walking-skeleton/` for the full spec, plan, and task breakdown.
