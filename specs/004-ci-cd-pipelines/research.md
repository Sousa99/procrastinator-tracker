# Research: CI/CD Pipelines & Release Publishing

Phase 0 output for `specs/004-ci-cd-pipelines`. Resolves the technical unknowns in the plan's
Technical Context. Every decision records **Decision / Rationale / Alternatives considered**.

## 1. Backend production build

**Decision**: Bundle the backend with **esbuild** to a single ESM file
(`src/index.ts` → `dist/index.js`, `--format=esm`, `--platform=node`,
`--packages=external`). A second entry bundles the startup migration runner
(`scripts/migrate.ts` → `dist/migrate.js`). `backend/package.json` gains
`"build": "esbuild src/index.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/index.js && esbuild scripts/migrate.ts --bundle --platform=node --format=esm --packages=external --outfile=dist/migrate.js"`.

**Rationale**: The backend is ESM with **extensionless relative imports** (e.g.
`from './db/client'`) and `moduleResolution: Bundler` — a `tsc` emit for native Node ESM
would fail resolution (Node requires explicit `.js` extensions). esbuild already resolves and
bundles this codebase today (it powers `tsx`, which runs the backend in dev and tests), so it
is the boring, already-present tool. `--packages=external` keeps native modules
(`better-sqlite3`) and framework deps out of the bundle; the runtime image supplies production
`node_modules` via `pnpm deploy`. `dist/` is build output and gitignored.

**Alternatives considered**: `tsc --outDir dist` — fails on extensionless ESM imports unless
the codebase is rewritten to use `.js` extensions; run `tsx` in the image — ships TS source
and dev tooling in production (violates FR-015); `node:24` native type-stripping — also
requires explicit extensions for ESM.

## 2. Multi-stage Docker image — backend

**Decision**: `Dockerfile.backend` with two stages.

```
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter backend build
RUN pnpm --filter backend deploy --prod /out

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out/package.json ./package.json
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/backend/drizzle ./drizzle
EXPOSE 3000
CMD ["sh", "-c", "node dist/migrate.js && node dist/index.js --http"]
```

**Rationale**: The build stage installs the whole workspace, produces the compiled bundle,
and uses `pnpm --filter backend deploy --prod /out` to materialize a self-contained folder
with only the backend's **production** dependencies. The runtime stage copies just that +
`dist/` + the `drizzle/` migration folder, so the published image contains compiled output,
runtime deps, and migrations — no source, no dev tooling (FR-015). `node:24-slim` (Debian)
is used because `better-sqlite3` ships prebuilt binaries for glibc; Alpine (musl) would need
a C++ build toolchain in the build stage. Migrations run before the server starts
(FR-017); `DATABASE_URL` is the runtime data path (default `./data/procrastinator.db`),
with the data directory mounted as a volume (never baked into the image).

**Alternatives considered**: Alpine base — musl native-module friction; single-stage image —
ships source + dev deps (fails FR-015); running drizzle-kit at startup — dev tooling in prod.

## 3. Multi-stage Docker image — frontend SPA

**Decision**: `Dockerfile.frontend` with two stages.

