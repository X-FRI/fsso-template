# FSSO Stack — Modular Hexagonal/CQRS Refactor Spec

Status: implementation spec for the modular refactor order, 2026-10-29.
Baseline HEAD: `08b7116843b86cfebed2f3c1b9ddfa03284b6453` (clean). Backend baseline was executed RC0 individually: Domain 5, Application 6, Integration 20, CQRS 13. Frontend Vitest/Playwright baseline only captured 5 unit and 5 browser identities; they are not claimed executed-green at baseline. Historical archive evidence is not reused.
Scope: local source, local commits, local verification only. No push, deploy, global config, credentials, or real user database.

## 1. Goal

Replace the four global `src/{Domain,Application,Infrastructure,Host}` buckets with business-module ownership while retaining F# compile-order/reference enforcement, real SQLite, MediatR 12.5.0, SqlHydra, OpenAPI/SDK generation, and the existing Demo HTTP/DB contract.

Modules are added horizontally, not by editing another module's source. A shared SQLite unit of work outside any module owns the transaction boundary and exposes every module's stores inside one transaction so cross-module writes can commit or roll back atomically.

The second module is deliberately small: **Notes only** (no Tags product). It has one table, one command and one query, each with a separate handler. No new Notes UI and no new browser journeys are added.

## 2. Target source layout

```
src/
  Shared/
    Fsso.SharedKernel/     AppError/ErrorKind, IUnitOfWork/IWorkScope, IFaultInjector
      Errors.fs  UnitOfWork.fs  Faults.fs
    Fsso.Database/         Db, migration runner, generated SqlHydra types, table handles
      Db.fs  Migrations.fs  Generated/SqlHydra.fs  Tables.fs
    Fsso.Api/              shared HTTP DTOs, error mapping, ModuleDescriptor, OpenAPI base
      SharedDtos.fs  HttpResults.fs  ModuleDescriptor.fs  OpenApiSupport.fs
  Modules/
    Demo/
      Domain/              Fsso.Modules.Demo.Domain.fsproj
      Application/         Fsso.Modules.Demo.Application.fsproj
      Infrastructure/      Fsso.Modules.Demo.Infrastructure.fsproj
      Api/                 Fsso.Modules.Demo.Api.fsproj
    Notes/
      Domain/              Fsso.Modules.Notes.Domain.fsproj
      Application/         Fsso.Modules.Notes.Application.fsproj
      Infrastructure/      Fsso.Modules.Notes.Infrastructure.fsproj
      Api/                 Fsso.Modules.Notes.Api.fsproj
  Composition/
    Fsso.Composition/      SqliteWorkScope, SqliteUnitOfWork, migrate/registerInfrastructure/path
  Host/
    Fsso.Host.fsproj       startup, middleware, static SPA, module mounting only
```

`src/Host/Program.fs` contains no `/api/demos` or `/api/notes` route literals and no Demo/Notes DTO or handler types. It builds infrastructure, resolves module descriptors in a fixed explicit list, calls each descriptor's service registration, OpenAPI contribution, and endpoint mapping, then mounts shared infrastructure endpoints (`/api/health`, OpenAPI, static SPA, JSON 404 fallback).

### ModuleDescriptor contract

`Fsso.Api/ModuleDescriptor.fs`:

```fsharp
type ModuleDescriptor =
    { Name: string
      RegisterServices: IServiceCollection -> unit
      ConfigureOpenApi: IServiceCollection -> unit
      MapEndpoints: WebApplication -> unit
      MigrationVersions: string list }
```

- `RegisterServices`: MediatR assembly scan for that module's Application assembly plus module services.
- `ConfigureOpenApi`: module-specific transformers only. `Fsso.Api/OpenApiSupport.fs` owns the single `AddOpenApi("v1", ...)` call, title `"FSSO Stack API"`, and server/query base behavior. Demo's existing query-parameter and required-field transforms move to `Demo.Api/DemoOpenApi.fs` and are registered by `DemoModule`. Notes contributes no transformer.
- `MapEndpoints`: mounts only that module's routes.
- `MigrationVersions`: informational list used by the architecture check; actual migrations come from module Infrastructure.

