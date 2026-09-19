# Bug Assessment: Semantic-release fails with "No npm token specified"

- **Slug**: semantic-release-failure
- **Created**: 2026-09-14
- **Source**: pasted text ("the release ran but failed on semantic release")
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

The `Release` workflow ran on `main` after merging PR #2 (squash commit `ebeda76
feat: add CI/CD pipelines and release automation (#2)`). The `🧪 Validate` job passed, but
the `🚀 Run semantic-release` step failed. Confirmed via the workflow run logs
(https://github.com/Sousa99/procrastinator-tracker/actions/runs/35022383595).

## Symptom

The release pipeline never published anything: semantic-release aborted during
`verifyConditions` of `@semantic-release/npm` with `ENONPMTOKEN No npm token specified`,
so no version was computed, no commit-back happened, and no artifacts were published.
Expected: semantic-release authenticates to GitHub Packages, publishes
`@procrastinator-tracker/frontend` + both Docker images at version `1.0.0`.

## Reproduction

1. Merge a PR to `main` (push event) — the `Release` workflow triggers.
2. The `🚀 Release` job runs `pnpm exec semantic-release` with the step env
   `GITHUB_TOKEN` + `NODE_AUTH_TOKEN` (no `NPM_TOKEN`).
3. `@semantic-release/npm` `verifyConditions` reads `.npmrc` for registry
   `https://npm.pkg.github.com/`, finds no `NPM_TOKEN`, and aborts the run.

## Suspected Code Paths

- `.github/workflows/release.yml` — the `🚀 Run semantic-release` step env block: sets
  `NODE_AUTH_TOKEN` but not `NPM_TOKEN`. `@semantic-release/npm` requires `NPM_TOKEN`.
- `.github/workflows/release.yml` — the `release` job `permissions`:
  `contents: write` + `packages: write`; missing `issues: write`, which the
  `@semantic-release/github` `fail`/`success` plugins need to open issues/comments
  (the `fail` step failed with `403 Resource not accessible by integration`).

## Root Cause Hypothesis

`@semantic-release/npm` authenticates to the configured registry (`npm.pkg.github.com`,
from `frontend/package.json` `publishConfig.registry` and the root `.npmrc` scope mapping)
using the `NPM_TOKEN` environment variable only. The workflow sets `NODE_AUTH_TOKEN`
(a GitHub Actions / setup-node convention that semantic-release ignores), so no token is
available and `verifyConditions` fails before any release step runs. Confidence: **high** —
the error message is explicit and names the missing variable.

A secondary, latent issue surfaced in the same run: the `fail` plugin of
`@semantic-release/github` could not create a failure issue because the workflow token
lacks `issues: write`.

## Proposed Remediation

**Preferred** (`.github/workflows/release.yml`):
1. Add `NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to the `🚀 Run semantic-release` step env
   (the Actions token can publish to GitHub Packages for the owning repository). Keep
   `GITHUB_TOKEN`.
2. Add `issues: write` to the `release` job `permissions` so the `success`/`fail` GitHub
   plugins can create issues/comments (a *successful* release's `success` comment step can
   also fail without it).

**Alternatives**:
- Use a classic PAT as a repo secret (e.g. `GH_TOKEN`) instead of the `GITHUB_TOKEN` for
  npm auth — not needed; the Actions token has `packages: write` and works for GitHub
  Packages.

**Files likely to change**:
- `.github/workflows/release.yml`

**Tests to add or update**:
- No unit tests; validation is a real release run. Re-run the failed job (via the GitHub
  UI re-run, or `workflow_dispatch`, or the next merge to `main`) and confirm semantic
  release completes: git tag `v1.0.0`, `chore(release): 1.0.0 [skip ci]` commit-back, both
  GHCR images, the npm package on GitHub Packages, and the GitHub release.

## Risks & Considerations

- **Branch protection may block the git commit-back**: branch protection on `main`
  requires a pull request; `@semantic-release/git` pushes the `chore(release)` commit
  directly to `main`, which the PR-required rule will likely reject (the `GITHUB_TOKEN`
  is not a bypassable actor). This is the probable *next* failure after the token fix.
  Options: (A) use a classic PAT secret (admins bypass "require PR" by default),
  (B) relax branch protection to status-checks-only for this personal repo, or
  (C) drop `@semantic-release/git` commit-back (repo manifests stay at `0.1.0`; artifacts
  still carry versions).
- **GitHub Packages scope matching**: publishing `@procrastinator-tracker/frontend` relies
  on the `repository` field matching the repo (scope `@procrastinator-tracker` ≠ owner
  `Sousa99`). Only proven on the first real publish; if it 403s with a scope error, the
  contingency is renaming the package to `@sousa99/...`.
- **First release baseline**: no git tags exist; semantic-release will produce `1.0.0`.
- **Failure-reporting**: without `issues: write`, release failures can't open a tracking
  issue, masking future diagnostics (fixed by item 2 above).

## Open Questions

- [NEEDS CLARIFICATION: branch-protection option — PAT secret (A), relax to
  status-checks-only (B), or drop the git commit-back (C)?]
- [NEEDS CLARIFICATION: whether the GitHub Packages scope-match (repository field) is
  honored, only verifiable on the first real publish.]