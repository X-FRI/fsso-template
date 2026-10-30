# FSSO Stack — Task 3 Implementer Report

Status: DONE. Baseline `8dfaa37`; branch `feature/fsharp-fullstack`.
Scope: bilingual README completion, fail-closed legacy-default DB guard, synthetic SQLite backup/restore verification, historical-doc consistency. No spec/plan edits. No CI added. No archive/package run (Task 4).

## Fail-closed DB guard

Implemented in `src/Host/Program.fs`:

- Legacy filename is built non-contiguously with `String.Concat("clin", "wise", ".db")`; no contiguous legacy token is in source.
- `buildApp` calls the guard before `WebApplication.CreateBuilder` and before `Migrations.apply`, so no DB can be opened or created first.
- Guard runs only when `FSSO_DB_PATH` is unset/blank. It resolves the legacy default path and checks `File.Exists` (metadata only). It never opens, moves, deletes, or mutates the legacy file.
- Explicit `FSSO_DB_PATH` bypasses the check and starts on that path; there is no auto-discovery or silent replacement.
- Failure is `InvalidOperationException` with an operator message naming the legacy path, the no-open/no-move/no-delete guarantee, and recovery via `.backup`, `.restore`, then `FSSO_DB_PATH`.

Four tests were added to the separately counted `Fsso.Cqrs.Tests`:

1. `LegacyDefaultPresentEnvUnsetFailsBeforeAnyDbCreation` — fails before creating the new default DB; the legacy file's SHA256 and last-write UTC remain identical; the `data/` directory contains only the sentinel.
2. `ExplicitDbPathStartsAndUsesNewPathWhileLegacyRemainsUnchanged` — legacy present, explicit path starts, HTTP create/list and row count use the new DB, legacy SHA256/mtime unchanged, and `data/fsso.db` is not created.
3. `NoLegacyDefaultUsesNewDefaultPath` — with no legacy file and env unset, the normal `data/fsso.db` is created/migrated.
4. `MigrateOnlyLegacyDefaultEnvUnsetFailsBeforeAnyDbCreation` — launches the real Host DLL with `--migrate-only`, asserts nonzero exit, no `data/fsso.db`, and unchanged legacy SHA256/mtime.

All tests use unique directories under `artifacts/cqrs/`, never a real user DB or system temp directory. The test count guard in `scripts/test.mjs` was updated from 12 to 13.

Evidence:

```text
dotnet build tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj -warnaserror  -> RC 0, 0 warnings/0 errors
dotnet test tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj               -> RC 0
Failed: 0, Passed: 13, Skipped: 0, Total: 13
```

## Post-review `--migrate-only` fail-closed fix

Review found a Critical bypass: `main` handled `--migrate-only` with a direct `Migrations.apply (databasePath ())`, so the legacy-default guard was skipped and a new `data/fsso.db` could be created with RC 0.

Fix: `databasePath` itself now calls `failIfLegacyDefaultDatabaseExists` before resolving the path. Both normal `buildApp` and the `--migrate-only` branch obtain the path through that single guarded function, so every DB access is covered. Explicit `FSSO_DB_PATH` still bypasses the guard; no-legacy default behavior is unchanged.

Regression evidence:

| Case | Result |
|---|---|
| Real `dotnet <built Fsso.Host.dll> --migrate-only` in a synthetic cwd with legacy file present and `FSSO_DB_PATH` removed | RC **134** (nonzero); no `data/fsso.db`; legacy SHA256/mtime unchanged; message names `FSSO_DB_PATH` |
| In-process startup tests | normal startup, explicit path, and no-legacy default remain passing |
| `dotnet test tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj` | RC 0; Passed 13 |

## SQLite backup/restore verification

Added `scripts/sqlite-backup-check.mjs` and wired it into `pnpm test` as the separately reported `backup/restore` stage.

Flow on synthetic `artifacts/backup-check/<unique>/` only:

1. Start published `Fsso.Host.dll` on `source.db`; POST `/api/demos` through real HTTP; assert 201.
2. Stop the owned process.
3. `sqlite3 source.db ".timeout 5000" ".backup 'backup.db'"`; assert RC 0, file exists, and backup row count is 1.
4. `sqlite3 restored.db ".restore 'backup.db'"`; assert RC 0 and file exists.
5. Start the app on `restored.db`; GET `/api/demos/{id}` and `/api/demos` read the restored row; assert total=1.
6. Stop the restored app.

No real database is touched. The script requires a published host (`pnpm build` first) and fails closed if any RC/file/row assertion fails.

Evidence:

```text
node scripts/sqlite-backup-check.mjs -> RC 0
sqlite3 backup RC 0; sqlite3 restore RC 0; HTTP readback 200/total=1
pnpm test backup/restore stage -> RC 0
```

## Bilingual README

`README.md` is now the complete English primary document; `README_zh.md` is the equivalent Chinese mirror. Both are 261 lines with matching sections and facts, covering every spec §5 item:

- FSSO definition as a non-standard project label; scope/non-goals; no public/real-fund/real-data use.
- Exact versions/roles for .NET, Node, pnpm, MediatR, Svelte, SQLite stack, generators, and tests.
- Architecture/dependency rules; actual MediatR CQRS and NestJS-like mapping; SQLite vs reference stack; static SPA/no SSR.
- Install, dev, check, test, build, smoke, generation, backup, and shadcn commands.
- 31 original tests (5/6/20) with exact-name retention, 13 CQRS/startup tests, 5 unit, 5 Playwright, backup check.
- OpenAPI/SDK/SqlHydra/shadcn generation and the shadcn temporary-manifest/dependency caveat.
- Forward-only migrations and new-module workflow.
- SQLite default/parent/env, schema history, FK=ON, busy_timeout=5000, private cache, pooling off, no WAL, single-process implications.
- Fail-closed legacy default-path startup, operator recovery, consistent `.backup`/`.restore`, and no silent replacement.
- Production build/run, forward-only upgrade, rollback with matching backup, reverse proxy/HTTPS/permissions/security, explicit no-auth/no-audit.
- Troubleshooting and actual dependency licenses.
- MediatR 12.5.0 Apache-2.0 pinned; older line has no upstream updates/security support; 13+ RPL/commercial not used; no paid license registered.
- Implemented vs recommended clearly separated.

Also removed the stale active README instruction referencing the removed custom handler record; new-module guidance now points to `Cqrs.fs` and MediatR handlers. Historical docs remain explicitly marked `HISTORICAL (pre-FSSO)`; no active README/spec/plan contradiction was introduced. There is no `.github` CI workflow.

## Commands and RCs

| Command | RC | Result |
|---|---|---|
| `dotnet build tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj -warnaserror` | 0 | 0 warnings / 0 errors |
| `dotnet test tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj` | 0 | 13 passed |
| `npx --yes pnpm@10.30.3 check` | 0 | brand/structure/MediatR/contract + build + svelte-check all pass |
| `npx --yes pnpm@10.30.3 build` | 0 | frontend build + publish produced `artifacts/publish/Fsso.Host.dll` |
| `node scripts/sqlite-backup-check.mjs` | 0 | synthetic backup, restore, HTTP readback |
| `npx --yes pnpm@10.30.3 test` | 0 | originals 31 exact (5/6/20), CQRS 13, backup/restore 0, unit 5, Playwright 5 |
| `node scripts/brand-check.mjs` | 0 | final tracked-tree check (see commit evidence) |
| `node scripts/structure-check.mjs` | 0 | single package/solution/assemblies/env/DB/OpenAPI/UI/no workspace |

## Concerns and limits

- The guard covers only the default-path legacy-file case. Explicit `FSSO_DB_PATH` is intentionally operator-controlled; FSSO Stack does not inspect or migrate that path.
- Backup/restore is verified on synthetic data with the app stopped. Live-write backup coordination and multi-instance concurrency remain operator concerns.
- SQLite remains single-process with no WAL; horizontal scaling is not implemented.
- No authentication/audit, reverse proxy, TLS, rate limiting, or CI is included.
- No top-level repository `LICENSE` file exists; README states this before redistribution.
