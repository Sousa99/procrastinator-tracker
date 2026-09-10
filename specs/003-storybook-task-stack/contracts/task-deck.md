# Contract: TaskDeck Component API & Package Export

Public contract for the `TaskDeck` component family in the `@procrastinator-tracker/frontend`
package. The **exported** component is `TaskDeckWrapper` — the full component with retrieval
as the user requested; `TaskDeck` is the internal presentational swipe deck it renders.

> **Design revision (2026-09-06)**: replaces the earlier `TaskStack` contract. The deck
> interaction is based on the open-source MIT Kibo `Deck` (the engine behind the shadcnblocks
> "Deck Standard 1" example the user selected).

## Public API

### `TaskDeckWrapper` (exported — self-fetching)

```tsx
import type { Task, TaskFilters } from '@procrastinator-tracker/frontend';
import { TaskDeckWrapper } from '@procrastinator-tracker/frontend';

<TaskDeckWrapper
  filters={{ status: 'in-progress', tag: 'home' }} // optional, default {}
  refreshRateMs={30000} // optional, default 30000; 0 disables polling
  autoRotateMs={4000}   // optional, default 4000; 0 disables auto-rotate
  loop                  // optional, default true (cycles forever)
  stackSize={3}         // optional, default 3
  slideDurationMs={500} // optional, default 500 (swipe/exit animation ms)
  dataSource={async (filters) => myFetch(filters)} // optional, default api.listTasks
  className="w-full"
/>
```

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `filters` | `TaskFilters` | `{}` | passed to `dataSource`; change → refetch |
| `refreshRateMs` | `number` | `30000` | poll interval; `0` disables; cleaned up on change/unmount |
| `dataSource` | `(filters: TaskFilters) => Promise<Task[]>` | `api.listTasks` | injectable for consumers/tests |
| `autoRotateMs` | `number` | `4000` | deck auto-advance interval; `0` disables; pauses during drag, resets after manual skip |
| `loop` | `boolean` | `true` | wrap to first card instead of empty state |
| `stackSize` | `number` | `3` | visible cards (top + fanned behind) |
| `slideDurationMs` | `number` | `500` | swipe/exit animation duration in ms (e.g. `800` for a slower glide) |
| `renderCard` | `(task: Task) => ReactNode` | full card default | per-card render override |
| `className` | `string` | — | wrapper layout styling |

Behavior: fetches on mount, on `filters` change, and on each `refreshRateMs` tick (ticks never
overlap an in-flight request). Renders loading / error / empty states around the swipe deck.
The deck advances on `autoRotateMs`, loops forever, and resets its timer when the user drags a
card away. Skipping is view-only (no task mutation).

**Sizing**: the deck stage fills the container width (`w-full`) with a fixed max height
(`h-[24rem]` base, `sm:h-[26rem]`). Cards are uniform regardless of content; card content is
anchored (description fills the top via `flex-1`, meta/tags/assignees pinned to the bottom)
and long text ellipsizes (`line-clamp-6`, filling the card before the ellipsis). Pass
`className` to adjust the stage. The swipe/exit animation duration is configurable via
`slideDurationMs`.

### `TaskDeck` (internal presentational)

```tsx
<TaskDeck tasks={tasks} filters={filters} autoRotateMs={4000} loop stackSize={3} slideDurationMs={500} renderCard={...} />
```

Pure: `tasks` + options in, swipeable deck out. No fetching, no fetch interval (owns only the
deck's own auto-rotate timer). `filters` affects ordering/emphasis and is applied client-side
for determinism (actual filtering happens at fetch time in the wrapper).

## Deck primitives (vendored, UI — not part of the public API surface)

`frontend/src/components/ui/deck/deck.tsx` vendors the MIT Kibo `Deck` primitives (`Deck`,
`DeckCards`, `DeckCard`, `DeckItem`, `DeckEmpty`), extended with `autoRotateMs` and `loop`
support. These are internal to the frontend package; consumers import `TaskDeck` /
`TaskDeckWrapper`, not the primitives.

## Types re-exported from the package

- `Task`, `TaskStatus`, `TaskFilters` — the existing types from `frontend/src/api/client.ts`
  (single source of truth, re-exported so consumers share one shape).
- `TaskDeckProps`, `TaskDeckWrapperProps` — prop interfaces.

## Library build & `package.json` contract

Build command: `pnpm --filter frontend build:lib` (Vite library mode, `vite.lib.config.ts` +
`vite-plugin-dts`). Outputs ESM JS + bundled `.d.ts` into `frontend/dist-lib/`, then runs
`build:css` (Tailwind v4 CLI) to emit a compiled `styles.css` (with `styles.d.ts`) so the
`./styles.css` subpath export ships real styles for consumers.

```jsonc
// frontend/package.json (target shape — reconciled with the existing SPA build)
{
  "name": "@procrastinator-tracker/frontend",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist-lib/index.js",               // ESM (workspace is ESM-only)
  "module": "./dist-lib/index.js",
  "types": "./dist-lib/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist-lib/index.d.ts",
      "import": "./dist-lib/index.js"
    },
    "./styles.css": {
      "types": "./dist-lib/styles.d.ts",
      "default": "./dist-lib/styles.css"
    }
  },
  "typesVersions": {
    "*": {
      "styles.css": ["./dist-lib/styles.d.ts"]
    }
  },
  "files": ["dist-lib"],
  "sideEffects": false,
  "peerDependencies": {
    "motion": "^13.0.0",                        // deck animation engine
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.469.0"                  // default card rendering uses icons
  }
}
```

Notes:

- The library entry is `src/index.ts`, a barrel exporting the component family, the deck's prop
  types, and the shared `Task`/`TaskFilters` types — **not** app-only modules (`main.tsx`,
  `App.tsx`, pages).
- Three distinct build output dirs keep concerns separate: SPA app → `dist-app/` (via
  `vite.config.ts` `outDir`), Storybook static → `dist-storybook/` (via `-o dist-storybook` on
  `build-storybook`), library → `dist-lib/` (via `vite.lib.config.ts` `outDir`). No collision.
- `motion` is externalized in the library build (`rollupOptions.external`) and declared a
  `peerDependency`, so consumers provide it and there is no duplicate-motion hazard.
- The package is **ESM-only** (`type: module`, `formats: ['es']`). `publint` and
  `@arethetypeswrong/cli --pack` pass; attw reports a single **CJS→ESM warning** (CommonJS
  consumers need dynamic import) — accepted and documented, since the workspace is ESM-only.
- Validation before treating the package as consumable: `npx publint` and
  `npx @arethetypeswrong/cli --pack` must pass (see quickstart).

## Consumer usage example

```tsx
import { TaskDeckWrapper } from '@procrastinator-tracker/frontend';
import '@procrastinator-tracker/frontend/styles.css';

export function Home() {
  return <TaskDeckWrapper filters={{ status: 'started' }} autoRotateMs={5000} />;
}
```