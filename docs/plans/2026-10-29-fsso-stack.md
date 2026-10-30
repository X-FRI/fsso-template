# FSSO Stack Migration Plan

> Steps use `- [ ]`. One active implementer at a time; coordinator dispatches distinct spec-compliance then code-quality reviewers per task, then overall frozen review. Read `docs/fsso-stack-spec.md` first. This plan is authoritative for this order.

**Baseline:** `96e00073c29228d72553d5606ac9bec1ad550446`
**Goal:** Rename the product to FSSO Stack, remove all tracked legacy-brand occurrences, de-monorepo to a single root package with top-level `web`, integrate actual MediatR 12.5.0 CQRS, complete English/Chinese docs, and re-verify the full stack and independent archive.

**Amendment 2026-10-29:** Actual MediatR CQRS is now required and supersedes the prior no-MediatR rule. Task 1 completed at `dbf397e` before this amendment and remains structural-only. Task 2 is the new MediatR slice; prior Task 2/3 become Task 3/4.
**Constraint:** No legacy token in any tracked path/content, generated file, binary text, or archive byte. Git history is preserved and not rewritten.

## Global constraints

- Environment: prepend `/Users/somhairle/.hermes/tools/node-26.7.0-darwin-x64/bin` and project `.tools/dotnet`; `DOTNET_ROOT=project/.tools/dotnet`; `PLAYWRIGHT_BROWSERS_PATH=project/.tools/playwright-browsers`; pnpm `10.30.3` via npx; no reinstall; temp under `artifacts/` or approved scratch; no `/tmp`.
- Real producer RCs; no pipe-tail RC. No broad `pkill`; only owned PID/process groups.
- Generated SqlHydra/OpenAPI/SDK only from corrected generators.
- Preserve all 31 existing backend + 5 unit + 5 Playwright tests and add dedicated MediatR tests; never reduce/replace originals. Synthetic data only.
- Pin MediatR exactly 12.5.0 (Apache-2.0); no 13+/RPL/commercial, no paid-license registration. If truly incompatible with .NET 10/F#, preserve actual errors and BLOCK; do not switch versions or build a home-grown bus.
- Do not open/modify any real user DB; no silent default replacement.

## Task 1 — De-monorepo, rename all code/generators/scripts/tests, restore full test suite

**Deliverable:** top-level `web`, one root package/lockfile, FSSO names everywhere in code/config/generated/UI, root commands and all tests green.

- [ ] Move `apps/frontend` to `web` preserving files/components/SDK/e2e; delete `apps/`, `pnpm-workspace.yaml`, nested `web/package.json`; root `package.json` owns all frontend/dev deps and scripts. Regenerate single `pnpm-lock.yaml`; bounded install RC.
- [ ] Rename tracked sources: solution `FssoStack.slnx`; namespaces/assembly `Fsso.*` / `Fsso.Host`; project references; env vars `FSSO_*`; default DB `data/fsso.db`; OpenAPI/UI/package/archive names. Update all source consumers, scripts, Vite/Playwright/SDK config, .gitignore, build/dev/test/prod paths, package-source. No workspace commands.
- [ ] Update root tooling to run frontend directly from root (Vite with web root, Svelte check, Vitest, Playwright) and build `web/dist`. Verify shadcn config/components resolve under `web`; run bounded shadcn generation check if network permits, otherwise prove config/build/check and report the limitation.
- [ ] Regenerate SqlHydra via corrected `sqlhydra.toml`/script, OpenAPI from live Host, SDK via web config. Do not hand-edit generated outputs. Verify deterministic second run (hash/diff stable).
- [ ] Add encoded-pattern brand checker scanning tracked paths/content case-insensitively and binary-safe. Run it; fix all tracked occurrences, including historical docs redacted to neutral wording. Add root script and wire into check/test.
- [ ] Update tests for new names/assembly/DB/env; preserve 31/5/5 counts. Put display/package/solution/assembly/db/env/OpenAPI/UI brand regression checks in separate Node scripts, not suite counts.
- [ ] Real commands: `pnpm install --frozen-lockfile` (after lock), `pnpm check`, `pnpm test`, `pnpm build`, dev `--smoke`, brand checker, generation twice. Commit.

**Acceptance:** no tracked legacy match; no workspace/apps; root commands real; 31/5/5 green; single-process build; generated files corrected and deterministic.

## Task 2 — Actual MediatR 12.5.0 CQRS, host DI, rollback/concurrency/contract tests

