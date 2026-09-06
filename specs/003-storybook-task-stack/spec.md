# Feature Specification: Storybook + Exportable TaskStack Component

**Feature Branch**: `003-storybook-task-stack`

**Created**: 2026-09-06

**Status**: Draft

**Input**: User description: "as you can see from our initial core feature, we left the storybook integration for a later moment. this feature is now focused on integration of storybook to our frontend. for more complex custom developed component we can have stories. but the focus should be on a 'to-develop' component. which will displays the tasks as a set of stacked cards, like slighlty on top-of-another. this component should be configurable for the filter of which to show the tasks. it should also be configurable the refresh rate for the component. this component should be exportable you know, like as a package which can be installed and used in other products."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Develop the TaskStack component in Storybook (Priority: P1)

As a frontend developer, I can open Storybook and develop a new `TaskStack` component in
isolation — a deck of task cards stacked slightly on top of one another — so I can iterate
on its look and behavior without running the whole app or the backend.

**Why this priority**: This is the "to-develop" component at the heart of the feature. The
user explicitly asked for a focus on a custom component (not just stories for existing
ones), and Storybook is the workbench to build it.

**Independent Test**: Run `pnpm storybook` and confirm the `TaskStack` story renders a
stacked deck of sample tasks with working controls (filter, refresh rate, count).

**Acceptance Scenarios**:

1. **Given** Storybook running, **When** I open the `TaskStack` story, **Then** I see a deck
   of task cards rendered with each card slightly overlapping the previous one (a stacked
   fan/cascade).
2. **Given** the `TaskStack` story controls, **When** I change the `filters` control, **Then**
   the visible cards update to only those matching the filter.
3. **Given** the `TaskStack` story controls, **When** I change the `refreshRateMs` control,
   **Then** the component re-fetches on that cadence (visible via a "last updated" marker or
   network log).

---

### User Story 2 - Use TaskStack in the app dashboard (Priority: P1)

As a user of the tracker, I can see my active tasks rendered as a stacked deck on the
dashboard (instead of the current vertical list), because the TaskStack component is wired
into the app and fetches its own data.

**Why this priority**: The component must be actually used, not just exist in Storybook.
The user wants the exported "full component with retrieval", and consuming it in-app proves
it works end-to-end.

**Independent Test**: Run the app (`pnpm dev`) with the backend, and confirm the dashboard
renders tasks as a stacked deck and refreshes on the configured cadence.

**Acceptance Scenarios**:

1. **Given** a running backend with tasks, **When** I load the dashboard, **Then** the
   `TaskStack` wrapper fetches tasks from `/api/tasks` and renders them as a stacked deck.
2. **Given** the dashboard's `refreshRateMs`, **When** a task is added/removed by another
   session, **Then** the deck updates within the refresh cadence without a manual reload.
3. **Given** a configured `filters` prop, **When** the dashboard renders, **Then** only
   matching tasks are shown.

---

### User Story 3 - Consume TaskStack as an installed package (Priority: P2)

As another product's developer, I can install the published `TaskStack` component and drop it
into my own React app, because it self-fetches and is exportable as a package.

**Why this priority**: The user explicitly wants the component "exportable ... as a package
which can be installed and used in other products". P2 because publishing to a registry is a
later step; the local build/consumption contract is validated now.

**Independent Test**: `pnpm --filter frontend build` produces a consumable `dist` with types
and an `exports` map; a smoke-import test imports `TaskStack` from the built package and
renders it with a mocked data source.

**Acceptance Scenarios**:

1. **Given** the library build, **When** I run `npx publint` and `npx @arethetypeswrong/cli
   --pack`, **Then** both report no export-map or type-resolution errors.
2. **Given** a consumer importing `TaskStack` from the package, **When** it renders with a
   `dataSource` prop, **Then** the component fetches and displays tasks on its own.
3. **Given** the package `exports` map, **When** a consumer imports the component, **Then**
   TypeScript types resolve (no `any`) and React/ReactDOM are declared as peer deps (no
   duplicate-React hazards).

---

### User Story 4 - Storybook for existing custom components (Priority: P3)

