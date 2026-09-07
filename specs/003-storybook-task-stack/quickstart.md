# Quickstart: Storybook + Exportable TaskDeck

Runnable validation guide for feature 003. Proves the Storybook integration, the TaskDeck
component, and the package export work end-to-end. See
[contracts/task-deck.md](contracts/task-deck.md) and
[contracts/storybook.md](contracts/storybook.md) for the contracts referenced here.

## Prerequisites

- pnpm 11, Node >= 24 (workspace root).
- `pnpm install` at repo root.
- Backend DB migrated (`pnpm db:migrate`) — needed only for in-app scenarios.

## 1. Storybook renders the TaskDeck story (SC-001, SC-005)

```bash
pnpm --filter frontend storybook
# open http://localhost:6006
```

- `Task/TaskDeck` → `Default` renders a **swipeable card stack** — the top card fully visible
  with the next `stackSize - 1` cards scaled/fanned behind it.
- `Task/TaskDeck` → `Filtered` shows only `in-progress` tasks.
- `Task/TaskDeck` → `SelfFetchingWrapper` renders via a mocked `dataSource`; raise the
  `refreshRateMs` control and confirm re-fetches fire (observe the last-updated marker). Use
  `autoRotateMs` controls carefully (or `0`) so the deck stays put while inspecting.
- Drag the top card past the swipe threshold to advance the deck; with `loop`, the deck wraps
  to the first card.
- `Task/TaskCard` story renders an existing custom component.

**Expected**: no broken config, all stories render, drag + auto-rotate + loop controls work.

## 2. Library build produces a consumable package (SC-003)

```bash
pnpm --filter frontend build:lib
# -> frontend/dist-lib/ (ESM + bundled .d.ts)
```

Then validate the export contract:

```bash
cd frontend
npx publint
npx @arethetypeswrong/cli --pack
```

**Expected**: `dist-lib/` contains `index.js` + `index.d.ts` (and `styles.css` if shipped);
`publint` reports no missing/invalid `exports` fields; `attw` resolves types from every
consumer perspective with no errors (including the `motion` peer dependency).

## 3. In-app: dashboard Deck | List selector (SC-002)

```bash
pnpm dev
# backend REST on :3000, frontend on :5173
```

- Open the dashboard: it offers a **"Deck | List"** toggle.
- **Deck mode**: active tasks render as a **swipeable stacked deck** via `TaskDeckWrapper`;
  the deck auto-rotates on its cadence, and dragging a card advances it (resetting the timer).
- **List mode**: the existing vertical `TaskCard` list renders unchanged.
- With `refreshRateMs` set (default 30s), add a task from another session and confirm the deck
  updates within the cadence without a manual reload.
- Change a filter in the dashboard's filter bar and confirm the deck refetches accordingly.

**Expected**: toggle switches between deck and list; deck renders fetched tasks, auto-rotates,
and accepts drag-to-skip; refresh cadence updates the deck; filter change refetches.

## 4. Consumer: import the built wrapper in another React app (SC-004)

```bash
cd frontend
pnpm pack            # tarball of the built package
```

In a scratch React 19 app (or a temp project under the workspace), install the tarball and:

```tsx
import { TaskDeckWrapper } from '@procrastinator-tracker/frontend';
import '@procrastinator-tracker/frontend/styles.css';

<TaskDeckWrapper
  filters={{ status: 'in-progress' }}
  refreshRateMs={0}    // fetch once
  autoRotateMs={0}     // no auto-rotate in this example
  dataSource={() => Promise.resolve([/* fixtures */])}
/>;
```

**Expected**: the wrapper self-fetches from the injected `dataSource` and renders the swipeable
deck — no app code, no manual data plumbing. With the real `api.listTasks` default, pointing
it at a live backend works the same way. The consumer must provide `motion` (peer dependency).

## Gate: full quality checks

Before merge (constitution Workflow & Quality Gates):

```bash
pnpm format        # prettier --check
pnpm lint
pnpm typecheck
pnpm test
```

**Expected**: all green.

## References

- Component API + package export contract: [contracts/task-deck.md](contracts/task-deck.md)
- Storybook setup + story contract: [contracts/storybook.md](contracts/storybook.md)
- Prop/behavior model: [data-model.md](data-model.md)
- Design decisions: [research.md](research.md)