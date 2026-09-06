# Tasks: Storybook + Exportable TaskStack Component

**Input**: Design documents from `/specs/003-storybook-task-stack/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/task-stack.md, contracts/storybook.md

**Tests**: Included — the constitution requires every feature to ship code, tests, and docs together. Tests cover the presentational `TaskStack` display behavior (stacking, filtering) and the wrapper's refresh semantics.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization — Storybook workbench, library-build tooling, and package manifest wiring.

- [X] T001 Install Storybook + library-build dev dependencies in `frontend/package.json`: `storybook@9`, `@storybook/react-vite`, `vite-plugin-dts` (Storybook 9 bundles essentials — no `@storybook/addon-essentials` needed)
- [X] T002 [P] Create `frontend/.storybook/main.ts` with `@storybook/react-vite` framework, `stories` glob `../src/**/*.stories.@(ts|tsx)`, and `viteFinal` adding the `@tailwindcss/vite` plugin (per `contracts/storybook.md`)
- [X] T003 [P] Create `frontend/.storybook/preview.ts` importing `../src/index.css` (Tailwind v4 single source of truth)
- [X] T004 [P] Add `storybook` (`storybook dev -p 6006`) and `build-storybook` (`storybook build -o dist-storybook`) scripts to `frontend/package.json`
- [X] T005 [P] Create `frontend/vite.lib.config.ts`: Vite library mode, entry `src/index.ts`, formats `['es']`, `rollupOptions.external` for `react`, `react-dom`, `react/jsx-runtime`, `lucide-react`, with `vite-plugin-dts` (`bundleTypes: true`) emitting to `frontend/dist-lib/`
- [X] T006 [P] Update `frontend/package.json` with `build:lib` script and library export contract: `exports` map, `files: ["dist-lib"]`, `sideEffects: false`, `peerDependencies` for `react`/`react-dom` (and `lucide-react` if default card uses icons) per `contracts/task-stack.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared building blocks every user story depends on — the library barrel and fixture data.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Create `frontend/src/index.ts` library barrel exporting the shared types `Task`, `TaskStatus`, `TaskFilters`, `Task`, `TaskFilters` etc. (re-exported from `api/client.ts`; NO app-only modules). `TaskStack`/`TaskStackWrapper`/prop-type exports are added in US1 when the components exist.
- [X] T008 [P] Create `frontend/src/components/task/TaskStack.fixtures.ts` with `sampleTasks: Task[]` covering all statuses, varied urgency/tags/assignees/due dates
- [X] T009 Update `frontend/tsconfig.json` to include `.storybook` config and the library entry (`src/index.ts`) in typecheck scope

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Develop TaskStack in Storybook (Priority: P1) 🎯 MVP

**Goal**: A presentational `TaskStack` component renders tasks as a stacked deck of cards (each slightly overlapping the previous), with `filters` affecting ordering/emphasis; the self-fetching `TaskStackWrapper` owns retrieval; both are demonstrable in Storybook with working controls.

**Independent Test**: `pnpm --filter frontend storybook` → `Task/TaskStack` stories render a stacked deck with working filter and refresh-rate controls (per `contracts/storybook.md`, SC-001).

### Tests for User Story 1

- [X] T010 [P] [US1] Unit test `TaskStack` display behavior in `frontend/tests/task-stack.test.tsx`: renders one card per task, cards overlap (stacked classes present), filters reorder/emphasize correctly, `maxVisible` caps cards
- [X] T011 [P] [US1] Unit test `TaskStackWrapper` refresh semantics in `frontend/tests/task-stack-wrapper.test.tsx`: fetches on mount via `dataSource`, refetches on `refreshRateMs` interval, no overlapping in-flight requests, interval cleaned up on unmount/change, `refreshRateMs: 0` fetches once, error and empty states render

### Implementation for User Story 1

- [X] T012 [P] [US1] Create `frontend/src/components/task/TaskStack.tsx` — presentational stacked-deck component per `data-model.md` (`tasks`, `filters`, `renderCard?`, `maxVisible?`, `className?`), router-free default card (styled like TaskCard but no react-router Link, keeping the package exportable), urgency-descending order with unset last, client-side filter matching
- [X] T013 [P] [US1] Create `frontend/src/components/task/TaskStackWrapper.tsx` — self-fetching wrapper per `data-model.md` (`filters`, `refreshRateMs` default 30000, `dataSource?` default `api.listTasks`, forwards `maxVisible`/`renderCard`/`className`), interval-based refetch with in-flight guard, loading/error/empty states, cleanup on unmount
- [X] T014 [US1] Create `frontend/src/components/task/TaskStack.stories.tsx` + `TaskStackWrapper.stories.tsx` — `Default`, `Filtered`, `Capped`, `CustomCard` stories with `sampleTasks` fixtures + controls; self-fetching wrapper story with mocked `dataSource` and `refreshRateMs` control (per `contracts/storybook.md`)

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Use TaskStack in the App Dashboard (Priority: P1)

