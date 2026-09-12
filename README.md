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
`--mcp` serves the MCP server over **streamable HTTP** (see
[feature 002](specs/002-mcp-http-transport/)). Both modes share the same service/db layer
— no separate backend packages.

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
| MCP server (HTTP) | `pnpm --filter backend start:mcp` | Streamable HTTP MCP at http://localhost:3001/mcp (`MCP_PORT`) |
| MCP auto-reload (dev) | `pnpm --filter backend dev:mcp` | Same, but `tsx watch` reloads on source edits |
| Frontend (dev) | `pnpm --filter frontend dev` | http://localhost:5173, proxies `/api` to the backend |
| Storybook (workbench) | `pnpm --filter frontend storybook` | http://localhost:6006 · static build → `dist-storybook/` |
| Both together | `pnpm dev` | REST + frontend via `concurrently` |

Both backend modes share `backend/data/procrastinator.db` (SQLite WAL allows concurrent
access). To run REST and MCP simultaneously, start two instances of the same process —
which also means you can restart the MCP process without affecting the REST API.

## Frontend: Storybook & the TaskDeck component

The frontend ships a **Storybook workbench** (`pnpm --filter frontend storybook` →
http://localhost:6006) for developing and documenting components in isolation. Stories are
co-located with components; see [feature 003](specs/003-storybook-task-stack/).

The **`TaskDeck`** component renders tasks as a **swipeable card stack** (Deck Standard 1
style): the top card fully visible, the next `stackSize` cards scaled/fanned behind it. It
supports drag-to-skip and an **auto-rotate** timer. Key props (see
[contracts/task-deck.md](specs/003-storybook-task-stack/contracts/task-deck.md)):

- `filters` — which tasks to show (fetched via the existing API client).
- `refreshRateMs` (default 30000) — how often to re-fetch; `0` disables.
- `autoRotateMs` (default 4000) — auto-advance interval; `0` disables; pauses during drag and
  resets after a manual skip.
- `slideDurationMs` (default 500) — swipe/exit animation duration.
- `loop` (default true) — cycles back to the first task instead of showing an empty state.

The app dashboard offers a **Deck | List** toggle: Deck renders `TaskDeckWrapper`
(self-fetching), List renders the classic vertical task list.

### Exportable package

`pnpm --filter frontend build:lib` produces `frontend/dist-lib/` — an ESM bundle
(`index.js` + `index.d.ts`) plus a compiled `styles.css`, so the component can be installed
and used in other React 19 apps:

```tsx
import { TaskDeckWrapper } from '@procrastinator-tracker/frontend';
import '@procrastinator-tracker/frontend/styles.css';

<TaskDeckWrapper filters={{ status: 'started' }} autoRotateMs={5000} />;
```

`react`, `react-dom`, `motion`, and `lucide-react` are peer dependencies (consumers provide
them). The package is ESM-only — CommonJS consumers use dynamic import. Validated with
`npx publint` and `npx @arethetypeswrong/cli --pack`.

## Documentation

- **Specs**: `specs/001-task-tracker-core/` — spec, plan, research, data-model, contracts,
  quickstart, tasks. `specs/002-mcp-http-transport/` — MCP HTTP transport (spec, plan,
  research, contracts, quickstart, tasks). `specs/003-storybook-task-stack/` — Storybook
  workbench + exportable TaskDeck component (spec, plan, research, data-model, contracts,
  quickstart, tasks).
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

## Connecting opencode

The repo's `opencode.json` registers the tracker as a **remote** MCP server:

```json
{
  "mcp": {
    "procrastinator-tracker": {
      "type": "remote",
      "url": "http://localhost:3001/mcp",
      "enabled": true
    }
  }
}
```

Start the MCP process (`pnpm --filter backend start:mcp` or `dev:mcp`), then opencode
connects on its next start. **Reloading MCP code needs no opencode restart**: restart the
MCP process (or let `dev:mcp` reload on save) and opencode picks it up on the next tool
call. See [feature 002 contracts](specs/002-mcp-http-transport/contracts/mcp.md).

**Deployed**: same config shape — swap `url` and add auth headers:

```json
{ "type": "remote", "url": "https://your-server.example/mcp",
  "headers": { "Authorization": "Bearer {env:MCP_TOKEN}" } }
```

## Governance

See `.specify/memory/constitution.md` for the project's governing principles (code
quality, automated formatting/linting, maintainability, living documentation).