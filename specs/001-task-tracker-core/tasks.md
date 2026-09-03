# Tasks: Task Tracker Core

**Input**: Design documents from `/specs/001-task-tracker-core/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Test tasks ARE included. The constitution mandates quality gates ("Formatting,
linting, and tests MUST pass before any commit or merge") and research.md locks vitest;
each user story therefore writes its tests first (fail-then-implement).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/` (pnpm workspace per plan.md)
- Tests: `backend/tests/`, `frontend/tests/`
- Endpoint docs: `backend/http/` (REST Client) + contracts in `contracts/http/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create pnpm workspace root with `package.json` (private, workspaces), `pnpm-workspace.yaml` (backend, frontend), `.gitignore` (node_modules, dist, data/, *.db), and `.env.example`
- [ ] T002 Scaffold `backend/` package: `package.json` (type: module, scripts start/start:mcp/db:generate/db:migrate/test), `tsconfig.json` (extends ../tsconfig.base.json), `src/`, `http/`, `tests/`, `.env`
- [ ] T003 Scaffold `frontend/` package: `package.json` (scripts dev/build/test), `tsconfig.json`, `vite.config.ts`, `index.html`, `src/`, `tests/`
- [ ] T004 Create root `prettier.config.mjs` (single formatter config for the whole workspace)
- [ ] T005 Create root `eslint.config.mjs` (flat config, recommended defaults for TypeScript; document any rule exception inline)
- [ ] T006 Create root `tsconfig.base.json` with shared strict TypeScript settings for backend and frontend
- [ ] T007 Create `vitest.config.ts` for backend (environment: node) and `vitest.config.ts` for frontend (environment: jsdom) in `backend/` and `frontend/`
- [ ] T008 Add root `package.json` scripts: `dev` (concurrently REST + frontend + optional MCP), `lint`, `format`, `test`, `db:generate`, `db:migrate`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Define the full Drizzle schema for all entities in `backend/src/db/schema.ts`: Task, User, Tag, TaskAssignee, TaskTag, RecurrenceRule, Comment, Status enum (per data-model.md, portable types)
- [ ] T010 Create `backend/drizzle.config.ts` (dialect sqlite, schema path, out `./drizzle`) and generate the initial migration with `drizzle-kit generate` into `backend/drizzle/`
- [ ] T011 Implement the database client in `backend/src/db/client.ts` using better-sqlite3 with `PRAGMA journal_mode = WAL`, reading the DB path from env
- [ ] T012 Create the status enum and transition matrix in `backend/src/domain/status.ts` (to-start→started→in-progress→validating→finished, on-hold, reopen; per data-model.md), exporting an `isValidTransition` helper
- [ ] T013 Create the base OpenAPIHono app in `backend/src/app.ts`: JSON error handler (`{error:{code,message}}`), CORS for the frontend, `/health` route
- [ ] T014 Serve the OpenAPI document at `/doc` via `app.doc()` and Swagger UI at `/ui` via `@hono/swagger-ui` in `backend/src/app.ts`
- [ ] T015 Implement the dual-mode entry point in `backend/src/index.ts`: `--http` starts the Hono server, `--mcp` starts the MCP server over stdio (per research.md, shared services/db layer)
- [ ] T016 Initialize the frontend shell in `frontend/`: Vite + React + TypeScript, Tailwind CSS, and shadcn/ui primitives installed and configured
- [ ] T017 Set up React Router with a root layout, routes for `/` (dashboard) and `/tasks/:id` (detail) in `frontend/src/App.tsx`
- [ ] T018 Generate the typed API client from the backend OpenAPI doc with `openapi-typescript` into `frontend/src/api/client.ts` (contract source of truth per plan.md)
- [ ] T019 Set up TanStack Query `QueryClientProvider` and a base typed fetch helper in `frontend/src/api/`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create and progress tasks through statuses (Priority: P1) 🎯 MVP

**Goal**: Create a task and move it through the full status lifecycle (`to-start` → `started` → `in-progress` → `on-hold` → `validating` → `finished`), persisted and visible.

**Independent Test**: Create a task via the REST API (or REST Client file), progress it through every status in order, confirm each change is visible in `GET /api/tasks` and that an invalid transition (e.g. `started → finished`) returns 409.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T020 [P] [US1] Unit test for the status transition matrix (all valid edges + invalid edges rejected) in `backend/tests/unit/status.test.ts`
- [ ] T021 [P] [US1] Integration test for task lifecycle (create → status changes → get) against an in-memory SQLite DB via the Hono app in `backend/tests/integration/tasks.test.ts`

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement the task service (create, list, get, update, delete) in `backend/src/services/tasks.ts` using Drizzle queries
- [ ] T023 [US1] Implement status transitions in `backend/src/services/tasks.ts` using the transition matrix from `backend/src/domain/status.ts` (invalid → conflict error)
- [ ] T024 [US1] Implement task endpoints in `backend/src/routes/tasks.ts`: `POST /api/tasks`, `GET /api/tasks`, `GET /api/tasks/{id}`, `PATCH /api/tasks/{id}`, `DELETE /api/tasks/{id}`, `POST /api/tasks/{id}/status` (zod-validated, wired into OpenAPI)
- [ ] T025 [US1] Add runnable REST Client examples for the task lifecycle in `backend/http/tasks.http` (create, list, get, status, invalid-transition → 409)
- [ ] T026 [P] [US1] Build the task creation form in `frontend/src/components/task/TaskCreateForm.tsx` (title required, description optional)
- [ ] T027 [US1] Build status controls (progress buttons per allowed transition, reopen on finished) in `frontend/src/components/task/StatusControls.tsx`
- [ ] T028 [US1] Wire task mutations and queries with TanStack Query hooks (create, update status, invalidation) in `frontend/src/api/tasks.ts`
- [ ] T029 [P] [US1] Implement MCP tools `task.create`, `task.list`, `task.get`, `task.set_status`, `task.delete` in `backend/src/adapters/mcp.ts` (reuse task service; zod input schemas)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - See tasks at a glance and filter by tags (Priority: P1)

**Goal**: View active tasks first in a light dashboard and narrow the list by flat tags and status.

**Independent Test**: Create tasks across statuses with tags, then confirm the dashboard filters to a single tag+status combination and that finished tasks are separated.

### Tests for User Story 2

- [ ] T030 [P] [US2] Integration test for tag creation (case-insensitive dedupe → 409) and task list filtering by tag/status/finished in `backend/tests/integration/tasks.test.ts`

### Implementation for User Story 2

- [ ] T031 [P] [US2] Implement tag service and endpoints (`GET/POST /api/tags`) in `backend/src/services/tags.ts` and `backend/src/routes/tags.ts`
- [ ] T032 [US2] Extend `GET /api/tasks` with filters (`status`, `tag`, `finished`, `location`, `urgency`) and sorting (active first, urgency desc, createdAt) in `backend/src/routes/tasks.ts`
- [ ] T033 [P] [US2] Build the dashboard page (active tasks first, finished separated) in `frontend/src/pages/DashboardPage.tsx`
- [ ] T034 [P] [US2] Build the filter bar (status + tag multi-select) in `frontend/src/components/task/TaskFilters.tsx`
- [ ] T035 [US2] Add list query hooks with filter state and cache invalidation in `frontend/src/api/tasks.ts`
- [ ] T036 [US2] Extend MCP `task.list` with filters and add `tag.list` tool in `backend/src/adapters/mcp.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Assign users, locations, and urgency (Priority: P2)

