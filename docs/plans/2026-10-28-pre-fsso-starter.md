# pre-FSSO starter — Implementation Plan

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`. The implementer may not dispatch subagents. The coordinator dispatches DISTINCT native reviewers per task: spec-compliance FIRST, code-quality SECOND. Neither may be the implementer or each other; session IDs are recorded.

**Goal:** Complete Demo vertical slice on F# ASP.NET Core + real SQLite + SqlHydra + real OpenAPI/SDK + Svelte/shadcn, production one-process, with honest evidence.

**Architecture:** Four F# projects with compile-enforced dependencies. Application owns explicit handlers/ports; Infrastructure owns migrations, SqlHydra store, transactions; Host owns DTOs, error mapping, OpenAPI, static SPA, composition. Frontend consumes generated SDK.

**Tech stack:** .NET SDK 10.0.403 / ASP.NET Core 10.0.14; F# 10; FsToolkit.ErrorHandling 5.2.0; Microsoft.Data.Sqlite 10.0.14; SqlHydra.Query/Cli 5.1.1; Microsoft.AspNetCore.OpenApi 10.0.14; Node 26.7.0; pnpm 10.30.3; Vite/Svelte 5/TS; @hey-api/openapi-ts 0.93.1; shadcn-svelte/bits-ui; Playwright.

**Spec:** `docs/design.md`

## Global constraints

- Explicit PATH/DOTNET_ROOT as supplied; all temp/test artifacts under project `artifacts/` or the approved scratch dir; never `/tmp`. No reinstall/global packages; pnpm via `npx --yes pnpm@10.30.3`.
- Branch `feature/fsharp-fullstack`; no worktree/push/remote/deploy/real data/credentials/global config. Do not stage `.tools`, deps, caches, DBs, logs, `src/Host/wwwroot`, artifacts.
- Real SQLite and real HTTP are mandatory for integration/Host tests. Port fakes are allowed ONLY in Domain/Application unit tests; no mock database.
- TDD for behavior. Red/green commands below are exact filters; adapt only if test names differ, and report the actual names/commands. Generated SqlHydra/OpenAPI/SDK output is exempt from TDD but must actually execute and be committed.
- Uniform 400/404/409/500 `ErrorResponse`; no leaked exception text; cancellation propagates and rolls back in-flight writes, never a 500.
- No MediatR/reflection bus/Effect/queues/accounting/mock UI/handwritten frontend fetch DTOs.
- BLOCKED rule: for NuGet/pnpm restore, SqlHydra generation, OpenAPI export, SDK generation, shadcn install, Playwright browser, independent archive/build, or time exhaustion, make real bounded attempts, retain command+RC+log tail, and report BLOCKED. Never substitute fake code/evidence.
- **Timeboxes (hard): Task 1 = 30 min, Task 2 = 20 min, Task 3 = 15 min.** At a timebox, report partial/BLOCKED honestly with current SHA and exact remaining gaps. No optional surveying.

## File map

Task 1: `Directory.Build.props`, solution, `src/{Domain,Application,Infrastructure,Host}/**`, `tests/{Domain.Tests,Application.Tests,Integration.Tests}/**`, `sqlhydra.toml`, `.config/dotnet-tools.json`, `scripts/gen-sqlhydra.sh`, `openapi/openapi.json`.
Task 2: root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `web/**` (including `openapi-ts.config.ts`, `e2e/demo.spec.ts`), `scripts/{dev,gen-openapi,gen-sdk,check}.mjs`.
Task 3: `scripts/{build,test,release-smoke,package-source}.mjs`, `README.md`, `docs/reviews/final-report.md`, root build/test wiring.

---

## Task 1 (30 min): Backend vertical slice

**Deliverable:** runnable real-SQLite Demo API with typed errors, transactions, OpenAPI; passing unit/integration/HTTP tests.

- [ ] **Early runnable checkpoint (first ~12 min):** create four F# projects/test projects with only allowed references and exact packages. Add `Directory.Build.props`, migrations runner, minimal `Demo`/handlers/store/UoW, and Host POST/GET-list endpoints. RED: `dotnet test tests/Domain.Tests --filter FullyQualifiedName~DemoCreate` fails (type missing/wrong validation). Implement Domain; GREEN. RED: `dotnet test tests/Application.Tests --filter FullyQualifiedName~CreateDemo` fails. Implement Application; GREEN. RED: `dotnet test tests/Integration.Tests --filter FullyQualifiedName~CreateAndList` fails. Implement minimal Sqlite store/UoW; GREEN. RED: `dotnet test tests/Integration.Tests --filter FullyQualifiedName~HttpCreateListSmoke` fails; implement create/list HTTP; GREEN. Commit checkpoint.
- [ ] Exact Application contracts and JSON casing follow design §3/§5 (`AppError` single shared error type, `PagedDemos`, `IDemoStore` with unique-aware `Insert: Task<Result<unit, AppError>>`, `IUnitOfWork.Run`, `IFaultInjector`, `DemoHandlers`, camelCase `CreateDemoRequest`/DTOs). No infra types in Application.
- [ ] Migrations: `001_create_demos.sql` with `name TEXT NOT NULL COLLATE NOCASE` + `UNIQUE INDEX ux_demos_name ON demos(name COLLATE NOCASE)`, `002_index_demos_created.sql` with `(created_at DESC, id DESC)`; embedded transaction-per-migration runner and `schema_migrations(version, applied_at)`. Add `--migrate-only` Host mode. Unit RED/GREEN for migration idempotency: `dotnet test tests/Integration.Tests --filter FullyQualifiedName~MigrationIdempotent`; assert versions exactly once after two runs.
- [ ] SqlHydra: local manifest + `sqlhydra.toml` (SQLite, output `src/Infrastructure/Generated/SqlHydra.fs`, namespace `<legacy> generated namespace`, table declarations). `scripts/gen-sqlhydra.sh` runs `<legacy>_DB_PATH=artifacts/schema.db dotnet run --project src/Host -- --migrate-only`, then `dotnet sqlhydra sqlite -t sqlhydra.toml`, then `git diff --exit-code -- src/Infrastructure/Generated/SqlHydra.fs`. Commit generated output. Verify CRUD uses generated types/table declarations/QueryContextFactory.
- [ ] Store/UoW RED/GREEN: `CreateAndList` (real DB across connections); `PaginationDeterministic` seeds identical `created_at`, asserts `id DESC`, total, default page/limit, boundaries, non-overlapping pages; `CaseInsensitiveUnique` creates `Foo` then `foo` -> conflict and direct duplicate insert fails SQLite UNIQUE; `ReadDoesNotWrite` compares second-connection `PRAGMA data_version` and row count before/after GET/list; `CreateRollbackError` callback inserts, observes row via `FindById` inside tx, returns Conflict, then outside count 0; `CreateRollbackException` same with thrown sentinel, outside count 0; `DeleteRollbackError`/`DeleteRollbackException` delete inside tx, observe absent inside tx, then Error/throw, outside row still present. Commands: `dotnet test tests/Integration.Tests --filter FullyQualifiedName~Rollback`; `...~Pagination`; `...~ReadDoesNotWrite`.
- [ ] Host endpoints and pipeline: POST /api/demos 201+Location; GET list; GET detail; DELETE 204; health. Central `AppError -> IResult`; malformed JSON 400; bad id 400; bad/repeated/out-of-range query 400; missing 404; case-insensitive duplicate 409; unknown API path JSON 404; unhandled exception 500. JSON camelCase. `500` test throws sentinel and asserts body contains neither sentinel text nor exception type, only `statusCode,code,message,traceId`.
- [ ] Cancellation: test aborts a request during bounded test-only `delay-before-commit` fault (max 2s) and asserts client cancellation/no 500, and row absent. Fault injection is off unless `<legacy>_FAULT_INJECTION=1`; `error-after-write` and `throw-after-write` on create/delete roll back after real write. Commands: `dotnet test tests/Integration.Tests --filter FullyQualifiedName~Cancellation`; `...~FaultInjection`.
- [ ] Restart: stop app, start new app on same DB, read created row. Malformed JSON/query/bad id/404/409/500 each assert identical `ErrorResponse` keys and content type.
- [ ] OpenAPI: exported `openapi/openapi.json` and served `/openapi/v1.json` deep-equal; POST request schema `$ref`; per-operation exact success/error status matrix from design §5; unique operation IDs `createDemo/listDemos/getDemo/deleteDemo/health`; all `$ref`s resolve. `dotnet test tests/Integration.Tests --filter FullyQualifiedName~OpenApiDocument`.
- [ ] `dotnet build -warnaserror`; all `dotnet test`; rerun SqlHydra script + `git diff --exit-code`; commit. Report exact RED/GREEN commands, RCs, counts, files.

**Task 1 done when:** real HTTP+SQLite CRUD, pagination, all errors, both rollback paths after real write, restart, migrations, OpenAPI, SqlHydra regeneration are proven by commands.

---

## Task 2 (20 min): OpenAPI SDK + Svelte/shadcn UI + dev/gen/check

**Deliverable:** real generated SDK consumed by a connected UI; dev proxy; check/gen commands execute; browser journey.

- [ ] Create pnpm workspace/root package with scripts `dev`, `gen:openapi`, `gen:sdk`, `check`; engines/pnpm pin. Do not commit node_modules.
- [ ] `scripts/gen-openapi.mjs`: start Host in export mode with temp DB, write `openapi/openapi.json`, kill host; verify parsed JSON. RED: `pnpm gen:openapi` fails before script/export wiring; GREEN after. `scripts/gen-sdk.mjs`: `@hey-api/openapi-ts` 0.93.1 config input `openapi/openapi.json`, output `web/src/lib/api/generated`, plugins/typescript + client-fetch + sdk; run `pnpm gen:sdk`; assert generated `createDemo/listDemos/getDemo/deleteDemo` functions and Demo types exist. If either fails, BLOCKED with RC/log.
- [ ] Frontend scaffold: Vite + Svelte 5 + TS + Tailwind + shadcn-svelte `components.json`; actual shadcn components (Button, Input, Textarea, Card, Badge, AlertDialog) using bits-ui/tailwind-variants/clsx/tailwind-merge. Configure Vite proxy `/api` and `/openapi` -> `127.0.0.1:5080`. Client config base URL from `VITE_API_BASE_URL` or same origin.
- [ ] Frontend unit RED/GREEN: `pnpm --dir web test:unit` fails for pagination/error helpers; implement `utils.ts` and state helpers; GREEN. `pnpm --dir web check` passes.
- [ ] UI: create form with visible labels and server/client validation display; list with page/limit controls and total; detail view; delete confirmation; loading/error/empty states and next/prev. Every action uses generated SDK functions. Assert `rg 'fetch\\(|axios' web/src --glob '!**/generated/**'` is empty.
- [ ] Browser RED/GREEN: Playwright against real API+DB, Chromium installed under project `.tools/playwright-browsers` (git-ignored). Journey: first-use empty state -> create -> list -> open detail -> delete -> gone after reload; second test next/prev and invalid submit -> visible 400 validation; forced API failure -> visible error state (test-only failure mode may be used). Use accessible role/label selectors. No axe gate. Command: `pnpm --dir web exec playwright test e2e/demo.spec.ts`; if browser install fails, report BLOCKED for browser evidence.
- [ ] `pnpm dev` smoke: orchestrator starts dotnet+Vite, curls `/api/demos` through Vite proxy, then shuts both down. Commit. Report.

---

## Task 3 (15 min): Production, root tests, archive, README, freeze

**Deliverable:** one-process production, all root commands, independent archive build/release, Chinese README, final evidence.

- [ ] Wire root `build` and `test` in `package.json`; `check` runs `dotnet build -warnaserror` + svelte-check. `scripts/build.mjs`: frontend build -> copy to `src/Host/wwwroot` -> `dotnet publish -c Release -o artifacts/publish`; clean/ignore wwwroot; assert `git status --porcelain` clean of generated output.
- [ ] `scripts/release-smoke.mjs`: start published DLL on port 0/temp DB; assert single process has no Node child; `curl -i` index/assets/API; `/api/unknown` returns JSON 404 `ErrorResponse`, never index; API CRUD and restart persistence. Run and capture.
- [ ] `scripts/test.mjs`: build/publish first, then `dotnet test` all projects, frontend check/build/unit, Playwright against published app with fresh DB. Any nonzero RC fails; print actual counts. Run, capture full output.
- [ ] Chinese `README.md`: architecture/new-module guide (copy Demo, migration, regenerate SqlHydra/OpenAPI/SDK), full env table (default/read phase/secret), supported toolchain versions, exact commands, tests/evidence scope, license/dependency notes (no MediatR). No fake receipts.
- [ ] Final commands BEFORE packaging: `dotnet build -warnaserror`, `dotnet test`, `pnpm check`, `pnpm build`, `pnpm test`, gen commands. Record RCs/SHAs/evidence in `docs/reviews/final-report.md`; commit complete source+README+scripts+report as commit A.
- [ ] **Package only after commit A**: `scripts/package-source.mjs` runs `git archive HEAD` (HEAD must equal A) and asserts archive includes `README.md`, `package.json`, `pnpm-lock.yaml`, `scripts/build.mjs`, `scripts/test.mjs`, `scripts/package-source.mjs`; assert excludes `.tools`, node_modules, bin/obj, caches, DBs, logs, credentials, artifacts, wwwroot. Extract to approved scratch; use already-verified external absolute `PATH`/`DOTNET_ROOT` (not original checkout; no SDK reinstall per leader ruling); run `pnpm install --frozen-lockfile`, `pnpm build`, start published output, test static+API+restart. Record `which dotnet`, `dotnet --version`, RCs. No hardcoded source path.
- [ ] Append independent-archive results to `docs/reviews/final-report.md`, commit B; freeze B. The archive stays bound to source commit A (complete source), while B records verification. Coordinator dispatches overall read-only review. If packaging happens after any source change, repackage from the new HEAD.

## Review gates

1. Implementer commits; coordinator records BASE/HEAD.
2. UNIX `git diff BASE..HEAD` package written under `docs/reviews/`.
3. Native spec-compliance reviewer (distinct session, never implementer) reads task section+diff, returns ✅/❌.
4. Native code-quality reviewer (distinct session, distinct from #3) reads same diff, returns verdict.
5. Same implementer fixes findings; rerun covering tests; reviewers re-check findings. Both approve before next task. Implementer never reviews own diff.

## Evidence matrix

Build/test RCs -> Tasks 1–3. Real CRUD/pagination/errors -> T1 Host+integration. Error+exception rollback after real write -> T1 rollback tests (create+delete). Read-no-write -> T1 data_version test. Restart -> T1+T3. Migration idempotency -> T1. OpenAPI equality/schemas/status/opIDs -> T1. SDK generation/consumption -> T2. Frontend check/build/browser + states -> T2/T3. Single-process static+API/unknown JSON -> T3. Independent extracted build/release -> T3. No fake success -> every report has command/RC; BLOCKED stops.

## Review focus

1. Transaction correctness after real write on Error/exception/create/delete.
2. Uniform errors incl malformed JSON/query/500/cancellation; no leaked text.
3. SqlHydra genuinely regenerable/used.
4. Generated SDK genuinely consumed; production no Node; API fallback never HTML.
5. Honest evidence and archive exclusions.
