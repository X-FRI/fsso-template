# pre-FSSO starter — Spec and Design

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


Status: proposed, awaiting independent document review and leader approval.
Date: 2026-10-28
Reference: `<historical-reference>` (NestJS CQRS demo slice + Svelte/shadcn/OpenAPI pipeline). This is a clean-room F# counterpart, not a port of reference business code.

## 1. Goal and scope

Build a runnable, tested fullstack starter that demonstrates one complete vertical slice (Demo create/get/list/delete with pagination) using F# on the backend and Svelte on the frontend. The slice must be production-shaped: typed application flow, real SQLite persistence and transactions, real OpenAPI-to-SDK generation, real UI, and one-process production hosting.

In scope: the four F# projects, SQLite migrations, SqlHydra-backed queries, HTTP API and OpenAPI, generated TypeScript SDK, Svelte/shadcn-svelte CRUD UI, root commands, Chinese README, tests, source archive and reproducible independent release. Out of scope: authentication, MediatR, Effect, queues, accounting/funds, real patient data, deployment, cloud infrastructure, and any remote push.

## 2. Architecture and enforced dependencies

```
src/Domain          (no ASP.NET, no SQL, no Infrastructure)
src/Application     -> Domain only
src/Infrastructure  -> Application, Domain
src/Host            -> Application, Infrastructure, Domain (composition root)
tests/*             -> projects under test (test-only)
```

`Directory.Build.props` sets nullable/audit/warnings; each `.fsproj` lists only allowed project references. Dependency enforcement is compile-enforced by references (Domain has no reference to Application/Infrastructure; Application references Domain only).

### File roles

| Path | Responsibility |
|---|---|
| `src/Domain/Domain.fs` | `DemoId`, `Demo`, validation/smart constructor, domain errors; pure F#. |
| `src/Application/Errors.fs` | `AppError`/`ErrorKind` (Validation, NotFound, Conflict, Unexpected), helpers. |
| `src/Application/Ports.fs` | `IDemoStore`, `IUnitOfWork`, `IFaultInjector` interfaces; no infra types. |
| `src/Application/DemoHandlers.fs` | Explicit `createDemo`, `getDemo`, `listDemos`, `deleteDemo` functions using `taskResult`; deterministic validation; fixed `DemoHandlers` record. |
| `src/Infrastructure/Migrations.fs` | Embedded, versioned SQL migrations; idempotent transaction-per-migration runner. |
| `src/Infrastructure/Generated/SqlHydra.fs` | Checked-in output of SqlHydra.Cli for the migrated SQLite schema. |
| `src/Infrastructure/SqliteDemoStore.fs` | SqlHydra.Query implementation of `IDemoStore`; no hand-written SQL for CRUD. |
| `src/Infrastructure/SqliteUnitOfWork.fs` | Opens connection/transaction; commit on Ok, rollback on Error and on exception; maps exceptions. |
| `src/Host/HttpDtos.fs` | HTTP request/response/error DTOs, distinct from Domain. |
| `src/Host/HttpResults.fs` | Single `AppError -> IResult` mapping and error DTO serialization. |
| `src/Host/OpenApi.fs` | Document metadata, operation IDs, complete success/error responses. |
| `src/Host/Program.fs` | Fixed DI registrations, migration startup, middleware pipeline, endpoints, static SPA fallback, export mode. |
| `web` | Vite + Svelte 5 + TS + shadcn-svelte; consumes generated SDK. |
| `openapi/openapi.json` | Actual server-exported OpenAPI document (checked artifact). |
| `scripts/*` | Cross-platform Node orchestration for dev/build/check/test/gen/package. |
| `sqlhydra.toml` | SqlHydra SQLite generation config. |

## 3. Domain and application flow

`Demo` fields: `id: DemoId` (UUIDv7 string), `name` (trimmed, 1–100 chars), `description: string option` (trimmed, max 500; blank becomes None), `createdAt`/`updatedAt` (UTC). Creation assigns id and timestamps. Name is unique case-insensitively at the database level; duplicate create is a domain conflict.

`AppError` is the single error type shared by Application and Host: `{ Kind: ErrorKind; Code: string; Message: string; Cause: exn option }`, with `Code` (`validation|not_found|conflict|unexpected`), a safe public `Message`, and an internal `Cause` never serialized (no separate `DemoError` type). Application functions return `Task<Result<_, AppError>>` and use `FsToolkit.ErrorHandling.taskResult` for the success/error pipeline. No MediatR, reflection bus, or runtime handler discovery. Host registers the fixed `DemoHandlers` record and port implementations explicitly.

