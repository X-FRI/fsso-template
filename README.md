# FSSO Stack

FSSO Stack is a runnable F# + Svelte full-stack starter arranged as compile-enforced business modules. **FSSO** is this project's label for **F# + Svelte + SQLite + OpenAPI**.

The repository contains two backend modules: the existing **Demo** create/get/list/delete workflow and a deliberately small **Notes** example with one command and one query. It demonstrates real SQLite persistence and forward-only migrations, MediatR 12.5.0 CQRS, SqlHydra-backed queries, a shared cross-module unit of work, generated OpenAPI/TypeScript SDK, Svelte 5 + shadcn-svelte UI, and single-process production hosting where .NET serves both `/api` and the static SPA.

> **Scope and non-goals:** this is a starter/teaching codebase, not a product. It has no authentication, authorization, audit trail, tenant isolation, rate limiting, real patient data, or real-fund handling. Do not expose it publicly or use it for production financial/clinical decisions without a full security and compliance review.

For a beginner-oriented, source-traced Chinese walkthrough of Demo/Notes, MediatR, ports, SQLite stores, the shared unit of work, module registration, and generation boundaries, see [docs/architecture-guide.zh.md](docs/architecture-guide.zh.md).

## 1. Supported versions and roles

| Component | Exact version / role |
|---|---|
| .NET SDK | `10.0.403`; builds/runs all F# projects |
| ASP.NET Core / F# | ASP.NET Core `10.0.14`, F# 10; Host/API/static hosting |
| MediatR | `12.5.0` (Apache-2.0); Application CQRS dispatch |
| FsToolkit.ErrorHandling | `5.2.0`; `Task<Result<_, AppError>>` pipelines |
| Microsoft.Data.Sqlite | `10.0.14`; SQLite driver |
| SqlHydra.Query / SqlHydra.Cli | `5.1.1` / `5.1.1`; typed SQL and generated schema types |
| Microsoft.AspNetCore.OpenApi | `10.0.14`; OpenAPI document |
| Node.js | `26.7.0` used in evidence; root `engines` requires `>=22` |
| pnpm | `10.30.3`; only package manager and only root lockfile |
| Svelte / Vite | `5.43.2` / `7.1.12`; SPA |
| TypeScript / svelte-check | `5.9.3` / `4.3.3` |
| Tailwind CSS / bits-ui | `3.4.17` / `2.14.4`; styling and accessible primitives |
| shadcn-svelte CLI | `1.7.1`; official component generator, root devDependency |
| @hey-api/openapi-ts | `0.93.1`; generated TypeScript SDK |
| Vitest / Playwright | `3.2.4` / `1.56.1`; unit and browser tests |
| sqlite3 CLI | Used by the synthetic backup/restore check; system SQLite 3.43.2 in evidence |

All dependencies are declared only in the root `package.json`/`pnpm-lock.yaml`; `web/` has no persistent `package.json`. There is no pnpm workspace and no CI workflow in this repository. Any future CI must run the same root commands.

## 2. Module architecture and dependency rules

```text
src/Shared/Fsso.SharedKernel       AppError/ErrorKind, IUnitOfWork/IWorkScope, IFaultInjector
src/Shared/Fsso.Database           Db path/connection, migration runner, SqlHydra generated types, table handles
src/Shared/Fsso.Api                shared DTOs, HTTP result mapping, ModuleDescriptor, OpenAPI base
src/Modules/Demo/{Domain,Application,Infrastructure,Api}
src/Modules/Notes/{Domain,Application,Infrastructure,Api}
src/Composition/Fsso.Composition   SQLite work scope, shared unit of work, migration aggregation, registration
src/Host                           startup, middleware, static SPA, health/OpenAPI mount, descriptor mounting only
tests/*                            original suites, CQRS/startup, and the separate Notes suite
web/                               root-owned Vite + Svelte 5 + TypeScript + shadcn-svelte frontend
```

Actual project-reference graph:

```text
Fsso.SharedKernel          (no project references)

Fsso.Database              -> Fsso.SharedKernel
Fsso.Api                   -> Fsso.SharedKernel

Demo.Domain                (no project references)
Demo.Application           -> Demo.Domain, Fsso.SharedKernel
Demo.Infrastructure        -> Demo.Domain, Demo.Application, Fsso.SharedKernel, Fsso.Database
Demo.Api                   -> Demo.Domain, Demo.Application, Fsso.SharedKernel, Fsso.Api

Notes.Domain               (no project references)
Notes.Application          -> Notes.Domain, Fsso.SharedKernel
Notes.Infrastructure       -> Notes.Domain, Notes.Application, Fsso.SharedKernel, Fsso.Database
Notes.Api                  -> Notes.Domain, Notes.Application, Fsso.SharedKernel, Fsso.Api

Fsso.Composition           -> Demo.Application, Demo.Infrastructure,
                              Notes.Application, Notes.Infrastructure,
                              Fsso.SharedKernel, Fsso.Database
Fsso.Host                  -> Demo.Api, Notes.Api, Fsso.Composition, Fsso.Api, Fsso.SharedKernel
```

`Directory.Build.props` sets `<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>`, so every project lists every assembly it uses directly. Forbidden edges are checked by source and by `.fsproj`: a Domain project references nothing; Application never references Infrastructure/API/Host/Database or another module; Infrastructure never references API/Host or another module; Api never references Infrastructure/Host/Database or another module; no module references Host; Composition never references Host.

`src/Host/Program.fs` contains no `/api/demos` or `/api/notes` route literal and no Demo/Notes DTO, handler, or store type. It builds infrastructure, resolves a fixed explicit descriptor list, and calls each descriptor's service registration, OpenAPI contribution, and endpoint mapping. Each module exposes a `ModuleDescriptor` (`RegisterServices`, `ConfigureOpenApi`, `MapEndpoints`, `MigrationVersions`). Health, OpenAPI, static SPA, the legacy default-path guard, and the JSON 404 fallback are infrastructure endpoints.

The four Demo messages are F# records implementing `IRequest<Result<_, AppError>>`: `CreateDemoCommand`, `GetDemoQuery`, `ListDemosQuery`, `DeleteDemoCommand`. Notes has exactly two: `CreateNoteCommand` and `GetNoteQuery`. Concrete `IRequestHandler` classes are registered by `AddMediatR` assembly scanning in each module's descriptor. Data endpoints inject `ISender` and call `ISender.Send(message, ct)`.

## 3. Shared database, migrations, and unit of work

- Default database: `data/fsso.db`, resolved relative to the process working directory; its parent directory is created.
- Override: `FSSO_DB_PATH=/absolute/path/to/fsso.db`.
- Schema versioning: embedded SQL migrations owned by each module, applied at startup and recorded in `schema_migrations`; migrations are idempotent and forward-only.
  - Demo: `001_create_demos.sql`, `002_index_demos_created.sql`.
  - Notes: `003_create_notes.sql` (table `notes` plus `ix_notes_created_at_id`).
- `src/Composition/Fsso.Composition/Composition.fs` aggregates `DemoMigrations.all @ NotesMigrations.all`; `Fsso.Composition.migrate` is the only product startup and `--migrate-only` path. `Fsso.Database.Migrations.apply` never scans an assembly by itself.
- Connection facts: `PRAGMA foreign_keys=ON`, `PRAGMA busy_timeout=5000`, `Pooling=False`, private SQLite cache. WAL is **not** enabled; the database uses SQLite's default rollback journal.
- Schema truth is the migrated database plus `src/Shared/Fsso.Database/Generated/SqlHydra.fs`; do not hand-edit generated query types.

The shared cross-module unit of work lives in `src/Composition/Fsso.Composition`, outside every module. `SqliteUnitOfWork.Run` opens one connection and transaction, constructs each module's SQLite store over that same connection/transaction, registers the stores by interface in `IWorkScope`, and invokes the work callback:

- Ok with at least one write: commit.
- Read-only Ok: roll back.
- Error, exception, or cancellation: roll back; cancellation rethrows `OperationCanceledException`.
- A store records writes through a shared `markWrite`; module-specific unique-constraint mapping stays in each store.

