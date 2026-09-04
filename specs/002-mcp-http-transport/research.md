# Research: MCP HTTP Transport

Phase 0 output — resolves the transport decisions for moving the MCP server from stdio to
streamable HTTP. Format per decision: Decision / Rationale / Alternatives considered.

## 1. Transport: stdio → streamable HTTP

- **Decision**: Serve the MCP server over **streamable HTTP** using the installed SDK's
  `WebStandardStreamableHTTPServerTransport`
  (`@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`, v1.30.0 — verified
  present). The `--mcp` mode becomes a standalone Hono process serving `/mcp` on port
  3001 (`MCP_PORT`).
- **Rationale**: opencode 1.18.x connects local stdio MCP servers once at startup and does
  **not** respawn them when they die (confirmed in opencode's MCP client source:
  `connectLocal` runs at startup; `client.onclose` marks the server `failed`). Running
  MCP as a standalone HTTP process puts lifecycle control in the developer's hands:
  restart or auto-reload the process, and opencode's remote client re-establishes the
  session on the next tool call. The same `type: "remote"` config works for a deployed
  endpoint later.
- **Alternatives considered**: stdio + `tsx watch` (rejected — tsx watch logs to **stdout**
  via `console.log`, corrupting the JSON-RPC stdio stream); stdio + custom watchdog
  wrapper (rejected — an in-process restart breaks the MCP session, which requires a
  client re-handshake; too much bespoke machinery); SSE-only endpoint (rejected —
  streamable HTTP is the modern MCP standard and what opencode prefers).

## 2. Server integration with Hono

- **Decision**: Use `WebStandardStreamableHTTPServerTransport` whose
  `handleRequest(req: Request): Promise<Response>` accepts web-standard
  Request/Response — it slots directly into Hono (`return transport.handleRequest(c.req.raw)`),
  running under `@hono/node-server` like the REST app.
- **Endpoint contract** (per MCP streamable HTTP):
  - `POST /mcp` — JSON-RPC request; response includes `Mcp-Session-Id` on session creation.
  - `GET /mcp` — SSE stream for server→client notifications (kept open by clients).
  - `DELETE /mcp` — close the session.
  - `OPTIONS /mcp` — CORS preflight; respond with permissive CORS headers (dev).
- **Rationale**: reuses the existing Hono server stack; no raw `node:http` adapter needed;
  permissive CORS makes browser-based opencode clients (Web/Desktop) work in dev.
- **Alternatives considered**: raw `node:http` server (rejected — duplicates Hono wiring);
  Node-variant `StreamableHTTPServerTransport` (rejected — expects `http.IncomingMessage`/
  `ServerResponse`, awkward inside Hono).

## 3. Reload semantics (the developer experience)

- **Decision**: Two reload paths:
  1. **Manual**: stop/start the `--mcp` process. opencode's `StreamableHTTPClientTransport`
     re-negotiates the session on the next tool call — zero opencode interaction.
  2. **Automatic**: `dev:mcp` = `tsx watch src/index.ts --mcp`. File-watch restarts are
     now safe because HTTP, not stdout, is the protocol channel.
- **Edge cases**:
  - opencode started before the MCP process → server marked `failed`; reconnect via the
    TUI "MCPs" action (`command.mcp.toggle`, `ctrl+p` → "MCPs" → toggle) or restart
    opencode. Documented in quickstart.
  - Tool call in flight during a restart → the call errors once; the next call succeeds.
  - Stale `Mcp-Session-Id` after restart → the client (opencode SDK) re-initializes per
    the MCP spec.
  - REST + MCP sharing the SQLite file → WAL allows concurrent access (already proven).

## 4. Remote/deployed readiness

- **Decision**: The opencode config uses `type: "remote"` from day one, so local and
  deployed wiring share one shape:
  ```json
  { "type": "remote", "url": "http://localhost:3001/mcp", "enabled": true }
  ```
  Deployed: swap `url` and add `"headers": { "Authorization": "Bearer {env:TOKEN}" }`
  (opencode supports `{env:VAR}` interpolation in header values).
- **Deferred (documented, not implemented)**: server-side authentication — a future
  follow-up could add an optional bearer-token check in the `--mcp` process.
- **Rationale**: keeps v1 minimal (personal, local-first) while making the migration to a
  deployed endpoint a config-only change.

## 5. Test strategy

- **Decision**: Add `backend/tests/integration/mcp-http.test.ts` that builds the MCP HTTP
  app against an in-memory SQLite DB and performs the `initialize` → `tools/list`
  handshake via `app.request()`, asserting server identity and 9 tools. The existing
  32 backend + 8 frontend tests are untouched (the REST layer is unchanged).
- **Rationale**: an HTTP endpoint is directly testable without a client process; matches
  the existing vitest + Hono `app.request` pattern.
- **Alternatives considered**: spawning the real process and driving stdio/curl (rejected
  — slower and less deterministic than `app.request`).

## Decisions summary

| Topic | Decision |
|-------|----------|
| Transport | Streamable HTTP via `WebStandardStreamableHTTPServerTransport` |
| Endpoint | `--mcp` mode → Hono app, `POST/GET/DELETE /mcp` + CORS, `/health`, port 3001 |
| opencode | `type: "remote"`, `url: http://localhost:3001/mcp` in repo `opencode.json` |
| stdio | Removed entirely |
| Dev reload | Manual process restart, or `dev:mcp` (`tsx watch`) auto-reload |
| Remote-ready | Same config shape; `headers` + URL swap for deployed; auth deferred |
| Tests | `mcp-http.test.ts` (initialize + tools/list handshake); existing suites unchanged |