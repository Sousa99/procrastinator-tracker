# Tasks: CI/CD Pipelines & Release Publishing

**Input**: Design documents from `/specs/004-ci-cd-pipelines/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: Optional — this feature is pipeline tooling; each user story ends with a Verify task.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app (pnpm workspace)**: `backend/`, `frontend/`; repository-level config at root; feature docs under `specs/004-ci-cd-pipelines/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create directory structure `.github/workflows/`, `deploy/`, `scripts/` per plan.md Project Structure
- [X] T002 [P] Add `esbuild` devDependency and `build` script (esbuild bundle `backend/src/index.ts` → `backend/dist/index.js` and `backend/scripts/migrate.ts` → `backend/dist/migrate.js`, ESM, `--packages=external`) in `backend/package.json`
- [X] T003 [P] Update `frontend/package.json`: remove `"private": true`, add `"repository": "https://github.com/Sousa99/procrastinator-tracker.git"` and `"publishConfig": { "registry": "https://npm.pkg.github.com/", "access": "restricted" }`
- [X] T004 [P] Add root devDependencies in `package.json`: `semantic-release`, `@semantic-release/changelog`, `@semantic-release/exec`, `@semantic-release/git` (commit-analyzer/release-notes-generator/npm/github ship with core)
- [X] T031 [P] Create `.dockerignore` at repo root (exclude node_modules, .git, build outputs, data, env) — Docker build context hygiene

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 [P] Create `backend/scripts/migrate.ts` — startup migration runner using `migrate()` from `drizzle-orm/better-sqlite3/migrator`; resolve the `drizzle/` folder relative to the bundle; use `DATABASE_URL`; add `scripts` to `backend/tsconfig.json` include
- [X] T006 [P] Create `deploy/nginx.spa.conf` — SPA-fallback server block (`try_files $uri $uri/ /index.html;`)
- [X] T007 Create `scripts/apply-release-version.mjs` — write `${nextRelease.version}` into `backend/package.json` and `frontend/package.json` (shared version sync)
- [X] T008 Checkpoint: `pnpm install` succeeds and `pnpm --filter backend build` emits `backend/dist/index.js` + `backend/dist/migrate.js`
- [X] T032 [P] Move `dotenv` from devDependencies to dependencies in `backend/package.json` (the prod bundle imports `dotenv/config` at runtime; dev deps are stripped from the image)
- [X] T033 [P] Update `eslint.config.mjs` — add `globals` devDependency and a `**/*.{js,mjs,cjs}` block with `globals.node` so Node scripts lint cleanly

**Checkpoint**: Foundation ready — user story implementation can begin.

---

## Phase 3: User Story 1 - Every PR is validated automatically before merge (Priority: P1) 🎯 MVP

**Goal**: Every pull request is gated by parallel quality checks that must pass before merge.

**Independent Test**: Open a PR with a deliberate lint error / failing test → `✅ check` fails and blocks merge; fix it → green.

### Implementation for User Story 1

- [X] T009 [US1] Create `.github/workflows/ci.yml` — `pull_request` trigger, `concurrency` cancel-in-progress, pnpm-store cache, parallel emoji-labeled jobs (🧹 Format, 🚨 Lint, 🔍 Typecheck, 🧪 Test, 🏗️ Build backend, 🖼️ Build SPA, 📦 Build library) with `::group::`/`::endgroup::` logs, plus a `✅ check` aggregator job (`needs:` all, no steps)
- [X] T010 [P] [US1] Add `🔬 actionlint` job to `.github/workflows/ci.yml` that lints `.github/workflows/*.yml`
- [X] T011 [US1] Verify US1: PR with deliberate lint/format/test failure is blocked; fixed PR is green (quickstart §2) — validated live on PR #2: all 9 checks green

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently.

---

## Phase 4: User Story 2 - Merging to main ships a full release automatically (Priority: P1)

**Goal**: Merging to `main` automatically versions the project and publishes the backend image, SPA image, and frontend npm package.

**Independent Test**: Merge a PR → release runs → backend image, SPA image, npm package appear at one version (quickstart §4–6).

