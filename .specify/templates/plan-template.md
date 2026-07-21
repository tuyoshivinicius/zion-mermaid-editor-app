# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Source: `.specify/memory/constitution.md`. List every principle this feature touches and, for each,
the executable evidence the PR will present (test, benchmark, validator or boundary check). Prose is
not evidence. Principles not touched are marked N/A with one line of justification.

| Principle | Touched? | Evidence this PR will present |
|-----------|----------|-------------------------------|
| I — Keyboard cycle, ≤4 control keys / 0 pointer events (NFR-01, R-05) | [yes/N/A] | |
| II — Reconfigure in ≤3 steps (NFR-02, declared target, unmeasured) | [yes/N/A] | |
| III — Density envelope as budget: 400/500, 100ms/50ms/50fps + projection reuse (NFR-03, R-04) | [yes/N/A] | per-element cost added: [ ] |
| IV — Transaction is the unit of undo, p95 ≤110ms at 400 (NFR-04, R-09, RN-04) | [yes/N/A] | |
| V — Code is a faithful projection of durable state only (NFR-05, R-03, RN-01) | [yes/N/A] | |
| VI — Reading-order fidelity outside groups; divergence declared inside (NFR-06) | [yes/N/A] | |
| VII — Layout is an explicit gesture; no edit rearranges (R-07, RN-03) | [yes/N/A] | |
| VIII — Label text returns byte-for-byte or returns marked (NFR-07, RN-02) | [yes/N/A] | |
| IX — Code analysis always returns a diagram, never nothing (NFR-08, R-06) | [yes/N/A] | |
| X — REFUSAL: mermaid stays out of the editing path (R-06) | [yes/N/A] | |
| XI — Long session does not degrade; draft fails toward not existing (NFR-09, R-10, RN-05, RN-07) | [yes/N/A] | |
| XII — Five types, common core, per-family vocabulary (R-02, R-08) | [yes/N/A] | |
| XIII — REFUSAL: browser-only; the deliverable is the code, not an image (R-01, PRD §4) | [yes/N/A] | |
| XIV — REFUSAL: nothing presumed, no style control without code backing (RN-06, RN-08) | [yes/N/A] | |

Any accepted violation goes to Complexity Tracking below — never left implicit.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
