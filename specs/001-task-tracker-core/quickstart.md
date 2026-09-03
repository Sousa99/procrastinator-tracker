# Quickstart: Task Tracker Core

Phase 1 output. A runnable validation guide proving the feature works end-to-end. It does
**not** replace implementation details (see [plan.md](plan.md) for structure and
[tasks.md](tasks.md) when created). Full contracts: [contracts/rest.md](contracts/rest.md),
[contracts/mcp.md](contracts/mcp.md); model: [data-model.md](data-model.md).

## Prerequisites

- Node.js 24 LTS, pnpm 11
- VSCode with the **REST Client** extension (for the `.http` validation flows)
- PostgreSQL not required — SQLite is used locally (`data/procrastinator.db`)

## Setup

```bash
pnpm install                 # workspace install (backend + frontend)
pnpm --filter backend db:generate   # generate SQL migration from schema
pnpm --filter backend db:migrate    # apply migrations (creates SQLite db)
```

## Run

| Mode | Command | What it starts |
|------|---------|----------------|
| REST API + Swagger | `pnpm --filter backend start` | Hono app on `http://localhost:3000`; OpenAPI at `/doc`, Swagger UI at `/ui` |
| MCP server (stdio) | `pnpm --filter backend start:mcp` | MCP server, JSON-RPC over stdin/stdout |
| Both at once | `pnpm dev` (root, via `concurrently`) | Two instances of the same process: REST + MCP |
| Frontend | `pnpm --filter frontend dev` | Vite SPA on `http://localhost:5173` |

Both modes share `data/procrastinator.db` (SQLite WAL allows concurrent access).

## Validation scenarios

### 1. REST lifecycle (REST Client)

Open `contracts/http/tasks.http` and `contracts/http/users-tags.http` in VSCode with the
REST Client extension and send requests top-down.

**Expected outcomes:**

- `GET /health` → `200 {"status":"ok"}`
- Create user → `201`; duplicate name → `409`
- Create tag → `201`; case-variant duplicate → `409`
- Create task → `201` with `status: "to-start"`
- `GET /api/tasks` → task listed; `?tag=chores` → filtered
- `POST .../status` `started` → `200`; `finished` (from `started`) → `409`
- Comment on `on-hold` → `201`, stored with status context
- `GET /api/tasks/{id}` → task includes tags, assignees, comments

### 2. Interactive docs

Open `http://localhost:3000/ui`. Confirm the OpenAPI document renders all task/tag/user
endpoints and that Swagger UI can execute `POST /api/tasks` and return `201`.

### 3. MCP server

Launch `pnpm --filter backend start:mcp` and drive it with an MCP client (e.g. opencode,
Claude). Confirm the `task.create` tool creates a task that appears in `GET /api/tasks`,
and `task.set_status` rejects an invalid transition. (No stdout logging; debug via stderr.)

### 4. Recurrence

Create a task with `recurrence: { "frequency": "daily" }` via REST or MCP. Finish it →
a new instance for the next day appears in `GET /api/tasks?recurring=true` with the same
tags/assignees, and no duplicates appear on refresh (catch-up sweep).

### 5. Frontend

Run the frontend, open `http://localhost:5173`, and confirm: active tasks listed first,
finished tasks separated, tag/status filters work, creating a task appears instantly
(TanStack Query), and a status change is reflected on refresh.

### 6. Quality gates

```bash
pnpm lint      # eslint (root config)
pnpm format    # prettier (root config)
pnpm test      # vitest: backend (hono + :memory: sqlite) + frontend (RTL)
```

All three MUST pass before merge (constitution: Workflow & Quality Gates).

## Expected outcomes summary

- Every spec FR (FR-001…FR-015) has a runnable check above.
- Success criteria met: SC-001 (task → finished in <1 min), SC-002 (filter within 3
  interactions), SC-003 (recurrence auto-generates), SC-004 (persisted locally),
  SC-005 (MCP usable), SC-006 (deferred — Storybook/package dropped), SC-007 (motivating
  view drives progress).