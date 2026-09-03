# Data Model: Task Tracker Core

Phase 1 output. Logical model derived from [spec.md](spec.md) FRs; implement as a Drizzle
schema in `backend/src/db/schema.ts` (SQLite, portable to Postgres per [research.md](research.md)).
Field types are logical (concrete Drizzle types are an implementation detail).

## Entities

### Status (enum)

Fixed task lifecycle, stored as a `text` column validated by the service layer.

- `to-start`, `started`, `in-progress`, `on-hold`, `validating`, `finished`

**Transition matrix** (service-enforced; invalid transitions return 409):

```
to-start    → started
started     → in-progress | on-hold | to-start
in-progress → on-hold | validating | started
on-hold     → in-progress | started
validating  → finished | in-progress
finished    → started (reopen)
```

### Task

The core unit of work. Fields:

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer (pk) | auto-generated |
| `title` | string | required, non-empty, trimmed, max 200 chars |
| `description` | string | optional |
| `status` | enum | default `to-start`; transitions per matrix |
| `location` | string | optional, free-form |
| `urgency` | integer | optional, 1–5 (inclusive); unset = null |
| `recurrenceId` | integer (fk → RecurrenceRule) | optional |
| `parentTaskId` | integer (fk → Task) | optional; set on generated recurrence instances |
| `dueDate` | timestamp | optional; scheduled date for a task/instance |
| `createdAt` | timestamp | required |
| `updatedAt` | timestamp | required |

Relations: many-to-many Users (via `TaskAssignee`), many-to-many Tags (via `TaskTag`),
one-to-many Comments, optional one-to-one RecurrenceRule, optional self-reference to the
source task for recurrence instances.

### User

A lightweight local label — no account, no authentication (spec clarification Q1).

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer (pk) | auto-generated |
| `name` | string | required, unique, trimmed |

### TaskAssignee (join: Task ↔ User)

| Field | Type | Rules |
|-------|------|-------|
| `taskId` | integer (fk → Task) | part of composite pk |
| `userId` | integer (fk → User) | part of composite pk |

### Tag

Flat label; no hierarchy (spec FR-005).

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer (pk) | auto-generated |
| `name` | string | required, unique, trimmed, case-insensitive dedupe |

### TaskTag (join: Task ↔ Tag)

| Field | Type | Rules |
|-------|------|-------|
| `taskId` | integer (fk → Task) | part of composite pk |
| `tagId` | integer (fk → Tag) | part of composite pk |

### RecurrenceRule

Optional pattern attached to a task (spec FR-008 / clarification Q2: auto-generated
instances).

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer (pk) | auto-generated |
| `taskId` | integer (fk → Task) | unique; one rule per source task |
| `frequency` | enum | `daily`, `weekly`, `monthly` |
| `interval` | integer | default 1; >= 1 |
| `anchorDate` | timestamp | required; basis for computing next occurrence |

### Comment

Notes attached to a task, particularly meaningful on `on-hold`/`validating` (spec FR-009).

| Field | Type | Rules |
|-------|------|-------|
| `id` | integer (pk) | auto-generated |
| `taskId` | integer (fk → Task) | required |
| `body` | string | required, non-empty |
| `status` | enum | the task status when the comment was added (context) |
| `createdAt` | timestamp | required |

## Validation rules (from spec FRs)

- `title` required and ≤ 200 chars; `description` optional (FR-001).
- `status` always one of the six values; only matrix transitions allowed (FR-002, FR-003).
- Users/tags: zero or more per task; tag names deduped case-insensitively (FR-004, FR-005).
- `urgency` integer 1–5 or absent; absent sorts after set values (FR-007).
- Recurrence: `frequency` + `interval` required when present; `anchorDate` required;
  instances inherit title/location/tags/assignees from the source task (FR-008).
- Comments: `body` non-empty; created with the current task status (FR-009).

## Recurrence behavior

- When an instance reaches `finished`: generate the next instance for
  `anchor + interval * period`, copying title, description, location, tags, assignees.
- On read: a catch-up sweep materializes missed occurrences for past periods without
  duplicating existing instances (unique key = `parentTaskId` + `dueDate`).
- The source task itself is not duplicated; it remains the recurring definition.

## Edge-case handling

- Reopen `finished → started` allowed (single defined reopen edge).
- Deleting a task cascades to its comments, joins, and recurrence rule.
- An `on-hold` task without a comment is valid (comment optional, encouraged).
- Overdue recurring instance + next due instance coexist without duplicates (unique key).