`POST /api/notes` uses this shared unit of work. `GET /api/notes/{id}` is read-only and does not commit. The Notes transaction tests also prove that a Demo write and a Notes write commit together, and that Error, exception, and cancellation roll back both.

## 4. Demo module (unchanged HTTP contract)

Demo keeps its paths, statuses, payloads, operation IDs, and database schema:

- `POST /api/demos` -> 201 `DemoResponse` with `Location`
- `GET /api/demos?page=&limit=` -> 200 `PagedDemoResponse`
- `GET /api/demos/{id}` -> 200, 400 for a bad id, 404 for missing
- `DELETE /api/demos/{id}` -> 204, 400 for a bad id, 404 for missing

Demo domain, application, infrastructure, and API files are split under `src/Modules/Demo`; `DemoEndpoints.fs` and `DemoModule.fs` are separate. Demo's OpenAPI subset is frozen against baseline `08b7116`; only Notes operations were added to the full document.

## 5. Notes example module (small and deliberately incomplete)

Notes is a synthetic example module, independent of Demo. It exists to show how a second module is added without editing Demo source.

- Domain: `NoteId` (UUIDv7 string), `Note { Id; Title; Body: string option; CreatedAt }`, trimmed title 1-120 characters, trimmed body maximum 4000, blank body becomes `None`.
- Application ports: `INoteStore` with `FindById` and `Insert`; there is no delete port.
- One file per message and per handler: `CreateNoteCommand.fs`, `GetNoteQuery.fs`, `CreateNoteHandler.fs`, `GetNoteHandler.fs`.
- Infrastructure: `SqliteNoteStore.fs`, `NotesMigrations.fs`, embedded `Migrations/003_create_notes.sql`.
- API: `NoteDtos.fs`, `NoteEndpoints.fs`, `NotesModule.fs`.

Endpoints and contract:

| Method | Path | Success | Errors |
|---|---|---|---|
| `POST` | `/api/notes` | 201 `NoteResponse`, `Location: /api/notes/{id}` | 400 validation, 500 |
| `GET` | `/api/notes/{id}` | 200 `NoteResponse` | 400 bad id, 404 missing, 500 |

Operation IDs are `createNote` and `getNote`, tags are `Notes`. A `NoteResponse` is `{ id, title, body, createdAt }`.

**Not implemented by design:** there is no note list, no note delete, no Tags product, no Notes frontend UI, and no Notes browser journey. Notes evidence is backend HTTP/SQLite plus the separate backend test suite.

## 6. Install, develop, build, and test

Run all commands from the repository root:

```bash
npx --yes pnpm@10.30.3 install --frozen-lockfile
npx --yes pnpm@10.30.3 dev
npx --yes pnpm@10.30.3 check
npx --yes pnpm@10.30.3 test
npx --yes pnpm@10.30.3 build
npx --yes pnpm@10.30.3 gen:openapi
npx --yes pnpm@10.30.3 gen:sdk
bash scripts/gen-sqlhydra.sh
node scripts/sqlite-backup-check.mjs
node scripts/release-smoke.mjs
npx --yes pnpm@10.30.3 package:source
```

