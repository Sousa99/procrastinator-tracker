# Bug Verification: Semantic-release fails with "No npm token specified"

- **Slug**: semantic-release-failure
- **Tested**: 2026-09-14
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: partial

## Summary

The fix is correctly in place and all locally runnable checks pass, but the actual
reproduction — the `Release` workflow running semantic-release on `main` — cannot be
exercised until this fix merges. Result is `partial` until that real run is confirmed.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Fix in place | `grep NPM_TOKEN / issues: write release.yml` | pass | `NPM_TOKEN` on the semantic-release step; `issues: write` permission |
| Workflow lint | `actionlint .github/workflows/{ci,release}.yml` | pass | no errors |
| YAML validity | `ruby -ryaml` parse both workflows | pass | valid |
| Branch regex (widen) | bash match `fix/004-release-npm-token` | pass | `(feature\|fix)/NNN-kebab-case` accepts the fix branch |
| Regression gates | `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test` | pass | all green; backend + frontend suites pass |
| Reproduction (post-fix) | `Release` workflow run on `main` | skipped | requires merging the fix PR; the real end-to-end proof |

## Output Excerpts

```
# release.yml
63:      issues: write
97:          NPM_TOKEN: ${{ secrets.GITHUB_TOKEN }}

actionlint: OK        (both workflows)
frontend test:  Tests  25 passed (25)
```

## Residual Risks

- The original failure happened on a clean CI runner; local dry-runs are not a faithful proxy
  (they can pick up machine-level npm auth). The authoritative check is the GitHub `Release`
  run after merge.
- GitHub Packages scope-match for `@procrastinator-tracker/frontend` (owner `Sousa99`) is
  still unproven until the first real publish — documented contingency in the assessment.

## Recommendation

Hold for the real run: merge the fix PR (`fix/004-release-npm-token`), then re-run this
verification against the `Release` workflow result and the published artifacts. If semantic
release completes (tag `v1.0.0`, commit-back, both GHCR images, npm package, GitHub release),
update this report to `verified` and close the bug.