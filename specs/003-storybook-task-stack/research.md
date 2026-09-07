# Research: Storybook + Exportable TaskDeck Component

Phase 0 output for `specs/003-storybook-task-stack`. Resolves the technical unknowns in the
plan's Technical Context. Every decision records **Decision / Rationale / Alternatives
considered**.

> **Design revision (2026-09-06)**: Initial research targeted a `TaskStack` vertical-overlap
> display. After review, the user selected the shadcnblocks **"Deck Standard 1"** swipe-card
> pattern and asked for auto-rotate + drag-to-skip with looping. Sections 4, 5, and 7 below
> reflect that revision; the component family is now `TaskDeck` / `TaskDeckWrapper`.

## 1. Storybook version & framework

**Decision**: `storybook@9` with `@storybook/react-vite` (the Vite builder for React).

**Rationale**: Storybook 9 supports React 19 and Vite (the stack already in `frontend/`).
`@storybook/react-vite` is the official Vite framework — it merges the project's `vite.config`
defaults with Storybook's own builder config, so Tailwind v4 (via the `@tailwindcss/vite`
plugin) works with minimal setup. React 19 support was completed in the Storybook 9 release
line (tracked in storybookjs/storybook#29805). In Storybook 9 the essentials addons (controls,
actions, viewport, …) are built into core, so no `@storybook/addon-essentials` package is
needed.

**Alternatives considered**: Storybook 8 (older, works but not the current line and less
friction-free with Tailwind v4), Ladle (lighter but not a general component workbench and
would add a second toolchain), Chromatic-only (a paid service, not a local workbench).

## 2. Tailwind v4 + Storybook

**Decision**: Wire the existing `@tailwindcss/vite` plugin into Storybook's Vite config
(`viteFinal` in `.storybook/main.ts`) and import `../src/index.css` in
`.storybook/preview.ts`.

**Rationale**: Tailwind v4 ships its Vite integration through `@tailwindcss/vite` (no PostCSS
config needed — `postcss.config` is unnecessary, unlike v3). Because Tailwind v4 scans the
source tree for class names, the same `index.css` emits styles for both the app and the
Storybook preview iframe. The official Storybook Tailwind recipe and the `@tailwindcss/vite`
documentation confirm this path; the project already uses the plugin in `vite.config.ts`.

**Alternatives considered**: PostCSS route (`@tailwindcss/postcss`) — unnecessary with Vite;
a separate `tailwind.config.js` — Tailwind v4 defaults to CSS-first config (`@theme` in
`index.css`), which this project already uses.

## 3. Library-mode export of the component package

**Decision**: Vite **library mode** in a dedicated `vite.lib.config.ts` + `vite-plugin-dts`
for type declarations. `package.json` gains an `exports` map, `files: ["dist-lib"]`, and
`peerDependencies` for `react`/`react-dom`/`motion`. Output is ESM. Three distinct
output dirs keep concerns separate: SPA app → `dist-app/`, Storybook static →
`dist-storybook/`, library → `dist-lib/`.

**Rationale**: The frontend is currently an SPA build (`vite build` → `dist-app/` with
`index.html`). Library mode is the standard, low-ceremony way to also produce a consumable
package from the same source; `vite-plugin-dts` emits `.d.ts` without a separate api-extractor
step. Keeping it in a separate config file means the SPA dev/build is untouched. This matches
the 2026 best practice for React component libraries (Vite library mode + Vite builder already
present for Storybook).

**Key library-mode details**:
- Entry: `src/index.ts` (a barrel that exports `TaskDeck`, `TaskDeckWrapper`, and the shared
  types it needs — but NOT app-only code like `main.tsx` or `App.tsx`).
- `build.lib`: `entry`, `formats: ['es']` (ESM; the whole workspace is ESM), `fileName`.
- `rollupOptions.external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react',
  'motion']` so consumers don't get a second copy of React or motion.
- `vite-plugin-dts` with `bundleTypes: true` to emit a single declaration bundle (requires
  `@microsoft/api-extractor`, already added).
- `package.json` `exports["."]`: `{ types, import }` → `dist-lib/*.d.ts` / `dist-lib/*.js`.
- `peerDependencies`: `react`, `react-dom`, `motion` (deck engine), and `lucide-react` if the
  default card rendering uses icons.

