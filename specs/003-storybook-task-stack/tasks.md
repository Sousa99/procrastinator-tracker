# Tasks: Storybook + Exportable TaskDeck Component

**Input**: Design documents from `/specs/003-storybook-task-stack/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/task-deck.md, contracts/storybook.md

**Tests**: Included — the constitution requires every feature to ship code, tests, and docs together. Tests cover the presentational `TaskDeck` swipe behavior (deck rendering, auto-rotate, drag-to-skip, loop) and the wrapper's fetch/refresh semantics.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

> **Design revision (2026-09-06)**: The original `TaskStack` vertical-overlap component is
> retired in favor of `TaskDeck` (Deck Standard 1 / Kibo `Deck` swipeable card stack) with
> auto-rotate, drag-to-skip, and loop-forever. The app gains a Deck | List selector instead of
> replacing the list. Completed setup/foundational tasks (T001–T009) remain valid; new deck
> work begins at T010.

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
- [X] T005 [P] Create `frontend/vite.lib.config.ts`: Vite library mode, entry `src/index.ts`, formats `['es']`, `rollupOptions.external` for `react`, `react-dom`, `react/jsx-runtime`, `lucide-react`, `motion`, with `vite-plugin-dts` (`bundleTypes: true`) emitting to `frontend/dist-lib/`
- [X] T006 [P] Update `frontend/package.json` with `build:lib` script and library export contract: `exports` map, `files: ["dist-lib"]`, `sideEffects: false`, `peerDependencies` for `react`/`react-dom`/`motion` (and `lucide-react` if default card uses icons) per `contracts/task-deck.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared building blocks every user story depends on — the library barrel and fixture data.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T007 Create `frontend/src/index.ts` library barrel exporting the shared types `Task`, `TaskStatus`, `TaskFilters` etc. (re-exported from `api/client.ts`; NO app-only modules). Component exports are added with the deck in US1.
- [X] T008 [P] Create `frontend/src/components/task/TaskStack.fixtures.ts` with `sampleTasks: Task[]` covering all statuses, varied urgency/tags/assignees/due dates (renamed to `TaskDeck.fixtures.ts` in US1)
- [X] T009 Update `frontend/tsconfig.json` to include `.storybook` config and the library entry (`src/index.ts`) in typecheck scope

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel.

---

## Phase 3: User Story 1 - Develop TaskDeck in Storybook (Priority: P1) 🎯 MVP

**Goal**: A presentational `TaskDeck` component renders tasks as a **swipeable card stack** (Deck Standard 1 style — top card fully visible, next `stackSize - 1` cards scaled/fanned behind it), with `filters` for which tasks are shown, an `autoRotateMs` timer (default 4000, `0` off), a `slideDurationMs` animation speed (default 500), `loop` (default true), and drag-to-skip that resets the timer. The self-fetching `TaskDeckWrapper` owns retrieval; both are demonstrable in Storybook.

**Independent Test**: `pnpm --filter frontend storybook` → `Task/TaskDeck` stories render a swipeable card stack with working auto-rotate, loop, stack-size, and drag controls (per `contracts/storybook.md`, SC-001). `pnpm test` passes the deck unit tests.

### Tests for User Story 1

- [X] T010 [P] [US1] Unit test `TaskDeck` display + auto-rotate behavior in `frontend/tests/task-deck.test.tsx`: renders the top card + stacked cards, advances on `autoRotateMs` (fake timers), wraps on `loop`, stops at `autoRotateMs: 0`, and applies `filters`
- [X] T011 [P] [US1] Unit test `TaskDeckWrapper` fetch/refresh semantics in `frontend/tests/task-deck-wrapper.test.tsx`: fetches on mount via `dataSource`, refetches on `refreshRateMs` interval, no overlapping in-flight requests, interval cleaned up on unmount/change, `refreshRateMs: 0` fetches once, error and empty states render

### Implementation for User Story 1

