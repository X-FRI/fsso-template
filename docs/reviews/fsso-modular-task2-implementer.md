# FSSO Modular Refactor — Task 2 Implementer Evidence

Status: DONE (Task 2 only; narrow review fixes applied)
Base commit: `9844dbcaf89bc84558886c4890b0322313ef60cb`
Date: 2026-10-29

## Scope delivered

- Added the Notes-only module under `src/Modules/Notes/{Domain,Application,Infrastructure,Api}`:
  - `Domain/Note.fs`: `NoteId` (UUIDv7), `Note`, validation (trimmed title 1-120, trimmed body max 4000, blank body -> `None`), `create/reconstitute`.
  - `Application`: `Ports.fs` (`INoteStore`), `Commands/CreateNoteCommand.fs`, `Queries/GetNoteQuery.fs`, `Handlers/CreateNoteHandler.fs`, `Handlers/GetNoteHandler.fs` (separate files, one message/handler per file).
  - `Infrastructure`: `Migrations/003_create_notes.sql`, `NotesMigrations.fs` (embedded resource reader), `SqliteNoteStore.fs` with `NoteStoreRegistration`.
  - `Api`: `NoteDtos.fs`, `NoteEndpoints.fs`, `NotesModule.fs`; tags `Notes`, operation IDs `createNote`/`getNote`.
- Added `notes` table plus `ix_notes_created_at_id`; version `003_create_notes`; existing Demo migration bytes untouched.
- Added the Notes store to the shared `SqliteUnitOfWork` and aggregated `DemoMigrations.all @ NotesMigrations.all` in `Fsso.Composition`.
- Host mounts `NotesModule.descriptor` in the fixed descriptor list only; no Notes route literals or DTO/handler types in Host.
- Added `tests/Notes.Tests` with exactly the eight required named cases.
- Regenerated SqlHydra (all-module schema), OpenAPI (7 operations), and the SDK with the repository generators; refreshed full contract hashes.
- Extended `scripts/architecture-check.mjs` with Notes expected edges, Notes -> Demo forbidden source edges, and an executable forbidden fixture under `artifacts/architecture-forbidden-fixture/`.
- Updated `scripts/{structure-check,check-mediatr,check,test,package-source,gen-openapi,gen-sdk}.mjs`, `scripts/contract-hashes.json`, `FssoStack.slnx`, `sqlhydra.toml` unchanged location, and the allowed `tests/Integration.Tests/OpenApiTests.fs` operation-ID list.

Not added by design: Tags, note list/delete, Notes UI, Notes browser tests, Notes unit tests beyond the eight backend cases.

## TDD evidence

The first authored Notes case was driven red before mounting the Notes descriptor, then green after implementing the minimum Notes HTTP path. Subsequent cases were exercised individually.

```text
dotnet test tests/Notes.Tests/Fsso.Notes.Tests.fsproj --filter FullyQualifiedName~ValidationAndMissingIdReturnUniformErrors
# RC=1 red -> artifacts/task2/notes-red.log (fallback 404 instead of 400)
# after mounting NotesModule: RC=0 -> artifacts/task2/notes-first-green.log

# Each named case once, in order (all RC=0):
# artifacts/task2/notes-sequential-summary.txt
# artifacts/task2/notes-sequential.log
```

## Test identities

TRX evidence: `artifacts/task2/trx/{Domain,Application,Integration,Notes}.trx`.

| Suite | Expected | Passed | Failed | Skipped | Names |
| --- | ---: | ---: | ---: | ---: | --- |
| Fsso.Domain.Tests | 5 | 5 | 0 | 0 | exact match |
| Fsso.Application.Tests | 6 | 6 | 0 | 0 | exact match |
| Fsso.Integration.Tests | 20 | 20 | 0 | 0 | exact match |
| Fsso.Cqrs.Tests | 13 | 13 | 0 | 0 | exact 13 (not in original JSON) |
| Fsso.Notes.Tests | 8 | 8 | 0 | 0 | all eight exact required names |

Identity comparison log: `artifacts/task2/test-identities.txt`. No test was skipped; no aggregate-only claim is used.

Notes TRX names:

```text
Fsso.Notes.Tests.NotesTests.CreateAndGetNoteHttpRoundTripPersistsInSqlite
Fsso.Notes.Tests.NotesTests.ValidationAndMissingIdReturnUniformErrors
Fsso.Notes.Tests.NotesTests.MigrationAddsNotesTableAndKeepsDemoMigrationVersions
Fsso.Notes.Tests.NotesTests.RestartPersistenceReadsNoteCreatedBeforeRestart
Fsso.Notes.Tests.TransactionTests.CrossModuleCommitWritesDemoAndNote
Fsso.Notes.Tests.TransactionTests.CrossModuleErrorRollsBackDemoAndNote
Fsso.Notes.Tests.TransactionTests.CrossModuleExceptionRollsBackDemoAndNote
Fsso.Notes.Tests.TransactionTests.CrossModuleCancellationRollsBackDemoAndNote
```

## Verification commands and RCs

Environment block from the plan was exported before every command.

| Gate | Command | RC | Evidence |
| --- | --- | ---: | --- |
| Debug build | `dotnet build FssoStack.slnx -warnaserror` | 0 | `artifacts/task2/build-final.log` (0 warnings/errors) |
| Release build/publish build | `dotnet build FssoStack.slnx -warnaserror -c Release` | 0 | `artifacts/task2/build-release-final.log` |
| Notes suite | `dotnet test tests/Notes.Tests/Fsso.Notes.Tests.fsproj ...` | 0 | 8 passed / 0 failed / 0 skipped |
| Original suites | Domain/Application/Integration/Cqrs test projects | 0 | 5/6/20/13 passed |
| Architecture | `node scripts/architecture-check.mjs` | 0 | `18 projects, 33 Demo/test manifest files`, both fixture violations detected (`artifacts/task2/architecture-check-final.log`) |
| Demo manifest | `git diff --exit-code -- tests/demo-module-files.sha256` | 0 | unchanged (`artifacts/task2/manifest-diff.log`) |
| Demo contract | `node scripts/demo-contract-check.mjs` | 0 | `2 paths, 4 schemas; SDK 4 operations, 24 types` |
| Contract hashes | `node scripts/contract-check.mjs` | 0 | 17 frozen files |
| Frontend/root check | `pnpm check` | 0 | `artifacts/task2/pnpm-check-final.log` |
| Full test orchestration | `pnpm test` | 0 | `artifacts/task2/pnpm-test.log` |

`pnpm test` final summary:

```text
brand check: RC=0
structure check: RC=0
MediatR check: RC=0
contract check: RC=0
architecture check: RC=0
demo contract check: RC=0
build/publish: RC=0
negative control: RC=0
Fsso.Domain.Tests: RC=0 passed=5
Fsso.Application.Tests: RC=0 passed=6
Fsso.Integration.Tests: RC=0 passed=20
Fsso.Cqrs.Tests: RC=0 passed=13
Fsso.Notes.Tests: RC=0 passed=8
backup/restore: RC=0
frontend check: RC=0
frontend unit: RC=0 passed=5
playwright: RC=0 passed=5
```

## Generated contracts and SqlHydra

SqlHydra was regenerated by the repository generator from a real migrated all-module database (`Host --migrate-only` applies Demo + Notes migrations):

```bash
bash scripts/gen-sqlhydra.sh
# RC=0 -> artifacts/task2/gen-sqlhydra.log
# output src/Shared/Fsso.Database/Generated/SqlHydra.fs includes `type notes`
# SHA-256 e197516861edc36f360cce79c9a60d0560b790d0556c7760c106cb795df7cac8
```

The first pre-commit invocation regenerated correctly but exited non-zero at the script's final `git diff --exit-code` because the generated file was not yet committed. The generated file was then staged and the same script rerun; the final invocation was RC=0 with unchanged output. No generated file was hand-edited.

OpenAPI/SDK generation (executed twice; second run produced identical bytes):

```bash
pnpm gen:openapi  # RC=0, 7 operations
pnpm gen:sdk      # RC=0, Demo + Notes operations/types
# diff artifacts/task2/hashes-before-second-gen.txt artifacts/task2/hashes-after-second-gen.txt -> RC=0
```

Frozen hashes:

