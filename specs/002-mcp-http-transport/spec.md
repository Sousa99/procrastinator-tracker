# Feature Specification: MCP HTTP Transport

**Feature Branch**: `002-mcp-http-transport`

**Created**: 2026-09-04

**Status**: Draft

**Input**: User description: "lets instead create a plan for this change. i dont see much purpose in having an stdio for mcp if both locally and remotely I will start the process and then connect the agent to the MCP... my wish is to plan for this change." (Decisions from planning: fully replace stdio with streamable HTTP; opencode connects as a remote client to a standalone MCP process; same config shape works for a future deployed endpoint.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run MCP over HTTP and connect opencode to it (Priority: P1)

As a developer, I can start the tracker's MCP server as a standalone HTTP process
(`--mcp` on port 3001) and connect opencode to it via a remote URL, so opencode is a pure
client of a process I control.

**Why this priority**: This is the core of the change — moving from opencode-spawned stdio
to a standalone HTTP MCP endpoint that opencode connects to, locally and eventually when
deployed.

**Independent Test**: Start the MCP process, send an `initialize` JSON-RPC request over
HTTP, and confirm the server responds with `serverInfo` (`procrastinator-tracker` v1.0.0)
and `tools/list` returns the 9 task tools.

**Acceptance Scenarios**:

1. **Given** the backend running in `--mcp` mode, **When** I `POST /mcp` with an
   `initialize` request, **Then** I receive a valid JSON-RPC response with the server
   identity.
2. **Given** an initialized session, **When** I request `tools/list`, **Then** all 9 task
   tools are returned (task.create, task.list, task.get, task.update, task.set_status,
   task.comment, task.delete, tag.list, user.list).
3. **Given** opencode configured with `type: "remote"` pointing at the MCP URL, **When**
   opencode starts, **Then** `opencode mcp list` shows the server as connected and its
   tools are available to the agent.

---

### User Story 2 - Reload dev changes without restarting opencode (Priority: P1)

As a developer, I can restart (or auto-reload) the MCP process and opencode picks up the
change on the next tool call — no opencode restart.

**Why this priority**: This is the motivation for the change. opencode 1.18.x connects
local MCP servers once at startup and does not respawn them; moving to HTTP puts process
lifecycle in the developer's hands.

**Independent Test**: Start the MCP process, make one tool call through opencode, restart
the MCP process, then make another tool call — the second call succeeds without restarting
opencode.

**Acceptance Scenarios**:

1. **Given** a running MCP process, **When** I stop and restart it, **Then** the next
   opencode tool call succeeds against the new process.
2. **Given** `dev:mcp` (file-watch mode), **When** I edit a backend source file, **Then**
   the MCP server reloads automatically and tools remain usable.
3. **Given** the REST API running separately, **When** both the REST and MCP processes are
   up, **Then** a task created through the MCP is visible in `GET /api/tasks` (shared DB).

---

### User Story 3 - Remote-ready wiring (Priority: P2)

As a developer, I can later point opencode at a deployed MCP endpoint by changing only the
URL (and adding auth headers), because the local and remote configurations share one shape.

**Why this priority**: Future-proofing for deployment; not needed for local use but keeps
the local config a direct template for the remote one.

**Independent Test**: The opencode remote config supports a `headers` object with
`{env:TOKEN}` interpolation, so a deployed bearer-token endpoint can be configured without
changing the server.

**Acceptance Scenarios**:

1. **Given** the opencode config for this feature, **When** the endpoint is later deployed,
   **Then** only the `url` (and optionally `headers`) need to change.
2. **Given** a browser-based opencode client (Web/Desktop), **When** it calls the MCP
   endpoint, **Then** CORS headers allow the request (permissive in dev).

---

### Edge Cases

- What happens when opencode starts but the MCP process is not running?
- What happens when a tool call is in flight while the MCP process restarts?
- How are in-flight SSE notification streams handled across a server restart?
- What happens when both REST and MCP processes try to write to the same SQLite file?
- How is the MCP session invalidated when the server restarts (stale `Mcp-Session-Id`)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The backend MUST expose the MCP server over streamable HTTP at `/mcp`
  (POST for JSON-RPC, GET for the SSE notification stream, DELETE to close a session) in
  `--mcp` mode on a configurable port (default 3001).
- **FR-002**: The MCP server MUST expose the same 9 tools with unchanged behavior
  (task.create, task.list, task.get, task.update, task.set_status, task.comment,
  task.delete, tag.list, user.list).
- **FR-003**: The stdio transport MUST be removed entirely (no `StdioServerTransport`,
  no stdio-only launch mode).
- **FR-004**: opencode MUST connect via `type: "remote"` with
  `url: "http://localhost:3001/mcp"`, recorded in the repository `opencode.json`.
- **FR-005**: A `dev:mcp` script using file-watch mode MUST be provided so the MCP server
  reloads on source changes during development.
- **FR-006**: The `/mcp` endpoint MUST respond to CORS preflight and include permissive
  CORS headers so browser-based opencode clients can connect in dev.
- **FR-007**: The opencode config MUST document (via the plan/contracts) how to add
  `headers` (e.g. `Authorization: Bearer {env:TOKEN}`) for a future deployed endpoint.
- **FR-008**: Documentation MUST be updated in the same change: this feature's
  `contracts/mcp.md`, `quickstart.md`, `research.md`, `plan.md`, the repo `README.md`, and
  feature 001's `contracts/mcp.md` (which points here as the current transport).

### Key Entities *(include if feature involves data)*

- **MCP Server**: The single backend process serving the 9 tools over streamable HTTP;
  shares the existing SQLite data layer with the REST API.
- **Session**: A streamable-HTTP MCP session identified by `Mcp-Session-Id`; invalidated
  when the server restarts, re-established by the client on the next request.
- **opencode (client)**: Configures the server as `type: "remote"`; re-negotiates the
  session automatically after a server restart.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `POST /mcp` `initialize` returns the correct server identity within 1 second
  of the process starting.
- **SC-002**: `tools/list` returns exactly 9 tools.
- **SC-003**: Restarting the MCP process requires zero opencode interaction to restore tool
  usability on the next call.
- **SC-004**: A task created via an opencode MCP tool call appears in `GET /api/tasks`.
- **SC-005**: `dev:mcp` reloads within seconds of a source edit with no manual restart.

## Assumptions

- opencode 1.18.x is the client; its remote MCP support (streamable HTTP) re-establishes
  sessions after a server restart.
- `@modelcontextprotocol/sdk@1.30.0` is already installed; its
  `WebStandardStreamableHTTPServerTransport` integrates with Hono.
- The REST API (`--http` on port 3000) is unchanged; MCP runs as a separate process on
  port 3001, sharing the same SQLite database (WAL).
- No server-side authentication in v1; remote auth is documented via opencode `headers`
  and deferred as a follow-up.
- Ports are configurable via environment variables (`PORT`, `MCP_PORT`).