**Goal**: Assign lightweight local users to tasks, set an optional location and urgency (1-5), and surface them on tasks.

**Independent Test**: Create a user, assign them to a task, set a location and urgency, and confirm all three appear on the task in both the API and the UI.

### Tests for User Story 3

- [ ] T037 [P] [US3] Integration test for user creation (unique name → 409), assignment, and location/urgency validation (1-5) in `backend/tests/integration/tasks.test.ts`

### Implementation for User Story 3

- [ ] T038 [P] [US3] Implement user service and endpoints (`GET/POST/DELETE /api/users`) in `backend/src/services/users.ts` and `backend/src/routes/users.ts`
- [ ] T039 [US3] Extend task create/update with `location`, `urgency` (1-5 validation), and `assigneeIds` in `backend/src/services/tasks.ts` (via TaskAssignee join)
- [ ] T040 [P] [US3] Build the assignee picker (user list + toggle) in `frontend/src/components/task/TaskAssignees.tsx`
- [ ] T041 [P] [US3] Add location + urgency fields (1-5 selector, unset allowed) to the task form in `frontend/src/components/task/TaskCreateForm.tsx`
- [ ] T042 [US3] Extend MCP with `task.update` (location/urgency/assignees) and `user.list` tools in `backend/src/adapters/mcp.ts`

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should work independently

---

## Phase 6: User Story 4 - Recurring tasks (Priority: P2)

**Goal**: Mark a task as recurring (daily/weekly/monthly) so finishing an instance auto-generates the next, with overdue catch-up.

**Independent Test**: Create a daily recurring task, finish it, and confirm a new instance for the next day appears with the same tags/assignees and no duplicates on refresh.

### Tests for User Story 4

- [ ] T043 [P] [US4] Unit test for recurrence instance computation (next-occurrence from anchor + interval, catch-up, no duplicates) in `backend/tests/unit/recurrence.test.ts`

### Implementation for User Story 4

