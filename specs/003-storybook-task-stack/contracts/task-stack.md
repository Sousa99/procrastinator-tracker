# Contract: TaskStack Component API & Package Export

Public contract for the `TaskStack` component family in the `@procrastinator-tracker/frontend`
package. The **exported** component is `TaskStackWrapper` — the full component with retrieval
as the user requested; `TaskStack` is the internal presentational display it renders.

## Public API

### `TaskStackWrapper` (exported — self-fetching)

```ts
import type { Task, TaskFilters } from '@procrastinator-tracker/frontend';
import { TaskStackWrapper } from '@procrastinator-tracker/frontend';

<TaskStackWrapper
  filters={{ status: 'in-progress', tag: 'home' }} // optional, default {}
  refreshRateMs={30000} // optional, default 30000; 0 disables polling
  dataSource={async (filters) => myFetch(filters)} // optional, default api.listTasks
  maxVisible={8} // optional, forwarded to display
  className="max-w-md" // optional
/>
```

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `filters` | `TaskFilters` | `{}` | passed to `dataSource`; change → refetch |
| `refreshRateMs` | `number` | `30000` | poll interval; `0` disables; cleaned up on change/unmount |
| `dataSource` | `(filters: TaskFilters) => Promise<Task[]>` | `api.listTasks` | injectable for consumers/tests |
| `maxVisible` | `number` | all | cap on stacked cards |
| `renderCard` | `(task: Task) => ReactNode` | default card | per-card render override |
| `className` | `string` | — | wrapper layout styling |

Behavior: fetches on mount, on `filters` change, and on each `refreshRateMs` tick (ticks never
overlap an in-flight request). Renders loading / error / empty states around the deck.

### `TaskStack` (internal presentational)

```ts
<TaskStack tasks={tasks} filters={filters} renderCard={...} maxVisible={...} />
```

Pure: `tasks` + options in, deck out. No fetching, no timers. `filters` affects ordering and
emphasis only (actual filtering happens at fetch time in the wrapper).

## Types re-exported from the package

- `Task`, `TaskStatus`, `TaskFilters` — the existing types from `frontend/src/api/client.ts`
  (single source of truth, re-exported so consumers share one shape).
- `TaskStackProps`, `TaskStackWrapperProps` — prop interfaces.

## Library build & `package.json` contract

Build command: `pnpm --filter frontend build:lib` (Vite library mode, `vite.lib.config.ts` +
`vite-plugin-dts`). Outputs ESM JS + bundled `.d.ts` into `frontend/dist/`.

```jsonc
// frontend/package.json (target shape — reconciled with the existing SPA build)
{
  "name": "@procrastinator-tracker/frontend",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",               // ESM (workspace is ESM-only)
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./styles.css": "./dist/styles.css"     // emitted Tailwind CSS if shipped
  },
  "files": ["dist"],
  "sideEffects": false,
  "peerDependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "lucide-react": "^0.469.0"              // if default card rendering uses icons
  }
}
```

Notes:

- The library entry is a new `src/index.ts` barrel exporting only the component family and its
  types — **not** app-only modules (`main.tsx`, `App.tsx`, pages).
- The existing SPA build (`vite build` → app `dist/`) is unchanged; the library build uses the
  dedicated `vite.lib.config.ts`. A concrete `dist` layout for both must not collide (the SPA
  build keeps `index.html`; the lib build is a pure package). Implementation picks the exact
  output dirs (e.g. `dist/lib` for the package) during Phase 2.
- `peerDependencies` avoid duplicate-React hazards in consumers.
- Validation before treating the package as consumable: `npx publint` and
  `npx @arethetypeswrong/cli --pack` must pass (see quickstart).

## Consumer usage example

```tsx
import { TaskStackWrapper } from '@procrastinator-tracker/frontend';
import '@procrastinator-tracker/frontend/styles.css';

export function Home() {
  return <TaskStackWrapper filters={{ status: 'started' }} refreshRateMs={15000} />;
}
```