# Bug Fix: npm publish 403 owner not found (GitHub Packages scope)

- **Slug**: npm-publish-403
- **Fixed**: 2026-09-14
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Renamed the published npm package from `@procrastinator-tracker/frontend` to
`@sousa99/procrastinator-tracker-components` so its scope (`@sousa99`) resolves to the GitHub
account that owns the repository. GitHub Packages npm namespaces must match a real account/org;
the previous name failed with `403 owner not found` even with the `repository` field set.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `frontend/package.json` | modified | `name` → `@sousa99/procrastinator-tracker-components` |
| `.npmrc` | modified | scope mapping → `@sousa99:registry=https://npm.pkg.github.com/` |
| `README.md` | modified | consumer imports + CI/CD npm line → new name |
| `specs/004-ci-cd-pipelines/contracts/release.md` | modified | artifact table + `npm view` → new name |
| `specs/004-ci-cd-pipelines/data-model.md` | modified | Frontend Package `name` |
| `specs/004-ci-cd-pipelines/research.md` | modified | §6 decision updated (contingency resolved) |
| `specs/004-ci-cd-pipelines/quickstart.md` | modified | §4/§7 npm view/install/imports → new name |
| `specs/004-ci-cd-pipelines/spec.md` | modified | FR-007 + Clarifications bullet |
| `specs/003-storybook-task-stack/spec.md` | modified | supersession pointer (non-destructive) |
| `.specify/bugs/npm-publish-403/{assessment,fix}.md` | added | this bug record |

## Diff Highlights (optional)

```json
// frontend/package.json
- "name": "@procrastinator-tracker/frontend",
+ "name": "@sousa99/procrastinator-tracker-components",
```

```
// .npmrc
- @procrastinator-tracker:registry=https://npm.pkg.github.com/
+ @sousa99:registry=https://npm.pkg.github.com/
```

## Tests Added or Updated

- None (pipeline tooling). No app code references the package name (verified by grep).

## Local Verification

- `grep -r` confirmed no code/config (other than `package.json`/docs) references the old name.
- `pnpm format`, `pnpm lint`, `pnpm typecheck` → pass.
- Stale tag cleanup: `v1.0.0` deleted from `origin` (Option A) so the next run re-derives
  `1.0.0` (Docker `1.0.0` re-push is a harmless overwrite; npm publishes fresh).
- Full release validation is the next run on `main`: should publish Docker images + npm
  `@sousa99/procrastinator-tracker-components@1.0.0` + GitHub release.

## Deviations from Assessment

- The package name uses the user-chosen project name `procrastinator-tracker-components`
  (not `frontend`) to reflect that the package is the component library.

## Follow-ups

- Verify the real release run (all three artifacts at `1.0.0`) and close this bug.
- If a repo-scoped namespace is ever desired, it requires moving the repo into a GitHub
  organization; not pursued.