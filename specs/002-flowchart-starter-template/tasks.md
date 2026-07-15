---
description: "Task list for S1 — Flowchart starter template"
---

# Tasks: Fatia S1 — Template Starter de Flowchart

**Input**: Design documents from `/specs/002-flowchart-starter-template/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — this feature explicitly requires them. FR-015 mandates that starter validity be
guaranteed *at test time only* (no runtime check, no fallback); SC-012 mandates an automated Playwright
gate; SC-008 mandates a unit test over the pure seed decision; SC-013 mandates a live-region **transition**
assertion. Test tasks here are requirements, not optional scaffolding.

**Organization**: Tasks are grouped by user story so each can be implemented and tested independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single-project SPA (Vite, ADR-004): `src/` and `tests/` at repository root. Unchanged from S0.

## The boundary that governs every task below (Decisão F)

S1 honours FR-014/FR-014a as **behavioural immutability**. Exactly **six** S0 source files receive a
**strictly additive** change — `src/main.tsx`, `src/App.tsx`, `src/strings.ts`, `src/components/Toolbar.tsx`,
`src/components/CanvasPanel.tsx`, `src/state/editorStore.ts` — and exactly **two** S0 e2e fixtures are
amended (`tests/e2e/ephemeral.spec.ts`, `tests/e2e/us1-preview.spec.ts`). **`src/core/**` is not touched by
this slice.** Any other S0 file in the diff is an FR-014 violation and blocks the merge (T029).

Three tempting fixes are **explicitly refused by the spec** — do not make them:

- ❌ validate ids in `mutations.connect` → ✅ null out `connectSourceId` in the clear (CL3 / FR-006a)
- ❌ staleness guard in `applyParsedText` → ✅ `cancelPendingParse()` in the clear (CL4 / FR-006b)
- ❌ lift the rename into the store → ✅ derive the abort from the model in `CanvasPanel` (CL5 / FR-006c)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the one new dependency and the isolated perf harness. The project is already bootstrapped by S0;
no new toolchain.

- [ ] T001 Install `@radix-ui/react-alert-dialog` as a runtime dependency in `package.json` (`npm install @radix-ui/react-alert-dialog`) — the single new dependency of the slice, extending the shadcn/ui layer already fixed by ADR-004 (Decisão I)
- [ ] T002 Generate the shadcn/ui alert-dialog primitive at `src/components/ui/alert-dialog.tsx` via `npx shadcn@latest add alert-dialog` — new file; do not modify `src/components/ui/button.tsx` or any existing primitive
- [ ] T003 [P] Add the `test:e2e:perf` script (`playwright test --config playwright.perf.config.ts`) to `package.json`, leaving the existing `test`, `test:e2e` and `test:perf` scripts untouched
- [ ] T004 [P] Create `playwright.perf.config.ts` at the repository root: `testDir: './tests/e2e'`, `testMatch: '**/*.perf.ts'`, single `chromium` project, `baseURL: 'http://localhost:4173'`, `webServer.command: 'npm run build && npm run preview -- --port 4173'` (Decisão J, FR-018). **MUST NOT** touch `playwright.config.ts` — in particular, do not add `testIgnore` to it; its default `testMatch` already excludes `*.perf.ts`

