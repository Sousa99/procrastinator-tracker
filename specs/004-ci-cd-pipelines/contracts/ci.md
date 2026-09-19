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
| 🏗️ Build backend | `pnpm --filter ./backend build` | esbuild bundle (`dist/index.js`, `dist/migrate.js`) |
| 🖼️ Build SPA | `pnpm --filter ./frontend build` | `tsc --noEmit && vite build` → `dist-app/` |
| 📦 Build library | `pnpm --filter ./frontend build:lib` | library build → `dist-lib/` |
| 📝 PR format | bash regex (see below) | title + branch format (FR-002/FR-003) |
| 🔬 actionlint | `actionlint` on `.github/workflows/*.yml` | lints the pipeline itself |

## Aggregate required check

A final **`✅ check`** job `needs:` every job above and runs a single trivial confirmation
step (`echo "All required checks passed."`). Branch protection requires only this one check
(plus the format rule is enforced inside the pipeline), so adding/removing jobs never
requires re-editing branch protection.

## PR format rules (the `📝 PR format` job)

- **Title** MUST match:
  `^(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:[[:space:]]+.+`
  (conventional commit: type (scope optional), `: `, non-empty subject).
- **Branch** MUST match:
  `^(feature|fix)/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$`
  (three-digit feature number + kebab-case description; `feature/…` for features,
  `fix/…` for fixes).
- On failure the job logs the expected format and exits non-zero (fails before review).

## Conventions (FR-016)

- Job and step names are emoji-labeled (`🧹 Format`, `🚨 Lint`, `🔍 Typecheck`, `🧪 Test`,
  `🏗️ Build backend`, `🖼️ Build SPA`, `📦 Build library`, `📝 PR format`, `🔬 actionlint`,
  `✅ check`).
- Steps use `::group::`/`::endgroup::` around the long commands so logs are collapsible.
- pnpm store is cached across jobs (`pnpm/action-setup` + `actions/setup-node` cache) to keep
  installs fast.
- Workflow files use blank lines between jobs and between steps for readability; workflow YAML
  is excluded from Prettier (`.prettierignore`) and linted by the `🔬 actionlint` job instead.

## Branch protection

To enforce the gate on `main`, configure a branch protection rule in the repo settings
(Settings → Branches):

- **Branch name pattern**: `main`.
- **Require status checks to pass before merging**: require the **`✅ Check`** check — the
  single aggregator that `needs:` all jobs (including `📝 PR format`). Optionally also enable
  **Require branches to be up to date before merging** so CI re-runs after `main` moves.
- **Require a pull request before merging** (recommended): nothing lands on `main` except via
  a PR that has passed the checks.

The `📝 PR format` job enforces the title/branch formats mechanically, so review effort is
never spent on formatting.

## Success criteria this contract serves

- SC-001 (gates before merge), SC-003 (invalid PRs rejected automatically, aggregate check),
  SC-007 (parallel checks), FR-001/FR-002/FR-003/FR-016.

## References

- Spec: [spec.md](../spec.md) (FR-001, FR-002, FR-003, FR-016)
- Format details: [pr-format.md](pr-format.md)
- Data model: [data-model.md](../data-model.md)