Current Host file disposition:
- `src/Host/HttpDtos.fs` -> `Demo.Api/DemoDtos.fs` (Demo DTOs) + `Fsso.Api/SharedDtos.fs` (`ErrorResponse`, `HealthResponse`).
- `src/Host/HttpResults.fs` -> `Fsso.Api/HttpResults.fs`.
- `src/Host/OpenApi.fs` -> `Fsso.Api/OpenApiSupport.fs` (base/title) + `Demo.Api/DemoOpenApi.fs` (Demo transforms).
- `src/Host/Program.fs` keeps startup, middleware, fault injector, legacy default guard, `--migrate-only`, static SPA, health, OpenAPI mount, JSON 404, and descriptor mounting. It must not reference `Fsso.Database`, module Infrastructure, or module DTO types directly.

## 3. Project reference graph and compile enforcement

```
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

Forbidden edges: Domain -> anything; Application -> Infrastructure/API/Host/Database/another module; Infrastructure -> API/Host/another module; Api -> Infrastructure/Host/Database/another module; any module -> Host; Composition -> Host. A module may not reference another module's Domain/Application/Infrastructure/Api.

`Directory.Build.props` MUST set:

```xml
<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>
```

so every project lists every assembly it uses directly. Host reaches DB paths/migrations only through `Fsso.Composition` (`resolveDatabasePath`, `migrate`, `registerInfrastructure`).

### Project/package requirements

- `Fsso.SharedKernel`: Microsoft.NET.Sdk; compile `Errors.fs`, `UnitOfWork.fs`, `Faults.fs`; no packages/project refs.
- `Fsso.Database`: Microsoft.NET.Sdk; `Db.fs`, `Migrations.fs`, `Generated/SqlHydra.fs`, `Tables.fs`; packages `Microsoft.Data.Sqlite 10.0.14`, `SqlHydra.Query 5.1.1`; ref SharedKernel.
- `Fsso.Api`: Microsoft.NET.Sdk; `FrameworkReference Microsoft.AspNetCore.App`; packages `Microsoft.AspNetCore.OpenApi 10.0.14`; compile `SharedDtos.fs`, `HttpResults.fs`, `ModuleDescriptor.fs`, `OpenApiSupport.fs`; ref SharedKernel.
- Demo/Notes Domain: Microsoft.NET.Sdk; no packages/project refs.
- Demo/Notes Application: packages `FsToolkit.ErrorHandling 5.2.0`, `MediatR 12.5.0`; ref module Domain + SharedKernel.
- Demo/Notes Infrastructure: packages `Microsoft.Data.Sqlite 10.0.14`, `SqlHydra.Query 5.1.1`; ref module Domain/Application, SharedKernel, Database; embed module migrations.
- Demo/Notes Api: `FrameworkReference Microsoft.AspNetCore.App`; package `Microsoft.AspNetCore.OpenApi 10.0.14`, `MediatR 12.5.0` (descriptor registration); ref module Domain/Application, SharedKernel, Fsso.Api.
- `Fsso.Composition`: packages `Microsoft.Data.Sqlite 10.0.14`, `SqlHydra.Query 5.1.1`; refs in graph above.
- `Fsso.Host`: Microsoft.NET.Sdk.Web; package `Microsoft.AspNetCore.OpenApi 10.0.14`; refs in graph above.
- Test project refs: `Domain.Tests` -> Demo.Domain; `Application.Tests` -> Demo.Domain, Demo.Application, SharedKernel; `Integration.Tests` -> Demo.Domain/Application/Infrastructure/Api, SharedKernel, Database, Composition, Host; `Cqrs.Tests` -> same as Integration; `Notes.Tests` -> Notes Domain/Application/Infrastructure/Api, Demo Domain/Application/Infrastructure/Api, SharedKernel, Database, Composition, Host.

### Namespace and test policy

- Demo keeps public namespaces: `Fsso.Domain` (Demo Domain), `Fsso.Application` (Demo Application), `Fsso.Infrastructure` (Demo Infrastructure), `Fsso.Demo.Api` (Demo API).
- Notes uses `Fsso.Notes.Domain`, `Fsso.Notes.Application`, `Fsso.Notes.Infrastructure`, `Fsso.Notes.Api`.
- Shared uses `Fsso.Application` for `AppError`/`IUnitOfWork`/`IWorkScope`/`IFaultInjector`, `Fsso.Database`/`Fsso.Database.Generated`, `Fsso.Api`.
- Test bodies/opens may change; all original test names and assertions stay. `tests/original-test-names.json` remains authoritative.

## 4. Shared database, migrations, and unit of work

`Fsso.Database/Db.fs`: `resolvePath`, `connectionString`, `createDirectory`, `openConnection` (PRAGMA foreign_keys/busy_timeout), unchanged behavior.

`Fsso.Database/Migrations.fs`:

```fsharp
type Migration = { Version: string; Sql: string }
module Migrations =
    val apply: dbPath: string -> migrations: Migration list -> ct: CancellationToken -> Task
    val appliedVersions: dbPath: string -> ct: CancellationToken -> Task<string list>