**Checkpoint**: `npm run test:e2e:perf` runs (collecting zero tests) and `npm run test:e2e` still collects exactly the S0 specs.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the starter content itself. Every user story reads `STARTER_MODEL`/`STARTER_TEXT` — US1 seeds it,
US2 compares against its canonical text, US3 asserts its absence.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T005 [P] Write the failing unit test `tests/unit/starter-model.test.ts` covering the starter contract (ST1–ST5): exact shape (5 nodes / 5 edges / `direction: 'TD'` / pt-BR labels / `aprovado` has `shape: 'diamond'`); `node.id === deriveSlug(node.label)` asserted against `src/core/slug/` (**not** hand-copied); unique ids and `e{index}` edge-id convention; every `edge.source`/`edge.target` resolves to an existing node; `STARTER_TEXT` equals the documented 11 lines; `STARTER_MODEL.nodes.length <= 6` and `STARTER_TEXT.trimEnd().split('\n').length <= 14`; and the FR-015 round-trip `await importFlowchart(STARTER_TEXT)` returns `ok: true` and preserves structural content. **The round-trip comparison MUST accommodate the two verified reimport normalizations** — treat `TD ≡ TB`, and compare edges by `(source, target, connector, label)` **excluding the id** (the ACL returns `e0-inicio-revisar`). An `expect(reimported).toEqual(STARTER_MODEL)` goes red on correct code; do not "fix" the starter to make it green (ST4)
- [ ] T006 Create `src/starter/model.ts` exporting `STARTER_MODEL: GraphModel` (deep-frozen; the exact constant in `data-model.md` §1) and `STARTER_TEXT = generate(STARTER_MODEL)`. **No Mermaid string of the starter may exist in source** — the text is derived, never hand-written (ST3), which is what makes the canonical form true by construction rather than by coincidence. Makes T005 pass
- [ ] T007 [P] Add the S1 pt-BR strings to `src/strings.ts` (clear button label, dialog title/description/confirm/cancel, `starter.seeded` announcement, clear-completed announcement) — additive only; no existing string changes
- [ ] T008 [P] Amend `specs/001-s0-walking-skeleton/contracts/generator.contract.md` with **G9 — Forma de emissão**, ratifying the own-line emission the S0 generator already implements (FR-003a). Documentation of existing behaviour: **zero** code and **zero** test changes in S0 follow from this

**Checkpoint**: `npm test -- tests/unit/starter-model.test.ts` is green; the starter is proven valid, canonical and within both ceilings.

---

## Phase 3: User Story 1 — Encontrar um ponto de partida vivo ao abrir (Priority: P1) 🎯 MVP

**Goal**: on open, the canvas draws the starter and the code panel shows the corresponding Mermaid — from the
**first paint**, with zero user actions — and all five S0 editing actions work on it with no preparatory step.

**Independent Test**: open the tool with a clean session; without acting, confirm the canvas shows the starter
diagram and the code panel shows the matching Mermaid; then run each of the five core S0 edit actions directly
on the starter and confirm both sides follow; finally copy the code.

### Tests for User Story 1 ⚠️

> Write these FIRST and confirm they FAIL before implementing T013–T016.

- [ ] T009 [P] [US1] Write `tests/unit/starter-seed.test.ts` for the pure seed decision (SD1/SD2, SC-008): `shouldSeedStarter({ restorableDraft: null })` is `true`; it is `false` for **any** non-null draft — **including one representing an empty canvas** (`{ text: '' }`), since the mere existence of restorable content marks a returning user. Pass a **simulated** draft: nothing of the RN-06 buffer is built in this slice (FR-011)
- [ ] T010 [P] [US1] Write `tests/unit/starter-announce.test.tsx` (RTL) asserting SC-013 as a **transition**: the status region does **not** contain the seeding message on first paint, and does contain it afterwards. A test that only asserts the final text passes equally over a mute implementation (a live region born filled is never spoken) — which is exactly the failure this test exists to exclude (FR-017a, Decisão I-bis)
- [ ] T011 [P] [US1] Write `tests/e2e/starter.spec.ts` for US1 (SC-001/002/003/004/005/009) at viewport 1280×800: starter visible on the canvas and in `code-input` with zero actions; code byte-identical to the generated canonical form; each of the five core S0 actions rewrites the code; copy yields a valid Flowchart; the whole diagram is visible without zoom or pan. For SC-003, assert **absence of gratuitous rewriting** — lines untouched by the edit keep exact text and order — and **not** a fixed-size diff: renaming `Revisar` legitimately rewrites 4 of the 11 lines via the S0 id cascade (FR-003), and that satisfies SC-003 rather than violating it
- [ ] T012 [P] [US1] Write `tests/e2e/starter-boot-latency.perf.ts` for the SC-012 gate: ≥1 warm-up load, then **30** `page.goto('/')` samples, clock starting before the goto and stopping when the starter nodes are visible on the canvas **AND** the text is present in the code panel; take the p95 with the **same percentile helper** S0 uses in `tests/perf/preview-latency.test.ts`; assert p95 ≤ 1000 ms. Runs only under `playwright.perf.config.ts` (production build) — the `.perf.ts` suffix keeps it out of the S0 config's default `testMatch`

### Implementation for User Story 1

