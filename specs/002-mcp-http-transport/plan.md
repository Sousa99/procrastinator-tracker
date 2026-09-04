# Implementation Plan: MCP HTTP Transport

**Branch**: `002-mcp-http-transport` | **Date**: 2026-09-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-mcp-http-transport/spec.md`

## Summary

Replace the tracker's MCP stdio transport with a **streamable HTTP** transport so opencode
connects as a remote client (`type: "remote"`) to a standalone MCP process the developer
controls. This gives the developer restart/reload control without restarting opencode
(opencode 1.18.x does not respawn local stdio MCP servers), and the same `type: "remote"`
config shape works against a future deployed endpoint by only swapping the URL (and adding
auth `headers`).

Primary requirement: expose the existing 9 MCP tools over `POST/GET/DELETE /mcp` in a new
`--mcp` process mode (port 3001), remove the stdio transport entirely, connect opencode
via `opencode.json` remote config, and provide a `dev:mcp` file-watch script for
auto-reload.

## Technical Context

**Language/Version**: TypeScript / Node 24 LTS, pnpm 11 (unchanged)

**Primary Dependencies**:
- Added: none. Reuses `@modelcontextprotocol/sdk` (v1.30.0, already installed) —
  `WebStandardStreamableHTTPServerTransport` from
  `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js` (verified present).
- Existing: `hono`, `@hono/node-server`, `zod`, `tsx` (watch mode).

**Storage**: Unchanged — SQLite via Drizzle (`better-sqlite3` 13.0.3). The `--mcp` process
shares `backend/data/procrastinator.db` with the REST process (WAL handles concurrency).

**Testing**: Existing vitest suites (backend 32, frontend 8) remain; add an integration
test that performs an MCP `initialize` + `tools/list` handshake over the HTTP endpoint
against an in-memory SQLite DB. Manual validation via curl and `opencode mcp list`.

**Target Platform**: Local development machine; REST on `:3000`, MCP on `:3001`
(`MCP_PORT` env). Remote/deployed: same `--mcp` mode behind a public URL.

**Project Type**: Full-stack web application (pnpm workspace: `backend`, `frontend`).

**Performance Goals**: Unchanged (local, instant). `initialize` handshake < 1s.

**Constraints**: Local-first, single-user; single codebase with launch modes
(`--http` REST, `--mcp` MCP-HTTP); no new dependencies; stdio removed entirely; docs
updated in the same change.

**Scale/Scope**: Single developer; this change is limited to the MCP transport and its
documentation/configuration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Verdict | Justification |
|------|---------|---------------|
| I. Pragmatic Code Quality | PASS | Small, focused change: one adapter swapped, one new launch mode; no gold-plating; reuses the installed SDK (zero new deps). |
| II. Automated Formatting | PASS | No new formatting surface; existing single Prettier config covers `opencode.json`. |
| III. Automated Linting | PASS | Existing ESLint config; no rule exceptions required. |
| IV. Testable & Maintainable | PASS | HTTP endpoint is trivially testable with curl/`app.request`; same cohesive module layout (`adapters/mcp.ts`). |
| V. Living Documentation | PASS | `contracts/mcp.md`, `quickstart.md`, `research.md`, `plan.md`, `README.md`, and feature 001's mcp contract updated in the same change. |
| Additional Constraints (Practicality) | PASS | One codebase, three launch modes of the same process; no bespoke tooling beyond a `tsx watch` script. |
| Workflow & Quality Gates | PASS | Format + lint + typecheck + test must pass before merge; MCP handshake covered by a test and quickstart validation. |

**Complexity Tracking**: No constitution violations. The only addition is a third launch
mode (`--mcp` → HTTP server) of the same process; this is justified by the requirement
that the developer control the MCP process lifecycle (restart/reload without restarting
opencode) both locally and when deployed.

**Re-check after Phase 1 design**: PASS. The delivered design (research.md,
contracts/mcp.md, quickstart.md) introduces no new complexity: no new dependency, one
adapter swap, stdio removed, opencode remote config recorded in `opencode.json`, and all
docs updated in the same change. All gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/002-mcp-http-transport/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── contracts/mcp.md     # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── spec.md              # Feature specification
├── checklists/          # Spec-quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code & Config (repository root)

```text
opencode.json                 # NEW: opencode remote MCP config (type: remote -> localhost:3001/mcp)

backend/
├── src/
│   ├── adapters/mcp.ts       # MODIFY: stdio transport -> WebStandardStreamableHTTPServerTransport
│   │                         #         add createMcpHttpApp(db): Hono app (POST/GET/DELETE /mcp, CORS, /health)
│   ├── index.ts              # MODIFY: --mcp mode serves the MCP HTTP app on MCP_PORT; remove stdio
│   └── app.ts                # unchanged (REST)
├── package.json              # MODIFY: start:mcp (HTTP), add dev:mcp (tsx watch ... --mcp)
└── tests/
    └── integration/
        └── mcp-http.test.ts  # NEW: initialize + tools/list handshake over the HTTP endpoint

README.md                     # MODIFY: run-modes table (MCP via HTTP), opencode connection note
specs/001-task-tracker-core/
└── contracts/mcp.md          # MODIFY: point to 002 as the current transport
```

**Structure Decision**: No new package or directory tree — the change lives entirely in
`backend/src/adapters/mcp.ts` and `backend/src/index.ts`, plus repo-root `opencode.json`.
Consistent with the existing "single codebase, multiple launch modes" structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify (see Constitution Check).

## Phase 0: Research (research.md)

Resolve the transport specifics:

- `WebStandardStreamableHTTPServerTransport` API: `handleRequest(Request) → Response`,
  session handling (`Mcp-Session-Id`), `enableJsonResponse`, integration with Hono.
- MCP streamable HTTP semantics: POST (JSON-RPC), GET (SSE notifications), DELETE
  (session close), OPTIONS/CORS.
- opencode remote-client behavior: `connectRemote` uses `StreamableHTTPClientTransport`
  (with SSE fallback); session re-negotiation after a server restart; `opencode mcp list`
  status; the TUI "MCPs" toggle (`command.mcp.toggle`) as a reconnect path when the
  server wasn't running at startup.
- `tsx watch` safety over HTTP (stdout pollution is irrelevant to an HTTP server).
- Confirmed absence of an opencode MCP restart command in 1.18.x (CLI: add/list/auth/
  logout/debug only) — motivating this change.

## Phase 1: Design (contracts/mcp.md, quickstart.md)

- **contracts/mcp.md**: Transport section (streamable HTTP, endpoint `/mcp`, methods,
  sessions, CORS), the 9 tools (unchanged), opencode connection config (remote URL,
  `headers` for deployed), and curl handshake examples.
- **quickstart.md**: Run-modes table (REST `:3000`, MCP `:3001`, `dev:mcp` watch, `pnpm
  dev`), prerequisites (MCP port, DB migrated), and runnable validation scenarios:
  curl initialize/tools/list, opencode connection, create-a-task flow, restart-the-process
  flow, `dev:mcp` auto-reload flow.