# Implementation Plan: Task Tracker Core

**Branch**: `001-task-tracker-core` | **Date**: 2026-09-03 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-task-tracker-core/spec.md`

## Summary

Build the Procrastinator Tracker: a full-stack, local-first task tracking application
covering the primary requirement — tracking tasks through a fixed status lifecycle
(`to-start`, `started`, `in-progress`, `on-hold`, `validating`, `finished`) with tags
(flat, no hierarchy), users (lightweight local labels), locations, urgency (1-5),
recurring tasks (auto-generated instances), and status comments.

Technical approach: a pnpm workspace with two packages. The backend runs a single codebase
with a dual-mode entry point — mode `http` serves the Hono REST API plus OpenAPI/Swagger,
mode `mcp` serves the same services as an MCP stdio server. The frontend is a Vite + React
single-page app with shadcn/ui + Tailwind and TanStack Query, delivering a simple,
light-mood, motivating task view.

## Technical Context

**Language/Version**: TypeScript / Node 22 LTS (both backend and frontend)

**Primary Dependencies**:
- Backend: `hono`, `@hono/zod-openapi`, `zod`, `drizzle-orm`, `better-sqlite3`,
  `@modelcontextprotocol/sdk`; dev: `drizzle-kit`, `tsx`, `vitest`
- Frontend: `react`, `react-dom`, `react-router`, `@tanstack/react-query`,
  `tailwindcss`, `shadcn/ui` (Radix primitives), `lucide-react`; dev: `vite`,
  `vitest`, `@testing-library/react`, `@vitejs/plugin-react`
- Tooling: `prettier`, `eslint`, `typescript`, `concurrently`

**Storage**: SQLite (local file) via Drizzle ORM, `better-sqlite3` driver,
`drizzle-kit` migrations. Schema kept Postgres-portable (no SQLite-only column types
where avoidable) so the database can be swapped later without a rewrite.

**Testing**: `vitest` + `hono` test client (backend unit + integration), React Testing
Library (frontend), VSCode REST Client `.http` files for manual endpoint validation, and
OpenAPI schema validation of responses. Storybook explicitly dropped from v1 per decision.

**Target Platform**: Local development machine; browser for the frontend, localhost
server for the REST API, stdio for the MCP server.

**Project Type**: Full-stack web application (pnpm workspace, two packages: `backend`,
`frontend`).

**Performance Goals**: Instant local responses (<100ms typical); no meaningful
performance pressure at personal scale.

**Constraints**: Local-first, single-user (lightweight user labels, no auth), minimal
dependency footprint, portable data model, REST and MCP share one service layer.

**Scale/Scope**: Single user, hundreds of tasks; single deployment on a local machine.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Verdict | Justification |
|------|---------|---------------|
| I. Pragmatic Code Quality | PASS | YAGNI applied: no speculative abstraction, no auth, no hierarchy, one surface per concern; dual-mode entry avoids a duplicate backend package. |
| II. Automated Formatting | PASS | Single root `prettier.config.mjs`; formatting enforced via `pre-commit` hook and CI-style check before merge; never a review topic. |
| III. Automated Linting | PASS | Single root ESLint flat config with recommended defaults; any rule exception documented inline with justification. |
| IV. Testable & Maintainable | PASS | Small cohesive modules (one dir per resource), consistent naming, minimal deps; no shared package — OpenAPI spec is the single contract source of truth. |
| V. Living Documentation | PASS | Docs updated in the same change; `quickstart.md`, `data-model.md`, contracts, and README kept current alongside code. |
| Additional Constraints (Practicality) | PASS | One formatter + one linter for the JS/TS toolchain; standard tools only (no bespoke scripts). |
| Workflow & Quality Gates | PASS | Format + lint + test must pass before commit/merge; enforced by hooks and scripts. |

**Complexity Tracking**: A 2-package pnpm workspace is the only structural addition and it
is justified: `backend` and `frontend` are independent delivery surfaces (server process vs
browser bundle) with different toolchains. A third shared package was considered and
rejected — the OpenAPI spec generated in the backend is the contract source of truth and
frontend types are derived from it, avoiding a shared-code layer.

**Re-check after Phase 1 design**: PASS. The delivered design (data-model.md, contracts/,
quickstart.md, research.md) introduces no new complexity: Storybook dropped, no auth, no
shared package, dual-mode MCP avoids a duplicate backend package, one formatter + one
linter, docs kept in the same change. All gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/001-task-tracker-core/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── db/              # drizzle schema.ts, client.ts, migrations output (drizzle/)
│   ├── services/        # business logic: tasks, tags, users, recurrence, comments
│   ├── adapters/        # http.ts (REST + OpenAPI + Swagger UI), mcp.ts (MCP stdio)
│   └── index.ts         # dual-mode entry: --http | --mcp
├── http/                # VSCode REST Client .http files
├── drizzle/             # generated SQL migration files
└── tests/               # unit + integration (vitest)

frontend/
├── src/
│   ├── components/      # shadcn/ui primitives + feature components
│   ├── pages/           # dashboard (task list), task detail
│   ├── api/             # typed API client + TanStack Query hooks
│   ├── lib/             # shared ui/format helpers
│   └── App.tsx
└── tests/               # component tests (vitest + RTL)

Root:
├── package.json         # pnpm workspace root (backend, frontend)
├── prettier.config.mjs  # single formatter config
├── eslint.config.mjs    # single lint config (flat config)
└── tsconfig.base.json   # shared TS settings
```

**Structure Decision**: pnpm workspace with two packages (`backend`, `frontend`). The
backend owns the data model and exposes two adapters over one service layer; the frontend
is a pure client consuming the REST contract. No third package: contracts flow via OpenAPI.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify. The only structural complexity (2-package workspace) is
justified in the Constitution Check above and recorded in the Complexity Tracking note;
it is not a constitution violation.

## Phase 0: Research (research.md)

Resolve all technical unknowns and lock in best practices:

- Hono + `@hono/zod-openapi`: OpenAPI document generation and Swagger UI serving in dev.
- Drizzle + `better-sqlite3` + `drizzle-kit`: schema definition, migration workflow,
  SQLite pragmas (WAL) and Postgres portability guidance.
- MCP server with `@modelcontextprotocol/sdk`: stdio transport, tool + input schema
  definitions, dual-mode process entry.
- Recurrence engine: auto-generate next instances on completion and catch up overdue
  instances on read (no cron dependency).
- Status workflow: fixed enum + explicit transition matrix (which transitions are valid).
- VSCode REST Client: `.http` file conventions for documenting and validating endpoints.
- Frontend stack: Vite + React + Tailwind + shadcn/ui + TanStack Query integration
  patterns; typed client generated from the OpenAPI spec.
- Vitest setup for both backend (hono test client) and frontend (RTL).

## Phase 1: Design (data-model.md, contracts/, quickstart.md)

- **data-model.md**: Task, User (local label), Tag, RecurrenceRule, Comment, Status enum,
  TaskTag join; field definitions, validation rules from spec FRs, and the status
  transition matrix.
- **contracts/**: `rest.md` (task/tag/user endpoints, request/response shapes derived
  from the OpenAPI model), `mcp.md` (tool names, input/output schemas), and example
  `http/tasks.http` REST Client files for manual validation.
- **quickstart.md**: prerequisites, install/migrate commands, how to run each mode
  (REST + Swagger, MCP), and runnable validation scenarios with expected outcomes.