- `dev`: F# Host on `127.0.0.1:5080` plus Vite on `127.0.0.1:5173`; Vite proxies `/api` and `/openapi`.
- `check`: brand, structure, MediatR/license, OpenAPI/SDK contract, executable architecture, Demo contract, `dotnet build -warnaserror`, and `svelte-check`.
- `test`: build/publish, negative control, all original .NET test projects with exact retention checks, CQRS/startup tests, the separate Notes suite, synthetic SQLite backup/restore, frontend check, 5 unit tests, and 5 Playwright Demo journeys against the published single process. It also smokes the published Notes create/get endpoints.
- `build`: frontend build -> `src/Host/wwwroot` -> `dotnet publish` -> `artifacts/publish/Fsso.Host.dll`.
- `dotnet artifacts/publish/Fsso.Host.dll --migrate-only`: apply migrations without starting HTTP; it uses the same fail-closed DB guard.
- `release:smoke`: published single-process static/API/404/Demo restart/Notes create-get-restart smoke.
- `package:source`: creates `artifacts/fsso-modular-source-v2.tar.gz` from committed `HEAD` (override with `FSSO_ARCHIVE_PATH=<path>`), then extracts to a new unique `independent-<sourceSha>-<timestamp>-<pid>` directory. It refuses to overwrite an existing archive or extraction path, runs frozen install, `pnpm check`, `pnpm test`, build/publish, backup/restore, Demo browser 5, one-process static/API, independent-host Demo create/list/get (get after restart; no delete or update), Notes create/get, restart persistence, report-placeholder/status gates, and a zero-legacy-brand census. The full `pnpm test` suite and release smoke exercise Demo delete; independent-host does not. It never deletes prior archives, extractions, or evidence.

Environment variables:

| Variable | Default | Purpose |
|---|---|---|
| `FSSO_DB_PATH` | `data/fsso.db` | SQLite path, relative to working directory unless absolute |
| `ASPNETCORE_URLS` | ASP.NET default; dev uses `http://127.0.0.1:5080` | Listen address |
| `ASPNETCORE_ENVIRONMENT` | `Production` for published runs | `Development` disables static SPA hosting; use Vite for UI in dev |
| `FSSO_FAULT_INJECTION` | off | Test-only `X-Test-Fault` header support; never enable in production |
| `VITE_API_BASE_URL` | empty (same origin) | Optional absolute API base for frontend build |
| `BASE_URL` | `http://127.0.0.1:5173` | Playwright target; test harness sets the published URL |
| `FSSO_TEST_PORT`, `FSSO_RELEASE_PORT`, `FSSO_PACKAGE_PORT` | `0` (auto) | Optional fixed ports for test/smoke/package checks |
| `FSSO_SCRATCH` | `artifacts/independence` | Source-package independent extraction root |

No credentials are required or read.

## 7. Tests and evidence

The test harness preserves original test identity, not just totals:

- Original backend tests: **31** — Domain 5, Application 6, Integration 20. `tests/original-test-names.json` freezes each name; `scripts/test.mjs` runs each project separately and exact-compares names.
- Dedicated CQRS/startup tests: **13** — handler selection, missing registration, 400/404/409 mapping, Error/exception/cancellation rollback, concurrent unique creates, concurrent same-id deletes, and fail-closed default-path/startup tests, including `--migrate-only`.
- Notes backend tests: **8** — create/get HTTP plus direct SQLite row, validation and missing/bad id, migration/version/table, restart persistence, and cross-module commit/Error/exception/cancellation.
- Frontend unit tests: **5**.
- Playwright Demo journeys: **5** against the published process.
- Synthetic backup/restore check: real HTTP create -> stop -> `sqlite3 .backup` -> `.restore` -> start on restored path -> readback.
- `scripts/negative-control.mjs` proves a signaled/failed child is not reported as RC 0.
- `node scripts/brand-check.mjs` scans tracked paths and bytes case-insensitively/binary-safely; `node scripts/structure-check.mjs` checks package, solution, module layout, assemblies, env, DB default, OpenAPI, UI, archive name, and absence of workspace/nested-package consumers.
- `node scripts/architecture-check.mjs` checks the real project graph, module source boundaries, Host descriptors, migration versions, Demo manifest, and a synthetic forbidden fixture.
- Exact commands, RCs, counts, hashes, and known deviations are recorded under `docs/reviews/`. Historical pre-FSSO documents are explicitly marked `HISTORICAL (pre-FSSO)`; their labels, not active code, own old evidence.

## 8. OpenAPI, SDK, SqlHydra, and shadcn generation

```bash
npx --yes pnpm@10.30.3 gen:openapi   # live Host -> openapi/openapi.json
npx --yes pnpm@10.30.3 gen:sdk       # openapi/openapi.json -> web/src/lib/api/generated
bash scripts/gen-sqlhydra.sh         # migrated all-module schema -> generated SqlHydra types
npx --yes pnpm@10.30.3 shadcn:add skeleton
```

