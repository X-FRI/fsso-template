# FSSO Modular Refactor — Task 1 Implementer Evidence

Status: DONE (Task 1 only)
Base commit: `08b7116843b86cfebed2f3c1b9ddfa03284b6453`
Date: 2026-10-29

## Scope delivered

- Added `src/Shared/Fsso.SharedKernel` (`Errors.fs`, `UnitOfWork.fs`, `Faults.fs`).
- Added `src/Shared/Fsso.Database` (`Db.fs`, `Migrations.fs`, generated `Generated/SqlHydra.fs`, `Tables.fs`).
- Added `src/Shared/Fsso.Api` (`SharedDtos.fs`, `HttpResults.fs`, `ModuleDescriptor.fs`, `OpenApiSupport.fs`).
- Split Demo into `src/Modules/Demo/{Domain,Application,Infrastructure,Api}` with one command/query/handler per file.
- Added `src/Composition/Fsso.Composition` (`SqliteWorkScope.fs`, `SqliteUnitOfWork.fs`, `Composition.fs`).
- Rewrote `src/Host/Program.fs` to mount descriptor list only; Host contains no `/api/demos` literal and no Demo DTO/handler/store types.
- Removed old `src/{Domain,Application,Infrastructure}` projects and old `src/Host/{HttpDtos,HttpResults,OpenApi}.fs`.
- Updated `Directory.Build.props` with `<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>`.
- Updated `FssoStack.slnx`, all four original test project references/call sites (names and assertions unchanged).
- Updated `sqlhydra.toml`, `scripts/gen-sqlhydra.sh`, `scripts/structure-check.mjs`, `scripts/check-mediatr.mjs`.
- Added `scripts/architecture-check.mjs` (exported `checkRepository`, manifest writer), `tests/demo-module-files.sha256`.
- Added baseline Demo contract snapshots `scripts/demo-contract.json`, `scripts/demo-sdk-contract.json`, and `scripts/demo-contract-check.mjs`.

Not done by design: Notes module, Notes tests, OpenAPI/SDK regeneration, frontend changes, archive/package changes.

## TDD red/green for new shared-scope behavior

Focused scratch compile/behavior check (not committed, under ignored `artifacts/`):

```bash
dotnet build artifacts/task1/focused/Focused.fsproj -warnaserror
# RC=1 before implementation (missing Migrations/SqliteUnitOfWork/IUnitOfWork) -> artifacts/task1/focused-red.log

dotnet run --project artifacts/task1/focused/Focused.fsproj
# RC=0 -> artifacts/task1/focused-green.log
# PASS write Ok commits
# PASS Error rolls back
# PASS Exception maps and rolls back
# PASS read-only Ok leaves rows unchanged
# PASS demo migrations aggregate exactly once
```

## Migration byte identity

```bash
git show 08b7116:src/Infrastructure/Migrations/001_create_demos.sql | sha256sum
# 4de5c1ac5f97d3a389a2c929cf9a5b0bd258ae87feaf8c52859338e3237edad2
sha256sum src/Modules/Demo/Infrastructure/Migrations/001_create_demos.sql
# 4de5c1ac5f97d3a389a2c929cf9a5b0bd258ae87feaf8c52859338e3237edad2

git show 08b7116:src/Infrastructure/Migrations/002_index_demos_created.sql | sha256sum
# 353982e483ddd464792bb6c502de8b8a3838f5183950b572f7e98e1de03b405c
sha256sum src/Modules/Demo/Infrastructure/Migrations/002_index_demos_created.sql
# 353982e483ddd464792bb6c502de8b8a3838f5183950b572f7e98e1de03b405c
```

`src/Modules/Demo/Domain/Demo.fs` is a byte-for-byte copy of baseline `src/Domain/Domain.fs` (SHA-256 `8d6453bf178cebd417febe0508ada7994085c713832d5c94b73ad09c196b91c5`).

## SqlHydra generation

```bash
bash scripts/gen-sqlhydra.sh
# RC=0 -> artifacts/task1/gen-sqlhydra.log, artifacts/task1/gen-sqlhydra-second.log
```

