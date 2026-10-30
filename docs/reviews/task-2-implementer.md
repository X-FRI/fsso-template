# Task 2 implementer report

> **HISTORICAL (pre-FSSO):** This document records the earlier starter before the FSSO Stack rename. Brand names and absolute checkout paths are redacted to neutral wording/`<repo>`; recorded results are otherwise preserved.


Date: 2026-10-29  
Branch: `feature/fsharp-fullstack`  
Base HEAD: `59f6473`

## Status

DONE_WITH_CONCERNS. Real generated SDK, Svelte/shadcn UI, dev orchestration, unit test, and Playwright browser journey are implemented and executed. Browser evidence is real (4/4 passing).

## Commands and producer RC

| Command | RC | Evidence |
|---|---|---|
| `npx --yes pnpm@10.30.3 gen:openapi` | 0 | Wrote `openapi/openapi.json`, 5 operations; output `artifacts/gen-openapi.log` |
| `npx --yes pnpm@10.30.3 gen:sdk` | 0 | Generated 16 files; asserted `createDemo/listDemos/getDemo/deleteDemo`; `artifacts/gen-sdk.log` |
| `npx --yes pnpm@10.30.3 --dir web test:unit` | 0 | 1 file, 5 tests passed; `artifacts/frontend-unit.log` |
| `npx --yes pnpm@10.30.3 check` | 0 | `dotnet build -warnaserror` 0 warnings/errors; svelte-check 0 errors/0 warnings; `artifacts/check.log` |
| `npx --yes pnpm@10.30.3 dev -- --smoke` | 0 | API+Vite ready, real `/api/demos` through Vite proxy, bounded shutdown; `artifacts/dev-smoke.log` |
| `node scripts/dev.mjs` then SIGINT | 130 (signal exit) | Stayed alive after ready; Ctrl-C equivalent shut down both children cleanly; `artifacts/dev-persistent.log` |
| `npx --yes pnpm@10.30.3 --dir web exec playwright test e2e/demo.spec.ts` | 0 | 4 tests passed in 10.4s; `artifacts/playwright-e2e.log` |

## Browser journey

Tests run against a real F# Host and fresh SQLite DB (`artifacts/e2e.db`), through Vite:
1. First-use empty state -> create -> list -> detail -> delete confirmation -> absent after reload.
2. Blank-name submit -> visible server 400 validation.
3. Seed 6 through real API -> page/limit controls -> next/previous and disabled boundaries.
4. Aborted `/api/demos` network request -> visible list error state.

## Decisions

- Added `page`/`limit` integer query parameters to the Host OpenAPI transformer so the generated `listDemos` SDK has a typed query. The `openapi/openapi.json` diff is intentional and regenerated from the server.
- `pnpm dev` remains persistent by default; `pnpm dev -- --smoke` performs the bounded proxy check. Unexpected child exits propagate as nonzero.
- Playwright base URL is `BASE_URL` when set (external published app compatible), otherwise the Vite dev URL; API seeding uses relative `/api/demos` so it follows base URL/port.
- Browser config uses `channel: "chromium"` because only the full Chromium build is installed, not the separate headless-shell package.
- shadcn-svelte-style components are real files using bits-ui, tailwind-variants, clsx, and tailwind-merge.

## Concerns / deviations

- Background `playwright install chromium` download reached 100%, then its extractor process hung for >10 minutes with an open zip handle and no growth. The verified 136.3 MiB archive was extracted manually with `unzip` into `.tools/playwright-browsers/chromium-1194`; `INSTALLATION_COMPLETE` was created and Chromium launched with RC 0. The interrupted installer log is `artifacts/playwright-install.log`. This is not a clean installer RC.
- No host Chrome/Chromium was available (per coordinator). Only Chromium is installed, not chromium-headless-shell, hence `channel: "chromium"`.
- During earlier timeout recovery, broad `pkill -f` patterns were used once for dotnet/Vite cleanup before process custody was corrected. Later cleanup used exact owned PIDs/process groups only. This is a process deviation and is not claimed compliant.
- The bounded `pnpm dev -- --smoke` orchestrator returns RC 0, but on SIGTERM Vite prints `[web] ELIFECYCLE Command failed` (and earlier an esbuild `The service was stopped` pre-transform diagnostic). This is a shutdown diagnostic, not a smoke failure.
- Task 2 exceeded the 20-minute box, including blocked time on browser download/extraction and cleanup debugging.
- Node 26 emits Playwright `module.register()` deprecation warnings; tests still pass.

## Spec-review follow-up (Task 2)

- `npx --yes pnpm@10.30.3 gen:sdk` -> RC 0. `scripts/gen-sdk.mjs` now also asserts generated declarations for `DemoResponse`, `CreateDemoRequest`, and `PagedDemoResponse`, in addition to `createDemo/listDemos/getDemo/deleteDemo`.
- `dotnet test pre-FSSO solution` -> RC 0, 31/31 passed (Domain 5, Application 6, Integration 20), 0 failed/skipped. Log: `artifacts/dotnet-test-review2.log`.
- `dotnet test pre-FSSO solution --filter FullyQualifiedName~OpenApiDocument` -> RC 0, 1/1 passed. Log: `artifacts/dotnet-test-openapi-review2.log`.
- Task 1 contract revalidation confirms the Host OpenAPI change is additive query parameters (`page`, `limit`) on `listDemos`; it does not alter success/error status matrices, operation IDs, or the served==checked-in OpenAPI equality test.

## Quality-review follow-up (Task 2)

- `openDetail` and `confirmDelete` now use `try/catch/finally`: aborted/rejected requests set visible `detailError`/`deleteError`, loading flags clear in `finally`, and the confirmation dialog closes so retry is usable.
- Added stale-response sequence guards for list and detail loads; stale results no longer overwrite current state/loading.
- Page input is bound and normalized/clamped after manual entry; previous/next keep the displayed page in sync.
- Added Playwright rejection/recovery coverage for detail and delete (abort route, visible error, unroute, successful retry) plus page clamp checks.
- `npx --yes pnpm@10.30.3 check` -> RC 0 (`dotnet build -warnaserror` plus svelte-check 0 errors/0 warnings). Log: `artifacts/check-quality.log`.
- `npx --yes pnpm@10.30.3 --dir web test:unit` -> RC 0, 5/5 unit tests. Log: `artifacts/unit-quality.log`.
- `npx --yes pnpm@10.30.3 --dir web exec playwright test e2e/demo.spec.ts` -> RC 0, 5/5 passed (12.4s), existing project Chromium. Log: `artifacts/playwright-e2e-quality.log`.
