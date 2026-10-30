# FSSO Stack Modular Hexagonal/CQRS Implementation Plan

> Coordinator: serial single-writer tasks, then independent spec-compliance review, then code-quality review. Read `docs/fsso-modular-spec.md` first. Every task is local-commit only; push/deploy is forbidden at every step.

**Baseline:** `08b7116843b86cfebed2f3c1b9ddfa03284b6453` (clean). Backend baseline executed RC0 individually: Domain 5, Application 6, Integration 20, CQRS 13. Frontend/Playwright baseline only listed 5+5 identities; they were not executed then. Historical archive evidence is not reused.
**Goal:** module layout with compile-enforced boundaries, shared cross-module SQLite unit of work, a SMALL Notes-only example module (one table, one command, one query), executable architecture checks, preserved Demo contract/new generated OpenAPI/SDK, and a new independently verified archive.

## Global constraints

- One active writer. TDD/vertical slices: name the failing test and run it before each production behavior. New cases counted by name separately.
- Preserve exact identities: 31 backend, 13 CQRS, 5 frontend unit, 5 Playwright Demo. No skipped tests; no aggregate-only claims.
- No Notes UI and no new browser/unit cases. Notes evidence is backend HTTP/SQLite + integration tests.
- No push, deploy, credentials, global config, real DBs. Temp under project `artifacts/` or approved scratch, never `/tmp`.
- Generated SqlHydra/OpenAPI/SDK only from generators; never hand-edit.

## Environment (every task)

```bash
cd <repository-root>
export PATH="$PWD/.tools/bin:$PWD/.tools/dotnet:/Users/somhairle/.hermes/tools/node-26.7.0-darwin-x64/bin:$PATH"
export DOTNET_ROOT="$PWD/.tools/dotnet"
export PLAYWRIGHT_BROWSERS_PATH="$PWD/.tools/playwright-browsers"
export npm_execpath=/Users/somhairle/.npm/_npx/6f08beb95ac65f4b/node_modules/pnpm/bin/pnpm.cjs
export TMPDIR="$PWD/artifacts/tmp"; mkdir -p "$TMPDIR"
```

`.tools/bin/pnpm` is a project-local wrapper. `.tools` is not deliverable.

## Task 1 — Shared kernel/database/API, Demo module split, composition, Host mounting

**Objective:** working Demo vertical slice under `src/Modules/Demo`, unchanged behavior, old tests preserved by name.

