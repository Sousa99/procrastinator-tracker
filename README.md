# Procrastinator Tracker

A local-first task tracker: a Hono REST API (with OpenAPI/Swagger) plus an MCP server, a
SQLite database via Drizzle, and a lightweight React single-page app that makes it easy to
push tasks to done.

Track tasks through a fixed lifecycle — `to-start → started → in-progress → validating →
finished` (with `on-hold` and reopen) — with flat tags, lightweight users (no accounts),
optional location and urgency (1–5), recurring tasks, and status-aware comments.

## Stack

| Layer    | Technology |
|----------|------------|
| Backend  | Node 24, Hono, `@hono/zod-openapi`, Drizzle ORM, better-sqlite3, MCP TypeScript SDK |
| Frontend | Vite, React 19, Tailwind CSS v4, shadcn-style primitives, TanStack Query, React Router |
| Tooling  | pnpm 11, TypeScript, ESLint (flat config), Prettier, Vitest |

The backend is a single codebase with a **dual-mode entry**: `--http` serves the REST API,
`--mcp` runs the MCP server over stdio. Both modes share the same service/db layer — no
separate backend packages.

## Prerequisites

- Node.js 24 LTS
- pnpm 11

## Setup

```bash
pnpm install
pnpm db:generate   # generate SQL migration from the Drizzle schema (if schema changed)
pnpm db:migrate    # apply migrations (creates the SQLite database)
```

## Run

| Mode | Command | Notes |
|------|---------|-------|
| REST API + Swagger | `pnpm --filter backend start` | http://localhost:3000 · OpenAPI at `/doc` · Swagger UI at `/ui` |
| MCP server | `pnpm --filter backend start:mcp` | JSON-RPC over stdin/stdout (stdio); log to stderr only |
| Frontend (dev) | `pnpm --filter frontend dev` | http://localhost:5173, proxies `/api` to the backend |
| Both together | `pnpm dev` | REST + frontend via `concurrently` |

Both backend modes share `backend/data/procrastinator.db` (SQLite WAL allows concurrent
access). To run REST and MCP simultaneously, start two instances of the same process.

## Documentation

- **Specs**: `specs/001-task-tracker-core/` — `spec.md`, `plan.md`, `research.md`,
  `data-model.md`, `contracts/` (REST + MCP contracts), `quickstart.md`, `tasks.md`.
- **API contract**: served at `/doc` (OpenAPI 3.0) with interactive Swagger UI at `/ui`.
- **Endpoint validation**: VSCode REST Client files in `backend/http/*.http`.

## Quality gates

```bash
pnpm lint       # ESLint (root flat config)
pnpm format     # Prettier check (root config)
pnpm test       # Vitest: backend (hono app + in-memory SQLite) + frontend (RTL)
pnpm typecheck  # tsc --noEmit for both packages
```

All four MUST pass before commit/merge (see the project constitution).

## MCP tools

`task.create`, `task.list`, `task.get`, `task.update`, `task.set_status`,
`task.comment`, `task.delete`, `tag.list`, `user.list`.

## Governance

See `.specify/memory/constitution.md` for the project's governing principles (code
quality, automated formatting/linting, maintainability, living documentation).