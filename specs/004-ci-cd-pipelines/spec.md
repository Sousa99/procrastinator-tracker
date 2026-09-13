# Feature Specification: CI/CD Pipelines & Release Publishing

**Feature Branch**: `feature/004-ci-cd-pipelines`

**Created**: 2026-09-12

**Status**: Draft

**Input**: User description: "i want to implement ci/cd pipelines for this project. I want to
have build testing, linting, formatting and unit testing as part of the cd. i want to have
as part of the ci the publish of the backend as a docker image to ghcr, the frontend spa as
docker image, and the frontend as a node package both to ghcr. i want to use semantic
release and to have backend and frontend always synchronized. i also want to validate on
PRs for the tile and branches for their format. any other relevant questions?"

> **Terminology note (2026-09-12)**: The user's original wording placed validation under
> "cd" and publishing under "ci". This was confirmed as a mix-up. The spec follows the
> conventional split: **PR validation (CI)** and **publish-on-merge (CD)**.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every PR is validated automatically before merge (Priority: P1)

As a contributor, when I open a pull request, automated checks run on it and it can only
merge when they all pass — covering linting, formatting, type checking, unit tests, and the
production builds — so nothing broken or badly formatted reaches the main branch.

**Why this priority**: This is the foundation of the whole feature. Without a working
validation gate there is no trustworthy release pipeline. It enforces the project's
existing quality gates (lint, format, test, typecheck) mechanically.

**Independent Test**: Open a PR with a deliberate lint error, a formatting violation, or a
failing test and confirm the PR is blocked; fix each and confirm the PR turns green.

**Acceptance Scenarios**:

1. **Given** a PR is opened, **When** its code fails linting, formatting, type checking, or
   unit tests, **Then** the PR shows a failing required check and cannot merge.
2. **Given** a PR is opened, **When** all four quality gates pass and both frontend builds
   and the backend build succeed, **Then** all required checks report success.
3. **Given** a PR with an invalid title or branch name, **When** it is opened or updated,
   **Then** a check reports failure explaining the expected format before any review begins.

---

### User Story 2 - Merging to main ships a full release automatically (Priority: P1)

As a maintainer, when my PR is merged into the main branch, the project is versioned and
all three artifacts — the backend Docker image, the frontend SPA Docker image, and the
frontend npm package — are built and published automatically, with no manual steps.

**Why this priority**: This is the primary reason for the pipeline: eliminating manual
release work and guaranteeing the shipped artifacts match the code on main.

**Independent Test**: Merge a PR to main, then verify all three artifacts appear in the
registry with the same version and release notes are generated.

**Acceptance Scenarios**:

1. **Given** a PR merged to main, **When** the release pipeline runs, **Then** semantic
   release computes the next version from the conventional-commit history.
2. **Given** a release version is computed, **When** the pipeline runs, **Then** the backend
   Docker image, the SPA Docker image, and the frontend npm package are all published to the
   registry.
3. **Given** a release is published, **When** it completes, **Then** release notes /
   changelog entries are produced automatically.
4. **Given** the quality gates fail on main, **When** the release pipeline runs, **Then**
   publishing is blocked and the failure is reported loudly.

---

### User Story 3 - Backend and frontend are always released in sync (Priority: P2)

As a maintainer, the backend and frontend artifacts always carry the same version number,
so I can reason about deployments as one unit and never worry about a mismatch between the
image and the package I reference.

