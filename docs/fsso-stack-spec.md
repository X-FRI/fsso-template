# FSSO Stack — Migration and Product Spec

Status: implementation spec for this order, amended 2026-10-29 to require actual MediatR CQRS (supersedes the earlier explicit-handler/no-MediatR rule). Supersedes branding/repository-layout statements in historical documents, not their recorded test evidence.
Baseline: HEAD `96e00073c29228d72553d5606ac9bec1ad550446`.
Name: **FSSO Stack** only. FSSO = F# + Svelte + SQLite + OpenAPI, a project-local acronym, not an external standard and not a SAFE/community claim.

## 1. Non-negotiable naming and compatibility

- No occurrence of the legacy pre-FSSO brand token in any tracked deliverable path, file name, file content, generated artifact, API/UI text, package metadata, script, F# namespace, assembly, solution/project reference, fixture, default database name, README, or evidence file. Matching is case-insensitive and covers text and binary files.
- Existing Git history and the existing absolute host checkout directory are out of deliverable scope and are not rewritten. Historical documents that referenced the old name must be redacted to neutral wording ("pre-FSSO starter", "historical starter"); tracked evidence must replace absolute checkout paths with `<repo>` placeholders so path bytes are clean. Do not invent a new history.
- Any tracked path containing the legacy token is renamed (including historical plan/evidence filenames) and references updated.
- `.tools`, caches, `node_modules`, `artifacts`, and `.git` are not deliverable content. The final source archive must have zero matches across archive paths and extracted file bytes.
- Generated sources (SqlHydra file, OpenAPI JSON, TypeScript SDK) must be produced by corrected generators/config, never hand-edited.
- Naming map:
  - Display/product: `FSSO Stack`; acronym expansion documented.
  - Root package: `fsso-stack` (private).
  - Solution: `FssoStack.slnx`; projects/assemblies: `Fsso.Domain`, `Fsso.Application`, `Fsso.Infrastructure`, `Fsso.Host`, and test projects `Fsso.Domain.Tests`, `Fsso.Application.Tests`, `Fsso.Integration.Tests`, plus dedicated `Fsso.Cqrs.Tests` (file names and output assemblies); namespaces: `Fsso.Domain`, `Fsso.Application`, `Fsso.Infrastructure`, `Fsso.Infrastructure.Generated`, `Fsso.Host`.
  - Environment prefix: `FSSO_`; SQLite default: `data/fsso.db`; archive: `artifacts/fsso-stack-source.tar.gz`.
  - OpenAPI title/tags and UI title: FSSO Stack; no legacy prefix.
- No compatibility alias retains the legacy token. This is a deliberate breaking rename; operators use the new env names.
- A regression script reads tracked paths and file bytes case-insensitively, using an encoded legacy pattern so the checker itself contains no plaintext legacy token. It also scans extracted archives. Run it in `check`, `test`, packaging, and final acceptance.

## 2. Repository layout and commands

Target (single package, no workspace/monorepo):

```
package.json                 root owns all frontend/runtime dev dependencies + scripts
pnpm-lock.yaml               single lockfile
web/                         Vite + Svelte 5 + shadcn-svelte + generated SDK + e2e
src/{Domain,Application,Infrastructure,Host}
tests/{Domain.Tests,Application.Tests,Integration.Tests}
scripts/                     dev/build/check/test/gen/backup/package/brand checks
docs/                        spec, plan, current reports; historical evidence explicitly marked
FssoStack.slnx
```

- Remove `pnpm-workspace.yaml`, `apps/`, nested `web/package.json`, and all workspace package names. Root `package.json` owns Svelte, Vite, Tailwind, bits-ui, shadcn dependencies, Playwright/Vitest, SDK generator, and scripts.
- `web/components.json` stays in `web`; generated shadcn component files remain under `web/src/lib/components/ui`. `web/openapi-ts.config.ts` outputs `web/src/lib/api/generated`; all Svelte imports use `$lib` paths.
- Actual shadcn-svelte generation is required, not only build/help. Pin the official CLI `shadcn-svelte@1.7.1` as a root dev dependency and provide a root script that targets `web` (temporary manifest for CLI discovery is removed afterward). Generate at least one real component into `web/src/lib/components/ui`, verify it builds/checks, and record the official command/RC. Preserve one root package/lockfile, no workspace, and no persistent nested `web/package.json`.
- Root commands, invoked at repository root:
  - `pnpm dev`: persistent Host + Vite (web root) with `/api`/`/openapi` proxy; `--smoke` bounded proxy check; unexpected child failure propagates; exact owned-PID cleanup only.
  - `pnpm check`, `pnpm test`, `pnpm build`, `pnpm gen:openapi`, `pnpm gen:sdk`, `pnpm test:negative`, `pnpm package:source`.
  - `pnpm test` runs real SQLite/HTTP integration, negative control, F# suite, frontend check/unit, and 5 Playwright journeys against the published single-process app.
