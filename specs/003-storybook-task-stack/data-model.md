# Data Model: TaskDeck Component Contract

Phase 1 output. Logical model of the `TaskDeck` component family. No persistence is added —
the component consumes the existing `Task` entity from the backend (see
[feature 001 data model](../../001-task-tracker-core/data-model.md)). Field types are the
existing frontend types from `frontend/src/api/client.ts`.

> **Design revision (2026-09-06)**: replaces the earlier `TaskStack` vertical-overlap contract
> with the `TaskDeck` swipeable card-stack contract (Deck Standard 1 / Kibo `Deck`).

## Existing types reused (source of truth)

- **`Task`** (`frontend/src/api/client.ts`): `id`, `title`, `description`, `status`, `location`,
  `urgency`, `dueDate`, `parentTaskId`, `recurrence`, `tags`, `assignees`, `comments`,
  `createdAt`, `updatedAt`.
- **`TaskStatus`**: `to-start | started | in-progress | on-hold | validating | finished`.
- **`TaskFilters`**: `status?`, `tag?`, `assignee?`, `urgency?`, `location?`, `finished?`,
  `recurring?`.

These types are the public contract of the component; they are exported from the library
entry so consumers share one shape.

## Deck primitives (vendored, UI)

- **`frontend/src/components/ui/deck/deck.tsx`**: `Deck`, `DeckCards`, `DeckCard`, `DeckItem`,
  `DeckEmpty` — the MIT Kibo `Deck` primitives, adapted for the local `cn` util and extended
  with `autoRotateMs` and `loop` support. `DeckCards` is controllable
  (`currentIndex`/`onCurrentIndexChange`), supports `animateOnIndexChange` +
  `indexChangeDirection` (used to drive the auto-rotate exit animation), `threshold`,
  `stackSize`, `perspective`, `scale`, and `onSwipe`/`onSwipeEnd`.
- **`DeckItem` is a neutral fill container** (`flex h-full w-full items-center justify-center`,
  no border/background/shadow) — the inner card component is the only visible surface. This
  prevents a stray outline from the wrapper extending beyond the card.

## Component family

### TaskDeck (presentational display)

Pure, deterministic component (no fetching): given tasks and options, it renders a swipeable
card stack — the top card fully visible, the following `stackSize - 1` cards scaled/fanned
behind it.

| Prop | Type | Default | Rules |
|------|------|---------|-------|
| `tasks` | `Task[]` | required | the tasks to render |
| `filters` | `TaskFilters` | `{}` | ordering emphasis only; actual filtering happens at fetch time in the wrapper (client-side filter matching applied for determinism) |
| `autoRotateMs` | `number` | 4000 | interval for auto-advancing the deck; `0` disables; timer pauses during drag and resets after a manual skip |
| `loop` | `boolean` | true | when true, wrap to the first card instead of showing the empty state |
| `stackSize` | `number` | 3 | how many cards are visible (top + fanned behind) |
| `slideDurationMs` | `number` | 500 | duration of the swipe/exit card animation (ms); configurable so the deck can glide slower |
| `renderCard?` | `(task: Task) => ReactNode` | full card default | optional per-card render override |
| `onCardChange?` | `(index: number) => void` | — | called when the top card changes (auto or manual) |
| `className?` | `string` | undefined | passthrough for layout styling |

**State**: the deck holds only the current top-card index (internal or controlled). No task
data mutation.

**Ordering rule**: unset `urgency` sorts after set values; set values descending (matches the
backend's urgency ordering semantics).

**Sizing rule**: the deck stage fills the container width (`w-full`) with a fixed max height
(`h-[24rem]` base, `sm:h-[26rem]`). All cards are uniform (`h-full w-full flex flex-col
overflow-hidden`) regardless of content. Card content is anchored: description at the top,
meta/tags/assignees pushed to the card bottom (`mt-auto`) so content fills the card; long
descriptions ellipsize via `line-clamp-2`.

### TaskDeckWrapper (exported, self-fetching)

Owns retrieval; renders `TaskDeck`. This is the component exported for installation in other
products ("the full component with retrieval").

| Prop | Type | Default | Rules |
|------|------|---------|-------|
| `filters` | `TaskFilters` | `{}` | passed to `dataSource`; changes trigger a refetch |
| `refreshRateMs` | `number` | 30000 | interval for automatic re-fetch; `0` disables polling; cleaned up on unmount and on change |
| `dataSource?` | `(filters: TaskFilters) => Promise<Task[]>` | `api.listTasks` | injectable fetch for consumers/tests |
| `autoRotateMs` | `number` | 4000 | forwarded to `TaskDeck`; `0` disables auto-rotate |
| `loop` | `boolean` | true | forwarded to `TaskDeck` |
| `slideDurationMs` | `number` | 500 | forwarded to `TaskDeck`; swipe/exit animation duration |
| `stackSize`, `renderCard?`, `className?` | same as display | — | forwarded to `TaskDeck` |

**Behavior / state transitions** (fetch layer):

```
idle (empty) --load--> loading --ok--> success(tasks) --refresh--> loading (if not in flight) / skip
                            |
                            +--error--> error(message)  --retry/next interval--> loading
```

- On mount: fetch once immediately.
- Interval (`refreshRateMs`): triggers a fetch; **never overlaps** an in-flight request — the
  tick is skipped while one is pending.
- On `filters` change: immediate refetch with the new filters.
- On `refreshRateMs` change: interval is torn down and recreated with the new cadence.
- On unmount: interval cleared; late `setState` guarded (no updates after unmount).
- Empty result → empty-state message; fetch failure → error-state message (backend-down safe).
- `refreshRateMs: 0` → fetch once, no polling.

**Deck-layer behavior** (owned by `TaskDeck` via the deck primitives):
- Auto-rotate: `autoRotateMs` interval advances `currentIndex` with the exit animation;
  cleared on unmount / recreated on change; `0` disables.
- Loop: when `currentIndex` passes the last task, it wraps to `0`.
- Manual skip: dragging the top card past `threshold` advances the deck and **resets** the
  auto-rotate timer; dragging **pauses** the timer until release.
- Skipping a card is **view-only** — no task mutation.

### Loading / error / empty states

- **loading**: subtle "loading…" indicator (never a blank deck).
- **error**: message with the underlying error text; next interval or `filters` change retries.
- **empty**: friendly "no tasks match" copy (distinguishes no-filters vs filtered-empty via the
  wrapper's knowledge of `filters`).

## Validation rules (from spec FRs)

- `tasks` is an array; the display component renders nothing for an empty array (empty state is
  the wrapper's concern).
- `refreshRateMs` and `autoRotateMs` are non-negative integers; values < 0 are clamped to 0
  (disabled).
- `loop` defaults to true; `stackSize` defaults to 3 (>= 1).
- `filters` shape is validated by the existing `TaskFilters` type at compile time.

## Relationships

- `TaskDeckWrapper` → composes `TaskDeck` (1:1).
- `TaskDeck` → uses the deck primitives (`Deck`, `DeckCards`, `DeckItem`) and renders
  `TaskDeckCard`-default or `renderCard` output per task (1:N).
- All → consume `Task` / `TaskFilters` types from `api/client.ts`.
- No data storage: all task data flows in via props or is fetched through `dataSource`.