Generated file: `src/Shared/Fsso.Database/Generated/SqlHydra.fs`, namespace `Fsso.Database.Generated`, containing only Demo tables (`demos`, `schema_migrations`). Two consecutive generations produced the same SHA-256:

```text
db4637b7b97cd7617cc02517418e90bf9886ee0dac708061eddd425016e84b48
```

## Verification commands and RCs

Environment block from the plan was exported before every command.

| Gate | Command | RC | Evidence |
| --- | --- | --- | --- |
| Build | `dotnet build FssoStack.slnx -warnaserror` | 0 | `artifacts/task1/build-final.log` |
| Structure | `node scripts/structure-check.mjs` | 0 | terminal output |
| MediatR | `node scripts/check-mediatr.mjs` | 0 | `artifacts/task1/check-mediatr.log` |
| Architecture | `node scripts/architecture-check.mjs` | 0 | `13 projects, 33 Demo/test manifest files` |
| Demo contract | `node scripts/demo-contract-check.mjs` | 0 | `2 paths, 4 schemas; SDK 4 operations, 24 types` |
| Frontend/root check | `pnpm check` | 0 | `artifacts/task1/pnpm-check.log` |
| Domain tests | `dotnet test tests/Domain.Tests/Fsso.Domain.Tests.fsproj --logger "trx;LogFileName=Domain.trx" --results-directory artifacts/task1/trx` | 0 | `artifacts/task1/trx/Domain.trx` |
| Application tests | `dotnet test tests/Application.Tests/Fsso.Application.Tests.fsproj --logger "trx;LogFileName=Application.trx" --results-directory artifacts/task1/trx` | 0 | `artifacts/task1/trx/Application.trx` |
| Integration tests | `dotnet test tests/Integration.Tests/Fsso.Integration.Tests.fsproj --logger "trx;LogFileName=Integration.trx" --results-directory artifacts/task1/trx` | 0 | `artifacts/task1/trx/Integration.trx` |
| CQRS tests | `dotnet test tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj --logger "trx;LogFileName=Cqrs.trx" --results-directory artifacts/task1/trx` | 0 | `artifacts/task1/trx/Cqrs.trx` |

## Test identity comparison

TRX names were compared with `tests/original-test-names.json` and `docs/evidence/baseline-backend-test-identities.json`.

| Suite | Expected | Passed | Failed | NotExecuted | Names |
| --- | ---: | ---: | ---: | ---: | --- |
| Domain | 5 | 5 | 0 | 0 | exact match |
| Application | 6 | 6 | 0 | 0 | exact match |
| Integration | 20 | 20 | 0 | 0 | exact match |
| CQRS | 13 | 13 | 0 | 0 | exact match |

No tests were skipped; no aggregate-only claim is used.

## OpenAPI / SDK contract

- `openapi/openapi.json` and `web/src/lib/api/generated/*` were not regenerated or edited; `scripts/contract-hashes.json` remains satisfied (`pnpm check` RC=0).
- `scripts/demo-contract.json` and `scripts/demo-sdk-contract.json` were captured from `git show 08b7116:openapi/openapi.json` and `git show 08b7116:web/src/lib/api/generated/{sdk.gen.ts,types.gen.ts}` via `node scripts/demo-contract-check.mjs --capture`.
- `node scripts/demo-contract-check.mjs` RC=0 against the current checked-in OpenAPI/SDK.

## Deviations / notes

- `Fsso.Composition` has `<FrameworkReference Include="Microsoft.AspNetCore.App" />` so `registerInfrastructure` can accept `IServiceCollection`. This is a framework reference, not a package reference, and is required by the spec-mandated Composition API.
- To keep Composition's project graph exactly as specified (no direct `Demo.Domain` reference with transitive refs disabled), `Demo.Infrastructure/SqliteDemoStore.fs` exposes a small `DemoStoreRegistration` factory (`typeKey` + `create` returning `obj`). Composition still owns the shared transaction/UoW; Demo Infrastructure constructs its own store. This avoids an extra `Composition -> Demo.Domain` edge that F# otherwise requires for `IDemoStore` signatures.
- `MigrationVersions` for Demo is informational only; actual migration SQL is read by `DemoMigrations.all` from Demo Infrastructure embedded resources.
- The plan document absolute checkout path was replaced with `<repository-root>` to keep the repository brand check free of the legacy token; no technical instruction changed.
- No Notes module, Notes tests, Notes OpenAPI operations, or frontend changes were added (Task 2 scope).

