# Bug Assessment: publish-artifacts.sh not executable

- **Slug**: publish-script-permissions
- **Created**: 2026-09-14
- **Source**: pasted text ("checkout main and pull, the release failed again due to .sh permissions I believe but validate")
- **Verdict**: valid
- **Severity**: high

## Report (verbatim or summarized)

The `Release` workflow ran on `main` after merging the NPM_TOKEN fix (PR #3, commit
`7b3a802`) and failed again. The user suspected the `.sh` publish script's file permissions.
Confirmed via the workflow run logs
(https://github.com/Sousa99/procrastinator-tracker/actions/runs/35431661091).

## Symptom

The release got past the previous failure point (NPM token) but aborted at the **publish**
step: `@semantic-release/exec` tried to run `scripts/publish-artifacts.sh 1.0.0` and got
`Permission denied` (exit 126). The version commit-back and tag happened, but no artifacts
(Docker images, npm package, GitHub release) were published. Expected: all three artifacts
published at the released version.

## Reproduction

1. Merge a PR to `main` — the `Release` workflow triggers.
2. semantic-release passes `verifyConditions` + `prepare` (commits `chore(release)` and
   pushes tag `v1.0.0`).
3. The `publish` step of `@semantic-release/exec` runs `scripts/publish-artifacts.sh
   ${nextRelease.version}`; the script is committed without the executable bit, so the shell
   fails with `Permission denied` (exit 126) and the run fails.

## Suspected Code Paths

- `scripts/publish-artifacts.sh` — committed with git mode `100644` (no exec bit). Verified:
  `git ls-tree origin/main scripts/publish-artifacts.sh` → `100644`.
- `.releaserc.json` — `@semantic-release/exec` `publishCmd` invokes the script by path;
  execa runs it via `/bin/sh -c`, which requires the exec bit.

## Root Cause Hypothesis

`scripts/publish-artifacts.sh` was added without the executable bit
(`chmod +x` was never applied), so git stores it as mode `100644`. When
`@semantic-release/exec` executes `publishCmd: scripts/publish-artifacts.sh
${nextRelease.version}` through `/bin/sh -c`, the shell cannot exec the file and reports
`Permission denied` (exit 126). Confidence: **high** — confirmed by both the run log
(`/bin/sh: 1: scripts/publish-artifacts.sh: Permission denied`) and the git mode.

## Proposed Remediation

**Preferred**: mark the script executable and commit the mode change:
`chmod +x scripts/publish-artifacts.sh` (git mode becomes `100755`). No content change.

Because the run already pushed tag `v1.0.0` (the "last release" marker) but published no
artifacts, the stale tag must also be handled so the next run actually publishes:
- **Option A (chosen)**: delete the stale tag `v1.0.0` locally and from `origin`; the next
  release re-derives version `1.0.0` and publishes everything at it.
- Option B (not chosen): keep the tag; the `fix:` commit makes the next release `1.0.1`.

**Alternatives**:
- Change `publishCmd` to `sh scripts/publish-artifacts.sh ${nextRelease.version}` — works
  without the exec bit; trade-off: less idiomatic, redundant with `+x`.

**Files likely to change**:
- `scripts/publish-artifacts.sh` (mode only)

**Tests to add or update**:
- None (pipeline tooling); validation is a real release run after the fix merges.

## Risks & Considerations

- Deleting the `v1.0.0` tag is a destructive remote operation; the version was never
  published, so re-releasing `1.0.0` is safe (no conflict on GitHub Packages or GHCR).
- The `chore(release): 1.0.0 [skip ci]` commit stays on `main`; re-running prepare is a
  no-op (manifests already at `1.0.0`).
- If the exec-bit fix alone were shipped without tag cleanup, a re-run would compute "no new
  release" and publish nothing.

## Open Questions

- None.