**Status:** pending; Task 1 structural implementation at `dbf397e` is not MediatR work.

**Deliverable:** real MediatR command/query dispatch from every product data endpoint (`/api/demos...`; health/OpenAPI/static exempt), automatic handler DI, preserved UoW/error/cancellation semantics, exact-version/license guard, and dedicated tests plus all original tests green.

- [ ] Pin `MediatR` exactly `12.5.0` in Application. Verify resolved package/license is 12.5.0/Apache-2.0; no 13+, no paid license/key/code. If restore/build is genuinely incompatible with .NET 10/F#, capture exact commands/errors and report BLOCKED; do not substitute.
- [ ] Convert the four messages to F# records implementing `IRequest<Result<..., AppError>>`; implement concrete `IRequestHandler<...>` types with constructor-injected UoW/fault; preserve current validation/error/read-transaction logic and exactly one `IUnitOfWork.Run` for writes. Remove `DemoHandlers` record/functions so no home-grown bus or direct handler dispatch remains. Migrate the existing 31 test call sites (`tests/Application.Tests/Tests.fs`, `tests/Integration.Tests/Support.fs`, etc.) to real DI/`ISender` with identical names/assertions/counts; do not leave a test-only direct bus.
- [ ] Register handlers with real `AddMediatR(...RegisterServicesFromAssembly(Application assembly))`; replace all Host `DemoHandlers` injection with `ISender`; every product data endpoint (`/api/demos...`) calls `ISender.Send(message, ct)` directly. Explicitly exempt `/api/health`, OpenAPI document, and static/SPA infrastructure. Keep error->HTTP mapping, cancellation propagation, route/query/JSON validation, and OpenAPI metadata unchanged.
- [ ] Add a separately counted `Fsso.Cqrs.Tests` project with host-DI tests: resolve `ISender` from a real ServiceProvider and prove correct handler selection for all four requests; missing handler registration fails clearly (no silent fallback); domain Error maps to expected 400/404/409 through real HTTP; injected Error/exception rollback leaves no row; cancellation (pre-canceled and delayed fault) rolls back/rethrows with no row; deterministic concurrency: N unique concurrent creates all succeed and list exactly N, same-id concurrent deletes yield exactly one success with remaining 404s, no 500/corruption. Retain all original 31 backend tests by name/assertion.
- [ ] Add `scripts/check-mediatr.mjs` parsing `src/Application/obj/project.assets.json`, `dotnet list package --include-transitive`, and the package `.nuspec`: reject any MediatR != 12.5.0, any 13+/RPL, or paid-license registration/key/code; wire into `check`/`test` and record RC. Freeze the original 31 test IDs/names from a pre-change TRX and assert all remain; count `Fsso.Cqrs.Tests` separately (not by relaxed total); keep unit/browser exact 5 and no reductions.
- [ ] Add official `shadcn-svelte@1.7.1` as root dev dependency + root script targeting `web`; generate a real component (e.g. skeleton) via the official CLI, prove it lands under `web/src/lib/components/ui`, builds/checks, clean temporary CLI manifest, preserve single package/lockfile/no workspace, and record command/RC.
- [ ] Prove unchanged public contract against frozen `dbf397e` hashes: OpenAPI `33df6b8214ad3db8cd7582647cbc0c68db02483664a0edf3b995c2feca9ee681`, SDK `8c9945d74485f3067370a32ece1f5db7a9484de6045e42ce5ffc4283309ab9a0` (plus full SDK hash set); regenerate twice, use SHA256/`cmp` fail-on-diff, require byte-identical output, record hashes. Any contract change requires explicit review; none expected.
- [ ] Run real `pnpm check`, `pnpm test` (exact original 31 names + separately counted Cqrs tests, 5 unit, 5 Playwright), build, dev smoke. Add the MediatR version/license caveat to BOTH `README.md` and `README_zh.md` (create the Chinese file if absent); Task 3 completes full bilingual content. Document NestJS-like message/handler/DI mapping.
- [ ] Record exact commands/RCs, test counts, dependency audit, OpenAPI/SDK hashes, and concerns in `docs/reviews/fsso-task-2-implementer.md`; commit explicit paths.

**Acceptance:** real MediatR 12.5.0 only; official shadcn component generation RC0 into web with single package/no workspace; all product data endpoints dispatch via `ISender.Send` (health/OpenAPI/static exempt); one handler per message auto-registered by DI; UoW/error/cancellation preserved; dedicated tests prove selection/missing/rollback/concurrency/contract; original 31 IDs/counts and 5/5 retained; both READMEs carry the caveat; no paid license/v13.

