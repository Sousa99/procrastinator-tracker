# Research: Task Tracker Core

Phase 0 output — resolves technical unknowns and locks best practices for the stack chosen
in [plan.md](plan.md). Format per decision: Decision / Rationale / Alternatives considered.

## 1. REST API + OpenAPI + Swagger UI (Hono)

- **Decision**: Use `hono` with `@hono/zod-openapi` (OpenAPIHono) and `@hono/swagger-ui`.
  Define request/response schemas with Zod (`.openapi()` metadata) inside `createRoute`,
  mount via `app.openapi(route, handler)`, emit the document at `GET /doc` with `app.doc()`,
  and serve Swagger UI at `/ui` via the `swaggerUI` middleware.
- **Rationale**: `@hono/zod-openapi` is the most widely used and documented Hono OpenAPI
  option; schemas are the single source of truth for both runtime validation and the
  generated OpenAPI spec, so validation and docs can never drift. Swagger UI gives an
  interactive, browser-based way to exercise endpoints (complements REST Client files).
- **Alternatives considered**: `hono-openapi` middleware (generic, less typed); hand-written
  OpenAPI JSON (drift risk). Rejected: both add maintenance cost for no benefit here.
- **Note**: `@hono/swagger-ui` v1.x serves the UI from a CDN; the OpenAPI doc itself is
  served locally at `/doc`, so it works offline once loaded.

## 2. Database: Drizzle + SQLite

- **Decision**: `drizzle-orm` + `better-sqlite3` driver; `drizzle-kit` for migrations.
  Schema lives in `backend/src/db/schema.ts`; `drizzle.config.ts` sets `dialect: 'sqlite'`,
  schema path, and migration output dir (`./drizzle`). Workflow: edit schema → `drizzle-kit
  generate` (produces reviewed SQL) → apply via `drizzle-kit migrate` or the programmatic
  migrator (`drizzle-orm/better-sqlite3/migrator`) at startup.
- **Rationale**: SQLite via `better-sqlite3` is synchronous and ideal for a local personal
  app; Drizzle is TypeScript-first, dependency-light, and generates real SQL migration
  files. Schema-as-code keeps the model reviewable and versioned.
- **Portability**: Keep the schema dialect-agnostic (use `text`/`integer`/`real`/`timestamp`
  and a CHECK-backed enum instead of SQLite-native-only constructs where practical) so the
  Drizzle dialect can later switch to `postgresql` with minimal churn. Enable `PRAGMA
  journal_mode = WAL` for safe concurrent access when REST and MCP run simultaneously.
- **Alternatives considered**: `@libsql/client`/Turso (remote-capable but heavier); raw SQL
  (no type safety). Rejected for this project.

## 3. MCP server (dual-mode single process)

- **Decision**: MCP TypeScript SDK v2 (`@modelcontextprotocol/server` + `server/stdio`
  package paths; the stable line implementing the 2026-07-28 spec). The backend process is
  launched in one of two modes — `http` (Hono REST + Swagger) or `mcp` (stdio) — selected
  by CLI flag. Both adapters construct over the same services/db layer; `index.ts` is the
  only entry point.
- **Rationale**: MCP stdio servers are standalone processes speaking JSON-RPC over
  stdin/stdout. A single codebase with two adapters and a flag-selected entry avoids a
  separate `backend-api` + `backend-mcp` + shared package split, eliminating the layering
  friction the user flagged. Running REST and MCP simultaneously means launching two
  instances of the same process; SQLite WAL handles the low concurrency.
- **MCP tools exposed** (mirroring REST resources): `task.create`, `task.list`,
  `task.get`, `task.update`, `task.set_status`, `task.comment`, `tag.list`, `user.list`.
- **Critical stdio rule**: never write to stdout in MCP mode (corrupts JSON-RPC); all
  logging goes to stderr.
- **Alternatives considered**: HTTP-transport MCP inside the Hono app (non-standard for
  clients, rejected); separate MCP package with shared core (adds the friction the user
  rejected).

## 4. Recurrence engine

- **Decision**: Store a `RecurrenceRule` on a task (frequency: daily/weekly/monthly +
  interval, and a generation anchor). No cron dependency. New instances are generated at
  two points: (a) when an instance transitions to `finished`, create the next instance; (b)
  on read, a catch-up sweep materializes any overdue instances that were never generated
  (e.g., app was off), without duplicating existing ones (unique key = source task id +
  scheduled date).
