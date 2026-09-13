# Implementation Plan: CI/CD Pipelines & Release Publishing

**Branch**: `feature/004-ci-cd-pipelines` | **Date**: 2026-09-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-ci-cd-pipelines/spec.md`

## Summary

Add a complete CI/CD + release pipeline to the pnpm workspace monorepo. **PRs are validated
(CI)** by parallel, emoji-labeled checks (format, lint, typecheck, tests, backend build, SPA
build, library build, PR title/branch format, actionlint) that must pass before merge.
**Merging to `main` triggers a release (CD)**: a single semantic-release run derives one
shared version from the conventional-commit history, then publishes all three
artifacts — the backend Docker image, the frontend SPA Docker image (both to GHCR via
multi-stage builds) and the frontend npm package (to GitHub Packages) — all carrying the
identical version. The backend image runs database migrations automatically and idempotently
at container startup (no manual remote migration step). A fun, guided PR template
(`feat: <subject>`) makes opening a PR self-explanatory.

Primary requirement: enforce quality gates mechanically on PRs; publish three synchronized
artifacts on merge to main; validate PR title/branch format; add a guided PR template.

## Technical Context

**Language/Version**: TypeScript / Node 24 LTS, pnpm 11 (unchanged); GitHub Actions workflow
YAML; Docker; shell for small orchestration scripts.

**Primary Dependencies**:
- Added (root, dev): `semantic-release` + official plugins `@semantic-release/changelog`,
  `@semantic-release/exec`, `@semantic-release/git`, `@semantic-release/github` (the
  `commit-analyzer`, `release-notes-generator`, and `npm` plugins ship with `semantic-release`).
- Added (backend, dev): `esbuild` (production bundle — already a transitive dep of tsx/vite;
  made explicit).
- Runtime additions: none for the app. Images use `node:24-slim` (backend runtime; better-sqlite3
  prebuilds) and `nginx:alpine` (SPA static server). Migrations use the already-present
  `drizzle-orm` (runtime) `migrate()` — no drizzle-kit in the image.
- Official GitHub Actions: `actions/checkout`, `actions/setup-node`, `pnpm/action-setup`,
  `docker/setup-qemu-action`, `docker/setup-buildx-action`, `docker/login-action`.

**Storage**: Unchanged — SQLite via `DATABASE_URL` (default `./data/procrastinator.db`). The
backend image mounts a data volume; `backend/drizzle/` (SQL + meta) is copied into the image
so startup migrations can run.

**Testing**: Existing Vitest suites unchanged. New validation: PR format checks (workflow),
actionlint on workflows, startup-migration smoke test (fresh + existing volume) documented in
quickstart, and a release-sync verification (all three artifacts at one version).

**Target Platform**: GitHub Actions (ubuntu-latest) → Docker images `linux/amd64` (arm64 as
a toggle) + npm package → GHCR / GitHub Packages (`npm.pkg.github.com`).

**Project Type**: pnpm workspace monorepo (backend + frontend) with CI/CD + release
automation.

**Performance Goals**: Parallel PR checks with pnpm-store caching; Docker layer caching in the
release build; no duplicated full installs across jobs.

**Constraints**: Multi-stage Docker images (published stage = runtime only, per FR-015);
parallel, emoji-labeled pipeline output (FR-016); single shared version across all artifacts
(FR-008); PR title/branch format enforced (FR-002/003); migrations auto-run at container
startup (FR-017); personal-project scope — no gold-plating, official plugins/actions only.

**Scale/Scope**: Single repo, personal project; two workflows; three published artifacts; one
PR template; one release config.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Verdict | Justification |
|------|---------|---------------|
| I. Pragmatic Code Quality | PASS | Standard official actions/plugins; esbuild bundle is the boring, minimal way to get a real backend build; two small scripts (version apply, publish). No gold-plating. |
| II. Automated Formatting | PASS | Prettier remains the single formatter for code; workflow/config YAML is hand-formatted consistently (YAML is outside Prettier's default scope; noted — no new formatter introduced). |
| III. Automated Linting | PASS | Existing ESLint untouched; optional `actionlint` step validates the workflows themselves (the "lint for the pipeline"), keeping automation self-checking. |
| IV. Testable & Maintainable | PASS | Config + tiny scripts; each artifact builds from a multi-stage Dockerfile; contracts document the interfaces; esbuild emits a single `dist/index.js` per entry. |
| V. Living Documentation | PASS | README quality-gates/release section, quickstart, contracts (`ci`, `release`, `pr-format`), research, plan, spec all updated in the same change. |
| Additional Constraints (Practicality) | PASS | Official plugins over bespoke scripts; bash regex (no third-party action) for PR/branch format; single semantic-release run keeps tooling minimal. |
| Workflow & Quality Gates | PASS | CI enforces lint/format/typecheck/tests/builds before merge; release re-runs the gates before publishing. |

**Complexity Tracking**: No constitution violations. `esbuild` is already in the dependency
graph (transitive via tsx/vite) and is promoted to an explicit devDependency for the backend
production bundle — the minimal way to satisfy FR-011/FR-015. No new runtime app deps.

**Re-check after Phase 1 design**: PASS. The delivered design (research.md, data-model.md,
contracts/ci.md, contracts/release.md, contracts/pr-format.md, quickstart.md) introduces no
new app complexity: it is repository-level tooling (workflows, Dockerfiles, one release
config, two small scripts). Images are multi-stage, migrations run via the already-present
`drizzle-orm` runtime migrator, and version sync uses one semantic-release run with official
plugins. All gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/004-ci-cd-pipelines/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   ├── ci.md            # Phase 1: PR validation workflow contract
│   ├── release.md       # Phase 1: semantic-release + publish contract
│   └── pr-format.md     # Phase 1: PR title/branch format + PR template contract
├── spec.md              # Feature specification
├── checklists/          # Spec-quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code & Config (repository root)

```text
.github/
├── workflows/
│   ├── ci.yml                # NEW: PR validation (parallel, emoji-labeled jobs)
│   └── release.yml           # NEW: on push to main — validate → semantic-release → publish
└── PULL_REQUEST_TEMPLATE.md  # NEW: fun, guided template (title format + commented sections)

