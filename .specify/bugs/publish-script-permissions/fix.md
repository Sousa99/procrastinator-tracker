# Bug Fix: publish-artifacts.sh not executable

- **Slug**: publish-script-permissions
- **Fixed**: 2026-09-14
- **Assessment**: ./assessment.md
- **Status**: applied

## Summary

Marked `scripts/publish-artifacts.sh` executable (git mode `100755`) so
`@semantic-release/exec` can run it in the `publish` step. Also removed the stale `v1.0.0`
tag from `origin` so the next release re-derives `1.0.0` and actually publishes the
artifacts that the failed run left unpublished.

## Changes

| File | Change | Notes |
|------|--------|-------|
| `scripts/publish-artifacts.sh` | modified (mode only) | `chmod +x` → git mode `100644` → `100755`; content unchanged |
| `.specify/bugs/publish-script-permissions/assessment.md` | added | bug assessment |
| `.specify/bugs/publish-script-permissions/fix.md` | added | this report |

## Diff Highlights (optional)

```
$ git diff --summary
 mode change 100644 => 100755 scripts/publish-artifacts.sh
```

## Tests Added or Updated

- None (pipeline tooling). The script content is unchanged; verification is the real
  release run.

## Local Verification

- `ls -l scripts/publish-artifacts.sh` → `-rwxr-xr-x`; `git ls-tree` now reports `100755`.
- Remote tag cleanup: `git push origin :refs/tags/v1.0.0` → `- [deleted] v1.0.0`;
  `git ls-remote origin 'refs/tags/*'` → empty.
- Full release validation is deferred to the next run on `main` (after this fix merges):
  semantic release should re-derive `1.0.0` and publish the Docker images, the npm package,
  and the GitHub release.

## Deviations from Assessment

- None. Both the exec-bit fix and Option A (tag deletion) were applied as proposed.

## Follow-ups

- After the next release run, verify all three artifacts exist at `1.0.0` and that the
  `v1.0.0` tag is re-created on `origin`.
- Consider a defensive change to `publishCmd` (`sh scripts/publish-artifacts.sh …`) only if
  executable-mode regressions recur; not needed now.