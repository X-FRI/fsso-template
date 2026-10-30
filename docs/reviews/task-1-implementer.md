# Task 1 Implementer Report — Backend Vertical Slice

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


Date: 2026-10-29
Branch: `feature/fsharp-fullstack`
Status: DONE_WITH_CONCERNS (all Task 1 checks pass; generator/table-declaration caveat noted)
Base: `1fcd8d6`

## Delivered files

- `Directory.Build.props`, `<legacy> solution`
- `src/Domain/Domain.fs` (pure F#; `DemoId`, `Demo`, built-in `Result` validation)
- `src/Application/{Errors.fs,Ports.fs,DemoHandlers.fs}` (single `AppError`, ports, `taskResult` handlers)
- `src/Infrastructure/{Migrations.fs,Generated/SqlHydra.fs,Tables.fs,SqliteDemoStore.fs,SqliteUnitOfWork.fs,Migrations/*.sql}`
- `src/Host/{HttpDtos.fs,HttpResults.fs,OpenApi.fs,Program.fs}`
- `tests/Domain.Tests/Tests.fs`, `tests/Application.Tests/Tests.fs`
- `tests/Integration.Tests/{Support.fs,StoreTests.fs,HostTests.fs,OpenApiTests.fs}`
- `.config/dotnet-tools.json`, `sqlhydra.toml`, `scripts/gen-sqlhydra.sh`, `openapi/openapi.json`

## RED/GREEN evidence (real producer RCs)

Preserved failed earlier environment/command attempts (not counted as success):

- `dotnet add package Microsoft.Data.Sqlite --version 10.0.14` — killed after 120 s timeout (no RC from producer). Cause: unnecessary `dotnet add`; direct PackageReferences + `dotnet restore` used instead.
- `dotnet add package ... -v minimal` — RC 0 but this was `dotnet add` help text (invalid option), not a package add.
- `timeout 60 dotnet ...` — zsh `command not found: timeout`; macOS has no `timeout`. Later commands used Python `subprocess.run(timeout=...)`.

RED/compile iterations (producer RC, not pipes):

- `dotnet build <legacy> solution -warnaserror` — RC 1 repeatedly while bringing up projects (missing files, F# nullness, record attributes, tuple/curried port signature, SqlHydra API shape). Diagnostics were not filtered.
- `dotnet test <legacy> solution` first full run — RC 1: Domain 5/5 pass, Application 6/6 pass, Integration 18/20 (malformed-JSON content type; OpenAPI artifact absent).
- After fixes/artifact: `dotnet build <legacy> solution -warnaserror` — RC 0, 0 warnings/0 errors.
- `dotnet test <legacy> solution -v:minimal` — RC 0; **31 passed, 0 failed** (Domain 5, Application 6, Integration 20).

SqlHydra:

- `bash scripts/gen-sqlhydra.sh` — RC 0. It runs `dotnet run --project src/Host -- --migrate-only`, then `dotnet sqlhydra sqlite -t sqlhydra.toml --project src/Infrastructure/Fsso.Infrastructure.fsproj`, then `git diff --exit-code -- src/Infrastructure/Generated/SqlHydra.fs`.
- Regeneration is deterministic; no generated diff. (File was untracked at the pre-commit run; post-commit verification is recorded by the coordinator's final check.)

OpenAPI artifact:

- `openapi/openapi.json` was fetched with `GET /openapi/v1.json` from a live Host process on a temporary SQLite file (never hand-authored). Document transformer removes request-dependent `servers` and fixes `info.title/version` so served == checked-in across ports/test hosts.
- `OpenApiDocument` test asserts canonical deep equality, POST request `$ref`, exact status matrix, unique operation IDs, `ErrorResponse` component, and all `$ref` resolution.

## Test coverage (31)

- Domain: trim/blank description, empty/oversized name, oversized description, DemoId round-trip.
- Application: create validation/conflict, get not-found, list bounds, delete not-found.
- Integration: create+list across connections; deterministic pagination with equal timestamps and id DESC; case-insensitive conflict plus direct SQL UNIQUE failure; read-no-write via `PRAGMA data_version`/count; migration idempotency; create/delete rollback on Error and exception with in-transaction observation; restart persistence; cancellation during `delay-before-commit`; fault 409/500 rollback and default-off; HTTP CRUD/Location/validation/404/409/500 sentinel/unknown API; OpenAPI equality.

## Decisions

- `IDemoStore.Insert`/`Delete` and `IUnitOfWork.Run` follow the design's curried signatures; implementations use curried `member _.Run work ct`.
- Unit of work commits only when the store reports a write. Read-only success rolls back, satisfying "reads never commit" while still using one transaction boundary port.
- HTTP `description` is `string | null` at the DTO boundary (System.Text.Json cannot bind F# `option`); `HttpDtos.toDescription` converts null/blank handling to Domain/Application `option`.
- SQLite UNIQUE maps primary 19/extended 2067 to `Conflict` in the store and defensively in the UoW. Cancellation rolls back and rethrows; other exceptions become `Unexpected`.
- Malformed JSON can be short-circuited by minimal-API binding with an empty 400 body; middleware fills any unstarted 400 with the uniform `ErrorResponse`.
- Fault injection is header-gated and requires `<legacy>_FAULT_INJECTION=1`; `delay-before-commit` is implemented as bounded delay in `AfterWrite` (inside the transaction).

## Concerns

- SqlHydra 5.1.1 printed `Table Declarations: False` and generated no `let ... = table<...>` declarations despite `table_declarations = true` in `sqlhydra.toml`. Per the allowed exception, one hand-written line in `src/Infrastructure/Tables.fs` (`let Demo = table<main.demos>`) complements the real generated type/reader/`QueryContextFactory`. All CRUD still executes through SqlHydra.Query against those generated types.
- F# nullness warning suppression (`3261`, `1178`) is limited to `src/Infrastructure` (generated code) and test projects (System.Text.Json `JsonNode` APIs). Product host/domain code is not suppressed.
- Integration tests disable xUnit parallelization because they mutate `<legacy>_DB_PATH`/fault environment variables and use real files under `artifacts/integration/`.
- Timing-sensitive cancellation test passes reliably here but uses a 250 ms client cancel against a 2 s server delay; CI scheduling could require a wider delay window.

## Reviewer fix follow-up (2026-10-29)

- `SqliteDemoStore`/`SqliteUnitOfWork` now open through `Generated.QueryContextFactory.Create(connectionString).OpenContextAsync()`. The transaction begins on `QueryContext.Connection`; the store receives the generated `QueryContext` plus transaction, and count runs on `context.Connection`/same transaction. Behavior is otherwise unchanged.
- `Get`/`List`/`Delete` application handlers now use `taskResult`; signatures unchanged. List rejects `int64 page * int64 limit > Int32.MaxValue` before touching the store.
- `CreateDemoRequest.name` is non-null; `description` stays nullable. `DemoResponse` fields `id,name,createdAt,updatedAt` are non-null; `description` nullable. A schema transformer sets `CreateDemoRequest.required = ["name"]` and `DemoResponse.required = ["id","name","createdAt","updatedAt"]` because System.Text.Json OpenAPI did not emit `required`; JSON types already emitted `string` vs `["null","string"]`.
- Infrastructure project-wide `NoWarn` removed. Migrations now handle nullable paths/streams explicitly. Generated-file warnings are scoped with `#nowarn "3261"`/`#nowarn "1178"` prepended deterministically by `scripts/gen-sqlhydra.sh` after CLI generation, so regeneration preserves it. Test-project FS3261 suppression remains separate and is documented here.
- Added HTTP tests: empty-body POST -> uniform 400; `page=21474838&limit=100` -> 400; normal boundary `page=21474836&limit=100` -> 200 empty.
- OpenAPI tests now assert required fields and nullability for `CreateDemoRequest`/`DemoResponse`.

Evidence (real producer RCs):

- `dotnet build <legacy> solution -warnaserror` — RC 0 (0 warnings, 0 errors).
- `dotnet test <legacy> solution -v:minimal` — RC 0; 31 passed (Domain 5, Application 6, Integration 20).
- OpenAPI regeneration used live Host, not hand authoring. Actual command: Python `subprocess.Popen(['dotnet','run','--project','src/Host','--no-build'])` with `<legacy>_DB_PATH=$ROOT/artifacts/openapi-gen.db`, `ASPNETCORE_URLS=http://127.0.0.1:5099`, `<legacy>_FAULT_INJECTION=0`; waited on `/api/health`; `urllib.request.urlopen('http://127.0.0.1:5099/openapi/v1.json')`; wrote bytes to `openapi/openapi.json`; terminated Host. Wrapper RC 0. Server emitted `CreateDemoRequest.required=["name"]` and `DemoResponse.required=["id","name","createdAt","updatedAt"]`.
- `bash scripts/gen-sqlhydra.sh` before committing the regenerated file returned RC 1 solely because `git diff --exit-code` saw the new intentional `#nowarn` prefix. This was expected and is not treated as a successful generation check; post-commit verification is recorded below.

Post-commit verification (after fix commit `5efe421`):

- `bash scripts/gen-sqlhydra.sh` — RC 0.
- `git diff --exit-code -- src/Infrastructure/Generated/SqlHydra.fs` — RC 0 (no diff); working tree clean afterward.