```

`apply` sorts the supplied list by version, applies each idempotently in its own transaction, and records `schema_migrations`. It never scans its own assembly for migrations. Demo/Notes Infrastructure expose `DemoMigrations.all`/`NotesMigrations.all` read from their own embedded resources (`migrations.001_create_demos.sql`, `migrations.002_index_demos_created.sql`, `migrations.003_create_notes.sql`). `Fsso.Composition.migrate` aggregates both lists and is the only product startup/migrate-only path. The original Demo migration idempotency test calls `Migrations.apply` with `DemoMigrations.all` only and still sees exactly `001_create_demos`, `002_index_demos_created`.

`Fsso.SharedKernel/UnitOfWork.fs`:

```fsharp
type IWorkScope =
    abstract Store<'T> : unit -> 'T

type IUnitOfWork =
    abstract Run<'T> :
        work: (IWorkScope -> CancellationToken -> Task<Result<'T, AppError>>) ->
        ct: CancellationToken ->
            Task<Result<'T, AppError>>
```

`Fsso.Composition/SqliteUnitOfWork.fs` opens one connection/transaction, constructs `SqliteDemoStore`, `SqliteNoteStore` over it, and registers them by interface type. Stores call a shared `markWrite` on every mutating method. `Run` commits only on Ok with at least one write; read-only Ok rolls back; Error/exception/cancellation roll back; cancellation rethrows `OperationCanceledException`. The shared UoW does not contain module-specific conflict messages; each store maps its own SQLite unique-constraint failure. Demo preserves its message; Notes maps duplicate/constraint failures as defined below.

## 5. Demo module (no contract change)

- `Domain/Demo.fs`: move current `src/Domain/Domain.fs` byte-for-byte except file path; retains `DemoId`, `Demo`, `ValidationError`, `ValidatedDemo`, and `Demo.validate/create/reconstitute`, namespace `Fsso.Domain`.
- `Application/Commands/CreateDemoCommand.fs`, `DeleteDemoCommand.fs`; `Queries/GetDemoQuery.fs`, `ListDemosQuery.fs`: one message per file, each `IRequest<Result<...>>`.
- `Application/Handlers/CreateDemoHandler.fs`, `GetDemoHandler.fs`, `ListDemosHandler.fs`, `DeleteDemoHandler.fs`: one concrete handler per file.
- `Application/Ports.fs`: `IDemoStore`, `PagedDemos`; no infrastructure type.
- `Infrastructure/SqliteDemoStore.fs`: SqlHydra queries; same conflict mapping; constructor takes `(context, transaction, markWrite)`.
- `Infrastructure/DemoMigrations.fs`: emits `Migration` list from embedded resources.
- `Api/DemoDtos.fs`, `DemoOpenApi.fs`, `DemoEndpoints.fs`, `DemoModule.fs`: separate files. `DemoEndpoints` maps four endpoints; `DemoModule` builds the descriptor.

Demo HTTP paths, statuses, payloads, operation IDs, and DB schema do not change. `openapi/openapi.json` gains only the two Notes operations; a Demo snapshot proves the Demo subset is unchanged.

## 6. Notes example module (small)

Clearly documented as a synthetic example module, independent of Demo.

- Domain: `NoteId` (UUIDv7 string), `Note { Id; Title; Body: string option; CreatedAt }`, validation (trimmed title 1-120 chars, trimmed body max 4000, blank body -> None).
- Application ports: `INoteStore` with `FindById: NoteId -> Task<Note option>`, `Insert: Note -> Task<Note>`, `Delete` is not required.
- Command: `CreateNoteCommand { Title: string | null; Body: string option }` + `CreateNoteHandler`.
- Query: `GetNoteQuery { Id: NoteId }` + `GetNoteHandler`.
- One file per message and per handler: `Application/Commands/CreateNoteCommand.fs`, `Application/Queries/GetNoteQuery.fs`, `Application/Handlers/CreateNoteHandler.fs`, `Application/Handlers/GetNoteHandler.fs`. No combined file.
- Infrastructure: `SqliteNoteStore.fs`, `NotesMigrations.fs` embedding `003_create_notes.sql`.
- Migration: one table `notes (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, body TEXT NULL, created_at TEXT NOT NULL)` plus `ix_notes_created_at_id`. Forward-only, version `003_create_notes`; Demo migration bytes unchanged.
- API (`NoteDtos.fs`, `NoteEndpoints.fs`, `NotesModule.fs`):
  - `POST /api/notes` -> 201 `NoteResponse` with `Location: /api/notes/{id}`, 400 validation, 500.
  - `GET /api/notes/{id}` -> 200 `NoteResponse`, 400 bad id, 404 missing, 500.
  - Operation IDs `createNote`, `getNote`; tags `Notes`.
- Both handlers use `IUnitOfWork.Run`; the create handler is the only write, the get handler is read-only and must not commit.
- No Tags product, no note list/delete, no frontend Notes UI, no new browser test.

## 7. Generation and frozen contracts

- SqlHydra: `sqlhydra.toml` output `src/Shared/Fsso.Database/Generated/SqlHydra.fs`, namespace `Fsso.Database.Generated`, generated from a real migrated DB containing Demo and Notes tables. No hand edits.
- OpenAPI: exported from the running Host after all descriptors mount; checked in `openapi/openapi.json`; expected operations are the 5 existing (`createDemo`, `listDemos`, `getDemo`, `deleteDemo`, `health`) plus `createNote`, `getNote`.
- SDK: `@hey-api/openapi-ts` regenerated into `web/src/lib/api/generated`; existing Demo declarations must stay compatible, Notes declarations are additive. No hand edits.
- `scripts/demo-contract.json` and `scripts/demo-sdk-contract.json` are generated from baseline `08b7116` output:
  - OpenAPI snapshot: canonical sorted JSON of Demo paths (`/api/demos`, `/api/demos/{id}`), all their operations/statuses/parameters/request bodies/responses, and the transitive `components.schemas` closure for Demo request/response/error types.
  - SDK snapshot: exact baseline text blocks for `createDemo`, `listDemos`, `getDemo`, `deleteDemo` and the Demo data/response/error type declarations.
  - `scripts/demo-contract-check.mjs` canonicalizes current OpenAPI and compares the same subset; it compares the SDK declarations after regeneration. Any Demo contract change fails.
- `scripts/contract-hashes.json` freezes the full new OpenAPI/SDK byte set after generation. Generation twice must produce identical SHA-256.

## 8. Tests and executable architecture checks

Preserve exact identities: 31 backend (Domain 5, Application 6, Integration 20), 13 CQRS, 5 frontend unit, 5 Playwright Demo journeys. No skipped tests and no aggregate-only acceptance. New Notes cases are a separate `tests/Notes.Tests/Fsso.Notes.Tests.fsproj` suite counted independently; frontend/browser counts do not change.

New Notes tests (7 minimum) cover: real migration/table/version; HTTP create+get round trip with direct SQLite row check; validation 400; missing/bad id 400/404; restart persistence; cross-module commit writes Demo+Note; cross-module Error/exception/cancellation rollback leaves neither row.

Architecture checks are executable on real source/project references:
- `scripts/architecture-check.mjs` exports `checkRepository(root)` and a CLI. The CLI checks the real repo then writes a synthetic fixture under `artifacts/architecture-forbidden-fixture/` with (a) `Notes.Domain` referencing `Demo.Infrastructure` and (b) `Notes.Application` opening a Demo infrastructure namespace. It runs `checkRepository` on that fixture and exits 0 only if both violations are detected; failure to detect is a script failure.
- Checks: direct `.fsproj` edges and source `open`/type usage for forbidden edges; `DisableTransitiveProjectReferences` present; DemoEndpoints/DemoModule separate; Host has no route literals/Demo or Notes types; shared UoW path outside `src/Modules/Demo`; `tests/demo-module-files.sha256` unchanged.
- `tests/demo-module-files.sha256` is captured at the end of Task 1 (before Notes) over every tracked file under `src/Modules/Demo` plus every tracked file under `tests/Domain.Tests/`, `tests/Application.Tests/`, `tests/Integration.Tests/`, and `tests/Cqrs.Tests/` (including `.fsproj`) except `tests/Integration.Tests/OpenApiTests.fs`, which may change only its expected operation-ID list after Notes. Format `<sha256>  <repo-relative-path>`. Task 2 must not edit any other Demo/test file.
- `scripts/architecture-check.mjs`, `scripts/demo-contract-check.mjs`, structure/MediatR checks run in `pnpm check`, `pnpm test`, and packaging.

### Scripts/configs updated by the refactor

- `FssoStack.slnx`: 13 product projects + 5 test projects.
- `scripts/structure-check.mjs`: new module/shared/composition paths, DemoEndpoints/DemoModule, shared UoW outside Demo, new archive `artifacts/fsso-modular-source.tar.gz`, no old layer projects, no old mapping script.
- `scripts/check-mediatr.mjs`: exactly one MediatR 12.5.0 reference in each Application project that uses handlers (Demo and Notes), verify both resolved assets; no 13+/paid markers.
- `sqlhydra.toml`: keep project-relative `output = "Generated/SqlHydra.fs"` and set `connection = "Data Source=artifacts/schema.db"`; run with `--project src/Shared/Fsso.Database/Fsso.Database.fsproj` so the effective repo path is `src/Shared/Fsso.Database/Generated/SqlHydra.fs`; namespace `Fsso.Database.Generated`. `scripts/gen-sqlhydra.sh` updates `GENERATED` to that repo path, applies all migrations via Host `--migrate-only`, and is invoked as `bash scripts/gen-sqlhydra.sh`.
- `scripts/gen-openapi.mjs`: expected 7 operation IDs; `scripts/gen-sdk.mjs`: require Demo and Notes operations/types.
- `tests/Integration.Tests/OpenApiTests.fs`: original identity kept; expected operation IDs become the 7 exact IDs; Demo status assertions unchanged.
- `scripts/test.mjs`: original Domain/Application/Integration exact name lists, CQRS exactly 13, Notes suite separately (>=7, real names), frontend original 5 identities from `web/src/lib/demo-helpers.test.ts`, Playwright Demo 5 identities from `web/e2e/demo.spec.ts`; no Notes browser/unit additions.
- `scripts/package-source.mjs`: new archive name; required-file list includes new module/shared/composition files and `scripts/architecture-check.mjs`, `scripts/demo-contract-check.mjs`; invokes architecture check before packaging.

## 9. Frontend and documentation

- The existing Svelte Demo UI is unchanged except the OpenAPI-generated SDK additions; no Notes UI, no new browser cases. Existing labels/test IDs/roles stay.
- `README.md` and `README_zh.md`: module copy guide, actual dependency diagram, add-module steps (files to add and the shared composition/generated script points to touch), generation/run/test commands, Notes example and its two endpoints, shared cross-module UoW, honest counts.

## 10. Acceptance

- `dotnet build FssoStack.slnx -warnaserror` and all suites pass with exact original identities plus separately counted Notes tests.
- Architecture check passes on source and fails on the forbidden fixture; Demo manifest unchanged.
- Demo OpenAPI/SDK subset unchanged; Notes contract real and generated; generation deterministic.
- Notes HTTP/SQLite round trip, restart persistence, and cross-module commit/rollback Error/exception/cancellation are real.
- Existing Demo migration files byte-identical to baseline.
- No push/deploy; final archive under NEW name extracted and independently validated from committed source.