- [X] T012 [P] [US1] Install `motion` + `@radix-ui/react-use-controllable-state` in `frontend/` and add them to `package.json` (motion as a runtime dep + peerDependency)
- [X] T013 [P] [US1] Vendor/adapt the MIT Kibo `Deck` primitives into `frontend/src/components/ui/deck/deck.tsx` (`Deck`, `DeckCards`, `DeckCard`, `DeckItem`, `DeckEmpty`) using the local `cn` util, plus `autoRotateMs` + `loop` additions and drag-pause/timer-reset hooks. `DeckItem` is a neutral fill container (no border/bg/shadow) so no wrapper outline extends past the card.
- [X] T014 [P] [US1] Create `frontend/src/components/task/TaskDeck.tsx` — presentational swipeable deck per `data-model.md` (`tasks`, `filters`, `autoRotateMs`, `loop`, `stackSize`, `slideDurationMs`, `renderCard?`, `onCardChange?`, `className?`), router-free full-card default, urgency-descending order with unset last, client-side filter matching. Stage is `w-full h-[24rem] sm:h-[26rem]`; cards uniform (`h-full flex flex-col overflow-hidden`) with content anchored (description `flex-1` fill at top, meta/tags/assignees bottom via `mt-auto`) and `line-clamp-6` ellipsis on long text.
- [X] T015 [P] [US1] Create `frontend/src/components/task/TaskDeckWrapper.tsx` — self-fetching wrapper per `data-model.md` (`filters`, `refreshRateMs` default 30000, `dataSource?` default `api.listTasks`, forwards `autoRotateMs`/`loop`/`stackSize`/`renderCard`), interval-based refetch with in-flight guard, loading/error/empty states, cleanup on unmount
- [X] T016 [US1] Rename `frontend/src/components/task/TaskStack.fixtures.ts` → `TaskDeck.fixtures.ts` and update imports
- [X] T017 [US1] Create `frontend/src/components/task/TaskDeck.stories.tsx` + `TaskDeckWrapper.stories.tsx` — `Default`, `Filtered`, `AutoRotating`, `NoLoop`, `SelfFetchingWrapper` stories with controls (auto-rotate, loop, stack-size; `autoRotateMs: 0` by default so the deck stays put), per `contracts/storybook.md`

**Checkpoint**: At this point, User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - TaskDeck in the dashboard with a Deck | List selector (Priority: P1)

**Goal**: The dashboard offers a local "Deck | List" toggle — Deck mode renders `TaskDeckWrapper` (self-fetching, auto-rotating), List mode renders the existing vertical `TaskCard` list unchanged.

**Independent Test**: `pnpm dev` with backend → the dashboard shows a Deck | List toggle; Deck mode renders a swipeable stacked deck that refreshes on cadence and auto-rotates; List mode renders the original vertical list (SC-002).

### Implementation for User Story 2

- [X] T018 [US2] Modify `frontend/src/pages/DashboardPage.tsx` to add a local `view: 'deck' | 'list'` state and a segmented toggle; Deck → `TaskDeckWrapper` (with current `filters` state, default `refreshRateMs`/`autoRotateMs`), List → the existing vertical `TaskCard` list
- [X] T019 [US2] Verify the dashboard filter bar drives `TaskDeckWrapper.filters` in Deck mode (refetch on change) without duplicating fetch logic

**Checkpoint**: At this point, User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Consume TaskDeck as an Installed Package (Priority: P2)

**Goal**: The frontend package produces a consumable library build so `TaskDeckWrapper` (full component with retrieval) can be installed and used in other React 19 products.

**Independent Test**: `pnpm --filter frontend build:lib` → `dist-lib/` passes `npx publint` and `npx @arethetypeswrong/cli --pack`; a consumer imports the built wrapper with a mocked `dataSource` and renders the deck (SC-003, SC-004).

### Implementation for User Story 3

- [X] T020 [P] [US3] Verify `pnpm --filter frontend build:lib` emits `frontend/dist-lib/` (ESM `index.js` + bundled `index.d.ts` + `styles.css` + `styles.d.ts`) with `TaskDeck`/`TaskDeckWrapper` exported and no SPA `index.html`/app-only code leaking into the package. `build:lib` now runs `build:css` (Tailwind CLI) to ship a real `styles.css`.
- [X] T021 [US3] Run `npx publint` and `npx @arethetypeswrong/cli --pack` against the built package and fix any `exports`/type-resolution errors in `frontend/package.json` or `vite.lib.config.ts` (per `contracts/task-deck.md`). Added `typesVersions` + `styles.d.ts` for the `./styles.css` subpath; the remaining ESM-only CJS warning is documented as an accepted tradeoff.