- `pnpm build` builds `web`, copies `web/dist` to `src/Host/wwwroot`, publishes one .NET process. Production serves static files and API; unknown `/api/*` is JSON 404; non-API SPA fallback only. No Node at runtime.
- Playwright uses the project-local Chromium via `PLAYWRIGHT_BROWSERS_PATH`; `BASE_URL` external mode is supported.
- Active source/scripts/config/docs must contain no `apps/frontend` consumer. Historical evidence files may retain old paths only when explicitly marked `HISTORICAL (pre-FSSO)`; active README/spec/plan/scripts/tests/CI must not.
- No CI workflow exists in the baseline. Do not add new CI; if one is introduced by later work it must use the root command model. This task does not add CI scope.

## 3. Preserved product behavior

- Four compile-enforced F# projects; Domain has no ASP.NET/SQL/Application reference; Application references Domain plus MediatR; Infrastructure implements ports; Host composes.
- **Actual MediatR CQRS (amendment):** each command/query is an F# record implementing `IRequest<Result<'T, AppError>>`; each request has a concrete `IRequestHandler<'TRequest, Result<'T, AppError>>` in Application. Messages carry the existing request data (`CreateDemoCommand`, `GetDemoQuery`, `ListDemosQuery`, `DeleteDemoCommand`). Handler dependencies are constructor-injected (`IUnitOfWork`, `IFaultInjector`); no `DemoHandlers` function record or home-grown bus remains.
- Host registers handlers by real MediatR DI assembly scanning (`AddMediatR` + `RegisterServicesFromAssembly` for the Application assembly). Every product data endpoint (`POST/GET/GET-by-id/DELETE /api/demos...`) resolves `ISender` and dispatches its message through `ISender.Send(message, cancellationToken)`; endpoint behavior is not a direct handler/service call and MediatR is not a dependency-only decoration. `/api/health`, the OpenAPI document endpoint, and static/SPA serving are infrastructure endpoints and are explicitly exempt from message dispatch (health remains a direct liveness response).
- NestJS-like developer experience documented: message type = command/query, handler registration automatic by assembly scan/DI, one handler per request, endpoint/transport remains thin. No controllers calling application services directly.
- Each command handler performs exactly one unit-of-work transaction through the existing `IUnitOfWork.Run`; `Ok` commits, `Error`, exceptions, and cancellation preserve existing rollback/rethrow semantics. `Get`/`List` retain read-transaction behavior. CancellationToken flows from HTTP -> `ISender.Send` -> handler -> UoW/store/fault without replacement.
- Uniform typed errors 400/404/409/500, camelCase `ErrorResponse`, no leaked exceptions, malformed JSON/query/id, cancellation rollback/rethrow.
- Real SQLite with versioned migrations, generated SqlHydra types/factory, transaction commit/rollback (Error, exception, cancellation), read transactions never commit, stable pagination.
- Real OpenAPI success/error schemas, operation IDs; @hey-api SDK from actual server document consumed by UI. CQRS internals must not change the public HTTP contract: OpenAPI JSON and generated SDK remain byte-identical to the pre-amendment contract unless an explicitly reviewed, documented contract change is required (none is expected).
- Real Svelte/shadcn UI create/list/detail/delete/pagination/loading/error/empty/validation, labeled controls; no simulated results.
- Preserve all 31 existing backend tests by name/ID/assertions, 5 frontend unit tests, and 5 real Playwright journeys; migrate the existing test call sites from `DemoHandlers` to real DI/`ISender` without renaming or deleting the 31 cases. Add dedicated MediatR/DI/rollback/concurrency/contract tests in a separately counted `Fsso.Cqrs.Tests` project. Do not reduce or replace existing tests. Structural/brand/migration checks remain separate Node scripts.

### 3.1 MediatR version, license, and compatibility (binding)

- Pin exactly `MediatR` `12.5.0` (Apache-2.0) in the Application project; transitive `MediatR.Contracts` from that package is allowed. No floating/range version, no `13.x`, no RPL/commercial package, and no paid-license registration/key/code. Package references and the resolved assets must be audit-checked for exactly `12.5.0`.
- The user verified NuGet `https://www.nuget.org/packages/MediatR/12.5.0` and official FAQ `https://luckypennysoftware.com/faq`. Both READMEs must state clearly that 12.5.0 is an older line that does **not** receive upstream updates or security support, that this is a deliberate pinned choice, that 13+ moved to RPL/commercial licensing, and that no license is registered. Do not imply support or endorsement.
- If MediatR 12.5.0 is genuinely incompatible with .NET 10 or F# compilation/DI, preserve the exact restore/build/compile errors, document commands/RC, and report BLOCKED. Do not switch versions, add v13+, register a license, or substitute a home-grown bus without a new user decision.
- Add a dependency/license regression check (script or test) that fails on any MediatR version other than 12.5.0, any 13+ reference, or paid-license registration while still allowing the normal Apache-2.0 package use.

## 4. SQLite storage, migration, backup, recovery