- [ ] T044 [P] [US4] Implement the recurrence service (generation on completion + catch-up sweep on read, unique key parentTaskId+dueDate) in `backend/src/services/recurrence.ts` (uses RecurrenceRule from schema)
- [ ] T045 [US4] Wire recurrence into task create/update and add `recurring=true` + instance support to `GET /api/tasks` in `backend/src/routes/tasks.ts`
- [ ] T046 [P] [US4] Add recurrence fields (frequency + interval) to the task form in `frontend/src/components/task/TaskCreateForm.tsx`
- [ ] T047 [US4] Extend MCP `task.create`/`task.update` input schemas with `recurrence` in `backend/src/adapters/mcp.ts`

**Checkpoint**: At this point, User Stories 1-4 should work independently

---

## Phase 7: User Story 5 - Comments and notes on statuses (Priority: P3)

**Goal**: Attach comments to tasks (especially on-hold/validating), stored with the status context and shown chronologically.

**Independent Test**: Add a comment to an on-hold task and a note to a validating task, then confirm both are readable in the task detail in chronological order.

### Tests for User Story 5

- [ ] T048 [P] [US5] Integration test for comment creation (non-empty body, status context captured) and chronological retrieval in `backend/tests/integration/tasks.test.ts`

### Implementation for User Story 5

- [ ] T049 [P] [US5] Implement comment service and endpoint (`POST /api/tasks/{id}/comments`, comments on `GET /api/tasks/{id}`) in `backend/src/services/comments.ts` and `backend/src/routes/tasks.ts`
- [ ] T050 [US5] Build the comment list + add form (chronological, shows status context) in `frontend/src/components/task/TaskComments.tsx`
- [ ] T051 [US5] Add MCP `task.comment` tool in `backend/src/adapters/mcp.ts`

**Checkpoint**: At this point, User Stories 1-5 should work independently

---

## Phase 8: User Story 6 - Use the tracker through the web app (Priority: P3)

**Goal**: A complete, light-mood SPA where all core interactions work end-to-end and the display compels task progress.

**Independent Test**: Perform all core interactions in the browser (create task, progress status, filter, assign, comment) and confirm consistent behavior with the API on refresh.

### Tests for User Story 6

- [ ] T052 [P] [US6] Component test for the dashboard (active-first ordering, filter bar) in `frontend/tests/dashboard.test.tsx`
- [ ] T053 [P] [US6] Component test for the task detail page (status controls, comments) in `frontend/tests/task-detail.test.tsx`

### Implementation for User Story 6

- [ ] T054 [US6] Build the task detail page (fields, status controls, assignees, comments) in `frontend/src/pages/TaskDetailPage.tsx`
- [ ] T055 [US6] Apply the light-mood visual theme: clear empty states, next-up emphasis, and motivating nudges for to-start tasks across `frontend/src/components/`

**Checkpoint**: All user stories should now be independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T056 [P] Write `README.md` at repository root with setup, run modes (REST/Swagger, MCP, both), and quality-gate commands (per quickstart.md)
- [ ] T057 [P] Finalize `backend/http/*.http` files (users-tags flows) and verify Swagger UI at `/ui` renders all endpoints
- [ ] T058 Run the full quickstart.md validation end-to-end (REST lifecycle, MCP, recurrence, frontend) and fix any failures
- [ ] T059 Run final `pnpm lint`, `pnpm format`, and `pnpm test`; confirm all gates pass and OpenAPI types in `frontend/src/api/client.ts` are regenerated in sync
- [ ] T060 Cleanup: remove dead code, verify no unused dependencies, and confirm constitution compliance (one formatter, one linter, minimal deps)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2→P1)**: Can start after Foundational (Phase 2) - May reuse task service/endpoints from US1 but independently testable
- **User Story 3 (P2)**: Can start after Foundational (Phase 2) - Extends task service from US1; independently testable
- **User Story 4 (P2)**: Can start after Foundational (Phase 2) - Depends on task service (US1); independently testable
- **User Story 5 (P3)**: Can start after Foundational (Phase 2) - Depends on task detail; independently testable
- **User Story 6 (P3)**: Depends on US1-US5 frontend pieces being present; final integration increment

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/schema before services
- Services before endpoints
- Backend endpoints before frontend wiring
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models/services within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Unit test for the status transition matrix in backend/tests/unit/status.test.ts"
Task: "Integration test for task lifecycle in backend/tests/integration/tasks.test.ts"

# Launch all independent implementation tasks together:
Task: "Implement the task service in backend/src/services/tasks.ts"
Task: "Build the task creation form in frontend/src/components/task/TaskCreateForm.tsx"
Task: "Implement MCP task tools in backend/src/adapters/mcp.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (T020, T021 green; REST Client flow works)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Add User Story 5 → Test independently → Deploy/Demo
7. Add User Story 6 → Test independently → Deploy/Demo
8. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
   - Developer D: User Story 4
   - Developer E: User Story 5
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Dual-mode backend (`--http`/`--mcp`) means REST and MCP tasks touch the same service layer; keep tool additions story-local in `backend/src/adapters/mcp.ts`