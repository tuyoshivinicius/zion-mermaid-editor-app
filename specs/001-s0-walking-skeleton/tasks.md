---
description: "Task list for Fatia S0 — Walking Skeleton (Flowchart Bidirecional)"
---

# Tasks: Fatia S0 — Walking Skeleton (Flowchart Bidirecional)

**Input**: Design documents from `/specs/001-s0-walking-skeleton/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (import-acl, generator, model-mutations)

**Tests**: INCLUDED. The constitution v1.0.0 defines 8 merge-blocking CI gates (perf, round-trip,
E2E, determinism, no-coordinates, ACL isolation, no-image-export, viewport invariance) and each
internal contract lists verifiable guarantees — so test tasks are first-class here, not optional.

**Organization**: Tasks are grouped by user story (US1 P1 → US2 P2 → US3 P3) so each story can be
implemented, tested, and demoed as an independent increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All file paths are relative to the repository root (single-project Vite SPA — ADR-004)

## Path Conventions

- **Single-project SPA (Vite)** — no `backend/`, no `app/`/`pages/` (no Next.js — ADR-004)
- Source at `src/`, tests at `tests/` from repository root
- Pure core in `src/core/` (model, mermaid-acl, generator, layout, slug); state in `src/state/`; UI in `src/components/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Bootstrap the Vite + React SPA host and the test/lint toolchain (one-time cost — ADR-004)