- `gen:openapi` exports the real running API and expects exactly seven operation IDs: `createDemo`, `listDemos`, `getDemo`, `deleteDemo`, `health`, `createNote`, `getNote`.
- `gen:sdk` uses @hey-api/openapi-ts and requires the Demo and Notes operations/types. Generated files are reviewed and committed; do not hand-edit them.
- `gen:sqlhydra.sh` migrates a schema DB through `Host --migrate-only`, which applies both Demo and Notes migrations, then runs SqlHydra into `src/Shared/Fsso.Database/Generated/SqlHydra.fs`.
- `shadcn:add` invokes the official `shadcn-svelte add <args> --cwd web --no-deps-install -y` CLI through `scripts/shadcn-add.mjs`. The wrapper temporarily stages `web/package.json`, then removes it in `finally`; a pre-existing `web/package.json` is refused and preserved byte-for-byte.
- `--no-deps-install` does not update root dependencies. A component with new dependencies must have those dependencies added to the root `package.json` and `pnpm-lock.yaml` deliberately.

## 9. Add a new module

Use Notes as the smallest template and Demo as the full CRUD template. Add a module horizontally; do not edit another module's source.

1. **Domain project:** add `src/Modules/<Name>/Domain/Fsso.Modules.<Name>.Domain.fsproj` and an entity/validation file. Domain has no project references.
2. **Application project:** add `.../Application/Fsso.Modules.<Name>.Application.fsproj` with `FsToolkit.ErrorHandling 5.2.0` and exactly one `MediatR 12.5.0` package reference. Add `Ports.fs` plus one file per command/query and one per handler under `Commands/`, `Queries/`, and `Handlers/`; reference Domain + SharedKernel only.
3. **Infrastructure project:** add `.../Infrastructure/Fsso.Modules.<Name>.Infrastructure.fsproj`, a new forward-only migration under `Infrastructure/Migrations/`, a `*Migrations.fs` embedded-resource reader, and a SQLite store. Reference Domain/Application + SharedKernel + Database. Never modify an applied migration.
4. **Api project:** add `.../Api/Fsso.Modules.<Name>.Api.fsproj` with the ASP.NET framework reference, `Microsoft.AspNetCore.OpenApi 10.0.14`, and `MediatR 12.5.0`. Add DTOs, endpoints, and a `<Name>Module.fs` descriptor. Endpoints call `ISender.Send`; writes go through the shared unit of work.
5. **Shared composition points:** add only the new module's Application and Infrastructure `.fsproj` references to `src/Composition/Fsso.Composition/Fsso.Composition.fsproj`; aggregate the new migrations in `Composition.fs`; register the new store interface and factory in `SqliteUnitOfWork.fs` (`StoreKeys`, `StoreFactory`, and the `stores` dictionary), keeping construction inside the shared transaction. `SqliteWorkScope` is intentionally generic and does not need a module-specific edit. If new schema handles are needed, add them to `src/Shared/Fsso.Database/Tables.fs` and regenerate `Generated/SqlHydra.fs`.
6. **Host:** first add a `ProjectReference` to the new module Api project in `src/Host/Fsso.Host.fsproj`; then add only `<Name>Module.descriptor` to the fixed descriptor list in `src/Host/Program.fs`. Do not add route literals or DTO/handler/store types.
7. **Solution:** add the product projects and any new test project to `FssoStack.slnx`.
8. **Scripts and generated points:** update `scripts/architecture-check.mjs` expected edges/forbidden opens (and manifest only if the Demo/test manifest policy changes), `scripts/structure-check.mjs` project/required-file lists, `scripts/check-mediatr.mjs` module list, `scripts/gen-openapi.mjs` expected operation IDs, `scripts/gen-sdk.mjs` required operations/types, `scripts/test.mjs` suite orchestration, and `scripts/package-source.mjs` required files. Run `bash scripts/gen-sqlhydra.sh`, `gen:openapi`, and `gen:sdk`; refresh `scripts/contract-hashes.json` only through the generators.
9. **Tests:** add a dedicated test project and preserve the original suite identities. Add HTTP/SQLite round trips, validation, restart, and transaction rollback cases appropriate to the module. Do not add a frontend UI or browser journey unless the task explicitly requires it.