- **Rationale**: Completion-triggered generation matches the spec (new instance when the
  previous is done); the catch-up sweep keeps the list correct after downtime with zero
  infrastructure. No background scheduler needed for a local app.
- **Alternatives considered**: cron/timers (overkill, fragile on a laptop); generation on a
  fixed calendar regardless of completion (mismatches the "finish → next" UX).

## 5. Status workflow

- **Decision**: Fixed status enum stored as a column plus a single transition matrix in
  `services/status.ts` defining the allowed edges. Invalid transitions return 409.
- **Allowed transitions**:

  ```
  to-start    → started
  started     → in-progress | on-hold | to-start (revert)
  in-progress → on-hold | validating | started
  on-hold     → in-progress | started
  validating  → finished | in-progress
  finished    → (reopen) started   [spec edge case: finished tasks can be reopened]
  ```

- **Rationale**: An explicit matrix keeps workflow rules testable and in one place, aligned
  with constitution "small cohesive modules" and spec FR-002/FR-003. Reopen (`finished →
  started`) resolves the spec edge case in a simple, permitted way.
- **Alternatives considered**: DB-level constraints (rigid, hard to evolve); free-form
  status (no workflow integrity). Rejected.

## 6. VSCode REST Client (.http)

- **Decision**: Keep runnable request files in `backend/http/*.http` (e.g.
  `tasks.http`, `tags.http`, `users.http`). Conventions: `@baseUrl` variable, one request
  block per endpoint separated by `###`, request/response comments capturing expected
  status codes, `# @name` labels for referencing responses, and JSON bodies for mutation
  calls. These double as documentation and as the manual validation harness.
- **Rationale**: Matches the user's tooling requirement; zero extra dependencies; pairs with
  Swagger UI (interactive) and OpenAPI (schema).
- **Alternatives considered**: Postman/Bruno collections (extra tooling), curl scripts
  (less discoverable). Rejected.

## 7. Frontend stack: Vite + React + Tailwind + shadcn/ui + TanStack Query

- **Decision**: Vite + React 19 + TypeScript; Tailwind for styling; shadcn/ui (Radix +
  Tailwind) for primitives; TanStack Query for server state; React Router for the two pages
  (dashboard / task detail). Storybook is dropped from v1 per decision.
- **Rationale**: Vite is the standard fast SPA dev server; shadcn/ui gives accessible,
  copy-in components without a heavyweight design-system dependency; TanStack Query
  simplifies caching, optimistic updates, and invalidation for the task list.
- **Frontend contract**: Generate a typed API client from the backend OpenAPI spec using
  `openapi-typescript` (types only) — no separate shared package, per plan.md. TanStack
  Query hooks wrap the typed client per resource.
- **Alternatives considered**: Redux (boilerplate, rejected); MUI/Ant (heavier, rejected);
  bespoke fetch wrappers (no caching, rejected).

## 8. Testing

- **Decision**: `vitest` everywhere. Backend: unit tests for services (status matrix,
  recurrence) + integration tests using the `hono` request/app instance against an
  in-memory SQLite DB (`:memory:`), plus OpenAPI schema validation of key responses.
  Frontend: React Testing Library component tests for the dashboard and task detail.
- **Rationale**: One test runner across the repo reduces toolchain surface (constitution:
  minimal tools); in-memory SQLite makes integration tests fast and deterministic.
- **Alternatives considered**: jest (slower, config-heavy), supertest (less native to
  Hono). Rejected.

## Decisions summary

| Topic | Decision |
|-------|----------|
| API + docs | Hono + `@hono/zod-openapi` + `@hono/swagger-ui` (`/doc`, `/ui`) |
| DB | Drizzle + `better-sqlite3`, drizzle-kit migrations, WAL, portable schema |
| MCP | MCP SDK v2 stdio; dual-mode single process (`--http` \| `--mcp`) |
| Recurrence | RecurrenceRule + on-complete generation + catch-up on read |
| Statuses | Fixed enum + explicit transition matrix (409 on invalid) |
| Endpoint docs | `backend/http/*.http` REST Client files + OpenAPI/Swagger |
| Frontend | Vite + React + Tailwind + shadcn/ui + TanStack Query + React Router |
| Frontend types | Generated from OpenAPI via `openapi-typescript` |
| Testing | vitest (backend: hono app + `:memory:` SQLite; frontend: RTL) |