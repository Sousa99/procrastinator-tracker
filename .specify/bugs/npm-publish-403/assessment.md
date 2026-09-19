# Bug Assessment: npm publish 403 owner not found (GitHub Packages scope)

- **Slug**: npm-publish-403
- **Created**: 2026-09-14
- **Source**: pasted text ("something else failed …")
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

The `Release` workflow ran on `main` after merging the exec-bit fix (PR #4, commit
`73a4e1e`) and failed again. Confirmed via the workflow run logs
(https://github.com/Sousa99/procrastinator-tracker/actions/runs/35432225278).

## Symptom

The Docker publish now succeeds (both GHCR images at `1.0.0` + `latest`), but the npm publish
to GitHub Packages fails:
`403 Forbidden - PUT https://npm.pkg.github.com/@procrastinator-tracker/frontend - Permission not_found: owner not found`.
Expected: `@procrastinator-tracker/frontend` publishes to GitHub Packages.

## Reproduction

1. Merge a PR to `main` — the `Release` workflow triggers.
2. `@semantic-release/exec` pushes the Docker images (succeeds).
3. `@semantic-release/npm` publishes `@procrastinator-tracker/frontend` to `npm.pkg.github.com`;
   GitHub cannot resolve the namespace `procrastinator-tracker` to a GitHub account/org → 403.

## Suspected Code Paths

- `frontend/package.json` — `name: "@procrastinator-tracker/frontend"` (scope does not match
  the repo owner `Sousa99`).
- `.npmrc` — `@procrastinator-tracker:registry=https://npm.pkg.github.com/`.
- `.github/workflows/release.yml` — `NPM_TOKEN` (added in the previous fix) authenticates, but
  the namespace still must resolve.

## Root Cause Hypothesis

GitHub Packages npm namespaces are **GitHub account/organization scopes**: the `@scope` must
resolve to a real user or org that owns (or is linked to) the repo. The `repository`-field
association does **not** allow an invented namespace; `procrastinator-tracker` is not a GitHub
account, hence "owner not found". Confidence: **high** — explicit 403 with a clear message,
and consistent with GitHub Packages docs.

## Proposed Remediation

**Preferred**: rename the npm package to an account-scoped, project-unique name:
`@sousa99/procrastinator-tracker-components` (scope `@sousa99` = repo owner; package name is
specific to this project, avoiding generic `@sousa99/frontend` collisions across projects).
Update `frontend/package.json`, `.npmrc` (scope mapping `@sousa99:registry=…`), and all
living docs. A true repo-scoped namespace would require moving the repo into a GitHub
organization (heavier; not taken).

**Alternatives**:
- `@sousa99/frontend` — resolves the namespace but is generic (collides with other projects'
  packages); rejected by the user.
- GitHub org + repo transfer — the only way to get `@procrastinator-tracker/frontend`; heavy.

**Files likely to change**:
- `frontend/package.json`, `.npmrc`
- Docs: README, `contracts/release.md`, `data-model.md`, `research.md`, `quickstart.md`,
  `spec.md`, supersession pointer atop feature 003 spec

**Tests to add or update**:
- None (pipeline); validation is the real release run.

## Risks & Considerations

- Docker images are already at `1.0.0`; re-releasing at `1.0.0` (after deleting the stale
  tag) overwrites them harmlessly and publishes npm fresh.
- Renaming changes the package identity documented in feature 003 (consumer contract) — a
  supersession pointer is added there rather than rewriting history.
- The stale `v1.0.0` tag (from the failed run) must be removed so the next run re-derives
  `1.0.0`; otherwise the next release lands at `1.0.1`.

## Open Questions

- None.