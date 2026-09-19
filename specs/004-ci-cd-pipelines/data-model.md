# Data Model: CI/CD Pipelines & Release Publishing

Phase 1 output. Logical model of the release/artifact system and the pipeline lifecycle. No
application data is added — this models the **release domain**: the shared version, the three
published artifacts, and the state transitions that produce them. Field names below are the
contract-level names used in `contracts/ci.md`, `contracts/release.md`, and
`contracts/pr-format.md`.

## Entities

### Release

The unit of delivery: one versioned snapshot of the repository produced by semantic release.

| Field | Type | Rules |
|-------|------|-------|
| `version` | semver (`X.Y.Z`) | computed from conventional-commit history since the last release tag |
| `gitTag` | `v<version>` | created by semantic release on `main` |
| `notes` | markdown | auto-generated from merged PRs/commits |
| `createdAt` | timestamp | when the release pipeline ran |

**Relationships**: a Release aggregates exactly one **Backend Image**, one **SPA Image**, and
one **Frontend Package**, all at the same `version` (FR-008).

### Backend Image

The publishable container image of the backend (REST API / MCP dual-mode entry).

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | `ghcr.io/sousa99/procrastinator-tracker-backend` (lowercase) |
| `tags` | list | `<version>` and `latest` (FR-008; both published together) |
| `platforms` | list | `linux/amd64` default; `linux/arm64` toggle |
| `entrypoint` | command | `node dist/migrate.js && node dist/index.js --http` (FR-017) |
| `runtimeContents` | list | compiled `dist/`, production `node_modules`, `drizzle/` migrations — **no source, no dev deps, no build tooling** (FR-015) |

### SPA Image

The publishable container image of the frontend SPA (static build).

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | `ghcr.io/sousa99/procrastinator-tracker-frontend` (lowercase) |
| `tags` | list | `<version>` and `latest` (FR-008) |
| `platforms` | list | `linux/amd64` default; `linux/arm64` toggle |
| `contents` | list | `dist-app/` static files served by nginx with SPA fallback |

### Frontend Package

The publishable npm package of the frontend library build.

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | `@sousa99/procrastinator-tracker-components` (GitHub Packages requires the scope to match the repo owner; the package name is project-unique) |
| `registry` | string | `https://npm.pkg.github.com/` (GitHub Packages) |
| `version` | semver | identical to the Release version (FR-008) |
| `access` | string | `restricted` (private by default) |
| `contents` | list | `dist-lib/` (ESM bundle, types, `styles.css`) |

### Pipeline configuration (repo-level)

| Artifact | Path | Purpose |
|----------|------|---------|
| CI workflow | `.github/workflows/ci.yml` | PR validation (FR-001, FR-016) |
| Release workflow | `.github/workflows/release.yml` | merge→release→publish (FR-004) |
| PR template | `.github/PULL_REQUEST_TEMPLATE.md` | guided PR authoring (FR-014) |
| Release config | `.releaserc.json` | semantic-release plugins + parser (FR-004, FR-008) |
| Backend Dockerfile | `Dockerfile.backend` | multi-stage backend image (FR-015) |
| Frontend Dockerfile | `Dockerfile.frontend` | multi-stage SPA image (FR-015) |
| Migration runner | `backend/scripts/migrate.ts` | startup migrations (FR-017) |

## State transitions

The delivery lifecycle, enforced by the two workflows:

```
PR opened
  │  ci.yml (parallel checks: format, lint, typecheck, test, builds, PR format, actionlint)
  ▼
validated  ──(all required checks pass + title/branch format OK)──▶ mergeable
  │
  │  merge to main
  ▼
merged ──(push to main triggers release.yml)──▶ validated again (gates re-run)
  ▼
released  ──(semantic-release computes version, writes notes)──▶ versioned
  │
  ▼
published ──(npm package + Docker images pushed, git tag + commit back)──▶ done
```

- `PR → validated` requires every job in `ci.yml` green, including the `📝 PR format` job
  (title `<type>: <subject>`, branch `feature/NNN-kebab-case`).
- `merged → released` only if the release job's `validate` gate passes (spec FR-010).
- `released → published` publishes all three artifacts at one `version`; partial failures
  fail loudly and are retried on the next merge (spec FR-012, idempotent).

## Validation rules (from spec FRs)

- PR title MUST match `^(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:\s*.+` (FR-002).
- Branch MUST match `^(feature|fix)/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$` (FR-003).
- Artifact versions MUST be identical to the Release `version` (FR-008).
- Published images MUST contain only runtime files (FR-015) — verified by inspecting the image.
- Startup migration MUST be idempotent (FR-017): fresh volume → full migrate; existing volume
  → pending only; restart → no-op.

## Relationships

- **Release** 1—N **Artifacts** (exactly 3: Backend Image, SPA Image, Frontend Package), all
  at the same version.
- **CI workflow** → gates the PR; **Release workflow** → produces the Release; both read
  **repo configuration** (`.releaserc.json`, Dockerfiles, package.json scripts, workflows).
- **Frontend Package** → reuses the feature 003 library build (`dist-lib/`) and package name;
  only its publish configuration changes in this feature.
- No application data storage is added; the release/artifact records live in the registries
  (GHCR, GitHub Packages) and GitHub Releases.