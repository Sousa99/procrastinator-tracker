# Tasks: MCP HTTP Transport

**Input**: Design documents from `/specs/002-mcp-http-transport/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, contracts/

**Tests**: Test tasks ARE included. The constitution mandates quality gates ("Formatting,
linting, and tests MUST pass before any commit or merge") and research.md specifies an
MCP HTTP handshake test; the US1 test task is written before its implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` (pnpm workspace per plan.md)
- Tests: `backend/tests/`
- This feature touches no data model — no `data-model.md`; contract: `contracts/mcp.md`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Configuration and script surface for the HTTP MCP transport

- [X] T001 Verify repo-root `opencode.json` configures the MCP server as
  `{ "type": "remote", "url": "http://localhost:3001/mcp", "enabled": true }` (created
  during planning; confirm it exists)
- [X] T002 Update `backend/package.json`: change `start:mcp` to `tsx src/index.ts --mcp`
  (HTTP mode) and add `dev:mcp` → `tsx watch src/index.ts --mcp` (auto-reload)
- [X] T003 Add `MCP_PORT=3001` to `backend/.env.example` and `backend/.env` (default
  fallback `3001` in code)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core transport swap — MUST be complete before any user story can be validated

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Refactor `backend/src/adapters/mcp.ts`: replace `StdioServerTransport` with
  `WebStandardStreamableHTTPServerTransport` (from
  `@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js`); keep `createMcpServer(db)`
  (9 tools unchanged); add `createMcpHttpApp(db)` returning a Hono app with `POST/GET/DELETE
  /mcp` (via `transport.handleRequest(c.req.raw)`), `OPTIONS` CORS handling, and `GET /health`;
  ensure all logs go to stderr
- [X] T005 Update `backend/src/index.ts`: `--mcp` mode serves `createMcpHttpApp(db)` on
  `MCP_PORT` (default `3001`) via `@hono/node-server`; remove the stdio path
- [X] T006 Remove all stdio references from `backend/src` (search `StdioServerTransport`,
  `runMcpServer`, `StdioServerTransport` import); confirm nothing writes to stdout in MCP
  mode

**Checkpoint**: The MCP server now speaks streamable HTTP on `:3001` — validation can begin

---

## Phase 3: User Story 1 - Run MCP over HTTP and connect opencode (Priority: P1) 🎯 MVP

**Goal**: The MCP server exposes its 9 tools over HTTP and opencode connects as a remote client.

**Independent Test**: Start the MCP process, `POST /mcp` with an `initialize` request,
confirm the JSON-RPC response identifies `procrastinator-tracker` v1.0.0, and
`tools/list` returns exactly 9 tools.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T007 [P] [US1] Add integration test `backend/tests/integration/mcp-http.test.ts`:
  build the MCP HTTP app against an in-memory SQLite DB (`createDb(':memory:')` +
  `migrate`), perform `initialize` (assert `serverInfo.name === 'procrastinator-tracker'`,
  version `1.0.0`) and `tools/list` (assert exactly 9 tools) via `app.request()`

### Implementation for User Story 1

- [X] T008 [US1] End-to-end validation per `specs/002-mcp-http-transport/quickstart.md`
  scenarios 1-3: run `pnpm --filter backend start:mcp`, curl `POST /mcp` initialize +
  tools/list, run `opencode mcp list` (expect `connected`), create a task via opencode and
  confirm it appears in `GET /api/tasks`

**Checkpoint**: US1 complete — opencode is connected to the standalone HTTP MCP process

---

## Phase 4: User Story 2 - Reload dev changes without restarting opencode (Priority: P1)

**Goal**: Restarting (or auto-reloading) the MCP process is picked up by opencode on the next tool call.

**Independent Test**: Make a tool call, restart the MCP process, make another tool call —
the second succeeds with zero opencode interaction.

### Implementation for User Story 2

- [X] T009 [P] [US2] Validate the manual-restart flow (quickstart scenario 4): kill and
  restart the `--mcp` process, then call a tool in opencode (e.g. `task.list`) — confirm
  it succeeds without restarting opencode
- [X] T010 [US2] Validate `dev:mcp` auto-reload (quickstart scenario 5): run
  `pnpm --filter backend dev:mcp`, edit any file under `backend/src/` and save, then call
  a tool — confirm the server reloads and tools remain usable

**Checkpoint**: US2 complete — MCP reloads require no opencode restart

---

## Phase 5: User Story 3 - Remote-ready wiring (Priority: P2)

**Goal**: Local and deployed opencode configs share one shape; only URL (and auth headers) change later.

**Independent Test**: The opencode remote config supports `headers` with `{env:TOKEN}`
interpolation, so a deployed bearer-token endpoint needs only a URL/headers change.

### Implementation for User Story 3

- [X] T011 [P] [US3] Update the MCP section of `README.md`: run-modes table (REST `:3000`,
  MCP HTTP `:3001`, `dev:mcp` watch), the opencode connection (`opencode.json` remote
  config), and the deployed example (`url` swap + `headers: { "Authorization": "Bearer
  {env:MCP_TOKEN}" }`)
- [X] T012 [US3] Confirm `specs/002-mcp-http-transport/contracts/mcp.md` documents the
  deployed wiring (URL swap + `headers`) and that feature 001's
  `specs/001-task-tracker-core/contracts/mcp.md` points here as the current transport

**Checkpoint**: US3 complete — the local config is a drop-in template for a deployed endpoint

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Gates, doc consistency, and cleanup

- [X] T013 [P] Run quality gates: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`
  (must include the new `mcp-http.test.ts`); fix any failures
- [X] T014 [P] Update `specs/002-mcp-http-transport/quickstart.md` for any discrepancies
  found during validation; final cleanup (no dead stdio code, no stdout logging in MCP
  mode)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion
  - User stories then proceed in priority order (P1 → P2)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (needs a connected opencode session to test the
  restart/reload flows)
- **User Story 3 (P2)**: Depends on US1 (documents the connected config); independently
  testable as documentation

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Backend transport swap before validation
- Validation before documentation

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational completes, US1 can start; US2 and US3 can run in parallel after US1
- All tasks within the Polish phase marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch the US1 test task and prepare the e2e validation together:
Task: "Add integration test in backend/tests/integration/mcp-http.test.ts"
Task: "Start the MCP process and prepare curl/opencode validation per quickstart"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - the transport swap)
3. Complete Phase 3: User Story 1 (test + opencode connection)
4. **STOP and VALIDATE**: US1 independently (initialize + tools/list + connected)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → MCP speaks HTTP on `:3001`
2. Add User Story 1 → opencode connected → validate
3. Add User Story 2 → restart/reload flows → validate
4. Add User Story 3 → README + deployed docs → validate
5. Polish → gates + cleanup

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- MCP mode logs to **stderr** (HTTP mode has no stdout protocol constraint, but keep logs
  consistent); REST (`--http`) is untouched by this feature