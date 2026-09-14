# Contract: Release & Publishing (CD)

Phase 1 output for `specs/004-ci-cd-pipelines`. Defines the merge-to-main release workflow
(`.github/workflows/release.yml`), the semantic-release configuration
(`.releaserc.json`), the shared-version mechanism, and the three published artifacts.

## Trigger

- `push` to `main` (the source of every release — spec Q1-A).
- `workflow_dispatch` for manual re-runs.

## Jobs

1. **`validate`** — re-runs the quality gates (format, lint, typecheck, test, builds) on the
   merged state. A failing gate blocks the release (FR-010).
2. **`🚀 release`** — `needs: validate`; permissions `contents: write`, `packages: write`.
   Steps: checkout → setup pnpm + cache → `docker/setup-qemu-action` +
   `docker/setup-buildx-action` → `docker/login-action` to `ghcr.io` with `GITHUB_TOKEN` →
   `pnpm exec semantic-release`.

## Semantic-release config (`.releaserc.json`)

- `branches`: `["main"]`.
- **Commit parsing**: the default `conventionalcommits` preset — no custom `parserOpts`. PR
  titles are plain conventional commits, so the default commit-analyzer / release-notes-
  generator classify the release.
- `releaseRules`: `feat` → minor, `fix`/`perf`/`refactor` → patch, `BREAKING CHANGE` → major.

### Plugin chain (order matters)

| Step | Plugin | Effect |
|------|--------|--------|
| analyze | `@semantic-release/commit-analyzer` | compute next version from history |
| notes | `@semantic-release/release-notes-generator` | generate release notes |
| prepare (changelog) | `@semantic-release/changelog` | write/update `CHANGELOG.md` |
| prepare (version) | `@semantic-release/exec` `prepareCmd` | `node scripts/apply-release-version.mjs ${nextRelease.version}` → writes the version into `backend/package.json` and `frontend/package.json` |
| prepare (npm) | `@semantic-release/npm` (`pkgRoot: frontend`) | updates the frontend package version (idempotent with the exec write) |
| git | `@semantic-release/git` | commits version bumps + changelog back to `main` with `[skip ci]` (message `chore(release): ${nextRelease.version}`) |
| publish (npm) | `@semantic-release/npm` (`pkgRoot: frontend`) | publishes `@procrastinator-tracker/frontend` to GitHub Packages |
| publish (docker) | `@semantic-release/exec` `publishCmd` | `scripts/publish-artifacts.sh ${nextRelease.version}` → `docker buildx build --push` both images |
| publish (github) | `@semantic-release/github` | creates the GitHub Release with notes |

**Version synchronization (FR-008)**: one semantic-release run produces a single version that
becomes (a) the npm package version, (b) the Docker image tags, (c) the git tag `vX.Y.Z`, and
(d) the version written back into **all three** `package.json` files (root, backend, frontend)
— backend and frontend can never drift.

### Version synchronization guarantee

- **Single source of truth**: one semantic-release run at the repo root computes
  `nextRelease.version`; `@semantic-release/exec` `prepareCmd` runs
  `scripts/apply-release-version.mjs ${nextRelease.version}`, which writes the identical
  version into `package.json`, `backend/package.json`, and `frontend/package.json`.
- **Everything consumes the same value**: the npm package version (set by `@semantic-release/npm`
  in `frontend/`), the Docker image tags (`scripts/publish-artifacts.sh ${nextRelease.version}`),
  and the git tag `v${nextRelease.version}` (created by core).
- **Committed together**: `@semantic-release/git` commits `CHANGELOG.md` + all three
  `package.json` files (`chore(release): X.Y.Z [skip ci]`), so the repo always reflects the
  released version.
- **Release rules** come from the default `conventionalcommits` preset: `feat` → minor,
  `fix`/`perf`/`refactor` → patch, `BREAKING CHANGE` → major.

**How to verify (SC-002)**:
- Locally (mechanism): `node scripts/apply-release-version.mjs <test-version>` then confirm all
  three `package.json` files match; restore with `git checkout --`.
- After a release: `git ls-remote --tags origin 'v*'` (tag), `gh api` image versions on GHCR
  (`procrastinator-tracker-backend`, `procrastinator-tracker-frontend`), and
  `npm view @procrastinator-tracker/frontend versions --registry=https://npm.pkg.github.com/`
  must all show the identical version.

**First release**: semantic-release derives the baseline from git tags; the first release on
`main` will be **`1.0.0`**, overwriting the current `0.1.0` package versions (documented in
[research.md §6](../research.md)).

## Artifacts

| Artifact | Name / registry | Tags | Auth |
|----------|-----------------|------|------|
| Backend image | `ghcr.io/sousa99/procrastinator-tracker-backend` | `<version>`, `latest` | `GITHUB_TOKEN` (packages: write) |
| SPA image | `ghcr.io/sousa99/procrastinator-tracker-frontend` | `<version>`, `latest` | `GITHUB_TOKEN` (packages: write) |
| npm package | `@procrastinator-tracker/frontend` @ `npm.pkg.github.com` | `<version>` (dist-tag `latest`) | `NODE_AUTH_TOKEN` = `GITHUB_TOKEN` |

- `publish-artifacts.sh` builds with buildx and `--push` (idempotent re-push of the same
  version), default platform `linux/amd64`; a `PLATFORMS` variable enables
  `linux/amd64,linux/arm64`.
- `frontend/package.json` drops `private` and sets `publishConfig: { registry:
  "https://npm.pkg.github.com/", access: "restricted" }` plus the `repository` field so GitHub
  Packages matches the repo by URL (research §6).
- The npm scope mapping (`@procrastinator-tracker:registry=…`) and auth are provided in the
  release job environment.

## Idempotency (FR-012)

- Docker: `--push` overwrites an existing tag; re-running the same version is safe.
- npm: each release has a new version; a re-run after a partial failure publishes the
  remaining artifacts. Failed steps fail the workflow loudly; the next merge retries.

## Startup migrations (FR-017)

The backend image entrypoint runs `node dist/migrate.js` before `node dist/index.js --http`
against `DATABASE_URL` (volume-mounted). Fresh volume → full migrate; existing volume →
pending only; restart → no-op. See [data-model.md §Entities](../data-model.md) and the image
smoke test in [quickstart.md §6](../quickstart.md).

## Success criteria this contract serves

- SC-001 (100% of merges publish all three), SC-002 (identical versions), SC-004 (auto
  notes), SC-005 (usable artifacts), SC-007 (multi-stage, runtime-only images), SC-008
  (auto migrations), FR-004 … FR-012, FR-015, FR-017.

## References

- Spec: [spec.md](../spec.md) (FR-004 … FR-012, FR-015, FR-017)
- Docker decisions: [research.md](../research.md) (§2, §3, §9)
- Data model: [data-model.md](../data-model.md)