- [ ] T013 [US1] Create `src/starter/seed.ts` exporting `RestorableDraft`, `SeedInput`, the pure `shouldSeedStarter(input)` (`input.restorableDraft === null` — reads no store, no `window`, no storage, no clock) and `seedStarter(input): boolean`, which on seeding applies a **single** `useEditorStore.setState({ model: STARTER_MODEL, lastValidModel: STARTER_MODEL, editorText: STARTER_TEXT })` (SD1–SD4). Makes T009 pass
- [ ] T014 [US1] In `src/main.tsx`, import and call `seedStarter({ restorableDraft: null })` **synchronously before** `createRoot(...).render(<App />)` — a literal `null`, since this slice introduces no real producer of restorable content (SD3). Not from a `useEffect`: the first paint must already contain the starter, so S0's empty state is **never rendered** — not "empty for an instant", but empty never shown (FR-001a/SC-001). Do not change the store's initial state, which remains `createEmptyModel()` and is literally the clear's target (SD6, Decisão G)
- [ ] T015 [P] [US1] Create `src/components/StarterAnnouncer.tsx`: a mount `useEffect` calling the `announce()` S0 already exposes with `strings.starter.seeded`, **only** when the session seeded. Post-mount so the live region **transitions** from empty to the message (FR-017a). Makes T010 pass
- [ ] T016 [US1] Mount `<StarterAnnouncer />` in `src/App.tsx` — additive; `StatusRegion` and the existing layout are unchanged

### Authorized S0 fixture amendments (FR-014a — exactly two, exhaustive)

- [ ] T017 [P] [US1] Amend the reload assertion in `tests/e2e/ephemeral.spec.ts`: `toHaveValue('')` becomes an assertion of what the test actually exists to prove — that the **user's work** does not survive the reload and the panel returns to the starter's canonical form, a fresh first contact. The `storageLength === 0` / no-save-affordance assertions stay **exactly** as they are: the starter preserves nothing and overwrites nothing (FR-010)
- [ ] T018 [P] [US1] Repoint **and rename** the `invalid text as the very first input` case in `tests/e2e/us1-preview.spec.ts`: with the starter seeded, `lastValidModel` is the starter, so the last valid preview is no longer the empty state. Today it only passes because it asserts the status indicator, not the state its name refers to — leaving it green while asserting something false

> **If a third S0 test breaks, stop.** The FR-014a premise has failed and the case deserves an explicit
> decision — never a silent amendment to green.

**Checkpoint**: US1 is fully functional and independently testable — the tool no longer opens blank. `npm test`, `npm run test:e2e` and `npm run test:e2e:perf` are all green.

---

## Phase 4: User Story 2 — Recomeçar do zero apagando o andaime (Priority: P2)

**Goal**: an explicit clear action that discards all content and returns the session to S0's **integral** empty
state — UI-only state included — leaving no residue of the starter in the diagram or the text.

**Independent Test**: from the freshly opened starter, trigger clear and confirm canvas and code go empty with
no residue and no error; confirm the resulting state is the same empty state S0 already showed.

### Tests for User Story 2 ⚠️

- [ ] T019 [P] [US2] Write `tests/unit/starter-clear.test.ts`: **CL1** — `needsClearConfirmation(t, c) === (t !== '' && t !== c)`, a character-by-character string comparison that **never reads the `model`** (cover all four rows of the CL1 table, including non-parseable text typed over the starter, where the model is still the starter but real work is on screen); **CL2** — `clearSession()` restores `model`/`lastValidModel` to `createEmptyModel()`, `editorText` to `''`, `status` to `'ok'`, `connectMode` to `false`, `connectSourceId` to `null`; **CL4** — with a parse armed, clearing then advancing the timer leaves the state empty
- [ ] T020 [P] [US2] Write `tests/unit/clear-dialog.test.tsx` (RTL) for FR-016/CL6: focus enters the dialog on open, `Escape` cancels, focus **returns to the clear control** on close (both confirming and cancelling), the dialog has an accessible name and role, and cancelling leaves content exactly as it was
- [ ] T021 [P] [US2] Write `tests/e2e/clear.spec.ts` for US2/SC-006, covering acceptance scenarios 1–10 — notably **8** (clear with a pending connect source, then add two new nodes and connect them → the new edge links **only** the new nodes; **zero** implicit starter nodes resurrected), **9** (clear with a parse in flight → canvas and code go empty and **stay** empty), and **10** (clear mid-rename, then add a node and edit it by keyboard → the new node responds; no stale editing pointer swallows the keys)

### Implementation for User Story 2