.releaserc.json               # NEW: semantic-release config (parser, exec version sync, publish)
Dockerfile.backend            # NEW: multi-stage (build + esbuild bundle + deploy -> node:24-slim runtime)
Dockerfile.frontend           # NEW: multi-stage (build SPA -> nginx:alpine runtime)
deploy/nginx.spa.conf         # NEW: SPA fallback nginx server block
scripts/
├── apply-release-version.mjs # NEW: write nextRelease.version to backend/frontend package.json
└── publish-artifacts.sh      # NEW: docker buildx build+push both images tagged $VERSION + latest

backend/
├── scripts/migrate.ts        # NEW: startup migration runner (drizzle-orm migrator, idempotent)
├── package.json              # MODIFY: add "build" (esbuild), devDep esbuild
└── dist/                     # NEW build output (gitignored)

frontend/
└── package.json              # MODIFY: drop "private", add publishConfig.registry + repository field

package.json                  # MODIFY: root devDeps (semantic-release + plugins)
README.md                     # MODIFY: quality gates + release section
.gitignore                    # MODIFY: add backend/dist/ (if not covered)
```

Build outputs (existing): SPA app → `frontend/dist-app/`, library → `frontend/dist-lib/`; new:
backend bundle → `backend/dist/`.

**Structure Decision**: All pipeline config lives at the repository root (workflows, release
config, Dockerfiles) because the build context for both images is the pnpm workspace root. The
startup migration runner lives inside `backend/scripts/` since it is backend code, bundled
alongside `src/index.ts` by the backend `build` script. Consistent with the existing
"config at root, code in packages" layout.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify (see Constitution Check).

## Phase 0: Research (research.md)

Resolve the integration specifics (full decisions in `research.md`):

- **Backend production build**: esbuild bundle (`src/index.ts` → `dist/index.js`, ESM,
  `--packages=external`) + a second entry for `scripts/migrate.ts` → `dist/migrate.js`.
  `tsc` emit is not viable for the repo's extensionless ESM imports.
- **Multi-stage Docker images**: backend (build: install → `pnpm --filter backend build` →
  `pnpm --filter backend deploy --prod /out`; runtime: `node:24-slim` + `dist/` +
  `drizzle/` + entrypoint `node dist/migrate.js && node dist/index.js --http`); frontend
  (build: install → `pnpm --filter frontend build`; runtime: `nginx:alpine` + `dist-app` +
  SPA-fallback conf).
- **Single shared version**: one semantic-release run at root; `@semantic-release/exec`
  `prepareCmd` writes the version into both package.json files; `@semantic-release/git`
  commits the bump + changelog; `@semantic-release/npm` (`pkgRoot: frontend`) publishes the
  npm package; `@semantic-release/exec` `publishCmd` builds+pushes both Docker images.
- **Commit parsing**: default `conventionalcommits` parsing (no custom `parserOpts`); PR
  titles are plain conventional commits (`feat` → minor, `fix` → patch,
  `BREAKING CHANGE` → major).
- **GitHub Packages npm**: scope `@procrastinator-tracker` + `repository` field (GitHub
  matches the repo by URL); `GITHUB_TOKEN` auth; first release will be `1.0.0`.
- **PR/branch format**: bash regex in a `pr-format` job; title
  `^(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:\s*.+`, branch
  `^feature/\d{3}-[a-z0-9]+(-[a-z0-9]+)*$`.
- **Startup migrations**: `drizzle-orm` runtime `migrate()`; idempotent; no drizzle-kit in
  the image; `DATABASE_URL` env + volume mount.

## Phase 1: Design (data-model.md, contracts/, quickstart.md)

- **data-model.md**: The **Release** entity (shared `version`, git tag `vX.Y.Z`, notes) and
  its three artifacts — **Backend Image**, **SPA Image**, **Frontend Package** — with registry
  URIs, tag/version rules, and the PR → validated → merged → released → published lifecycle.
- **contracts/ci.md**: CI workflow contract — triggers, parallel jobs, gates, the single
  aggregate required check, emoji/step conventions, concurrency + caching.
- **contracts/release.md**: Release workflow contract — semantic-release plugin chain/order,
  parser regex, version-sync mechanism, artifact names/tags, registry auth + permissions,
  first-release behavior, startup-migration contract.
- **contracts/pr-format.md**: PR title regex, branch regex, and the PR template structure
  with its guidance-only checklist.
- **quickstart.md**: Runnable scenarios — PR format pass/fail; merge → three artifacts at one
  version (verified via `gh api` / `npm view`); local backend build + docker builds; image
  smoke-runs incl. startup migration on fresh vs existing volume; npm package install.