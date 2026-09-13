# Contract: PR Format & PR Template

Phase 1 output for `specs/004-ci-cd-pipelines`. Defines the pull-request title and branch
format enforced by the CI pipeline, and the structure of the guided PR template
(`.github/PULL_REQUEST_TEMPLATE.md`).

## PR title format (FR-002)

```
[TICKET-ID] <type>(<scope>)?: <subject>
```

Regex enforced by the `📝 PR format` job in [ci.md](ci.md):

```
^\[[A-Za-z]+-\d+\]\s*(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:\s*.+
```

- `TICKET-ID` — any `<Letters>-<digits>` pair; the project pattern is `PT-NNN`
  (e.g. `[PT-003]`). Example: `[PT-003] feat: Storybook Task Stack`.
- `type` — one of `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build`, `ci`, `style`,
  `perf`, `revert`. `feat` (not `feature`) is canonical — `feat` classifies as a minor
  release, `fix`/`perf`/`refactor` as patch, `BREAKING CHANGE` as major (see
  [release.md](release.md)).
- `<scope>` — optional conventional scope in parens.
- `<subject>` — non-empty description.

## Branch format (FR-003)

```
feature/NNN-kebab-case
```

Regex:

```
^feature/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$
```

- Three-digit feature number matching the `specs/NNN-…` directory, then a kebab-case
  description. Example: `feature/004-ci-cd-pipelines`.

## PR template (`.github/PULL_REQUEST_TEMPLATE.md`)

Opened on every new PR. Guidance lives in hidden HTML comments (`<!-- … -->`) so the rendered
body stays clean (FR-014).

### Structure

1. **Title hint** (comment at top) — states the required format with an example:
   `<!-- 🎟️ TITLE FORMAT: [PT-003] feat: Short summary -->`.
2. **🎯 What's this about?** — 1–2 sentences: what and why (comment: keep it short).
3. **Ticket** — the `PT-xxx` this PR closes, or `n/a` (comment: paste the ticket ref).
4. **🧩 What changed?** — bullet list of changes (comment: list the concrete changes).
5. **✅ How I verified** — the commands run (lint / format / test / typecheck / build) and the
   observed result (comment: paste commands + outcomes).
6. **📸 Proof / screenshots (optional)** — before/after, curl output, Storybook capture
   (comment: optional but appreciated).
7. **Before you hit merge** — a guidance-only self-review checklist aligned with the quality
   gates:
   - [ ] `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test` all pass
   - [ ] Docs/quickstart updated if behavior changed

### Rules

- The checklist is **guidance only** — it is NOT a required merge gate (per user decision).
  The CI `✅ check` is the enforcement mechanism.
- The template is fun and light in tone but stays concise (per user request).
- Guidance comments are invisible on render; checkboxes remain interactive.

## Success criteria this contract serves

- SC-003 (invalid PRs rejected), SC-006 (guided template renders), FR-002, FR-003, FR-014.

## References

- Spec: [spec.md](../spec.md) (FR-002, FR-003, FR-014, SC-003, SC-006)
- Pipeline enforcement: [ci.md](ci.md)
- Release parsing of the same title format: [release.md](release.md)