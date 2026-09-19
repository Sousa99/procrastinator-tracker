# Bug Verification: publish-artifacts.sh not executable

- **Slug**: publish-script-permissions
- **Tested**: 2026-09-14
- **Assessment**: ./assessment.md
- **Fix**: ./fix.md
- **Result**: verified

## Summary

The exec-bit fix is verified: the `@semantic-release/exec` publish step now runs
`scripts/publish-artifacts.sh` successfully (no more `Permission denied` / exit 126), and both
Docker images are published. The npm 403 that followed was a separate root cause, tracked as
`npm-publish-403`.

## Checks Performed

| Check | Command / Action | Result | Notes |
|-------|------------------|--------|-------|
| Fix in place | `git ls-tree` mode of `scripts/publish-artifacts.sh` | pass | `100755` |
| Reproduction (post-fix) | `Release` run on `main` @ `73a4e1e` (exec step) | pass | `[publish] pushed ghcr.io/sousa99/procrastinator-tracker-{backend,frontend}:1.0.0` |
| Full release | `Release` run on `main` @ `f2d3098` | pass | all three artifacts at 1.0.0 |
| Gates | `pnpm format`, `pnpm lint`, `pnpm typecheck` | pass | green |

## Output Excerpts

```
[publish] pushed ghcr.io/sousa99/procrastinator-tracker-{backend,frontend}:1.0.0
[semantic-release] › ✔  Completed step "publish" of plugin "@semantic-release/exec"
```

## Residual Risks

- None specific to this fix; the exec-bit change is trivial and mode is versioned.

## Recommendation

Close the bug — verified end-to-end.