**Create exactly:**
- `src/Shared/Fsso.SharedKernel/Fsso.SharedKernel.fsproj`; compile order `Errors.fs`, `UnitOfWork.fs`, `Faults.fs`.
- `src/Shared/Fsso.Database/Fsso.Database.fsproj`; compile order `Db.fs`, `Migrations.fs`, `Generated/SqlHydra.fs`, `Tables.fs`; packages Microsoft.Data.Sqlite 10.0.14, SqlHydra.Query 5.1.1; ref SharedKernel.
- `src/Shared/Fsso.Api/Fsso.Api.fsproj`; `FrameworkReference Microsoft.AspNetCore.App`; package Microsoft.AspNetCore.OpenApi 10.0.14; compile `SharedDtos.fs`, `HttpResults.fs`, `ModuleDescriptor.fs`, `OpenApiSupport.fs`; ref SharedKernel.
- `src/Modules/Demo/Domain/Fsso.Modules.Demo.Domain.fsproj` + `Demo.fs` (byte-for-byte move of `src/Domain/Domain.fs`, keeping `ValidatedDemo`; only path changes).
- `src/Modules/Demo/Application/Fsso.Modules.Demo.Application.fsproj`; compile `Ports.fs`, `Commands/CreateDemoCommand.fs`, `Commands/DeleteDemoCommand.fs`, `Queries/GetDemoQuery.fs`, `Queries/ListDemosQuery.fs`, `Handlers/CreateDemoHandler.fs`, `Handlers/GetDemoHandler.fs`, `Handlers/ListDemosHandler.fs`, `Handlers/DeleteDemoHandler.fs`; packages FsToolkit.ErrorHandling 5.2.0, MediatR 12.5.0; ref Demo.Domain + SharedKernel.
- `src/Modules/Demo/Infrastructure/Fsso.Modules.Demo.Infrastructure.fsproj`; compile `DemoMigrations.fs`, `SqliteDemoStore.fs`; embed `Migrations/001_create_demos.sql`, `Migrations/002_index_demos_created.sql` (SHA-verified byte moves); packages Microsoft.Data.Sqlite 10.0.14, SqlHydra.Query 5.1.1; ref Demo Domain/Application + SharedKernel + Database.
- `src/Modules/Demo/Api/Fsso.Modules.Demo.Api.fsproj`; `FrameworkReference Microsoft.AspNetCore.App`; compile `DemoDtos.fs`, `DemoOpenApi.fs`, `DemoEndpoints.fs`, `DemoModule.fs`; package `Microsoft.AspNetCore.OpenApi 10.0.14`, `MediatR 12.5.0`; ref Demo Domain/Application + SharedKernel + Fsso.Api.
- `src/Composition/Fsso.Composition/Fsso.Composition.fsproj`; compile `SqliteWorkScope.fs`, `SqliteUnitOfWork.fs`, `Composition.fs`; refs per spec; packages Microsoft.Data.Sqlite 10.0.14, SqlHydra.Query 5.1.1.
- Modify `src/Host/Fsso.Host.fsproj` and `src/Host/Program.fs`; move `HttpDtos.fs`/`HttpResults.fs`/`OpenApi.fs` as spec §2 says; delete the old files and old `src/{Domain,Application,Infrastructure}` projects after the move.
- Required `Directory.Build.props` edit: add `<DisableTransitiveProjectReferences>true</DisableTransitiveProjectReferences>`.
- `FssoStack.slnx`: new product projects + existing 4 test projects.
- Update `sqlhydra.toml` to keep `output = "Generated/SqlHydra.fs"` with `--project src/Shared/Fsso.Database/Fsso.Database.fsproj` (effective path `src/Shared/Fsso.Database/Generated/SqlHydra.fs`), namespace `Fsso.Database.Generated`; update `scripts/gen-sqlhydra.sh` `GENERATED` path; regenerate (Demo schema only at this stage), never hand-edit.
- Update `scripts/structure-check.mjs` for the new layout and old-path absence; update `scripts/check-mediatr.mjs` to scan Demo.Application (and future Notes.Application) for exactly one MediatR 12.5.0 reference.
- Add `scripts/architecture-check.mjs` with `checkRepository(root)`, real-source checks, and `tests/demo-module-files.sha256` manifest (all tracked files under `src/Modules/Demo` plus all tracked files under the four existing test project directories, including `.fsproj`, except `tests/Integration.Tests/OpenApiTests.fs`).
- Add `scripts/demo-contract.json`, `scripts/demo-sdk-contract.json`, `scripts/demo-contract-check.mjs`, generated from baseline `git show 08b7116:openapi/openapi.json` and `git show 08b7116:web/src/lib/api/generated/{sdk.gen.ts,types.gen.ts}` using the snapshot rules in spec §7.

**Required behavior:** implement spec §3–§5 exactly. `Program.fs` mounts a descriptor list and contains no Demo route literals/types; `DemoEndpoints`/`DemoModule` separate; one command/query and one handler per file; shared UoW outside Demo; read-only Ok rolls back; write Ok commits; Error/exception/cancellation roll back/rethrow.

**TDD/verification (exact):**
1. First failing check: `dotnet build FssoStack.slnx -warnaserror` after shared scope test stub is added; then implement incrementally.
2. SHA check Demo migrations against `git show 08b7116:src/Infrastructure/Migrations/...` identical.
3. `node scripts/structure-check.mjs` RC0; `node scripts/check-mediatr.mjs` RC0; `node scripts/architecture-check.mjs` RC0; `node scripts/demo-contract-check.mjs` RC0.
4. `dotnet test tests/Domain.Tests/Fsso.Domain.Tests.fsproj --logger "trx;LogFileName=Domain.trx" --results-directory artifacts/task1/trx`; same Application/Integration/Cqrs. Compare TRX names to `tests/original-test-names.json` and `docs/evidence/baseline-backend-test-identities.json` (exact 5/6/20/13).
5. After the Environment block: `pnpm check` RC0 (frontend unchanged).
6. Commit explicit paths only. Record command/RC in `docs/reviews/fsso-modular-task1-implementer.md`.