- Default path `data/fsso.db`, resolved relative to process working directory; parent created. `FSSO_DB_PATH` overrides. Migrations run at startup/migrate-only and are idempotent.
- Source truth: `PRAGMA foreign_keys=ON`, `busy_timeout=5000`, private cache, no WAL enablement currently. README must state these facts and the single-process/concurrency implications; recommended WAL/multi-instance deployment is guidance only, not implemented.
- Safe default-path migration (fail closed): when `FSSO_DB_PATH` is unset and the legacy default DB file exists, startup must fail with an explicit operator message before opening/creating any DB. The legacy filename is constructed in source without a contiguous forbidden token. Presence is checked by filesystem metadata only; the old DB is never opened, modified, moved, or deleted. With an explicit `FSSO_DB_PATH`, startup may proceed on that path. Operators recover by making a consistent backup of the old DB and restoring it to an explicit new path, or by explicitly choosing a fresh DB path after safeguarding the old file. Document non-copy backup via `sqlite3 "$DB" ".backup 'backup.db'"` and restore via the same tool, with app stopped or writes controlled. Synthetic temp-dir tests must prove fail-closed startup, no old-file mutation (hash/mtime), explicit-path recovery, and no silent replacement.
- Add a synthetic backup/restore verification: create data through real HTTP, make a consistent backup, restore to a new path, start the app on the restored path, read/list the row. Never touch a real user DB; test artifacts only.
- Migrations are forward-only. Rollback is redeploy previous build plus restore matching backup; document honestly.
- Provide production guidance for reverse proxy HTTPS, data-directory permissions, `FSSO_DB_PATH`, no public exposure; explicitly no authentication/audit and no real-fund/public production use.

## 5. README deliverables

- English `README.md` is primary and complete; `README_zh.md` mirrors it with equivalent facts.
- Required coverage: scope and explicit non-goals; exact supported versions and roles; architecture/dependencies/actual MediatR 12.5.0 CQRS and NestJS-like message->handler->DI mapping, SQLite persistence, static SPA/no SSR; install and all commands; tests/evidence; OpenAPI/SDK/SqlHydra generation; migrations/new-module guide; SQLite file/init/versioning/FK/busy timeout/no WAL; consistent backup/restore and safe default-path migration; production build/run/upgrade/rollback; reverse proxy/HTTPS/data dir/security; no auth/audit; no public/real-fund use; troubleshooting; actual dependency/license status (including MediatR 12.5.0 Apache-2.0 pin, no upstream updates/security support, no 13+/RPL/commercial use, no registered paid license); implemented vs recommended clearly distinct.
- Include the FSSO acronym definition and brand regression statement. No legacy token.
- Mark historical evidence files as historical without changing their recorded results beyond neutral brand redaction.

## 6. Acceptance/evidence matrix

| Gate | Evidence |
|---|---|
| Zero legacy term | brand checker over `git ls-files` paths/content (case-insensitive, binary-safe); `git grep` equivalent; archive paths+bytes census |
| Single package, no workspace | no `pnpm-workspace.yaml`/`apps`/nested package; one root package + lockfile; root-owned dependencies |
| Renamed assemblies/DB/env/API/UI | every output `Fsso.Domain.dll`, `Fsso.Application.dll`, `Fsso.Infrastructure.dll`, `Fsso.Host.dll`, test assemblies; namespaces `Fsso.*`; default `data/fsso.db`; OpenAPI title; UI |
| Behavior regression | exact original 31 backend test names/IDs still present/passing via ISender, plus separately counted dedicated MediatR tests; unit 5; Playwright 5; real SQLite/HTTP rollback/pagination/restart |
| MediatR CQRS | exact 12.5.0 Apache-2.0, no v13/paid license; records implement `IRequest`; concrete `IRequestHandler`; `AddMediatR` assembly scan; every product data endpoint calls `ISender.Send` (health/OpenAPI/static exempt); NestJS-like docs |
| MediatR tests | host-DI handler selection; missing registration fails clearly; Error/exception/cancellation rollback/rethrow; deterministic concurrency (unique concurrent creates all succeed/list exactly N; same-id concurrent deletes yield one success, rest 404, no 500/corruption); unchanged OpenAPI/SDK |
| Generation determinism | gen:openapi + gen:sdk twice; SqlHydra script; diff/hash stable |
| Dev/prod | dev proxy smoke + persistent mode; published single .NET process static+API/JSON404/restart |
| Backup/restore | real backup, restore, app readback on synthetic DB |
| Docs | English/Chinese parity, complete checklist, licenses, recommendations labeled |
| Independent archive | frozen install/build/start from archive; zero legacy census; README_zh present; no apps/frontend/secrets/tools/deps; generated component present |
| shadcn generation | official root `shadcn-svelte` command targeting web generated a component, RC0; build/check after generation; no persistent nested package/workspace |
| Reviews | document spec+plan; per-task spec then distinct quality; final overall read-only |

## 7. Safety boundaries

No push/deploy/shared service/global config; no real data or credentials; temp only project `artifacts/` or approved scratch; no `/tmp`; exact owned-PID cleanup, never broad process kills. Package from committed source only. Preserve failed attempts and OPEN gates honestly.