**Why this priority**: Explicit user requirement ("backend and frontend always
synchronized") and a key source of deploy-time bugs if violated.

**Independent Test**: Inspect the three published artifacts for a release and confirm the
version is identical across all of them.

**Acceptance Scenarios**:

1. **Given** a completed release, **When** I inspect the backend image tag, the SPA image
   tag, and the npm package version, **Then** they are all the same version.
2. **Given** a new PR with a breaking change merged to main, **When** a release runs,
   **Then** all three artifacts bump to the same new major version.

---

### User Story 4 - Contributors get clear, mechanical feedback on PR hygiene (Priority: P3)

As a contributor, my PR title and branch name are validated for format before anyone
reviews, and the merge target shows which checks are required, so process rules are
enforced by tooling instead of by reviewers.

**Why this priority**: Explicit user requirement ("validate on PRs for the tile and
branches for their format"). P3 because it does not block a working release, but it keeps
history and versioning clean.

**Independent Test**: Push a branch with the wrong name and open a PR with a non-conforming
title; confirm both checks fail with the expected format, then confirm they pass once fixed.

**Acceptance Scenarios**:

1. **Given** a PR whose title does not match `[<TICKET-ID>] <type>: <subject>` (with `type`
   in `{feat, fix, chore, docs, refactor, test, build, ci, style, perf, revert}`), **When**
   the format check runs, **Then** the check fails and states the required format.
2. **Given** a PR whose branch does not match `feature/NNN-kebab-case`, **When** the format
   check runs, **Then** the check fails and states the required format.
3. **Given** a conforming PR title and branch, **When** the format check runs, **Then** the
   check passes.

---

### User Story 5 - Opening a PR is fun and self-explanatory (Priority: P2)

As a contributor, when I open a pull request I get a friendly, guided template with clearly
labeled sections and hidden comments telling me exactly what to write in each one, plus a
title placeholder in the required format — so filling out a good PR is easy and I never have
to wonder what's expected.

**Why this priority**: Explicit user requirement (a "fun easy to fill out" template). P2
because it improves contributor experience and PR quality but does not block the release
pipeline itself.

**Independent Test**: Open a PR and confirm the template appears with guidance comments for
every section, a title example matching `[PT-NNN] feat: <subject>`, and a self-review
checklist; the guidance comments are invisible once rendered.

**Acceptance Scenarios**:

1. **Given** a repository with the PR template, **When** I open a new PR, **Then** the
   template body appears with sections for summary, related ticket, changes, testing, proof,
   and a self-review checklist.
2. **Given** the template, **When** I look at it, **Then** every section includes a hidden
   HTML comment explaining how to fill it in, and the top comment shows the required title
   format with an example.
3. **Given** the template rendered, **When** it displays, **Then** the guidance comments are
   not visible to readers (HTML comments stay hidden) and the checkboxes are interactive.

---

### Edge Cases

- What happens when publishing fails partway (e.g. the backend image publishes but the npm
  package does not)? The pipeline fails loudly; the next merge retries; each publish step
  must be idempotent so a re-run does not duplicate or corrupt existing artifacts.
- What happens when a PR has no conventional type (e.g. `[PT-004] some change`)? The format
  check rejects it before review.
- How are prerelease / RC versions handled by semantic release and what tags/versions do the
  artifacts get?
- What happens when multiple PRs merge in quick succession? Each merge produces its own
  release (or a single release if they land within one run) with no manual intervention.
- The backend currently has no production build step (it runs via `tsx`); a production build
  must be added and the image must not ship dev tooling or local database state.
- How is the GitHub Packages scope/authentication handled for the npm package so it is
  installable by consumers?
- What happens on the very first publish (no existing versions in the registry)?
- Where does the SQLite data file live relative to the backend image (data must not be baked
  into the image)?
- The PR template's guidance uses HTML comments — how does it render (comments hidden,
  checkboxes functional) on GitHub before and after the PR is opened?
- The Docker images are multi-stage — how do we guarantee the published final stage carries
  only the necessary built files (compiled output + production runtime), with no source,
  dev dependencies, or build tooling?
- Database migrations must run automatically in production — what happens when a container
  starts against a fresh data volume (full migration) versus an existing volume with pending
  migrations (incremental upgrade, no data loss)? Restarting the same container must be a
  no-op.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every pull request MUST be validated by an automated CI workflow that runs
  linting, formatting check, type checking, unit tests, the backend production build, the
  frontend SPA build, and the frontend library build; all checks MUST pass before merge.
- **FR-002**: PR titles MUST match the format `[<TICKET-ID>] <type>: <subject>`, where
  `<type>` is one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`,
  `style`, `perf`, `revert`, and `<TICKET-ID>` matches the ticket pattern (`PT-NNN`, e.g.
  `[PT-003] feat: Storybook Task Stack`).
- **FR-003**: Branch names MUST match the format `feature/NNN-kebab-case` (three-digit
  feature number followed by a kebab-case description).
- **FR-004**: Merging to the main branch MUST trigger semantic release, which computes the
  next version from the conventional-commit history (including the ticket-prefixed PR titles,
  parsed via a custom commit header pattern).
- **FR-005**: The backend MUST be published as a Docker image to GitHub Container Registry.
- **FR-006**: The frontend SPA MUST be published as a Docker image to GitHub Container
  Registry.
- **FR-007**: The frontend MUST be published as an npm package to GitHub Packages (npm
  registry), scoped as `@procrastinator-tracker`.
- **FR-008**: All three published artifacts (backend image, SPA image, npm package) MUST
  carry the identical version number.
- **FR-009**: Release notes / changelog entries MUST be generated automatically for every
  release.
- **FR-010**: The quality gates MUST run before publishing; a failing gate MUST block the
  release and report the failure.
- **FR-011**: A production build for the backend MUST be added and used by the backend image
  (the backend currently runs from source via `tsx`).
- **FR-012**: The publish steps MUST be idempotent so a failed/interrupted run can be retried
  on the next merge without corrupting or duplicating artifacts.
- **FR-013**: Documentation MUST be updated in the same change: this feature's
  `quickstart.md`, `research.md`, `plan.md`, the repo `README.md` (quality gates + release
  section), and any new contracts.
- **FR-014**: The repository MUST include a pull request template that is easy and fun to
  fill out: it MUST provide sections with hidden HTML comments explaining how to fill in each
  one (summary, related ticket, changes, testing, optional proof/screenshots, and a
  self-review checklist aligned with the quality gates: lint, format, tests, typecheck,
  docs). The template MUST reinforce the FR-002 title format with an example
  (`[PT-NNN] feat: <subject>`), and the checklist MUST be guidance only — not a required
  merge gate.
- **FR-015**: The published Docker images MUST be built with multi-stage builds such that
  the final, published stage contains only the necessary built files (compiled output and
  the production runtime), excluding source code, development dependencies, and build
  tooling.
- **FR-016**: The CI pipeline MUST parallelize independent checks and present its progress
  and results in a readable, emoji-labeled layout so that status is pleasant to scan.
- **FR-017**: Database migrations MUST run automatically and idempotently when the backend
  container starts, so that remote deployments require no manual migration step. A fresh
  data volume MUST be fully migrated on first start; an existing volume MUST only apply
  pending migrations; a plain restart MUST be a no-op.

### Key Entities *(include if feature involves data)*

- **Release**: A versioned snapshot of the project produced by semantic release; carries a
  single shared version number and auto-generated notes. Links the three artifacts.
- **Backend Image**: The publishable container image of the backend (REST API / MCP modes),
  tagged with the release version.
- **SPA Image**: The publishable container image of the frontend SPA (static build), tagged
  with the release version.
- **Frontend Package**: The publishable npm package of the frontend library build
  (`dist-lib`), versioned with the release version, scoped `@procrastinator-tracker`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of merges to the main branch produce a release in which all three
  artifacts (backend image, SPA image, npm package) are published.
- **SC-002**: The version numbers of the three published artifacts are always identical for
  every release.
- **SC-003**: PRs with an invalid title or branch name are automatically rejected with a
  status check before any review, and PRs with valid titles/branches and passing quality
  gates are green.
- **SC-004**: Release notes are produced for every release with zero manual effort.
- **SC-005**: Published artifacts are usable in practice: the images start successfully and
  the npm package can be installed and imported by a consumer.
- **SC-006**: Opening a new PR shows a fully guided template where every section has
  fill-in instructions (invisible on render), the title example matches the required format,
  and the self-review checklist aligns with the project's quality gates.
- **SC-007**: The published final image for each service contains only runtime files — no
  source, no development dependencies, no build tooling — verified by inspecting the image
  contents; independent pipeline checks run in parallel.
- **SC-008**: A newly deployed backend image applies all pending database migrations on
  first start with zero manual intervention, and a restart applies no migrations.

## Assumptions

- GitHub Actions is the CI/CD platform; the repository is hosted on GitHub
  (`Sousa99/procrastinator-tracker`) with GHCR and GitHub Packages available.
- "Both to ghcr" for the npm package means the GitHub Packages npm registry
  (`npm.pkg.github.com`), scoped `@procrastinator-tracker`, private by default, with
  authentication via a token available to the workflow.
- Publishing happens on merge to `main` (not on tags); PRs only run validation.
- PRs are squash-merged so the PR title becomes the commit message, which is what semantic
  release analyzes. The release config uses a custom commit parser that extracts the
  conventional type from the ticket-prefixed title (`feat` → minor, `fix` → patch,
  `BREAKING CHANGE` → major).
- One shared version is produced by a single semantic release run at the repository root.
- The ticket pattern is `PT-NNN` (per the user's example `[PT-003]`) and is kept
  configurable in the format validation.
- The backend image does not bundle the SQLite data directory or local database state; the
  database is expected to be provided at runtime (volume/mount) as it is today with the
  local `backend/data/` directory.
- The first publish has no pre-existing versions in the registry; semantic release starts
  from the current package version (`0.1.0`) or the first commit, per its default behavior.
- The PR template lives at `.github/PULL_REQUEST_TEMPLATE.md`, uses HTML comments
  (`<!-- ... -->`) to carry guidance so it stays invisible on render, and adopts a light,
  fun tone while staying concise. The template is guidance only and is not enforced as a
  merge gate.
- Docker images are multi-stage; the final stage ships only the compiled backend bundle,
  production dependencies, the SPA static build, and the migration files. The backend image
  does not bundle the SQLite data directory; `DATABASE_URL` configures the data path and the
  volume is mounted at runtime.
- Database migrations are applied at container startup by the production runtime (no
  dev-only tooling in the image); the local `pnpm db:migrate` (drizzle-kit) workflow is
  unchanged for development.
- The CI pipeline uses parallel, emoji-labeled jobs; a single aggregate check is the one
  required status check for branch protection. Images target `linux/amd64` by default with
  `linux/arm64` available as a config toggle.
- The PR format validation and migrations run as part of this feature's CI/CD, and the
  pipeline output is intended to be pleasant to scan ("status emojis").