**Boundary:** no Notes module, no OpenAPI operation change, no Demo contract/DB semantic change, no frontend edits.

## Task 2 — Notes-only module, SQLite/migration, cross-module proofs, generated contracts, architecture fixture

**Objective:** add a small real Notes module without editing Demo files; regenerate all generated contracts; add executable architecture detection; wire full test orchestration.

**Create:**
- `src/Modules/Notes/Domain/Fsso.Modules.Notes.Domain.fsproj` + `Note.fs` (`NoteId`, `Note`, validation).
- `src/Modules/Notes/Application/Fsso.Modules.Notes.Application.fsproj`; compile `Ports.fs`, `Commands/CreateNoteCommand.fs`, `Queries/GetNoteQuery.fs`, `Handlers/CreateNoteHandler.fs`, `Handlers/GetNoteHandler.fs`; packages FsToolkit.ErrorHandling 5.2.0, MediatR 12.5.0; ref Notes.Domain + SharedKernel.
- `src/Modules/Notes/Infrastructure/Fsso.Modules.Notes.Infrastructure.fsproj`; compile `NotesMigrations.fs`, `SqliteNoteStore.fs`; embed `Migrations/003_create_notes.sql`; refs/packages per spec.
- `src/Modules/Notes/Api/Fsso.Modules.Notes.Api.fsproj`; compile `NoteDtos.fs`, `NoteEndpoints.fs`, `NotesModule.fs`; package `Microsoft.AspNetCore.OpenApi 10.0.14`, `MediatR 12.5.0`; refs per spec.
- `tests/Notes.Tests/Fsso.Notes.Tests.fsproj`, `Support.fs`, `NotesTests.fs`, `TransactionTests.fs`; refs per spec.

**Modify:** `src/Composition/Fsso.Composition/*` (register Notes store + aggregate migrations), `src/Host/Program.fs` only via descriptor list, `FssoStack.slnx`, `sqlhydra.toml`/`gen-sqlhydra.sh` (already new location), `scripts/gen-openapi.mjs` (7 IDs), `scripts/gen-sdk.mjs` (Demo+Notes), `scripts/contract-hashes.json`, `scripts/structure-check.mjs` (Notes paths), `scripts/check-mediatr.mjs` (both Application projects), `scripts/test.mjs` (Notes suite separate), `tests/Integration.Tests/OpenApiTests.fs` (only expected operation-ID list -> 7 exact IDs), README module note later in Task 3.

**Notes API:** `POST /api/notes` -> 201 with Location; `GET /api/notes/{id}` -> 200; operation IDs `createNote`, `getNote`. One table `notes`, version `003_create_notes`. No Tags/list/delete/UI.

**New tests (exact names, counted separately):**
- `Fsso.Notes.Tests.NotesTests.CreateAndGetNoteHttpRoundTripPersistsInSqlite`
- `Fsso.Notes.Tests.NotesTests.ValidationAndMissingIdReturnUniformErrors`
- `Fsso.Notes.Tests.NotesTests.MigrationAddsNotesTableAndKeepsDemoMigrationVersions`
- `Fsso.Notes.Tests.NotesTests.RestartPersistenceReadsNoteCreatedBeforeRestart`
- `Fsso.Notes.Tests.TransactionTests.CrossModuleCommitWritesDemoAndNote`
- `Fsso.Notes.Tests.TransactionTests.CrossModuleErrorRollsBackDemoAndNote`
- `Fsso.Notes.Tests.TransactionTests.CrossModuleExceptionRollsBackDemoAndNote`
- `Fsso.Notes.Tests.TransactionTests.CrossModuleCancellationRollsBackDemoAndNote`

Use a fresh isolated DB under `artifacts/notes/` per case; direct SQLite assertions for rows; restart opens a second Host on the same path.

**Generated contract flow:**
1. After the Environment block: `pnpm gen:openapi` RC0 -> 7 operations.
2. After the Environment block: `pnpm gen:sdk` RC0 -> Demo+Notes exports.
3. `bash scripts/gen-sqlhydra.sh` on a migrated all-module DB.
4. `node scripts/demo-contract-check.mjs` RC0; update `scripts/contract-hashes.json` with fresh full hashes; generation twice and compare SHA-256.
5. Update `tests/original-test-names.json` only if project paths change, never names.

