# Bug Verification: npm publish 403 owner not found (GitHub Packages scope)

- **Slug**: npm-publish-403
- **Tested**: 2026-09-14
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The fix is verified end-to-end. After renaming the npm package to
`@sousa99/procrastinator-tracker-components` (account-scoped namespace) and fixing the
pnpm directory filters broken by the rename, the `Release` workflow completed successfully
and all three artifacts were published at `1.0.0`. The `403 owner not found` no longer
reproduces.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Reproduction (post-fix) | `Release` run on `main` @ `f2d3098` | pass | run https://github.com/Sousa99/procrastinator-tracker/actions/runs/35433735841 — success |
| npm publish | `@sousa99/procrastinator-tracker-components@1.0.0` → `npm.pkg.github.com` | pass | published to dist-tag `latest` (restricted/private; 401 on unauthenticated read is expected) |
| Docker images | `ghcr.io/sousa99/procrastinator-tracker-{backend,frontend}:1.0.0` + `latest` | pass | freshly pushed this run (manifest inspect OK) |
| Git tag | `v1.0.0` on `origin` | pass | at `201a405` |
| GitHub release | https://github.com/Sousa99/procrastinator-tracker/releases/tag/v1.0.0 | pass | created |
| Frontend build (regression from rename) | `pnpm --filter ./frontend build` + `docker build -f Dockerfile.frontend` | pass | `dist-app/` produced; image serves `index.html` |
| Gates | `pnpm format`, `pnpm lint`, `pnpm typecheck` | pass | all green |

## Output Excerpts

```
npm notice  📦  @sousa99/procrastinator-tracker-components@1.0.0
+ @sousa99/procrastinator-tracker-components@1.0.0
[semantic-release] [@semantic-release/npm] › ℹ  Published @sousa99/procrastinator-tracker-components@1.0.0
  to dist-tag @latest on https://npm.pkg.github.com/
```

## Residual Risks

- The package is private/restricted on GitHub Packages, so unauthenticated consumers need
  auth to install — documented in quickstart §7.
- The package name is account-scoped (`@sousa99/…`); a true repo-scoped namespace would
  require moving the repo into a GitHub organization (not pursued).

## Recommendation

Close the bug — verified end-to-end. This also completes the deferred verifications from
`semantic-release-failure` (SC-002: all artifacts at one version) and
`publish-script-permissions`.