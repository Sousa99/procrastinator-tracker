# Implementation Plan: Storybook + Exportable TaskDeck Component

**Branch**: `feature/003-storybook-task-stack` | **Date**: 2026-09-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-storybook-task-stack/spec.md`

> **Design revision (2026-09-06)**: The original plan targeted a `TaskStack` vertical-overlap
> display. After reviewing that first implementation, the user selected the shadcnblocks
> **"Deck Standard 1"** pattern (a swipeable card stack, powered by the open-source MIT Kibo
> UI `Deck`), requested an **auto-rotate timer** + **drag-to-skip** that **loops forever**, and
> asked that the app keep a **Deck | List** selector. This revision retires `TaskStack` /
> `TaskStackWrapper` in favor of `TaskDeck` / `TaskDeckWrapper`.

## Summary

Integrate **Storybook** into the frontend as the isolated component workbench, and develop a
new **"to-develop" `TaskDeck` component** that renders tasks as a **swipeable card stack**
(top card fully visible, subsequent cards scaled/fanned behind it — Deck Standard 1 / Kibo
`Deck` style). The deck is **configurable**: which tasks to show (`filters`), how often to
refresh (`refreshRateMs`), how long before it **auto-rotates** (`autoRotateMs`, default 4s,
`0` disables), the swipe/exit animation speed (`slideDurationMs`, default 500ms), whether it
**loops** forever (default true), and how many cards peek in the stack (`stackSize`). It is
split into a **presentational display component** (props-only) and a **data-fetching wrapper**
(owns retrieval via the existing `api/client`) — and the **exported public component is the
full wrapper with retrieval**, so it can be installed and used in other products.

The component lives in and is exported from the existing `@procrastinator-tracker/frontend`
package (coupled, per user decision) so shared utilities like the api client and the `Task` /
`TaskFilters` types are reused. A separate library-mode build produces a consumable
`dist-lib`.

Primary requirement: add Storybook; build `TaskDeck` (display + self-fetching wrapper) with
`filters`, `refreshRateMs`, `autoRotateMs`, `loop`, and `stackSize` props; configure the
frontend package for library export; wire the deck into the dashboard behind a **Deck | List**
selector; document everything in the same change.

## Storybook Docs extension

**Summary**: Extend the Storybook workbench with a **documentation page per task component**
(`TaskDeck`, `TaskDeckWrapper`, `TaskCard`) written in **MDX** using **Doc Blocks**
(`Meta`, `Canvas`, `Story`, `Controls`/`ArgTypes`, `Source`) from `@storybook/addon-docs/blocks`.
Each page shows a canvas per existing story permutation plus concise usage prose, and the
controls table renders with a **description for every prop** (from `argTypes.description`).

**Technical context**:
- Added (dev, frontend): `@storybook/addon-docs@9` (MDX3; ships the Doc Blocks).
- `frontend/.storybook/main.ts` gains `@storybook/addon-docs` in `addons` and
  `'../src/**/*.mdx'` in `stories` so MDX docs pages are discovered alongside stories.
- Prop tables come from the **`ArgTypes`/`Controls` Doc Blocks** (auto-rendered from
  `argTypes`); no `remark-gfm` or other external dependency is needed for tables.
- Docs pages are **co-located** `*.mdx` next to each `.stories.tsx`. `.mdx` files under `src/`
  are ignored by `tsc`/vitest (not a TS extension) and never enter `dist-lib`.
- **Custom MDX only**: no `tags: ['autodocs']` on the documented components, avoiding an
  override conflict with the custom MDX page.
- The project's own `argTypes` get `description` fields (T029–T031) so every control is
  self-explanatory in both the canvas and the docs page.

**Phase roadmap**: see **Phase 8: Storybook Docs** in `tasks.md` (T027–T036).

## Technical Context

**Language/Version**: TypeScript / Node 24 LTS, pnpm 11 (unchanged); React 19, Vite 6, Tailwind
v4 (already in `frontend/`).

**Primary Dependencies**:
- Added (dev, frontend): `storybook@9`, `@storybook/react-vite`, `vite-plugin-dts`. (Optional
  later: `@storybook/addon-a11y`.)
- Added (runtime, frontend — engine for the swipe deck): `motion` (motion/react),
  `@radix-ui/react-use-controllable-state`. Declared as `peerDependencies` of the exported
  package so consumers supply them.
- Existing reused: `@tailwindcss/vite` (Tailwind v4), `vite`, `@vitejs/plugin-react`,
  `react`, `react-dom`, `@tanstack/react-query`, `lucide-react`.

**Storage**: Unchanged — the component fetches from the existing REST API
(`GET /api/tasks`) via `frontend/src/api/client.ts`. No new storage.

**Testing**: Existing vitest suites remain. Add a `TaskDeck` story (visual/interaction), a
unit test for the display component's stack/filter behavior, and a test for the wrapper's
auto-rotate / drag-reset semantics. Package validation via `npx publint` and
`npx @arethetypeswrong/cli --pack` (not part of the test runner; run manually in quickstart).

**Target Platform**: Browser (SPA dev server + Storybook dev server on `:6006`). The package
build targets any React 19 app.

**Project Type**: Full-stack web application (pnpm workspace: `backend`, `frontend`) where the
`frontend` package doubles as a source of exportable UI components.

**Performance Goals**: Storybook starts quickly (Vite HMR); the deck's auto-rotate and refresh
intervals are cleaned up on unmount and never overlap in-flight requests; library build is
tree-shakeable.

**Constraints**: Coupled to the existing frontend package (no new workspace package);
Tailwind v4 (no PostCSS config needed — use the `@tailwindcss/vite` plugin); React 19;
local-first; docs updated in the same change; no gold-plating; deck interaction based on the
MIT Kibo `Deck` primitive (not the paywalled Deck Fan 1 styling).

**Scale/Scope**: Single developer; this change adds Storybook + one new component + library
export wiring to the frontend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Verdict | Justification |
|------|---------|---------------|
| I. Pragmatic Code Quality | PASS | Two small components (display + wrapper) built on an MIT primitive; no gold-plating; reuses the existing api client and Tailwind stack. |
| II. Automated Formatting | PASS | Existing single Prettier config covers new `.tsx`/`.ts` files and `.storybook/` config; no new formatter. |
| III. Automated Linting | PASS | Existing ESLint config covers new files; no rule exceptions required. |
| IV. Testable & Maintainable | PASS | Display component is a pure function of props; wrapper separates data concerns; deck primitives live under `frontend/src/components/ui/deck/`; cohesive module layout under `frontend/src/components/task/`. |
| V. Living Documentation | PASS | `contracts/task-deck.md`, `contracts/storybook.md`, `quickstart.md`, `research.md`, `plan.md`, `spec.md`, and `README.md` updated in the same change. |
| Additional Constraints (Practicality) | PASS | Coupled to the existing frontend package per explicit user decision; Storybook is a dev-only workbench; the `motion` dependency is justified as the deck's animation engine. |
| Workflow & Quality Gates | PASS | Format + lint + typecheck + test pass before merge; library build validated with `publint`/`attw`; Storybook renders the component. |

**Complexity Tracking**: No constitution violations. The one new runtime dependency (`motion`)
is justified: it is the standard engine for drag/swipe/animation and is the basis of the
open-source Kibo `Deck` the user selected. Everything else reuses the existing stack.

**Re-check after Phase 1 design**: PASS. The delivered design (research.md, data-model.md,
contracts/task-deck.md, contracts/storybook.md, quickstart.md) introduces no new complexity:
Storybook is dev-only tooling, the component is a conventional presentational + self-fetching
wrapper pair over an MIT primitive, and the library export reuses Vite (already present). One
styling source (Tailwind v4 via `index.css`), one justified runtime dep (`motion`), no rule
exceptions. All gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/003-storybook-task-stack/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   ├── task-deck.md     # Phase 1: public component API + package export contract
│   └── storybook.md     # Phase 1: Storybook setup/stories contract
├── spec.md              # Feature specification
├── checklists/          # Spec-quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code & Config (repository root)

```text
frontend/
├── .storybook/
│   ├── main.ts          # NEW: stories glob, @storybook/react-vite, viteFinal (tailwind)
│   └── preview.ts       # NEW: import ../src/index.css (Tailwind v4)
├── vite.lib.config.ts   # NEW: library-mode build (ESM) + vite-plugin-dts -> dist-lib/
├── src/
│   ├── components/ui/deck/
│   │   └── deck.tsx     # NEW: vendored/adapted Kibo Deck primitives (Deck, DeckCards,
│   │                    #       DeckCard, DeckItem, DeckEmpty) + autoRotate/loop additions
│   ├── components/task/
│   │   ├── TaskDeck.tsx            # NEW: presentational swipeable deck (pure) — replaces TaskStack
│   │   ├── TaskDeck.stories.tsx    # NEW: Storybook stories + controls (+ argTypes descriptions)
│   │   ├── TaskDeck.mdx            # NEW (P8): docs page — Meta, prose, Canvas per permutation, Controls/ArgTypes, Source
│   │   ├── TaskDeckWrapper.tsx     # NEW: self-fetching wrapper (interval + api + autoRotate) — EXPORTED
│   │   ├── TaskDeckWrapper.stories.tsx # NEW: wrapper story (mocked dataSource) (+ argTypes descriptions)
│   │   ├── TaskDeckWrapper.mdx     # NEW (P8): docs page — Default + AutoRotating permutations
│   │   ├── TaskDeck.fixtures.ts    # RENAME: TaskStack.fixtures.ts -> TaskDeck.fixtures.ts
│   │   ├── TaskCard.stories.tsx    # NEW (P3): story for existing TaskCard (+ argTypes description)
│   │   ├── TaskCard.mdx            # NEW (P8): docs page — Default, Urgent, WithDescription, Minimal
│   │   └── [TaskStack.tsx, TaskStackWrapper.tsx, *.stories.tsx — DELETED]
│   └── api/client.ts               # unchanged — source of Task/TaskFilters types
├── pages/DashboardPage.tsx         # MODIFY: add Deck | List selector; Deck -> TaskDeckWrapper, List -> vertical TaskCard list
├── .storybook/main.ts              # MODIFY (P8): add @storybook/addon-docs; add ../src/**/*.mdx to stories
├── package.json                    # MODIFY: motion + radix deps/peerDeps, storybook scripts, library build, exports; add @storybook/addon-docs (P8)
└── tsconfig.json                   # MODIFY (if needed): include .storybook, lib entry
```

Build outputs: SPA app → `dist-app/` (`vite.config.ts` `outDir`), Storybook static →
`dist-storybook/` (`-o dist-storybook`), library → `dist-lib/` (`vite.lib.config.ts`).

**Sizing/visual**: the deck stage fills the container width with a fixed max height
(`h-[24rem]`/`sm:h-[26rem]`); all cards are uniform (`h-full flex flex-col overflow-hidden`)
with long text ellipsized (`line-clamp-2`). `DeckItem` is a neutral fill container so no
wrapper border extends past the card.

**Structure Decision**: No new package — the component and its wrapper live in the existing
`frontend/src/components/task/` directory alongside `TaskCard`. The deck primitives live under
`frontend/src/components/ui/deck/` (reusable UI). The library build uses a dedicated
`vite.lib.config.ts` so the SPA dev/build and the package build coexist. Consistent with the
existing "coupled frontend" structure and the user's explicit decision to couple with the
frontend package.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify (see Constitution Check).

## Phase 0: Research (research.md)

Resolve the integration specifics:

- Storybook 9 + `@storybook/react-vite` compatibility with React 19, Vite 6, and Tailwind v4
  (via the `@tailwindcss/vite` plugin, referenced in `viteFinal`; preview imports
  `../src/index.css`). In Storybook 9 the essentials addons (controls, actions, viewport) are
  built into core — no `@storybook/addon-essentials` package is required.
- Vite library mode for exporting a React component package: entry, ESM format,
  `external: ['react', 'react-dom', 'react/jsx-runtime', 'motion']`, `vite-plugin-dts` for type
  declarations, and the `package.json` `exports` map + `files` + `peerDependencies`. A Tailwind
  v4 CLI step (`build:css`) ships a compiled `styles.css` (+ `styles.d.ts`, `typesVersions`)
  so the `./styles.css` subpath export is real. The package is ESM-only (attw's CJS→ESM
  warning is an accepted, documented tradeoff). Build outputs are segregated: `dist-app/`
  (SPA), `dist-storybook/` (Storybook static), `dist-lib/` (library package).
- The Kibo UI `Deck` primitive (MIT): `Deck`, `DeckCards`, `DeckCard`, `DeckItem`,
  `DeckEmpty`; controllable `currentIndex`, `animateOnIndexChange`, `indexChangeDirection`,
  `threshold`, `stackSize`, `perspective`, `scale`; `onSwipe`/`onSwipeEnd`. How to add
  **auto-rotate** (interval advancing `currentIndex`) and **loop** (wrap index to 0) and how
  to **reset the timer on a manual swipe / pause during drag**.
- `TaskDeck` component design: display (pure) + self-fetching wrapper; `filters`,
  `refreshRateMs`, `autoRotateMs`, `loop`, `stackSize` props; interval cleanup;
  in-flight-request handling; error/empty states.
- Package validation tooling: `publint` and `@arethetypeswrong/cli --pack`.
- Storybook vs. app Tailwind: Tailwind v4 classes are emitted for the whole source tree, so
  the same `index.css` works for both the app and Storybook preview.

## Phase 1: Design (data-model.md, contracts/, quickstart.md)

- **data-model.md**: The `TaskDeck` component contract — public props (`tasks`, `filters`,
  `refreshRateMs`, `autoRotateMs`, `loop`, `stackSize`, render/state props), the
  display/wrapper split, the deck primitives, and how the existing `Task` and `TaskFilters`
  types are reused.
- **contracts/task-deck.md**: Public component API (display + exported wrapper), the library
  `exports` map, `peerDependencies` (incl. `motion`), and a consumer usage example.
- **contracts/storybook.md**: Storybook setup (`.storybook/main.ts`, `preview.ts`, Tailwind v4),
  the `TaskDeck` story controls, and how to add stories.
- **quickstart.md**: Prerequisites, commands to run Storybook, the library build, and the
  `publint`/`attw` package-validation scenarios, plus the in-app (Deck | List) and
  mock-consumer validation.