**Architecture check extension:** reject Notes -> Demo edges and source imports; extend `scripts/architecture-check.mjs` to create `artifacts/architecture-forbidden-fixture/` with (a) Notes.Domain -> Demo.Infrastructure project ref and (b) Notes.Application importing a Demo Infrastructure namespace, and require both violations to be detected. Verify `tests/demo-module-files.sha256` unchanged.

**Script orchestration:** `scripts/test.mjs` runs original Domain/Application/Integration exact names, Cqrs exactly 13, Notes suite separately with 8 names, original frontend 5 identities, original Playwright Demo 5 identities; no Notes frontend/browser.

**TDD/verification:**
1. First failing test is one of the eight named cases: `Fsso.Notes.Tests.NotesTests.ValidationAndMissingIdReturnUniformErrors`; implement the minimum domain/handler/API path until green, then take the next named case one at a time. Do not add a ninth Notes test.
2. `dotnet build FssoStack.slnx -warnaserror` RC0.
3. `dotnet test tests/Notes.Tests/Fsso.Notes.Tests.fsproj ...` all 8 pass, none skipped.
4. All original suites exact-name pass; Cqrs 13.
5. `node scripts/architecture-check.mjs` RC0 including forbidden-fixture detection and Demo manifest unchanged; add both this and `node scripts/demo-contract-check.mjs` to `scripts/check.mjs`, `scripts/test.mjs`, and `scripts/package-source.mjs` (package invokes both before `git archive`).
6. `node scripts/demo-contract-check.mjs` RC0; generation twice stable.
7. After the Environment block: `pnpm check` RC0; full `pnpm test` RC0 (published build, 5 Demo browser journeys, frontend unit 5, backup/restore).
8. Commit explicit paths. Record evidence in `docs/reviews/fsso-modular-task2-implementer.md`.

**Boundary:** no Demo edits except `tests/Integration.Tests/OpenApiTests.fs` expected-ID list; no Tags/Notes UI/browser; no hand-edited generated files.

## Task 3 — Bilingual docs, full validation, NEW archive, independent extraction, final report

**Modify:** `README.md`, `README_zh.md`, `docs/ledger.md` if present, `scripts/package-source.mjs`, `scripts/structure-check.mjs` (archive name), scripts required-file list; add `docs/reviews/fsso-modular-final-report.md` and `docs/reviews/fsso-modular-review-log.md`.

**Docs:** module copy guide, actual dependency diagram, exact add-module steps (add module projects/migration/descriptor/composition/generated script points), Notes example and its two endpoints, shared cross-module UoW, exact commands, honest counts, no legacy branding. English/Chinese factual parity.

**Exact validation block (capture RC + logs under `artifacts/final/`):**
After the Environment block:
```bash
pnpm check
pnpm test
pnpm build
node scripts/release-smoke.mjs
node scripts/sqlite-backup-check.mjs
pnpm exec playwright test --config web/playwright.config.ts web/e2e/demo.spec.ts
node scripts/architecture-check.mjs
node scripts/demo-contract-check.mjs
```
Then commit the complete source, confirm clean tree, create `artifacts/fsso-modular-source.tar.gz` (NEW name) via updated `node scripts/package-source.mjs`; record absolute path and SHA-256; assert required files present and `.tools`, `node_modules`, secrets, `.git`, DBs/logs/artifacts absent.

**Fresh extraction validation:** extract the NEW archive under `artifacts/independence/` (never reuse old archive evidence), run frozen pnpm install, `pnpm check`, `pnpm test`, start published single process, HTTP Demo CRUD + Notes create/get, restart persistence, SQLite backup/restore, static SPA. Record exact commands/RC/log paths and bind to the committed SHA.

**Final:** commit frozen identity; write `docs/reviews/fsso-modular-final-report.md` with hashes/counts/archive path/independent results/gaps and every reviewer task ID/verdict. No push.

## Review gates

Per task: implementer -> independent spec-compliance reviewer (read-only) -> independent code-quality reviewer (read-only) -> fix critical/important and re-review. Final independent integration reviewer on frozen commit. Record real native task session IDs/verdicts.