### Implementation for User Story 2

- [X] T012 [US2] Create `.releaserc.json` — `branches: ["main"]`, default `conventionalcommits` parsing (no custom `parserOpts`), `releaseRules` (feat→minor, fix/perf/refactor→patch, breaking→major), plugin chain: commit-analyzer, release-notes-generator, changelog, exec `prepareCmd` (`scripts/apply-release-version.mjs ${nextRelease.version}`), npm (`pkgRoot: "frontend"`), git (commit `chore(release): ${nextRelease.version} [skip ci]`), exec `publishCmd` (`scripts/publish-artifacts.sh ${nextRelease.version}`), github
- [X] T013 [US2] Create `scripts/publish-artifacts.sh` — `docker buildx build --push` both images (`Dockerfile.backend`, `Dockerfile.frontend`) tagged `$1` and `latest`; `PLATFORMS` env (default `linux/amd64`)
- [X] T014 [US2] Create `Dockerfile.backend` — multi-stage: build (install + build tools → `pnpm --filter backend build` → `pnpm --filter backend deploy --prod --legacy /out`) → `node:24-slim` runtime with `dist/`, `drizzle/`, prod `node_modules`; `DATABASE_URL`; entrypoint `node dist/migrate.js && node dist/index.js --http`
- [X] T015 [US2] Create `Dockerfile.frontend` — multi-stage: build (install + build tools → `pnpm --filter frontend build`) → `nginx:alpine` with `frontend/dist-app` + `deploy/nginx.spa.conf`
- [X] T016 [US2] Create `.npmrc` — scope mapping `@procrastinator-tracker:registry=https://npm.pkg.github.com/` (no credentials committed)
- [X] T017 [US2] Create `.github/workflows/release.yml` — push to main + `workflow_dispatch`; `validate` job (format/lint/typecheck/test/builds) → `🚀 release` job (`needs: validate`, permissions `contents: write` + `packages: write`; setup pnpm+cache; `docker/setup-qemu-action`; `docker/setup-buildx-action`; `docker/login-action` ghcr via `GITHUB_TOKEN`; `NODE_AUTH_TOKEN=${{ secrets.GITHUB_TOKEN }}`; `pnpm exec semantic-release`)
- [X] T018 [US2] Verify US2: `pnpm exec semantic-release --dry-run` prints a version; both images build locally with runtime-only contents (quickstart §5); startup-migration smoke on fresh + existing volume (quickstart §6) — validated: config + dry-run OK; both images built, runtime-only contents verified, migrate+serve smoke green (fresh + no-op)

**Checkpoint**: Merges produce releases with all three artifacts.

---

## Phase 5: User Story 3 - Backend and frontend are always released in sync (Priority: P2)

**Goal**: All artifacts and both `package.json` files always carry the identical version.

**Independent Test**: After a release, the git tag, both image tags, npm version, and both `package.json` versions are equal (quickstart §4).

### Implementation for User Story 3

- [X] T019 [US3] Confirm synchronization wiring in `.releaserc.json`: exec `prepareCmd` writes one version to both `package.json` files and `@semantic-release/git` commits it back; npm publish + Docker tags all consume the single version — confirmed; hardened `apply-release-version.mjs` to also write root `package.json`
- [X] T020 [US3] Verify sync end-to-end: git tag, both GHCR image tags, npm package version, and both `package.json` versions are identical (quickstart §4) — local simulation (`9.9.9-test`) confirmed all 3 manifests match; full observable proof deferred to first real release on merge
- [X] T021 [P] [US3] Document the synchronization + idempotency contract in `contracts/release.md` — added "Version synchronization guarantee" (single source of truth, verification procedure, first release)

**Checkpoint**: At this point, User Stories 1, 2, and 3 should all work independently.

---

## Phase 6: User Story 4 - Contributors get clear, mechanical feedback on PR hygiene (Priority: P3)

**Goal**: Invalid PR titles/branches are rejected mechanically before review.

**Independent Test**: Bad title/branch fail `📝 PR format`; fixed ones pass (quickstart §1).

### Implementation for User Story 4

