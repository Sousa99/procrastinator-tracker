# Quickstart: CI/CD Pipelines & Release Publishing

Runnable validation guide for feature 004. Proves the PR validation gate, the release
publishing of all three synchronized artifacts, the multi-stage images, and the startup
migrations. See [contracts/ci.md](contracts/ci.md), [contracts/release.md](contracts/release.md),
and [contracts/pr-format.md](contracts/pr-format.md) for the contracts referenced here.

## Prerequisites

- pnpm 11, Node >= 24 (workspace root), `pnpm install` at repo root.
- Git remote `origin` → `github.com/Sousa99/procrastinator-tracker` with a `main` branch.
- For the release scenarios: a `GITHUB_TOKEN` (or the workflow's own token) with `contents:
  write` and `packages: write`.
- Docker (for image build/smoke scenarios).

## 1. PR title & branch format checks (SC-003)

Open PRs against `main` and observe the `📝 PR format` check in `ci.yml`:

- Push a branch named `test-branch` and open a PR titled `some random title` →
  **check fails** and logs the expected formats.
- Rename the branch to `feature/004-ci-cd-pipelines` and retitle the PR to
  `feat: Add CI/CD pipelines` → **check passes**.

**Expected**: invalid titles/branches are rejected mechanically before review; valid ones pass.

## 2. PR validation gate (SC-001/SC-003)

On a conforming PR, verify the parallel checks run and the `✅ check` aggregator passes:
format, lint, typecheck, tests, backend build, SPA build, library build, actionlint, PR
format. Introduce a deliberate lint error or a failing test and confirm the aggregate check
fails and blocks merge.

**Expected**: all gates run in parallel with emoji-labeled job/step names (FR-016); the single
`✅ check` is the one required status check.

## 3. PR template renders (SC-006)

Open a new PR — the body is pre-filled by `.github/PULL_REQUEST_TEMPLATE.md`: a title-format
hint at the top, sections (Summary / Ticket / Changes / How I verified / Proof) each with
hidden `<!-- … -->` guidance, and a guidance-only self-review checklist.

**Expected**: guidance comments are invisible once rendered; the checklist is not enforced as a
merge gate.

## 4. Merge → release → three synchronized artifacts (SC-001/SC-002/SC-004)

Merge the PR to `main`. The `release.yml` workflow runs `validate` then `🚀 release`
(semantic-release). Then verify:

```bash
# version produced by the release (semantic-release starts at 1.0.0)
# inspect the git tag:
git ls-remote --tags origin 'v*'

# backend + SPA images on GHCR:
gh api /user/packages/container/procrastinator-tracker-backend/versions --paginate
gh api /user/packages/container/procrastinator-tracker-frontend/versions --paginate

# npm package on GitHub Packages:
npm view @procrastinator-tracker/frontend versions --registry=https://npm.pkg.github.com/
```

**Expected**: one tag `vX.Y.Z`; both images published at `X.Y.Z` (and `latest`); the npm
package published at `X.Y.Z` — **all three identical** (FR-008). Release notes generated
(SC-004). `main` has a `chore(release): X.Y.Z [skip ci]` commit bumping both `package.json`s.

## 5. Multi-stage images ship runtime only (SC-005/SC-007)

```bash
docker build -f Dockerfile.backend -t backend-test .
docker build -f Dockerfile.frontend -t frontend-test .
docker history backend-test   # confirm final layer is node:24-slim, no dev tooling
docker run --rm backend-test sh -c 'ls /app/dist && ls /app/drizzle && ! test -d /app/backend/src'
docker run --rm frontend-test sh -c 'ls /usr/share/nginx/html'
```

**Expected**: the backend image contains `dist/`, `drizzle/`, prod `node_modules` — and no
`src/` or dev dependencies (FR-015); the frontend image serves the static SPA.

## 6. Startup migrations run automatically (SC-008, FR-017)

```bash
# fresh volume → full migration on first start
docker run --rm -e DATABASE_URL=/data/procrastinator.db \
  -v tmp-data:/data -p 3000:3000 backend-test

# existing volume with the same image → restart is a no-op (no pending migrations)
docker run --rm -e DATABASE_URL=/data/procrastinator.db \
  -v tmp-data:/data -p 3000:3000 backend-test

# smoke: REST is up and tasks endpoint responds
curl -s localhost:3000/doc | head
```

**Expected**: the first start creates the schema (tables present via `sqlite3 /data/...`),
the second start applies nothing (idempotent), and the API serves (no manual migration step
remotely).

## 7. npm package installs from GitHub Packages (SC-005)

In a scratch project authenticated to GitHub Packages (`@procrastinator-tracker:registry=…`,
`//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}`):

```bash
npm install @procrastinator-tracker/frontend@X.Y.Z
# and in a React 19 app:
#   import { TaskDeckWrapper } from '@procrastinator-tracker/frontend';
#   import '@procrastinator-tracker/frontend/styles.css';
```

**Expected**: the published version installs and the wrapper imports (peer deps supplied by
the consumer).

## Gate: full quality checks (pre-merge)

```bash
pnpm format        # prettier --check
pnpm lint          # eslint (workflows validated by actionlint in CI)
pnpm typecheck
pnpm test
```

**Expected**: all green.

## References

- PR validation workflow: [contracts/ci.md](contracts/ci.md)
- Release + publish contract: [contracts/release.md](contracts/release.md)
- PR format + template contract: [contracts/pr-format.md](contracts/pr-format.md)
- Entity/model details: [data-model.md](data-model.md)
- Design decisions: [research.md](research.md)