- [ ] T001 Scaffold Vite + React + TypeScript (strict) SPA at repository root per quickstart.md — create `index.html`, `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `src/main.tsx`; confirm NO `next`, `next.config.*`, `app/`, or `'use client'` exist (ADR-004)
- [ ] T002 Install runtime dependencies `@xyflow/react`, `mermaid`, `dagre`, `zustand` in `package.json`
- [ ] T003 [P] Configure Tailwind CSS 3 + PostCSS in `tailwind.config.ts`, `postcss.config.js`, and base styles in `src/styles/index.css`
- [ ] T004 [P] Initialize shadcn/ui (Vite preset) creating `components.json` and `src/components/ui/`, and add the `@` path alias to `tsconfig.json`, `tsconfig.app.json`, and `vite.config.ts` (3-file cost — ADR-004)
- [ ] T005 [P] Configure ESLint in `eslint.config.js` with `no-restricted-imports` blocking Mermaid internal API (`getDiagramFromText`, `diagram.db`, `mermaidAPI`) outside `src/core/mermaid-acl/` and blocking any `next/*` import (Gate VI + ADR-004)
- [ ] T006 [P] Configure Vitest + React Testing Library in `vitest.config.ts` with setup file `tests/setup.ts`
- [ ] T007 [P] Configure Playwright for E2E in `playwright.config.ts` (Chromium/Firefox/WebKit, clipboard permissions) targeting the Vite dev server

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared canonical core and app shell that BOTH the text→canvas (US1) and canvas→text (US2) paths build on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T008 Define canonical `GraphModel`, `Node`, `Edge`, `Subgraph`, and `StyleBlock` types (no coordinates/viewport fields — data-model.md) in `src/core/model/types.ts`
- [ ] T009 [P] Implement slug derivation (transliteration/removal to safe charset) + deterministic uniqueness suffix (`slug`, `slug-2`, … — FR-003) in `src/core/slug/index.ts`
- [ ] T010 [P] Unit test for slug + uniqueness (equal labels → distinct IDs, never merge nodes) in `tests/unit/slug.test.ts`
- [ ] T011 Implement dagre auto-layout `layout(model) → positions` (ephemeral, TD/LR via `rankdir`, subgraphs via `setParent`) behind a stable signature in `src/core/layout/index.ts` (Decisão A / Gate V)
- [ ] T012 Implement Zustand `editorStore` skeleton holding `model` (single source of truth), `editorText` overlay, `lastValidModel`, and `status` (`'ok' | 'uninterpretable' | 'unsupported-type'`) with no sync logic yet (data-model.md / Decisão B) in `src/state/editorStore.ts`
- [ ] T013 Create app shell: `src/App.tsx` two-pane layout (CodePanel | CanvasPanel placeholders) and wire `src/main.tsx` bootstrap (no `'use client'`, no `next/*`)
- [ ] T014 [P] Foundational contract-gate tests: grep repo for absence of `next/*`/`'use client'`/file-based routes (ADR-004) and absence of any PNG/SVG image-export route/button/API (Gate VII) in `tests/contract/no-nextjs.test.ts` and `tests/contract/no-image-export.test.ts`

**Checkpoint**: Canonical model, slug, layout, store, and shell exist — user stories can now begin

---

## Phase 3: User Story 1 - Ver a prévia a partir do código (Priority: P1) 🎯 MVP

**Goal**: Paste/type Mermaid Flowchart text and see the diagram render live on the canvas (text → canvas), tolerant of invalid input.

**Independent Test**: Paste a valid Flowchart and confirm the canvas shows the corresponding nodes and edges; alter the text and confirm the preview updates with no extra action; type invalid text and confirm the last valid preview stays plus a clear "não interpretável" indicator (never a broken screen).

### Tests for User Story 1 ⚠️ (write first, ensure they FAIL before implementation)

- [ ] T015 [P] [US1] Contract test for `importFlowchart` per import-acl.contract (neutral output, `unsupported-type` for non-Flowchart, `invalid` never throws, style blocks captured with `refIds`, no positions) in `tests/contract/import-acl.test.ts`
- [ ] T016 [P] [US1] Unit test: valid Flowchart text → correct `GraphModel` (nodes, edges, connectors, direction, subgraphs, preserved styles) in `tests/unit/import.test.ts`
- [ ] T017 [P] [US1] E2E: paste valid Flowchart → canvas shows nodes/edges; type new edge → live update without a button; rename label in text → canvas label changes; invalid input → last valid preview kept + indicator (Acceptance Scenarios 1–4); on a fresh session, paste invalid text as the very first input → canvas falls back to the empty state plus the same "não interpretável" indicator (Edge Cases / FR-012 first-entry fallback); paste a non-Flowchart diagram (e.g. `sequenceDiagram`) → distinct "apenas Flowchart suportado" message shown without attempting to render it (FR-006) in `tests/e2e/us1-preview.spec.ts`

### Implementation for User Story 1

- [ ] T018 [US1] Implement `importFlowchart(text): ImportResult` ACL — the ONLY module touching Mermaid internal API (`getDiagramFromText`/`diagram.db`), type detection → `unsupported-type`, best-effort → `invalid`, and lightweight textual pre-scan capturing opaque style blocks (`style`/`classDef`/`class`/`:::`/`linkStyle`) with `refIds` (Decisão D / FR-006/FR-012) in `src/core/mermaid-acl/index.ts`
- [ ] T019 [P] [US1] Contract-gate test: grep confirms ONLY `src/core/mermaid-acl/` references the Mermaid internal API (Gate VI) in `tests/contract/acl-isolation.test.ts`
- [ ] T020 [US1] Wire text→model path in `editorStore`: debounce input → `importFlowchart`; on success replace `model` + recompute layout + set `status:'ok'`; on failure keep `lastValidModel`/canvas + set `status` to `'invalid'` or `'unsupported-type'` per the ACL result and keep `editorText` overlay (Decisão B / FR-006/FR-012) in `src/state/editorStore.ts`
- [ ] T021 [P] [US1] Implement `FlowNode` custom node (rectangle, `tabIndex` focusable, `aria-label` = label) in `src/components/FlowNode.tsx`
- [ ] T022 [P] [US1] Implement `StatusRegion` (`role="status"` `aria-live="polite"`) announcing "texto não interpretável" (status `invalid`), a distinct "apenas Flowchart é suportado nesta fatia" message (status `unsupported-type`), and copy result, pt-BR strings (FR-006/FR-012/FR-014) in `src/components/StatusRegion.tsx`
- [ ] T023 [US1] Implement `CanvasPanel` React Flow wrapper (`nodesDraggable=false`, zoom/pan on) rendering `model` + dagre positions via `FlowNode` (FR-001/FR-013) in `src/components/CanvasPanel.tsx`
- [ ] T024 [US1] Implement `CodePanel` textarea bound to `editorText` overlay + "não interpretável" indicator wired to `StatusRegion` (FR-001/FR-002/FR-012) in `src/components/CodePanel.tsx`
- [ ] T025 [US1] Wire `App.tsx` to render `CodePanel | CanvasPanel` against `editorStore` so text edits drive the live preview end-to-end

**Checkpoint**: US1 is a usable live Flowchart visualizer — MVP ready to demo

---

## Phase 4: User Story 2 - Editar no canvas e sincronizar o código (Priority: P2)

**Goal**: Edit the diagram directly on the canvas (add/rename/connect/remove) and see deterministic Mermaid text rewritten; text edits still update the canvas; both stay synchronized without loops.

**Independent Test**: From a Flowchart on the canvas, add a node and connect it to an existing one using only the canvas; confirm the output code contains the new node and edge; then edit that code in the text and confirm the canvas reflects it — no conflict or unexpected overwrite. Generate repeatedly with no change → identical text each time.

### Tests for User Story 2 ⚠️ (write first, ensure they FAIL before implementation)

- [ ] T026 [P] [US2] Contract test for model mutations per model-mutations.contract (purity, slug/uniqueness, rename propagates to edges + style `refIds`, remove cleans incident edges + exclusive style refs, root-level, canvas defaults `rect`/`-->`) in `tests/unit/mutations.test.ts`
- [ ] T027 [P] [US2] Contract + determinism test for `generate` per generator.contract (N× byte-identical, no coordinates, header `flowchart <DIR>`, label quoting/escape, connector preserved, style blocks reemitted, no dangling refs) in `tests/unit/generator.test.ts`
- [ ] T028 [P] [US2] Round-trip tests in `tests/roundtrip/flowchart.test.ts` (Gate II / FR-007/FR-008/SC-003): (a) text-first — `generate(importFlowchart(t).model)` preserves 100% structural content, only admissible losses being declaration order and `%%` comments; (b) canvas-first (SC-003) — starting from an empty model, apply `addNode`+`connect` mutations, `generate` the result, then `importFlowchart` the generated text and assert the reimported model is structurally equivalent to the mutated model (reproduces the edited diagram exactly on reload)
- [ ] T029 [P] [US2] E2E: add node + connect via canvas → text rewritten with new node/edge; rename via canvas → text + style refs follow new ID; remove node via canvas → node and dependent edges gone; edit text after canvas edit → canvas reflects it; ALL five actions reachable keyboard-only (Acceptance Scenarios 1–5 / FR-014) in `tests/e2e/us2-sync.spec.ts`

### Implementation for User Story 2

- [ ] T030 [P] [US2] Implement pure model mutations `addNode`/`renameNode`/`connect`/`removeNode`/`removeEdge` (rename regenerates slug ID + rewrites edges & style `refIds`; remove discards exclusive style refs; stable canonical order — FR-003/FR-007) in `src/core/model/mutations.ts`
- [ ] T031 [P] [US2] Implement pure deterministic `generate(model): string` — stable ordering by insertion index, `flowchart <DIR>` header (`TD` default), label quoting/escape, exact connector variants, opaque style blocks reemitted with rewritten/dropped refs, no Mermaid dependency (Decisão D / FR-009/FR-010/FR-005) in `src/core/generator/index.ts`
- [ ] T032 [P] [US2] Contract-gate test: grep confirms generated text contains NO node coordinates (Gate V / FR-010) in `tests/contract/no-coordinates.test.ts`
- [ ] T033 [US2] Wire canvas→text path in `editorStore`: mutation → `generate(model)` → write `editorText` (replacing invalid overlay), with idempotency guard (skip re-set if byte-identical) and filtering of position/selection/dimension/viewport changes so they never mutate the model (Decisão B / FR-004/FR-013) in `src/state/editorStore.ts`
- [ ] T034 [P] [US2] Implement `Toolbar` (shadcn buttons) for "adicionar nó" and "modo conectar", Tab/Enter operable, pt-BR labels (FR-014) in `src/components/Toolbar.tsx`
- [ ] T035 [US2] Add canvas interactions in `CanvasPanel`: reinterpret React Flow `onConnect` as structural `connect`; Delete key → `removeNode`/`removeEdge` on focused element; Enter → inline rename; connect-mode (select source → target → confirm); filter out position/viewport node changes (Decisão B/E / FR-003) in `src/components/CanvasPanel.tsx`
- [ ] T036 [P] [US2] E2E viewport-invariance: generated text is byte-identical before/after zoom, pan, and code-panel collapse (Gate VIII / FR-013) in `tests/e2e/viewport-invariance.spec.ts`

**Checkpoint**: Bidirectional sync closed — US1 and US2 both work independently

---

## Phase 5: User Story 3 - Copiar o código final para uso externo (Priority: P3)

**Goal**: Copy the final Mermaid code in a single action with visual confirmation, falling back to manual selection if the clipboard write fails; the output renders on GitHub.

**Independent Test**: With a Flowchart on the canvas, trigger copy and confirm the clipboard holds exactly the Mermaid text shown in the editor; on failure the code stays selectable; a confirmation is announced.

### Tests for User Story 3 ⚠️ (write first, ensure they FAIL before implementation)

- [ ] T037 [P] [US3] E2E: single-action copy places editor text on the clipboard; on write failure the code remains selectable for manual copy; copy result announced via `StatusRegion` (Acceptance Scenarios 1–3 / FR-005/FR-014) in `tests/e2e/us3-copy.spec.ts`

### Implementation for User Story 3

- [ ] T038 [US3] Implement copy action in `CodePanel`: single-action clipboard write of `editorText`, failure fallback keeping text selectable, and success/failure announcement to `StatusRegion`, pt-BR strings (FR-005) in `src/components/CodePanel.tsx`
- [ ] T039 [P] [US3] E2E GitHub-render sanity: generated output parses/renders as valid current-stable Mermaid (Gate III / FR-005) in `tests/e2e/github-sanity.spec.ts`

**Checkpoint**: Full pipeline text ↔ canvas ↔ clipboard proven end-to-end for Flowchart

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Constitution gates and cross-cutting quality that span all stories

- [ ] T040 [P] Performance test: input→render p95 ≤ 150 ms at the 60-node / 90-edge ceiling (Gate I / Decisão C / SC-002) in `tests/perf/preview-latency.test.ts`
- [ ] T041 [P] Ephemeral-session test: reload/close loses uncopied work and the UI never implies anything was saved (FR-011/SC-007) in `tests/e2e/ephemeral.spec.ts`
- [ ] T042 [P] Audit/centralize pt-BR fixed strings (no i18n mechanism) across `src/components/` (spec Assumptions — idioma)
- [ ] T043 Run the quickstart.md manual validation flow (US1→US2→US3, incl. keyboard-only and viewport invariance) and record results
- [ ] T044 [P] Update `README.md` documenting scope (Flowchart only), how to run/test, and the ephemeral no-persistence behavior

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational
  - US1 (P1) is the MVP; US2 (P2) and US3 (P3) build on the same store/components
  - With staff, US1/US2/US3 can be parallelized after Foundational, but they touch shared files (`editorStore.ts`, `CanvasPanel.tsx`, `CodePanel.tsx`) — coordinate those
- **Polish (Phase 6)**: Depends on the user stories it validates

### User Story Dependencies

- **US1 (P1)**: Needs Foundational only. Delivers the text→canvas visualizer independently.
- **US2 (P2)**: Needs Foundational; logically completes US1's loop (canvas→text). Independently testable but shares `editorStore`/`CanvasPanel` with US1.
- **US3 (P3)**: Needs Foundational + valid generated text (produced by US1 import or US2 generator). Smallest, last link.

### Within Each User Story

- Tests are written FIRST and must FAIL before implementation (TDD)
- Pure core (mutations, generator, ACL) before store wiring before UI components
- Shared-file tasks (`editorStore.ts`, `CanvasPanel.tsx`, `CodePanel.tsx`) run sequentially, not [P]

### Parallel Opportunities

- Setup: T003–T007 all [P]
- Foundational: T009/T010 and T014 [P] (T008 model types first; T011/T012/T013 sequence into the store/shell)
- US1 tests T015–T017 [P]; components T021/T022 [P]; gate test T019 [P]
- US2 tests T026–T029 [P]; core impl T030/T031/T032 [P]; toolbar T034 and E2E T036 [P]
- US3: T037 and T039 [P]
- Polish: T040/T041/T042/T044 [P]

---

## Parallel Example: User Story 2

```bash
# Write all US2 tests together (they must fail first):
Task: "Contract test model mutations in tests/unit/mutations.test.ts"
Task: "Contract + determinism test generate in tests/unit/generator.test.ts"
Task: "Round-trip test in tests/roundtrip/flowchart.test.ts"
Task: "E2E canvas→text sync (keyboard-only) in tests/e2e/us2-sync.spec.ts"

# Then implement the pure core in parallel (different files):
Task: "Model mutations in src/core/model/mutations.ts"
Task: "Deterministic generator in src/core/generator/index.ts"
Task: "no-coordinates gate test in tests/contract/no-coordinates.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup
2. Phase 2: Foundational (CRITICAL — blocks all stories)
3. Phase 3: User Story 1 (text → live canvas preview)
4. **STOP and VALIDATE**: paste Flowchart, edit text, break the text → last valid preview + indicator
5. Demo the live visualizer

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → live Flowchart visualizer (MVP)
3. US2 → bidirectional canvas editing + deterministic generation
4. US3 → one-action copy for external use (README/PR/issue)
5. Polish → perf, ephemerality, pt-BR, docs gates

### Constitution Gate Coverage (merge-blocking)

- I  · perf ≤150 ms → T040
- II · round-trip 100% → T028
- III · E2E per type (Flowchart) → T017/T029/T039
- IV · determinism → T027
- V  · no coordinates / app layout → T032 (+ T011)
- VI · ACL isolation → T005/T019
- VII · no image export → T014
- VIII · viewport invariance → T036

---

## Notes

- [P] = different files, no dependencies on incomplete tasks
- [Story] label maps each task to US1/US2/US3 for traceability; Setup/Foundational/Polish carry no story label
- Verify each test fails before implementing (TDD)
- Commit after each task or logical group
- Stop at any checkpoint to validate a story independently
- Avoid: coordinates in generated text (V), Mermaid internal API outside the ACL (VI), any image-export path (VII), any Next.js artifact (ADR-004)
