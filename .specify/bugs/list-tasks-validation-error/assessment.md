# Bug Assessment: List tasks fails with `expected date, received string` after schema refactor

- **Slug**: list-tasks-validation-error
- **Created**: 2026-09-05
- **Source**: pasted text (no URL)
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

> "I did some refactoring within this project. Namely I refactored the backend, changed the overall structure a bit, and moved schema into a single place for central management. But somewhere along the way I caused a problem as now I cannot request list of tasks, getting `{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input: expected date, received string" } }`. Can you assess this issue? Furthermore, evaluate if any other problem is identifiable. Note: all my refactoring is staged on GitHub and should not be moved from there."

The refactor lives in the staged changes on `main` (10 commits ahead of `origin/main`). Assessment only reads source; no refactoring was moved.

## Symptom

`GET /api/tasks` (and any task endpoint that returns a full `TaskDto`) returns HTTP 400 `VALIDATION_ERROR: Invalid input: expected date, received string` instead of the task list. Expected: a JSON array of tasks. Triggered by the refactor that centralized schemas in `backend/src/models/task.ts`.

## Reproduction

1. Run the backend (http mode).
2. `curl http://localhost:<port>/api/tasks`
3. Observe `{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input: expected date, received string" } }`.

The failure occurs for any endpoint calling `mapTaskToDto` (list, get, create, update, set-status) whenever at least one task exists.

## Suspected Code Paths

- `backend/src/models/task.ts:171-195` (`mapTaskToDto`) — builds the DTO with **string** dates (`task.dueDate.toISOString()`, `createdAt.toISOString()`, `updatedAt.toISOString()`, comment `createdAt.toISOString()`) then feeds them through `taskSchema.parse()`.
- `backend/src/models/task.ts:48,61,67,68` — `taskSchema`/`taskCommentSchema` now declare those same fields as `z.date()`, which rejects ISO strings.
- `backend/src/models/task.ts:110-118` (`taskListFilterSchema`) — `assignee: z.number().int()`, `finished: z.boolean()`, `recurring: z.boolean()` (query strings are not coerced).
- `backend/src/models/task.ts:81,96` — `dueDate: z.date()` on create/update input schemas.
- `backend/src/app.ts:31-48` — `onError` maps the thrown `ZodError` to the 400 `VALIDATION_ERROR` payload shown.
- `backend/src/routes/tasks.ts:46-48` — passes validated query straight to `listTasks` (removed the old string→number/boolean coercion).
- `backend/src/domain/status.ts` — removed `isTaskStatus`, still imported by `backend/tests/unit/status.test.ts:2,46-47`.

## Root Cause Hypothesis

In the pre-refactor code, the task response schema declared dates as `z.string()` (old `routes/tasks.ts` `taskSchema`: `dueDate: z.string().nullable()`, `createdAt: z.string()`, `updatedAt: z.string()`), and services serialized dates to ISO strings — consistent. During the refactor the schemas were consolidated in `models/task.ts` and date fields were changed to `z.date()`, but the mappers and services were **not** updated to pass `Date` objects (they still pass `.toISOString()` strings). `z.date()` rejects strings, so `taskSchema.parse(...)` throws, the `onError` handler converts it to the reported 400. Confidence: **high** (verified against HEAD vs. staged diff; frontend contract expects strings).

## Proposed Remediation

**Preferred**: Make the DTO schema accept ISO strings, matching the existing serialization and the frontend contract — change `z.date()` to `z.string()` for `dueDate`, `createdAt`, `updatedAt` (taskSchema and taskCommentSchema) in `models/task.ts`. Optionally refine with `z.string().datetime()` and add `z.coerce.date()` only on the *input* create/update schemas where real `Date` objects are wanted (and convert to ISO string before DB write, as `createTask` already does at services/tasks.ts:326).

**Alternatives**:
- Change mappers/services to pass `Date` objects into `taskSchema.parse()` and revert input schemas to accept strings via `z.coerce` — larger blast radius (every mapper and service must change; still need input handling for HTTP bodies), so less preferable.
- Use `z.date()` for DTO + a `z.string()` transform (`z.string().datetime().transform(s => new Date(s))`) on input — more robust but requires careful alignment with `z.coerce`.

**Files likely to change**:
- `backend/src/models/task.ts`
- `backend/src/domain/status.ts` (restore `isTaskStatus` or fix test)
- `backend/tests/unit/status.test.ts`
- Possibly `backend/src/models/task.ts` for input `dueDate` coercion.

**Tests to add or update**:
- Backend integration test: `GET /api/tasks` returns 200 with a task list (would have caught this).
- Unit test for `mapTaskToDto` with a populated task (assert no throw).
- Test `POST /api/tasks` with a string `dueDate` and `GET /api/tasks?finished=true&assignee=1` (query coercion).
- Restore/fix `status.test.ts` after deciding on `isTaskStatus`.

## Risks & Considerations

- **Secondary regression (input dates):** `taskCreateSchema`/`taskUpdateSchema` switched `dueDate` to `z.date()`; HTTP JSON bodies carry ISO **strings**, so creating/updating a task with a due date will fail the same way unless coerced.
- **Secondary regression (query filters):** `taskListFilterSchema` uses `z.number()`/`z.boolean()` for `assignee`/`finished`/`recurring`; query params are strings, so `?finished=true&assignee=1` now fails validation (old code coerced via `Number(...)` / `=== 'true'`). This breaks MCP `task.list` too.
- **Broken unit test:** `isTaskStatus` was removed but `status.test.ts` still imports it → test suite fails to compile.
- **Contract/API impact:** Response schema in OpenAPI docs (`/doc`, `/ui`) will now document dates as `date-time` if switched to `z.date()` while serializing strings — mismatch for generated clients.
- **MCP parity:** `tools-task.ts` calls the same services and would surface the same errors.

## Open Questions

- Should `dueDate` be a `Date` object or ISO string end-to-end? (Decide before writing the fix.)
- Is `isTaskStatus` needed elsewhere, or should the test be updated to drop it?