- [ ] T022 [US2] Add the additive export `cancelPendingParse()` to `src/state/editorStore.ts` — it **only** calls `clearTimeout` on the existing module-private `debounceTimer` handle. `setEditorText` and `applyParsedText` MUST stay byte-identical; the staleness guard is explicitly refused by FR-006b. Precedent: S0 already exports `_flushEditorTextForTests()` for external control of the same timer
- [ ] T023 [US2] Create `src/starter/clear.ts` exporting the pure `needsClearConfirmation(editorText, canonicalText)` and `clearSession()`, which calls `cancelPendingParse()` **first** and then a single `setState` restoring the integral empty state (CL2). **Order matters**: the reverse leaves a window in which the already-armed timer fires over the just-cleared state. Makes T019 pass
- [ ] T024 [US2] Create `src/components/ClearAction.tsx`: a button that runs the clear **immediately, without a dialog** when `needsClearConfirmation` is false (the untouched starter and the empty panel are the flow this slice exists to serve — friction there would trade one step zero for another), and otherwise opens the `AlertDialog` from T002; on completion it calls the S0 `announce()` (CL7 — a destructive, irreversible action must not end in silence). Makes T020 pass
- [ ] T025 [US2] Mount `<ClearAction />` in `src/components/Toolbar.tsx` — the toolbar lives on the canvas side, so the action is keyboard-reachable via Tab/Enter and **does not depend on the code panel being expanded** (FR-006/CL6). The existing toolbar controls are unchanged
- [ ] T026 [US2] Add a `useEffect` to `src/components/CanvasPanel.tsx` that exits edit mode (`setEditingNodeId(null)`) when `editingNodeId` no longer exists in `model.nodes` (FR-006c/CL5). **Derived from the model, not commanded by the clear** — the rename is the component's local `useState`, out of any store `setState`'s reach. Leave `onKeyDown`, `onConnect` and the model→React Flow mapping intact. This also closes the same latent path in the already-shipped `removeNode`

**Checkpoint**: US1 and US2 both work independently. The starter is now a discardable scaffold, not an imposed document.

---

## Phase 5: User Story 3 — Substituir o starter colando código próprio (Priority: P3)

**Goal**: pasting a user's own Flowchart over the starter leaves zero starter residue in the diagram or the code.

**Independent Test**: with the starter present, replace the entire panel text with a valid Flowchart and confirm
no starter node, edge or line survives on either side.

- [ ] T027 [P] [US3] Write `tests/e2e/paste-over-starter.spec.ts` for SC-007: replace all of `code-input` with a valid Flowchart of the user's own → the canvas shows **only** the pasted diagram and the code contains **only** the pasted content (zero starter residue); then edit via the canvas and confirm no starter element is reintroduced
- [ ] T028 [US3] Confirm T027 passes with **no production-code change**. This story rides on the S0 paste behaviour: the starter is ordinary session content the moment it is presented (FR-004), and it carries no origin marker (ST6). If a green here seems to need special-casing the starter, that is an FR-004 violation, not a fix

**Checkpoint**: all three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T029 Run the **Decisão F diff gate**: `git diff --stat main -- src/` MUST show only the six additive S0 files (`main.tsx`, `App.tsx`, `strings.ts`, `components/Toolbar.tsx`, `components/CanvasPanel.tsx`, `state/editorStore.ts`) plus S1's new files (`starter/*`, `components/ClearAction.tsx`, `components/StarterAnnouncer.tsx`, `components/ui/alert-dialog.tsx`). **`src/core/**` must be absent** — which alone is what keeps constitution gates II, IV, V and VI green by construction. Any other S0 file in the diff blocks the merge (FR-014)
- [ ] T030 [P] Run `npm test` and confirm the whole Vitest suite is green — in particular that S0's `tests/contract/` (acl-isolation, no-coordinates, no-image-export, no-nextjs), `tests/roundtrip/` and `tests/perf/` are **unchanged and still passing**
- [ ] T031 [P] Run `npm run test:e2e` and confirm all three browsers are green against the **unchanged** `playwright.config.ts` (FR-018), with only the two FR-014a amendments (T017, T018) in the S0 e2e diff
- [ ] T032 Run `npm run test:e2e:perf` and confirm the SC-012 gate is green: p95 ≤ 1 s over 30 samples against the production build. **If the p95 grazes the ceiling on an idle runner**, the thing to revisit is the 1 s ceiling — not the instrument. Measuring the wrong artifact to get green defeats the gate's purpose
- [ ] T033 [P] Run `npm run lint` and confirm the `no-restricted-imports` rule is green — S1 imports `mermaid` **nowhere** (gate VI/ADR-002: seeding does not traverse the parse path)
- [ ] T034 Walk the `quickstart.md` completion checklist end-to-end, opening the app with `npm run dev`. Watch specifically for a **flash of the empty state** before the starter: that is an FR-001a bug, not a performance detail — check that `seedStarter(...)` runs before `createRoot(...).render(<App />)` and not from a `useEffect`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — can start immediately
- **Foundational (Phase 2)**: independent of Phase 1 in practice (the starter model needs no new dependency), but **blocks all user stories**
- **User Stories (Phase 3+)**: all depend on Phase 2 (`STARTER_MODEL`/`STARTER_TEXT`); US2 additionally depends on Phase 1 (the alert-dialog primitive)
- **Polish (Phase 6)**: depends on all three stories

