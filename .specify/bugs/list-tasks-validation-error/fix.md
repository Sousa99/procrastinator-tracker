# Bug Fix: List tasks fails with `expected date, received string` after schema refactor

- **Slug**: list-tasks-validation-error
- **Fixed**: 2026-09-05
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Restored the string-based date contract that the refactor (commit `1bef9d3`) broke. DTO schemas now accept ISO date strings again (matching the serializers and the frontend contract), input schemas coerce ISO strings to `Date` for persistence, query filters coerce HTTP string params, `createTask` writes `Date` objects into the timestamp columns it always used, the inverted `recurring` filter was reverted, and the removed `isTaskStatus` export plus a broken `comments.ts` import were restored. Recurrence instance generation and MCP tool listing now work again.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `backend/src/models/task.ts` | modified | `taskCommentSchema.createdAt` and `taskSchema.dueDate`/`createdAt`/`updatedAt`: `z.date()` → `z.string()`; `taskCreateSchema`/`taskUpdateSchema.dueDate`: `z.string().datetime().transform(...)` → `Date`; `taskListFilterSchema`: `assignee` uses `z.coerce.number().int()`, `finished`/`recurring` use a boolean-or-'true'/'false' union; `TaskRelations.comments` typed with `createdAt: Date` |
| `backend/src/services/tasks.ts` | modified | `createTask` writes `dueDate: input.dueDate ?? null`, `createdAt: now`, `updatedAt: now` (reverted `.toISOString()` string writes); `addRecurringFilter` condition un-inverted; `status: 'to-start' as const`; `loadRelations` comments type fixed; dropped now-unused `TaskCommentDto` import |
| `backend/src/services/comments.ts` | modified | Import `TaskStatus` from `../db/schema` (it moved there in the refactor) |
| `backend/src/domain/status.ts` | modified | Restored `isTaskStatus` export (implemented via `TRANSITIONS` keys) |
| `backend/tests/integration/tasks.test.ts` | added tests | Regression coverage for list/get serialization, string dueDate input, comment date strings, malformed-date rejection, `finished=false` coercion |

## Diff Highlights

Response DTO schema now matches the serializer (string dates):

```ts
// models/task.ts
const taskSchema = z.object({
  // ...
  dueDate: z.string().nullable(),
  // ...
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

Input `dueDate` accepted as ISO string and converted for the DB (works for HTTP bodies and MCP tool args, since the MCP SDK parses args through the zod schema):

```ts
// models/task.ts — taskCreateSchema / taskUpdateSchema
dueDate: z
  .string()
  .datetime()
  .transform((s) => new Date(s))
  .optional(),
```

Query coercion that restores string query params (`?finished=true&assignee=1`) and keeps MCP booleans working:

```ts
// models/task.ts — taskListFilterSchema
assignee: z.coerce.number().int().optional(),
finished: booleanFilter.optional(),
recurring: booleanFilter.optional(),
```

Insert path writes `Date` objects into the `mode: 'timestamp'` columns drizzle expects:

```ts
// services/tasks.ts — createTask
const taskValue = {
  // ...
  dueDate: input.dueDate ?? null,
  createdAt: now,
  updatedAt: now,
};
```

Recurring filter reverted to original semantics (children visible when `recurring=true`):

```ts
// services/tasks.ts — addRecurringFilter
if (filters.recurring) return;
conds.push(sql`${tasks.parentTaskId} is null`);
```

## Tests Added or Updated

- `tests/integration/tasks.test.ts::lists tasks as JSON with date fields as ISO strings` — pins `GET /api/tasks` to 200 with `dueDate`/`createdAt`/`updatedAt` serialized as strings (the exact reported bug).
- `tests/integration/tasks.test.ts::creates a task from a string dueDate and echoes it back` — pins string `dueDate` input → 201 with ISO string echo.
- `tests/integration/tasks.test.ts::serializes comment createdAt as a string` — pins comment date serialization.
- `tests/integration/tasks.test.ts::rejects malformed dueDate strings with 400` — pins validation of bad dates.
- `tests/integration/tasks.test.ts::coerces finished=false query param and excludes finished tasks` — pins `'false'` string coercion (avoids the `z.coerce.boolean()` footgun).
- Existing suite (`tasks.test.ts` recurrence/US1-US5, `mcp-http.test.ts`, `status.test.ts`, frontend tests) all green again.

## Local Verification

- `pnpm --filter ./backend test` → 4 files, 39 tests passed (was 3 failed files / 18 failed before the fix).
- `pnpm --filter ./backend typecheck` (`tsc --noEmit`) → clean (was failing on 5 errors before the fix).
- `pnpm test` (full workspace) → 47 tests passed (backend 39, frontend 8).
- Manual check: MCP `tools/list` returns the 9 tools (previously errored `Date cannot be represented in JSON Schema`).
- Lint (`pnpm lint`) could not run: root `eslint`/`@eslint/js` are not installed/linked in this environment (`eslint: command not found`, `ERR_MODULE_NOT_FOUND` for `@eslint/js`). This is an environment issue, not caused by these changes; worth fixing with a fresh `pnpm install`.

## Deviations from Assessment

The assessment's preferred remediation (DTO date fields → `z.string()`, input `dueDate` coercion) was applied as written. Two additional, distinct regressions were discovered and fixed while verifying the assessment's hypothesis:

1. **Insert-time `toISOString` bug** (`services/tasks.ts`): the refactor changed `createTask` to pass ISO strings into `integer(..., { mode: 'timestamp' })` columns, which require `Date` objects → `TypeError: value.getTime is not a function`, a 500 on every POST/PATCH. The assessment did not flag this; it is the reason integration tests failed on task creation.
2. **Inverted `recurring` filter** (`services/tasks.ts`): the refactor flipped `if (!filters.recurring) { parentTaskId is null }` to `if (!filters.recurring) return`, so `?recurring=true` returned only parent tasks and hid generated recurrence instances — breaking all three recurrence tests.
3. **Broken `comments.ts` import**: `TaskStatus` no longer exported from `domain/status` (moved to `db/schema`), breaking the build. Fixed by importing from `db/schema`.
4. **MCP `tools/list` breakage**: `z.date()` in input schemas cannot be represented in JSON Schema (`Date cannot be represented in JSON Schema`). Fixed by the same schema change (`z.string().datetime().transform(...)`); the input date type also remains JSON-schema friendly.
5. **`taskValue.status` widened to `string`** when the refactor extracted it from the inline insert, failing the drizzle insert type — fixed with `as const`.

## Follow-ups

- `urgency` filter semantics changed vs. pre-refactor: `?urgency=high` now matches priority exactly `5` (was `>= 4`), `low` matches `3–4` (was `<= 2`), `none` matches `0–2` (was `IS NULL`). This was a deliberate refactor to `domain/urgency.ts`; confirm it matches the intended product behavior.
- The PATCH empty-body guard (old `400 At least one field must be provided`) was dropped in the refactor; `PATCH /api/tasks/{id}` with `{}` now no-ops with 200. Decide whether to restore the guard.
- `pnpm lint` cannot run until the root eslint toolchain is installed (`pnpm install` with build approvals).
- Frontend remains on the string-date contract; no frontend changes were needed, but the OpenAPI spec at `/doc` now documents dates as strings (was `date-time` briefly during the broken refactor) — regenerated clients should be unaffected.