```
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter frontend build        # tsc --noEmit && vite build -> frontend/dist-app

FROM nginx:alpine
COPY --from=build /app/frontend/dist-app /usr/share/nginx/html
COPY deploy/nginx.spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Rationale**: The SPA is static output; `nginx:alpine` is the standard, minimal static
server. `deploy/nginx.spa.conf` serves `index.html` with the SPA fallback
(`try_files $uri $uri/ /index.html;`). `/api` proxying is deployment-environment-specific and
is intentionally left to the reverse proxy in front of the container.

**Alternatives considered**: `vite preview` in production — not a production server; baking a
backend proxy URL into the image — couples the image to a specific backend host.

## 4. Version synchronization — one shared version

**Decision**: A **single** semantic-release run at the repository root. `@semantic-release/exec`
`prepareCmd` (`node scripts/apply-release-version.mjs ${nextRelease.version}`) writes the
computed version into `backend/package.json` and `frontend/package.json`; `@semantic-release/git`
commits the version bumps + changelog back to `main` (`[skip ci]`); `@semantic-release/npm`
(`pkgRoot: "frontend"`) publishes the frontend npm package; `@semantic-release/exec`
`publishCmd` (`scripts/publish-artifacts.sh ${nextRelease.version}`) builds + pushes both
Docker images tagged `<version>` and `latest`. All three artifacts therefore carry the
identical version (FR-008).

**Rationale**: The user wants backend and frontend **always synchronized** (spec Q3-A: one
shared version). A single release run is the direct way to guarantee a single version; the
`exec` plugin is the official mechanism to hook version preparation and arbitrary publish
steps (Docker) into the lifecycle. `semantic-release-monorepo` was rejected because it
version/tags packages independently.

**Alternatives considered**: `semantic-release-monorepo` (per-package versions + namespaced
tags — breaks synchronization); two independent release runs (drift risk; violates FR-008);
pnpm's built-in `versioning.fixed` (pnpm ≥ 11.13; a second release system in addition to
semantic-release — adds a release "source of truth", rejected for a personal project that
already commits conventional commits).

## 5. Commit parsing (conventional commits, no custom parser)

**Decision**: Use semantic-release's **default `conventionalcommits` parsing** — no custom
`parserOpts`. Commit/PR titles are plain conventional commits (`feat: …`, `fix: …`), so the
default `@semantic-release/commit-analyzer` and `@semantic-release/release-notes-generator`
behaviour classifies `feat` → minor, `fix`/`perf`/`refactor` → patch, `BREAKING CHANGE` →
major. Squash-merged PRs carry the conventional title into history, and versioning works with
zero configuration.

**Rationale**: The user removed the `[PT-XXXX]` ticket prefix (2026-09-13 clarification) —
there is no project-specific header format anymore, so the default parser is exactly "normal
semantic release", with no bespoke parser to maintain.

**Alternatives considered**: A custom `parserOpts.headerPattern` — unnecessary now that
titles start with the conventional type; `amannn/action-semantic-pull-request` — not needed
for parsing.

## 6. Publishing the npm package to GitHub Packages

**Decision**: Publish `@procrastinator-tracker/frontend` to the GitHub Packages npm registry
(`npm.pkg.github.com`). `frontend/package.json`: remove `"private": true`, add
`"repository": "https://github.com/Sousa99/procrastinator-tracker.git"` and
`"publishConfig": { "registry": "https://npm.pkg.github.com/", "access": "restricted" }`.
The release workflow sets `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` and a scope mapping
(`@procrastinator-tracker:registry=https://npm.pkg.github.com/`) so `@semantic-release/npm`
targets GitHub Packages. Permissions: `contents: write`, `packages: write`.

**Rationale**: GitHub Packages requires scoped packages and normally matches a package to a
repo via the package scope matching the owner; because the scope (`@procrastinator-tracker`)
does not equal the account (`Sousa99`), the **`repository` field is used — GitHub matches the
package to the repo by URL instead of by name**. This lets us keep the existing package
identity from feature 003 without a rename. `access: restricted` keeps the package private
(installable only with auth), matching the private-repo default. The `npmPublish` default for
`private: true` packages is `false`, so removing `private` is required for publish at all.

**Contingency** (documented, not expected): if GitHub still rejects the scope mismatch, the
fallback is renaming the package to `@sousa99/frontend` (or `@sousa99/procrastinator-tracker-frontend`)
— a breaking change to the package identity that we only take if the `repository`-field path
is not honored.

**Alternatives considered**: npmjs.org — user explicitly said "both to ghcr" (= GitHub
Packages); renaming scope to `@sousa99` — changes feature 003's consumer contract
(`@procrastinator-tracker/frontend`), avoided via the `repository` field.

## 7. PR title & branch format validation

**Decision**: A `pr-format` job in `ci.yml` (parallel, required) validates the PR using bash
regex on `github.event.pull_request.title` and `github.head_ref` — no third-party action:

- Title: `^(feat|fix|chore|docs|refactor|test|build|ci|style|perf|revert)(\([^)]+\))?:\s*.+`
- Branch: `^feature/[0-9]{3}-[a-z0-9]+(-[a-z0-9]+)*$`

On mismatch the job prints the expected format and exits 1 (failing check).

**Rationale**: With the ticket prefix removed, the title regex is the plain conventional-commit
format; a small, self-contained bash check is dependency-free, boring, and matches the
constitution's minimal-tooling preference. The format check fails before review begins (spec
FR-002/FR-003, SC-003).

**Alternatives considered**: `amannn/action-semantic-pull-request` — an extra third-party
action that still would not cover the branch-format check, which the bash job handles in the
same step; a separate workflow file — same logic, more surface.

## 8. Pipeline shape: parallelized, emoji-labeled CI

**Decision**: `ci.yml` runs on `pull_request` with **parallel jobs**: `🧹 Format`,
`🚨 Lint`, `🔍 Typecheck`, `🧪 Test`, `🏗️ Build backend`, `🖼️ Build SPA`, `📦 Build library`,
`📝 PR format`, `🔬 actionlint`, plus a **`✅ check`** aggregator job that `needs` all of them
(no steps — its success is the single required status check for branch protection).
`concurrency` cancels superseded runs on the same PR; the pnpm store is cached
(`pnpm/action-setup` + `actions/setup-node` cache). Steps use emoji-labeled names and
`::group::`/`::endgroup::` for grouped log output.