## 10. Safe default-path migration, fail-closed startup, backup, and restore

An older pre-FSSO starter used a different default database filename in `data/`. FSSO Stack default-path startup and `--migrate-only` fail closed:

- If `FSSO_DB_PATH` is unset/blank and the legacy pre-FSSO default file exists in `data/`, normal startup **and** `--migrate-only` abort **before opening or creating any database**.
- The error names the legacy path and tells the operator to set `FSSO_DB_PATH` and restore/choose an explicit database.
- The legacy file is checked by filesystem metadata only. It is never opened, modified, moved, or deleted.
- Setting `FSSO_DB_PATH` explicitly always permits startup/migrate-only on that path, even if the legacy file remains. There is no auto-discovery, automatic migration, or silent replacement.
- If no legacy default file exists, `data/fsso.db` is created and migrated normally.

Operator recovery (app stopped or writes controlled):

```bash
sqlite3 "/path/to/legacy-pre-fsso.db" ".backup '/secure/legacy-backup.db'"
sqlite3 "/secure/restored-fsso.db" ".restore '/secure/legacy-backup.db'"
sqlite3 "/secure/restored-fsso.db" "PRAGMA integrity_check;"
FSSO_DB_PATH="/secure/restored-fsso.db" \
ASPNETCORE_URLS="http://127.0.0.1:5099" \
ASPNETCORE_ENVIRONMENT="Production" \
dotnet artifacts/publish/Fsso.Host.dll
```

Routine consistent backups and restores use SQLite's backup API through the CLI, with the app stopped or writes controlled:

```bash
sqlite3 "$DB" ".backup '/secure/backup.db'"
sqlite3 "/secure/restored.db" ".restore '/secure/backup.db'"
sqlite3 "/secure/restored.db" "PRAGMA integrity_check;"
```

`node scripts/sqlite-backup-check.mjs` performs this end to end on synthetic Demo data: create through real HTTP, stop the app, `.backup`, `.restore` to a new path, start the app on the restored path, then GET/list the row. It never touches a real database.

## 11. Production build, run, upgrade, and rollback

```bash
npx --yes pnpm@10.30.3 build
FSSO_DB_PATH="/srv/fsso/data/fsso.db" \
ASPNETCORE_URLS="http://127.0.0.1:5099" \
ASPNETCORE_ENVIRONMENT="Production" \
dotnet artifacts/publish/Fsso.Host.dll
```

Production is one .NET process serving `wwwroot` and `/api`; there is no SSR and no Node runtime. Unknown `/api/*` routes return JSON errors and never fall back to `index.html`. Do not point multiple application instances at the same SQLite file: SQLite locking + busy timeout protect a single process, not a multi-instance deployment. WAL and horizontal scaling are recommendations only, not implemented.

Upgrade:

1. Stop the app.
2. Make and verify a consistent backup.
3. Deploy the new build.
4. Start it; forward-only migrations run at startup.
5. Verify health, read/list, and integrity.

Rollback:

- Migrations are forward-only; there are no automatic down migrations.
- Redeploy the previous build **and** restore its matching backup if the schema changed.
- If no schema change occurred, redeploying the previous build may be enough.

## 12. Security and deployment guidance

Implemented today: loopback-friendly Kestrel hosting, parameterized SqlHydra/SQLite access, error responses without internal exception text, test-only fault injection gated by `FSSO_FAULT_INJECTION`, and no credentials in the repository.

Recommended for any real deployment (not implemented here):

- Terminate TLS at a reverse proxy; bind the app to loopback/private networks.
- Apply proxy timeouts, request-size limits, and rate limits.
- Run as a non-root user; data directory `0700`, database/backup files `0600`; encrypt backups at rest.
- Add authentication, authorization, CSRF protection where applicable, audit logging, monitoring, and alerting.
- Use a managed backup schedule and test restores regularly.
- Do not expose the app publicly; do not store real patient or real-fund data.