- [X] T022 [US4] Add `📝 PR format` job to `.github/workflows/ci.yml` — bash regex: title `^(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:\s*.+`; branch `^feature/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$`; exit 1 with the expected formats on mismatch; wired into the `✅ Check` aggregator `needs:`
- [X] T023 [US4] Verify PR format checks: invalid title/branch fail before review; valid pass (quickstart §1) — local regex sanity confirmed (incl. old `[PT-1]` format now failing); GitHub pass on PR #2 pending push
- [X] T024 [P] [US4] Document branch protection (single required check `✅ check` on `main`) in `contracts/ci.md` + `README.md` — added Branch protection + Pull requests sections

**Checkpoint**: User Story 4 independently functional.

---

## Phase 7: User Story 5 - Opening a PR is fun and self-explanatory (Priority: P2)

**Goal**: A guided, commented PR template makes filling out a PR easy.

**Independent Test**: A new PR shows the template with hidden guidance and an interactive checklist (quickstart §3).

### Implementation for User Story 5

- [X] T025 [US5] Create `.github/PULL_REQUEST_TEMPLATE.md` — title-format hint comment (`feat: Short summary`) + commented sections (🎯 What's this about? / 🧩 What changed? / ✅ How I verified / 📸 Proof optional) + guidance-only self-review checklist aligned with the quality gates
- [X] T026 [US5] Verify template renders on a new PR with guidance comments hidden and checkboxes interactive (quickstart §3) — structural validation done (5 sections, 5 balanced comment pairs, 2 checkboxes); live render check deferred to the next real PR (user side)

**Checkpoint**: User Story 5 independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T027 [P] Update `README.md` — CI/CD + release section (CI-enforced quality gates, release flow, PR title/branch format, PR template) — added "CI/CD & releases" + feature 004 in Documentation
- [X] T028 [P] Align `contracts/ci.md`, `contracts/release.md`, `contracts/pr-format.md` with the implemented workflows — aggregator "single trivial step", `[[:space:]]` regex, plugin publish order, live-render note
- [X] T029 Run the full `quickstart.md` validation end-to-end (PR gate, release, images, migrations, npm install) — §5/§6 re-validated locally (runtime-only images, migration fresh+no-op, SPA fallback); §3/§4/§7 marked deferred until first release
- [X] T030 Final gates: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all green — all pass (backend 39, frontend 25 tests)

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
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - Reuses the backend build from Setup/Foundational
- **User Story 3 (P2)**: Depends on User Story 2 (reuses its release config and scripts)
- **User Story 4 (P3)**: Depends on User Story 1 (adds a job to `ci.yml`)
- **User Story 5 (P2)**: No dependencies on other stories

### Within Each User Story

- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T002, T003, T004)
- All Foundational tasks marked [P] can run in parallel (T005, T006)
- Once Foundational phase completes, User Stories 1, 2, and 5 can start in parallel
- US2 file tasks (T012–T017) are distinct files and can be authored in parallel
- US3 (T019–T021) and US4 (T022–T024) can proceed in parallel after US2/US1 respectively
- Polish tasks marked [P] can run in parallel (T027, T028)

---

## Parallel Example: User Story 2

```bash
# Author the release artifacts together (distinct files):
Task: "Create .releaserc.json"                 # T012
Task: "Create scripts/publish-artifacts.sh"    # T013
Task: "Create Dockerfile.backend"              # T014
Task: "Create Dockerfile.frontend"             # T015
Task: "Create .npmrc"                          # T016
Task: "Create .github/workflows/release.yml"   # T017
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently (PR gate blocks bad PRs)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → PR validation gate (MVP!)
3. Add User Story 2 → Test independently → release publishing (also P1)
4. Add User Story 5 → Test independently → guided PR template
5. Add User Story 3 → Verify synchronized versions
6. Add User Story 4 → PR title/branch format checks
7. Polish (T027–T030) → docs + full quickstart validation
8. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend `dist/` is already gitignored (`.gitignore` line `dist/`)
- `.releaserc.json` exec `prepareCmd` references `scripts/apply-release-version.mjs` (created in Foundational, T007)