**Alternatives considered**: `tsup` (excellent for Node-targeted libs but we already need
Vite for Storybook; two toolchains = more surface), a separate workspace package
(`packages/task-deck`) — rejected by explicit user decision (couple with the frontend package
so shared utilities like the api client are reused), `unbuild` (great in big monorepos with
stub mode, overkill here).

## 4. Deck interaction: Kibo UI `Deck` (MIT) — the basis for Deck Standard 1

**Decision**: Build the swipe interaction on the **open-source MIT Kibo UI `Deck`** primitive
(vendored/adapted into `frontend/src/components/ui/deck/`), which powers the shadcnblocks
**"Deck Standard 1"** example the user selected. Add **auto-rotate** and **loop** on top.

**Rationale**: "Deck Fan 1" (the first component the user liked) is **paywalled (Pro)**, but
its engine is the MIT-licensed Kibo `Deck` — free, open source, and the same primitives
(`Deck`, `DeckCards`, `DeckCard`, `DeckItem`, `DeckEmpty`) behind the free "Deck Standard 1".
Using the MIT primitive gives us the drag/swipe/threshold/scale/perspective behavior for free
and keeps the package dependency-light (`motion` only). The user explicitly asked for the
Deck Standard 1 look ("as-is") rather than the fanned Deck Fan 1 styling.

**Kibo `Deck` capabilities (from `packages/deck/index.tsx`, verified)**:
- `Deck` — relative/isolate wrapper; `DeckCards` — the swipe stack; `DeckItem` — styled card
  content wrapper; `DeckEmpty` — empty state.
- Controllable index: `currentIndex` / `defaultCurrentIndex` / `onCurrentIndexChange`.
- `animateOnIndexChange` + `indexChangeDirection` — programmatic index changes trigger the
  same exit animation a manual swipe uses → this is how we drive **auto-rotate on a timer**.
- `threshold` (default 150), `stackSize` (default 3), `perspective` (default 1000),
  `scale` (default 0.05); `onSwipe` / `onSwipeEnd` callbacks.
- Drag: top card is `motion.div` with `drag="x"`, `rotate`/`opacity` driven by `useTransform`
  of `x`; `onDragEnd` checks `info.offset.x` against the threshold.

**Gaps vs. our requirements (we add these)**:
- **Auto-rotate**: a `setInterval(autoRotateMs)` that advances `currentIndex` (with
  `animateOnIndexChange`) — same animation as a manual swipe.
- **Loop**: Kibo's deck is linear and reaches `DeckEmpty` at the end; we add a `loop` flag that
  wraps `currentIndex` back to 0 (cycles forever, per user decision).
- **Timer reset on manual swipe**: reset/restart the interval whenever the user drags a card
  past the threshold; **pause** it while a drag is in progress (onDragStart/onDragEnd).

**Alternatives considered**: `@daformat/react-swipeable-cards` (headless, Web Animations API,
loop via `sendToBack`) — viable but adds a third-party dep and its own layout model;
hand-rolling pointer handlers — reinventing a proven, accessible interaction for no benefit;
Framer-Motion-only deck from scratch — more code than vendoring the MIT primitive.

## 5. Component design: display vs. self-fetching wrapper

**Decision**: Split into two layers:
- `TaskDeck` (presentational): props `{ tasks: Task[]; filters?: TaskFilters; autoRotateMs?;
  loop?; stackSize?; ... }`; renders the swipeable card stack via the deck primitives; pure and
  deterministic; no fetching, no fetch interval (it owns only the deck's own auto-rotate timer).
- `TaskDeckWrapper` (exported public component): owns retrieval via
  `api.listTasks(filters)` on a `refreshRateMs` interval; renders `TaskDeck` with
  loading / error / empty states; exposes `dataSource` for consumer override/tests and forwards
  `autoRotateMs`/`loop`/`stackSize`.

**Rationale**: The user wants "the full component with retrieval" to be the export, while
"we may have a wrapper internally ... and then a wrapper which loads the information and uses
the display component". This is the classic container/presentational split (conventional,
boring, testable) and matches the requirement that the component is usable in other products
without wiring data plumbing. The wrapper exposes an injectable `dataSource` so consumers can
point it at their own endpoint and so Storybook/tests can mock it.

