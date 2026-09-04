# MCP Contract: MCP HTTP Transport

Phase 1 output. This document supersedes the transport section of feature
[001's MCP contract](../001-task-tracker-core/contracts/mcp.md): the MCP server now runs
over **streamable HTTP** instead of stdio. Tool names, input/output schemas, and semantics
are unchanged.

## Transport

- **Protocol**: MCP over streamable HTTP (2024-11-05 protocol version).
- **Endpoint**: `http://localhost:3001/mcp` (port from `MCP_PORT`, default `3001`).
- **Process**: started with `pnpm --filter backend start:mcp` (or `dev:mcp` for
  file-watch auto-reload). The process is a standalone launch mode (`--mcp`) of the same
  backend codebase; it shares the SQLite database with the REST API (`--http`, port 3000).
- **Methods**:
  | Method | Purpose |
  |--------|---------|
  | `POST /mcp` | JSON-RPC request (initializes a session, returns `Mcp-Session-Id`) |
  | `GET /mcp` | SSE stream for server→client notifications |
  | `DELETE /mcp` | Close the session |
  | `OPTIONS /mcp` | CORS preflight (permissive in dev) |
- **Health**: `GET /health` → `200 {"status":"ok"}`.
- **Sessions**: identified by `Mcp-Session-Id`. If the server restarts, stale sessions are
  invalidated and the client re-establishes on the next request.

## Server

- **name**: `procrastinator-tracker`
- **version**: `1.0.0`

## Tools

Unchanged from feature 001: `task.create`, `task.list`, `task.get`, `task.update`,
`task.set_status`, `task.comment`, `task.delete`, `tag.list`, `user.list`. See
[feature 001 MCP contract](../001-task-tracker-core/contracts/mcp.md) for input/output
schemas.

## Connecting opencode

Recorded in the repository root `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "procrastinator-tracker": {
      "type": "remote",
      "url": "http://localhost:3001/mcp",
      "enabled": true
    }
  }
}
```

**Deployed/remote**: swap `url` for the deployed endpoint and add auth headers when the
server is not local-only:

```json
{
  "type": "remote",
  "url": "https://your-server.example/mcp",
  "headers": { "Authorization": "Bearer {env:MCP_TOKEN}" }
}
```

> opencode interpolates `{env:VAR}` in header values. Server-side auth enforcement is a
> documented follow-up, not implemented in v1.

**Reload workflow** (why HTTP replaces stdio): opencode 1.18.x connects local stdio MCP
servers once at startup and does not respawn them. With HTTP, restarting the `--mcp`
process (or `dev:mcp` auto-reload) is picked up by opencode on the next tool call — no
opencode restart. If opencode started before the MCP process, reconnect via the TUI
"*MCPs*" action (`ctrl+p` → MCPs → toggle the server).

## Manual handshake (curl)

```bash
# Initialize
curl -s -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'

# List tools (after capturing Mcp-Session-Id from the initialize response)
curl -s -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <session-id>' \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized"}'

curl -s -X POST http://localhost:3001/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Mcp-Session-Id: <session-id>' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
```

## Error handling

- Non-JSON-RPC input / malformed requests → HTTP 400 with a JSON-RPC error body.
- Session missing/unknown → per MCP streamable HTTP, the server returns a session error
  and the client re-initializes.
- Tool errors → JSON-RPC error responses with the same codes as REST (404 missing, 409
  conflict/invalid transition).