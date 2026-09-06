# Quickstart: Storybook + Exportable TaskStack

Runnable validation guide for feature 003. Proves the Storybook integration, the TaskStack
component, and the package export work end-to-end. See
[contracts/task-stack.md](contracts/task-stack.md) and
[contracts/storybook.md](contracts/storybook.md) for the contracts referenced here.

## Prerequisites

- pnpm 11, Node >= 24 (workspace root).
- `pnpm install` at repo root.
- Backend DB migrated (`pnpm db:migrate`) — needed only for in-app scenarios.

## 1. Storybook renders the TaskStack story (SC-001, SC-005)

```bash
pnpm --filter frontend storybook
# open http://localhost:6006
```

- `Task/TaskStack` → `Default` renders a **stacked deck** of sample cards (each slightly
  overlapping the previous).
- `Task/TaskStack` → `Filtered` shows only `in-progress` tasks.
- `Task/TaskStack` → `SelfFetchingWrapper` renders via a mocked `dataSource`; raise the
  `refreshRateMs` control and confirm re-fetches fire (observe the last-updated marker).
- `Task/TaskCard` story renders an existing custom component.

**Expected**: no broken config, all stories render, controls work.

## 2. Library build produces a consumable package (SC-003)

```bash
pnpm --filter frontend build:lib
# -> frontend/dist/ (ESM + bundled .d.ts)
```

Then validate the export contract:

```bash
cd frontend
npx publint
npx @arethetypeswrong/cli --pack
```

**Expected**: `dist/` contains `index.js` + `index.d.ts` (and `styles.css` if shipped);
`publint` reports no missing/invalid `exports` fields; `attw` resolves types from every
consumer perspective with no errors.

## 3. In-app: dashboard renders TaskStack (SC-002)

```bash
pnpm dev
# backend REST on :3000, frontend on :5173
```

- Open the dashboard: active tasks render as a **stacked deck** via `TaskStackWrapper`.
- With `refreshRateMs` set (default 30s), add a task from another session and confirm the deck
  updates within the cadence without a manual reload.
- Change a filter in the dashboard's filter bar and confirm the deck refetches accordingly.

**Expected**: deck renders fetched tasks; refresh cadence updates the deck; filter change
refetches.

## 4. Consumer: import the built wrapper in another React app (SC-004)

```bash
cd frontend
pnpm pack            # tarball of the built package
```

In a scratch React 19 app (or a temp project under the workspace), install the tarball and:

```tsx
import { TaskStackWrapper } from '@procrastinator-tracker/frontend';
import '@procrastinator-tracker/frontend/styles.css';

<TaskStackWrapper
  filters={{ status: 'in-progress' }}
  refreshRateMs={0} // fetch once
  dataSource={() => Promise.resolve([/* fixtures */])}
/>;
```

**Expected**: the wrapper self-fetches from the injected `dataSource` and renders the stacked
deck — no app code, no manual data plumbing. With the real `api.listTasks` default, pointing
it at a live backend works the same way.

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

- Component API + package export contract: [contracts/task-stack.md](contracts/task-stack.md)
- Storybook setup + story contract: [contracts/storybook.md](contracts/storybook.md)
- Prop/behavior model: [data-model.md](data-model.md)
- Design decisions: [research.md](research.md)