```text
openapi/openapi.json                                   cc04c144dc35593196c39f28a9b93a192a67cc2d963f471722c247071322ea0e
web/src/lib/api/generated/sdk.gen.ts                   24dc19792fe1ce0a4b8fde246456b26ed163a74df8831663dfaee45f04b22052
web/src/lib/api/generated/types.gen.ts                 145a9378536c04ff463121a098c4cc732c4445041c164822e9ad6f225734bf2f
scripts/contract-hashes.json                           c91d136142f17b88d52ac8e781f11a77522dea144e5b152a06c38d83c9b463ff
src/Shared/Fsso.Database/Generated/SqlHydra.fs         e197516861edc36f360cce79c9a60d0560b790d0556c7760c106cb795df7cac8
src/Modules/Notes/Infrastructure/Migrations/003_create_notes.sql  478bcb80e01009417f2dafbf35a96c81e2ac73c4e2b7b02a07e71ace281032da
```

Expected operations are exactly: `createDemo`, `listDemos`, `getDemo`, `deleteDemo`, `health`, `createNote`, `getNote`.

Demo migration bytes remain identical:

```text
001_create_demos.sql          4de5c1ac5f97d3a389a2c929cf9a5b0bd258ae87feaf8c52859338e3237edad2
002_index_demos_created.sql   353982e483ddd464792bb6c502de8b8a3838f5183950b572f7e98e1de03b405c
```

## Architecture forbidden fixture

`node scripts/architecture-check.mjs` checks the real repository, then writes `artifacts/architecture-forbidden-fixture/` from tracked/untracked source and tests and mutates it with:

1. `Notes.Domain` project reference to `Demo.Infrastructure`.
2. `Notes.Application` source `open Fsso.Infrastructure`.

The script requires both violations to be reported and exits non-zero otherwise. Final run: RC=0, both detected.

## Deviations / notes

- **Release-build boundary fix without extra project edges:** Directly calling the module factory functions from `Fsso.Composition` made the F# signature reader require an unreferenced `Demo.Domain` (and likewise `Notes.Domain`) in a clean Release build, because the Infrastructure assemblies expose module/store types mentioning their domains. Instead of adding `Composition -> *.Domain` project references (which would change the spec graph), `SqliteUnitOfWork` resolves the store interfaces and registration factories by assembly-qualified reflection (`StoreKeys`/`StoreFactory`). The shared UoW still constructs both stores inside one transaction and uses the same `markWrite` counter. Release build and all cross-module runtime tests pass.
- **`Composition.resolveDatabasePath`:** Implemented the same path logic locally (default `data/fsso.db`, `Path.GetFullPath`) instead of calling `Db.resolvePath`. Calling the `Fsso.Database.Db` module value caused the F# signature reader to require an unreferenced `Fsso.Database` assembly in Host with transitive references disabled. Host still reaches database paths only through Composition.
- `scripts/gen-sqlhydra.sh` stops at `git diff --exit-code` until the generated file is committed; the final staged/committed invocation was RC=0.
- No Demo source or other Demo test file was edited. Only `tests/Integration.Tests/OpenApiTests.fs` changed, and only its expected operation-ID list (now the seven exact IDs).

## Narrow review fixes (2026-10-29)

Review-fix evidence directory: `artifacts/task2-fix-20261029-2/` (prior `artifacts/task2/` evidence was preserved).

### Store composition hardening

- `StoreKeys` and `StoreFactory` resolution values are now lazy, so missing types/factories are not hidden inside a module type initializer.
- `Composition.registerInfrastructure` calls `StoreFactory.validate ()` once before startup. Validation forces both store interfaces and both registration factories, so a missing registration fails immediately with the exact type/assembly name.
- Reflection invocation now checks that the returned object implements the expected store interface; a wrong return type fails with the expected and actual type names.
- Store construction remains inside the transaction `try` block, so construction failures follow the rollback/error-mapping path.
- `scripts/store-registration-negative.mjs` copies `src/` and `Directory.Build.props`, renames `module NoteStoreRegistration`, builds/runs Host, and requires a non-zero startup RC, the exact missing-registration message, and no `Now listening on:` line.
- Dead `NoteId.value`/`NoteId.parse` and the unused Notes `typeKey` were removed. No Demo source or manifest file was changed.

```text
node scripts/store-registration-negative.mjs
# RC=0 -> artifacts/task2-fix-20261029-2/store-registration-negative-outer.log
# Host startup RC=134 (expected), message:
# Store registration Fsso.Notes.Infrastructure.NoteStoreRegistration was not found
# at Fsso.Composition.StoreFactory.validate() via Composition.registerInfrastructure
# Host log: artifacts/store-registration-negative.log
```

