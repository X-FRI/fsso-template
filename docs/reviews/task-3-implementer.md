# Task 3 implementer report

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


Date: 2026-10-29  
Branch: `feature/fsharp-fullstack`  
Base HEAD: `e871f66`  
Status: DONE_WITH_CONCERNS (all Task 3 code/commands executed; independent archive result appended in commit B)

## Delivered

- `src/Host/Program.fs`: Production/published static mode uses `UseDefaultFiles` + `UseStaticFiles`; SPA fallback to `index.html` only for non-`/api`; `/api/{**rest}` still returns the JSON `ErrorResponse` 404; API runs in the same process. Static mode requires non-Development, an existing `WebRootPath`, and `index.html`.
- `.gitignore`: `src/Host/wwwroot/` and `web/dist/` are generated output.
- `scripts/build.mjs`: frontend build -> copy `web/dist` to `src/Host/wwwroot` -> `dotnet publish src/Host -c Release -o artifacts/publish`; asserts published `wwwroot/index.html` + `pre-FSSO Host.dll`; verifies generated `wwwroot` is ignored; removes generated `src/Host/wwwroot` afterward.
- `scripts/release-smoke.mjs`: starts the published DLL on `127.0.0.1:5099` with a temp DB, asserts one process and no descendants/Node child, checks index/assets/health, API CRUD, invalid pagination 400, unknown `/api/*` JSON 404, restart persistence, then exact owned PID cleanup.
- `scripts/test.mjs`: build/publish first, then `dotnet test pre-FSSO solution`, frontend check, frontend unit, and Playwright against the published app with fresh DB and external `BASE_URL` (dev webServers skipped by the existing config when `BASE_URL` is set). Nonzero at any stage fails; counts printed and persisted.
- Root `package.json`: `build`, `test`, `release:smoke`, `package:source` wired; existing `check` remains `dotnet build -warnaserror` + `svelte-check`.
- `README.md`: Chinese architecture/dependency rules, new-module guide, full env table, toolchain versions, commands, evidence scope, dependency/license notes, no MediatR, truthful limitations.
- `scripts/package-source.mjs` and `scripts/lib.mjs`: committed source archive, exclusion/required-file assertions, extraction to approved scratch, external toolchain install/build, published app static+API+restart verification.

## Actual commands and producer RC

| Command | RC | Evidence |
|---|---|---|
| `npx --yes pnpm@10.30.3 build` | 0 | Frontend 691 modules built; publish produced `artifacts/publish/pre-FSSO Host.dll` and `wwwroot/index.html`; `artifacts/build-frontend.log`, `artifacts/build-publish.log`, `artifacts/task3-build-run.log` |
| `node scripts/release-smoke.mjs` | 0 | Single PID tree, no Node child; static index + asset; API CRUD; unknown API JSON 404; pagination 400; restart persistence; `artifacts/release-smoke.log`, `artifacts/task3-release-run.log` |
| `npx --yes pnpm@10.30.3 check` | 0 | `dotnet build -warnaserror`: 0 warnings/0 errors; svelte-check: 0 errors/0 warnings; `artifacts/task3-check.log` |
| `npx --yes pnpm@10.30.3 test` | 0 | build/publish 0; dotnet test passed=31 failed=0 skipped=0 total=31; frontend check 0; frontend unit passed=5; Playwright passed=5 (`BASE_URL=http://127.0.0.1:5098`); `artifacts/task3-test-run.log`, `artifacts/test-summary.log` |

Playwright runs against the published app (not Vite): tests 5/5, including empty first use, create/list/detail/delete, 400 validation, pagination boundaries, aborted-request error/recovery, and forced list failure.

## Commit A scope

Commit A includes the Host static change, root build/test wiring, build/test/release-smoke/package-source scripts, helper, Chinese README, and this report. It excludes `.tools`, dependencies, caches, DBs, logs, `artifacts/`, `src/Host/wwwroot`, `web/dist`, and `node_modules`.

## Concerns / open gates

- Task 3 exceeded the ~15 minute timebox; evidence is real but obtained over a longer session.
- At commit A the independent archive build is not yet run; results are appended after commit A in commit B. The archive is bound to commit A while commit B records verification.
- Chromium remains the manually extracted project browser from Task 2 (not a clean installer RC); this does not affect Task 3 single-process production behavior.
- The `GET /` static response logs an `index.html` path and a nominal `405` segment in ASP.NET's request-finished line while returning HTTP 200; behavior is asserted by the actual status/body and Playwright. This is a logging oddity, not a failing response.

## Documentation/portability pin (pre-B source)

- README env table now includes all script-consumed variables with actual defaults: `FSSO_SCRATCH` (default project-owned `artifacts/independence`, override allowed), `FSSO_RELEASE_PORT` 5099, `FSSO_TEST_PORT` 5098, `FSSO_PACKAGE_PORT` 5097. `BASE_URL` is documented as Playwright's actual unset default `http://127.0.0.1:5173`; `scripts/test.mjs` explicitly overrides it to the published app.
- `scripts/package-source.mjs` no longer ships a developer-specific `/Users/somhairle` default. Final verification used the approved external scratch via `FSSO_SCRATCH=<scratch>`; the product default is project-owned and git-ignored.
- README new-module guide now mandates `bash scripts/gen-sqlhydra.sh` (deterministic `#nowarn "3261"`/`#nowarn "1178"`) instead of a raw `dotnet sqlhydra` command.
- README adds explicit reference differences: NestJS CQRS/bus vs explicit F# handlers; SQLite/SqlHydra vs reference ORM stack; static SPA/no SSR and no Node runtime.

