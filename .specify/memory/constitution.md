<!--
Sync Impact Report (2026-09-03)
- Version change: (unversioned template) -> 1.0.0
- Modified principles: N/A (initial authoring; all five template placeholders filled)
- Added sections: Additional Constraints (Practicality & Scope), Development Workflow &
  Quality Gates, Governance rules
- Removed sections: N/A
- Follow-up TODOs: None
-->

# Procrastinator Tracker Constitution

## Core Principles

### I. Pragmatic Code Quality
Code quality is the baseline, not the luxury. Code MUST be clean, readable, and
self-documenting, but quality MUST remain proportionate to a personal project — no
gold-plating. Every abstraction, dependency, or "clever" construct MUST earn its place;
start simple and apply YAGNI before adding generality. Correctness and clarity beat
performance unless a real, measured need exists.

### II. Automated Formatting
Formatting MUST be enforced by tools, never by hand or by debate. Exactly one formatter
configuration per language MUST live in the repository, committed and versioned. Formatting
MUST run automatically (git hook and/or CI) and MUST pass before commit/merge. Formatting
style is NEVER a review discussion point.

### III. Automated Linting
Static analysis MUST be automated and non-negotiable. The recommended rule set for each
language's linter is enabled by default. Any exception MUST be documented inline with a
justification for why it is correct in that specific case. Lint MUST pass before merge.

### IV. Testable & Maintainable
The project MUST be easy to extend. Code SHOULD be organized into small, cohesive modules
with consistent naming; god-files and sprawling components MUST be split. Prefer boring,
conventional solutions over novel ones. Refactor as soon as a pattern repeats, and keep the
dependency footprint minimal so the project stays expandable.

### V. Living Documentation
Documentation MUST be updated in the same change as the code it describes. Docs MUST be
concise and skimmable — no documentation for its own sake. README and spec MUST stay
current; documentation debt is treated like technical debt and MUST be paid down as part of
normal work, not deferred indefinitely.

## Additional Constraints (Practicality & Scope)

This is a personal, single-developer project. Rules MUST NOT create ceremony that slows
daily velocity.

- One formatter and one linter per language; a minimal, boring toolchain is preferred.
- Prefer standard, well-known tools (e.g. prettier, eslint, ruff) over bespoke scripts.
- If a rule becomes noise, amend it through the governance process rather than silently
  ignoring it — a broken rule undermines every other rule.

## Development Workflow & Quality Gates

- Formatting, linting, and tests MUST pass before any commit or merge.
- Every feature MUST ship code, tests, and documentation updates together.
- Review (self-review or PR) MUST focus on correctness, clarity, and whether complexity is
  justified — not on formatting.
- Build the simplest thing that works, then expand incrementally.

## Governance

This constitution supersedes all other practices. Amendments MUST be documented, justified,
and recorded here via a semantic version bump (MAJOR for removals/redefinitions, MINOR for
new principles or expanded guidance, PATCH for clarifications). Compliance MUST be verified
in every workflow: quality gates are the enforcement mechanism, and any deviation must be
addressed by amending this document, not by bypassing it.

**Version**: 1.0.0 | **Ratified**: 2026-09-03 | **Last Amended**: 2026-09-03