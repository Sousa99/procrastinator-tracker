# Feature Specification: Storybook + Exportable TaskDeck Component

**Feature Branch**: `feature/003-storybook-task-stack`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "as you can see from our initial core feature, we left the
storybook integration for a later moment. this feature is now focused on integration of
storybook to our frontend. for more complex custom developed component we can have stories.
but the focus should be on a 'to-develop' component. which will displays the tasks as a set
of stacked cards, like slighlty on top-of-another. this component should be configurable for
the filter of which to show the tasks. it should also be configurable the refresh rate for
the component. this component should be exportable you know, like as a package which can be
installed and used in other products."

> **Design revision (2026-09-06)**: After reviewing the initial `TaskStack` (vertical
> overlap) implementation, the user selected the **shadcnblocks "Deck Standard 1"** pattern
> — a swipeable card stack with cards fanned/stacked behind the top card — and asked that the
> exported component be based on it, with an **auto-rotate timer** and **drag-to-skip** that
> cycles the deck forever. The app keeps a **Deck | List** selector rather than replacing the
> list outright. This spec reflects that revision: the component family is `TaskDeck` /
> `TaskDeckWrapper` (retiring `TaskStack` / `TaskStackWrapper`).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Develop the TaskDeck component in Storybook (Priority: P1)

As a frontend developer, I can open Storybook and develop a new `TaskDeck` component in
isolation — a swipeable card stack with the top card on display and the next cards
scaled/fanned behind it — so I can iterate on its look and behavior without running the whole
app or the backend.

**Why this priority**: This is the "to-develop" component at the heart of the feature. The
user explicitly asked for a focus on a custom component (not just stories for existing ones),
and Storybook is the workbench to build it.

**Independent Test**: Run `pnpm storybook` and confirm the `TaskDeck` story renders a
swipeable card stack of sample tasks with working controls (auto-rotate interval, loop,
stack size) and that dragging the top card advances the deck.

**Acceptance Scenarios**:

1. **Given** Storybook running, **When** I open the `TaskDeck` story, **Then** I see the top
   task card fully visible with the following cards scaled/fanned behind it (Deck Standard 1
   style).
2. **Given** the `TaskDeck` story, **When** I drag the top card past the swipe threshold,
   **Then** it animates out and the next card becomes the top card.
3. **Given** the `TaskDeck` story with `autoRotateMs > 0`, **When** the interval elapses,
   **Then** the deck advances automatically; dragging a card resets that timer.
4. **Given** the `TaskDeck` story with `loop` enabled, **When** the last card is reached,
   **Then** the deck cycles back to the first card instead of showing an empty state.

---

### User Story 2 - Use TaskDeck in the app dashboard with a Deck | List selector (Priority: P1)

As a user of the tracker, I can switch between a **swipeable deck** overview and the
**vertical list** on the dashboard, because the dashboard provides a Deck | List selector and
the TaskDeck component fetches its own data.

**Why this priority**: The component must be actually used, not just exist in Storybook. The
user explicitly asked to keep the app's existing vertical list as one display mode and offer
the stacked overview as an alternative.

**Independent Test**: Run the app (`pnpm dev`) with the backend, and confirm the dashboard
offers a "Deck | List" toggle; the Deck mode renders tasks as a swipeable stacked deck and
the List mode renders the existing vertical task list.

**Acceptance Scenarios**:

1. **Given** a running backend with tasks, **When** I load the dashboard, **Then** it offers a
   "Deck | List" selector and defaults to one of them.
2. **Given** the dashboard in Deck mode, **When** the `TaskDeck` wrapper fetches from
   `/api/tasks`, **Then** tasks render as a swipeable stacked deck that refreshes on the
   configured cadence.
3. **Given** the dashboard in List mode, **When** it renders, **Then** the existing vertical
   `TaskCard` list is shown unchanged.
4. **Given** a configured `filters` prop, **When** the dashboard renders in Deck mode, **Then**
   only matching tasks are shown.

---

### User Story 3 - Consume TaskDeck as an installed package (Priority: P2)

As another product's developer, I can install the published `TaskDeck` wrapper and drop it
into my own React app, because it self-fetches and is exportable as a package.

**Why this priority**: The user explicitly wants the component "exportable ... as a package
which can be installed and used in other products". P2 because publishing to a registry is a
later step; the local build/consumption contract is validated now.

**Independent Test**: `pnpm --filter frontend build:lib` produces a consumable `dist-lib` with
types and an `exports` map; a smoke-import test imports `TaskDeckWrapper` from the built
package and renders it with a mocked data source.

**Acceptance Scenarios**:

1. **Given** the library build, **When** I run `npx publint` and `npx @arethetypeswrong/cli
   --pack`, **Then** both report no export-map or type-resolution errors.
2. **Given** a consumer importing `TaskDeckWrapper` from the package, **When** it renders with
   a `dataSource` prop, **Then** the component fetches and displays tasks on its own.
3. **Given** the package `exports` map, **When** a consumer imports the component, **Then**
   TypeScript types resolve (no `any`) and React/ReactDOM (`motion`) are declared as
   peer deps (no duplicate-React hazards).

---

### User Story 4 - Storybook for existing custom components (Priority: P3)

As a frontend developer, I can add stories for the existing custom components (e.g.
`TaskCard`, `TaskFilters`, `StatusBadge`) so the design system is documented alongside the
new `TaskDeck`.

**Why this priority**: The user said "for more complex custom developed component we can have
stories" — a nice-to-have that turns Storybook into the component reference, but not the core
deliverable.

