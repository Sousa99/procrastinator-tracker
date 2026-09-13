# Contract: CI Pipeline (PR validation)

Phase 1 output for `specs/004-ci-cd-pipelines`. Defines the pull-request validation workflow
(`.github/workflows/ci.yml`) that enforces the project quality gates and the PR format rules
before merge.

## Trigger

- `pull_request` (opened, reopened, synchronize, ready_for_review).
- `concurrency`: group by PR ref, `cancel-in-progress: true` (superseded runs are cancelled).

## Jobs (parallel, required)

Each job runs on `ubuntu-latest`, installs the workspace with the pnpm store cache, and is
independent — jobs run in parallel and each reports its own status (FR-016).

| Job | Command (root) | Gate |
|-----|----------------|------|
| 🧹 Format | `pnpm format` | Prettier check (constitution II) |
| 🚨 Lint | `pnpm lint` | ESLint (constitution III) |
| 🔍 Typecheck | `pnpm typecheck` | `tsc --noEmit` both packages |
| 🧪 Test | `pnpm test` | Vitest: backend + frontend |
| 🏗️ Build backend | `pnpm --filter backend build` | esbuild bundle (`dist/index.js`, `dist/migrate.js`) |
| 🖼️ Build SPA | `pnpm --filter frontend build` | `tsc --noEmit && vite build` → `dist-app/` |
| 📦 Build library | `pnpm --filter frontend build:lib` | library build → `dist-lib/` |
| 📝 PR format | bash regex (see below) | title + branch format (FR-002/FR-003) |
| 🔬 actionlint | `actionlint` on `.github/workflows/*.yml` | lints the pipeline itself |

## Aggregate required check

A final **`✅ check`** job has no steps and `needs:` every job above. Branch protection
requires only this single check (plus the format rule is enforced inside the pipeline), so
adding/removing jobs never requires re-editing branch protection.

## PR format rules (the `📝 PR format` job)

- **Title** MUST match:
  `^\[[A-Za-z]+-\d+\]\s*(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:\s*.+`
  - Ticket pattern `[A-Za-z]+-\d+` (e.g. `[PT-003]`), conventional type (scope optional),
    `: `, non-empty subject.
- **Branch** MUST match:
  `^feature/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$`
  (three-digit feature number + kebab-case description).
- On failure the job logs the expected format and exits non-zero (fails before review).
- Ticket prefix pattern is kept in one regex constant so it can be tightened per project.

## Conventions (FR-016)

- Job and step names are emoji-labeled (`🧹 Format`, `🚨 Lint`, `🔍 Typecheck`, `🧪 Test`,
  `🏗️ Build backend`, `🖼️ Build SPA`, `📦 Build library`, `📝 PR format`, `🔬 actionlint`,
  `✅ check`).
- Steps use `::group::`/`::endgroup::` around the long commands so logs are collapsible.
- pnpm store is cached across jobs (`pnpm/action-setup` + `actions/setup-node` cache) to keep
  installs fast.

## Success criteria this contract serves

- SC-001 (gates before merge), SC-003 (invalid PRs rejected automatically, aggregate check),
  SC-007 (parallel checks), FR-001/FR-002/FR-003/FR-016.

## References

- Spec: [spec.md](../spec.md) (FR-001, FR-002, FR-003, FR-016)
- Format details: [pr-format.md](pr-format.md)
- Data model: [data-model.md](../data-model.md)