## Task 3 — English/Chinese docs, safe SQLite migration/backup, history labels, configuration completeness
, safe SQLite migration/backup, history labels, configuration completeness

**Deliverable:** complete `README.md` primary + equivalent `README_zh.md`; safe operator migration/backup guidance and real synthetic verification; historical docs clearly marked and neutralized.

- [ ] Write English README and Chinese mirror with every spec §5 item: FSSO definition, exact versions/roles, MediatR CQRS architecture/NestJS-like mapping, commands, tests, generators, migrations/new module, SQLite facts (FK/busy timeout/no WAL), safe default-path migration (no auto-discovery/silent replacement), consistent `.backup`/restore, production/upgrade/rollback, proxy/HTTPS/data permissions/security, no auth/audit, no real-fund/public use, troubleshooting, actual licenses, implemented vs recommended.
- [ ] Both READMEs must state: MediatR 12.5.0 is pinned Apache-2.0; this older line lacks upstream updates/security support; 13+ is RPL/commercial and is not used; no paid license is registered. Keep the wording factual and identical in substance in both languages.
- [ ] Add startup fail-closed guard: when `FSSO_DB_PATH` is unset and the legacy default DB exists, fail before opening/creating any DB, using a non-contiguous filename construction; never mutate the file. Add synthetic temp-dir integration tests for fail-closed startup, unchanged hash/mtime, explicit-path recovery, and no silent replacement.
- [ ] Add `scripts/sqlite-backup-check.mjs`: synthetic DB via real API -> `sqlite3 .backup` -> restore to new path -> start app on restored path -> read/list; verify no real DB access. Run and record RC.
- [ ] Redact every tracked historical document (specs/plans/reviews/final report/ledger) to neutral pre-FSSO wording; add `HISTORICAL (pre-FSSO)` banners where old paths/evidence remain. No old path in active README/spec/plan/scripts/tests/config.
- [ ] Confirm no CI workflow exists; do not add new CI. Document that CI is absent and any future CI must use root commands. Verify no stale `.github` workflow references legacy paths.
- [ ] Run brand checker over tracked tree, README parity facts, backup check. Commit.

**Acceptance:** docs complete/consistent; zero tracked legacy term; fail-closed migration and backup evidence real; history explicitly historical; no new CI added.

## Task 4 — Full regression, generation determinism, frozen archive with zero-legacy census, independent release

**Deliverable:** frozen source + source archive + independent install/build/start + final report with exact evidence.

- [ ] Run full actual commands: frozen install, `pnpm check`, `pnpm test` (all original 31 plus dedicated MediatR tests / 5 unit / 5 Playwright + rollback/restart), dependency/license audit, dev real web/API, prod single .NET static/API CRUD/restart, backup/restore, brand checker, `git grep`-equivalent active-consumer scan, generation twice with stable hashes.
- [ ] Confirm no active consumer of old paths (`apps/frontend`, workspace, old package/assembly/db/env); historical evidence is explicitly marked only.
- [ ] Commit complete docs/source as frozen source A; create archive `artifacts/fsso-stack-source.tar.gz` from A; assert `README.md`, `README_zh.md`, root package/lock, web/, scripts; assert no `apps/frontend`, `.tools`, deps, caches, secrets/DB/logs/artifacts; extract and run path+decompressed-member-byte census for zero legacy term (compressed blob scan alone is insufficient).
- [ ] Extract archive to approved scratch; frozen install, build, start one process, static+API CRUD/400/404/pagination/restart; record `which dotnet`, versions, RCs, SHA256, bound source SHA.
- [ ] Write `docs/reviews/fsso-final-report.md` with exact RCs/counts/hashes, review IDs, archive absolute path, path+decompressed-bytes census, OPEN gates. Commit evidence B. Freeze.

**Acceptance:** all gates real; archive independently starts; zero legacy match in paths/content/bytes; no unresolved blocker.

## Review gates

For each task: implementer commit -> spec-compliance reviewer (distinct native session) -> code-quality reviewer (different distinct native session) -> same implementer fixes -> narrow rechecks. Final overall read-only reviewer on frozen source/evidence. Record IDs, BASE/HEAD, commands/RC in `docs/ledger.md` and final report.

## Evidence matrix

Brand/structure -> Task1 checker; MediatR/DI/behavior/contract -> Task2; docs/migration -> Task3; dev/prod/generation/archive -> Task4. Exact commands and RCs required; blocked/OPEN reported honestly.