## Independent archive verification (commit B)

Frozen source commit A: `696669dc8471d24f37e119a3c6be2adae2a08055` (complete source/README/scripts/report before packaging). Archive stays bound to this SHA; commit B only appends these results.

| Command | RC | Evidence |
|---|---|---|
| `FSSO_SCRATCH=<approved absolute> npx --yes pnpm@10.30.3 package:source` | 0 | `artifacts/task3-package-run-final.log`, `artifacts/package-source-summary.log` |
| `git archive HEAD` | 0 | `<repo>/artifacts/fsso-stack-source.tar.gz` |
| archive assertions | 0 | 143 entries; required `README.md`, `package.json`, `pnpm-lock.yaml`, build/test/package scripts present; no `.tools`, node_modules, bin/obj, caches, DBs, logs, artifacts, wwwroot, `.git` |
| path independence scan | 0 | no original checkout paths in extracted `scripts/*.mjs` |
| independent `pnpm install --frozen-lockfile` | 0 | extracted at `<scratch>/independent-696669dc8471d24f37e119a3c6be2adae2a08055` |
| independent `pnpm build` | 0 | published `pre-FSSO Host.dll` + `wwwroot/index.html` |
| independent static | 0 | index + `/assets/*.js` on `127.0.0.1:5097` |
| independent API create/list/400/404/pagination | 0 | 3 demos created; `limit=2` page 1/2; page=0 -> 400; bad id -> 400; `/api/unknown` -> JSON 404 |
| independent restart persistence | 0 | created demo read back after restart |
| `which dotnet` | 0 | `<repo>/.tools/dotnet/dotnet` (external toolchain, not extracted checkout) |
| `dotnet --version` | 0 | `10.0.403` |

Final product package RC: 0. Earlier packaging attempts exposed and fixed two real defects before this final run: a duplicate identifier in `package-source.mjs` and an unconditional git-only assertion in `build.mjs` that broke the `.git`-free archive. Those fixes were committed before the frozen source SHA above; the final archive was repackaged from that SHA.

## Spec-finding fixes (A2/B2)

- Added `docs/reviews/final-report.md` with frozen A2 SHA `6c3ccaced1d9b562cd3185b9df566a3905392c13`, real command RCs/counts, archive path/bound SHA, review-status honesty (Task 1 dual-approval commit `59f6473`, reviewer IDs unavailable; Task 2/3 OPEN), and known gates.
- `scripts/release-smoke.mjs` now defaults to `ASPNETCORE_URLS=http://127.0.0.1:0`, discovers the actual URL from the host's `Now listening on:` log for each start/restart, and only allows `FSSO_RELEASE_PORT` as an override. Actual run RC=0 with dynamic ports 58428 then 58442; log `artifacts/task3-release-dynamic.log`.
- README now states `ASPNETCORE_URLS` is not set by the Host (dev script sets 5080; published examples set their own), and `FSSO_RELEASE_PORT` defaults to `0` (automatic free port).
- A2 archive: `<repo>/artifacts/fsso-stack-source.tar.gz`, 144 entries, required fixed README/scripts/final-report present, forbidden paths absent; independent install/build/static/API/restart all RC=0 at `<scratch>/independent-6c3ccaced1d9b562cd3185b9df566a3905392c13`.

## Quality-defect fixes (A3/B3)

- `scripts/lib.mjs` `runLogged` now fails closed: `error`, `signal`, or `status === null` produces RC=1, never RC=0. `node scripts/negative-control.mjs` RC=0 proved a SIGKILLed child yields `RC=1 signal=SIGKILL` (log `artifacts/task3-negative-control.log`); it is also a stage inside `pnpm test`.
- `scripts/test.mjs` and `scripts/package-source.mjs` default to port `0`, discover the actual listen URL from the host log for each start/restart, and keep env overrides. Stale listeners cannot satisfy health checks.
- `scripts/test.mjs` now fails closed on missing counts and requires exactly dotnet `passed=31 failed=0 skipped=0 total=31`, frontend unit `passed=5`, Playwright `passed=5`. Actual run RC=0 on dynamic port 58917.
- `scripts/build.mjs` throws instead of `process.exit(1)` inside `try`; `src/Host/wwwroot` cleanup always runs in `finally`. Actual `pnpm build` RC=0.
- Actual `node scripts/release-smoke.mjs` RC=0 with dynamic ports 58966 then 58978 (log `artifacts/task3-release-a3.log`).
- A3 `695c07463def168b892952ca11eafe231292d4af`; B3 records results. Archive `<repo>/artifacts/fsso-stack-source.tar.gz`, 145 entries, fixed files present; independent install/build/static/API/restart all RC=0 at `<scratch>/independent-695c07463def168b892952ca11eafe231292d4af`.