**Refresh semantics**: `refreshRateMs` drives a `setInterval` that triggers a refetch. The
interval is re-created when `refreshRateMs` changes and cleared on unmount. An in-flight
request is never overlapped: a refetch is skipped if one is already running. Filters are
applied at fetch time (passed to `api.listTasks`) — consistent with the backend supporting
`GET /api/tasks?status=&tag=...`.

**Auto-rotate semantics**: `autoRotateMs` (default 4000, `0` disables) drives the deck's own
advance timer. The timer is cleared on unmount, recreated when `autoRotateMs` changes, paused
during a drag, and reset after a manual skip (per user decision). Skipping is **view-only** —
no task mutation.

**Alternatives considered**: Single self-contained component (fetching inline) — less
testable and couples presentation to data; react-query for polling (the app already uses
`@tanstack/react-query` for `useTasks`) — reasonable, but a prop-driven `refreshRateMs` interval
keeps the exported component dependency-light and framework-agnostic for external consumers.

## 6. Package validation tooling

**Decision**: Validate the built package with `npx publint` and `npx @arethetypeswrong/cli
--pack` (dev-time only, run manually in quickstart; not added as a runtime dep).

**Rationale**: These two tools catch the two classic package-export failure classes: (a)
`exports`-map mistakes / missing `main`/`module`/`types` (publint) and (b) types that exist
in the tarball but don't resolve from every consumer perspective (attw). Both are CLI-only and
need no install; they align with the constitution's dependency-hygiene and pragmatic-quality
rules.

**Alternatives considered**: A hand-rolled `ls dist/*.d.ts` check (misses resolution bugs),
Chromatic (paid visual service, out of scope).

## 7. Storybook & app Tailwind divergence

**Decision**: No separate CSS entry for Storybook; reuse `src/index.css`.

**Rationale**: Tailwind v4's Vite plugin scans the same source tree, so all utility classes
used by components/stories are emitted regardless of which build (app or Storybook) runs. This
keeps one styling source of truth (constitution Principle II: exactly one formatter/config per
language; Principle V: living docs).

**Alternatives considered**: A Storybook-only CSS file — duplicated theme tokens, rejected.

## 8. Wiring into the dashboard: Deck | List selector

**Decision**: `DashboardPage` gets a local **"Deck | List"** toggle (component state, not
persisted). Deck mode renders `TaskDeckWrapper` (with current `filters` state and sensible
defaults for `refreshRateMs`/`autoRotateMs`); List mode renders the existing vertical
`TaskCard` list (feature 001 behavior, unchanged).

**Rationale**: The user explicitly wants the app to keep the vertical list as one display mode
and offer the stacked overview as the alternative, rather than replacing the list outright.
This is the in-app proof that the exported component works end-to-end (SC-002/SC-004). The
existing `useTasks` react-query hook stays for other consumers; the wrapper is the deck's own
fetching path.

**Alternatives considered**: Replacing the list with the deck entirely — rejected by the user
(the selector was requested); persisting the choice — user chose a local, non-persisted toggle.

## Consolidated decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Storybook version/framework | `storybook@9` + `@storybook/react-vite` |
| 2 | Tailwind v4 integration | `@tailwindcss/vite` in `viteFinal`; preview imports `src/index.css` |
| 3 | Package export | Vite library mode (`vite.lib.config.ts`) + `vite-plugin-dts`; `exports`/`files`/`peerDependencies` (incl. `motion`); outputs `dist-lib/` (app → `dist-app/`, storybook → `dist-storybook/`) |
| 4 | Deck interaction | MIT Kibo `Deck` primitive (basis of Deck Standard 1), vendored; + auto-rotate, loop, drag-resets-timer |
| 5 | Component architecture | Presentational `TaskDeck` + self-fetching `TaskDeckWrapper` (exported), injectable `dataSource`, interval-based refresh + auto-rotate |
| 6 | Package validation | `npx publint` + `npx @arethetypeswrong/cli --pack` |
| 7 | Storybook styling | Reuse `src/index.css` (one Tailwind source) |
| 8 | In-app usage | Dashboard "Deck | List" local toggle; Deck → `TaskDeckWrapper`, List → vertical `TaskCard` list |