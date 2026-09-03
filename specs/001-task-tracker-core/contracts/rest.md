# REST Contract: Task Tracker Core

Phase 1 output. Base path `/api`, JSON bodies/responses. This is the contract source of
truth; it is implemented as an OpenAPI 3.0 document via `@hono/zod-openapi` and served at
`/doc` (Swagger UI at `/ui`). Run the VSCode REST Client files in
[contracts/http/](http/) to validate each endpoint manually.

## Resources

### Tasks — `/api/tasks`

| Method | Path | Summary | Status |
|--------|------|---------|--------|
| GET | `/api/tasks` | List tasks; filters: `status`, `tag`, `assignee`, `urgency`, `location`; sort: `urgency` (unset last), `createdAt`; include `recurring=true` to include instances | 200 |
| POST | `/api/tasks` | Create task | 201 |
| GET | `/api/tasks/{id}` | Get task with tags, assignees, comments | 200 |
| PATCH | `/api/tasks/{id}` | Update mutable fields (title, description, location, urgency, recurrence, dueDate) | 200 |
| DELETE | `/api/tasks/{id}` | Delete task (cascades comments/joins/recurrence) | 204 |
| POST | `/api/tasks/{id}/status` | Transition status; body `{ "status": "<next>" }`; invalid transition → 409 | 200 |
| POST | `/api/tasks/{id}/comments` | Add comment; body `{ "body": "..." }`; stores current status | 201 |

**Filters (GET /api/tasks):**
- `status` — exact enum value
- `tag` — tag name (repeatable, AND)
- `assignee` — user id (repeatable, AND)
- `urgency` — `high` (>=4) | `low` (<=2) | `none` (unset)
- `location` — substring match
- `recurring` — `true` includes generated instances; default excludes them
- `finished` — `true` includes finished tasks; default excludes them (spec: finished kept
  separate)

**Task object:**

```json
{
  "id": 1,
  "title": "Water the plants",
  "description": "All rooms",
  "status": "in-progress",
  "location": "Home",
  "urgency": 4,
  "dueDate": "2026-09-04",
  "recurrence": { "frequency": "daily", "interval": 1 },
  "tags": ["chores"],
  "assignees": [1],
  "comments": [{ "id": 2, "body": "Needs a reminder", "status": "on-hold", "createdAt": "..." }],
  "createdAt": "...",
  "updatedAt": "..."
}
```

### Tags — `/api/tags`

| Method | Path | Summary | Status |
|--------|------|---------|--------|
| GET | `/api/tags` | List all tags | 200 |
| POST | `/api/tags` | Create tag `{ "name": "..." }` (case-insensitive dedupe → 409 if exists) | 201 |

### Users — `/api/users`

| Method | Path | Summary | Status |
|--------|------|---------|--------|
| GET | `/api/users` | List users | 200 |
| POST | `/api/users` | Create user `{ "name": "..." }` (unique name → 409 if exists) | 201 |
| DELETE | `/api/users/{id}` | Delete user (unassigns from tasks) | 204 |

### Meta

| Method | Path | Summary |
|--------|------|---------|
| GET | `/health` | Liveness probe → `200 {"status":"ok"}` |
| GET | `/doc` | OpenAPI 3.0 document (JSON) |
| GET | `/ui` | Swagger UI (interactive docs) |

## Conventions

- Dates serialized as ISO 8601 strings.
- Errors: JSON `{ "error": { "code": "...", "message": "..." } }` with appropriate status
  (400 validation, 404 missing, 409 conflict/invalid transition).
- All task mutations return the updated task object.
- No auth (single-user, local; lightweight user labels per spec).