## Task 1 correction (review findings)

Date: 2026-10-29. Base commit: `1222586fb00eb964cf1a6ce53075757fbdaebbd7`. Demo source/tests and the Demo/test manifest were not modified.

- **Host/type-usage boundaries:** added a small F# lexical helper in `scripts/lib.mjs` that strips nested block comments, line comments, and string/verbatim/triple-quoted string contents. `scripts/architecture-check.mjs` and `scripts/structure-check.mjs` now both reject any `Fsso.Demo.Api` symbol in `src/Host/**` except `DemoModule`, while allowing `open Fsso.Demo.Api` and `DemoModule.descriptor`. Fully-qualified `Fsso.Demo.Api.*` references, `open`/`open type` of submodules, and any occurrence of forbidden namespaces (`Fsso.Database`, `Fsso.Infrastructure`) are detected, not just `open` lines. The architecture script also runs executable negative fixtures: a synthetic Program using `DemoResponse`/`DemoEndpoints` must be detected, a fully-qualified forbidden type must be detected, and allowed `DemoModule` usage plus names mentioned only in comments/strings must not be flagged.
- **Migration descriptor validation:** `scripts/architecture-check.mjs` now parses each module `*Module.fs` `MigrationVersions` list and compares it to the module's `Infrastructure/Migrations/*.sql` versions. Demo must declare exactly `001_create_demos`, `002_index_demos_created`; descriptors remain unchanged.
- **Demo contract block slicing:** `scripts/demo-contract-check.mjs` now ends each operation/type block at the next `export` or JSDoc (`/**`) boundary, so the next export's comment is no longer absorbed. `scripts/demo-sdk-contract.json` was recaptured from baseline `08b7116` with the corrected slicing.
- **Cancellation/UoW:** `src/Composition/Fsso.Composition/SqliteUnitOfWork.fs` now holds the transaction with `use` for deterministic disposal and rethrows the original `OperationCanceledException` after rollback via `ExceptionDispatchInfo.Capture(ex).Throw()` instead of constructing a new OCE. No HTTP/DB contract changed.

### Correction verification (Environment block exported; RCs exact)

| Gate | Command | RC | Result |
| --- | --- | ---: | --- |
| Build | `dotnet build FssoStack.slnx -warnaserror` | 0 | 0 warnings, 0 errors |
| Architecture | `node scripts/architecture-check.mjs` | 0 | 13 projects, 33 Demo/test manifest files, negative fixtures detected |
| Structure | `node scripts/structure-check.mjs` | 0 | layout/solution/assemblies/env/DB/OpenAPI/UI OK |
| Demo contract | `node scripts/demo-contract-check.mjs` | 0 | after red RC=1 before snapshot recapture |
| Domain tests | `dotnet test tests/Domain.Tests/Fsso.Domain.Tests.fsproj ...` | 0 | 5/5 passed, names match baseline |
| Application tests | `dotnet test tests/Application.Tests/Fsso.Application.Tests.fsproj ...` | 0 | 6/6 passed, names match baseline |
| Integration tests | `dotnet test tests/Integration.Tests/Fsso.Integration.Tests.fsproj ...` | 0 | 20/20 passed, names match baseline |
| CQRS tests | `dotnet test tests/Cqrs.Tests/Fsso.Cqrs.Tests.fsproj ...` | 0 | 13/13 passed, names match baseline |
| Frontend/root check | `pnpm check` | 0 | structure/MediatR/contract/build/svelte-check all RC=0 |

TRX evidence: `artifacts/task1-correction/trx/{Domain,Application,Integration,Cqrs}.trx`; logs under `artifacts/task1-correction/`. No tests skipped, no aggregate-only claim.

## Commit

The original Task 1 commit contains the code, scripts/snapshots/manifest, task docs/evidence, and this report. The review correction above is a separate follow-up commit with explicit paths. Exact final SHA is reported in the completion response and available from `git rev-parse HEAD` (a commit cannot contain its own final SHA).