Exact Application contracts (F# signatures; JSON names in brackets):

```fsharp
type PagedDemos = { Items: Demo list; Total: int64 }
type IDemoStore =
    abstract FindById: DemoId * CancellationToken -> Task<Demo option>
    abstract List: page:int * limit:int * CancellationToken -> Task<PagedDemos>
    abstract Insert: Demo * CancellationToken -> Task<Result<unit, AppError>>
    abstract Delete: DemoId * CancellationToken -> Task<unit>
type IUnitOfWork =
    abstract Run<'T>: work:(IDemoStore -> CancellationToken -> Task<Result<'T, AppError>>) -> ct:CancellationToken -> Task<Result<'T, AppError>>
type IFaultInjector =
    abstract AfterWrite: CancellationToken -> Task<Result<unit, AppError>>
type DemoHandlers = {
    Create: CreateDemoCommand -> CancellationToken -> Task<Result<Demo, AppError>>
    Get: GetDemoQuery -> CancellationToken -> Task<Result<Demo, AppError>>
    List: ListDemosQuery -> CancellationToken -> Task<Result<PagedDemos, AppError>>
    Delete: DeleteDemoCommand -> CancellationToken -> Task<Result<unit, AppError>> }
```

Commands wrap their effects in `IUnitOfWork.Run`; query handlers use a read-only store. The unit of work is the transaction boundary for each command (create and delete included); it commits only on `Ok`, rolls back on `Error` and on any exception. Non-cancellation exceptions map to `Unexpected`; `OperationCanceledException`/task cancellation rolls back and is rethrown so cancellation is never a 500. Reads never commit. `Insert` returns `Result`: Infrastructure catches SQLite UNIQUE constraint failures (extended code 2067 / primary 19) and maps them to `Conflict`; an optional application pre-check narrows the race but the constraint is authoritative. A test-only, default-off fault injector (`<legacy>_FAULT_INJECTION=1` plus `X-Test-Fault: error-after-write|throw-after-write|delay-before-commit (bounded max 2s)`) is invoked after a write (create or delete) inside the transaction so rollback can be exercised end-to-end. It is rejected/ignored unless explicitly enabled and is documented; no destructive debug endpoint exists in normal mode.

Pagination: `page >= 1` (default 1), `limit` 1–100 (default 10); stable order `created_at DESC, id DESC`; `total` from a count query in the same read. Invalid/non-numeric/repeated query values -> validation error 400. The pagination test seeds rows with identical `created_at` and asserts exact `id DESC` tie-break, total, default page/limit, boundaries, and non-overlapping page slices.

## 4. Persistence, migrations, transactions

SQLite via `Microsoft.Data.Sqlite` and `SqlHydra.Query` 5.1.1. DB path from `<legacy>_DB_PATH` (default `data/<legacy>.db`, resolved relative to the run/publish working directory), parent directory created. Connection string uses the file path; foreign keys/busy timeout configured.

Versioned embedded migrations (`001_create_demos.sql`, `002_index_demos_created.sql`) run at startup in a transaction each, recorded in `schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT)`. Re-running on the same DB applies nothing and leaves history intact. The `demos` table: `id TEXT PRIMARY KEY`, `name TEXT NOT NULL COLLATE NOCASE`, `description TEXT NULL`, `created_at TEXT NOT NULL`, `updated_at TEXT NOT NULL`, unique index on `name COLLATE NOCASE`, index `(created_at DESC, id DESC)`. Timestamps are ISO-8601 UTC.

SqlHydra is real: generated types/readers/table declarations/`QueryContextFactory` are checked in, regenerated by `scripts/gen-sqlhydra.sh` (run `<legacy>_DB_PATH=artifacts/schema.db dotnet run --project <legacy-host> -- --migrate-only`, then `dotnet sqlhydra sqlite -t sqlhydra.toml`), and used by `SqliteDemoStore` for find, list rows, insert, and delete. Exact split: `total` count and migrations use parameterized `Microsoft.Data.Sqlite` on the same opened connection/transaction; CRUD is not a hand-written SQL replacement. Regeneration must leave `git diff --exit-code -- src/Infrastructure/Generated/SqlHydra.fs` clean.

## 5. HTTP contract

Base path `/api`. All endpoints return JSON except DELETE 204.

| Method/path | Success | Errors | Operation ID |
|---|---|---|---|
| `POST /api/demos` | 201 `DemoResponse`, `Location` | 400, 409, 500 | `createDemo` |
| `GET /api/demos?page=&limit=` | 200 `PagedDemoResponse` | 400, 500 | `listDemos` |
| `GET /api/demos/{id}` | 200 `DemoResponse` | 400 (bad id), 404, 500 | `getDemo` |
| `DELETE /api/demos/{id}` | 204 | 400, 404, 500 | `deleteDemo` |
| `GET /openapi/v1.json` | 200 OpenAPI | – | – |
| `GET /api/health` | 200 `{status:"ok"}` | 500 | `health` |

`CreateDemoRequest = { name: string (required, trimmed, 1-100 chars), description: string|null (optional, trimmed, max 500; null/blank -> None) }`; both fields are camelCase. `DemoResponse = { id, name, description: string|null, createdAt: string, updatedAt: string }`. `PagedDemoResponse = { data: DemoResponse[], page, limit, total }` (`total: int64`). `ErrorResponse = { statusCode: number, code: string, message: string, traceId: string }` with no exception/stack details. JSON uses camelCase for all DTO members. DTOs live in Host and are never domain records.

One pipeline: exception middleware (JSON 400 for malformed JSON/binding, 500 unified error for unhandled exceptions, cancellation propagates and is not reported as 500; in-flight transaction work rolls back) -> routing -> endpoints -> `toHttpResult` for every application result. Status mapping is centralized: Validation 400, NotFound 404, Conflict 409, Unexpected 500. Delete missing -> 404. Duplicate name -> 409 from a unique-constraint race or pre-check. Every error is the same DTO shape. Cancellation tokens flow to DB calls.

OpenAPI is produced from the running app (export mode writes `openapi/openapi.json`, and the app serves `/openapi/v1.json`; a test asserts the served document deep-equals the checked-in export, including POST request schema and the exact per-operation status matrix). `Microsoft.AspNetCore.OpenApi` plus document/operation transformers add: documented request/response schemas for every operation, success codes above, all error codes that can occur, `ErrorResponse` component, tags, summaries, and stable operation IDs. `pnpm gen:openapi` regenerates the file from actual server code; `pnpm gen:sdk` runs `@hey-api/openapi-ts` from that file. Generated SDK artifacts are checked in; the frontend imports generated functions/types rather than re-declaring fetch DTOs.

## 6. Frontend

Vite + Svelte 5 (runes) + TypeScript. `components.json` + Tailwind CSS + actual shadcn-svelte component files built on `bits-ui`/`tailwind-variants`/`clsx`/`tailwind-merge` (Button, Input, Textarea, Card, Badge, AlertDialog and supporting utils). The page provides: create form with validation feedback, list with deterministic pagination controls, detail view, delete confirmation, and explicit loading/error/empty states. Controls are visible and accessible via labels/roles (no axe gate is required). It calls the generated SDK with a configured base URL; in dev Vite proxies `/api` and `/openapi` to the F# host. No simulated results or cosmetic-only controls, and no raw fetch/axios outside generated SDK code.

## 7. Commands, production, reproducibility

Root `package.json` scripts: `dev`, `build`, `check`, `test`, `gen:openapi`, `gen:sdk`. `pnpm` 10.30.3 via npx/local, Node 26, .NET SDK 10.0.403.

- `dev`: Node orchestrator starts `dotnet run` (127.0.0.1:5080) and Vite; Vite proxies API; Ctrl-C terminates both.
- `build`: frontend build -> copy `dist` into `src/Host/wwwroot` -> `dotnet publish -c Release -o artifacts/publish`. The published app serves `wwwroot` and API from one .NET process; no Node at runtime.
- `check`: `dotnet build` (warnings as errors where feasible) + frontend `svelte-check`.
- `test`: F# domain/application/integration/HTTP tests + frontend unit/build + Playwright browser journey against a real published/running app. Test artifacts stay under project `artifacts/` or the approved scratch directory.
- `gen:openapi`: exports the actual OpenAPI document. `gen:sdk`: regenerates SDK.
- `scripts/package-source.mjs`: commits all source/scripts/README first, then `git archive HEAD` excluding `.tools`, dependencies, caches, credentials, DBs, logs, artifacts; assert the archive contains `README.md`, `package.json`, `pnpm-lock.yaml`, `scripts/build.mjs`, `scripts/test.mjs`, `scripts/package-source.mjs`. All paths are relative to the extracted root. Independence means source/assets/scripts resolve from the new root; the already-verified external SDK may be supplied via an external absolute `PATH`/`DOTNET_ROOT` (not via the original checkout). Build the extracted archive, start its published output, and record `which dotnet`, `dotnet --version`, RCs.

`src/Host/wwwroot/` is generated build output and git-ignored. SPA fallback: API routes and `/api/{**rest}` are mapped before `MapFallbackToFile("index.html")`, so an unknown API path returns a JSON 404, never index HTML. Static files served only in production/published output.

## 8. Configuration (documented fully in README)

| Variable | Default | Read by | Secret | Purpose |
|---|---|---|---|---|
| `<legacy>_DB_PATH` | `data/<legacy>.db` | Host/Infrastructure | no | SQLite file; parent dir auto-created. |
| `ASPNETCORE_URLS` | `http://127.0.0.1:5080` | Host | no | Listen address (dev script sets it). |
| `ASPNETCORE_ENVIRONMENT` | `Production` for published app | Host | no | Environment. |
| `<legacy>_FAULT_INJECTION` | unset/off | Host | no | Enables test-only fault header; must be `1`. |
| `VITE_API_BASE_URL` | empty (same origin) | Frontend build | no | Optional absolute API base. |
| `BASE_URL` | `http://127.0.0.1:5080` | Playwright | no | Browser test target. |
| `PATH`, `DOTNET_ROOT` | toolchain | scripts | no | Toolchain discovery; no secrets. |

No credentials are required. Nothing is read from `~/.hermes/.env` or global auth.

## 9. Acceptance/evidence matrix (every product requirement)

| Requirement | Design evidence | Planned automated evidence |
|---|---|---|
| Four projects + enforced dependencies | §2 project refs | `dotnet build`; project reference inspection; Domain has no ASP.NET/SQL package. |
| Explicit handlers/fixed DI, no MediatR | §3 | Source review; no CQRS/bus/reflection registration. |
| FsToolkit taskResult flow + uniform error mapping | §3, §5 | Application tests; HTTP tests 400/404/409/500 all parse same `ErrorResponse`. |
| Malformed JSON/query/cancellation | §5 | HTTP tests POST malformed JSON, non-numeric/oversized page/limit; cancellation propagated. |
| SqlHydra + Microsoft.Data.Sqlite, meaningful use | §4 | `gen-sqlhydra` script run; generated file tracked; CRUD integration against real DB; no mock DB. |
| Versioned migrations, transaction boundary, rollback, no write queries | §3, §4 | Migration idempotency test; UoW integration tests proving insert visible then rolled back on Error and exception; read tests leave state unchanged. |
| Create/get/list/delete + pagination + validation + stable order | §3 | HTTP CRUD + deterministic pagination/tie-break tests; invalid input 400. |
| Persistence across restart | §4 | Start app, create, stop, start same DB, read back. |
| HTTP DTOs separate from domain | §2, §5 | Source review; serialization tests. |
| Real OpenAPI, complete success/error, status, operation IDs | §5 | OpenAPI JSON assertions; served document equals exported artifact. |
| @hey-api SDK from actual OpenAPI, frontend consumes it | §5, §6 | `pnpm gen:openapi`, `pnpm gen:sdk` execute; generated SDK imported; frontend check/build. |
| Svelte/shadcn CRUD UI, states, connected API | §6 | `svelte-check`; build; Playwright first-use create/detail/delete/readback. |
| Root commands | §7 | Run each command; capture RC/output. |
| Dev proxy; production single process/static | §7 | Dev smoke; published app serves index+API one process; unknown API returns JSON 404. |
| Chinese README | §8 + README | README content review: architecture/module guide, env table/defaults/secret, versions, commands, tests/evidence, licenses. |
| Independent source archive/release | §7 | Archive listing excludes forbidden paths; extract to scratch, build/publish/run, HTTP+static smoke. |
| No fake success | throughout | RC capture and independent verifier; blocked outcomes reported, never substituted. |

## 10. Key rulings and risks

- Ruling: use `IUnitOfWork` in Application with a callback receiving `IDemoStore`, so transaction semantics are explicit and testable without exposing infra types. Cost if wrong: slightly more wiring than per-repository transactions.
- Ruling: SQLite CRUD uses SqlHydra Query; count/paging and migrations use Microsoft.Data.Sqlite where typed query support is awkward. This keeps SqlHydra meaningful without forcing a fragile generated aggregate API.
- Ruling: no frontend server (adapter-node); Vite static build copied to .NET wwwroot, satisfying one-process production. Cost: no SSR, acceptable for an API-driven starter.
- Risk: SqlHydra generated output shape/version differences; checked-in regeneration and source review mitigate. If codegen cannot run, stop and report BLOCKED rather than hand-writing a fake replacement.
- Risk: Playwright browser download; install under project cache. If unavailable, report exact failure; do not claim browser evidence.
- Security: no auth in scope; no secrets or real data; error bodies never include exceptions; SQL parameterized by SqlHydra.
