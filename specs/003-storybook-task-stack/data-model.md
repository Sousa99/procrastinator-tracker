# Data Model: TaskStack Component Contract

Phase 1 output. Logical model of the `TaskStack` component family. No persistence is added —
the component consumes the existing `Task` entity from the backend (see
[feature 001 data model](../../001-task-tracker-core/data-model.md)). Field types are the
existing frontend types from `frontend/src/api/client.ts`.

## Existing types reused (source of truth)

- **`Task`** (`frontend/src/api/client.ts`): `id`, `title`, `description`, `status`, `location`,
  `urgency`, `dueDate`, `parentTaskId`, `recurrence`, `tags`, `assignees`, `comments`,
  `createdAt`, `updatedAt`.
- **`TaskStatus`**: `to-start | started | in-progress | on-hold | validating | finished`.
- **`TaskFilters`**: `status?`, `tag?`, `assignee?`, `urgency?`, `location?`, `finished?`,
  `recurring?`.

These types are the public contract of the component; they are exported from the library
entry so consumers share one shape.

## Component family

### TaskStack (presentational display)

Pure, deterministic component: given tasks and options, it renders a stacked deck of cards
(each card slightly overlapping the previous one).

| Prop | Type | Default | Rules |
|------|------|---------|-------|
| `tasks` | `Task[]` | required | the tasks to render |
| `filters` | `TaskFilters` | `{}` | affects ordering/emphasis only; filtering itself happens at fetch time in the wrapper |
| `renderCard?` | `(task: Task) => ReactNode` | `TaskCard`-style default | optional per-card render override |
| `maxVisible?` | `number` | undefined (all) | cap on the number of visible/stacked cards |
| `className?` | `string` | undefined | passthrough for layout styling |

**State transitions**: none (stateless). Ordering rule: unset `urgency` sorts after set
values; set values descending (matches the backend's urgency ordering semantics).

### TaskStackWrapper (exported, self-fetching)

Owns retrieval; renders `TaskStack`. This is the component exported for installation in other
products ("the full component with retrieval").

| Prop | Type | Default | Rules |
|------|------|---------|-------|
| `filters` | `TaskFilters` | `{}` | passed to `dataSource`; changes trigger a refetch |
| `refreshRateMs` | `number` | 30000 | interval for automatic re-fetch; `0` disables polling; cleaned up on unmount and on change |
| `dataSource?` | `(filters: TaskFilters) => Promise<Task[]>` | `api.listTasks` | injectable fetch for consumers/tests |
| `maxVisible?`, `renderCard?`, `className?` | same as display | — | forwarded to `TaskStack` |

**Behavior / state transitions**:

```
idle (empty) --load--> loading --ok--> success(tasks) --refresh--> loading (if not in flight) / skip
                            |
                            +--error--> error(message)  --retry/next interval--> loading
```

- On mount: fetch once immediately.
- Interval (`refreshRateMs`): triggers a fetch; **never overlaps** an in-flight request — the
  tick is skipped while one is pending.
- On `filters` change: immediate refetch with the new filters (debounced at the source).
- On `refreshRateMs` change: interval is torn down and recreated with the new cadence.
- On unmount: interval cleared; late `setState` guarded (no updates after unmount).
- Empty result → empty-state message; fetch failure → error-state message (backend-down safe).
- `refreshRateMs: 0` → fetch once, no polling.

### Loading / error / empty states

- **loading**: subtle "loading…" indicator (never a blank deck).
- **error**: message with the underlying error text; next interval or `filters` change retries.
- **empty**: friendly "no tasks match" copy (distinguishes no-filters vs filtered-empty via the
  wrapper's knowledge of `filters`).

## Validation rules (from spec FRs)

- `tasks` is an array; the display component renders nothing for an empty array (empty state is
  the wrapper's concern).
- `refreshRateMs` is a non-negative integer; values < 0 are clamped to 0 (disabled).
- `filters` shape is validated by the existing `TaskFilters` type at compile time.

## Relationships

- `TaskStackWrapper` → composes `TaskStack` (1:1).
- `TaskStack` → renders `TaskCard`-default or `renderCard` output per task (1:N).
- Both → consume `Task` / `TaskFilters` types from `api/client.ts`.
- No data storage: all task data flows in via props or is fetched through `dataSource`.