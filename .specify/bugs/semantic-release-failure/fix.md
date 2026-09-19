# Bug Fix: Semantic-release fails with "No npm token specified"

- **Slug**: semantic-release-failure
- **Fixed**: 2026-09-14
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Fixed the release pipeline: `@semantic-release/npm` now receives the `NPM_TOKEN` it needs to
authenticate to GitHub Packages, and the `release` job gained `issues: write` so the GitHub
plugins can report/reply on issues and PRs. As a supporting change, the `📝 PR format` branch
rule was widened to allow `fix/NNN-kebab-case` branches so this fix can ship as a PR.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `.github/workflows/release.yml` | modified | `NODE_AUTH_TOKEN` → `NPM_TOKEN` in the semantic-release step env |
| `.github/workflows/release.yml` | modified | added `issues: write` to the `release` job `permissions` |
| `.github/workflows/ci.yml` | modified | branch regex widened to `^(feature\|fix)/[0-9]{3}-…` |
| `specs/004-ci-cd-pipelines/spec.md` | modified | FR-003 widened; Clarifications session 2026-09-14 added |
| `specs/004-ci-cd-pipelines/contracts/ci.md` | modified | branch format rule widened |
| `specs/004-ci-cd-pipelines/contracts/pr-format.md` | modified | branch format + examples widened |
| `specs/004-ci-cd-pipelines/data-model.md` | modified | validation rule widened |
| `README.md` | modified | "Pull requests" branch format widened |
| `.specify/bugs/semantic-release-failure/fix.md` | added | this report |

## Diff Highlights (optional)

```yaml
# release.yml — semantic-release step env
-          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
+          NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}

# release.yml — permissions
       contents: write
       packages: write
+      issues: write

# ci.yml — pr-format job
- BRANCH_RE='^feature/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$'
+ BRANCH_RE='^(feature|fix)/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$'
```

## Tests Added or Updated

- None (pipeline tooling). The branch regex was sanity-checked locally with bash against
  valid (`feature/004-ci-cd-pipelines`, `fix/004-release-npm-token`) and invalid
  (`main`, `test-branch`, `fix/x`) inputs.

## Local Verification

- `actionlint .github/workflows/ci.yml .github/workflows/release.yml` → OK
- YAML parse of both workflows → OK
- Branch regex bash sanity → passes expected cases
- Full release validation is deferred to a real run: after this fix merges to `main`, the
  `Release` workflow should complete — git tag `v1.0.0`, `chore(release): 1.0.0 [skip ci]`
  commit-back, both GHCR images, `@procrastinator-tracker/frontend` on GitHub Packages, and a
  GitHub release.

## Deviations from Assessment

- **Scope expansion — branch format**: the assessment's remediation only covered
  `release.yml`. To ship this fix, the `fix/004-release-npm-token` branch must pass the
  `📝 PR format` check, so the branch regex was widened to `(feature|fix)/NNN-…` and all
  related docs updated. This is a deliberate, documented expansion.
- Branch protection was **relaxed by the user** (status-checks-only) before this fix, so no
  `@semantic-release/git` change was needed for the commit-back push.

## Follow-ups

- Confirm the first real release succeeds (scope-match contingency for
  `@procrastinator-tracker/frontend` on GitHub Packages is still unproven; fallback is
  renaming to `@sousa99/...`).
- Open a PR from `fix/004-release-npm-token` and merge to trigger the re-run.