**Rationale**: Parallel independent jobs make the PR wall-clock minimal and each result
scannable; one aggregate check keeps branch protection simple (one required check instead of
nine). Emoji-labeled steps and grouped logs make the output pleasant to scan (FR-016).
`actionlint` is the standard, boring lint for workflow YAML itself (constitution III applied
to the pipeline).

**Alternatives considered**: One monolithic job (longer, harder to scan); listing every job in
branch protection (fragile when jobs are added/removed); a bespoke PR-status comment action
(gold-plating for a personal project).

## 9. Release workflow shape

**Decision**: `release.yml` runs on `push` to `main` (and `workflow_dispatch`). Jobs:
`validate` (re-runs the quality gates: lint, format, typecheck, test, builds) → `🚀 release`
(`needs: validate`): checkout, setup pnpm + cache, `docker/setup-qemu-action` +
`docker/setup-buildx-action`, `docker/login-action` (ghcr, `GITHUB_TOKEN`), then
`pnpm exec semantic-release`. Semantic-release performs version analysis, notes, changelog,
version write-back + commit (`@semantic-release/git`), npm publish, Docker build+push
(via `@semantic-release/exec` `publishCmd`), and the GitHub release
(`@semantic-release/github`). The `release` job has `permissions: contents: write,
packages: write`. Default image platform: `linux/amd64`; a single `PLATFORMS` variable
enables multi-arch (`linux/amd64,linux/arm64`) with qemu.

**Rationale**: Running semantic-release after gates in one job keeps the version context
available to all publish steps and keeps Docker login/setup in one place. The official docker
actions handle buildx/qemu/login setup; the actual `docker buildx build --push` runs in
`publish-artifacts.sh` (invoked by the exec plugin), which tags `<version>` and `latest`.
Because a failed publish step is retried on the next merge (spec FR-012), Docker and npm
publishes are idempotent (same version + `--push` overwrite; npm rejects an already-published
version but the version is new each release).

**Alternatives considered**: Publishing images in a separate job after `release` — requires
re-reading the version (tag/artifact handoff) and splits the single-version context;
triggering on tags — user chose publish-on-merge (spec Q1-A).

## 10. Startup migrations (remote-friendly)

**Decision**: `backend/scripts/migrate.ts` runs `migrate()` from
`drizzle-orm/better-sqlite3/migrator` against the database at `DATABASE_URL`, resolving the
migrations folder relative to the bundle location (image path `./drizzle`). The backend image
entrypoint runs `node dist/migrate.js` **before** `node dist/index.js --http`. drizzle-orm is
already a production dependency, so no dev tooling is needed at runtime. Local development
keeps using `pnpm db:migrate` (drizzle-kit).

**Rationale**: The database is SQLite and lives on the deploy host (mounted volume), so CI
cannot migrate it and a pre-deploy pipeline step cannot reach it. Migrating **on container
start** is the standard pattern for this stack: it is idempotent (drizzle records applied
migrations in its migrations bookkeeping), so a fresh volume is fully migrated, an existing
volume only receives pending migrations, and a plain restart is a no-op (FR-017, SC-008).

**Alternatives considered**: Running `pnpm db:migrate` in the release pipeline — the DB is on
the deployed host, not in CI (doesn't fix remote deploys); shipping drizzle-kit in the image —
adds dev tooling to production (violates FR-015); requiring a manual remote step — exactly
what the user wants to remove.

## Consolidated decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Backend production build | esbuild bundle (`dist/index.js` + `dist/migrate.js`), `--packages=external` |
| 2 | Backend image | Multi-stage: build (install → build → `pnpm deploy --prod`) → `node:24-slim` runtime with `dist/`, `drizzle/`, prod `node_modules`; entrypoint migrate-then-serve |
| 3 | SPA image | Multi-stage: build (`pnpm --filter frontend build`) → `nginx:alpine` + `dist-app` + SPA-fallback conf |
| 4 | Version sync | One semantic-release run at root; exec plugin writes version to both package.json; git commit-back; npm publish (pkgRoot frontend); exec publishes Docker |
| 5 | Commit parsing | Default `conventionalcommits` parsing (no custom parser); plain conventional titles; feat→minor, fix/perf/refactor→patch, breaking→major |
| 6 | npm registry | GitHub Packages npm; keep `@procrastinator-tracker` scope via `repository` field; non-private + `publishConfig.registry`; GITHUB_TOKEN |
| 7 | PR/branch format | Bash regex `pr-format` job (title + branch); no third-party action |
| 8 | CI shape | Parallel emoji jobs + `✅ check` aggregate required check; caching; concurrency cancel; actionlint |
| 9 | Release shape | push→main + workflow_dispatch; validate → release job (qemu/buildx/login → semantic-release); amd64 default, arm64 toggle |
| 10 | Migrations | `drizzle-orm` runtime `migrate()` at container startup; idempotent; no drizzle-kit in image; `DATABASE_URL` + volume |