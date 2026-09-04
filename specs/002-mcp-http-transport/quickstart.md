# Quickstart: MCP HTTP Transport

Phase 1 output. A runnable validation guide for the MCP-over-HTTP change. It does not
replace implementation details (see [plan.md](plan.md) and `tasks.md` when created);
full contracts: [contracts/mcp.md](contracts/mcp.md). Feature
[001 quickstart](../001-task-tracker-core/quickstart.md) remains valid for REST
validation.

## Prerequisites

- Node.js 24 LTS, pnpm 11
- Database migrated: `pnpm db:migrate` (creates `backend/data/procrastinator.db`)
- Port `3001` free (`MCP_PORT` to change it)

## Run modes

| Mode | Command | What it starts |
|------|---------|----------------|
| REST API + Swagger | `pnpm --filter backend start` | Hono REST app on `http://localhost:3000` |
| MCP server (HTTP) | `pnpm --filter backend start:mcp` | MCP over streamable HTTP on `http://localhost:3001/mcp` |
| MCP auto-reload (dev) | `pnpm --filter backend dev:mcp` | Same, but `tsx watch` reloads on source edits |
| Frontend | `pnpm --filter frontend dev` | Vite SPA on `http://localhost:5173` |
| Both backend modes | two terminals (or `pnpm dev` + a terminal for MCP) | REST + MCP share the same SQLite DB (WAL) |

## Validation scenarios

### 1. MCP handshake over HTTP (curl)

Start the MCP server, then:

```bash
curl -s -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
```

**Expected**: JSON-RPC result with `serverInfo: { name: "procrastinator-tracker",
version: "1.0.0" }` and `tools.listChanged: true`. Capture `Mcp-Session-Id` from the
response header, send `notifications/initialized`, then `tools/list`:

**Expected**: exactly 9 tools (`task.create`, `task.list`, `task.get`, `task.update`,
`task.set_status`, `task.comment`, `task.delete`, `tag.list`, `user.list`).

### 2. opencode connection

```bash
pnpm --filter backend start:mcp   # keep running
opencode mcp list                 # from the repo root
```

**Expected**: `procrastinator-tracker` shows `connected`. In opencode, ask the agent to
"list tasks" (or call a tool) — tools work.

### 3. Create a task through opencode → visible in REST

Via opencode, create a task (e.g. "Buy milk", tag `chores`). Then:

```bash
curl -s "http://localhost:3000/api/tasks?tag=chores"
```

**Expected**: the task appears with `status: "to-start"` (REST and MCP share the DB).

### 4. Restart the MCP process (no opencode restart)

1. Kill the `start:mcp` process and start it again.
2. In opencode, call a tool (e.g. `task.list`).

**Expected**: the call succeeds immediately — opencode re-negotiates the session on the
next request. No opencode restart required. (This is the whole point of the change.)

### 5. Auto-reload (`dev:mcp`)

1. Run `pnpm --filter backend dev:mcp`.
2. Edit any file under `backend/src/` and save.
3. In opencode, call a tool.

**Expected**: the server reloads (watch mode); the next tool call uses the new code.

### 6. Edge: opencode started before the MCP server

If opencode is running but the MCP process is down, `opencode mcp list` shows
`failed`. Start the MCP process, then reconnect from the TUI: `ctrl+p` → **MCPs** →
toggle the server off and back on (space). Tools become available without an opencode
restart.

### 7. Quality gates

```bash
pnpm lint && pnpm format && pnpm typecheck && pnpm test
```

**Expected**: all green, including the new `mcp-http.test.ts` handshake test.

## Expected outcomes summary

- Every spec FR (FR-001…FR-008) has a runnable check above.
- Success criteria met: SC-001 (initialize < 1s), SC-002 (9 tools), SC-003 (restart
  requires no opencode interaction), SC-004 (MCP-created task visible in REST), SC-005
  (`dev:mcp` reloads on save).