### No-git architecture check

- Manifest collection and forbidden-fixture collection both use Git only when `git rev-parse --show-toplevel` equals the analyzed root. Otherwise they walk `src/`, `tests/`, and `Directory.Build.props` from the filesystem.
- This also covers an extracted source tree nested under a parent Git checkout, where Git would otherwise discover the wrong repository.
- The two existing negative controls and the Demo/test manifest check remain active and must pass.
- Final proof used `git archive HEAD` at `a8b087d54bc357a43ddc614aa4f1fab7480df1ee`, extracted to `<approved-scratch>/task2-fix-a8b087d` with no `.git` metadata.

```text
node scripts/architecture-check.mjs  # in extraction
# RC=0 -> artifacts/task2-fix-20261029-2/architecture-no-git-final.log
# architecture-check: OK (18 projects, 33 Demo/test manifest files;
#   forbidden fixture detected both violations)
# Archive: artifacts/task2-fix-20261029-2/no-git-source-a8b087d.tar.gz
```

### Review-fix verification

| Gate | Command | RC | Evidence |
| --- | --- | ---: | --- |
| Debug build | `dotnet build FssoStack.slnx -warnaserror` | 0 | `artifacts/task2-fix-20261029-2/build.log` (0 warnings/errors) |
| Missing-registration startup | `node scripts/store-registration-negative.mjs` | 0 | outer log above; startup RC=134 expected |
| Architecture, repo | `node scripts/architecture-check.mjs` | 0 | `architecture-repo.log`, both controls |
| Architecture, no-git archive | `node scripts/architecture-check.mjs` in extraction | 0 | `architecture-no-git-final.log`, both controls |
| Demo contract | `node scripts/demo-contract-check.mjs` | 0 | `demo-contract.log` |
| Structure | `node scripts/structure-check.mjs` | 0 | `structure.log` |
| MediatR | `node scripts/check-mediatr.mjs` | 0 | `mediatr.log` |
| Demo manifest unchanged | `git diff --exit-code -- tests/demo-module-files.sha256` | 0 | `manifest-diff.log` |
| Demo source unchanged | `git diff --exit-code 4d4402ce..HEAD -- src/Modules/Demo tests/demo-module-files.sha256` | 0 | `demo-source-diff.log` |
| Notes suite | `dotnet test tests/Notes.Tests/Fsso.Notes.Tests.fsproj ...` | 0 | 8 passed / 0 failed / 0 skipped |
| Original suites | Domain/Application/Integration/Cqrs test projects | 0 | 5/6/20/13 passed / 0 failed / 0 skipped |

Targeted test TRX files use the fresh directory `artifacts/task2-fix-20261029-2/trx/`; logs are `test-{Notes,Domain,Application,Integration,Cqrs}.log`. Per review instruction, `pnpm test` was not rerun in the main repository this turn.

### Process deviation

An earlier test invocation overwrote the disposable `artifacts/test-trx/` directory, and each architecture check recreates `artifacts/architecture-forbidden-fixture/`. Only generated artifact paths were affected; no source file, user data, or application database was modified. This fix round used fresh result directories and preserved all prior evidence.

## Commit

Committed explicit paths only (no `git add -A`). The implementation commit was `7b32de77b5087c071d3feadfcdf4155cc6672f34`; the final documentation-amendment SHA is reported in the completion response and is available from `git rev-parse HEAD` (a commit cannot contain its own final SHA).

Review-fix commits:

- `470edaed182dcb0d8349e4bb7ac278bf0ae87d0e` — harden store registration and add no-git architecture fixture handling.
- `78e710ea3f6e4dee295d95066368b322721aa09c` — ignore a parent Git checkout when checking extracted source.
- `a8b087d54bc357a43ddc614aa4f1fab7480df1ee` — silence Git probes during no-git checks; final no-git archive proof.

Post-commit generator re-run at `7b32de7`:

```bash
bash scripts/gen-sqlhydra.sh
# RC=0 -> artifacts/task2/gen-sqlhydra-post-commit.log
# SHA-256 e197516861edc36f360cce79c9a60d0560b790d0556c7760c106cb795df7cac8
node scripts/architecture-check.mjs
# RC=0 -> 18 projects, 33 Demo/test manifest files, both forbidden fixture violations
```
