# Implementation Plan: Storybook + Exportable TaskStack Component

**Branch**: `003-storybook-task-stack` | **Date**: 2026-09-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-storybook-task-stack/spec.md`

## Summary

Integrate **Storybook** into the frontend as the isolated component workbench, and develop a
new **"to-develop" `TaskStack` component** that renders tasks as a deck of cards stacked
slightly on top of one another. The component is **configurable** for the filter of which
tasks to show and for the **refresh rate**. It is split into a **presentational display
component** (pure, props-only) and a **data-fetching wrapper** (owns retrieval via the
existing `api/client`) — and the **exported public component is the full wrapper with
retrieval**, so it can be installed and used in other products.

The component lives in and is exported from the existing `@procrastinator-tracker/frontend`
package (coupled, per user decision) so shared utilities like the api client and the `Task` /
`TaskFilters` types are reused. A separate library-mode build produces a consumable `dist`.

Primary requirement: add Storybook; build `TaskStack` (display + self-fetching wrapper) with
`filters` and `refreshRateMs` props; configure the frontend package for library export; wire
the wrapper into the dashboard; document everything in the same change.

## Technical Context

**Language/Version**: TypeScript / Node 24 LTS, pnpm 11 (unchanged); React 19, Vite 6, Tailwind
v4 (already in `frontend/`).

**Primary Dependencies**:
- Added (dev, frontend): `storybook@9`, `@storybook/react-vite`, `@storybook/addon-essentials`,
  `vite-plugin-dts`. (Optional later: `@storybook/addon-a11y`.)
- Existing reused: `@tailwindcss/vite` (Tailwind v4), `vite`, `@vitejs/plugin-react`,
  `react`, `react-dom`, `@tanstack/react-query`, `lucide-react`.

**Storage**: Unchanged — the component fetches from the existing REST API
(`GET /api/tasks`) via `frontend/src/api/client.ts`. No new storage.

**Testing**: Existing vitest suites remain. Add a `TaskStack` story (visual/interaction) and a
light unit test for the display component's stacking/filter behavior if warranted. Package
validation via `npx publint` and `npx @arethetypeswrong/cli --pack` (not part of the test
runner; run manually in quickstart).

**Target Platform**: Browser (SPA dev server + Storybook dev server on `:6006`). The package
build targets any React 19 app.

**Project Type**: Full-stack web application (pnpm workspace: `backend`, `frontend`) where the
`frontend` package doubles as a source of exportable UI components.

**Performance Goals**: Storybook starts quickly (Vite HMR); the TaskStack refresh interval must
not overlap in-flight requests; library build is tree-shakeable.

**Constraints**: Coupled to the existing frontend package (no new workspace package);
Tailwind v4 (no PostCSS config needed — use the `@tailwindcss/vite` plugin); React 19;
local-first; docs updated in the same change; no gold-plating.

**Scale/Scope**: Single developer; this change adds Storybook + one new component + library
export wiring to the frontend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Verdict | Justification |
|------|---------|---------------|
| I. Pragmatic Code Quality | PASS | Two small components (display + wrapper), one reusable; no gold-plating; reuses the existing api client and Tailwind stack. |
| II. Automated Formatting | PASS | Existing single Prettier config covers new `.tsx`/`.ts` files and `.storybook/` config; no new formatter. |
| III. Automated Linting | PASS | Existing ESLint config covers new files; no rule exceptions required. |
| IV. Testable & Maintainable | PASS | Display component is a pure function of props (trivially testable); wrapper separates data concerns; cohesive module layout under `frontend/src/components/task/`. |
| V. Living Documentation | PASS | `contracts/task-stack.md`, `contracts/storybook.md`, `quickstart.md`, `research.md`, `plan.md`, `spec.md`, and `README.md` updated in the same change. |
| Additional Constraints (Practicality) | PASS | Coupled to the existing frontend package per explicit user decision; Storybook is a dev-only workbench, not a runtime dependency. |
| Workflow & Quality Gates | PASS | Format + lint + typecheck + test pass before merge; library build validated with `publint`/`attw`; Storybook renders the component. |

**Complexity Tracking**: No constitution violations. The only additions are Storybook (dev
tooling) and one component family (display + fetching wrapper). The display/wrapper split is
justified by the requirement that the exported component self-fetches while remaining
presentational internally — a conventional, boring pattern (container/component).

**Re-check after Phase 1 design**: PASS. The delivered design (research.md, data-model.md,
contracts/task-stack.md, contracts/storybook.md, quickstart.md) introduces no new complexity:
Storybook is dev-only tooling, the component is a conventional presentational + self-fetching
wrapper pair, and the library export reuses Vite (already present). One styling source
(Tailwind v4 via `index.css`), no new runtime dependencies, no rule exceptions. All gates
remain green.

## Project Structure

### Documentation (this feature)

```text
specs/003-storybook-task-stack/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   ├── task-stack.md    # Phase 1: public component API + package export contract
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
│   ├── components/task/
│   │   ├── TaskStack.tsx         # NEW: presentational stacked-deck display (pure)
│   │   ├── TaskStack.stories.tsx # NEW: Storybook stories + controls
│   │   └── TaskStackWrapper.tsx  # NEW: self-fetching wrapper (interval + api) — EXPORTED
│   ├── components/task/TaskCard.stories.tsx # NEW (P3): story for existing TaskCard
│   └── api/client.ts             # unchanged — source of Task/TaskFilters types
├── pages/DashboardPage.tsx       # MODIFY: render TaskStackWrapper instead of raw list
├── package.json                  # MODIFY: storybook scripts, library build, exports, peerDeps
└── tsconfig.json                 # MODIFY (if needed): include .storybook, lib entry
```

Build outputs: SPA app → `dist-app/` (`vite.config.ts` `outDir`), Storybook static →
`dist-storybook/` (`-o dist-storybook`), library → `dist-lib/` (`vite.lib.config.ts`).

**Structure Decision**: No new package — the component and its wrapper live in the existing
`frontend/src/components/task/` directory alongside `TaskCard`. The library build uses a
dedicated `vite.lib.config.ts` so the SPA dev/build and the package build coexist. Consistent
with the existing "coupled frontend" structure and the user's explicit decision to couple with
the frontend package.

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
  `external: ['react', 'react-dom', 'react/jsx-runtime']`, `vite-plugin-dts` for type
  declarations, and the `package.json` `exports` map + `files` + `peerDependencies`. Build
  outputs are segregated: `dist-app/` (SPA), `dist-storybook/` (Storybook static),
  `dist-lib/` (library package).
- `TaskStack` component design: display (pure) + self-fetching wrapper; `filters` and
  `refreshRateMs` props; interval cleanup; in-flight-request handling; error/empty states.
- Package validation tooling: `publint` and `@arethetypeswrong/cli --pack`.
- Storybook vs. app Tailwind: Tailwind v4 classes are emitted for the whole source tree, so
  the same `index.css` works for both the app and Storybook preview.

## Phase 1: Design (data-model.md, contracts/, quickstart.md)

- **data-model.md**: The `TaskStack` component contract — public props (`tasks`, `filters`,
  `refreshRateMs`, render/state props), the display/wrapper split, and how the existing `Task`
  and `TaskFilters` types are reused.
- **contracts/task-stack.md**: Public component API (display + exported wrapper), the library
  `exports` map, `peerDependencies`, and a consumer usage example.
- **contracts/storybook.md**: Storybook setup (`.storybook/main.ts`, `preview.ts`, Tailwind v4),
  the `TaskStack` story controls, and how to add stories.
- **quickstart.md**: Prerequisites, commands to run Storybook, the library build, and the
  `publint`/`attw` package-validation scenarios, plus the in-app and mock-consumer validation.