**Independent Test**: Storybook lists stories for at least the key existing components and
they render.

**Acceptance Scenarios**:

1. **Given** Storybook, **When** I open the `TaskCard` story, **Then** it renders with sample
   data and shows status/urgency/tags as in the app.

---

### Edge Cases

- What happens when the data-fetch wrapper errors (backend down)? Show an error state, not a
  broken deck.
- What happens when a fetch returns zero tasks? Show an empty state ("nothing to show").
- How does `refreshRateMs` interact with an in-flight request (do we overlap requests)?
- How is the interval cleaned up when the component unmounts or `refreshRateMs` changes?
- What happens when there is only one task (deck has a single card)?
- Does the auto-rotate timer keep running when the deck is empty or paused?
- How is the auto-rotate timer reset after a manual drag, and paused during a drag?
- How does the library build avoid shipping the SPA's `index.html` and app-only code?
- Are `filters` changes applied client-side to already-fetched tasks, or do they trigger a
  refetch?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontend MUST integrate Storybook (`storybook@9.x`, `@storybook/react-vite`)
  so components can be developed and documented in isolation.
- **FR-002**: A `TaskDeck` display component MUST render tasks as a **swipeable card stack**
  (Deck Standard 1 style): the top card fully visible with the following cards
  scaled/fanned behind it; dragging the top card past a threshold advances the deck.
- **FR-003**: `TaskDeck` MUST accept a `filters` prop (`TaskFilters`) that controls which
  tasks are shown.
- **FR-004**: `TaskDeck` MUST accept an `autoRotateMs` prop (default 4000; `0` disables) that
  auto-advances the deck on that cadence; the timer MUST pause during a drag and reset after a
  manual skip. The swipe/exit animation duration MUST be configurable via `slideDurationMs`
  (default 500).
- **FR-005**: `TaskDeck` MUST support a `loop` mode (default true) that cycles back to the
  first card instead of showing an empty state.
- **FR-006**: A data-fetching wrapper MUST own retrieval (via the existing `api/client`) and
  render the display component; the exported public component MUST be this full
  "display + retrieval" wrapper.
- **FR-007**: The frontend package MUST be configured for library-mode export (Vite library
  mode + `vite-plugin-dts`) producing a consumable `dist-lib/` with an `exports` map, `files`,
  and React/ReactDOM as `peerDependencies`, so the component can be installed and used in
  other products. The deck's `motion` dependency MUST also be declared so consumers install it
  themselves.
- **FR-008**: The display component and its props MUST be documented via Storybook stories
  and a contracts document.
- **FR-009**: Existing custom components (e.g. `TaskCard`) MUST have at least a basic story.
- **FR-010**: The app dashboard MUST offer a **Deck | List** selector: Deck mode renders the
  `TaskDeck` wrapper (self-fetching, refreshable), List mode renders the existing vertical
  `TaskCard` list. The selector MUST be a local component state (not persisted).
- **FR-011**: Documentation MUST be updated in the same change: this feature's `contracts/`,
  `quickstart.md`, `research.md`, `plan.md`, and the repo `README.md`.

### Key Entities *(include if feature involves data)*

- **TaskDeck (display)**: Presentational component; props `tasks: Task[]`, `filters`,
  `autoRotateMs`, `loop`, `stackSize`, optional render props; no fetching. Reuses the
  existing `Task` type from `api/client`.
- **TaskDeckWrapper (exported)**: Owns retrieval through `api.listTasks(filters)` on a
  `refreshRateMs` interval; renders the display component with loading/error/empty states.
- **Storybook**: The isolated component workbench; `.storybook/` config wiring Tailwind v4.
- **Library build**: Vite library-mode output (`dist-lib/`) with `exports` map + type
  declarations, making the component installable elsewhere.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm storybook` starts and renders the `TaskDeck` story with working
  auto-rotate and drag controls.
- **SC-002**: The dashboard offers a Deck | List selector; Deck mode renders active tasks as
  a swipeable stacked deck (fetched from `/api/tasks`), List mode renders the existing
  vertical list.
- **SC-003**: `pnpm --filter frontend build:lib` produces a package-usable `dist-lib/` that
  passes `npx publint` and `npx @arethetypeswrong/cli --pack` with no errors.
- **SC-004**: A consumer can import the `TaskDeckWrapper` from the built package and render
  it with a mocked `dataSource`, confirming self-fetching works outside this repo.
- **SC-005**: Storybook includes a story for at least one existing custom component
  (e.g. `TaskCard`) in addition to `TaskDeck`.

## Assumptions

- The component lives in and is exported from the existing `@procrastinator-tracker/frontend`
  package (coupled) so shared utilities like the api client are reused; a new standalone
  workspace package is out of scope per user decision.
- `storybook@9.x` + `@storybook/react-vite` support React 19, Vite 6, and Tailwind v4 via the
  `@tailwindcss/vite` plugin (verified present in the stack).
- The `Task` and `TaskFilters` types from `frontend/src/api/client.ts` are the source of truth
  for the component's public types.
- The swipe-deck interaction is based on the open-source **Kibo UI `Deck`** component (MIT),
  which powers the shadcnblocks "Deck Standard 1" example; `motion` is the animation engine.
- "Exportable as a package" means the component is buildable and consumable as a local
  installable artifact; publishing to a public/private npm registry is a documented follow-up,
  not part of this change.
- Refresh rate is implemented as an interval-triggered re-fetch of `api.listTasks`; no
  websockets/SSE in v1.
- Skipping a card is **view-only** — it never mutates a task's state or status in the backend.