As a frontend developer, I can add stories for the existing custom components (e.g.
`TaskCard`, `TaskFilters`, `StatusBadge`) so the design system is documented alongside the
new `TaskStack`.

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
- How are stacked cards handled when there are many tasks (scroll/limit) vs very few (1 card)?
- How does the library build avoid shipping the SPA's `index.html` and app-only code?
- Are `filters` changes applied client-side to already-fetched tasks, or do they trigger a
  refetch?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The frontend MUST integrate Storybook (`storybook@9.x`, `@storybook/react-vite`)
  so components can be developed and documented in isolation.
- **FR-002**: A `TaskStack` display component MUST render tasks as a deck of cards with each
  card slightly overlapping the previous one (stacked cascade).
- **FR-003**: `TaskStack` MUST accept a `filters` prop (`TaskFilters`) that controls which
  tasks are shown.
- **FR-004**: `TaskStack` MUST accept a `refreshRateMs` prop controlling how often it
  re-fetches its data; the component MUST clean up its interval on unmount and when the value
  changes.
- **FR-005**: A data-fetching wrapper MUST own retrieval (via the existing `api/client`) and
  render the display component; the exported public component MUST be this full
  "display + retrieval" wrapper.
- **FR-006**: The frontend package MUST be configured for library-mode export (Vite library
  mode + `vite-plugin-dts`) producing a consumable `dist` with an `exports` map, `files`,
  and React/ReactDOM as `peerDependencies`, so the component can be installed and used in
  other products.
- **FR-007**: The display component and its props MUST be documented via Storybook stories
  and a contracts document.
- **FR-008**: Existing custom components (e.g. `TaskCard`) MUST have at least a basic story.
- **FR-009**: The app dashboard MUST consume the `TaskStack` wrapper (replacing the raw list)
  as the in-app proof that it works end-to-end.
- **FR-010**: Documentation MUST be updated in the same change: this feature's `contracts/`,
  `quickstart.md`, `research.md`, `plan.md`, and the repo `README.md`.

### Key Entities *(include if feature involves data)*

- **TaskStack (display)**: Presentational component; props `tasks: Task[]`, `filters`,
  optional render props; no fetching. Reuses the existing `Task` type from `api/client`.
- **TaskStack (wrapper / exported)**: Owns retrieval through `api.listTasks(filters)` on a
  `refreshRateMs` interval; renders the display component with loading/error/empty states.
- **Storybook**: The isolated component workbench; `.storybook/` config wiring Tailwind v4.
- **Library build**: Vite library-mode output (`dist/`) with `exports` map + type declarations,
  making the component installable elsewhere.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `pnpm storybook` starts and renders the `TaskStack` story with working filter
  and refresh-rate controls.
- **SC-002**: The dashboard renders active tasks as a stacked deck via the TaskStack wrapper
  (fetched from `/api/tasks`).
- **SC-003**: `pnpm --filter frontend build` produces a package-usable `dist` that passes
  `npx publint` and `npx @arethetypeswrong/cli --pack` with no errors.
- **SC-004**: A consumer can import the `TaskStack` wrapper from the built package and render
  it with a mocked `dataSource`, confirming self-fetching works outside this repo.
- **SC-005**: Storybook includes a story for at least one existing custom component
  (e.g. `TaskCard`) in addition to `TaskStack`.

## Assumptions

- The component lives in and is exported from the existing `@procrastinator-tracker/frontend`
  package (coupled) so shared utilities like the api client are reused; a new standalone
  workspace package is out of scope per user decision.
- `storybook@9.x` + `@storybook/react-vite` support React 19, Vite 6, and Tailwind v4 via the
  `@tailwindcss/vite` plugin (verified present in the stack).
- The `Task` and `TaskFilters` types from `frontend/src/api/client.ts` are the source of truth
  for the component's public types.
- "Exportable as a package" means the component is buildable and consumable as a local
  installable artifact; publishing to a public/private npm registry is a documented follow-up,
  not part of this change.
- Refresh rate is implemented as an interval-triggered re-fetch of `api.listTasks`; no
  websockets/SSE in v1.