**Checkpoint**: The package is installable/consumable; publishing to a registry remains a documented follow-up.

---

## Phase 6: User Story 4 - Storybook for Existing Custom Components (Priority: P3)

**Goal**: Storybook documents existing custom components (e.g. `TaskCard`) alongside the new `TaskDeck`.

**Independent Test**: `pnpm --filter frontend storybook` lists a `Task/TaskCard` story that renders with sample data (SC-005).

### Implementation for User Story 4

- [X] T022 [P] [US4] Create `frontend/src/components/task/TaskCard.stories.tsx` — `Default`, `Urgent`, `WithDescription`, `Minimal` stories with representative `Task` fixtures covering urgent/non-urgent, tags, assignees, due date, and a long-description fixture (wrapped in `MemoryRouter` since TaskCard uses react-router's Link)

**Checkpoint**: All user stories now work independently.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Retire the old `TaskStack` implementation, update docs, run quality gates, and validate end-to-end.

- [X] T023 [US1] Delete the retired `TaskStack` implementation: `frontend/src/components/task/TaskStack.tsx`, `TaskStackWrapper.tsx`, `TaskStack.stories.tsx`, `TaskStackWrapper.stories.tsx`, `frontend/tests/task-stack.test.tsx`, `frontend/tests/task-stack-wrapper.test.tsx`; update `frontend/src/index.ts` barrel exports (`TaskDeck`, `TaskDeckWrapper` + prop types) and any remaining references (done in US1 — the fixtures rename made the old files broken; verified no `TaskStack` references remain)
- [X] T024 [P] Update repo `README.md` with the Storybook usage, the exportable `TaskDeck` component (swipe/auto-rotate/loop), and the library-build/install note
- [X] T025 Run full quality gates: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
- [X] T026 Run `quickstart.md` validation end-to-end (Storybook stories, library build + publint/attw, in-app Deck | List)

---

## Phase 8: Storybook Docs (MDX + Doc Blocks)

**Purpose**: Extend the Storybook workbench with a **documentation page per task component**
(`TaskDeck`, `TaskDeckWrapper`, `TaskCard`) written in **MDX** using **Doc Blocks**
(`Meta`, `Canvas`, `Story`, `Controls`/`ArgTypes`, `Source`) from `@storybook/addon-docs/blocks`.
Each page shows a canvas per existing story permutation plus concise usage prose, and every
control carries a **description** (from `argTypes.description`).

**Independent Test**: `pnpm --filter frontend storybook` → each task component has a Docs page
that renders its canvases (permutations) and a controls table with prop descriptions; full
quality gates pass.

### Setup for Storybook Docs

- [ ] T027 Install `@storybook/addon-docs@^9.1.20` as a devDependency in `frontend/` (MDX3; ships the Doc Blocks)
- [ ] T028 Update `frontend/.storybook/main.ts`: add `@storybook/addon-docs` to `addons` and `'../src/**/*.mdx'` to `stories`

### Control descriptions

- [ ] T029 [P] Add `argTypes` descriptions to `frontend/src/components/task/TaskDeck.stories.tsx` (`tasks`, `filters`, `autoRotateMs`, `loop`, `stackSize`, `slideDurationMs`, `renderCard`, `onCardChange`, `className`)
- [ ] T030 [P] Add `argTypes` descriptions to `frontend/src/components/task/TaskDeckWrapper.stories.tsx` (`filters`, `refreshRateMs`, `dataSource`, `autoRotateMs`, `loop`, `stackSize`, `slideDurationMs`, `renderCard`, `className`)
- [ ] T031 [P] Add `argTypes` descriptions to `frontend/src/components/task/TaskCard.stories.tsx` (`task`)

### MDX documentation pages

- [ ] T032 [P] Create `frontend/src/components/task/TaskDeck.mdx` — `Meta of={TaskDeckStories}`, intro prose, `Canvas` for the `Default`, `Filtered`, `AutoRotating`, and `NoLoop` permutations, `Controls`/`ArgTypes` prop table, `Source`
- [ ] T033 [P] Create `frontend/src/components/task/TaskDeckWrapper.mdx` — same pattern for the `Default` and `AutoRotating` permutations
- [ ] T034 [P] Create `frontend/src/components/task/TaskCard.mdx` — same pattern for the `Default`, `Urgent`, `WithDescription`, and `Minimal` permutations

### Validation + docs

- [ ] T035 Verify `pnpm --filter frontend storybook` boots with the Docs pages rendering canvases + described controls; run full gates (`pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`)
- [ ] T036 Update `specs/003-storybook-task-stack/contracts/storybook.md` with the docs-writing contract (MDX glob + `@storybook/addon-docs`, Doc Blocks pattern, `argTypes` descriptions)

**Checkpoint**: All task components have a Docs page; Storybook docs are the component reference.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — already complete
- **Foundational (Phase 2)**: Depends on Setup — already complete; BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 (both P1) can proceed in sequence or in parallel after Phase 2
  - US3 depends on US1 (the component must exist to be packaged)
  - US4 is independent and can run at any time after Phase 2
- **Polish (Final Phase)**: Depends on all desired user stories being complete; T023 (retire TaskStack) must come after US1 replaces it
- **Storybook Docs (Phase 8)**: Depends on Phase 1 (Storybook) + the components/stories from US1/US4; T027–T028 (setup) precede T029–T031 (descriptions) and T032–T034 (MDX pages), then T035 (verify/gates) and T036 (docs contract)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (imports `TaskDeckWrapper`)
- **User Story 3 (P2)**: Depends on US1 (packages `TaskDeckWrapper`/`TaskDeck`)
- **User Story 4 (P3)**: Independent — depends only on Phase 2 (fixtures)

### Within Each User Story

- Tests (T010, T011) MUST be written and FAIL before implementation (T013–T015)
- Deck primitives before TaskDeck (the display composes the primitives)
- Presentational component before wrapper (wrapper composes the display)
- Implementation before integration (Storybook story before dashboard wiring)
- Story complete before moving to next priority

### Parallel Opportunities

- T010 and T011 (deck tests) can run in parallel
- T012, T013 can run in parallel with T010/T011 once deps are installed
- T014 and T015 can run in parallel (different files; T015 composes T014)
- US4 (T022) can run in parallel with US2/US3 work
- Phase 8: T029, T030, T031 (argTypes descriptions, distinct files) and T032, T033, T034 (MDX pages, distinct files) can each run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test TaskDeck display + auto-rotate behavior in frontend/tests/task-deck.test.tsx"
Task: "Unit test TaskDeckWrapper fetch/refresh semantics in frontend/tests/task-deck-wrapper.test.tsx"

# Launch all components for User Story 1 together (after deps T012):
Task: "Vendor/adapt the MIT Kibo Deck primitives into frontend/src/components/ui/deck/deck.tsx"
Task: "Create frontend/src/components/task/TaskDeck.tsx"
Task: "Create frontend/src/components/task/TaskDeckWrapper.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Setup + Foundational are complete (T001–T009 done)
2. Complete Phase 3: User Story 1 (TaskDeck in Storybook)
3. **STOP and VALIDATE**: `pnpm --filter frontend storybook` renders the deck with controls; `pnpm test` passes T010/T011
4. Demo the component in isolation

### Incremental Delivery

1. Add User Story 1 (TaskDeck in Storybook) → Test independently → Demo (MVP!)
2. Add User Story 2 (dashboard Deck | List) → Test independently → Demo
3. Add User Story 3 (package export + publint/attw) → Test independently
4. Add User Story 4 (existing-component stories) → Test independently
5. Polish: retire TaskStack, README, full gates, quickstart validation
6. Storybook Docs (Phase 8): setup → argTypes descriptions → MDX pages → verify/gates → docs contract

### Parallel Team Strategy

With multiple developers:

1. Setup + Foundational are complete
2. Once Foundational is done:
   - Developer A: User Story 1 (deck primitives + TaskDeck components + stories)
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