There is **no authentication or audit** in this starter. `/api` is unauthenticated by design for the demo.

## 13. Troubleshooting

- **Startup: legacy pre-FSSO default database error.** Set `FSSO_DB_PATH` to an explicit restored/fresh path. Do not delete or move the old file blindly; make and verify a backup first.
- **`database is locked`.** Stop extra writers/instances; this app is single-process. Check the data directory permissions and the 5-second busy timeout.
- **Static page 404 in production.** Run `pnpm build`; Production hosting uses `src/Host/wwwroot`. In Development the SPA is served by Vite, not Kestrel.
- **Migrations look stale.** Restart the app or run the migration path; never edit an already applied SQL file. Add a new numbered migration.
- **SqlHydra types missing a table.** Migrate the schema DB, then rerun `bash scripts/gen-sqlhydra.sh`. The script uses the Host migrate-only path, so both modules are present.
- **Package refuses to start.** The target archive (default `artifacts/fsso-modular-source-v2.tar.gz`) or extraction directory exists. Preserve it and set `FSSO_ARCHIVE_PATH` to a new versioned path; nothing is deleted automatically.
- **shadcn generation refused.** `web/package.json` already exists; remove it deliberately after inspecting it. The wrapper will not overwrite a pre-existing manifest.

## 14. Licenses and MediatR 12.5.0 status

This repository does not currently ship a top-level `LICENSE` file; add an explicit project license before redistribution. Third-party components retain their upstream licenses; verify with your organization's policy before distribution.

| Dependency | License |
|---|---|
| MediatR `12.5.0` | Apache-2.0 |
| FsToolkit.ErrorHandling `5.2.0` | MIT |
| Microsoft.Data.Sqlite `10.0.14`, Microsoft.AspNetCore.OpenApi `10.0.14` | MIT |
| SqlHydra.Query/Cli `5.1.1` | MIT |
| Svelte `5.43.2`, Vite `7.1.12`, bits-ui `2.14.4`, Tailwind CSS `3.4.17`, shadcn-svelte `1.7.1`, @hey-api/openapi-ts `0.93.1`, Vitest `3.2.4`, svelte-check `4.3.3`, tailwind-variants `3.1.1`, clsx `2.1.1`, tailwind-merge `3.3.1` | MIT |
| TypeScript `5.9.3` | Apache-2.0 |
| Playwright / @playwright/test `1.56.1` | Apache-2.0 |

**MediatR 12.5.0:** deliberately pinned to the Apache-2.0 `12.5.0` line. This older line does **not** receive upstream updates or security support. MediatR 13+ moved to RPL/commercial licensing; this project does not use 13+, does not register a paid license, and contains no license key or registration code. This statement is factual, not an endorsement or support claim.

## 15. Implemented vs recommended

**Implemented:** modular shared kernel/database/API, Demo and Notes modules, shared cross-module SQLite unit of work, compile-enforced module boundaries and executable architecture checks; real SQLite + forward-only migrations; FK on, busy timeout 5000, private cache, no WAL; fail-closed legacy default-path startup; explicit-path recovery; synthetic backup/restore verification; single-process production hosting; generated OpenAPI/SDK/SqlHydra types; shadcn component generation; exact original-test retention plus separately counted CQRS/startup and Notes tests.

**Recommended, not implemented:** WAL/multi-instance deployment, authentication/authorization, audit logging, CSRF/rate limiting, managed backups/monitoring, TLS termination, reverse-proxy hardening, CI, Notes list/delete/tags/UI. These are operator or future-task responsibilities.

## 16. Brand and history

`brand-check` verifies tracked paths and file bytes for the legacy term case-insensitively and binary-safely; `structure-check` verifies the single-package/solution/module/DB/UI/archive contract. Historical pre-FSSO documents retain recorded results but are explicitly marked `HISTORICAL (pre-FSSO)` and redacted to neutral wording. No legacy database filename is auto-discovered or silently replaced.