### User Story Dependencies

- **US1 (P1)**: needs only Foundational. Delivers value alone — this is the MVP and the slice's reason to exist
- **US2 (P2)**: needs Foundational + T002 (alert-dialog). Logically depends on there **being** a starter (US1), but is testable in isolation from it: `needsClearConfirmation` and `clearSession` are pure/store-level and unit-testable without a seeded session
- **US3 (P3)**: needs Foundational + US1 (a starter must be present to be replaced). No production code of its own

### Within Each User Story

- Tests are written and MUST FAIL before implementation
- `src/starter/*` (pure core) before the components that mount it
- Component creation before its mount point in an S0 file

### Parallel Opportunities

- T003 and T004 in parallel (different files)
- T005, T007, T008 in parallel (test, strings, S0 docs — no overlap)
- All four US1 test tasks (T009–T012) in parallel, and both fixture amendments (T017, T018) in parallel
- All three US2 test tasks (T019–T021) in parallel
- T030, T031, T033 in parallel (independent suites)
- With more than one developer: US2's pure core (T022–T023) can proceed alongside US1's implementation once Phase 2 is done

---

## Parallel Example: User Story 1

```bash
# Write all four US1 test files together (each fails until T013–T016 land):
Task: "tests/unit/starter-seed.test.ts — pure seed decision (SC-008)"
Task: "tests/unit/starter-announce.test.tsx — live-region transition (SC-013)"
Task: "tests/e2e/starter.spec.ts — US1 acceptance (SC-001..005/009)"
Task: "tests/e2e/starter-boot-latency.perf.ts — p95 ≤ 1 s gate (SC-012)"

# Then the two authorized S0 fixture amendments together:
Task: "Amend tests/e2e/ephemeral.spec.ts reload assertion (FR-014a)"
Task: "Repoint and rename the invalid-first-input case in tests/e2e/us1-preview.spec.ts (FR-014a)"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup — T001–T004
2. Phase 2: Foundational — T005–T008 (**blocks everything**)
3. Phase 3: User Story 1 — T009–T018
4. **STOP and VALIDATE**: the tool opens with a live starter, editable by all five S0 actions, in ≤ 1 s p95
5. Deploy/demo if ready — the blank screen is gone, which is the whole point of the slice

### Incremental Delivery

1. Setup + Foundational → the starter exists and is proven valid, canonical and within both ceilings
2. + US1 → the tool stops opening blank and teaches the format by example (**MVP**)
3. + US2 → the starter becomes a discardable scaffold rather than an imposed document
4. + US3 → the starter cannot become debris mixed into real work
5. Polish → the FR-014 diff gate, the SC-012 gate and the quickstart checklist

### Suggested MVP Scope

**T001–T018** (Setup + Foundational + US1). US1 is the only phase that delivers value on its own: with it
alone the tool already stops opening blank, even if the user never clears the starter or pastes their own code.

---

## Notes

- `[P]` = different files, no dependencies
- Verify each test fails before implementing against it
- Commit after each task or logical group
- The starter's text is **always** `generate(STARTER_MODEL)` — never a hand-written string (ST3). If you find
  yourself editing a Mermaid literal to make a test pass, the design has been inverted
- The unifying invariant behind FR-006a/b/c: **no pointer to content — parked, scheduled or local — survives
  the destruction of the content it references**