**Goal**: The dashboard renders active tasks as a stacked deck via `TaskStackWrapper`, proving the self-fetching component works end-to-end against the real backend.

**Independent Test**: `pnpm dev` with backend → dashboard shows a stacked deck that refreshes on the configured cadence and refetches on filter change (SC-002).

### Implementation for User Story 2

- [ ] T015 [US2] Modify `frontend/src/pages/DashboardPage.tsx` to render `TaskStackWrapper` (with current `filters` state and default `refreshRateMs`) in place of the raw `TaskCard` list for active tasks, keeping the existing empty/error handling where appropriate
- [ ] T016 [US2] Verify dashboard filter bar drives `TaskStackWrapper.filters` (refetch on change) without duplicating fetch logic

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Consume TaskStack as an Installed Package (Priority: P2)

**Goal**: The frontend package produces a consumable library build so `TaskStackWrapper` (full component with retrieval) can be installed and used in other React 19 products.

**Independent Test**: `pnpm --filter frontend build:lib` → `dist-lib/` passes `npx publint` and `npx @arethetypeswrong/cli --pack`; a consumer imports the built wrapper with a mocked `dataSource` and renders the deck (SC-003, SC-004).

### Implementation for User Story 3

- [ ] T017 [P] [US3] Verify `pnpm --filter frontend build:lib` emits `frontend/dist-lib/` (ESM `index.js` + bundled `index.d.ts`) with no SPA `index.html`/app-only code leaking into the package
- [ ] T018 [US3] Run `npx publint` and `npx @arethetypeswrong/cli --pack` against the built package and fix any `exports`/type-resolution errors in `frontend/package.json` or `vite.lib.config.ts` (per `contracts/task-stack.md`)

**Checkpoint**: The package is installable/consumable; publishing to a registry remains a documented follow-up.

---

## Phase 6: User Story 4 - Storybook for Existing Custom Components (Priority: P3)

**Goal**: Storybook documents existing custom components (e.g. `TaskCard`) alongside the new `TaskStack`.

**Independent Test**: `pnpm --filter frontend storybook` lists a `Task/TaskCard` story that renders with sample data (SC-005).

### Implementation for User Story 4

- [ ] T019 [P] [US4] Create `frontend/src/components/task/TaskCard.stories.tsx` — `Default` story with representative `Task` fixtures covering urgent/non-urgent, tags, assignees, due date

**Checkpoint**: All user stories now work independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, quality gates, and end-to-end validation affecting multiple stories.

- [ ] T020 [P] Update repo `README.md` with the Storybook usage, the exportable `TaskStack` component, and the library-build/install note
- [ ] T021 Run full quality gates: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
- [ ] T022 Run `quickstart.md` validation end-to-end (Storybook stories, library build + publint/attw, in-app dashboard deck)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 (both P1) can proceed in sequence or in parallel after Phase 2
  - US3 depends on US1 (the component must exist to be packaged)
  - US4 is independent and can run at any time after Phase 2
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (imports `TaskStackWrapper`)
- **User Story 3 (P2)**: Depends on US1 (packages `TaskStackWrapper`/`TaskStack`)
- **User Story 4 (P3)**: Independent — depends only on Phase 2 (fixtures)

### Within Each User Story

- Tests (T010, T011) MUST be written and FAIL before implementation (T012–T014)
- Presentational component before wrapper (wrapper composes the display)
- Implementation before integration (Storybook story before dashboard wiring)
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks T002–T006 marked [P] can run in parallel
- T007–T008 in Foundational can run in parallel (T007 is the gate for stories)
- Tests T010 and T011 can run in parallel
- T012 and T013 can run in parallel
- US4 (T019) can run in parallel with US2/US3 work
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test TaskStack display behavior in frontend/tests/task-stack.test.tsx"
Task: "Unit test TaskStackWrapper refresh semantics in frontend/tests/task-stack-wrapper.test.tsx"

# Launch all components for User Story 1 together:
Task: "Create frontend/src/components/task/TaskStack.tsx"
Task: "Create frontend/src/components/task/TaskStackWrapper.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (TaskStack in Storybook)
4. **STOP and VALIDATE**: `pnpm --filter frontend storybook` renders the deck with controls; `pnpm test` passes T010/T011
5. Demo the component in isolation

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (TaskStack in Storybook) → Test independently → Demo (MVP!)
3. Add User Story 2 (dashboard uses TaskStackWrapper) → Test independently → Demo
4. Add User Story 3 (package export + publint/attw) → Test independently
5. Add User Story 4 (existing-component stories) → Test independently

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (TaskStack components + stories)
   - Developer B: User Story 4 (TaskCard story) — independent, reuses fixtures
3. Developer A then: User Story 2 (dashboard wiring), then User Story 3 (package build)
4. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing (T010/T011)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence